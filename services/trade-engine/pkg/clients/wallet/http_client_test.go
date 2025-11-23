package wallet

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"
)

func TestNewHTTPWalletClient(t *testing.T) {
	logger := zaptest.NewLogger(t)

	tests := []struct {
		name    string
		config  *ClientConfig
		wantErr bool
	}{
		{
			name:    "valid config",
			config:  DefaultConfig(),
			wantErr: false,
		},
		{
			name: "invalid config",
			config: &ClientConfig{
				BaseURL: "",
				Timeout: 5 * time.Second,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, err := NewHTTPWalletClient(tt.config, logger)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, client)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, client)
				assert.NoError(t, client.Close())
			}
		})
	}
}

func TestHTTPWalletClient_GetBalance_Success(t *testing.T) {
	logger := zaptest.NewLogger(t)

	userID := uuid.New()
	currency := "BTC"

	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "GET", r.Method)
		assert.Contains(t, r.URL.Path, userID.String())
		assert.Contains(t, r.URL.Path, currency)

		response := BalanceResponse{
			UserID:           userID,
			Currency:         currency,
			AvailableBalance: decimal.NewFromFloat(10.5),
			ReservedBalance:  decimal.NewFromFloat(1.5),
			TotalBalance:     decimal.NewFromFloat(12.0),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	config := DefaultConfig()
	config.BaseURL = server.URL
	config.CircuitBreakerEnabled = false

	client, err := NewHTTPWalletClient(config, logger)
	require.NoError(t, err)
	defer client.Close()

	resp, err := client.GetBalance(userID, currency)
	require.NoError(t, err)
	assert.Equal(t, userID, resp.UserID)
	assert.Equal(t, currency, resp.Currency)
	assert.True(t, decimal.NewFromFloat(10.5).Equal(resp.AvailableBalance))
}

func TestHTTPWalletClient_ReserveBalance_Success(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.URL.Path, "/reserve")

		var req ReserveBalanceRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		require.NoError(t, err)

		response := ReserveBalanceResponse{
			ReservationID:    uuid.New(),
			Success:          true,
			AvailableBalance: decimal.NewFromFloat(900.0),
			ReservedBalance:  req.Amount,
			Message:          "Balance reserved successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	config := DefaultConfig()
	config.BaseURL = server.URL
	config.CircuitBreakerEnabled = false

	client, err := NewHTTPWalletClient(config, logger)
	require.NoError(t, err)
	defer client.Close()

	req := &ReserveBalanceRequest{
		UserID:   uuid.New(),
		Currency: "USDT",
		Amount:   decimal.NewFromFloat(100.0),
		OrderID:  uuid.New(),
		Reason:   "ORDER_PLACEMENT",
	}

	resp, err := client.ReserveBalance(req)
	require.NoError(t, err)
	assert.True(t, resp.Success)
	assert.NotEqual(t, uuid.Nil, resp.ReservationID)
}

func TestHTTPWalletClient_ReleaseBalance_Success(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.URL.Path, "/release")

		response := ReleaseBalanceResponse{
			Success:        true,
			ReleasedAmount: decimal.NewFromFloat(100.0),
			Message:        "Balance released successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	config := DefaultConfig()
	config.BaseURL = server.URL
	config.CircuitBreakerEnabled = false

	client, err := NewHTTPWalletClient(config, logger)
	require.NoError(t, err)
	defer client.Close()

	req := &ReleaseBalanceRequest{
		ReservationID: uuid.New(),
		OrderID:       uuid.New(),
		Reason:        "ORDER_CANCELLED",
	}

	resp, err := client.ReleaseBalance(req)
	require.NoError(t, err)
	assert.True(t, resp.Success)
	assert.True(t, decimal.NewFromFloat(100.0).Equal(resp.ReleasedAmount))
}

func TestHTTPWalletClient_SettleTrade_Success(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.URL.Path, "/settle")

		response := SettleTradeResponse{
			Success:                   true,
			SettlementID:              uuid.New(),
			BuyerReservationReleased:  true,
			SellerReservationReleased: true,
			Message:                   "Trade settled successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	config := DefaultConfig()
	config.BaseURL = server.URL
	config.CircuitBreakerEnabled = false

	client, err := NewHTTPWalletClient(config, logger)
	require.NoError(t, err)
	defer client.Close()

	req := &SettleTradeRequest{
		TradeID:       uuid.New(),
		BuyerID:       uuid.New(),
		SellerID:      uuid.New(),
		BuyerOrderID:  uuid.New(),
		SellerOrderID: uuid.New(),
		BaseCurrency:  "BTC",
		QuoteCurrency: "USDT",
		BaseAmount:    decimal.NewFromFloat(0.5),
		QuoteAmount:   decimal.NewFromFloat(25000.0),
		Price:         decimal.NewFromFloat(50000.0),
		BuyerFee:      decimal.NewFromFloat(25.0),
		SellerFee:     decimal.NewFromFloat(0.0005),
	}

	resp, err := client.SettleTrade(req)
	require.NoError(t, err)
	assert.True(t, resp.Success)
	assert.NotEqual(t, uuid.Nil, resp.SettlementID)
}

func TestHTTPWalletClient_ErrorHandling(t *testing.T) {
	logger := zaptest.NewLogger(t)

	tests := []struct {
		name           string
		statusCode     int
		errorCode      string
		expectedError  error
	}{
		{
			name:          "insufficient balance",
			statusCode:    http.StatusBadRequest,
			errorCode:     "INSUFFICIENT_BALANCE",
			expectedError: ErrInsufficientBalance,
		},
		{
			name:          "user not found",
			statusCode:    http.StatusNotFound,
			errorCode:     "USER_NOT_FOUND",
			expectedError: ErrUserNotFound,
		},
		{
			name:          "reservation not found",
			statusCode:    http.StatusNotFound,
			errorCode:     "RESERVATION_NOT_FOUND",
			expectedError: ErrReservationNotFound,
		},
		{
			name:          "service unavailable",
			statusCode:    http.StatusServiceUnavailable,
			errorCode:     "SERVICE_DOWN",
			expectedError: ErrWalletServiceDown,
		},
		{
			name:          "invalid request",
			statusCode:    http.StatusBadRequest,
			errorCode:     "INVALID_REQUEST",
			expectedError: ErrInvalidRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock server that returns errors
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				errorResp := map[string]string{
					"error":   "Error message",
					"message": "Detailed error message",
					"code":    tt.errorCode,
				}

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tt.statusCode)
				json.NewEncoder(w).Encode(errorResp)
			}))
			defer server.Close()

			config := DefaultConfig()
			config.BaseURL = server.URL
			config.CircuitBreakerEnabled = false
			config.MaxRetries = 0 // No retries for error tests

			client, err := NewHTTPWalletClient(config, logger)
			require.NoError(t, err)
			defer client.Close()

			// Test with ReserveBalance (could be any method)
			_, err = client.ReserveBalance(&ReserveBalanceRequest{
				UserID:   uuid.New(),
				Currency: "BTC",
				Amount:   decimal.NewFromFloat(1.0),
				OrderID:  uuid.New(),
			})

			assert.Error(t, err)
			assert.ErrorIs(t, err, tt.expectedError)
		})
	}
}

func TestHTTPWalletClient_Retry(t *testing.T) {
	logger := zaptest.NewLogger(t)

	attemptCount := 0
	successAfter := 2

	// Create mock server that fails first N attempts then succeeds
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attemptCount++

		if attemptCount < successAfter {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		response := BalanceResponse{
			UserID:           uuid.New(),
			Currency:         "BTC",
			AvailableBalance: decimal.NewFromFloat(10.0),
			ReservedBalance:  decimal.Zero,
			TotalBalance:     decimal.NewFromFloat(10.0),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	config := DefaultConfig()
	config.BaseURL = server.URL
	config.CircuitBreakerEnabled = false
	config.MaxRetries = 3
	config.RetryWaitTime = 10 * time.Millisecond
	config.RetryMaxWaitTime = 50 * time.Millisecond

	client, err := NewHTTPWalletClient(config, logger)
	require.NoError(t, err)
	defer client.Close()

	_, err = client.GetBalance(uuid.New(), "BTC")
	assert.NoError(t, err)
	assert.Equal(t, successAfter, attemptCount)
}

func TestHTTPWalletClient_ServiceDown(t *testing.T) {
	logger := zaptest.NewLogger(t)

	config := DefaultConfig()
	config.BaseURL = "http://localhost:9999" // Non-existent service
	config.CircuitBreakerEnabled = false
	config.MaxRetries = 0
	config.Timeout = 100 * time.Millisecond

	client, err := NewHTTPWalletClient(config, logger)
	require.NoError(t, err)
	defer client.Close()

	_, err = client.GetBalance(uuid.New(), "BTC")
	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrWalletServiceDown)
}

func TestHTTPWalletClient_InvalidJSON(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Create mock server that returns invalid JSON
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("invalid json"))
	}))
	defer server.Close()

	config := DefaultConfig()
	config.BaseURL = server.URL
	config.CircuitBreakerEnabled = false

	client, err := NewHTTPWalletClient(config, logger)
	require.NoError(t, err)
	defer client.Close()

	_, err = client.GetBalance(uuid.New(), "BTC")
	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidResponse)
}

func TestNewWalletClient_Factory(t *testing.T) {
	logger := zaptest.NewLogger(t)

	t.Run("create mock client", func(t *testing.T) {
		config := DefaultConfig()
		config.UseMock = true

		client, err := NewWalletClient(config, logger)
		require.NoError(t, err)
		assert.NotNil(t, client)

		// Verify it's a mock client by checking interface type
		_, isMock := client.(*mockWalletClient)
		assert.True(t, isMock)

		assert.NoError(t, client.Close())
	})

	t.Run("create HTTP client", func(t *testing.T) {
		config := DefaultConfig()
		config.UseMock = false

		client, err := NewWalletClient(config, logger)
		require.NoError(t, err)
		assert.NotNil(t, client)

		// Verify it's an HTTP client
		_, isHTTP := client.(*httpWalletClient)
		assert.True(t, isHTTP)

		assert.NoError(t, client.Close())
	})

	t.Run("nil logger", func(t *testing.T) {
		config := DefaultConfig()

		client, err := NewWalletClient(config, nil)
		assert.Error(t, err)
		assert.Nil(t, client)
		assert.Contains(t, err.Error(), "logger cannot be nil")
	})
}
