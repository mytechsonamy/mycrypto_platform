package server

import (
	"github.com/go-redis/redis/v8"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Handler holds the dependencies for HTTP handlers
type Handler struct {
	logger *zap.Logger
	db     *gorm.DB
	redis  *redis.Client
}

// NewHandler creates a new Handler instance
func NewHandler(logger *zap.Logger, db *gorm.DB, redis *redis.Client) *Handler {
	return &Handler{
		logger: logger,
		db:     db,
		redis:  redis,
	}
}
