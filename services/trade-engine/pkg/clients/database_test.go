package clients

import (
	"testing"
	"time"

	"github.com/mytrader/trade-engine/pkg/config"
	"github.com/mytrader/trade-engine/pkg/logger"
)

func TestNewDatabaseClient(t *testing.T) {
	// Skip if database is not available
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:            "127.0.0.1",
			Port:            5433,
			Database:        "trade_engine_db",
			User:            "trade_engine_user",
			Password:        "changeme",
			MaxOpenConns:    5,
			MaxIdleConns:    2,
			ConnMaxLifetime: 5 * time.Minute,
			SSLMode:         "disable",
		},
		Logging: config.LoggingConfig{
			Level:  "info",
			Format: "json",
		},
	}

	log, err := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	db, err := NewDatabaseClient(cfg, log)
	if err != nil {
		t.Skipf("Skipping database test (database not available): %v", err)
		return
	}
	defer CloseDatabaseClient(db, log)

	// Verify connection
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("Failed to get DB instance: %v", err)
	}

	if err := sqlDB.Ping(); err != nil {
		t.Errorf("Failed to ping database: %v", err)
	}

	// Verify pool settings
	stats := sqlDB.Stats()
	if stats.MaxOpenConnections != cfg.Database.MaxOpenConns {
		t.Errorf("MaxOpenConnections = %d, want %d", stats.MaxOpenConnections, cfg.Database.MaxOpenConns)
	}
}

func TestNewDatabaseClientInvalidConfig(t *testing.T) {
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:            "invalid-host-12345",
			Port:            9999,
			Database:        "invalid_db",
			User:            "invalid_user",
			Password:        "invalid_pass",
			MaxOpenConns:    5,
			MaxIdleConns:    2,
			ConnMaxLifetime: 5 * time.Minute,
			SSLMode:         "disable",
		},
		Logging: config.LoggingConfig{
			Level:  "info",
			Format: "json",
		},
	}

	log, err := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	_, err = NewDatabaseClient(cfg, log)
	if err == nil {
		t.Error("NewDatabaseClient() with invalid config should return error")
	}
}

func TestCloseDatabaseClient(t *testing.T) {
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:            "127.0.0.1",
			Port:            5433,
			Database:        "trade_engine_db",
			User:            "trade_engine_user",
			Password:        "changeme",
			MaxOpenConns:    5,
			MaxIdleConns:    2,
			ConnMaxLifetime: 5 * time.Minute,
			SSLMode:         "disable",
		},
		Logging: config.LoggingConfig{
			Level:  "info",
			Format: "json",
		},
	}

	log, err := logger.NewLogger(cfg.Logging.Level, cfg.Logging.Format)
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	db, err := NewDatabaseClient(cfg, log)
	if err != nil {
		t.Skipf("Skipping database test (database not available): %v", err)
		return
	}

	// Close should not return error
	if err := CloseDatabaseClient(db, log); err != nil {
		t.Errorf("CloseDatabaseClient() error = %v", err)
	}
}
