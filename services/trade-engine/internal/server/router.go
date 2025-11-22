package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// NewRouter creates a new HTTP router with all routes and middleware configured
func NewRouter(logger *zap.Logger, db *gorm.DB, redis *redis.Client) http.Handler {
	r := chi.NewRouter()

	// Create handler with dependencies
	h := NewHandler(logger, db, redis)

	// Global middleware
	r.Use(RequestIDMiddleware)
	r.Use(MetricsMiddleware)
	r.Use(LoggingMiddleware(logger))
	r.Use(RecoveryMiddleware(logger))
	r.Use(CORSMiddleware)
	r.Use(middleware.Compress(5))

	// Metrics endpoint (no authentication required, prometheus will scrape this)
	r.Handle("/metrics", promhttp.Handler())

	// Health check endpoints (no authentication required)
	r.Get("/health", h.Health)
	r.Get("/ready", h.Ready)

	// API routes will be added here in future phases
	r.Route("/api/v1", func(r chi.Router) {
		// Future API endpoints will be added here
		// Example:
		// r.Route("/orders", func(r chi.Router) {
		//     r.Get("/", h.ListOrders)
		//     r.Post("/", h.CreateOrder)
		//     r.Get("/{id}", h.GetOrder)
		//     r.Delete("/{id}", h.CancelOrder)
		// })
	})

	return r
}
