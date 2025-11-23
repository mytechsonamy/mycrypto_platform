package server

import (
	"encoding/json"
	"net/http"

	"go.uber.org/zap"
)

// HealthResponse represents the health check response
type HealthResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
}

// ReadinessResponse represents the readiness check response
type ReadinessResponse struct {
	Status   string            `json:"status"`
	Services map[string]string `json:"services"`
}

// Health handles the health check endpoint
// GET /health
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	h.logger.Debug("Health check endpoint called")

	response := HealthResponse{
		Status:  "ok",
		Version: "1.0.0",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode health response", zap.Error(err))
		return
	}
}

// Ready handles the readiness check endpoint
// GET /ready
func (h *Handler) Ready(w http.ResponseWriter, r *http.Request) {
	h.logger.Debug("Readiness check endpoint called")

	services := make(map[string]string)
	allReady := true

	// Check database connectivity
	dbStatus := "ok"
	if h.db != nil {
		sqlDB, err := h.db.DB()
		if err != nil {
			dbStatus = "unavailable"
			allReady = false
			h.logger.Error("Failed to get database connection", zap.Error(err))
		} else {
			if err := sqlDB.Ping(); err != nil {
				dbStatus = "unavailable"
				allReady = false
				h.logger.Error("Database ping failed", zap.Error(err))
			}
		}
	} else {
		dbStatus = "not_configured"
	}
	services["database"] = dbStatus

	// Check Redis connectivity
	redisStatus := "ok"
	if h.redis != nil {
		if _, err := h.redis.Ping(r.Context()).Result(); err != nil {
			redisStatus = "unavailable"
			allReady = false
			h.logger.Error("Redis ping failed", zap.Error(err))
		}
	} else {
		redisStatus = "not_configured"
	}
	services["redis"] = redisStatus

	// Determine overall status
	status := "ready"
	statusCode := http.StatusOK
	if !allReady {
		status = "not_ready"
		statusCode = http.StatusServiceUnavailable
	}

	response := ReadinessResponse{
		Status:   status,
		Services: services,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode readiness response", zap.Error(err))
		return
	}
}
