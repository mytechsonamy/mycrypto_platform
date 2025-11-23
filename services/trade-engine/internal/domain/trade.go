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

	// Order references
	BuyerOrderID   uuid.UUID       `json:"buyer_order_id" gorm:"type:uuid;not null;index:idx_trades_buyer_order"`
	SellerOrderID  uuid.UUID       `json:"seller_order_id" gorm:"type:uuid;not null;index:idx_trades_seller_order"`

	// User references
	BuyerUserID    uuid.UUID       `json:"buyer_user_id" gorm:"type:uuid;not null;index:idx_trades_buyer_user_time"`
	SellerUserID   uuid.UUID       `json:"seller_user_id" gorm:"type:uuid;not null;index:idx_trades_seller_user_time"`

	// Trade details
	Price          decimal.Decimal `json:"price" gorm:"type:decimal(20,8);not null"`
	Quantity       decimal.Decimal `json:"quantity" gorm:"type:decimal(20,8);not null"`

	// Fees
	BuyerFee       decimal.Decimal `json:"buyer_fee" gorm:"type:decimal(20,8);default:0"`
	SellerFee      decimal.Decimal `json:"seller_fee" gorm:"type:decimal(20,8);default:0"`

	// Maker/taker information (true if buyer was the maker/passive order)
	IsBuyerMaker   bool            `json:"is_buyer_maker" gorm:"not null;default:false"`

	// Timestamps
	ExecutedAt     time.Time       `json:"executed_at" gorm:"not null;index:idx_trades_symbol_time"`

	// Settlement tracking (for future use)
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

// GetMakerFeeAmount calculates the maker fee amount (fee of the passive order)
func (t *Trade) GetMakerFeeAmount() decimal.Decimal {
	if t.IsBuyerMaker {
		return t.BuyerFee
	}
	return t.SellerFee
}

// GetTakerFeeAmount calculates the taker fee amount (fee of the aggressive order)
func (t *Trade) GetTakerFeeAmount() decimal.Decimal {
	if t.IsBuyerMaker {
		return t.SellerFee
	}
	return t.BuyerFee
}

// GetTotalFees returns the total fees for this trade
func (t *Trade) GetTotalFees() decimal.Decimal {
	return t.BuyerFee.Add(t.SellerFee)
}

// GetBuyerTotal calculates what the buyer paid (trade value + buyer fee)
func (t *Trade) GetBuyerTotal() decimal.Decimal {
	return t.GetTotalValue().Add(t.BuyerFee)
}

// GetSellerTotal calculates what the seller received (trade value - seller fee)
func (t *Trade) GetSellerTotal() decimal.Decimal {
	return t.GetTotalValue().Sub(t.SellerFee)
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
