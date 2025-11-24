// ============================================================================
// MYTRADER TRADE ENGINE - TRADING LIMITS SERVICE
// ============================================================================
// Component: Trading Limits Configuration and Enforcement
// Version: 1.0
// Sprint 2 - TASK-BACKEND-014
// ============================================================================

package service

import (
	"errors"
	"sync"

	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

// Limits validation errors
var (
	ErrInvalidMaxOrderSize        = errors.New("max_order_size must be greater than min_order_size")
	ErrInvalidMinOrderSize        = errors.New("min_order_size must be greater than 0")
	ErrInvalidMaxDailyVolume      = errors.New("max_daily_volume must be greater than 0")
	ErrInvalidMaxConcurrentOrders = errors.New("max_concurrent_orders must be greater than 0")
	ErrInvalidPriceBand           = errors.New("price_band_percent must be between 0 and 100")
)

// TradingLimits defines configurable trading limits
type TradingLimits struct {
	MaxOrderSize        decimal.Decimal `json:"max_order_size"`         // Maximum single order size
	MaxDailyVolume      decimal.Decimal `json:"max_daily_volume"`       // Maximum daily trading volume
	MaxConcurrentOrders int             `json:"max_concurrent_orders"`  // Maximum concurrent open orders per user
	MinOrderSize        decimal.Decimal `json:"min_order_size"`         // Minimum order size
	PriceBandPercent    decimal.Decimal `json:"price_band_percent"`     // Maximum price deviation from market (%)
}

// DefaultLimits returns the default trading limits
func DefaultLimits() *TradingLimits {
	return &TradingLimits{
		MaxOrderSize:        decimal.NewFromFloat(100.0),
		MaxDailyVolume:      decimal.NewFromFloat(1000.0),
		MaxConcurrentOrders: 50,
		MinOrderSize:        decimal.NewFromFloat(0.001),
		PriceBandPercent:    decimal.NewFromInt(10),
	}
}

// TradingLimitsService manages trading limits configuration
type TradingLimitsService struct {
	limits *TradingLimits
	mu     sync.RWMutex
	logger *zap.Logger
}

// NewTradingLimitsService creates a new trading limits service
func NewTradingLimitsService(logger *zap.Logger) *TradingLimitsService {
	return &TradingLimitsService{
		limits: DefaultLimits(),
		logger: logger.With(zap.String("service", "trading-limits")),
	}
}

// GetLimits returns the current trading limits (thread-safe)
func (s *TradingLimitsService) GetLimits() *TradingLimits {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Return a copy to prevent external modification
	return &TradingLimits{
		MaxOrderSize:        s.limits.MaxOrderSize,
		MaxDailyVolume:      s.limits.MaxDailyVolume,
		MaxConcurrentOrders: s.limits.MaxConcurrentOrders,
		MinOrderSize:        s.limits.MinOrderSize,
		PriceBandPercent:    s.limits.PriceBandPercent,
	}
}

// UpdateLimits updates the trading limits after validation (thread-safe)
func (s *TradingLimitsService) UpdateLimits(newLimits *TradingLimits) error {
	// Validate new limits
	if err := s.validateLimits(newLimits); err != nil {
		s.logger.Warn("Invalid limits rejected", zap.Error(err))
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Update limits
	oldLimits := s.limits
	s.limits = &TradingLimits{
		MaxOrderSize:        newLimits.MaxOrderSize,
		MaxDailyVolume:      newLimits.MaxDailyVolume,
		MaxConcurrentOrders: newLimits.MaxConcurrentOrders,
		MinOrderSize:        newLimits.MinOrderSize,
		PriceBandPercent:    newLimits.PriceBandPercent,
	}

	s.logger.Info("Trading limits updated",
		zap.String("old_max_order_size", oldLimits.MaxOrderSize.String()),
		zap.String("new_max_order_size", newLimits.MaxOrderSize.String()),
		zap.String("old_min_order_size", oldLimits.MinOrderSize.String()),
		zap.String("new_min_order_size", newLimits.MinOrderSize.String()),
	)

	return nil
}

// validateLimits validates trading limits
func (s *TradingLimitsService) validateLimits(limits *TradingLimits) error {
	// Validate min order size
	if limits.MinOrderSize.LessThanOrEqual(decimal.Zero) {
		return ErrInvalidMinOrderSize
	}

	// Validate max order size
	if limits.MaxOrderSize.LessThanOrEqual(limits.MinOrderSize) {
		return ErrInvalidMaxOrderSize
	}

	// Validate max daily volume
	if limits.MaxDailyVolume.LessThanOrEqual(decimal.Zero) {
		return ErrInvalidMaxDailyVolume
	}

	// Validate max concurrent orders
	if limits.MaxConcurrentOrders <= 0 {
		return ErrInvalidMaxConcurrentOrders
	}

	// Validate price band
	if limits.PriceBandPercent.LessThan(decimal.Zero) || limits.PriceBandPercent.GreaterThan(decimal.NewFromInt(100)) {
		return ErrInvalidPriceBand
	}

	return nil
}

// ValidateOrderSize checks if an order size is within limits
func (s *TradingLimitsService) ValidateOrderSize(size decimal.Decimal) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if size.LessThan(s.limits.MinOrderSize) {
		return errors.New("order size below minimum limit")
	}

	if size.GreaterThan(s.limits.MaxOrderSize) {
		return errors.New("order size exceeds maximum limit")
	}

	return nil
}

// ValidateConcurrentOrders checks if user has too many concurrent orders
func (s *TradingLimitsService) ValidateConcurrentOrders(currentCount int) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if currentCount >= s.limits.MaxConcurrentOrders {
		return errors.New("maximum concurrent orders limit reached")
	}

	return nil
}

// ValidateDailyVolume checks if daily volume is within limits
func (s *TradingLimitsService) ValidateDailyVolume(currentVolume, additionalVolume decimal.Decimal) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	totalVolume := currentVolume.Add(additionalVolume)
	if totalVolume.GreaterThan(s.limits.MaxDailyVolume) {
		return errors.New("daily volume limit exceeded")
	}

	return nil
}

// ValidatePriceDeviation checks if price is within allowed band from market price
func (s *TradingLimitsService) ValidatePriceDeviation(orderPrice, marketPrice decimal.Decimal) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if marketPrice.IsZero() {
		return nil // No market price available, skip validation
	}

	// Calculate percentage deviation
	deviation := orderPrice.Sub(marketPrice).Abs().Div(marketPrice).Mul(decimal.NewFromInt(100))

	if deviation.GreaterThan(s.limits.PriceBandPercent) {
		return errors.New("order price deviates too much from market price")
	}

	return nil
}
