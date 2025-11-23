package wallet

import (
	"fmt"

	"go.uber.org/zap"
)

// NewWalletClient creates a new wallet client based on configuration
// If config.UseMock is true, returns a mock client for testing
// Otherwise, returns an HTTP client for production use
func NewWalletClient(config *ClientConfig, logger *zap.Logger) (WalletClient, error) {
	if logger == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	if config.UseMock {
		logger.Info("Creating mock wallet client")
		return NewMockWalletClient(logger), nil
	}

	logger.Info("Creating HTTP wallet client",
		zap.String("base_url", config.BaseURL),
		zap.Duration("timeout", config.Timeout),
		zap.Int("max_retries", config.MaxRetries),
		zap.Bool("circuit_breaker_enabled", config.CircuitBreakerEnabled),
	)

	return NewHTTPWalletClient(config, logger)
}
