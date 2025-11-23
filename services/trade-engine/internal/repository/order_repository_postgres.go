package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/pkg/metrics"
)

// postgresOrderRepository implements OrderRepository using PostgreSQL via GORM
type postgresOrderRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewPostgresOrderRepository creates a new PostgreSQL order repository
func NewPostgresOrderRepository(db *gorm.DB, logger *zap.Logger) OrderRepository {
	return &postgresOrderRepository{
		db:     db,
		logger: logger,
	}
}

// Create creates a new order in the database
func (r *postgresOrderRepository) Create(ctx context.Context, order *domain.Order) error {
	start := time.Now()

	// Set timestamps and defaults
	order.ID = uuid.New()
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()
	order.FilledQuantity = decimal.Zero

	if order.Status == "" {
		order.Status = domain.OrderStatusPending
	}

	err := r.db.WithContext(ctx).Create(order).Error

	// Record metrics
	duration := time.Since(start).Seconds()
	metrics.RecordDatabaseQuery("insert", "orders", duration, err)

	if err != nil {
		r.logger.Error("Failed to create order",
			zap.Error(err),
			zap.String("order_id", order.ID.String()),
			zap.String("user_id", order.UserID.String()),
		)

		// Check for duplicate client order ID
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return ErrDuplicateClientID
		}
		return err
	}

	r.logger.Info("Order created",
		zap.String("order_id", order.ID.String()),
		zap.String("user_id", order.UserID.String()),
		zap.String("symbol", order.Symbol),
		zap.String("side", string(order.Side)),
		zap.String("type", string(order.Type)),
	)

	return nil
}

// GetByID retrieves an order by its ID
func (r *postgresOrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Order, error) {
	start := time.Now()

	var order domain.Order
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&order).Error

	// Record metrics
	duration := time.Since(start).Seconds()
	metrics.RecordDatabaseQuery("select", "orders", duration, err)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		r.logger.Error("Failed to get order by ID",
			zap.Error(err),
			zap.String("order_id", id.String()),
		)
		return nil, err
	}

	return &order, nil
}

// GetByUserID retrieves orders for a specific user with filters
func (r *postgresOrderRepository) GetByUserID(ctx context.Context, userID uuid.UUID, filters OrderFilters) ([]*domain.Order, error) {
	start := time.Now()

	query := r.db.WithContext(ctx).Where("user_id = ?", userID)

	// Apply filters
	if filters.Symbol != nil {
		query = query.Where("symbol = ?", *filters.Symbol)
	}

	if filters.Status != nil {
		query = query.Where("status = ?", *filters.Status)
	}

	// Apply ordering
	if filters.OrderBy != "" {
		query = query.Order(filters.OrderBy)
	} else {
		query = query.Order("created_at DESC")
	}

	// Apply pagination
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}

	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	var orders []*domain.Order
	err := query.Find(&orders).Error

	// Record metrics
	duration := time.Since(start).Seconds()
	metrics.RecordDatabaseQuery("select", "orders", duration, err)

	if err != nil {
		r.logger.Error("Failed to get orders by user ID",
			zap.Error(err),
			zap.String("user_id", userID.String()),
		)
		return nil, err
	}

	return orders, nil
}

// GetByClientOrderID retrieves an order by client order ID
func (r *postgresOrderRepository) GetByClientOrderID(ctx context.Context, userID uuid.UUID, clientOrderID string) (*domain.Order, error) {
	start := time.Now()

	var order domain.Order
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND client_order_id = ?", userID, clientOrderID).
		First(&order).Error

	// Record metrics
	duration := time.Since(start).Seconds()
	metrics.RecordDatabaseQuery("select", "orders", duration, err)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		r.logger.Error("Failed to get order by client order ID",
			zap.Error(err),
			zap.String("user_id", userID.String()),
			zap.String("client_order_id", clientOrderID),
		)
		return nil, err
	}

	return &order, nil
}

// Update updates an existing order
func (r *postgresOrderRepository) Update(ctx context.Context, order *domain.Order) error {
	start := time.Now()

	order.UpdatedAt = time.Now()

	result := r.db.WithContext(ctx).Save(order)
	err := result.Error

	// Record metrics
	duration := time.Since(start).Seconds()
	metrics.RecordDatabaseQuery("update", "orders", duration, err)

	if err != nil {
		r.logger.Error("Failed to update order",
			zap.Error(err),
			zap.String("order_id", order.ID.String()),
		)
		return err
	}

	if result.RowsAffected == 0 {
		return ErrOrderNotFound
	}

	r.logger.Info("Order updated",
		zap.String("order_id", order.ID.String()),
		zap.String("status", string(order.Status)),
	)

	return nil
}

// Cancel cancels an order by ID
func (r *postgresOrderRepository) Cancel(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	start := time.Now()

	now := time.Now()
	result := r.db.WithContext(ctx).Model(&domain.Order{}).
		Where("id = ? AND user_id = ? AND status IN ?", id, userID, []domain.OrderStatus{
			domain.OrderStatusOpen,
			domain.OrderStatusPartiallyFilled,
			domain.OrderStatusPending,
		}).
		Updates(map[string]interface{}{
			"status":       domain.OrderStatusCancelled,
			"cancelled_at": now,
			"updated_at":   now,
		})

	err := result.Error

	// Record metrics
	duration := time.Since(start).Seconds()
	metrics.RecordDatabaseQuery("update", "orders", duration, err)

	if err != nil {
		r.logger.Error("Failed to cancel order",
			zap.Error(err),
			zap.String("order_id", id.String()),
			zap.String("user_id", userID.String()),
		)
		return err
	}

	if result.RowsAffected == 0 {
		// Check if order exists
		var order domain.Order
		if err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&order).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrOrderNotFound
			}
			return err
		}

		// Order exists but not cancellable
		return domain.ErrOrderNotCancellable
	}

	r.logger.Info("Order cancelled",
		zap.String("order_id", id.String()),
		zap.String("user_id", userID.String()),
	)

	return nil
}

// GetActiveOrders retrieves all active orders for a symbol
func (r *postgresOrderRepository) GetActiveOrders(ctx context.Context, symbol string) ([]*domain.Order, error) {
	start := time.Now()

	var orders []*domain.Order
	err := r.db.WithContext(ctx).
		Where("symbol = ? AND status IN ?", symbol, []domain.OrderStatus{
			domain.OrderStatusOpen,
			domain.OrderStatusPartiallyFilled,
		}).
		Order("created_at ASC").
		Find(&orders).Error

	// Record metrics
	duration := time.Since(start).Seconds()
	metrics.RecordDatabaseQuery("select", "orders", duration, err)

	if err != nil {
		r.logger.Error("Failed to get active orders",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, err
	}

	return orders, nil
}

// GetOpenOrdersBySymbol retrieves all open orders for a symbol and optionally a side
func (r *postgresOrderRepository) GetOpenOrdersBySymbol(ctx context.Context, symbol string, side *domain.OrderSide) ([]*domain.Order, error) {
	start := time.Now()

	query := r.db.WithContext(ctx).
		Where("symbol = ? AND status = ?", symbol, domain.OrderStatusOpen)

	if side != nil {
		query = query.Where("side = ?", *side)
	}

	var orders []*domain.Order
	err := query.Order("price DESC, created_at ASC").Find(&orders).Error

	// Record metrics
	duration := time.Since(start).Seconds()
	metrics.RecordDatabaseQuery("select", "orders", duration, err)

	if err != nil {
		r.logger.Error("Failed to get open orders by symbol",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, err
	}

	return orders, nil
}

// CountUserActiveOrders counts active orders for a user
func (r *postgresOrderRepository) CountUserActiveOrders(ctx context.Context, userID uuid.UUID) (int64, error) {
	start := time.Now()

	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Order{}).
		Where("user_id = ? AND status IN ?", userID, []domain.OrderStatus{
			domain.OrderStatusOpen,
			domain.OrderStatusPartiallyFilled,
			domain.OrderStatusPending,
		}).
		Count(&count).Error

	// Record metrics
	duration := time.Since(start).Seconds()
	metrics.RecordDatabaseQuery("count", "orders", duration, err)

	if err != nil {
		r.logger.Error("Failed to count user active orders",
			zap.Error(err),
			zap.String("user_id", userID.String()),
		)
		return 0, err
	}

	return count, nil
}
