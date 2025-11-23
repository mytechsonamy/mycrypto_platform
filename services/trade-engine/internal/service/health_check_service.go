// ============================================================================
// MYTRADER TRADE ENGINE - HEALTH CHECK & GRACEFUL DEGRADATION SERVICE
// ============================================================================
// Component: Health monitoring and graceful degradation for production hardening
// Version: 1.0
// Purpose: Track health of dependencies and enable graceful degradation
// ============================================================================

package service

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ServiceHealth represents the health status of a service dependency
type ServiceHealth struct {
	Name             string
	IsHealthy        bool
	LastCheckedAt    time.Time
	LastErrorMessage string
	ErrorCount       int
	SuccessCount     int
}

// HealthCheckService monitors the health of service dependencies
type HealthCheckService struct {
	logger *zap.Logger
	db     *gorm.DB

	// Health status for each service
	services map[string]*ServiceHealth
	mu       sync.RWMutex

	// Configuration for graceful degradation
	unhealthyThreshold int           // Number of failures before marking unhealthy
	checkInterval      time.Duration // How often to run health checks
	recoveryTimeout    time.Duration // Time to wait before retrying a failed service

	// Degraded mode flag (when critical services fail)
	degradedMode bool
}

// NewHealthCheckService creates a new health check service
func NewHealthCheckService(logger *zap.Logger, db *gorm.DB) *HealthCheckService {
	return &HealthCheckService{
		logger:             logger,
		db:                 db,
		services:           make(map[string]*ServiceHealth),
		unhealthyThreshold: 3,
		checkInterval:      30 * time.Second,
		recoveryTimeout:    2 * time.Minute,
		degradedMode:       false,
	}
}

// RegisterService registers a service for health monitoring
func (hcs *HealthCheckService) RegisterService(name string) {
	hcs.mu.Lock()
	defer hcs.mu.Unlock()

	hcs.services[name] = &ServiceHealth{
		Name:        name,
		IsHealthy:   true,
		LastCheckedAt: time.Now(),
	}
}

// RecordSuccess records a successful service call
func (hcs *HealthCheckService) RecordSuccess(serviceName string) {
	hcs.mu.Lock()
	defer hcs.mu.Unlock()

	if service, exists := hcs.services[serviceName]; exists {
		service.SuccessCount++
		service.ErrorCount = 0 // Reset error count on success
		service.LastErrorMessage = ""

		// Recover from degraded mode if all services healthy
		if !service.IsHealthy {
			service.IsHealthy = true
			hcs.logger.Info("Service recovered from unhealthy state",
				zap.String("service", serviceName),
			)
		}
	}
}

// RecordError records a failed service call
func (hcs *HealthCheckService) RecordError(serviceName string, err error) {
	hcs.mu.Lock()
	defer hcs.mu.Unlock()

	if service, exists := hcs.services[serviceName]; exists {
		service.ErrorCount++
		service.LastErrorMessage = err.Error()
		service.LastCheckedAt = time.Now()

		// Mark as unhealthy if error threshold exceeded
		if service.ErrorCount >= hcs.unhealthyThreshold {
			if service.IsHealthy {
				service.IsHealthy = false
				hcs.degradedMode = true
				hcs.logger.Warn("Service marked as unhealthy - entering degraded mode",
					zap.String("service", serviceName),
					zap.String("error", err.Error()),
					zap.Int("error_count", service.ErrorCount),
				)
			}
		}
	}
}

// IsServiceHealthy checks if a specific service is healthy
func (hcs *HealthCheckService) IsServiceHealthy(serviceName string) bool {
	hcs.mu.RLock()
	defer hcs.mu.RUnlock()

	if service, exists := hcs.services[serviceName]; exists {
		return service.IsHealthy
	}
	return true // Assume healthy if not tracked
}

// IsDegradedMode returns true if system is in degraded mode
func (hcs *HealthCheckService) IsDegradedMode() bool {
	hcs.mu.RLock()
	defer hcs.mu.RUnlock()

	return hcs.degradedMode
}

// GetServiceStatus returns current status of all services
func (hcs *HealthCheckService) GetServiceStatus() map[string]*ServiceHealth {
	hcs.mu.RLock()
	defer hcs.mu.RUnlock()

	// Return a copy to avoid external modification
	status := make(map[string]*ServiceHealth)
	for name, svc := range hcs.services {
		// Create a copy of the service health
		copy := *svc
		status[name] = &copy
	}
	return status
}

// CheckDatabaseHealth performs a health check on the database
func (hcs *HealthCheckService) CheckDatabaseHealth(ctx context.Context) bool {
	if hcs.db == nil {
		hcs.RecordError("database", gorm.ErrInvalidDB)
		return false
	}

	sqlDB, err := hcs.db.DB()
	if err != nil {
		hcs.RecordError("database", err)
		return false
	}

	// Ping the database with timeout
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		hcs.RecordError("database", err)
		return false
	}

	hcs.RecordSuccess("database")
	return true
}

// GetOrderWithFallback attempts to get an order with graceful fallback
//
// In degraded mode, returns cached/incomplete data rather than failing
func (hcs *HealthCheckService) GetOrderWithFallback(
	ctx context.Context,
	orderID uuid.UUID,
	getFunc func(context.Context, uuid.UUID) (interface{}, error),
) (interface{}, error) {
	// Attempt normal retrieval
	result, err := getFunc(ctx, orderID)
	if err == nil {
		hcs.RecordSuccess("order_retrieval")
		return result, nil
	}

	hcs.RecordError("order_retrieval", err)

	// In degraded mode, we could return a cached version or default value
	// For now, we log and return the error
	if hcs.IsDegradedMode() {
		hcs.logger.Warn("Operating in degraded mode - may return incomplete data",
			zap.Any("order_id", orderID),
			zap.Error(err),
		)
	}

	return nil, err
}

// ResetServiceHealth resets error counters for a service (used for recovery testing)
func (hcs *HealthCheckService) ResetServiceHealth(serviceName string) {
	hcs.mu.Lock()
	defer hcs.mu.Unlock()

	if service, exists := hcs.services[serviceName]; exists {
		service.ErrorCount = 0
		service.IsHealthy = true
		hcs.logger.Info("Service health reset",
			zap.String("service", serviceName),
		)

		// Check if we can exit degraded mode
		canRecover := true
		for _, svc := range hcs.services {
			if !svc.IsHealthy {
				canRecover = false
				break
			}
		}

		if canRecover && hcs.degradedMode {
			hcs.degradedMode = false
			hcs.logger.Info("Exiting degraded mode - all services recovered")
		}
	}
}
