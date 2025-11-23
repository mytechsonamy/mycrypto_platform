package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/mytrader/trade-engine/internal/domain"
)

// Repository errors
var (
	ErrOrderNotFound       = errors.New("order not found")
	ErrDuplicateClientID   = errors.New("duplicate client order ID")
	ErrInvalidOrderID      = errors.New("invalid order ID")
	ErrOrderUpdateConflict = errors.New("order update conflict")
)

// OrderFilters defines filters for querying orders
type OrderFilters struct {
	Symbol  *string
	Status  *domain.OrderStatus
	Limit   int
	Offset  int
	OrderBy string // e.g., "created_at DESC"
}

// OrderRepository defines the interface for order persistence
type OrderRepository interface {
	// Create creates a new order in the database
	Create(ctx context.Context, order *domain.Order) error

	// GetByID retrieves an order by its ID
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Order, error)

	// GetByUserID retrieves orders for a specific user with filters
	GetByUserID(ctx context.Context, userID uuid.UUID, filters OrderFilters) ([]*domain.Order, error)

	// GetByClientOrderID retrieves an order by client order ID
	GetByClientOrderID(ctx context.Context, userID uuid.UUID, clientOrderID string) (*domain.Order, error)

	// Update updates an existing order
	Update(ctx context.Context, order *domain.Order) error

	// Cancel cancels an order by ID
	Cancel(ctx context.Context, id uuid.UUID, userID uuid.UUID) error

	// GetActiveOrders retrieves all active orders for a symbol
	GetActiveOrders(ctx context.Context, symbol string) ([]*domain.Order, error)

	// GetOpenOrdersBySymbol retrieves all open orders for a symbol and side
	GetOpenOrdersBySymbol(ctx context.Context, symbol string, side *domain.OrderSide) ([]*domain.Order, error)

	// CountUserActiveOrders counts active orders for a user
	CountUserActiveOrders(ctx context.Context, userID uuid.UUID) (int64, error)
}
