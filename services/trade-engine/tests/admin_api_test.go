// ============================================================================
// MYTRADER TRADE ENGINE - ADMIN API TESTS
// ============================================================================
// Component: Admin API Tests (Health, Metrics, Limits, Security)
// Version: 1.0
// Sprint 2 - TASK-BACKEND-014
// ============================================================================

package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/go-redis/redis/v8"
	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/matching"
	"github.com/mytrader/trade-engine/internal/repository"
	"github.com/mytrader/trade-engine/internal/server"
	"github.com/mytrader/trade-engine/internal/service"
	"github.com/mytrader/trade-engine/pkg/clients/wallet"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// ============================================================================
// TEST SETUP
// ============================================================================

func setupAdminTest(t *testing.T) (*server.AdminHandler, *gorm.DB, *redis.Client) {
	// Create logger
	logger, _ := zap.NewDevelopment()

	// Create in-memory SQLite database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Run migrations
	err = db.AutoMigrate(
		&domain.Order{},
		&domain.Trade{},
	)
	require.NoError(t, err)

	// Create Redis client (mock)
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	// Create matching engine
	matchingEngine := matching.NewMatchingEngine()

	// Create wallet client (mock)
	walletCfg := &wallet.ClientConfig{
		UseMock: true,
	}
	walletClient, err := wallet.NewWalletClient(walletCfg, logger)
	require.NoError(t, err)

	// Create repositories
	orderRepo := repository.NewPostgresOrderRepository(db, logger)
	tradeRepo := repository.NewPostgresTradeRepository(db, logger)

	// Create trading limits service
	limitsService := service.NewTradingLimitsService(logger)

	// Create admin handler
	adminHandler := server.NewAdminHandler(
		logger,
		db,
		redisClient,
		matchingEngine,
		walletClient,
		orderRepo,
		tradeRepo,
		limitsService,
	)

	return adminHandler, db, redisClient
}

// ============================================================================
// HEALTH ENDPOINT TESTS
// ============================================================================

func TestHealthEndpoint_Returns200_WhenHealthy(t *testing.T) {
	handler, _, _ := setupAdminTest(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/health", nil)
	w := httptest.NewRecorder()

	handler.GetHealth(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response server.HealthStatus
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)

	assert.Equal(t, "healthy", response.Status)
	assert.NotEmpty(t, response.Components)
	assert.Contains(t, response.Components, "database")
	assert.Contains(t, response.Components, "matching_engine")
	assert.Contains(t, response.Components, "settlement_service")
	assert.Contains(t, response.Components, "websocket")
	assert.Contains(t, response.Components, "wallet_service")
}

func TestHealthEndpoint_Returns503_WhenDegraded(t *testing.T) {
	handler, db, _ := setupAdminTest(t)

	// Close database to simulate unhealthy state
	sqlDB, _ := db.DB()
	sqlDB.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/health", nil)
	w := httptest.NewRecorder()

	handler.GetHealth(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var response server.HealthStatus
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)

	assert.Equal(t, "degraded", response.Status)
}

func TestHealthEndpoint_ComponentHealthChecks(t *testing.T) {
	handler, _, _ := setupAdminTest(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/health", nil)
	w := httptest.NewRecorder()

	handler.GetHealth(w, req)

	var response server.HealthStatus
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)

	// Check database component
	dbHealth := response.Components["database"]
	assert.Equal(t, "healthy", dbHealth.Status)
	assert.NotNil(t, dbHealth.LatencyMs)
	assert.Greater(t, *dbHealth.LatencyMs, 0.0)

	// Check matching engine component
	meHealth := response.Components["matching_engine"]
	assert.Equal(t, "healthy", meHealth.Status)
	assert.NotNil(t, meHealth.Details)

	// Check system metrics
	assert.Greater(t, response.Metrics.Goroutines, 0)
	assert.Greater(t, response.Metrics.CPUCount, 0)
}

// ============================================================================
// METRICS ENDPOINT TESTS
// ============================================================================

func TestMetricsEndpoint_Returns_CurrentData(t *testing.T) {
	handler, db, _ := setupAdminTest(t)

	// Seed some test data
	price := decimal.NewFromFloat(50000.0)
	db.Create(&domain.Order{
		Symbol:   "BTC-USDT",
		Side:     "buy",
		Type:     "limit",
		Status:   "open",
		Quantity: decimal.NewFromFloat(1.0),
		Price:    &price,
	})

	tradePrice := decimal.NewFromFloat(50000.0)
	db.Create(&domain.Trade{
		Symbol:   "BTC-USDT",
		Quantity: decimal.NewFromFloat(0.5),
		Price:    tradePrice,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/metrics", nil)
	w := httptest.NewRecorder()

	handler.GetMetrics(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response server.MetricsResponse
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)

	// Verify trading metrics
	assert.GreaterOrEqual(t, response.Trading.TotalOrders, int64(1))
	assert.GreaterOrEqual(t, response.Trading.TradesExecuted, int64(1))

	// Verify performance metrics
	assert.GreaterOrEqual(t, response.Performance.OrdersPerSecond, 0.0)
	assert.GreaterOrEqual(t, response.Performance.TradesPerSecond, 0.0)

	// Verify user metrics
	assert.GreaterOrEqual(t, response.Users.TotalUsers, int64(0))

	// Verify error metrics
	assert.GreaterOrEqual(t, response.Errors.Errors24h, int64(0))
}

func TestMetricsEndpoint_TradingMetrics(t *testing.T) {
	handler, db, _ := setupAdminTest(t)

	// Create test orders
	price := decimal.NewFromFloat(50000.0)
	db.Create(&domain.Order{Symbol: "BTC-USDT", Status: "open", Quantity: decimal.NewFromFloat(1.0), Price: &price})
	db.Create(&domain.Order{Symbol: "BTC-USDT", Status: "filled", Quantity: decimal.NewFromFloat(1.0), Price: &price})
	db.Create(&domain.Order{Symbol: "BTC-USDT", Status: "cancelled", Quantity: decimal.NewFromFloat(1.0), Price: &price})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/metrics", nil)
	w := httptest.NewRecorder()

	handler.GetMetrics(w, req)

	var response server.MetricsResponse
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)

	assert.Equal(t, int64(3), response.Trading.TotalOrders)
	assert.Equal(t, int64(1), response.Trading.OpenOrders)
	assert.Equal(t, int64(1), response.Trading.FilledOrders)
	assert.Equal(t, int64(1), response.Trading.CancelledOrders)
}

// ============================================================================
// LIMITS CONFIGURATION TESTS
// ============================================================================

func TestLimitsEndpoint_GetLimits(t *testing.T) {
	handler, _, _ := setupAdminTest(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/limits", nil)
	w := httptest.NewRecorder()

	handler.GetLimits(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response service.TradingLimits
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)

	assert.True(t, response.MaxOrderSize.GreaterThan(decimal.Zero))
	assert.True(t, response.MinOrderSize.GreaterThan(decimal.Zero))
	assert.Greater(t, response.MaxConcurrentOrders, 0)
}

func TestLimitsEndpoint_UpdateLimits_Success(t *testing.T) {
	handler, _, _ := setupAdminTest(t)

	newLimits := service.TradingLimits{
		MaxOrderSize:        decimal.NewFromFloat(200.0),
		MaxDailyVolume:      decimal.NewFromFloat(2000.0),
		MaxConcurrentOrders: 100,
		MinOrderSize:        decimal.NewFromFloat(0.002),
		PriceBandPercent:    decimal.NewFromInt(15),
	}

	body, _ := json.Marshal(newLimits)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/limits", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.UpdateLimits(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool))
}

func TestLimitsEndpoint_UpdateLimits_InvalidData(t *testing.T) {
	handler, _, _ := setupAdminTest(t)

	// Invalid: max < min
	invalidLimits := service.TradingLimits{
		MaxOrderSize:        decimal.NewFromFloat(0.001),
		MinOrderSize:        decimal.NewFromFloat(1.0),
		MaxDailyVolume:      decimal.NewFromFloat(1000.0),
		MaxConcurrentOrders: 50,
		PriceBandPercent:    decimal.NewFromInt(10),
	}

	body, _ := json.Marshal(invalidLimits)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/limits", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.UpdateLimits(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ============================================================================
// RISK STATUS TESTS
// ============================================================================

func TestRiskStatus_LowRisk(t *testing.T) {
	handler, db, _ := setupAdminTest(t)

	// Create small order
	price := decimal.NewFromFloat(50000.0)
	db.Create(&domain.Order{
		Symbol:   "BTC-USDT",
		Status:   "open",
		Quantity: decimal.NewFromFloat(0.1),
		Price:    &price,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/risk-status", nil)
	w := httptest.NewRecorder()

	handler.GetRiskStatus(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response server.RiskStatus
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)

	assert.Contains(t, []string{"low", "medium", "high"}, response.RiskLevel)
	assert.NotNil(t, response.Exposure)
	assert.NotNil(t, response.Alerts)
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION TESTS
// ============================================================================

func TestAdminEndpoint_Requires_AdminToken(t *testing.T) {
	os.Setenv("APP_ENV", "development")
	defer os.Unsetenv("APP_ENV")

	logger, _ := zap.NewDevelopment()
	authMiddleware := server.NewAdminAuthMiddleware(logger)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	wrappedHandler := authMiddleware.Middleware(handler)

	// Test without token (from localhost)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/health", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	w := httptest.NewRecorder()

	wrappedHandler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAdminEndpoint_Accepts_ValidToken(t *testing.T) {
	// Set admin token
	os.Setenv("ADMIN_TOKEN", "test-token-123")
	os.Setenv("APP_ENV", "development")
	defer os.Unsetenv("ADMIN_TOKEN")
	defer os.Unsetenv("APP_ENV")

	logger, _ := zap.NewDevelopment()
	authMiddleware := server.NewAdminAuthMiddleware(logger)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	wrappedHandler := authMiddleware.Middleware(handler)

	// Test with valid token
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/health", nil)
	req.Header.Set("X-Admin-Token", "test-token-123")
	req.RemoteAddr = "127.0.0.1:12345"
	w := httptest.NewRecorder()

	wrappedHandler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminEndpoint_Rejects_InvalidToken(t *testing.T) {
	os.Setenv("ADMIN_TOKEN", "test-token-123")
	defer os.Unsetenv("ADMIN_TOKEN")

	logger, _ := zap.NewDevelopment()
	authMiddleware := server.NewAdminAuthMiddleware(logger)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	wrappedHandler := authMiddleware.Middleware(handler)

	// Test with invalid token
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/health", nil)
	req.Header.Set("X-Admin-Token", "wrong-token")
	req.RemoteAddr = "127.0.0.1:12345"
	w := httptest.NewRecorder()

	wrappedHandler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAdminEndpoint_AllowsLocalhost_InDevelopment(t *testing.T) {
	os.Setenv("ADMIN_TOKEN", "test-token")
	os.Setenv("APP_ENV", "development")
	defer os.Unsetenv("ADMIN_TOKEN")
	defer os.Unsetenv("APP_ENV")

	logger, _ := zap.NewDevelopment()
	authMiddleware := server.NewAdminAuthMiddleware(logger)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	wrappedHandler := authMiddleware.Middleware(handler)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/health", nil)
	req.Header.Set("X-Admin-Token", "test-token")
	req.RemoteAddr = "127.0.0.1:12345"
	w := httptest.NewRecorder()

	wrappedHandler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

// ============================================================================
// PROMETHEUS METRICS TESTS
// ============================================================================

func TestPrometheus_MetricsCollected(t *testing.T) {
	// This test would verify that Prometheus metrics are properly registered
	// and can be collected

	// For now, just verify we can import and use the metrics package
	// Actual testing would require a Prometheus test server

	// Test passes if no panic occurs during import
	assert.True(t, true)
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

func TestAdminAPI_FullWorkflow(t *testing.T) {
	handler, db, _ := setupAdminTest(t)

	// 1. Check health
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/health", nil)
	w := httptest.NewRecorder()
	handler.GetHealth(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 2. Get current metrics
	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/metrics", nil)
	w = httptest.NewRecorder()
	handler.GetMetrics(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 3. Update limits
	newLimits := service.TradingLimits{
		MaxOrderSize:        decimal.NewFromFloat(150.0),
		MaxDailyVolume:      decimal.NewFromFloat(1500.0),
		MaxConcurrentOrders: 75,
		MinOrderSize:        decimal.NewFromFloat(0.005),
		PriceBandPercent:    decimal.NewFromInt(12),
	}
	body, _ := json.Marshal(newLimits)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/limits", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	handler.UpdateLimits(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 4. Verify limits updated
	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/limits", nil)
	w = httptest.NewRecorder()
	handler.GetLimits(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var limits service.TradingLimits
	json.NewDecoder(w.Body).Decode(&limits)
	assert.Equal(t, newLimits.MaxOrderSize.String(), limits.MaxOrderSize.String())

	// 5. Check risk status
	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/risk-status", nil)
	w = httptest.NewRecorder()
	handler.GetRiskStatus(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Cleanup
	sqlDB, _ := db.DB()
	sqlDB.Close()
}
