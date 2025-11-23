package clients

import (
	"context"
	"fmt"

	"github.com/go-redis/redis/v8"
	"github.com/mytrader/trade-engine/pkg/config"
	"go.uber.org/zap"
)

// NewRedisClient creates a new Redis client connection
func NewRedisClient(cfg *config.Config, log *zap.Logger) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         cfg.GetRedisAddr(),
		Password:     cfg.Redis.Password,
		DB:           cfg.Redis.DB,
		MaxRetries:   cfg.Redis.MaxRetries,
		PoolSize:     cfg.Redis.PoolSize,
		DialTimeout:  cfg.Redis.DialTimeout,
		ReadTimeout:  cfg.Redis.ReadTimeout,
		WriteTimeout: cfg.Redis.WriteTimeout,
	})

	// Verify connection
	ctx := context.Background()
	if _, err := client.Ping(ctx).Result(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Info("Redis connection established",
		zap.String("host", cfg.Redis.Host),
		zap.Int("port", cfg.Redis.Port),
		zap.Int("db", cfg.Redis.DB),
	)

	return client, nil
}

// CloseRedisClient closes the Redis connection
func CloseRedisClient(client *redis.Client, log *zap.Logger) error {
	if err := client.Close(); err != nil {
		return fmt.Errorf("failed to close Redis: %w", err)
	}

	log.Info("Redis connection closed")
	return nil
}
