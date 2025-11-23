package domain

import (
	"testing"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOrderSide_IsValid(t *testing.T) {
	tests := []struct {
		name  string
		side  OrderSide
		valid bool
	}{
		{"Valid BUY", OrderSideBuy, true},
		{"Valid SELL", OrderSideSell, true},
		{"Invalid empty", OrderSide(""), false},
		{"Invalid HOLD", OrderSide("HOLD"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.valid, tt.side.IsValid())
		})
	}
}

func TestOrderType_IsValid(t *testing.T) {
	tests := []struct {
		name      string
		orderType OrderType
		valid     bool
	}{
		{"Valid MARKET", OrderTypeMarket, true},
		{"Valid LIMIT", OrderTypeLimit, true},
		{"Valid STOP", OrderTypeStop, true},
		{"Invalid empty", OrderType(""), false},
		{"Invalid OCO", OrderType("OCO"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.valid, tt.orderType.IsValid())
		})
	}
}

func TestOrderStatus_IsValid(t *testing.T) {
	tests := []struct {
		name   string
		status OrderStatus
		valid  bool
	}{
		{"Valid PENDING", OrderStatusPending, true},
		{"Valid OPEN", OrderStatusOpen, true},
		{"Valid FILLED", OrderStatusFilled, true},
		{"Valid CANCELLED", OrderStatusCancelled, true},
		{"Invalid UNKNOWN", OrderStatus("UNKNOWN"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.valid, tt.status.IsValid())
		})
	}
}

func TestOrderStatus_IsFinal(t *testing.T) {
	tests := []struct {
		name   string
		status OrderStatus
		final  bool
	}{
		{"FILLED is final", OrderStatusFilled, true},
		{"CANCELLED is final", OrderStatusCancelled, true},
		{"REJECTED is final", OrderStatusRejected, true},
		{"OPEN is not final", OrderStatusOpen, false},
		{"PENDING is not final", OrderStatusPending, false},
		{"PARTIALLY_FILLED is not final", OrderStatusPartiallyFilled, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.final, tt.status.IsFinal())
		})
	}
}

func TestTimeInForce_IsValid(t *testing.T) {
	tests := []struct {
		name  string
		tif   TimeInForce
		valid bool
	}{
		{"Valid GTC", TimeInForceGTC, true},
		{"Valid IOC", TimeInForceIOC, true},
		{"Valid FOK", TimeInForceFOK, true},
		{"Invalid DAY", TimeInForce("DAY"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.valid, tt.tif.IsValid())
		})
	}
}

func TestOrder_Validate(t *testing.T) {
	price := decimal.NewFromFloat(50000.0)
	stopPrice := decimal.NewFromFloat(49000.0)

	tests := []struct {
		name    string
		order   *Order
		wantErr error
	}{
		{
			name: "Valid limit order",
			order: &Order{
				ID:          uuid.New(),
				UserID:      uuid.New(),
				Symbol:      "BTC/USDT",
				Side:        OrderSideBuy,
				Type:        OrderTypeLimit,
				Status:      OrderStatusPending,
				Quantity:    decimal.NewFromFloat(1.5),
				Price:       &price,
				TimeInForce: TimeInForceGTC,
			},
			wantErr: nil,
		},
		{
			name: "Valid market order",
			order: &Order{
				ID:          uuid.New(),
				UserID:      uuid.New(),
				Symbol:      "BTC/USDT",
				Side:        OrderSideSell,
				Type:        OrderTypeMarket,
				Status:      OrderStatusPending,
				Quantity:    decimal.NewFromFloat(0.5),
				TimeInForce: TimeInForceIOC,
			},
			wantErr: nil,
		},
		{
			name: "Invalid quantity (zero)",
			order: &Order{
				Symbol:      "BTC/USDT",
				Side:        OrderSideBuy,
				Type:        OrderTypeLimit,
				Status:      OrderStatusPending,
				Quantity:    decimal.Zero,
				Price:       &price,
				TimeInForce: TimeInForceGTC,
			},
			wantErr: ErrInvalidQuantity,
		},
		{
			name: "Invalid quantity (negative)",
			order: &Order{
				Symbol:      "BTC/USDT",
				Side:        OrderSideBuy,
				Type:        OrderTypeLimit,
				Status:      OrderStatusPending,
				Quantity:    decimal.NewFromFloat(-1.0),
				Price:       &price,
				TimeInForce: TimeInForceGTC,
			},
			wantErr: ErrInvalidQuantity,
		},
		{
			name: "Invalid side",
			order: &Order{
				Symbol:      "BTC/USDT",
				Side:        OrderSide("INVALID"),
				Type:        OrderTypeLimit,
				Status:      OrderStatusPending,
				Quantity:    decimal.NewFromFloat(1.0),
				Price:       &price,
				TimeInForce: TimeInForceGTC,
			},
			wantErr: ErrInvalidSide,
		},
		{
			name: "Limit order without price",
			order: &Order{
				Symbol:      "BTC/USDT",
				Side:        OrderSideBuy,
				Type:        OrderTypeLimit,
				Status:      OrderStatusPending,
				Quantity:    decimal.NewFromFloat(1.0),
				TimeInForce: TimeInForceGTC,
			},
			wantErr: ErrLimitOrderNoPrice,
		},
		{
			name: "Market order with price",
			order: &Order{
				Symbol:      "BTC/USDT",
				Side:        OrderSideBuy,
				Type:        OrderTypeMarket,
				Status:      OrderStatusPending,
				Quantity:    decimal.NewFromFloat(1.0),
				Price:       &price,
				TimeInForce: TimeInForceIOC,
			},
			wantErr: ErrMarketOrderPrice,
		},
		{
			name: "Stop order without stop price",
			order: &Order{
				Symbol:      "BTC/USDT",
				Side:        OrderSideBuy,
				Type:        OrderTypeStop,
				Status:      OrderStatusPending,
				Quantity:    decimal.NewFromFloat(1.0),
				TimeInForce: TimeInForceGTC,
			},
			wantErr: ErrStopOrderNoPrice,
		},
		{
			name: "Valid stop order",
			order: &Order{
				Symbol:      "BTC/USDT",
				Side:        OrderSideBuy,
				Type:        OrderTypeStop,
				Status:      OrderStatusPending,
				Quantity:    decimal.NewFromFloat(1.0),
				StopPrice:   &stopPrice,
				TimeInForce: TimeInForceGTC,
			},
			wantErr: nil,
		},
		{
			name: "Invalid symbol (too short)",
			order: &Order{
				Symbol:      "BT",
				Side:        OrderSideBuy,
				Type:        OrderTypeLimit,
				Status:      OrderStatusPending,
				Quantity:    decimal.NewFromFloat(1.0),
				Price:       &price,
				TimeInForce: TimeInForceGTC,
			},
			wantErr: ErrInvalidSymbol,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.order.Validate()
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestOrder_RemainingQuantity(t *testing.T) {
	order := &Order{
		Quantity:       decimal.NewFromFloat(10.0),
		FilledQuantity: decimal.NewFromFloat(3.5),
	}

	remaining := order.RemainingQuantity()
	assert.True(t, remaining.Equal(decimal.NewFromFloat(6.5)))
}

func TestOrder_IsFilled(t *testing.T) {
	tests := []struct {
		name     string
		quantity string
		filled   string
		want     bool
	}{
		{"Fully filled", "10.0", "10.0", true},
		{"Partially filled", "10.0", "5.0", false},
		{"Not filled", "10.0", "0.0", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order := &Order{
				Quantity:       decimal.RequireFromString(tt.quantity),
				FilledQuantity: decimal.RequireFromString(tt.filled),
			}
			assert.Equal(t, tt.want, order.IsFilled())
		})
	}
}

func TestOrder_IsPartiallyFilled(t *testing.T) {
	tests := []struct {
		name     string
		quantity string
		filled   string
		want     bool
	}{
		{"Fully filled", "10.0", "10.0", false},
		{"Partially filled", "10.0", "5.0", true},
		{"Not filled", "10.0", "0.0", false},
		{"Partially filled (small)", "10.0", "0.1", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order := &Order{
				Quantity:       decimal.RequireFromString(tt.quantity),
				FilledQuantity: decimal.RequireFromString(tt.filled),
			}
			assert.Equal(t, tt.want, order.IsPartiallyFilled())
		})
	}
}

func TestOrder_CanBeCancelled(t *testing.T) {
	tests := []struct {
		name   string
		status OrderStatus
		want   bool
	}{
		{"PENDING can be cancelled", OrderStatusPending, true},
		{"OPEN can be cancelled", OrderStatusOpen, true},
		{"PARTIALLY_FILLED can be cancelled", OrderStatusPartiallyFilled, true},
		{"FILLED cannot be cancelled", OrderStatusFilled, false},
		{"CANCELLED cannot be cancelled", OrderStatusCancelled, false},
		{"REJECTED cannot be cancelled", OrderStatusRejected, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order := &Order{Status: tt.status}
			assert.Equal(t, tt.want, order.CanBeCancelled())
		})
	}
}

func TestOrder_Fill(t *testing.T) {
	t.Run("Partial fill", func(t *testing.T) {
		order := &Order{
			Quantity:       decimal.NewFromFloat(10.0),
			FilledQuantity: decimal.Zero,
			Status:         OrderStatusOpen,
		}

		err := order.Fill(decimal.NewFromFloat(3.0))
		require.NoError(t, err)

		assert.True(t, order.FilledQuantity.Equal(decimal.NewFromFloat(3.0)))
		assert.Equal(t, OrderStatusPartiallyFilled, order.Status)
		assert.Nil(t, order.FilledAt)
	})

	t.Run("Complete fill", func(t *testing.T) {
		order := &Order{
			Quantity:       decimal.NewFromFloat(10.0),
			FilledQuantity: decimal.NewFromFloat(7.0),
			Status:         OrderStatusPartiallyFilled,
		}

		err := order.Fill(decimal.NewFromFloat(3.0))
		require.NoError(t, err)

		assert.True(t, order.FilledQuantity.Equal(decimal.NewFromFloat(10.0)))
		assert.Equal(t, OrderStatusFilled, order.Status)
		assert.NotNil(t, order.FilledAt)
	})

	t.Run("Overfill rejected", func(t *testing.T) {
		order := &Order{
			Quantity:       decimal.NewFromFloat(10.0),
			FilledQuantity: decimal.NewFromFloat(9.0),
			Status:         OrderStatusPartiallyFilled,
		}

		err := order.Fill(decimal.NewFromFloat(2.0))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "exceeds order quantity")
	})

	t.Run("Zero fill rejected", func(t *testing.T) {
		order := &Order{
			Quantity:       decimal.NewFromFloat(10.0),
			FilledQuantity: decimal.Zero,
			Status:         OrderStatusOpen,
		}

		err := order.Fill(decimal.Zero)
		require.Error(t, err)
	})
}

func TestOrder_Cancel(t *testing.T) {
	t.Run("Cancel open order", func(t *testing.T) {
		order := &Order{
			Status: OrderStatusOpen,
		}

		err := order.Cancel()
		require.NoError(t, err)

		assert.Equal(t, OrderStatusCancelled, order.Status)
		assert.NotNil(t, order.CancelledAt)
	})

	t.Run("Cannot cancel filled order", func(t *testing.T) {
		order := &Order{
			Status: OrderStatusFilled,
		}

		err := order.Cancel()
		require.ErrorIs(t, err, ErrOrderNotCancellable)
	})
}

func TestOrder_GetRequiredBalance(t *testing.T) {
	price := decimal.NewFromFloat(50000.0)

	tests := []struct {
		name             string
		order            *Order
		wantCurrency     string
		wantAmountString string
	}{
		{
			name: "Buy limit order needs quote currency",
			order: &Order{
				Symbol:   "BTC/USDT",
				Side:     OrderSideBuy,
				Type:     OrderTypeLimit,
				Quantity: decimal.NewFromFloat(2.0),
				Price:    &price,
			},
			wantCurrency:     "USDT",
			wantAmountString: "100000",
		},
		{
			name: "Sell order needs base currency",
			order: &Order{
				Symbol:   "BTC/USDT",
				Side:     OrderSideSell,
				Type:     OrderTypeLimit,
				Quantity: decimal.NewFromFloat(1.5),
				Price:    &price,
			},
			wantCurrency:     "BTC",
			wantAmountString: "1.5",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			currency, amount := tt.order.GetRequiredBalance()
			assert.Equal(t, tt.wantCurrency, currency)
			assert.Equal(t, tt.wantAmountString, amount.String())
		})
	}
}

func TestOrder_GetBaseCurrency(t *testing.T) {
	tests := []struct {
		symbol string
		want   string
	}{
		{"BTC/USDT", "BTC"},
		{"ETH/BTC", "ETH"},
		{"BTC-USDT", "BTC"},
		{"BTC_USDT", "BTC"},
		{"BTCUSDT", "BTC"},
	}

	for _, tt := range tests {
		t.Run(tt.symbol, func(t *testing.T) {
			order := &Order{Symbol: tt.symbol}
			assert.Equal(t, tt.want, order.GetBaseCurrency())
		})
	}
}

func TestOrder_GetQuoteCurrency(t *testing.T) {
	tests := []struct {
		symbol string
		want   string
	}{
		{"BTC/USDT", "USDT"},
		{"ETH/BTC", "BTC"},
		{"BTC-USDT", "USDT"},
		{"BTC_USDT", "USDT"},
		{"BTCUSDT", "USDT"},
	}

	for _, tt := range tests {
		t.Run(tt.symbol, func(t *testing.T) {
			order := &Order{Symbol: tt.symbol}
			assert.Equal(t, tt.want, order.GetQuoteCurrency())
		})
	}
}
