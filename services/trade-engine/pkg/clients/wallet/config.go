package wallet

import (
	"fmt"
	"time"
)

// ClientConfig holds the configuration for the wallet service client
type ClientConfig struct {
	// BaseURL is the wallet service base URL (e.g., "http://localhost:3002")
	BaseURL string

	// Timeout is the request timeout duration
	Timeout time.Duration

	// MaxRetries is the maximum number of retry attempts
	MaxRetries int

	// RetryWaitTime is the initial wait time between retries
	RetryWaitTime time.Duration

	// RetryMaxWaitTime is the maximum wait time between retries
	RetryMaxWaitTime time.Duration

	// CircuitBreaker configuration
	CircuitBreakerEnabled      bool
	CircuitBreakerMaxRequests  uint32        // Max requests allowed in half-open state
	CircuitBreakerInterval     time.Duration // Interval for resetting failure counts
	CircuitBreakerTimeout      time.Duration // Duration of open state before half-open
	CircuitBreakerFailureRatio float64       // Ratio of failures to trip the circuit (0.0-1.0)

	// Connection pooling
	MaxIdleConns        int
	MaxIdleConnsPerHost int
	IdleConnTimeout     time.Duration

	// Rate limiting (requests per second)
	RateLimitEnabled bool
	RateLimitRPS     int

	// Enable mock mode for testing
	UseMock bool
}

// DefaultConfig returns a configuration with sensible defaults
func DefaultConfig() *ClientConfig {
	return &ClientConfig{
		BaseURL:                    "http://localhost:3002",
		Timeout:                    5 * time.Second,
		MaxRetries:                 3,
		RetryWaitTime:              100 * time.Millisecond,
		RetryMaxWaitTime:           2 * time.Second,
		CircuitBreakerEnabled:      true,
		CircuitBreakerMaxRequests:  3,
		CircuitBreakerInterval:     10 * time.Second,
		CircuitBreakerTimeout:      30 * time.Second,
		CircuitBreakerFailureRatio: 0.6,
		MaxIdleConns:               100,
		MaxIdleConnsPerHost:        10,
		IdleConnTimeout:            90 * time.Second,
		RateLimitEnabled:           false,
		RateLimitRPS:               100,
		UseMock:                    false,
	}
}

// Validate validates the configuration
func (c *ClientConfig) Validate() error {
	if c.BaseURL == "" {
		return fmt.Errorf("baseURL cannot be empty")
	}

	if c.Timeout <= 0 {
		return fmt.Errorf("timeout must be positive")
	}

	if c.MaxRetries < 0 {
		return fmt.Errorf("maxRetries cannot be negative")
	}

	if c.RetryWaitTime < 0 {
		return fmt.Errorf("retryWaitTime cannot be negative")
	}

	if c.RetryMaxWaitTime < c.RetryWaitTime {
		return fmt.Errorf("retryMaxWaitTime must be >= retryWaitTime")
	}

	if c.CircuitBreakerEnabled {
		if c.CircuitBreakerFailureRatio < 0 || c.CircuitBreakerFailureRatio > 1 {
			return fmt.Errorf("circuitBreakerFailureRatio must be between 0 and 1")
		}
	}

	if c.MaxIdleConns < 0 {
		return fmt.Errorf("maxIdleConns cannot be negative")
	}

	if c.RateLimitEnabled && c.RateLimitRPS <= 0 {
		return fmt.Errorf("rateLimitRPS must be positive when rate limiting is enabled")
	}

	return nil
}
