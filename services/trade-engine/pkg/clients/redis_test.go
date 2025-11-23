package clients

import (
	"testing"
	"time"

	"github.com/mytrader/trade-engine/pkg/config"
	"github.com/mytrader/trade-engine/pkg/logger"
)

func TestNewRedisClient(t *testing.T) {
	// Skip if Redis is not available
	cfg := &config.Config{
		Redis: config.RedisConfig{
			Host:         "127.0.0.1",
			Port:         6380,
			Password:     "",
			DB:           0,
			MaxRetries:   3,
			PoolSize:     10,
			DialTimeout:  5 * time.Second,
			ReadTimeout:  3 * time.Second,
			WriteTimeout: 3 * time.Second,
		},
		Logging: config.LoggingConfig{
			Level:  "info",
			Format: "json",
		},
	}

	log, err := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	client, err := NewRedisClient(cfg, log)
	if err != nil {
		t.Skipf("Skipping Redis test (Redis not available): %v", err)
		return
	}
	defer CloseRedisClient(client, log)

	// Verify connection
	ctx := client.Context()
	if _, err := client.Ping(ctx).Result(); err != nil {
		t.Errorf("Failed to ping Redis: %v", err)
	}
}

func TestNewRedisClientInvalidConfig(t *testing.T) {
	cfg := &config.Config{
		Redis: config.RedisConfig{
			Host:         "invalid-host-12345",
			Port:         9999,
			Password:     "",
			DB:           0,
			MaxRetries:   3,
			PoolSize:     10,
			DialTimeout:  1 * time.Second,
			ReadTimeout:  1 * time.Second,
			WriteTimeout: 1 * time.Second,
		},
		Logging: config.LoggingConfig{
			Level:  "info",
			Format: "json",
		},
	}

	log, err := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	_, err = NewRedisClient(cfg, log)
	if err == nil {
		t.Error("NewRedisClient() with invalid config should return error")
	}
}

func TestCloseRedisClient(t *testing.T) {
	cfg := &config.Config{
		Redis: config.RedisConfig{
			Host:         "127.0.0.1",
			Port:         6380,
			Password:     "",
			DB:           0,
			MaxRetries:   3,
			PoolSize:     10,
			DialTimeout:  5 * time.Second,
			ReadTimeout:  3 * time.Second,
			WriteTimeout: 3 * time.Second,
		},
		Logging: config.LoggingConfig{
			Level:  "info",
			Format: "json",
		},
	}

	log, err := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	client, err := NewRedisClient(cfg, log)
	if err != nil {
		t.Skipf("Skipping Redis test (Redis not available): %v", err)
		return
	}

	// Close should not return error
	if err := CloseRedisClient(client, log); err != nil {
		t.Errorf("CloseRedisClient() error = %v", err)
	}
}
