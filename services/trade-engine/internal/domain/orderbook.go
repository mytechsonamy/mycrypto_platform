package domain

import (
	"time"

	"github.com/shopspring/decimal"
)

// OrderBookEntry represents a single price level in the order book
type OrderBookEntry struct {
	Symbol    string          `json:"symbol" gorm:"size:20;not null;primaryKey;index:idx_orderbook_symbol_side_price"`
	Side      OrderSide       `json:"side" gorm:"type:varchar(10);not null;primaryKey"`
	Price     decimal.Decimal `json:"price" gorm:"type:decimal(20,8);not null;primaryKey"`
	Quantity  decimal.Decimal `json:"quantity" gorm:"type:decimal(20,8);not null"`
	OrderCount int            `json:"order_count" gorm:"not null;default:0"`
	UpdatedAt time.Time       `json:"updated_at" gorm:"not null"`
}

// TableName specifies the table name for the OrderBookEntry model
func (OrderBookEntry) TableName() string {
	return "order_book"
}

// OrderBook represents the in-memory order book for a trading pair
type OrderBook struct {
	Symbol    string
	Bids      []PriceLevel // Buy orders sorted by price descending
	Asks      []PriceLevel // Sell orders sorted by price ascending
	LastUpdate time.Time
}

// PriceLevel represents a price level in the order book with total quantity
type PriceLevel struct {
	Price      decimal.Decimal
	Quantity   decimal.Decimal
	OrderCount int
}

// NewOrderBook creates a new empty order book
func NewOrderBook(symbol string) *OrderBook {
	return &OrderBook{
		Symbol:     symbol,
		Bids:       make([]PriceLevel, 0),
		Asks:       make([]PriceLevel, 0),
		LastUpdate: time.Now(),
	}
}

// GetBestBid returns the highest bid price
func (ob *OrderBook) GetBestBid() *decimal.Decimal {
	if len(ob.Bids) == 0 {
		return nil
	}
	return &ob.Bids[0].Price
}

// GetBestAsk returns the lowest ask price
func (ob *OrderBook) GetBestAsk() *decimal.Decimal {
	if len(ob.Asks) == 0 {
		return nil
	}
	return &ob.Asks[0].Price
}

// GetSpread returns the bid-ask spread
func (ob *OrderBook) GetSpread() *decimal.Decimal {
	bestBid := ob.GetBestBid()
	bestAsk := ob.GetBestAsk()

	if bestBid == nil || bestAsk == nil {
		return nil
	}

	spread := bestAsk.Sub(*bestBid)
	return &spread
}

// GetMidPrice returns the mid-market price
func (ob *OrderBook) GetMidPrice() *decimal.Decimal {
	bestBid := ob.GetBestBid()
	bestAsk := ob.GetBestAsk()

	if bestBid == nil || bestAsk == nil {
		return nil
	}

	mid := bestBid.Add(*bestAsk).Div(decimal.NewFromInt(2))
	return &mid
}

// GetDepth returns the total quantity available at the top N levels
func (ob *OrderBook) GetDepth(levels int) (bidDepth, askDepth decimal.Decimal) {
	bidDepth = decimal.Zero
	askDepth = decimal.Zero

	for i := 0; i < levels && i < len(ob.Bids); i++ {
		bidDepth = bidDepth.Add(ob.Bids[i].Quantity)
	}

	for i := 0; i < levels && i < len(ob.Asks); i++ {
		askDepth = askDepth.Add(ob.Asks[i].Quantity)
	}

	return bidDepth, askDepth
}

// IsEmpty returns true if the order book has no orders
func (ob *OrderBook) IsEmpty() bool {
	return len(ob.Bids) == 0 && len(ob.Asks) == 0
}

// HasCrossedBook returns true if there's a price overlap (bid >= ask)
func (ob *OrderBook) HasCrossedBook() bool {
	bestBid := ob.GetBestBid()
	bestAsk := ob.GetBestAsk()

	if bestBid == nil || bestAsk == nil {
		return false
	}

	return bestBid.GreaterThanOrEqual(*bestAsk)
}
