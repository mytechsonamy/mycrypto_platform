package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// TestHealthCheckService_RegisterAndTrack verifies service registration and tracking
func TestHealthCheckService_RegisterAndTrack(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)

	// Register services
	hcs.RegisterService("database")
	hcs.RegisterService("wallet")

	// Check that services are registered
	status := hcs.GetServiceStatus()
	assert.Len(t, status, 2)
	assert.True(t, status["database"].IsHealthy)
	assert.True(t, status["wallet"].IsHealthy)
}

// TestHealthCheckService_RecordSuccess verifies success recording
func TestHealthCheckService_RecordSuccess(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)
	hcs.RegisterService("test_service")

	// Record successes
	hcs.RecordSuccess("test_service")
	hcs.RecordSuccess("test_service")

	status := hcs.GetServiceStatus()
	assert.Equal(t, 2, status["test_service"].SuccessCount)
	assert.Equal(t, 0, status["test_service"].ErrorCount)
	assert.True(t, status["test_service"].IsHealthy)
}

// TestHealthCheckService_ErrorThreshold verifies unhealthy marking after threshold
func TestHealthCheckService_ErrorThreshold(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)
	hcs.RegisterService("test_service")

	testErr := errors.New("service unavailable")

	// Record errors up to threshold
	for i := 0; i < hcs.unhealthyThreshold; i++ {
		hcs.RecordError("test_service", testErr)
		status := hcs.GetServiceStatus()

		if i < hcs.unhealthyThreshold-1 {
			assert.True(t, status["test_service"].IsHealthy, "Should be healthy before threshold")
		} else {
			assert.False(t, status["test_service"].IsHealthy, "Should be unhealthy at threshold")
		}
	}
}

// TestHealthCheckService_DegradedMode verifies degraded mode activation
func TestHealthCheckService_DegradedMode(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)
	hcs.RegisterService("critical_service")

	assert.False(t, hcs.IsDegradedMode(), "Should not be in degraded mode initially")

	testErr := errors.New("critical failure")

	// Trigger unhealthy state
	for i := 0; i < hcs.unhealthyThreshold; i++ {
		hcs.RecordError("critical_service", testErr)
	}

	assert.True(t, hcs.IsDegradedMode(), "Should be in degraded mode after threshold")
}

// TestHealthCheckService_Recovery verifies recovery from degraded mode
func TestHealthCheckService_Recovery(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)
	hcs.RegisterService("service1")
	hcs.RegisterService("service2")

	testErr := errors.New("temporary failure")

	// Mark services as unhealthy
	for i := 0; i < hcs.unhealthyThreshold; i++ {
		hcs.RecordError("service1", testErr)
		hcs.RecordError("service2", testErr)
	}

	assert.True(t, hcs.IsDegradedMode(), "Should be in degraded mode")

	// Reset health
	hcs.ResetServiceHealth("service1")
	hcs.ResetServiceHealth("service2")

	assert.False(t, hcs.IsDegradedMode(), "Should exit degraded mode when all recover")
}

// TestHealthCheckService_ErrorCountReset verifies error count resets on success
func TestHealthCheckService_ErrorCountReset(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)
	hcs.RegisterService("test_service")

	testErr := errors.New("temporary error")

	// Record some errors
	hcs.RecordError("test_service", testErr)
	hcs.RecordError("test_service", testErr)

	status := hcs.GetServiceStatus()
	assert.Equal(t, 2, status["test_service"].ErrorCount)

	// Record success - should reset error count
	hcs.RecordSuccess("test_service")

	status = hcs.GetServiceStatus()
	assert.Equal(t, 0, status["test_service"].ErrorCount)
	assert.Equal(t, 1, status["test_service"].SuccessCount)
}

// TestHealthCheckService_GetServiceWithFallback verifies fallback behavior
func TestHealthCheckService_GetOrderWithFallback(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)
	hcs.RegisterService("order_retrieval")

	orderID := uuid.New()
	testErr := errors.New("database error")

	// Function that succeeds
	successFunc := func(ctx context.Context, id uuid.UUID) (interface{}, error) {
		return "order_data", nil
	}

	// Function that fails
	failFunc := func(ctx context.Context, id uuid.UUID) (interface{}, error) {
		return nil, testErr
	}

	// Test success case
	result, err := hcs.GetOrderWithFallback(context.Background(), orderID, successFunc)
	assert.NoError(t, err)
	assert.Equal(t, "order_data", result)

	status := hcs.GetServiceStatus()
	assert.Equal(t, 1, status["order_retrieval"].SuccessCount)

	// Test failure case
	result, err = hcs.GetOrderWithFallback(context.Background(), orderID, failFunc)
	assert.Error(t, err)
	assert.Nil(t, result)

	status = hcs.GetServiceStatus()
	assert.Equal(t, 1, status["order_retrieval"].ErrorCount)
}

// TestHealthCheckService_Concurrency verifies thread safety
func TestHealthCheckService_Concurrency(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)
	hcs.RegisterService("concurrent_service")

	var wg sync.WaitGroup

	// Concurrent successes only
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			hcs.RecordSuccess("concurrent_service")
		}()
	}

	// Wait for all goroutines
	wg.Wait()

	// Verify final state is consistent
	status := hcs.GetServiceStatus()
	require.NotNil(t, status["concurrent_service"])
	assert.Equal(t, 100, status["concurrent_service"].SuccessCount)
	assert.True(t, status["concurrent_service"].IsHealthy)
}

// TestHealthCheckService_UnregisteredService handles unregistered services gracefully
func TestHealthCheckService_UnregisteredService(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)

	// Check health of unregistered service
	assert.True(t, hcs.IsServiceHealthy("unknown_service"), "Unregistered service should be assumed healthy")

	// Record error on unregistered service (should not panic)
	hcs.RecordError("unknown_service", errors.New("error"))
	assert.True(t, hcs.IsServiceHealthy("unknown_service"), "Still no tracking of unknown service")
}

// TestHealthCheckService_LastErrorMessage verifies error message tracking
func TestHealthCheckService_LastErrorMessage(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)
	hcs.RegisterService("test_service")

	testErr := errors.New("specific database error message")

	hcs.RecordError("test_service", testErr)

	status := hcs.GetServiceStatus()
	assert.Equal(t, "specific database error message", status["test_service"].LastErrorMessage)

	// Error message cleared on success
	hcs.RecordSuccess("test_service")
	status = hcs.GetServiceStatus()
	assert.Equal(t, "", status["test_service"].LastErrorMessage)
}

// TestHealthCheckService_LastCheckedAt verifies timestamp tracking
func TestHealthCheckService_LastCheckedAt(t *testing.T) {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	hcs := NewHealthCheckService(logger, nil)
	hcs.RegisterService("test_service")

	before := time.Now()
	time.Sleep(10 * time.Millisecond) // Small delay

	testErr := errors.New("test error")
	hcs.RecordError("test_service", testErr)

	time.Sleep(10 * time.Millisecond) // Small delay
	after := time.Now()

	status := hcs.GetServiceStatus()
	assert.True(t, status["test_service"].LastCheckedAt.After(before))
	assert.True(t, status["test_service"].LastCheckedAt.Before(after))
}
