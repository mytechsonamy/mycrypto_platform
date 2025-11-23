// ============================================================================
// MYTRADER TRADE ENGINE - ORDER SERVICE V2 (With Matching Engine Integration)
// ============================================================================
// Component: Enhanced Order Service with Price-Time Priority Matching
// Version: 2.0 (Day 5 - HTTP API Integration)
// Dependencies: Matching Engine (Day 4), Wallet Client, Trade Repository
// ============================================================================

package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/matching"
	"github.com/mytrader/trade-engine/internal/repository"
	"github.com/mytrader/trade-engine/pkg/clients/wallet"
	"github.com/mytrader/trade-engine/pkg/metrics"
)

// Service errors
var (
	ErrOrderNotFound            = errors.New("order not found")
	ErrInsufficientBalance      = errors.New("insufficient balance")
	ErrInvalidOrderRequest      = errors.New("invalid order request")
	ErrUnauthorized             = errors.New("unauthorized access to order")
	ErrOrderNotCancellable      = errors.New("order cannot be cancelled")
	ErrWalletServiceUnavailable = errors.New("wallet service unavailable")
	ErrDuplicateClientOrderID   = errors.New("duplicate client order ID")
	ErrMatchingEngineFailed     = errors.New("matching engine operation failed")
)

// PlaceOrderRequest represents a request to place a new order
type PlaceOrderRequest struct {
	UserID        uuid.UUID
	Symbol        string
	Side          domain.OrderSide
	Type          domain.OrderType
	Quantity      decimal.Decimal
	Price         *decimal.Decimal
	StopPrice     *decimal.Decimal
	TimeInForce   domain.TimeInForce
	PostOnly      bool
	ClientOrderID *string
}

// PlaceOrderResponse represents the response from placing an order
type PlaceOrderResponse struct {
	Order  *domain.Order    `json:"order"`
	Trades []*domain.Trade  `json:"trades,omitempty"`
}

// OrderService defines the interface for order operations with matching
type OrderService interface {
	// PlaceOrder places a new order and executes matching
	PlaceOrder(ctx context.Context, req *PlaceOrderRequest) (*PlaceOrderResponse, error)

	// CancelOrder cancels an existing order
	CancelOrder(ctx context.Context, orderID, userID uuid.UUID) error

	// GetOrder retrieves an order by ID
	GetOrder(ctx context.Context, orderID, userID uuid.UUID) (*domain.Order, error)

	// GetUserOrders retrieves orders for a user with filters
	GetUserOrders(ctx context.Context, userID uuid.UUID, filters repository.OrderFilters) ([]*domain.Order, error)

	// GetActiveOrders retrieves all active orders for a symbol
	GetActiveOrders(ctx context.Context, symbol string) ([]*domain.Order, error)

	// GetOrderTrades retrieves all trades for a specific order
	GetOrderTrades(ctx context.Context, orderID, userID uuid.UUID) ([]*domain.Trade, error)
}

// orderService implements OrderService
type orderService struct {
	orderRepo      repository.OrderRepository
	tradeRepo      repository.TradeRepository
	matchingEngine *matching.MatchingEngine
	walletClient   wallet.WalletClient
	logger         *zap.Logger
}

// NewOrderService creates a new order service with matching engine integration
func NewOrderService(
	orderRepo repository.OrderRepository,
	tradeRepo repository.TradeRepository,
	matchingEngine *matching.MatchingEngine,
	walletClient wallet.WalletClient,
	logger *zap.Logger,
) OrderService {
	svc := &orderService{
		orderRepo:      orderRepo,
		tradeRepo:      tradeRepo,
		matchingEngine: matchingEngine,
		walletClient:   walletClient,
		logger:         logger,
	}

	// Register callbacks for order updates and trades
	svc.registerCallbacks()

	return svc
}

// registerCallbacks sets up matching engine callbacks for order and trade events
func (s *orderService) registerCallbacks() {
	// Callback for order status updates
	s.matchingEngine.SetOrderUpdateCallback(func(order *domain.Order) {
		ctx := context.Background()
		if err := s.orderRepo.Update(ctx, order); err != nil {
			s.logger.Error("Failed to update order from matching engine callback",
				zap.Error(err),
				zap.String("order_id", order.ID.String()),
				zap.String("status", string(order.Status)),
			)
		} else {
			s.logger.Debug("Order updated from matching engine",
				zap.String("order_id", order.ID.String()),
				zap.String("status", string(order.Status)),
				zap.String("filled", order.FilledQuantity.String()),
			)
		}
	})

	// Callback for trade execution (will be used by settlement service)
	s.matchingEngine.SetTradeCallback(func(trade *domain.Trade) {
		ctx := context.Background()
		if err := s.tradeRepo.Create(ctx, trade); err != nil {
			s.logger.Error("Failed to persist trade from matching engine callback",
				zap.Error(err),
				zap.String("trade_id", trade.ID.String()),
				zap.String("symbol", trade.Symbol),
			)
		} else {
			s.logger.Info("Trade persisted from matching engine",
				zap.String("trade_id", trade.ID.String()),
				zap.String("symbol", trade.Symbol),
				zap.String("price", trade.Price.String()),
				zap.String("quantity", trade.Quantity.String()),
			)
			// Record metrics
			volume, _ := trade.GetTotalValue().Float64(); metrics.RecordTradeExecuted(trade.Symbol, volume)
		}
	})

	s.logger.Info("Matching engine callbacks registered successfully")
}

// PlaceOrder places a new order and executes matching
func (s *orderService) PlaceOrder(ctx context.Context, req *PlaceOrderRequest) (*PlaceOrderResponse, error) {
	// Create order object
	order := &domain.Order{
		UserID:        req.UserID,
		Symbol:        req.Symbol,
		Side:          req.Side,
		Type:          req.Type,
		Status:        domain.OrderStatusPending,
		Quantity:      req.Quantity,
		Price:         req.Price,
		StopPrice:     req.StopPrice,
		TimeInForce:   req.TimeInForce,
		PostOnly:      req.PostOnly,
		ClientOrderID: req.ClientOrderID,
	}

	// Validate order
	if err := order.Validate(); err != nil {
		s.logger.Warn("Order validation failed",
			zap.Error(err),
			zap.String("user_id", req.UserID.String()),
		)
		return nil, fmt.Errorf("%w: %v", ErrInvalidOrderRequest, err)
	}

	// Check for duplicate client order ID
	if req.ClientOrderID != nil {
		existing, err := s.orderRepo.GetByClientOrderID(ctx, req.UserID, *req.ClientOrderID)
		if err == nil && existing != nil {
			s.logger.Warn("Duplicate client order ID",
				zap.String("client_order_id", *req.ClientOrderID),
				zap.String("user_id", req.UserID.String()),
			)
			return nil, ErrDuplicateClientOrderID
		}
		// ErrOrderNotFound is expected and OK
		if err != nil && !errors.Is(err, repository.ErrOrderNotFound) {
			return nil, fmt.Errorf("failed to check client order ID: %w", err)
		}
	}

	// Reserve balance for the order
	currency, amount := order.GetRequiredBalance()

	// Skip balance reservation for market buy orders (amount calculation deferred)
	var reservationID *uuid.UUID
	if !(order.Type == domain.OrderTypeMarket && order.Side == domain.OrderSideBuy) {
		if amount.GreaterThan(decimal.Zero) {
			reservation, err := s.reserveBalance(ctx, order.UserID, currency, amount, uuid.Nil)
			if err != nil {
				s.logger.Error("Failed to reserve balance",
					zap.Error(err),
					zap.String("user_id", order.UserID.String()),
					zap.String("currency", currency),
					zap.String("amount", amount.String()),
				)

				if errors.Is(err, wallet.ErrInsufficientBalance) {
					return nil, ErrInsufficientBalance
				}
				if errors.Is(err, wallet.ErrWalletServiceDown) || errors.Is(err, wallet.ErrCircuitOpen) {
					return nil, ErrWalletServiceUnavailable
				}
				return nil, fmt.Errorf("failed to reserve balance: %w", err)
			}
			reservationID = &reservation.ReservationID
			order.ReservationID = reservationID

			s.logger.Info("Balance reserved for order",
				zap.String("reservation_id", reservation.ReservationID.String()),
				zap.String("currency", currency),
				zap.String("amount", amount.String()),
			)
		}
	}

	// Save order to database (in PENDING state)
	if err := s.orderRepo.Create(ctx, order); err != nil {
		// Rollback: Release reserved balance if order creation fails
		if reservationID != nil {
			if releaseErr := s.releaseBalance(ctx, *reservationID, order.ID, "ORDER_CREATION_FAILED"); releaseErr != nil {
				s.logger.Error("Failed to release balance after order creation failure",
					zap.Error(releaseErr),
					zap.String("reservation_id", reservationID.String()),
				)
			}
		}

		s.logger.Error("Failed to create order in database",
			zap.Error(err),
			zap.String("user_id", req.UserID.String()),
		)

		if errors.Is(err, repository.ErrDuplicateClientID) {
			return nil, ErrDuplicateClientOrderID
		}
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	// Submit order to matching engine
	s.logger.Info("Submitting order to matching engine",
		zap.String("order_id", order.ID.String()),
		zap.String("symbol", order.Symbol),
		zap.String("side", string(order.Side)),
		zap.String("type", string(order.Type)),
		zap.String("quantity", order.Quantity.String()),
	)

	trades, err := s.matchingEngine.PlaceOrder(order)
	if err != nil {
		// Order was rejected by matching engine
		s.logger.Error("Matching engine rejected order",
			zap.Error(err),
			zap.String("order_id", order.ID.String()),
		)

		// Update order status to REJECTED in database
		order.Status = domain.OrderStatusRejected
		if updateErr := s.orderRepo.Update(ctx, order); updateErr != nil {
			s.logger.Error("Failed to update rejected order status",
				zap.Error(updateErr),
				zap.String("order_id", order.ID.String()),
			)
		}

		// Release reserved balance
		if reservationID != nil {
			if releaseErr := s.releaseBalance(ctx, *reservationID, order.ID, "ORDER_REJECTED"); releaseErr != nil {
				s.logger.Error("Failed to release balance after order rejection",
					zap.Error(releaseErr),
					zap.String("reservation_id", reservationID.String()),
				)
			}
		}

		return nil, fmt.Errorf("%w: %v", ErrMatchingEngineFailed, err)
	}

	// Update order in database (matching engine updated status/fills)
	// This is done by the callback, but we need to ensure it's persisted
	if err := s.orderRepo.Update(ctx, order); err != nil {
		s.logger.Error("Failed to update order after matching",
			zap.Error(err),
			zap.String("order_id", order.ID.String()),
		)
		// Don't fail the operation, trades are already executed
	}

	// Record metrics
	metrics.RecordOrderCreated(string(order.Side), string(order.Type))

	s.logger.Info("Order placed successfully",
		zap.String("order_id", order.ID.String()),
		zap.String("user_id", order.UserID.String()),
		zap.String("symbol", order.Symbol),
		zap.String("status", string(order.Status)),
		zap.Int("trades_executed", len(trades)),
	)

	return &PlaceOrderResponse{
		Order:  order,
		Trades: trades,
	}, nil
}

// CancelOrder cancels an existing order
func (s *orderService) CancelOrder(ctx context.Context, orderID, userID uuid.UUID) error {
	// Get order first to verify ownership and get reservation ID
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, repository.ErrOrderNotFound) {
			return ErrOrderNotFound
		}
		return fmt.Errorf("failed to get order: %w", err)
	}

	// Verify ownership
	if order.UserID != userID {
		s.logger.Warn("Unauthorized order cancellation attempt",
			zap.String("order_id", orderID.String()),
			zap.String("user_id", userID.String()),
			zap.String("owner_id", order.UserID.String()),
		)
		return ErrUnauthorized
	}

	// Check if order can be cancelled
	if !order.CanBeCancelled() {
		s.logger.Warn("Order cannot be cancelled",
			zap.String("order_id", orderID.String()),
			zap.String("status", string(order.Status)),
		)
		return ErrOrderNotCancellable
	}

	// Cancel order in matching engine (removes from order book if present)
	if err := s.matchingEngine.CancelOrder(orderID, order.Symbol); err != nil {
		// Log error but continue with database cancellation
		// The order might not be in the book (fully filled, IOC, etc.)
		s.logger.Warn("Matching engine cancel failed (order may not be in book)",
			zap.Error(err),
			zap.String("order_id", orderID.String()),
		)
	}

	// Cancel order in database
	if err := s.orderRepo.Cancel(ctx, orderID, userID); err != nil {
		if errors.Is(err, repository.ErrOrderNotFound) {
			return ErrOrderNotFound
		}
		if errors.Is(err, domain.ErrOrderNotCancellable) {
			return ErrOrderNotCancellable
		}
		s.logger.Error("Failed to cancel order",
			zap.Error(err),
			zap.String("order_id", orderID.String()),
		)
		return fmt.Errorf("failed to cancel order: %w", err)
	}

	// Release reserved balance
	if order.ReservationID != nil {
		if err := s.releaseBalance(ctx, *order.ReservationID, orderID, "ORDER_CANCELLED"); err != nil {
			s.logger.Error("Failed to release balance after order cancellation",
				zap.Error(err),
				zap.String("reservation_id", order.ReservationID.String()),
				zap.String("order_id", orderID.String()),
			)
			// Don't fail the cancellation if balance release fails
			// The order is already cancelled in the database
		} else {
			s.logger.Info("Balance released for cancelled order",
				zap.String("reservation_id", order.ReservationID.String()),
				zap.String("order_id", orderID.String()),
			)
		}
	}

	// Record metrics
	metrics.RecordOrderCancelled("USER_REQUESTED")

	s.logger.Info("Order cancelled successfully",
		zap.String("order_id", orderID.String()),
		zap.String("user_id", userID.String()),
	)

	return nil
}

// GetOrder retrieves an order by ID
func (s *orderService) GetOrder(ctx context.Context, orderID, userID uuid.UUID) (*domain.Order, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, repository.ErrOrderNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	// Verify ownership
	if order.UserID != userID {
		s.logger.Warn("Unauthorized order access attempt",
			zap.String("order_id", orderID.String()),
			zap.String("user_id", userID.String()),
			zap.String("owner_id", order.UserID.String()),
		)
		return nil, ErrUnauthorized
	}

	return order, nil
}

// GetUserOrders retrieves orders for a user with filters
func (s *orderService) GetUserOrders(ctx context.Context, userID uuid.UUID, filters repository.OrderFilters) ([]*domain.Order, error) {
	orders, err := s.orderRepo.GetByUserID(ctx, userID, filters)
	if err != nil {
		s.logger.Error("Failed to get user orders",
			zap.Error(err),
			zap.String("user_id", userID.String()),
		)
		return nil, fmt.Errorf("failed to get user orders: %w", err)
	}

	return orders, nil
}

// GetActiveOrders retrieves all active orders for a symbol
func (s *orderService) GetActiveOrders(ctx context.Context, symbol string) ([]*domain.Order, error) {
	orders, err := s.orderRepo.GetActiveOrders(ctx, symbol)
	if err != nil {
		s.logger.Error("Failed to get active orders",
			zap.Error(err),
			zap.String("symbol", symbol),
		)
		return nil, fmt.Errorf("failed to get active orders: %w", err)
	}

	return orders, nil
}

// GetOrderTrades retrieves all trades for a specific order
func (s *orderService) GetOrderTrades(ctx context.Context, orderID, userID uuid.UUID) ([]*domain.Trade, error) {
	// First verify order ownership
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, repository.ErrOrderNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	if order.UserID != userID {
		s.logger.Warn("Unauthorized trade access attempt",
			zap.String("order_id", orderID.String()),
			zap.String("user_id", userID.String()),
		)
		return nil, ErrUnauthorized
	}

	// Get trades for the order
	trades, err := s.tradeRepo.GetByOrderID(ctx, orderID)
	if err != nil {
		s.logger.Error("Failed to get order trades",
			zap.Error(err),
			zap.String("order_id", orderID.String()),
		)
		return nil, fmt.Errorf("failed to get order trades: %w", err)
	}

	return trades, nil
}

// reserveBalance reserves balance for an order
func (s *orderService) reserveBalance(ctx context.Context, userID uuid.UUID, currency string, amount decimal.Decimal, orderID uuid.UUID) (*wallet.ReserveBalanceResponse, error) {
	req := &wallet.ReserveBalanceRequest{
		UserID:   userID,
		Currency: currency,
		Amount:   amount,
		OrderID:  orderID,
		Reason:   "ORDER_PLACEMENT",
	}

	resp, err := s.walletClient.ReserveBalance(req)
	if err != nil {
		return nil, err
	}

	if !resp.Success {
		return nil, fmt.Errorf("balance reservation failed: %s", resp.Message)
	}

	return resp, nil
}

// releaseBalance releases reserved balance
func (s *orderService) releaseBalance(ctx context.Context, reservationID, orderID uuid.UUID, reason string) error {
	req := &wallet.ReleaseBalanceRequest{
		ReservationID: reservationID,
		OrderID:       orderID,
		Reason:        reason,
	}

	resp, err := s.walletClient.ReleaseBalance(req)
	if err != nil {
		return err
	}

	if !resp.Success {
		return fmt.Errorf("balance release failed: %s", resp.Message)
	}

	return nil
}
