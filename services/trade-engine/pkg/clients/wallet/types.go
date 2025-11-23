package wallet

import (
	"errors"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// WalletClient defines the interface for wallet service operations
// This interface enables dependency injection and testing with mocks
type WalletClient interface {
	// GetBalance retrieves the current balance for a user and currency
	GetBalance(userID uuid.UUID, currency string) (*BalanceResponse, error)

	// ReserveBalance locks funds for an order placement
	// Returns a reservation ID that can be used to release the funds later
	ReserveBalance(req *ReserveBalanceRequest) (*ReserveBalanceResponse, error)

	// ReleaseBalance unlocks previously reserved funds (e.g., when order is cancelled)
	ReleaseBalance(req *ReleaseBalanceRequest) (*ReleaseBalanceResponse, error)

	// SettleTrade executes the actual fund transfer after a trade is executed
	// This transfers funds from buyer to seller
	SettleTrade(req *SettleTradeRequest) (*SettleTradeResponse, error)

	// Close closes the wallet client and releases resources
	Close() error
}

// BalanceResponse represents the balance information for a user and currency
type BalanceResponse struct {
	UserID           uuid.UUID       `json:"user_id"`
	Currency         string          `json:"currency"`
	AvailableBalance decimal.Decimal `json:"available_balance"`
	ReservedBalance  decimal.Decimal `json:"reserved_balance"`
	TotalBalance     decimal.Decimal `json:"total_balance"`
}

// ReserveBalanceRequest represents a request to reserve funds for an order
type ReserveBalanceRequest struct {
	UserID   uuid.UUID       `json:"user_id"`
	Currency string          `json:"currency"`  // "BTC", "USDT", etc.
	Amount   decimal.Decimal `json:"amount"`
	OrderID  uuid.UUID       `json:"order_id"`
	Reason   string          `json:"reason"`    // "ORDER_PLACEMENT"
}

// ReserveBalanceResponse represents the response from a reserve balance request
type ReserveBalanceResponse struct {
	ReservationID    uuid.UUID       `json:"reservation_id"`
	Success          bool            `json:"success"`
	AvailableBalance decimal.Decimal `json:"available_balance"`
	ReservedBalance  decimal.Decimal `json:"reserved_balance"`
	Message          string          `json:"message,omitempty"`
}

// ReleaseBalanceRequest represents a request to release reserved funds
type ReleaseBalanceRequest struct {
	ReservationID uuid.UUID `json:"reservation_id,omitempty"`
	OrderID       uuid.UUID `json:"order_id"`
	Reason        string    `json:"reason"`  // "ORDER_CANCELLED", "ORDER_FILLED", "ORDER_EXPIRED"
}

// ReleaseBalanceResponse represents the response from a release balance request
type ReleaseBalanceResponse struct {
	Success        bool            `json:"success"`
	ReleasedAmount decimal.Decimal `json:"released_amount"`
	Message        string          `json:"message,omitempty"`
}

// SettleTradeRequest represents a request to settle a trade
// This executes the actual fund transfer between buyer and seller
type SettleTradeRequest struct {
	TradeID          uuid.UUID       `json:"trade_id"`
	BuyerID          uuid.UUID       `json:"buyer_id"`
	SellerID         uuid.UUID       `json:"seller_id"`
	BuyerOrderID     uuid.UUID       `json:"buyer_order_id"`
	SellerOrderID    uuid.UUID       `json:"seller_order_id"`
	BaseCurrency     string          `json:"base_currency"`      // e.g., "BTC"
	QuoteCurrency    string          `json:"quote_currency"`     // e.g., "USDT"
	BaseAmount       decimal.Decimal `json:"base_amount"`        // Amount of base currency traded
	QuoteAmount      decimal.Decimal `json:"quote_amount"`       // Amount of quote currency traded
	Price            decimal.Decimal `json:"price"`
	BuyerFee         decimal.Decimal `json:"buyer_fee"`
	SellerFee        decimal.Decimal `json:"seller_fee"`
}

// SettleTradeResponse represents the response from a trade settlement
type SettleTradeResponse struct {
	Success           bool      `json:"success"`
	SettlementID      uuid.UUID `json:"settlement_id"`
	BuyerReservationReleased  bool `json:"buyer_reservation_released"`
	SellerReservationReleased bool `json:"seller_reservation_released"`
	Message           string    `json:"message,omitempty"`
}

// Standard wallet service errors
var (
	ErrInsufficientBalance  = errors.New("insufficient balance")
	ErrUserNotFound         = errors.New("user not found")
	ErrReservationNotFound  = errors.New("reservation not found")
	ErrWalletServiceDown    = errors.New("wallet service unavailable")
	ErrInvalidRequest       = errors.New("invalid request")
	ErrCircuitOpen          = errors.New("circuit breaker is open")
	ErrTimeout              = errors.New("request timeout")
	ErrInvalidResponse      = errors.New("invalid response from wallet service")
)
