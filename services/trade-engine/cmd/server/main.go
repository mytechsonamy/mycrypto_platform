package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/mytrader/trade-engine/internal/matching"
	"github.com/mytrader/trade-engine/internal/server"
	ws "github.com/mytrader/trade-engine/internal/websocket"
	"github.com/mytrader/trade-engine/pkg/clients"
	"github.com/mytrader/trade-engine/pkg/config"
	"github.com/mytrader/trade-engine/pkg/logger"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg, err := config.Load("config.yaml")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log, err := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync()

	// Add service context to logger
	log = logger.WithService(log, "trade-engine")

	log.Info("Starting Trade Engine service",
		zap.String("version", cfg.ServiceVersion),
		zap.String("environment", cfg.Environment),
		zap.Int("http_port", cfg.Server.HTTPPort),
	)

	// Connect to PostgreSQL database
	db, err := clients.NewDatabaseClient(cfg, log)
	if err != nil {
		log.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer func() {
		if err := clients.CloseDatabaseClient(db, log); err != nil {
			log.Error("Failed to close database connection", zap.Error(err))
		}
	}()

	// Connect to Redis
	redisClient, err := clients.NewRedisClient(cfg, log)
	if err != nil {
		log.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	defer func() {
		if err := clients.CloseRedisClient(redisClient, log); err != nil {
			log.Error("Failed to close Redis connection", zap.Error(err))
		}
	}()

	// Initialize Matching Engine
	matchingEngine := matching.NewMatchingEngine()

	log.Info("Matching engine initialized",
		zap.String("version", "2.0"),
		zap.String("algorithm", "Price-Time Priority"),
	)

	// Initialize WebSocket connection manager
	connectionManager := ws.NewConnectionManager(log)
	connectionManager.Start()

	// Initialize WebSocket publisher
	publisher := ws.NewPublisher(connectionManager, log)
	publisher.Start()

	// Wire WebSocket publisher to matching engine callbacks
	matchingEngine.SetOrderUpdateCallback(publisher.PublishOrderUpdate)
	matchingEngine.SetTradeCallback(publisher.PublishTradeExecution)

	log.Info("WebSocket system initialized",
		zap.String("order_stream", "/ws/orders"),
		zap.String("trade_stream", "/ws/trades"),
		zap.String("market_stream", "/ws/markets/{symbol}"),
	)

	// Create HTTP router
	router := server.NewRouter(log, db, redisClient, matchingEngine, cfg, connectionManager)

	// Create HTTP server
	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.HTTPPort),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Start HTTP server in goroutine
	go func() {
		log.Info("HTTP server starting", zap.String("addr", httpServer.Addr))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("HTTP server failed", zap.Error(err))
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	log.Info("Received shutdown signal", zap.String("signal", sig.String()))

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	// Gracefully shutdown HTTP server
	log.Info("Shutting down HTTP server...")
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Error("HTTP server forced to shutdown", zap.Error(err))
	}

	// Stop WebSocket system
	log.Info("Shutting down WebSocket system...")
	publisher.Stop()
	connectionManager.Stop()

	log.Info("Trade Engine service stopped gracefully")
}
