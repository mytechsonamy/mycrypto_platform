package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// ============================================================================
// HTTP Request Metrics
// ============================================================================

var (
	// HTTPRequestsTotal counts total HTTP requests
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "trade_engine",
			Name:      "http_requests_total",
			Help:      "Total HTTP requests by method, path, and status code",
		},
		[]string{"method", "path", "status"},
	)

	// HTTPRequestDuration tracks HTTP request latency
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "trade_engine",
			Name:      "http_request_duration_seconds",
			Help:      "HTTP request latency in seconds",
			Buckets: []float64{
				0.001,  // 1ms
				0.005,  // 5ms
				0.01,   // 10ms
				0.025,  // 25ms
				0.05,   // 50ms
				0.1,    // 100ms
				0.25,   // 250ms
				0.5,    // 500ms
				1.0,    // 1s
				2.5,    // 2.5s
				5.0,    // 5s
				10.0,   // 10s
			},
		},
		[]string{"method", "path"},
	)

	// HTTPResponseSize tracks response body size in bytes
	HTTPResponseSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "trade_engine",
			Name:      "http_response_size_bytes",
			Help:      "HTTP response body size in bytes",
			Buckets: []float64{
				100,
				1000,
				10000,
				100000,
				1000000,
			},
		},
		[]string{"method", "path", "status"},
	)
)

// ============================================================================
// Business Logic Metrics
// ============================================================================

var (
	// OrdersCreated counts total orders created
	OrdersCreated = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "trade_engine",
			Name:      "orders_created_total",
			Help:      "Total number of orders created",
		},
		[]string{"side", "type"},
	)

	// OrdersCancelled counts total orders cancelled
	OrdersCancelled = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "trade_engine",
			Name:      "orders_cancelled_total",
			Help:      "Total number of orders cancelled",
		},
		[]string{"reason"},
	)

	// TradesExecuted counts total trades executed
	TradesExecuted = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "trade_engine",
			Name:      "trades_executed_total",
			Help:      "Total number of trades executed",
		},
		[]string{"symbol"},
	)

	// TradeVolume tracks total trading volume
	TradeVolume = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "trade_engine",
			Name:      "trade_volume_total",
			Help:      "Total trading volume in base currency",
		},
		[]string{"symbol"},
	)

	// ActiveOrders tracks current active orders
	ActiveOrders = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "trade_engine",
			Name:      "active_orders",
			Help:      "Current number of active orders",
		},
		[]string{"side", "symbol"},
	)
)

// ============================================================================
// Database Metrics
// ============================================================================

var (
	// DatabaseQueryDuration tracks database query latency
	DatabaseQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "trade_engine",
			Name:      "database_query_duration_seconds",
			Help:      "Database query duration in seconds",
			Buckets: []float64{
				0.001,  // 1ms
				0.005,  // 5ms
				0.01,   // 10ms
				0.025,  // 25ms
				0.05,   // 50ms
				0.1,    // 100ms
				0.25,   // 250ms
				0.5,    // 500ms
				1.0,    // 1s
			},
		},
		[]string{"operation", "table"},
	)

	// DatabaseErrors counts database errors
	DatabaseErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "trade_engine",
			Name:      "database_errors_total",
			Help:      "Total number of database errors",
		},
		[]string{"operation", "error_type"},
	)

	// DatabaseConnectionPoolSize tracks connection pool size
	DatabaseConnectionPoolSize = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "trade_engine",
			Name:      "database_connection_pool_size",
			Help:      "Current database connection pool size",
		},
		[]string{"state"},
	)
)

// ============================================================================
// Cache Metrics
// ============================================================================

var (
	// CacheHits counts cache hits
	CacheHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "trade_engine",
			Name:      "cache_hits_total",
			Help:      "Total number of cache hits",
		},
		[]string{"cache_name"},
	)

	// CacheMisses counts cache misses
	CacheMisses = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "trade_engine",
			Name:      "cache_misses_total",
			Help:      "Total number of cache misses",
		},
		[]string{"cache_name"},
	)

	// CacheSize tracks cache size
	CacheSize = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "trade_engine",
			Name:      "cache_size_bytes",
			Help:      "Cache size in bytes",
		},
		[]string{"cache_name"},
	)
)

// ============================================================================
// Service Health Metrics
// ============================================================================

var (
	// ServiceHealth tracks service health status (1 = healthy, 0 = unhealthy)
	ServiceHealth = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "trade_engine",
			Name:      "health_status",
			Help:      "Service health status (1 = healthy, 0 = unhealthy)",
		},
		[]string{"service"},
	)

	// PanicRecoveries counts panics recovered
	PanicRecoveries = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "trade_engine",
			Name:      "panic_recoveries_total",
			Help:      "Total number of panics recovered",
		},
		[]string{"component"},
	)
)

// ============================================================================
// Helper Functions
// ============================================================================

// RecordHTTPRequest records HTTP request metrics
func RecordHTTPRequest(method, path string, status int, duration float64, responseSize int64) {
	HTTPRequestsTotal.WithLabelValues(method, path, statusCodeString(status)).Inc()
	HTTPRequestDuration.WithLabelValues(method, path).Observe(duration)
	HTTPResponseSize.WithLabelValues(method, path, statusCodeString(status)).Observe(float64(responseSize))
}

// RecordDatabaseQuery records database query metrics
func RecordDatabaseQuery(operation, table string, duration float64, err error) {
	DatabaseQueryDuration.WithLabelValues(operation, table).Observe(duration)
	if err != nil {
		DatabaseErrors.WithLabelValues(operation, "query_error").Inc()
	}
}

// RecordOrderCreated records order creation
func RecordOrderCreated(side, orderType string) {
	OrdersCreated.WithLabelValues(side, orderType).Inc()
}

// RecordOrderCancelled records order cancellation
func RecordOrderCancelled(reason string) {
	OrdersCancelled.WithLabelValues(reason).Inc()
}

// RecordTradeExecuted records trade execution
func RecordTradeExecuted(symbol string, volume float64) {
	TradesExecuted.WithLabelValues(symbol).Inc()
	TradeVolume.WithLabelValues(symbol).Add(volume)
}

// RecordCacheOperation records cache hit/miss
func RecordCacheOperation(cacheName string, hit bool) {
	if hit {
		CacheHits.WithLabelValues(cacheName).Inc()
	} else {
		CacheMisses.WithLabelValues(cacheName).Inc()
	}
}

// SetServiceHealth sets service health status
func SetServiceHealth(service string, healthy bool) {
	value := float64(0)
	if healthy {
		value = 1
	}
	ServiceHealth.WithLabelValues(service).Set(value)
}

// RecordPanicRecovery records a panic recovery
func RecordPanicRecovery(component string) {
	PanicRecoveries.WithLabelValues(component).Inc()
}

// Helper function to convert status code to string
func statusCodeString(status int) string {
	switch {
	case status >= 500:
		return "5xx"
	case status >= 400:
		return "4xx"
	case status >= 300:
		return "3xx"
	case status >= 200:
		return "2xx"
	default:
		return "1xx"
	}
}
