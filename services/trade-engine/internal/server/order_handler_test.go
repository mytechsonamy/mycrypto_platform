package server

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
	"github.com/mytrader/trade-engine/internal/service"
)

// Mock OrderService
type MockOrderService struct {
	mock.Mock
}

func (m *MockOrderService) PlaceOrder(ctx context.Context, req *service.PlaceOrderRequest) (*domain.Order, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Order), args.Error(1)
}

func (m *MockOrderService) CancelOrder(ctx context.Context, orderID, userID uuid.UUID) error {
	args := m.Called(ctx, orderID, userID)
	return args.Error(0)
}

func (m *MockOrderService) GetOrder(ctx context.Context, orderID, userID uuid.UUID) (*domain.Order, error) {
	args := m.Called(ctx, orderID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Order), args.Error(1)
}

func (m *MockOrderService) GetUserOrders(ctx context.Context, userID uuid.UUID, filters repository.OrderFilters) ([]*domain.Order, error) {
	args := m.Called(ctx, userID, filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Order), args.Error(1)
}

func (m *MockOrderService) GetActiveOrders(ctx context.Context, symbol string) ([]*domain.Order, error) {
	args := m.Called(ctx, symbol)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Order), args.Error(1)
}

// Test PlaceOrder Handler - Success
func TestOrderHandler_PlaceOrder_Success(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()
	orderID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(1.5)

	reqBody := PlaceOrderRequest{
		Symbol:      "BTC/USDT",
		Side:        "BUY",
		Type:        "LIMIT",
		Quantity:    "1.5",
		Price:       stringPtr("50000.00"),
		TimeInForce: "GTC",
	}

	// Mock service response
	mockService.On("PlaceOrder", mock.Anything, mock.MatchedBy(func(req *service.PlaceOrderRequest) bool {
		return req.UserID == userID && req.Symbol == "BTC/USDT"
	})).Return(&domain.Order{
		ID:             orderID,
		UserID:         userID,
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Status:         domain.OrderStatusOpen,
		Quantity:       quantity,
		FilledQuantity: decimal.Zero,
		Price:          &price,
		TimeInForce:    domain.TimeInForceGTC,
	}, nil)

	// Create request
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID.String())

	// Execute
	w := httptest.NewRecorder()
	handler.PlaceOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code)

	var response OrderResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, orderID.String(), response.ID)
	assert.Equal(t, "BTC/USDT", response.Symbol)
	assert.Equal(t, "BUY", response.Side)
	assert.Equal(t, "LIMIT", response.Type)
	assert.Equal(t, "OPEN", response.Status)
	assert.Equal(t, "1.5", response.Quantity)
	assert.Equal(t, "0", response.FilledQuantity)

	mockService.AssertExpectations(t)
}

// Test PlaceOrder Handler - Missing Auth (auto-generates user ID for now)
func TestOrderHandler_PlaceOrder_MissingAuth(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	orderID := uuid.New()
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(1.5)

	reqBody := PlaceOrderRequest{
		Symbol:   "BTC/USDT",
		Side:     "BUY",
		Type:     "LIMIT",
		Quantity: "1.5",
		Price:    stringPtr("50000.00"),
	}

	// Mock service response (since it will be called with auto-generated user ID)
	mockService.On("PlaceOrder", mock.Anything, mock.Anything).Return(&domain.Order{
		ID:             orderID,
		UserID:         uuid.New(), // Auto-generated
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Status:         domain.OrderStatusOpen,
		Quantity:       quantity,
		FilledQuantity: decimal.Zero,
		Price:          &price,
		TimeInForce:    domain.TimeInForceGTC,
	}, nil)

	// Create request WITHOUT X-User-ID header
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	// Execute
	w := httptest.NewRecorder()
	handler.PlaceOrder(w, req)

	// Assert - Should still work with auto-generated user ID (for now, during development)
	// In production with auth middleware, this would be 401
	assert.Equal(t, http.StatusCreated, w.Code)

	// Service should have been called with auto-generated user ID
	mockService.AssertExpectations(t)
}

// Test PlaceOrder Handler - Invalid JSON
func TestOrderHandler_PlaceOrder_InvalidJSON(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()

	// Create request with invalid JSON
	req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID.String())

	// Execute
	w := httptest.NewRecorder()
	handler.PlaceOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var errResp ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)

	assert.Contains(t, errResp.Error, "Invalid request body")

	// Service should NOT be called
	mockService.AssertNotCalled(t, "PlaceOrder")
}

// Test PlaceOrder Handler - Missing Required Fields
func TestOrderHandler_PlaceOrder_MissingFields(t *testing.T) {
	testCases := []struct {
		name        string
		requestBody PlaceOrderRequest
		wantErrMsg  string
	}{
		{
			name: "Missing symbol",
			requestBody: PlaceOrderRequest{
				Side:     "BUY",
				Type:     "LIMIT",
				Quantity: "1.5",
				Price:    stringPtr("50000.00"),
			},
			wantErrMsg: "Invalid order request",
		},
		{
			name: "Missing side",
			requestBody: PlaceOrderRequest{
				Symbol:   "BTC/USDT",
				Type:     "LIMIT",
				Quantity: "1.5",
				Price:    stringPtr("50000.00"),
			},
			wantErrMsg: "Invalid order request",
		},
		{
			name: "Missing type",
			requestBody: PlaceOrderRequest{
				Symbol:   "BTC/USDT",
				Side:     "BUY",
				Quantity: "1.5",
				Price:    stringPtr("50000.00"),
			},
			wantErrMsg: "Invalid order request",
		},
		{
			name: "Missing quantity",
			requestBody: PlaceOrderRequest{
				Symbol:   "BTC/USDT",
				Side:     "BUY",
				Type:     "LIMIT",
				Quantity: "", // Empty string will cause parse error
				Price:    stringPtr("50000.00"),
			},
			wantErrMsg: "Invalid order parameters", // This will be caught at handler level during parse
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create fresh mock for each test
			mockService := new(MockOrderService)
			logger := zap.NewNop()
			handler := NewOrderHandler(mockService, logger)

			userID := uuid.New()

			// Only mock if we expect service to be called (not for parse errors)
			if tc.wantErrMsg == "Invalid order request" {
				// Mock service to return invalid request error (validation happens in service layer)
				mockService.On("PlaceOrder", mock.Anything, mock.Anything).Return(nil, service.ErrInvalidOrderRequest).Once()
			}

			body, _ := json.Marshal(tc.requestBody)
			req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", userID.String())

			w := httptest.NewRecorder()
			handler.PlaceOrder(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)

			var errResp ErrorResponse
			err := json.Unmarshal(w.Body.Bytes(), &errResp)
			require.NoError(t, err)

			assert.Contains(t, errResp.Error, tc.wantErrMsg)

			// Verify mock was called only if we expected it
			if tc.wantErrMsg == "Invalid order request" {
				mockService.AssertExpectations(t)
			}
		})
	}
}

// Test PlaceOrder Handler - Invalid Field Values
func TestOrderHandler_PlaceOrder_InvalidValues(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()

	testCases := []struct {
		name        string
		requestBody PlaceOrderRequest
		mockError   error
		wantStatus  int
	}{
		{
			name: "Invalid quantity format",
			requestBody: PlaceOrderRequest{
				Symbol:   "BTC/USDT",
				Side:     "BUY",
				Type:     "LIMIT",
				Quantity: "invalid",
				Price:    stringPtr("50000.00"),
			},
			mockError:  nil,
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "Invalid price format",
			requestBody: PlaceOrderRequest{
				Symbol:   "BTC/USDT",
				Side:     "BUY",
				Type:     "LIMIT",
				Quantity: "1.5",
				Price:    stringPtr("invalid"),
			},
			mockError:  nil,
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "Insufficient balance",
			requestBody: PlaceOrderRequest{
				Symbol:   "BTC/USDT",
				Side:     "BUY",
				Type:     "LIMIT",
				Quantity: "1.5",
				Price:    stringPtr("50000.00"),
			},
			mockError:  service.ErrInsufficientBalance,
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "Invalid order request",
			requestBody: PlaceOrderRequest{
				Symbol:   "BTC/USDT",
				Side:     "BUY",
				Type:     "LIMIT",
				Quantity: "0",
				Price:    stringPtr("50000.00"),
			},
			mockError:  service.ErrInvalidOrderRequest,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Mock service error if specified
			if tc.mockError != nil {
				mockService.On("PlaceOrder", mock.Anything, mock.Anything).Return(nil, tc.mockError).Once()
			}

			body, _ := json.Marshal(tc.requestBody)
			req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", userID.String())

			w := httptest.NewRecorder()
			handler.PlaceOrder(w, req)

			assert.Equal(t, tc.wantStatus, w.Code)
		})
	}
}

// Test GetOrder Handler - Success
func TestOrderHandler_GetOrder_Success(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()
	orderID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Mock service response
	mockService.On("GetOrder", mock.Anything, orderID, userID).Return(&domain.Order{
		ID:             orderID,
		UserID:         userID,
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Status:         domain.OrderStatusOpen,
		Quantity:       decimal.NewFromFloat(1.5),
		FilledQuantity: decimal.Zero,
		Price:          &price,
	}, nil)

	// Create request with chi router to handle URL params
	req := httptest.NewRequest("GET", "/api/v1/orders/"+orderID.String(), nil)
	req.Header.Set("X-User-ID", userID.String())

	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", orderID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Execute
	w := httptest.NewRecorder()
	handler.GetOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response OrderResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, orderID.String(), response.ID)
	assert.Equal(t, "BTC/USDT", response.Symbol)

	mockService.AssertExpectations(t)
}

// Test GetOrder Handler - Invalid UUID
func TestOrderHandler_GetOrder_InvalidUUID(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()

	// Create request with invalid UUID
	req := httptest.NewRequest("GET", "/api/v1/orders/invalid-uuid", nil)
	req.Header.Set("X-User-ID", userID.String())

	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Execute
	w := httptest.NewRecorder()
	handler.GetOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var errResp ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)

	assert.Contains(t, errResp.Error, "Invalid order ID")

	mockService.AssertNotCalled(t, "GetOrder")
}

// Test GetOrder Handler - Order Not Found
func TestOrderHandler_GetOrder_NotFound(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()
	orderID := uuid.New()

	// Mock service error
	mockService.On("GetOrder", mock.Anything, orderID, userID).Return(nil, service.ErrOrderNotFound)

	// Create request
	req := httptest.NewRequest("GET", "/api/v1/orders/"+orderID.String(), nil)
	req.Header.Set("X-User-ID", userID.String())

	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", orderID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Execute
	w := httptest.NewRecorder()
	handler.GetOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)

	var errResp ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)

	assert.Contains(t, errResp.Error, "Order not found")

	mockService.AssertExpectations(t)
}

// Test GetOrder Handler - Unauthorized
func TestOrderHandler_GetOrder_Unauthorized(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()
	orderID := uuid.New()

	// Mock service error
	mockService.On("GetOrder", mock.Anything, orderID, userID).Return(nil, service.ErrUnauthorized)

	// Create request
	req := httptest.NewRequest("GET", "/api/v1/orders/"+orderID.String(), nil)
	req.Header.Set("X-User-ID", userID.String())

	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", orderID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Execute
	w := httptest.NewRecorder()
	handler.GetOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusForbidden, w.Code)

	mockService.AssertExpectations(t)
}

// Test ListOrders Handler - Success No Filters
func TestOrderHandler_ListOrders_Success(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	orders := []*domain.Order{
		{
			ID:             uuid.New(),
			UserID:         userID,
			Symbol:         "BTC/USDT",
			Side:           domain.OrderSideBuy,
			Type:           domain.OrderTypeLimit,
			Status:         domain.OrderStatusOpen,
			Quantity:       decimal.NewFromFloat(1.5),
			FilledQuantity: decimal.Zero,
			Price:          &price,
		},
		{
			ID:             uuid.New(),
			UserID:         userID,
			Symbol:         "ETH/USDT",
			Side:           domain.OrderSideSell,
			Type:           domain.OrderTypeLimit,
			Status:         domain.OrderStatusFilled,
			Quantity:       decimal.NewFromFloat(2.0),
			FilledQuantity: decimal.NewFromFloat(2.0),
			Price:          &price,
		},
	}

	// Mock service response
	mockService.On("GetUserOrders", mock.Anything, userID, mock.MatchedBy(func(f repository.OrderFilters) bool {
		return f.Limit == 50
	})).Return(orders, nil)

	// Create request
	req := httptest.NewRequest("GET", "/api/v1/orders", nil)
	req.Header.Set("X-User-ID", userID.String())

	// Execute
	w := httptest.NewRecorder()
	handler.ListOrders(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response []OrderResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, 2, len(response))
	assert.Equal(t, "BTC/USDT", response[0].Symbol)
	assert.Equal(t, "ETH/USDT", response[1].Symbol)

	mockService.AssertExpectations(t)
}

// Test ListOrders Handler - With Filters
func TestOrderHandler_ListOrders_WithFilters(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	orders := []*domain.Order{
		{
			ID:             uuid.New(),
			UserID:         userID,
			Symbol:         "BTC/USDT",
			Side:           domain.OrderSideBuy,
			Type:           domain.OrderTypeLimit,
			Status:         domain.OrderStatusOpen,
			Quantity:       decimal.NewFromFloat(1.5),
			FilledQuantity: decimal.Zero,
			Price:          &price,
		},
	}

	// Mock service response with filters
	mockService.On("GetUserOrders", mock.Anything, userID, mock.MatchedBy(func(f repository.OrderFilters) bool {
		return f.Symbol != nil && *f.Symbol == "BTC/USDT" &&
			f.Status != nil && *f.Status == domain.OrderStatusOpen &&
			f.Limit == 10 &&
			f.Offset == 20
	})).Return(orders, nil)

	// Create request with query parameters
	req := httptest.NewRequest("GET", "/api/v1/orders?symbol=BTC/USDT&status=OPEN&limit=10&offset=20", nil)
	req.Header.Set("X-User-ID", userID.String())

	// Execute
	w := httptest.NewRecorder()
	handler.ListOrders(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response []OrderResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, 1, len(response))

	mockService.AssertExpectations(t)
}

// Test ListOrders Handler - Invalid Limit
func TestOrderHandler_ListOrders_InvalidLimit(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()

	// Mock service response (should use default limit)
	mockService.On("GetUserOrders", mock.Anything, userID, mock.MatchedBy(func(f repository.OrderFilters) bool {
		return f.Limit == 50 // Default limit
	})).Return([]*domain.Order{}, nil)

	// Create request with invalid limit
	req := httptest.NewRequest("GET", "/api/v1/orders?limit=invalid", nil)
	req.Header.Set("X-User-ID", userID.String())

	// Execute
	w := httptest.NewRecorder()
	handler.ListOrders(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	mockService.AssertExpectations(t)
}

// Test CancelOrder Handler - Success
func TestOrderHandler_CancelOrder_Success(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()
	orderID := uuid.New()
	price := decimal.NewFromFloat(50000.0)

	// Mock service cancel
	mockService.On("CancelOrder", mock.Anything, orderID, userID).Return(nil)

	// Mock service get order (after cancel)
	mockService.On("GetOrder", mock.Anything, orderID, userID).Return(&domain.Order{
		ID:             orderID,
		UserID:         userID,
		Symbol:         "BTC/USDT",
		Side:           domain.OrderSideBuy,
		Type:           domain.OrderTypeLimit,
		Status:         domain.OrderStatusCancelled,
		Quantity:       decimal.NewFromFloat(1.5),
		FilledQuantity: decimal.Zero,
		Price:          &price,
	}, nil)

	// Create request
	req := httptest.NewRequest("DELETE", "/api/v1/orders/"+orderID.String(), nil)
	req.Header.Set("X-User-ID", userID.String())

	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", orderID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Execute
	w := httptest.NewRecorder()
	handler.CancelOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response OrderResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "CANCELLED", response.Status)

	mockService.AssertExpectations(t)
}

// Test CancelOrder Handler - Order Not Found
func TestOrderHandler_CancelOrder_NotFound(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()
	orderID := uuid.New()

	// Mock service error
	mockService.On("CancelOrder", mock.Anything, orderID, userID).Return(service.ErrOrderNotFound)

	// Create request
	req := httptest.NewRequest("DELETE", "/api/v1/orders/"+orderID.String(), nil)
	req.Header.Set("X-User-ID", userID.String())

	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", orderID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Execute
	w := httptest.NewRecorder()
	handler.CancelOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)

	mockService.AssertExpectations(t)
}

// Test CancelOrder Handler - Order Not Cancellable
func TestOrderHandler_CancelOrder_NotCancellable(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()
	orderID := uuid.New()

	// Mock service error
	mockService.On("CancelOrder", mock.Anything, orderID, userID).Return(service.ErrOrderNotCancellable)

	// Create request
	req := httptest.NewRequest("DELETE", "/api/v1/orders/"+orderID.String(), nil)
	req.Header.Set("X-User-ID", userID.String())

	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", orderID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Execute
	w := httptest.NewRecorder()
	handler.CancelOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusConflict, w.Code)

	var errResp ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)

	assert.Contains(t, errResp.Error, "Order cannot be cancelled")

	mockService.AssertExpectations(t)
}

// Test CancelOrder Handler - Invalid UUID
func TestOrderHandler_CancelOrder_InvalidUUID(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()

	// Create request with invalid UUID
	req := httptest.NewRequest("DELETE", "/api/v1/orders/invalid-uuid", nil)
	req.Header.Set("X-User-ID", userID.String())

	// Setup chi context
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	// Execute
	w := httptest.NewRecorder()
	handler.CancelOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)

	mockService.AssertNotCalled(t, "CancelOrder")
}

// Test PlaceOrder Handler - Wallet Service Unavailable
func TestOrderHandler_PlaceOrder_WalletServiceUnavailable(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()

	reqBody := PlaceOrderRequest{
		Symbol:   "BTC/USDT",
		Side:     "BUY",
		Type:     "LIMIT",
		Quantity: "1.5",
		Price:    stringPtr("50000.00"),
	}

	// Mock service error
	mockService.On("PlaceOrder", mock.Anything, mock.Anything).Return(nil, service.ErrWalletServiceUnavailable)

	// Create request
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID.String())

	// Execute
	w := httptest.NewRecorder()
	handler.PlaceOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var errResp ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)

	assert.Contains(t, errResp.Error, "Wallet service unavailable")

	mockService.AssertExpectations(t)
}

// Test PlaceOrder Handler - Duplicate Client Order ID
func TestOrderHandler_PlaceOrder_DuplicateClientOrderID(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()

	reqBody := PlaceOrderRequest{
		Symbol:        "BTC/USDT",
		Side:          "BUY",
		Type:          "LIMIT",
		Quantity:      "1.5",
		Price:         stringPtr("50000.00"),
		ClientOrderID: stringPtr("client-123"),
	}

	// Mock service error
	mockService.On("PlaceOrder", mock.Anything, mock.Anything).Return(nil, service.ErrDuplicateClientOrderID)

	// Create request
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID.String())

	// Execute
	w := httptest.NewRecorder()
	handler.PlaceOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusConflict, w.Code)

	var errResp ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)

	assert.Contains(t, errResp.Error, "Duplicate client order ID")

	mockService.AssertExpectations(t)
}

// Test PlaceOrder Handler - Internal Server Error
func TestOrderHandler_PlaceOrder_InternalError(t *testing.T) {
	// Setup
	mockService := new(MockOrderService)
	logger := zap.NewNop()
	handler := NewOrderHandler(mockService, logger)

	userID := uuid.New()

	reqBody := PlaceOrderRequest{
		Symbol:   "BTC/USDT",
		Side:     "BUY",
		Type:     "LIMIT",
		Quantity: "1.5",
		Price:    stringPtr("50000.00"),
	}

	// Mock service error (unexpected error)
	mockService.On("PlaceOrder", mock.Anything, mock.Anything).Return(nil, errors.New("unexpected database error"))

	// Create request
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/v1/orders", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID.String())

	// Execute
	w := httptest.NewRecorder()
	handler.PlaceOrder(w, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var errResp ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &errResp)
	require.NoError(t, err)

	assert.Contains(t, errResp.Error, "Internal server error")

	mockService.AssertExpectations(t)
}

// Helper function
func stringPtr(s string) *string {
	return &s
}
