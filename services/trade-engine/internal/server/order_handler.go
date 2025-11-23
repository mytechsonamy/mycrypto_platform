package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
	"github.com/mytrader/trade-engine/internal/service"
)

// OrderHandler handles order-related HTTP requests
type OrderHandler struct {
	orderService service.OrderService
	logger       *zap.Logger
}

// NewOrderHandler creates a new OrderHandler
func NewOrderHandler(orderService service.OrderService, logger *zap.Logger) *OrderHandler {
	return &OrderHandler{
		orderService: orderService,
		logger:       logger,
	}
}

// PlaceOrderRequest represents the HTTP request to place an order
type PlaceOrderRequest struct {
	Symbol        string  `json:"symbol" validate:"required,min=3,max=20"`
	Side          string  `json:"side" validate:"required,oneof=BUY SELL"`
	Type          string  `json:"type" validate:"required,oneof=MARKET LIMIT STOP"`
	Quantity      string  `json:"quantity" validate:"required"`
	Price         *string `json:"price,omitempty"`
	StopPrice     *string `json:"stop_price,omitempty"`
	TimeInForce   string  `json:"time_in_force" validate:"omitempty,oneof=GTC IOC FOK"`
	ClientOrderID *string `json:"client_order_id,omitempty" validate:"omitempty,max=100"`
}

// OrderResponse represents the HTTP response for an order
type OrderResponse struct {
	ID              string  `json:"id"`
	Symbol          string  `json:"symbol"`
	Side            string  `json:"side"`
	Type            string  `json:"type"`
	Status          string  `json:"status"`
	Quantity        string  `json:"quantity"`
	FilledQuantity  string  `json:"filled_quantity"`
	Price           *string `json:"price,omitempty"`
	StopPrice       *string `json:"stop_price,omitempty"`
	TimeInForce     string  `json:"time_in_force"`
	ClientOrderID   *string `json:"client_order_id,omitempty"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
	FilledAt        *string `json:"filled_at,omitempty"`
	CancelledAt     *string `json:"cancelled_at,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Code    string                 `json:"code"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// PlaceOrder godoc
// @Summary Place a new order
// @Description Create a new order (market, limit, or stop)
// @Tags orders
// @Accept json
// @Produce json
// @Param request body PlaceOrderRequest true "Order details"
// @Success 201 {object} OrderResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/orders [post]
func (h *OrderHandler) PlaceOrder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Decode request
	var req PlaceOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Get user ID from context (set by auth middleware)
	// For now, we'll use a mock user ID since auth is not implemented yet
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		// For testing, generate a user ID
		userID = uuid.New().String()
	}

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, "Invalid user ID", err)
		return
	}

	// Parse and validate request
	serviceReq, err := h.toServiceRequest(&req, parsedUserID)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid order parameters", err)
		return
	}

	// Place order
	order, err := h.orderService.PlaceOrder(ctx, serviceReq)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	// Respond with created order
	h.respondJSON(w, http.StatusCreated, h.toOrderResponse(order))
}

// GetOrder godoc
// @Summary Get order by ID
// @Description Retrieve order details by ID
// @Tags orders
// @Produce json
// @Param id path string true "Order ID"
// @Success 200 {object} OrderResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/orders/{id} [get]
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get order ID from URL
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid order ID", err)
		return
	}

	// Get user ID from context
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		userID = uuid.New().String()
	}

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, "Invalid user ID", err)
		return
	}

	// Get order
	order, err := h.orderService.GetOrder(ctx, orderID, parsedUserID)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	// Respond with order
	h.respondJSON(w, http.StatusOK, h.toOrderResponse(order))
}

// ListOrders godoc
// @Summary List user orders
// @Description Retrieve orders for the authenticated user with optional filters
// @Tags orders
// @Produce json
// @Param symbol query string false "Filter by symbol"
// @Param status query string false "Filter by status"
// @Param limit query int false "Limit number of results"
// @Param offset query int false "Offset for pagination"
// @Success 200 {array} OrderResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/orders [get]
func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user ID from context
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		userID = uuid.New().String()
	}

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, "Invalid user ID", err)
		return
	}

	// Parse filters from query parameters
	filters := h.parseFilters(r)

	// Get orders
	orders, err := h.orderService.GetUserOrders(ctx, parsedUserID, filters)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	// Convert to response
	response := make([]OrderResponse, len(orders))
	for i, order := range orders {
		response[i] = *h.toOrderResponse(order)
	}

	// Respond with orders
	h.respondJSON(w, http.StatusOK, response)
}

// CancelOrder godoc
// @Summary Cancel an order
// @Description Cancel an existing order
// @Tags orders
// @Produce json
// @Param id path string true "Order ID"
// @Success 200 {object} OrderResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /api/v1/orders/{id} [delete]
func (h *OrderHandler) CancelOrder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get order ID from URL
	orderIDStr := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid order ID", err)
		return
	}

	// Get user ID from context
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		userID = uuid.New().String()
	}

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		h.respondError(w, http.StatusUnauthorized, "Invalid user ID", err)
		return
	}

	// Cancel order
	if err := h.orderService.CancelOrder(ctx, orderID, parsedUserID); err != nil {
		h.handleServiceError(w, err)
		return
	}

	// Get updated order to return
	order, err := h.orderService.GetOrder(ctx, orderID, parsedUserID)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	// Respond with cancelled order
	h.respondJSON(w, http.StatusOK, h.toOrderResponse(order))
}

// Helper functions

func (h *OrderHandler) toServiceRequest(req *PlaceOrderRequest, userID uuid.UUID) (*service.PlaceOrderRequest, error) {
	// Parse quantity
	quantity, err := decimal.NewFromString(req.Quantity)
	if err != nil {
		return nil, errors.New("invalid quantity format")
	}

	// Parse price if provided
	var price *decimal.Decimal
	if req.Price != nil {
		p, err := decimal.NewFromString(*req.Price)
		if err != nil {
			return nil, errors.New("invalid price format")
		}
		price = &p
	}

	// Parse stop price if provided
	var stopPrice *decimal.Decimal
	if req.StopPrice != nil {
		sp, err := decimal.NewFromString(*req.StopPrice)
		if err != nil {
			return nil, errors.New("invalid stop price format")
		}
		stopPrice = &sp
	}

	// Default time in force
	timeInForce := domain.TimeInForceGTC
	if req.TimeInForce != "" {
		timeInForce = domain.TimeInForce(req.TimeInForce)
	}

	return &service.PlaceOrderRequest{
		UserID:        userID,
		Symbol:        req.Symbol,
		Side:          domain.OrderSide(req.Side),
		Type:          domain.OrderType(req.Type),
		Quantity:      quantity,
		Price:         price,
		StopPrice:     stopPrice,
		TimeInForce:   timeInForce,
		ClientOrderID: req.ClientOrderID,
	}, nil
}

func (h *OrderHandler) toOrderResponse(order *domain.Order) *OrderResponse {
	resp := &OrderResponse{
		ID:             order.ID.String(),
		Symbol:         order.Symbol,
		Side:           string(order.Side),
		Type:           string(order.Type),
		Status:         string(order.Status),
		Quantity:       order.Quantity.String(),
		FilledQuantity: order.FilledQuantity.String(),
		TimeInForce:    string(order.TimeInForce),
		ClientOrderID:  order.ClientOrderID,
		CreatedAt:      order.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:      order.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if order.Price != nil {
		priceStr := order.Price.String()
		resp.Price = &priceStr
	}

	if order.StopPrice != nil {
		stopPriceStr := order.StopPrice.String()
		resp.StopPrice = &stopPriceStr
	}

	if order.FilledAt != nil {
		filledAtStr := order.FilledAt.Format("2006-01-02T15:04:05Z07:00")
		resp.FilledAt = &filledAtStr
	}

	if order.CancelledAt != nil {
		cancelledAtStr := order.CancelledAt.Format("2006-01-02T15:04:05Z07:00")
		resp.CancelledAt = &cancelledAtStr
	}

	return resp
}

func (h *OrderHandler) parseFilters(r *http.Request) repository.OrderFilters {
	filters := repository.OrderFilters{
		Limit:   50, // Default limit
		OrderBy: "created_at DESC",
	}

	// Parse symbol filter
	if symbol := r.URL.Query().Get("symbol"); symbol != "" {
		filters.Symbol = &symbol
	}

	// Parse status filter
	if status := r.URL.Query().Get("status"); status != "" {
		orderStatus := domain.OrderStatus(status)
		filters.Status = &orderStatus
	}

	// Parse limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		var limit int
		if _, err := fmt.Sscanf(limitStr, "%d", &limit); err == nil && limit > 0 && limit <= 100 {
			filters.Limit = limit
		}
	}

	// Parse offset
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		var offset int
		if _, err := fmt.Sscanf(offsetStr, "%d", &offset); err == nil && offset >= 0 {
			filters.Offset = offset
		}
	}

	return filters
}

func (h *OrderHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrOrderNotFound):
		h.respondError(w, http.StatusNotFound, "Order not found", err)
	case errors.Is(err, service.ErrInsufficientBalance):
		h.respondError(w, http.StatusBadRequest, "Insufficient balance", err)
	case errors.Is(err, service.ErrInvalidOrderRequest):
		h.respondError(w, http.StatusBadRequest, "Invalid order request", err)
	case errors.Is(err, service.ErrUnauthorized):
		h.respondError(w, http.StatusForbidden, "Unauthorized", err)
	case errors.Is(err, service.ErrOrderNotCancellable):
		h.respondError(w, http.StatusConflict, "Order cannot be cancelled", err)
	case errors.Is(err, service.ErrDuplicateClientOrderID):
		h.respondError(w, http.StatusConflict, "Duplicate client order ID", err)
	case errors.Is(err, service.ErrWalletServiceUnavailable):
		h.respondError(w, http.StatusServiceUnavailable, "Wallet service unavailable", err)
	default:
		h.logger.Error("Unexpected service error", zap.Error(err))
		h.respondError(w, http.StatusInternalServerError, "Internal server error", err)
	}
}

func (h *OrderHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Error("Failed to encode JSON response", zap.Error(err))
	}
}

func (h *OrderHandler) respondError(w http.ResponseWriter, status int, message string, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	errResp := ErrorResponse{
		Error:   message,
		Code:    http.StatusText(status),
		Details: make(map[string]interface{}),
	}

	if err != nil {
		errResp.Details["error"] = err.Error()
	}

	if err := json.NewEncoder(w).Encode(errResp); err != nil {
		h.logger.Error("Failed to encode error response", zap.Error(err))
	}
}
