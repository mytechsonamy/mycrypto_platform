package wallet

import (
	"testing"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"
)

func TestMockWalletClient_GetBalance(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger).(*mockWalletClient)

	userID := uuid.New()
	currency := "BTC"
	balance := decimal.NewFromFloat(10.5)

	// Set initial balance
	client.SetBalance(userID, currency, balance)

	// Get balance
	resp, err := client.GetBalance(userID, currency)
	require.NoError(t, err)
	assert.Equal(t, userID, resp.UserID)
	assert.Equal(t, currency, resp.Currency)
	assert.True(t, balance.Equal(resp.TotalBalance))
	assert.True(t, balance.Equal(resp.AvailableBalance))
	assert.True(t, decimal.Zero.Equal(resp.ReservedBalance))
}

func TestMockWalletClient_GetBalance_WithReservation(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger).(*mockWalletClient)

	userID := uuid.New()
	currency := "BTC"
	totalBalance := decimal.NewFromFloat(10.0)
	reserveAmount := decimal.NewFromFloat(3.0)

	// Set balance and reserve some
	client.SetBalance(userID, currency, totalBalance)
	_, err := client.ReserveBalance(&ReserveBalanceRequest{
		UserID:   userID,
		Currency: currency,
		Amount:   reserveAmount,
		OrderID:  uuid.New(),
		Reason:   "ORDER_PLACEMENT",
	})
	require.NoError(t, err)

	// Get balance
	resp, err := client.GetBalance(userID, currency)
	require.NoError(t, err)

	expectedAvailable := totalBalance.Sub(reserveAmount)
	assert.True(t, expectedAvailable.Equal(resp.AvailableBalance))
	assert.True(t, reserveAmount.Equal(resp.ReservedBalance))
	assert.True(t, totalBalance.Equal(resp.TotalBalance))
}

func TestMockWalletClient_ReserveBalance_Success(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger).(*mockWalletClient)

	userID := uuid.New()
	currency := "USDT"
	balance := decimal.NewFromFloat(1000.0)
	reserveAmount := decimal.NewFromFloat(100.0)
	orderID := uuid.New()

	// Set initial balance
	client.SetBalance(userID, currency, balance)

	// Reserve balance
	req := &ReserveBalanceRequest{
		UserID:   userID,
		Currency: currency,
		Amount:   reserveAmount,
		OrderID:  orderID,
		Reason:   "ORDER_PLACEMENT",
	}

	resp, err := client.ReserveBalance(req)
	require.NoError(t, err)
	assert.True(t, resp.Success)
	assert.NotEqual(t, uuid.Nil, resp.ReservationID)
	assert.True(t, reserveAmount.Equal(resp.ReservedBalance))

	expectedAvailable := balance.Sub(reserveAmount)
	assert.True(t, expectedAvailable.Equal(resp.AvailableBalance))
}

func TestMockWalletClient_ReserveBalance_InsufficientBalance(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger).(*mockWalletClient)

	userID := uuid.New()
	currency := "BTC"
	balance := decimal.NewFromFloat(1.0)
	reserveAmount := decimal.NewFromFloat(2.0) // More than available

	// Set initial balance
	client.SetBalance(userID, currency, balance)

	// Attempt to reserve more than available
	req := &ReserveBalanceRequest{
		UserID:   userID,
		Currency: currency,
		Amount:   reserveAmount,
		OrderID:  uuid.New(),
		Reason:   "ORDER_PLACEMENT",
	}

	resp, err := client.ReserveBalance(req)
	require.NoError(t, err)
	assert.False(t, resp.Success)
	assert.Equal(t, uuid.Nil, resp.ReservationID)
	assert.Contains(t, resp.Message, "Insufficient balance")
}

func TestMockWalletClient_ReleaseBalance_Success(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger).(*mockWalletClient)

	userID := uuid.New()
	currency := "ETH"
	balance := decimal.NewFromFloat(5.0)
	reserveAmount := decimal.NewFromFloat(2.0)
	orderID := uuid.New()

	// Set balance and reserve
	client.SetBalance(userID, currency, balance)
	reserveResp, err := client.ReserveBalance(&ReserveBalanceRequest{
		UserID:   userID,
		Currency: currency,
		Amount:   reserveAmount,
		OrderID:  orderID,
		Reason:   "ORDER_PLACEMENT",
	})
	require.NoError(t, err)
	require.True(t, reserveResp.Success)

	// Release balance
	releaseReq := &ReleaseBalanceRequest{
		ReservationID: reserveResp.ReservationID,
		OrderID:       orderID,
		Reason:        "ORDER_CANCELLED",
	}

	releaseResp, err := client.ReleaseBalance(releaseReq)
	require.NoError(t, err)
	assert.True(t, releaseResp.Success)
	assert.True(t, reserveAmount.Equal(releaseResp.ReleasedAmount))

	// Verify balance is restored
	balanceResp, err := client.GetBalance(userID, currency)
	require.NoError(t, err)
	assert.True(t, balance.Equal(balanceResp.AvailableBalance))
	assert.True(t, decimal.Zero.Equal(balanceResp.ReservedBalance))
}

func TestMockWalletClient_ReleaseBalance_ByOrderID(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger).(*mockWalletClient)

	userID := uuid.New()
	currency := "BTC"
	balance := decimal.NewFromFloat(10.0)
	reserveAmount := decimal.NewFromFloat(3.0)
	orderID := uuid.New()

	// Set balance and reserve
	client.SetBalance(userID, currency, balance)
	_, err := client.ReserveBalance(&ReserveBalanceRequest{
		UserID:   userID,
		Currency: currency,
		Amount:   reserveAmount,
		OrderID:  orderID,
		Reason:   "ORDER_PLACEMENT",
	})
	require.NoError(t, err)

	// Release by order ID (without reservation ID)
	releaseReq := &ReleaseBalanceRequest{
		OrderID: orderID,
		Reason:  "ORDER_CANCELLED",
	}

	releaseResp, err := client.ReleaseBalance(releaseReq)
	require.NoError(t, err)
	assert.True(t, releaseResp.Success)
	assert.True(t, reserveAmount.Equal(releaseResp.ReleasedAmount))
}

func TestMockWalletClient_ReleaseBalance_NotFound(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger).(*mockWalletClient)

	// Try to release non-existent reservation
	releaseReq := &ReleaseBalanceRequest{
		ReservationID: uuid.New(),
		OrderID:       uuid.New(),
		Reason:        "ORDER_CANCELLED",
	}

	releaseResp, err := client.ReleaseBalance(releaseReq)
	require.NoError(t, err)
	assert.False(t, releaseResp.Success)
	assert.Contains(t, releaseResp.Message, "not found")
}

func TestMockWalletClient_SettleTrade_Success(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger).(*mockWalletClient)

	buyerID := uuid.New()
	sellerID := uuid.New()
	buyerOrderID := uuid.New()
	sellerOrderID := uuid.New()

	baseCurrency := "BTC"
	quoteCurrency := "USDT"

	baseAmount := decimal.NewFromFloat(0.5)
	quoteAmount := decimal.NewFromFloat(25000.0) // 0.5 BTC at 50,000 USDT
	buyerFee := decimal.NewFromFloat(25.0)       // 0.1% of 25000
	sellerFee := decimal.NewFromFloat(0.0005)    // 0.1% of 0.5

	// Set initial balances
	client.SetBalance(buyerID, quoteCurrency, decimal.NewFromFloat(30000.0))
	client.SetBalance(sellerID, baseCurrency, decimal.NewFromFloat(1.0))

	// Reserve balances for both orders
	_, err := client.ReserveBalance(&ReserveBalanceRequest{
		UserID:   buyerID,
		Currency: quoteCurrency,
		Amount:   quoteAmount.Add(buyerFee),
		OrderID:  buyerOrderID,
		Reason:   "ORDER_PLACEMENT",
	})
	require.NoError(t, err)

	_, err = client.ReserveBalance(&ReserveBalanceRequest{
		UserID:   sellerID,
		Currency: baseCurrency,
		Amount:   baseAmount,
		OrderID:  sellerOrderID,
		Reason:   "ORDER_PLACEMENT",
	})
	require.NoError(t, err)

	// Settle trade
	settleReq := &SettleTradeRequest{
		TradeID:       uuid.New(),
		BuyerID:       buyerID,
		SellerID:      sellerID,
		BuyerOrderID:  buyerOrderID,
		SellerOrderID: sellerOrderID,
		BaseCurrency:  baseCurrency,
		QuoteCurrency: quoteCurrency,
		BaseAmount:    baseAmount,
		QuoteAmount:   quoteAmount,
		Price:         decimal.NewFromFloat(50000.0),
		BuyerFee:      buyerFee,
		SellerFee:     sellerFee,
	}

	settleResp, err := client.SettleTrade(settleReq)
	require.NoError(t, err)
	assert.True(t, settleResp.Success)
	assert.NotEqual(t, uuid.Nil, settleResp.SettlementID)
	assert.True(t, settleResp.BuyerReservationReleased)
	assert.True(t, settleResp.SellerReservationReleased)

	// Verify buyer received BTC and paid USDT
	buyerBTCBalance, err := client.GetBalance(buyerID, baseCurrency)
	require.NoError(t, err)
	assert.True(t, baseAmount.Equal(buyerBTCBalance.TotalBalance))

	buyerUSDTBalance, err := client.GetBalance(buyerID, quoteCurrency)
	require.NoError(t, err)
	expectedBuyerUSDT := decimal.NewFromFloat(30000.0).Sub(quoteAmount).Sub(buyerFee)
	assert.True(t, expectedBuyerUSDT.Equal(buyerUSDTBalance.TotalBalance))

	// Verify seller received USDT and paid BTC
	sellerUSDTBalance, err := client.GetBalance(sellerID, quoteCurrency)
	require.NoError(t, err)
	assert.True(t, quoteAmount.Equal(sellerUSDTBalance.TotalBalance))

	sellerBTCBalance, err := client.GetBalance(sellerID, baseCurrency)
	require.NoError(t, err)
	expectedSellerBTC := decimal.NewFromFloat(1.0).Sub(baseAmount).Sub(sellerFee)
	assert.True(t, expectedSellerBTC.Equal(sellerBTCBalance.TotalBalance))
}

func TestMockWalletClient_FailureScenarios(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger).(*mockWalletClient)

	// Configure client to fail
	client.SetShouldFail(true, ErrWalletServiceDown)

	userID := uuid.New()
	currency := "BTC"

	// Test GetBalance failure
	_, err := client.GetBalance(userID, currency)
	assert.Error(t, err)
	assert.Equal(t, ErrWalletServiceDown, err)

	// Test ReserveBalance failure
	_, err = client.ReserveBalance(&ReserveBalanceRequest{
		UserID:   userID,
		Currency: currency,
		Amount:   decimal.NewFromFloat(1.0),
		OrderID:  uuid.New(),
	})
	assert.Error(t, err)
	assert.Equal(t, ErrWalletServiceDown, err)

	// Test ReleaseBalance failure
	_, err = client.ReleaseBalance(&ReleaseBalanceRequest{
		OrderID: uuid.New(),
	})
	assert.Error(t, err)
	assert.Equal(t, ErrWalletServiceDown, err)

	// Test SettleTrade failure
	_, err = client.SettleTrade(&SettleTradeRequest{
		TradeID: uuid.New(),
	})
	assert.Error(t, err)
	assert.Equal(t, ErrWalletServiceDown, err)
}

func TestMockWalletClient_Close(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client := NewMockWalletClient(logger)

	err := client.Close()
	assert.NoError(t, err)
}
