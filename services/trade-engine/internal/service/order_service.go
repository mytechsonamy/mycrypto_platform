package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"

	"github.com/mytrader/trade-engine/internal/domain"
	"github.com/mytrader/trade-engine/internal/repository"
	"github.com/mytrader/trade-engine/pkg/clients/wallet"
	"github.com/mytrader/trade-engine/pkg/metrics"
)

// Service errors
var (
	ErrOrderNotFound         = errors.New("order not found")
	ErrInsufficientBalance   = errors.New("insufficient balance")
	ErrInvalidOrderRequest   = errors.New("invalid order request")
	ErrUnauthorized          = errors.New("unauthorized access to order")
	ErrOrderNotCancellable   = errors.New("order cannot be cancelled")
	ErrWalletServiceUnavailable = errors.New("wallet service unavailable")
	ErrDuplicateClientOrderID = errors.New("duplicate client order ID")
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
	ClientOrderID *string
}

// OrderService defines the interface for order operations
type OrderService interface {
	// PlaceOrder places a new order
	PlaceOrder(ctx context.Context, req *PlaceOrderRequest) (*domain.Order, error)

	// CancelOrder cancels an existing order
	CancelOrder(ctx context.Context, orderID, userID uuid.UUID) error

	// GetOrder retrieves an order by ID
	GetOrder(ctx context.Context, orderID, userID uuid.UUID) (*domain.Order, error)

	// GetUserOrders retrieves orders for a user with filters
	GetUserOrders(ctx context.Context, userID uuid.UUID, filters repository.OrderFilters) ([]*domain.Order, error)

	// GetActiveOrders retrieves all active orders for a symbol
	GetActiveOrders(ctx context.Context, symbol string) ([]*domain.Order, error)
}

// orderService implements OrderService
type orderService struct {
	orderRepo    repository.OrderRepository
	walletClient wallet.WalletClient
	logger       *zap.Logger
}

// NewOrderService creates a new order service
func NewOrderService(
	orderRepo repository.OrderRepository,
	walletClient wallet.WalletClient,
	logger *zap.Logger,
) OrderService {
	return &orderService{
		orderRepo:    orderRepo,
		walletClient: walletClient,
		logger:       logger,
	}
}

// PlaceOrder places a new order
func (s *orderService) PlaceOrder(ctx context.Context, req *PlaceOrderRequest) (*domain.Order, error) {
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

	// Save order to database
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

	// Mark order as open (ready for matching)
	if err := order.Open(); err != nil {
		s.logger.Error("Failed to open order",
			zap.Error(err),
			zap.String("order_id", order.ID.String()),
		)
		return nil, fmt.Errorf("failed to open order: %w", err)
	}

	// Update order status in database
	if err := s.orderRepo.Update(ctx, order); err != nil {
		s.logger.Error("Failed to update order status to OPEN",
			zap.Error(err),
			zap.String("order_id", order.ID.String()),
		)
		return nil, fmt.Errorf("failed to update order status: %w", err)
	}

	// Record metrics
	metrics.RecordOrderCreated(string(order.Side), string(order.Type))

	s.logger.Info("Order placed successfully",
		zap.String("order_id", order.ID.String()),
		zap.String("user_id", order.UserID.String()),
		zap.String("symbol", order.Symbol),
		zap.String("side", string(order.Side)),
		zap.String("type", string(order.Type)),
		zap.String("quantity", order.Quantity.String()),
	)

	return order, nil
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
