package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/mytrader/trade-engine/internal/matching"
	"github.com/mytrader/trade-engine/internal/repository"
	"github.com/mytrader/trade-engine/internal/service"
	ws "github.com/mytrader/trade-engine/internal/websocket"
	"github.com/mytrader/trade-engine/pkg/clients/wallet"
	"github.com/mytrader/trade-engine/pkg/config"
)

// NewRouter creates a new HTTP router with all routes and middleware configured
func NewRouter(logger *zap.Logger, db *gorm.DB, redis *redis.Client, matchingEngine *matching.MatchingEngine, cfg *config.Config, connectionManager *ws.ConnectionManager) http.Handler {
	r := chi.NewRouter()

	// Create handler with dependencies
	h := NewHandler(logger, db, redis)

	// Create wallet client
	walletCfg := &wallet.ClientConfig{
		BaseURL:                    cfg.WalletClient.BaseURL,
		Timeout:                    cfg.WalletClient.Timeout,
		MaxRetries:                 cfg.WalletClient.MaxRetries,
		RetryWaitTime:              cfg.WalletClient.RetryWaitTime,
		RetryMaxWaitTime:           cfg.WalletClient.RetryMaxWaitTime,
		CircuitBreakerEnabled:      cfg.WalletClient.CircuitBreakerEnabled,
		CircuitBreakerMaxRequests:  cfg.WalletClient.CircuitBreakerMaxRequests,
		CircuitBreakerInterval:     cfg.WalletClient.CircuitBreakerInterval,
		CircuitBreakerTimeout:      cfg.WalletClient.CircuitBreakerTimeout,
		CircuitBreakerFailureRatio: cfg.WalletClient.CircuitBreakerFailureRatio,
		MaxIdleConns:               cfg.WalletClient.MaxIdleConns,
		MaxIdleConnsPerHost:        cfg.WalletClient.MaxIdleConnsPerHost,
		IdleConnTimeout:            cfg.WalletClient.IdleConnTimeout,
		RateLimitEnabled:           cfg.WalletClient.RateLimitEnabled,
		RateLimitRPS:               cfg.WalletClient.RateLimitRPS,
		UseMock:                    cfg.WalletClient.UseMock,
	}

	walletClient, err := wallet.NewWalletClient(walletCfg, logger)
	if err != nil {
		logger.Fatal("Failed to create wallet client", zap.Error(err))
	}

	// Create repositories
	orderRepo := repository.NewPostgresOrderRepository(db, logger)
	tradeRepo := repository.NewPostgresTradeRepository(db, logger)

	// Create services with matching engine
	orderService := service.NewOrderService(orderRepo, tradeRepo, matchingEngine, walletClient, logger)

	// Create handlers
	orderHandler := NewOrderHandler(orderService, logger)
	orderbookHandler := NewOrderBookHandler(matchingEngine, logger)
	tradeHandler := NewTradeHandler(tradeRepo, logger)
	marketHandler := NewMarketHandler(matchingEngine, tradeRepo, logger)

	// Create WebSocket handler
	wsHandler := NewWebSocketHandler(connectionManager, logger)

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

	// WebSocket endpoints
	r.Route("/ws", func(r chi.Router) {
		r.Get("/", wsHandler.HandleGeneralStream)                      // Generic WebSocket with manual subscription
		r.Get("/orders", wsHandler.HandleOrdersStream)                 // Order updates stream
		r.Get("/trades", wsHandler.HandleTradesStream)                 // Trade executions stream
		r.Get("/markets/{symbol}", wsHandler.HandleMarketStream)       // Market data (order book) stream
	})

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Order endpoints
		r.Route("/orders", func(r chi.Router) {
			r.Post("/", orderHandler.PlaceOrder)          // POST /api/v1/orders
			r.Get("/", orderHandler.ListOrders)           // GET /api/v1/orders
			r.Get("/{id}", orderHandler.GetOrder)         // GET /api/v1/orders/{id}
			r.Delete("/{id}", orderHandler.CancelOrder)   // DELETE /api/v1/orders/{id}
		})

		// Order book endpoints
		r.Get("/orderbook/{symbol}", orderbookHandler.GetOrderBook) // GET /api/v1/orderbook/BTC-USDT

		// Trade endpoints
		r.Get("/trades", tradeHandler.ListTrades)                   // GET /api/v1/trades?symbol=BTC-USDT
		r.Get("/trades/{id}", tradeHandler.GetTrade)                // GET /api/v1/trades/{id}

		// Market data endpoints
		r.Get("/markets/{symbol}/ticker", marketHandler.GetTicker)  // GET /api/v1/markets/BTC-USDT/ticker
	})

	return r
}
