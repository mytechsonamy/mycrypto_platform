// ============================================================================
// MYTRADER TRADE ENGINE - SERVER ENTRY POINT
// ============================================================================
// Project: MyTrader White-Label Kripto Exchange Platform
// Component: Trade Engine Server
// Version: 1.0
// Date: 2024-11-22
// Description: Main server entry point with HTTP API and WebSocket support
// ============================================================================

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mytrader/trade-engine/internal/config"
	"github.com/mytrader/trade-engine/internal/matching"
)

const (
	Version     = "1.0.0"
	ServiceName = "trade-engine"
)

func main() {
	log.Printf("Starting %s v%s...", ServiceName, Version)

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize matching engine
	engine := matching.NewMatchingEngine()
	
	// Setup callbacks
	engine.OnTrade = func(trade *matching.Trade) {
		log.Printf("TRADE: %s @ %s qty=%s", 
			trade.Symbol, trade.Price, trade.Quantity)
		// TODO: Publish to Kafka
	}
	
	engine.OnOrderUpdate = func(order *matching.Order) {
		log.Printf("ORDER UPDATE: %s status=%s", 
			order.OrderID, order.Status)
		// TODO: Publish to Kafka
	}

	// Create symbols (temporary - will come from DB)
	symbols := []string{"BTC/USDT", "ETH/USDT", "BNB/USDT"}
	for _, symbol := range symbols {
		engine.GetOrCreateOrderBook(symbol)
		log.Printf("Initialized order book: %s", symbol)
	}

	// Setup HTTP server
	router := setupRouter(engine, cfg)

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server listening on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func setupRouter(engine *matching.MatchingEngine, cfg *config.Config) *gin.Engine {
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"service":   ServiceName,
			"version":   Version,
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Market data
		v1.GET("/market-data/ticker/:symbol", func(c *gin.Context) {
			symbol := c.Param("symbol")
			ob := engine.GetOrCreateOrderBook(symbol)
			
			c.JSON(http.StatusOK, gin.H{
				"symbol":     symbol,
				"last_price": ob.LastPrice.String(),
				"best_bid":   ob.GetBestBid().String(),
				"best_ask":   ob.GetBestAsk().String(),
				"timestamp":  time.Now().Format(time.RFC3339),
			})
		})

		v1.GET("/market-data/orderbook/:symbol", func(c *gin.Context) {
			symbol := c.Param("symbol")
			depth := 20 // Default depth
			
			snapshot := engine.GetOrderBookSnapshot(symbol, depth)
			c.JSON(http.StatusOK, snapshot)
		})

		// Statistics
		v1.GET("/stats", func(c *gin.Context) {
			stats := engine.GetStatistics()
			c.JSON(http.StatusOK, stats)
		})

		// Demo order placement (MVP - no auth for testing)
		v1.POST("/demo/orders", func(c *gin.Context) {
			var req struct {
				Symbol   string `json:"symbol" binding:"required"`
				Side     string `json:"side" binding:"required"`
				Type     string `json:"order_type" binding:"required"`
				Quantity string `json:"quantity" binding:"required"`
				Price    string `json:"price"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			// TODO: Create order and place it
			c.JSON(http.StatusCreated, gin.H{
				"message": "Order placement endpoint - full implementation in Sprint 2",
				"request": req,
			})
		})
	}

	return router
}
