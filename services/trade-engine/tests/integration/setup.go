package integration

import (
	"context"
	"fmt"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
)

// Import the postgres repository implementation
// This is located in internal/repository/order_repository_postgres.go
type OrderRepository = repository.OrderRepository

// NewPostgresOrderRepository creates an OrderRepository with a basic logger (for tests)
func NewPostgresOrderRepository(db *gorm.DB) repository.OrderRepository {
	// Create a basic zap logger for testing
	logger, _ := createTestLogger()
	return repository.NewPostgresOrderRepository(db, logger)
}

// createTestLogger creates a basic logger for testing
func createTestLogger() (*zap.Logger, error) {
	config := zap.NewProductionConfig()
	config.Level = zap.NewAtomicLevelAt(zap.ErrorLevel) // Only log errors
	return config.Build()
}

// TestEnvironment provides all resources needed for integration testing
type TestEnvironment struct {
	DB                *gorm.DB
	PostgresContainer testcontainers.Container
	OrderRepository   repository.OrderRepository
}

// NewTestEnvironment creates a new test environment with Testcontainers
func NewTestEnvironment(ctx context.Context) (*TestEnvironment, error) {
	// Create PostgreSQL container
	req := testcontainers.ContainerRequest{
		Image:        "postgres:15-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_USER":     "test",
			"POSTGRES_PASSWORD": "test",
			"POSTGRES_DB":       "trade_engine_test",
		},
		WaitingFor: wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2).
			WithStartupTimeout(30 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create PostgreSQL container: %w", err)
	}

	// Get container endpoint
	host, err := container.Host(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get container host: %w", err)
	}

	port, err := container.MappedPort(ctx, "5432")
	if err != nil {
		return nil, fmt.Errorf("failed to get container port: %w", err)
	}

	// Connect to database
	dsn := fmt.Sprintf("host=%s port=%s user=test password=test dbname=trade_engine_test sslmode=disable",
		host, port.Port())

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return &TestEnvironment{
		DB:                db,
		PostgresContainer: container,
		OrderRepository:   NewPostgresOrderRepository(db),
	}, nil
}

// Setup runs migrations and initializes the test environment
func (te *TestEnvironment) Setup(ctx context.Context) error {
	// Run migrations
	err := te.DB.WithContext(ctx).AutoMigrate(&domain.Order{})
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// Cleanup stops containers and cleans up resources
func (te *TestEnvironment) Cleanup(ctx context.Context) error {
	if te.PostgresContainer != nil {
		if err := te.PostgresContainer.Terminate(ctx); err != nil {
			return fmt.Errorf("failed to terminate PostgreSQL container: %w", err)
		}
	}
	return nil
}

// CleanDatabase truncates all tables to ensure test isolation
func (te *TestEnvironment) CleanDatabase(ctx context.Context) error {
	// Truncate orders table
	if err := te.DB.WithContext(ctx).Exec("TRUNCATE TABLE orders CASCADE").Error; err != nil {
		return fmt.Errorf("failed to truncate orders table: %w", err)
	}
	return nil
}
