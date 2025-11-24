// ============================================================================
// MYTRADER TRADE ENGINE - PROMETHEUS METRICS
// ============================================================================
// Component: Prometheus Metrics Instrumentation
// Version: 1.0
// Sprint 2 - TASK-BACKEND-014
// ============================================================================

package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// ============================================================================
// ORDER METRICS
// ============================================================================

var (
	// OrdersPlaced tracks total orders placed by symbol and side
	OrdersPlaced = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_orders_placed_total",
			Help: "Total number of orders placed",
		},
		[]string{"symbol", "side", "type"},
	)

	// OrdersMatched tracks total orders matched
	OrdersMatched = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_orders_matched_total",
			Help: "Total number of orders matched",
		},
		[]string{"symbol", "side"},
	)

	// OrdersCancelled tracks total orders cancelled
	OrdersCancelled = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_orders_cancelled_total",
			Help: "Total number of orders cancelled",
		},
		[]string{"symbol", "reason"},
	)

	// OpenOrdersGauge tracks current open orders
	OpenOrdersGauge = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "trade_engine_open_orders",
			Help: "Current number of open orders",
		},
		[]string{"symbol", "side"},
	)

	// OrderProcessingDuration tracks order processing time
	OrderProcessingDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "trade_engine_order_processing_duration_seconds",
			Help:    "Duration of order processing",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"symbol", "type"},
	)
)

// ============================================================================
// TRADE METRICS
// ============================================================================

var (
	// TradesExecuted tracks total trades executed
	TradesExecuted = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_trades_executed_total",
			Help: "Total number of trades executed",
		},
		[]string{"symbol"},
	)

	// TradeVolume tracks trading volume (histogram for distribution)
	TradeVolume = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "trade_engine_trade_volume",
			Help:    "Volume of trades executed",
			Buckets: []float64{0.001, 0.01, 0.1, 1, 10, 100, 1000},
		},
		[]string{"symbol"},
	)

	// TradeValue tracks trade value in quote currency
	TradeValue = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "trade_engine_trade_value_usd",
			Help:    "Value of trades in USD",
			Buckets: []float64{10, 100, 1000, 10000, 100000, 1000000},
		},
		[]string{"symbol"},
	)

	// MatchingLatency tracks matching engine latency
	MatchingLatency = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "trade_engine_matching_latency_seconds",
			Help:    "Latency of matching engine operations",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1},
		},
		[]string{"symbol"},
	)
)

// ============================================================================
// SETTLEMENT METRICS
// ============================================================================

var (
	// SettlementsProcessed tracks total settlements
	SettlementsProcessed = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_settlements_processed_total",
			Help: "Total number of settlements processed",
		},
		[]string{"status"},
	)

	// SettlementLatency tracks settlement processing time
	SettlementLatency = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "trade_engine_settlement_latency_seconds",
			Help:    "Latency of settlement operations",
			Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"symbol"},
	)

	// SettlementErrors tracks settlement failures
	SettlementErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_settlement_errors_total",
			Help: "Total number of settlement errors",
		},
		[]string{"error_type"},
	)

	// PendingSettlementsGauge tracks pending settlements
	PendingSettlementsGauge = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "trade_engine_pending_settlements",
			Help: "Current number of pending settlements",
		},
	)
)

// ============================================================================
// SYSTEM METRICS
// ============================================================================

var (
	// ActiveConnections tracks WebSocket connections
	ActiveConnections = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "trade_engine_active_connections",
			Help: "Current number of active WebSocket connections",
		},
		[]string{"type"},
	)

	// OrderBookSize tracks order book size
	OrderBookSize = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "trade_engine_orderbook_size",
			Help: "Current size of order book (number of levels)",
		},
		[]string{"symbol", "side"},
	)

	// OrderBookDepth tracks total orders in book
	OrderBookDepth = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "trade_engine_orderbook_depth",
			Help: "Current depth of order book (total orders)",
		},
		[]string{"symbol", "side"},
	)

	// SettlementQueueSize tracks settlement queue size
	SettlementQueueSize = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "trade_engine_settlement_queue_size",
			Help: "Current size of settlement queue",
		},
	)

	// DatabaseConnections tracks database connection pool
	DatabaseConnections = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "trade_engine_database_connections",
			Help: "Current database connections",
		},
		[]string{"state"}, // active, idle
	)

	// CacheHitRatio tracks cache effectiveness
	CacheHits = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "trade_engine_cache_hits_total",
			Help: "Total number of cache hits",
		},
	)

	CacheMisses = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "trade_engine_cache_misses_total",
			Help: "Total number of cache misses",
		},
	)
)

// ============================================================================
// ERROR METRICS
// ============================================================================

var (
	// ErrorCount tracks errors by type
	ErrorCount = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_errors_total",
			Help: "Total number of errors",
		},
		[]string{"type", "component"},
	)

	// APIErrors tracks API-specific errors
	APIErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_api_errors_total",
			Help: "Total number of API errors",
		},
		[]string{"endpoint", "code"},
	)

	// WalletServiceErrors tracks wallet service errors
	WalletServiceErrors = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_wallet_service_errors_total",
			Help: "Total number of wallet service errors",
		},
		[]string{"operation", "error_type"},
	)
)

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

var (
	// HTTPRequestDuration tracks HTTP request duration
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "trade_engine_http_request_duration_seconds",
			Help:    "Duration of HTTP requests",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	// HTTPRequestsTotal tracks total HTTP requests
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	// WebSocketMessages tracks WebSocket message throughput
	WebSocketMessages = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_websocket_messages_total",
			Help: "Total number of WebSocket messages",
		},
		[]string{"type", "direction"}, // direction: sent, received
	)
)

// ============================================================================
// BUSINESS METRICS
// ============================================================================

var (
	// UserActivity tracks active users
	ActiveUsers = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "trade_engine_active_users",
			Help: "Current number of active users",
		},
	)

	// DailyVolume tracks daily trading volume
	DailyVolume = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "trade_engine_daily_volume_usd",
			Help: "Daily trading volume in USD",
		},
		[]string{"symbol"},
	)

	// FeeCollected tracks fees collected
	FeeCollected = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trade_engine_fees_collected_total",
			Help: "Total fees collected",
		},
		[]string{"type"}, // maker, taker
	)
)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// RecordOrderPlaced records an order placement
func RecordOrderPlaced(symbol, side, orderType string) {
	OrdersPlaced.WithLabelValues(symbol, side, orderType).Inc()
}

// RecordOrderMatched records an order match
func RecordOrderMatched(symbol, side string) {
	OrdersMatched.WithLabelValues(symbol, side).Inc()
}

// RecordOrderCancelled records an order cancellation
func RecordOrderCancelled(symbol, reason string) {
	OrdersCancelled.WithLabelValues(symbol, reason).Inc()
}

// RecordTradeExecuted records a trade execution
func RecordTradeExecuted(symbol string, quantity, value float64) {
	TradesExecuted.WithLabelValues(symbol).Inc()
	TradeVolume.WithLabelValues(symbol).Observe(quantity)
	TradeValue.WithLabelValues(symbol).Observe(value)
}

// RecordSettlement records a settlement
func RecordSettlement(status string, duration float64, symbol string) {
	SettlementsProcessed.WithLabelValues(status).Inc()
	SettlementLatency.WithLabelValues(symbol).Observe(duration)
}

// RecordSettlementError records a settlement error
func RecordSettlementError(errorType string) {
	SettlementErrors.WithLabelValues(errorType).Inc()
}

// UpdateOpenOrders updates the open orders gauge
func UpdateOpenOrders(symbol, side string, delta int) {
	if delta > 0 {
		OpenOrdersGauge.WithLabelValues(symbol, side).Add(float64(delta))
	} else {
		OpenOrdersGauge.WithLabelValues(symbol, side).Sub(float64(-delta))
	}
}

// UpdateOrderBookSize updates the order book size gauge
func UpdateOrderBookSize(symbol, side string, size int) {
	OrderBookSize.WithLabelValues(symbol, side).Set(float64(size))
}

// UpdateOrderBookDepth updates the order book depth gauge
func UpdateOrderBookDepth(symbol, side string, depth int) {
	OrderBookDepth.WithLabelValues(symbol, side).Set(float64(depth))
}

// RecordHTTPRequest records an HTTP request
func RecordHTTPRequest(method, path, status string, duration float64) {
	HTTPRequestsTotal.WithLabelValues(method, path, status).Inc()
	HTTPRequestDuration.WithLabelValues(method, path, status).Observe(duration)
}

// RecordError records an error
func RecordError(errorType, component string) {
	ErrorCount.WithLabelValues(errorType, component).Inc()
}

// RecordCacheAccess records cache hit or miss
func RecordCacheAccess(hit bool) {
	if hit {
		CacheHits.Inc()
	} else {
		CacheMisses.Inc()
	}
}

// UpdateActiveConnections updates active WebSocket connections
func UpdateActiveConnections(connType string, delta int) {
	if delta > 0 {
		ActiveConnections.WithLabelValues(connType).Add(float64(delta))
	} else {
		ActiveConnections.WithLabelValues(connType).Sub(float64(-delta))
	}
}

// UpdatePendingSettlements updates pending settlements gauge
func UpdatePendingSettlements(count int) {
	PendingSettlementsGauge.Set(float64(count))
}

// UpdateDatabaseConnections updates database connection metrics
func UpdateDatabaseConnections(active, idle int) {
	DatabaseConnections.WithLabelValues("active").Set(float64(active))
	DatabaseConnections.WithLabelValues("idle").Set(float64(idle))
}
