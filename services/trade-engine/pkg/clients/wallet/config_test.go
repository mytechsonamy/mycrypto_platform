package wallet

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestDefaultConfig(t *testing.T) {
	config := DefaultConfig()

	assert.NotNil(t, config)
	assert.Equal(t, "http://localhost:3002", config.BaseURL)
	assert.Equal(t, 5*time.Second, config.Timeout)
	assert.Equal(t, 3, config.MaxRetries)
	assert.Equal(t, 100*time.Millisecond, config.RetryWaitTime)
	assert.Equal(t, 2*time.Second, config.RetryMaxWaitTime)
	assert.True(t, config.CircuitBreakerEnabled)
	assert.Equal(t, uint32(3), config.CircuitBreakerMaxRequests)
	assert.Equal(t, 10*time.Second, config.CircuitBreakerInterval)
	assert.Equal(t, 30*time.Second, config.CircuitBreakerTimeout)
	assert.Equal(t, 0.6, config.CircuitBreakerFailureRatio)
	assert.Equal(t, 100, config.MaxIdleConns)
	assert.Equal(t, 10, config.MaxIdleConnsPerHost)
	assert.Equal(t, 90*time.Second, config.IdleConnTimeout)
	assert.False(t, config.RateLimitEnabled)
	assert.Equal(t, 100, config.RateLimitRPS)
	assert.False(t, config.UseMock)
}

func TestClientConfig_Validate(t *testing.T) {
	tests := []struct {
		name    string
		config  *ClientConfig
		wantErr bool
		errMsg  string
	}{
		{
			name:    "valid default config",
			config:  DefaultConfig(),
			wantErr: false,
		},
		{
			name: "empty baseURL",
			config: &ClientConfig{
				BaseURL: "",
				Timeout: 5 * time.Second,
			},
			wantErr: true,
			errMsg:  "baseURL cannot be empty",
		},
		{
			name: "zero timeout",
			config: &ClientConfig{
				BaseURL: "http://localhost:3002",
				Timeout: 0,
			},
			wantErr: true,
			errMsg:  "timeout must be positive",
		},
		{
			name: "negative timeout",
			config: &ClientConfig{
				BaseURL: "http://localhost:3002",
				Timeout: -1 * time.Second,
			},
			wantErr: true,
			errMsg:  "timeout must be positive",
		},
		{
			name: "negative maxRetries",
			config: &ClientConfig{
				BaseURL:    "http://localhost:3002",
				Timeout:    5 * time.Second,
				MaxRetries: -1,
			},
			wantErr: true,
			errMsg:  "maxRetries cannot be negative",
		},
		{
			name: "negative retryWaitTime",
			config: &ClientConfig{
				BaseURL:       "http://localhost:3002",
				Timeout:       5 * time.Second,
				MaxRetries:    3,
				RetryWaitTime: -100 * time.Millisecond,
			},
			wantErr: true,
			errMsg:  "retryWaitTime cannot be negative",
		},
		{
			name: "retryMaxWaitTime less than retryWaitTime",
			config: &ClientConfig{
				BaseURL:          "http://localhost:3002",
				Timeout:          5 * time.Second,
				MaxRetries:       3,
				RetryWaitTime:    2 * time.Second,
				RetryMaxWaitTime: 1 * time.Second,
			},
			wantErr: true,
			errMsg:  "retryMaxWaitTime must be >= retryWaitTime",
		},
		{
			name: "invalid circuit breaker failure ratio - too low",
			config: &ClientConfig{
				BaseURL:                    "http://localhost:3002",
				Timeout:                    5 * time.Second,
				MaxRetries:                 3,
				RetryWaitTime:              100 * time.Millisecond,
				RetryMaxWaitTime:           2 * time.Second,
				CircuitBreakerEnabled:      true,
				CircuitBreakerFailureRatio: -0.1,
			},
			wantErr: true,
			errMsg:  "circuitBreakerFailureRatio must be between 0 and 1",
		},
		{
			name: "invalid circuit breaker failure ratio - too high",
			config: &ClientConfig{
				BaseURL:                    "http://localhost:3002",
				Timeout:                    5 * time.Second,
				MaxRetries:                 3,
				RetryWaitTime:              100 * time.Millisecond,
				RetryMaxWaitTime:           2 * time.Second,
				CircuitBreakerEnabled:      true,
				CircuitBreakerFailureRatio: 1.5,
			},
			wantErr: true,
			errMsg:  "circuitBreakerFailureRatio must be between 0 and 1",
		},
		{
			name: "negative maxIdleConns",
			config: &ClientConfig{
				BaseURL:          "http://localhost:3002",
				Timeout:          5 * time.Second,
				MaxRetries:       3,
				RetryWaitTime:    100 * time.Millisecond,
				RetryMaxWaitTime: 2 * time.Second,
				MaxIdleConns:     -1,
			},
			wantErr: true,
			errMsg:  "maxIdleConns cannot be negative",
		},
		{
			name: "rate limit enabled with invalid RPS",
			config: &ClientConfig{
				BaseURL:          "http://localhost:3002",
				Timeout:          5 * time.Second,
				MaxRetries:       3,
				RetryWaitTime:    100 * time.Millisecond,
				RetryMaxWaitTime: 2 * time.Second,
				MaxIdleConns:     100,
				RateLimitEnabled: true,
				RateLimitRPS:     0,
			},
			wantErr: true,
			errMsg:  "rateLimitRPS must be positive when rate limiting is enabled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
