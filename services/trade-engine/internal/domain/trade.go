package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Trade represents a matched trade between two orders
type Trade struct {
	ID             uuid.UUID       `json:"id" gorm:"primaryKey;type:uuid"`
	Symbol         string          `json:"symbol" gorm:"size:20;not null;index:idx_trades_symbol_time"`
	MakerOrderID   uuid.UUID       `json:"maker_order_id" gorm:"type:uuid;not null;index:idx_trades_maker_order"`
	TakerOrderID   uuid.UUID       `json:"taker_order_id" gorm:"type:uuid;not null;index:idx_trades_taker_order"`
	MakerUserID    uuid.UUID       `json:"maker_user_id" gorm:"type:uuid;not null;index:idx_trades_maker_user_time"`
	TakerUserID    uuid.UUID       `json:"taker_user_id" gorm:"type:uuid;not null;index:idx_trades_taker_user_time"`
	Price          decimal.Decimal `json:"price" gorm:"type:decimal(20,8);not null"`
	Quantity       decimal.Decimal `json:"quantity" gorm:"type:decimal(20,8);not null"`
	MakerSide      OrderSide       `json:"maker_side" gorm:"type:varchar(10);not null"`
	TakerSide      OrderSide       `json:"taker_side" gorm:"type:varchar(10);not null"`
	MakerFee       decimal.Decimal `json:"maker_fee" gorm:"type:decimal(20,8);default:0"`
	TakerFee       decimal.Decimal `json:"taker_fee" gorm:"type:decimal(20,8);default:0"`
	ExecutedAt     time.Time       `json:"executed_at" gorm:"not null;index:idx_trades_symbol_time"`
	SettledAt      *time.Time      `json:"settled_at,omitempty"`
	SettlementID   *uuid.UUID      `json:"settlement_id,omitempty" gorm:"type:uuid"`
	SettlementStatus string        `json:"settlement_status,omitempty" gorm:"size:20;default:'PENDING'"`
}

// TableName specifies the table name for the Trade model
func (Trade) TableName() string {
	return "trades"
}

// IsSettled returns true if the trade has been settled
func (t *Trade) IsSettled() bool {
	return t.SettledAt != nil && t.SettlementStatus == "SETTLED"
}

// GetTotalValue returns the total value of the trade (price * quantity)
func (t *Trade) GetTotalValue() decimal.Decimal {
	return t.Price.Mul(t.Quantity)
}

// GetMakerFeeAmount calculates the maker fee amount
func (t *Trade) GetMakerFeeAmount() decimal.Decimal {
	return t.GetTotalValue().Mul(t.MakerFee)
}

// GetTakerFeeAmount calculates the taker fee amount
func (t *Trade) GetTakerFeeAmount() decimal.Decimal {
	return t.GetTotalValue().Mul(t.TakerFee)
}

// GetTotalFees returns the total fees for this trade
func (t *Trade) GetTotalFees() decimal.Decimal {
	return t.GetMakerFeeAmount().Add(t.GetTakerFeeAmount())
}

// MarkSettled marks the trade as settled
func (t *Trade) MarkSettled(settlementID uuid.UUID) {
	now := time.Now()
	t.SettledAt = &now
	t.SettlementID = &settlementID
	t.SettlementStatus = "SETTLED"
}

// MarkSettlementFailed marks the trade settlement as failed
func (t *Trade) MarkSettlementFailed() {
	t.SettlementStatus = "FAILED"
}
