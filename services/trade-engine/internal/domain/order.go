package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// OrderSide represents the side of an order (BUY or SELL)
type OrderSide string

const (
	OrderSideBuy  OrderSide = "BUY"
	OrderSideSell OrderSide = "SELL"
)

// IsValid validates the OrderSide
func (s OrderSide) IsValid() bool {
	return s == OrderSideBuy || s == OrderSideSell
}

// OrderType represents the type of order
type OrderType string

const (
	OrderTypeMarket OrderType = "MARKET"
	OrderTypeLimit  OrderType = "LIMIT"
	OrderTypeStop   OrderType = "STOP"
)

// IsValid validates the OrderType
func (t OrderType) IsValid() bool {
	return t == OrderTypeMarket || t == OrderTypeLimit || t == OrderTypeStop
}

// OrderStatus represents the current status of an order
type OrderStatus string

const (
	OrderStatusPending         OrderStatus = "PENDING"
	OrderStatusOpen            OrderStatus = "OPEN"
	OrderStatusPartiallyFilled OrderStatus = "PARTIALLY_FILLED"
	OrderStatusFilled          OrderStatus = "FILLED"
	OrderStatusCancelled       OrderStatus = "CANCELLED"
	OrderStatusRejected        OrderStatus = "REJECTED"
)

// IsValid validates the OrderStatus
func (s OrderStatus) IsValid() bool {
	switch s {
	case OrderStatusPending, OrderStatusOpen, OrderStatusPartiallyFilled,
		OrderStatusFilled, OrderStatusCancelled, OrderStatusRejected:
		return true
	default:
		return false
	}
}

// IsFinal returns true if the status is final (cannot be changed)
func (s OrderStatus) IsFinal() bool {
	return s == OrderStatusFilled || s == OrderStatusCancelled || s == OrderStatusRejected
}

// TimeInForce represents how long an order remains active
type TimeInForce string

const (
	TimeInForceGTC TimeInForce = "GTC" // Good Till Cancelled
	TimeInForceIOC TimeInForce = "IOC" // Immediate or Cancel
	TimeInForceFOK TimeInForce = "FOK" // Fill or Kill
)

// IsValid validates the TimeInForce
func (t TimeInForce) IsValid() bool {
	return t == TimeInForceGTC || t == TimeInForceIOC || t == TimeInForceFOK
}

// Order represents a trading order in the system
type Order struct {
	ID              uuid.UUID        `json:"id" gorm:"primaryKey;type:uuid"`
	UserID          uuid.UUID        `json:"user_id" gorm:"type:uuid;not null;index:idx_orders_user_status"`
	Symbol          string           `json:"symbol" gorm:"size:20;not null;index:idx_orders_symbol_status"`
	Side            OrderSide        `json:"side" gorm:"type:varchar(10);not null"`
	Type            OrderType        `json:"type" gorm:"type:varchar(10);not null;column:order_type"`
	Status          OrderStatus      `json:"status" gorm:"type:varchar(20);not null;index:idx_orders_status_created"`
	Quantity        decimal.Decimal  `json:"quantity" gorm:"type:decimal(20,8);not null"`
	FilledQuantity  decimal.Decimal  `json:"filled_quantity" gorm:"type:decimal(20,8);default:0"`
	Price           *decimal.Decimal `json:"price,omitempty" gorm:"type:decimal(20,8)"`
	StopPrice       *decimal.Decimal `json:"stop_price,omitempty" gorm:"type:decimal(20,8)"`
	TimeInForce     TimeInForce      `json:"time_in_force" gorm:"type:varchar(10);default:'GTC'"`
	ClientOrderID   *string          `json:"client_order_id,omitempty" gorm:"size:100;uniqueIndex:idx_client_order"`
	ReservationID   *uuid.UUID       `json:"reservation_id,omitempty" gorm:"type:uuid"`
	CreatedAt       time.Time        `json:"created_at" gorm:"not null"`
	UpdatedAt       time.Time        `json:"updated_at" gorm:"not null"`
	FilledAt        *time.Time       `json:"filled_at,omitempty"`
	CancelledAt     *time.Time       `json:"cancelled_at,omitempty"`
}

// TableName specifies the table name for the Order model
func (Order) TableName() string {
	return "orders"
}

// Domain errors
var (
	ErrInvalidQuantity   = errors.New("quantity must be greater than 0")
	ErrInvalidPrice      = errors.New("price must be greater than 0 for limit orders")
	ErrInvalidStopPrice  = errors.New("stop price must be greater than 0 for stop orders")
	ErrInvalidSide       = errors.New("invalid order side")
	ErrInvalidType       = errors.New("invalid order type")
	ErrInvalidStatus     = errors.New("invalid order status")
	ErrInvalidTimeInForce = errors.New("invalid time in force")
	ErrInvalidSymbol     = errors.New("invalid symbol")
	ErrMarketOrderPrice  = errors.New("market orders cannot have a price")
	ErrLimitOrderNoPrice = errors.New("limit orders must have a price")
	ErrStopOrderNoPrice  = errors.New("stop orders must have a stop price")
	ErrOrderNotCancellable = errors.New("order cannot be cancelled in current status")
	ErrOrderAlreadyFilled = errors.New("order is already filled")
)

// Validate validates the order fields
func (o *Order) Validate() error {
	// Validate quantity
	if o.Quantity.LessThanOrEqual(decimal.Zero) {
		return ErrInvalidQuantity
	}

	// Validate side
	if !o.Side.IsValid() {
		return ErrInvalidSide
	}

	// Validate type
	if !o.Type.IsValid() {
		return ErrInvalidType
	}

	// Validate status
	if !o.Status.IsValid() {
		return ErrInvalidStatus
	}

	// Validate time in force
	if !o.TimeInForce.IsValid() {
		return ErrInvalidTimeInForce
	}

	// Validate symbol (basic check)
	if o.Symbol == "" || len(o.Symbol) < 3 {
		return ErrInvalidSymbol
	}

	// Validate order type specific requirements
	switch o.Type {
	case OrderTypeMarket:
		if o.Price != nil {
			return ErrMarketOrderPrice
		}
	case OrderTypeLimit:
		if o.Price == nil || o.Price.LessThanOrEqual(decimal.Zero) {
			return ErrLimitOrderNoPrice
		}
	case OrderTypeStop:
		if o.StopPrice == nil || o.StopPrice.LessThanOrEqual(decimal.Zero) {
			return ErrStopOrderNoPrice
		}
	}

	return nil
}

// RemainingQuantity returns the quantity remaining to be filled
func (o *Order) RemainingQuantity() decimal.Decimal {
	return o.Quantity.Sub(o.FilledQuantity)
}

// IsFilled returns true if the order is completely filled
func (o *Order) IsFilled() bool {
	return o.FilledQuantity.Equal(o.Quantity)
}

// IsPartiallyFilled returns true if the order is partially filled
func (o *Order) IsPartiallyFilled() bool {
	return o.FilledQuantity.GreaterThan(decimal.Zero) && o.FilledQuantity.LessThan(o.Quantity)
}

// CanBeCancelled returns true if the order can be cancelled
func (o *Order) CanBeCancelled() bool {
	return o.Status == OrderStatusOpen || o.Status == OrderStatusPartiallyFilled || o.Status == OrderStatusPending
}

// CanBeMatched returns true if the order can be matched
func (o *Order) CanBeMatched() bool {
	return o.Status == OrderStatusOpen && o.RemainingQuantity().GreaterThan(decimal.Zero)
}

// Fill fills the order with the given quantity
func (o *Order) Fill(quantity decimal.Decimal) error {
	if quantity.LessThanOrEqual(decimal.Zero) {
		return errors.New("fill quantity must be greater than 0")
	}

	newFilledQuantity := o.FilledQuantity.Add(quantity)
	if newFilledQuantity.GreaterThan(o.Quantity) {
		return errors.New("fill quantity exceeds order quantity")
	}

	o.FilledQuantity = newFilledQuantity
	o.UpdatedAt = time.Now()

	if o.IsFilled() {
		o.Status = OrderStatusFilled
		now := time.Now()
		o.FilledAt = &now
	} else if o.IsPartiallyFilled() {
		o.Status = OrderStatusPartiallyFilled
	}

	return nil
}

// Cancel cancels the order
func (o *Order) Cancel() error {
	if !o.CanBeCancelled() {
		return ErrOrderNotCancellable
	}

	o.Status = OrderStatusCancelled
	now := time.Now()
	o.CancelledAt = &now
	o.UpdatedAt = now

	return nil
}

// Reject rejects the order with a reason
func (o *Order) Reject() error {
	if o.Status.IsFinal() {
		return errors.New("cannot reject order in final status")
	}

	o.Status = OrderStatusRejected
	o.UpdatedAt = time.Now()

	return nil
}

// Open marks the order as open (ready for matching)
func (o *Order) Open() error {
	if o.Status != OrderStatusPending {
		return errors.New("can only open pending orders")
	}

	o.Status = OrderStatusOpen
	o.UpdatedAt = time.Now()

	return nil
}

// GetRequiredBalance calculates the required balance for this order
func (o *Order) GetRequiredBalance() (currency string, amount decimal.Decimal) {
	if o.Side == OrderSideBuy {
		// For buy orders, we need the quote currency (right side of pair)
		// e.g., BTC/USDT buy order needs USDT
		if o.Type == OrderTypeMarket {
			// For market orders, we don't know the exact price, return 0
			// The service layer should handle this differently
			return o.GetQuoteCurrency(), decimal.Zero
		}
		// For limit/stop orders: quantity * price
		if o.Price != nil {
			return o.GetQuoteCurrency(), o.Quantity.Mul(*o.Price)
		}
		return o.GetQuoteCurrency(), decimal.Zero
	} else {
		// For sell orders, we need the base currency (left side of pair)
		// e.g., BTC/USDT sell order needs BTC
		return o.GetBaseCurrency(), o.Quantity
	}
}

// GetBaseCurrency extracts the base currency from the symbol (e.g., "BTC" from "BTC/USDT")
func (o *Order) GetBaseCurrency() string {
	// Simple split on / or - or _
	for i, c := range o.Symbol {
		if c == '/' || c == '-' || c == '_' {
			return o.Symbol[:i]
		}
	}
	// If no separator, assume first 3 characters (e.g., BTCUSDT -> BTC)
	if len(o.Symbol) >= 6 {
		return o.Symbol[:3]
	}
	return o.Symbol
}

// GetQuoteCurrency extracts the quote currency from the symbol (e.g., "USDT" from "BTC/USDT")
func (o *Order) GetQuoteCurrency() string {
	// Simple split on / or - or _
	for i, c := range o.Symbol {
		if c == '/' || c == '-' || c == '_' {
			return o.Symbol[i+1:]
		}
	}
	// If no separator, assume last 3-4 characters (e.g., BTCUSDT -> USDT)
	if len(o.Symbol) >= 6 {
		return o.Symbol[3:]
	}
	return o.Symbol
}
