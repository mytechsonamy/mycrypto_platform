package wallet

import (
	"fmt"
	"sync"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

// mockWalletClient implements WalletClient with in-memory simulation
// This is useful for testing and development without a real wallet service
type mockWalletClient struct {
	balances     map[string]decimal.Decimal  // key: userID:currency
	reservations map[uuid.UUID]*reservation  // key: reservationID
	mu           sync.RWMutex
	logger       *zap.Logger
	shouldFail   bool  // For testing failure scenarios
	failureType  error // Type of failure to simulate
}

type reservation struct {
	ID       uuid.UUID
	UserID   uuid.UUID
	Currency string
	Amount   decimal.Decimal
	OrderID  uuid.UUID
	Reason   string
}

// NewMockWalletClient creates a new mock wallet client for testing
func NewMockWalletClient(logger *zap.Logger) WalletClient {
	return &mockWalletClient{
		balances:     make(map[string]decimal.Decimal),
		reservations: make(map[uuid.UUID]*reservation),
		logger:       logger,
		shouldFail:   false,
	}
}

// SetShouldFail configures the mock to fail on subsequent calls
func (m *mockWalletClient) SetShouldFail(shouldFail bool, failureType error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.shouldFail = shouldFail
	m.failureType = failureType
}

// SetBalance sets a balance for a user and currency (for testing)
func (m *mockWalletClient) SetBalance(userID uuid.UUID, currency string, balance decimal.Decimal) {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := fmt.Sprintf("%s:%s", userID.String(), currency)
	m.balances[key] = balance
}

// GetBalance retrieves the balance for a user and currency
func (m *mockWalletClient) GetBalance(userID uuid.UUID, currency string) (*BalanceResponse, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.shouldFail {
		return nil, m.getFailureError()
	}

	key := fmt.Sprintf("%s:%s", userID.String(), currency)
	totalBalance := m.balances[key]

	// Calculate reserved balance
	reservedBalance := decimal.Zero
	for _, res := range m.reservations {
		if res.UserID == userID && res.Currency == currency {
			reservedBalance = reservedBalance.Add(res.Amount)
		}
	}

	availableBalance := totalBalance.Sub(reservedBalance)

	m.logger.Debug("Mock GetBalance",
		zap.String("user_id", userID.String()),
		zap.String("currency", currency),
		zap.String("available", availableBalance.String()),
		zap.String("reserved", reservedBalance.String()),
		zap.String("total", totalBalance.String()),
	)

	return &BalanceResponse{
		UserID:           userID,
		Currency:         currency,
		AvailableBalance: availableBalance,
		ReservedBalance:  reservedBalance,
		TotalBalance:     totalBalance,
	}, nil
}

// ReserveBalance locks funds for an order placement
func (m *mockWalletClient) ReserveBalance(req *ReserveBalanceRequest) (*ReserveBalanceResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.shouldFail {
		return nil, m.getFailureError()
	}

	key := fmt.Sprintf("%s:%s", req.UserID.String(), req.Currency)
	totalBalance := m.balances[key]

	// Calculate available balance
	reservedBalance := decimal.Zero
	for _, res := range m.reservations {
		if res.UserID == req.UserID && res.Currency == req.Currency {
			reservedBalance = reservedBalance.Add(res.Amount)
		}
	}

	availableBalance := totalBalance.Sub(reservedBalance)

	// Check if sufficient balance
	if availableBalance.LessThan(req.Amount) {
		m.logger.Warn("Mock ReserveBalance - insufficient balance",
			zap.String("user_id", req.UserID.String()),
			zap.String("currency", req.Currency),
			zap.String("requested", req.Amount.String()),
			zap.String("available", availableBalance.String()),
		)
		return &ReserveBalanceResponse{
			Success:          false,
			AvailableBalance: availableBalance,
			ReservedBalance:  reservedBalance,
			Message:          "Insufficient balance",
		}, nil
	}

	// Create reservation
	reservationID := uuid.New()
	m.reservations[reservationID] = &reservation{
		ID:       reservationID,
		UserID:   req.UserID,
		Currency: req.Currency,
		Amount:   req.Amount,
		OrderID:  req.OrderID,
		Reason:   req.Reason,
	}

	reservedBalance = reservedBalance.Add(req.Amount)
	availableBalance = availableBalance.Sub(req.Amount)

	m.logger.Info("Mock ReserveBalance - success",
		zap.String("reservation_id", reservationID.String()),
		zap.String("user_id", req.UserID.String()),
		zap.String("currency", req.Currency),
		zap.String("amount", req.Amount.String()),
		zap.String("order_id", req.OrderID.String()),
	)

	return &ReserveBalanceResponse{
		ReservationID:    reservationID,
		Success:          true,
		AvailableBalance: availableBalance,
		ReservedBalance:  reservedBalance,
		Message:          "Balance reserved successfully",
	}, nil
}

// ReleaseBalance unlocks previously reserved funds
func (m *mockWalletClient) ReleaseBalance(req *ReleaseBalanceRequest) (*ReleaseBalanceResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.shouldFail {
		return nil, m.getFailureError()
	}

	// Find reservation by order ID if reservation ID is not provided
	var reservationID uuid.UUID
	var res *reservation

	if req.ReservationID != uuid.Nil {
		reservationID = req.ReservationID
		res = m.reservations[reservationID]
	} else {
		// Search by order ID
		for id, r := range m.reservations {
			if r.OrderID == req.OrderID {
				reservationID = id
				res = r
				break
			}
		}
	}

	if res == nil {
		m.logger.Warn("Mock ReleaseBalance - reservation not found",
			zap.String("reservation_id", req.ReservationID.String()),
			zap.String("order_id", req.OrderID.String()),
		)
		return &ReleaseBalanceResponse{
			Success:        false,
			ReleasedAmount: decimal.Zero,
			Message:        "Reservation not found",
		}, nil
	}

	releasedAmount := res.Amount
	delete(m.reservations, reservationID)

	m.logger.Info("Mock ReleaseBalance - success",
		zap.String("reservation_id", reservationID.String()),
		zap.String("user_id", res.UserID.String()),
		zap.String("currency", res.Currency),
		zap.String("amount", releasedAmount.String()),
		zap.String("reason", req.Reason),
	)

	return &ReleaseBalanceResponse{
		Success:        true,
		ReleasedAmount: releasedAmount,
		Message:        "Balance released successfully",
	}, nil
}

// SettleTrade executes the fund transfer for a completed trade
func (m *mockWalletClient) SettleTrade(req *SettleTradeRequest) (*SettleTradeResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.shouldFail {
		return nil, m.getFailureError()
	}

	// Transfer base currency from seller to buyer
	sellerBaseKey := fmt.Sprintf("%s:%s", req.SellerID.String(), req.BaseCurrency)
	buyerBaseKey := fmt.Sprintf("%s:%s", req.BuyerID.String(), req.BaseCurrency)

	sellerBaseBalance := m.balances[sellerBaseKey]
	buyerBaseBalance := m.balances[buyerBaseKey]

	m.balances[sellerBaseKey] = sellerBaseBalance.Sub(req.BaseAmount).Sub(req.SellerFee)
	m.balances[buyerBaseKey] = buyerBaseBalance.Add(req.BaseAmount)

	// Transfer quote currency from buyer to seller
	buyerQuoteKey := fmt.Sprintf("%s:%s", req.BuyerID.String(), req.QuoteCurrency)
	sellerQuoteKey := fmt.Sprintf("%s:%s", req.SellerID.String(), req.QuoteCurrency)

	buyerQuoteBalance := m.balances[buyerQuoteKey]
	sellerQuoteBalance := m.balances[sellerQuoteKey]

	m.balances[buyerQuoteKey] = buyerQuoteBalance.Sub(req.QuoteAmount).Sub(req.BuyerFee)
	m.balances[sellerQuoteKey] = sellerQuoteBalance.Add(req.QuoteAmount)

	// Release reservations for both orders
	buyerReservationReleased := false
	sellerReservationReleased := false

	for id, res := range m.reservations {
		if res.OrderID == req.BuyerOrderID {
			delete(m.reservations, id)
			buyerReservationReleased = true
		}
		if res.OrderID == req.SellerOrderID {
			delete(m.reservations, id)
			sellerReservationReleased = true
		}
	}

	settlementID := uuid.New()

	m.logger.Info("Mock SettleTrade - success",
		zap.String("settlement_id", settlementID.String()),
		zap.String("trade_id", req.TradeID.String()),
		zap.String("buyer_id", req.BuyerID.String()),
		zap.String("seller_id", req.SellerID.String()),
		zap.String("base_amount", req.BaseAmount.String()),
		zap.String("quote_amount", req.QuoteAmount.String()),
	)

	return &SettleTradeResponse{
		Success:                   true,
		SettlementID:              settlementID,
		BuyerReservationReleased:  buyerReservationReleased,
		SellerReservationReleased: sellerReservationReleased,
		Message:                   "Trade settled successfully",
	}, nil
}

// Close closes the mock client (no-op)
func (m *mockWalletClient) Close() error {
	return nil
}

// getFailureError returns the configured failure error or a default one
func (m *mockWalletClient) getFailureError() error {
	if m.failureType != nil {
		return m.failureType
	}
	return ErrWalletServiceDown
}
