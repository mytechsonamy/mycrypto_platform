package wallet

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/sony/gobreaker"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// httpWalletClient implements WalletClient using HTTP requests
type httpWalletClient struct {
	config      *ClientConfig
	httpClient  *http.Client
	breaker     *gobreaker.CircuitBreaker
	rateLimiter *rate.Limiter
	logger      *zap.Logger
}

// NewHTTPWalletClient creates a new HTTP-based wallet client with resilience patterns
func NewHTTPWalletClient(config *ClientConfig, logger *zap.Logger) (WalletClient, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	client := &httpWalletClient{
		config: config,
		logger: logger,
		httpClient: &http.Client{
			Timeout: config.Timeout,
			Transport: &http.Transport{
				MaxIdleConns:        config.MaxIdleConns,
				MaxIdleConnsPerHost: config.MaxIdleConnsPerHost,
				IdleConnTimeout:     config.IdleConnTimeout,
			},
		},
	}

	// Setup circuit breaker if enabled
	if config.CircuitBreakerEnabled {
		client.breaker = gobreaker.NewCircuitBreaker(gobreaker.Settings{
			Name:        "wallet-service",
			MaxRequests: config.CircuitBreakerMaxRequests,
			Interval:    config.CircuitBreakerInterval,
			Timeout:     config.CircuitBreakerTimeout,
			ReadyToTrip: func(counts gobreaker.Counts) bool {
				failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
				return counts.Requests >= 3 && failureRatio >= config.CircuitBreakerFailureRatio
			},
			OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
				logger.Warn("Circuit breaker state changed",
					zap.String("name", name),
					zap.String("from", from.String()),
					zap.String("to", to.String()),
				)
			},
		})
	}

	// Setup rate limiter if enabled
	if config.RateLimitEnabled {
		client.rateLimiter = rate.NewLimiter(rate.Limit(config.RateLimitRPS), config.RateLimitRPS)
	}

	return client, nil
}

// GetBalance retrieves the balance for a user and currency
func (c *httpWalletClient) GetBalance(userID uuid.UUID, currency string) (*BalanceResponse, error) {
	url := fmt.Sprintf("%s/api/wallets/balance/%s/%s", c.config.BaseURL, userID.String(), currency)

	var response BalanceResponse
	err := c.doRequest("GET", url, nil, &response)
	if err != nil {
		return nil, err
	}

	return &response, nil
}

// ReserveBalance locks funds for an order placement
func (c *httpWalletClient) ReserveBalance(req *ReserveBalanceRequest) (*ReserveBalanceResponse, error) {
	url := fmt.Sprintf("%s/api/wallets/reserve", c.config.BaseURL)

	var response ReserveBalanceResponse
	err := c.doRequest("POST", url, req, &response)
	if err != nil {
		return nil, err
	}

	return &response, nil
}

// ReleaseBalance unlocks previously reserved funds
func (c *httpWalletClient) ReleaseBalance(req *ReleaseBalanceRequest) (*ReleaseBalanceResponse, error) {
	url := fmt.Sprintf("%s/api/wallets/release", c.config.BaseURL)

	var response ReleaseBalanceResponse
	err := c.doRequest("POST", url, req, &response)
	if err != nil {
		return nil, err
	}

	return &response, nil
}

// SettleTrade executes the fund transfer for a completed trade
func (c *httpWalletClient) SettleTrade(req *SettleTradeRequest) (*SettleTradeResponse, error) {
	url := fmt.Sprintf("%s/api/wallets/settle", c.config.BaseURL)

	var response SettleTradeResponse
	err := c.doRequest("POST", url, req, &response)
	if err != nil {
		return nil, err
	}

	return &response, nil
}

// Close closes the HTTP client and releases resources
func (c *httpWalletClient) Close() error {
	c.httpClient.CloseIdleConnections()
	return nil
}

// doRequest executes an HTTP request with retry logic and circuit breaker
func (c *httpWalletClient) doRequest(method, url string, body interface{}, result interface{}) error {
	// Check rate limiter if enabled
	if c.rateLimiter != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := c.rateLimiter.Wait(ctx); err != nil {
			c.logger.Warn("Rate limit exceeded", zap.Error(err))
			return fmt.Errorf("rate limit exceeded: %w", err)
		}
	}

	// Execute request with circuit breaker if enabled
	if c.breaker != nil {
		_, err := c.breaker.Execute(func() (interface{}, error) {
			return nil, c.doRequestWithRetry(method, url, body, result)
		})
		if err != nil {
			if err == gobreaker.ErrOpenState {
				return ErrCircuitOpen
			}
			return err
		}
		return nil
	}

	// Execute without circuit breaker
	return c.doRequestWithRetry(method, url, body, result)
}

// doRequestWithRetry executes an HTTP request with exponential backoff retry
func (c *httpWalletClient) doRequestWithRetry(method, url string, body interface{}, result interface{}) error {
	var lastErr error
	waitTime := c.config.RetryWaitTime

	for attempt := 0; attempt <= c.config.MaxRetries; attempt++ {
		if attempt > 0 {
			c.logger.Debug("Retrying request",
				zap.Int("attempt", attempt),
				zap.Duration("wait_time", waitTime),
			)
			time.Sleep(waitTime)

			// Exponential backoff with jitter
			waitTime *= 2
			if waitTime > c.config.RetryMaxWaitTime {
				waitTime = c.config.RetryMaxWaitTime
			}
		}

		err := c.doSingleRequest(method, url, body, result)
		if err == nil {
			return nil
		}

		lastErr = err

		// Don't retry on client errors (4xx)
		if err == ErrInvalidRequest || err == ErrInsufficientBalance || err == ErrUserNotFound || err == ErrReservationNotFound {
			return err
		}

		c.logger.Warn("Request failed, will retry",
			zap.Error(err),
			zap.Int("attempt", attempt+1),
			zap.Int("max_retries", c.config.MaxRetries),
		)
	}

	return fmt.Errorf("request failed after %d attempts: %w", c.config.MaxRetries+1, lastErr)
}

// doSingleRequest executes a single HTTP request
func (c *httpWalletClient) doSingleRequest(method, url string, body interface{}, result interface{}) error {
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}
		reqBody = bytes.NewReader(jsonData)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "trade-engine/1.0")

	startTime := time.Now()
	resp, err := c.httpClient.Do(req)
	duration := time.Since(startTime)

	if err != nil {
		c.logger.Error("HTTP request failed",
			zap.String("method", method),
			zap.String("url", url),
			zap.Error(err),
			zap.Duration("duration", duration),
		)
		return ErrWalletServiceDown
	}
	defer resp.Body.Close()

	c.logger.Debug("HTTP request completed",
		zap.String("method", method),
		zap.String("url", url),
		zap.Int("status", resp.StatusCode),
		zap.Duration("duration", duration),
	)

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	// Handle error status codes
	if resp.StatusCode >= 400 {
		return c.handleErrorResponse(resp.StatusCode, respBody)
	}

	// Parse success response
	if result != nil {
		if err := json.Unmarshal(respBody, result); err != nil {
			c.logger.Error("Failed to unmarshal response",
				zap.Error(err),
				zap.String("body", string(respBody)),
			)
			return ErrInvalidResponse
		}
	}

	return nil
}

// handleErrorResponse converts HTTP error responses to appropriate errors
func (c *httpWalletClient) handleErrorResponse(statusCode int, body []byte) error {
	// Try to parse error response
	var errorResp struct {
		Error   string `json:"error"`
		Message string `json:"message"`
		Code    string `json:"code"`
	}

	if err := json.Unmarshal(body, &errorResp); err != nil {
		c.logger.Warn("Failed to parse error response",
			zap.Error(err),
			zap.Int("status_code", statusCode),
		)
	}

	c.logger.Warn("Wallet service returned error",
		zap.Int("status_code", statusCode),
		zap.String("error", errorResp.Error),
		zap.String("message", errorResp.Message),
		zap.String("code", errorResp.Code),
	)

	switch statusCode {
	case http.StatusBadRequest:
		if errorResp.Code == "INSUFFICIENT_BALANCE" {
			return ErrInsufficientBalance
		}
		return ErrInvalidRequest
	case http.StatusNotFound:
		if errorResp.Code == "USER_NOT_FOUND" {
			return ErrUserNotFound
		}
		if errorResp.Code == "RESERVATION_NOT_FOUND" {
			return ErrReservationNotFound
		}
		return fmt.Errorf("resource not found: %s", errorResp.Message)
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("authentication/authorization failed: %s", errorResp.Message)
	case http.StatusTooManyRequests:
		return fmt.Errorf("rate limit exceeded: %s", errorResp.Message)
	case http.StatusServiceUnavailable:
		return ErrWalletServiceDown
	default:
		return fmt.Errorf("wallet service error (status %d): %s", statusCode, errorResp.Message)
	}
}
