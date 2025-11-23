package examples

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/mytrader/trade-engine/pkg/clients/wallet"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

// OrderLifecycleExample demonstrates the complete order lifecycle using the wallet client
// This example shows:
// 1. Checking user balance before order placement
// 2. Reserving funds when order is created
// 3. Releasing funds when order is cancelled
// 4. Settling trade when order is matched
func OrderLifecycleExample(client wallet.WalletClient, logger *zap.Logger) error {
	// Example users
	buyerID := uuid.New()
	sellerID := uuid.New()

	// Example order details
	symbol := "BTC/USDT"
	price := decimal.NewFromFloat(50000.0)
	quantity := decimal.NewFromFloat(0.5)
	total := price.Mul(quantity) // 25000 USDT

	logger.Info("Starting order lifecycle example",
		zap.String("buyer_id", buyerID.String()),
		zap.String("seller_id", sellerID.String()),
		zap.String("symbol", symbol),
		zap.String("price", price.String()),
		zap.String("quantity", quantity.String()),
	)

	// Step 1: Check buyer has sufficient USDT balance
	logger.Info("Step 1: Checking buyer balance")
	buyerBalance, err := client.GetBalance(buyerID, "USDT")
	if err != nil {
		if errors.Is(err, wallet.ErrUserNotFound) {
			logger.Error("Buyer not found")
			return err
		}
		logger.Error("Failed to get buyer balance", zap.Error(err))
		return err
	}

	logger.Info("Buyer balance retrieved",
		zap.String("available", buyerBalance.AvailableBalance.String()),
		zap.String("reserved", buyerBalance.ReservedBalance.String()),
		zap.String("total", buyerBalance.TotalBalance.String()),
	)

	if buyerBalance.AvailableBalance.LessThan(total) {
		logger.Warn("Buyer has insufficient balance",
			zap.String("required", total.String()),
			zap.String("available", buyerBalance.AvailableBalance.String()),
		)
		return wallet.ErrInsufficientBalance
	}

	// Step 2: Check seller has sufficient BTC balance
	logger.Info("Step 2: Checking seller balance")
	sellerBalance, err := client.GetBalance(sellerID, "BTC")
	if err != nil {
		logger.Error("Failed to get seller balance", zap.Error(err))
		return err
	}

	logger.Info("Seller balance retrieved",
		zap.String("available", sellerBalance.AvailableBalance.String()),
		zap.String("reserved", sellerBalance.ReservedBalance.String()),
	)

	if sellerBalance.AvailableBalance.LessThan(quantity) {
		logger.Warn("Seller has insufficient balance",
			zap.String("required", quantity.String()),
			zap.String("available", sellerBalance.AvailableBalance.String()),
		)
		return wallet.ErrInsufficientBalance
	}

	// Step 3: Reserve buyer's USDT
	logger.Info("Step 3: Reserving buyer's USDT")
	buyerOrderID := uuid.New()

	buyerReservation, err := client.ReserveBalance(&wallet.ReserveBalanceRequest{
		UserID:   buyerID,
		Currency: "USDT",
		Amount:   total,
		OrderID:  buyerOrderID,
		Reason:   "ORDER_PLACEMENT",
	})
	if err != nil {
		logger.Error("Failed to reserve buyer balance", zap.Error(err))
		return err
	}

	if !buyerReservation.Success {
		logger.Error("Buyer balance reservation failed",
			zap.String("message", buyerReservation.Message),
		)
		return fmt.Errorf("reservation failed: %s", buyerReservation.Message)
	}

	logger.Info("Buyer balance reserved successfully",
		zap.String("reservation_id", buyerReservation.ReservationID.String()),
		zap.String("reserved_amount", total.String()),
	)

	// Step 4: Reserve seller's BTC
	logger.Info("Step 4: Reserving seller's BTC")
	sellerOrderID := uuid.New()

	sellerReservation, err := client.ReserveBalance(&wallet.ReserveBalanceRequest{
		UserID:   sellerID,
		Currency: "BTC",
		Amount:   quantity,
		OrderID:  sellerOrderID,
		Reason:   "ORDER_PLACEMENT",
	})
	if err != nil {
		// Rollback buyer reservation
		logger.Warn("Failed to reserve seller balance, rolling back buyer reservation")
		_ = rollbackReservation(client, buyerReservation.ReservationID, buyerOrderID, logger)
		return err
	}

	if !sellerReservation.Success {
		// Rollback buyer reservation
		logger.Warn("Seller reservation failed, rolling back buyer reservation")
		_ = rollbackReservation(client, buyerReservation.ReservationID, buyerOrderID, logger)
		return fmt.Errorf("seller reservation failed: %s", sellerReservation.Message)
	}

	logger.Info("Seller balance reserved successfully",
		zap.String("reservation_id", sellerReservation.ReservationID.String()),
		zap.String("reserved_amount", quantity.String()),
	)

	// At this point, both orders are in the order book with reserved balances
	// Scenario A: Orders match and trade is executed
	// Scenario B: Order is cancelled before matching

	// For this example, let's assume the orders match
	logger.Info("Step 5: Orders matched, settling trade")

	tradeID := uuid.New()
	buyerFee := total.Mul(decimal.NewFromFloat(0.001))  // 0.1% fee
	sellerFee := quantity.Mul(decimal.NewFromFloat(0.001))

	settlementResp, err := client.SettleTrade(&wallet.SettleTradeRequest{
		TradeID:       tradeID,
		BuyerID:       buyerID,
		SellerID:      sellerID,
		BuyerOrderID:  buyerOrderID,
		SellerOrderID: sellerOrderID,
		BaseCurrency:  "BTC",
		QuoteCurrency: "USDT",
		BaseAmount:    quantity,
		QuoteAmount:   total,
		Price:         price,
		BuyerFee:      buyerFee,
		SellerFee:     sellerFee,
	})
	if err != nil {
		logger.Error("Failed to settle trade", zap.Error(err))
		return err
	}

	if !settlementResp.Success {
		logger.Error("Trade settlement failed",
			zap.String("message", settlementResp.Message),
		)
		return fmt.Errorf("settlement failed: %s", settlementResp.Message)
	}

	logger.Info("Trade settled successfully",
		zap.String("settlement_id", settlementResp.SettlementID.String()),
		zap.Bool("buyer_reservation_released", settlementResp.BuyerReservationReleased),
		zap.Bool("seller_reservation_released", settlementResp.SellerReservationReleased),
	)

	// Step 6: Verify final balances
	logger.Info("Step 6: Verifying final balances")

	finalBuyerBTC, _ := client.GetBalance(buyerID, "BTC")
	finalBuyerUSDT, _ := client.GetBalance(buyerID, "USDT")
	finalSellerBTC, _ := client.GetBalance(sellerID, "BTC")
	finalSellerUSDT, _ := client.GetBalance(sellerID, "USDT")

	logger.Info("Final balances",
		zap.String("buyer_btc", finalBuyerBTC.TotalBalance.String()),
		zap.String("buyer_usdt", finalBuyerUSDT.TotalBalance.String()),
		zap.String("seller_btc", finalSellerBTC.TotalBalance.String()),
		zap.String("seller_usdt", finalSellerUSDT.TotalBalance.String()),
	)

	logger.Info("Order lifecycle completed successfully")
	return nil
}

// OrderCancellationExample demonstrates order cancellation flow
func OrderCancellationExample(client wallet.WalletClient, logger *zap.Logger) error {
	userID := uuid.New()
	orderID := uuid.New()
	amount := decimal.NewFromFloat(1000.0)

	logger.Info("Starting order cancellation example",
		zap.String("user_id", userID.String()),
		zap.String("order_id", orderID.String()),
	)

	// Step 1: Reserve balance for order
	logger.Info("Step 1: Reserving balance for order")

	reservationResp, err := client.ReserveBalance(&wallet.ReserveBalanceRequest{
		UserID:   userID,
		Currency: "USDT",
		Amount:   amount,
		OrderID:  orderID,
		Reason:   "ORDER_PLACEMENT",
	})
	if err != nil {
		logger.Error("Failed to reserve balance", zap.Error(err))
		return err
	}

	logger.Info("Balance reserved",
		zap.String("reservation_id", reservationResp.ReservationID.String()),
	)

	// Step 2: User cancels order
	logger.Info("Step 2: User cancels order, releasing balance")

	releaseResp, err := client.ReleaseBalance(&wallet.ReleaseBalanceRequest{
		ReservationID: reservationResp.ReservationID,
		OrderID:       orderID,
		Reason:        "ORDER_CANCELLED",
	})
	if err != nil {
		logger.Error("Failed to release balance", zap.Error(err))
		return err
	}

	if !releaseResp.Success {
		logger.Error("Balance release failed",
			zap.String("message", releaseResp.Message),
		)
		return fmt.Errorf("release failed: %s", releaseResp.Message)
	}

	logger.Info("Balance released successfully",
		zap.String("released_amount", releaseResp.ReleasedAmount.String()),
	)

	// Step 3: Verify balance is restored
	logger.Info("Step 3: Verifying balance restored")

	finalBalance, err := client.GetBalance(userID, "USDT")
	if err != nil {
		logger.Error("Failed to get final balance", zap.Error(err))
		return err
	}

	logger.Info("Final balance verified",
		zap.String("available", finalBalance.AvailableBalance.String()),
		zap.String("reserved", finalBalance.ReservedBalance.String()),
	)

	logger.Info("Order cancellation completed successfully")
	return nil
}

// rollbackReservation is a helper function to release a reservation in case of errors
func rollbackReservation(client wallet.WalletClient, reservationID, orderID uuid.UUID, logger *zap.Logger) error {
	logger.Info("Rolling back reservation",
		zap.String("reservation_id", reservationID.String()),
	)

	releaseResp, err := client.ReleaseBalance(&wallet.ReleaseBalanceRequest{
		ReservationID: reservationID,
		OrderID:       orderID,
		Reason:        "ROLLBACK",
	})
	if err != nil {
		logger.Error("Failed to rollback reservation", zap.Error(err))
		return err
	}

	if releaseResp.Success {
		logger.Info("Reservation rolled back successfully",
			zap.String("released_amount", releaseResp.ReleasedAmount.String()),
		)
	}

	return nil
}

// ErrorHandlingExample demonstrates proper error handling
func ErrorHandlingExample(client wallet.WalletClient, logger *zap.Logger) {
	userID := uuid.New()

	// Attempt to get balance
	balance, err := client.GetBalance(userID, "BTC")
	if err != nil {
		// Handle specific errors
		switch {
		case errors.Is(err, wallet.ErrUserNotFound):
			logger.Warn("User does not exist", zap.String("user_id", userID.String()))
			// Create user or return error to API caller

		case errors.Is(err, wallet.ErrWalletServiceDown):
			logger.Error("Wallet service is unavailable")
			// Return 503 Service Unavailable to API caller
			// Trigger alert/notification

		case errors.Is(err, wallet.ErrCircuitOpen):
			logger.Error("Circuit breaker is open, wallet service is degraded")
			// Return 503 Service Unavailable
			// Use fallback logic if available

		case errors.Is(err, wallet.ErrTimeout):
			logger.Error("Request to wallet service timed out")
			// Return 504 Gateway Timeout
			// Consider retrying (if not already retried)

		default:
			logger.Error("Unexpected error getting balance", zap.Error(err))
			// Return 500 Internal Server Error
		}
		return
	}

	logger.Info("Balance retrieved successfully",
		zap.String("currency", balance.Currency),
		zap.String("available", balance.AvailableBalance.String()),
	)
}
