# QA Phase 4: EPIC 3 Trading Engine & Market Data - Complete Test Execution Plan

**Document:** QA_PHASE4_TEST_EXECUTION_PLAN.md
**Created:** 2025-11-30
**Scope:** All 44 test cases across 6 phases
**Status:** READY FOR EXECUTION

---

## Executive Summary

This document provides comprehensive test execution for the Trading Engine & Market Data feature set (EPIC 3), covering:
- PHASE 1: Market Data (12 tests)
- PHASE 2: Order Placement (8 tests)
- PHASE 3: Order Management (8 tests)
- PHASE 4: History & Analytics (8 tests)
- PHASE 5: Advanced Features (8 tests)
- PHASE 6: Performance & WebSocket (5+ tests)

**Total Test Cases:** 44+
**Expected Duration:** 4-6 hours (depends on service startup time)
**Success Criteria:** 80%+ pass rate, no critical/blocking bugs

---

## PHASE 1: Market Data Tests (12 Tests)

### Purpose
Verify that all market data endpoints return accurate, real-time data in proper format.

### Test Environment Setup
```
Service: Trade Engine (Go)
Port: 8001
Database: PostgreSQL (must be pre-populated with market data)
Cache: Redis (for real-time updates)
```

### TC-101: Order Book - Real-time display (REST API)

**Feature:** Story 3.1 - Market Data API
**Type:** REST API / Unit
**Priority:** P0 (Critical)

**Preconditions:**
- Trade Engine running on http://localhost:8001
- PostgreSQL populated with order data
- Redis running

**Steps:**
1. GET /api/v1/orderbook/BTC-USDT
2. Verify response status 200
3. Check response structure contains: symbol, bids[], asks[]
4. Validate bids sorted descending (highest price first)
5. Validate asks sorted ascending (lowest price first)
6. Verify bid-ask spread exists (best bid < best ask)

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-USDT",
    "bids": [
      {"price": "42500.00", "quantity": "0.5"},
      {"price": "42400.00", "quantity": "1.0"}
    ],
    "asks": [
      {"price": "42600.00", "quantity": "0.3"},
      {"price": "42700.00", "quantity": "2.0"}
    ],
    "timestamp": 1700000000,
    "sequence": 12345
  }
}
```

**Actual Result:** [To be filled during testing]

**Status:** Not Tested

---

### TC-102: Market Ticker - Single symbol

**Feature:** Story 3.2 - Ticker Display
**Type:** REST API / Unit
**Priority:** P0

**Steps:**
1. GET /api/v1/ticker/BTC-USDT
2. Verify response contains: last_price, bid, ask, high, low, open
3. Validate last_price >= bid and <= ask
4. Verify all prices are positive decimals

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-USDT",
    "last_price": "42550.00",
    "bid": "42540.00",
    "ask": "42560.00",
    "high": "43000.00",
    "low": "41800.00",
    "open": "42000.00",
    "volume": "1250.5"
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-103: 24h Statistics - OHLCV calculations

**Feature:** Story 3.2 - Market Statistics
**Type:** REST API / Unit
**Priority:** P1

**Steps:**
1. GET /api/v1/statistics/BTC-USDT?interval=24h
2. Verify response contains: open, high, low, close, volume
3. Validate: high >= close >= low, high >= open >= low
4. Verify volume >= 0

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-USDT",
    "stats_24h": {
      "open": "42000.00",
      "high": "43000.00",
      "low": "41800.00",
      "close": "42550.00",
      "volume": "1250.5",
      "trades": 523
    }
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-104: Recent Trades - Live feed

**Feature:** Story 3.3 - Recent Trades
**Type:** REST API / Unit
**Priority:** P1

**Steps:**
1. GET /api/v1/trades/recent/BTC-USDT
2. Verify trades array returned (not empty if data exists)
3. Validate each trade has: id, price, quantity, side, timestamp
4. Verify trades sorted by timestamp (newest first)

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-USDT",
    "trades": [
      {
        "id": "trade-123",
        "price": "42550.00",
        "quantity": "0.5",
        "side": "BUY",
        "timestamp": 1700000100,
        "buyer_fee": "10.625",
        "seller_fee": "10.625"
      }
    ],
    "pagination": {
      "total": 523,
      "limit": 100,
      "offset": 0
    }
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-105: Recent Trades - Pagination

**Feature:** Story 3.3 - Trade Pagination
**Type:** REST API / Unit
**Priority:** P2

**Steps:**
1. GET /api/v1/trades/recent/BTC-USDT?limit=10&offset=0
2. Verify pagination metadata: total, limit, offset
3. Validate returned items <= limit
4. Request offset=10 and verify different trades returned

**Expected Result:**
- First page: 10 trades, offset 0
- Second page: 10 trades, offset 10 (different items)

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-106: Candle History - OHLCV per timeframe

**Feature:** Story 3.4 - Candlestick Charts
**Type:** REST API / Unit
**Priority:** P1

**Steps:**
1. GET /api/v1/candles/BTC-USDT?timeframe=1h&start=1700000000&end=1700100000
2. Verify candles array with OHLCV data
3. Validate each candle has: time, open, high, low, close, volume
4. Verify OHLC logic: high >= close,open and low <= close,open

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-USDT",
    "timeframe": "1h",
    "candles": [
      {
        "time": 1700000000,
        "open": "42000.00",
        "high": "42500.00",
        "low": "41900.00",
        "close": "42450.00",
        "volume": "125.5"
      }
    ]
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-107: Symbol List - Metadata and trading rules

**Feature:** Story 3.1 - Trading Pairs
**Type:** REST API / Unit
**Priority:** P1

**Steps:**
1. GET /api/v1/symbols
2. Verify symbols array returned
3. Validate each symbol has: symbol, base_asset, quote_asset, min_order_qty, max_order_qty
4. Verify BTC-USDT, ETH-USDT, USDT-TRY exist
5. Validate min_qty < max_qty for all pairs

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "symbols": [
      {
        "symbol": "BTC-USDT",
        "base_asset": "BTC",
        "quote_asset": "USDT",
        "min_order_quantity": "0.001",
        "max_order_quantity": "1000000",
        "step_size": "0.001",
        "maker_fee": "0.001",
        "taker_fee": "0.002"
      }
    ]
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-108: Order Book - WebSocket real-time updates

**Feature:** Story 3.1 - WebSocket Market Data
**Type:** WebSocket / Integration
**Priority:** P0

**Steps:**
1. Connect to ws://localhost:8001/ws
2. Subscribe to "orderbook:BTC-USDT"
3. Verify initial orderbook snapshot
4. Verify delta updates arrive within 500ms
5. Verify order book remains sorted after updates
6. Disconnect and reconnect, verify re-subscription

**Expected Result:**
- WebSocket connects successfully
- Receives initial snapshot with full orderbook
- Receives delta updates for new orders
- All deltas properly applied
- Re-subscription works

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-109: Depth Chart - Bid/ask aggregation

**Feature:** Story 3.2 - Market Depth
**Type:** REST API / Unit
**Priority:** P2

**Steps:**
1. GET /api/v1/orderbook/BTC-USDT/depth?limit=20
2. Verify bids and asks arrays
3. Validate bids aggregated by price level
4. Validate asks aggregated by price level
5. Verify cumulative quantity calculated correctly

**Expected Result:**
```json
{
  "data": {
    "bids": [
      {"price": "42500", "quantity": "2.5", "cumulative_qty": "2.5"},
      {"price": "42400", "quantity": "1.0", "cumulative_qty": "3.5"}
    ],
    "asks": [...]
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-110: Ticker WebSocket - Delta updates

**Feature:** Story 3.2 - Real-time Ticker
**Type:** WebSocket / Integration
**Priority:** P1

**Steps:**
1. Subscribe to "ticker:BTC-USDT" via WebSocket
2. Verify initial ticker snapshot
3. Verify delta updates arrive (price, volume changes)
4. Verify updates are fast (< 100ms between messages)
5. Verify no data loss over 1 minute

**Expected Result:**
- Initial snapshot with complete ticker
- Regular delta updates (5-10 per second)
- Consistent pricing across messages
- No data loss

**Actual Result:** [To be filled]

**Status:** Not Tested

---

## PHASE 2: Order Placement Tests (8 Tests)

### Purpose
Verify order validation, placement, and balance enforcement.

### TC-201: Market Order - Buy BTC

**Feature:** Story 3.5 - Order Placement
**Type:** API Integration
**Priority:** P0

**Preconditions:**
- User authenticated with valid JWT token
- User has sufficient USDT balance
- Market is open

**Steps:**
1. POST /api/v1/orders with:
   ```json
   {
     "symbol": "BTC-USDT",
     "side": "BUY",
     "type": "MARKET",
     "quantity": "0.1"
   }
   ```
2. Verify response status 201
3. Verify order ID generated
4. Verify status is FILLED or PENDING
5. Verify trades array if status FILLED

**Expected Result:**
```json
{
  "order": {
    "id": "order-123",
    "symbol": "BTC-USDT",
    "side": "BUY",
    "type": "MARKET",
    "status": "FILLED",
    "quantity": "0.1",
    "filled_quantity": "0.1"
  },
  "trades": [
    {
      "id": "trade-456",
      "price": "42550.00",
      "quantity": "0.1",
      ...
    }
  ]
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-202: Market Order - Sell BTC

**Feature:** Story 3.5 - Order Placement
**Type:** API Integration
**Priority:** P0

**Preconditions:**
- User has 0.1+ BTC balance
- Market is open

**Steps:**
1. POST /api/v1/orders with:
   ```json
   {
     "symbol": "BTC-USDT",
     "side": "SELL",
     "type": "MARKET",
     "quantity": "0.05"
   }
   ```
2. Verify order created and status FILLED
3. Verify BTC balance decreased
4. Verify USDT balance increased

**Expected Result:**
- Order successfully placed and filled
- Balances updated correctly

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-203: Limit Order - Buy with pending state

**Feature:** Story 3.5 - Limit Orders
**Type:** API Integration
**Priority:** P0

**Steps:**
1. POST /api/v1/orders with:
   ```json
   {
     "symbol": "BTC-USDT",
     "side": "BUY",
     "type": "LIMIT",
     "quantity": "0.1",
     "price": "30000.00",
     "time_in_force": "GTC"
   }
   ```
2. Verify status is PENDING
3. Verify order remains open
4. Verify balance locked

**Expected Result:**
- Order status: PENDING
- Price field populated
- Amount locked in user balance

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-204: Limit Order - Sell with pending state

**Feature:** Story 3.5 - Limit Orders
**Type:** API Integration
**Priority:** P0

**Steps:**
1. Create SELL limit order at higher price
2. Verify status PENDING
3. Verify quantity locked

**Expected Result:**
- Order status: PENDING
- Quantity locked in user balance

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-205: Order Type Validation - Invalid types

**Feature:** Story 3.5 - Input Validation
**Type:** API Unit
**Priority:** P1

**Steps:**
1. POST /api/v1/orders with type="INVALID"
2. Verify status 400
3. Verify error message in response

**Expected Result:**
```json
{
  "error": "Invalid order type",
  "code": "VALIDATION_ERROR"
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-206: Price Validation - Negative prices rejected

**Feature:** Story 3.5 - Input Validation
**Type:** API Unit
**Priority:** P1

**Steps:**
1. POST /api/v1/orders with price="-100"
2. Verify status 400
3. Verify error message

**Expected Result:**
- Status 400
- Error indicates invalid price

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-207: Quantity Validation - Zero/negative rejected

**Feature:** Story 3.5 - Input Validation
**Type:** API Unit
**Priority:** P1

**Steps:**
1. POST /api/v1/orders with quantity="0"
2. POST /api/v1/orders with quantity="-1"
3. Verify both return 400

**Expected Result:**
- Status 400 for both requests
- Error message about quantity

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-208: Balance Check - Insufficient funds prevented

**Feature:** Story 3.5 - Balance Validation
**Type:** API Integration
**Priority:** P0

**Steps:**
1. Get user balance (e.g., 100 USDT)
2. POST /api/v1/orders to buy 999 BTC
3. Verify status 400 or 422
4. Verify error mentions insufficient balance

**Expected Result:**
- Status 400 or 422
- Error message: "Insufficient balance" or similar

**Actual Result:** [To be filled]

**Status:** Not Tested

---

## PHASE 3: Order Management Tests (8 Tests)

### Purpose
Verify order retrieval, cancellation, and state management.

### TC-301: Open Orders - Fetch user's active orders

**Feature:** Story 3.6 - Order Management
**Type:** API Integration
**Priority:** P0

**Steps:**
1. Create 2 limit orders (BUY, SELL)
2. GET /api/v1/orders/open
3. Verify both orders returned
4. Verify status is PENDING or PARTIALLY_FILLED

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {"id": "...", "status": "PENDING", ...},
      {"id": "...", "status": "PENDING", ...}
    ]
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-302: Open Orders - Real-time updates via WebSocket

**Feature:** Story 3.6 - Real-time Orders
**Type:** WebSocket / Integration
**Priority:** P1

**Steps:**
1. Subscribe to "orders:user" via WebSocket
2. Create new order via REST API
3. Verify WebSocket receives order.created event
4. Cancel order via REST
5. Verify WebSocket receives order.cancelled event

**Expected Result:**
- WebSocket events received within 100ms of API call
- Event includes order details
- State transitions logged correctly

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-303: Cancel Order - Valid cancellation

**Feature:** Story 3.6 - Order Cancellation
**Type:** API Integration
**Priority:** P0

**Steps:**
1. Create pending limit order
2. DELETE /api/v1/orders/{order_id}
3. Verify status 200 or 204
4. Verify order status is CANCELLED
5. Verify balance released

**Expected Result:**
- Status 200/204
- Order marked CANCELLED
- Balance available again

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-304: Cancel Order - Fund release verification

**Feature:** Story 3.6 - Balance Release
**Type:** API Integration
**Priority:** P0

**Steps:**
1. Get initial USDT balance
2. Create BUY limit order for 0.1 BTC at 40000 (4000 USDT locked)
3. Verify balance reduced by 4000
4. Cancel order
5. Verify balance restored

**Expected Result:**
- Balance locked during order
- Balance released after cancellation

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-305: Order History - Filtering by status

**Feature:** Story 3.6 - Order History
**Type:** API Integration
**Priority:** P1

**Steps:**
1. GET /api/v1/orders/history?status=FILLED
2. Verify all returned orders have status FILLED
3. GET /api/v1/orders/history?status=CANCELLED
4. Verify all returned orders have status CANCELLED

**Expected Result:**
- Only matching status orders returned
- Pagination info included

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-306: Order History - Pagination

**Feature:** Story 3.6 - Order Pagination
**Type:** API Unit
**Priority:** P2

**Steps:**
1. GET /api/v1/orders/history?limit=10&offset=0
2. Verify 10 or fewer orders returned
3. Verify pagination metadata
4. GET with offset=10
5. Verify different orders returned

**Expected Result:**
- Pagination working correctly
- No duplicate orders between pages

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-307: Order Detail - Single order fetch

**Feature:** Story 3.6 - Order Details
**Type:** API Unit
**Priority:** P2

**Steps:**
1. Create order (note ID)
2. GET /api/v1/orders/{order_id}
3. Verify all order details returned
4. Verify matches original creation request

**Expected Result:**
```json
{
  "data": {
    "id": "order-123",
    "symbol": "BTC-USDT",
    "side": "BUY",
    "type": "LIMIT",
    "status": "PENDING",
    "quantity": "0.1",
    "filled_quantity": "0",
    "price": "40000.00",
    ...
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-308: Order Lock - Balance locked during pending

**Feature:** Story 3.6 - Balance Management
**Type:** API Integration
**Priority:** P0

**Steps:**
1. Get initial balance (e.g., 10000 USDT)
2. Create BUY limit order 0.1 BTC @ 40000 USDT
3. GET /api/v1/wallet/balance
4. Verify available < 10000 (4000 locked)
5. Cancel order
6. Verify balance restored

**Expected Result:**
- Available balance = total - locked
- Locked amount released on cancel

**Actual Result:** [To be filled]

**Status:** Not Tested

---

## PHASE 4: History & Analytics Tests (8 Tests)

### Purpose
Verify trade history retrieval, P&L calculations, and settlements.

### TC-401: Trade History - Fetch all user trades

**Feature:** Story 3.7 - Trade History
**Type:** API Integration
**Priority:** P1

**Steps:**
1. GET /api/v1/trades/history
2. Verify trades array returned
3. Verify each trade has: id, symbol, price, quantity, side, executed_at
4. Verify trades sorted by executed_at (newest first)

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "trade-123",
        "symbol": "BTC-USDT",
        "price": "42550.00",
        "quantity": "0.1",
        "side": "BUY",
        "executed_at": "2025-11-30T10:30:00Z"
      }
    ]
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-402: Trade History - Filter by symbol

**Feature:** Story 3.7 - Trade Filtering
**Type:** API Unit
**Priority:** P2

**Steps:**
1. GET /api/v1/trades/history?symbol=BTC-USDT
2. Verify all trades have symbol=BTC-USDT
3. GET with symbol=ETH-USDT
4. Verify no BTC trades returned

**Expected Result:**
- Only matching symbol trades returned

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-403: Trade History - Date range filtering

**Feature:** Story 3.7 - Date Filtering
**Type:** API Unit
**Priority:** P2

**Steps:**
1. GET /api/v1/trades/history?start=1700000000&end=1700100000
2. Verify all trades within date range
3. Verify timestamps between start and end

**Expected Result:**
- Only trades in date range returned

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-404: P&L Calculation - Profit/loss per trade

**Feature:** Story 3.7 - P&L Analytics
**Type:** API Integration
**Priority:** P2

**Steps:**
1. Buy 0.1 BTC @ 40000 USDT (cost: 4000)
2. Sell 0.05 BTC @ 42000 USDT (revenue: 2100)
3. Sell 0.05 BTC @ 43000 USDT (revenue: 2150)
4. GET /api/v1/trades/pnl
5. Verify P&L calculation: (2100+2150) - 4000 = 250

**Expected Result:**
```json
{
  "data": {
    "total_pnl": "250.00",
    "pnl_percent": "6.25%",
    "trades": [...]
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-405: P&L Aggregation - Total P&L

**Feature:** Story 3.7 - P&L Analytics
**Type:** API Integration
**Priority:** P2

**Steps:**
1. Ensure multiple closed positions
2. GET /api/v1/trades/pnl/summary
3. Verify total_pnl = sum of all trade P&Ls
4. Verify pnl_percent calculated

**Expected Result:**
- Total P&L matches sum
- Percentage calculated correctly

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-406: Export History - CSV format

**Feature:** Story 3.7 - Export
**Type:** API Integration
**Priority:** P2

**Steps:**
1. GET /api/v1/trades/history/export?format=csv
2. Verify response is CSV format
3. Verify headers and data present
4. Verify all trades included

**Expected Result:**
```
id,symbol,price,quantity,side,executed_at,fee
trade-1,BTC-USDT,42550.00,0.1,BUY,2025-11-30T10:00:00Z,10.625
...
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-407: Export History - JSON format

**Feature:** Story 3.7 - Export
**Type:** API Integration
**Priority:** P2

**Steps:**
1. GET /api/v1/trades/history/export?format=json
2. Verify response is JSON
3. Verify array of trades

**Expected Result:**
```json
[
  {"id": "...", "symbol": "...", ...},
  ...
]
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-408: Settlement Status - Trade confirmation

**Feature:** Story 3.7 - Settlement
**Type:** API Integration
**Priority:** P1

**Steps:**
1. Create and execute market order
2. GET /api/v1/trades/{trade_id}/settlement
3. Verify settlement_status in (PENDING, CONFIRMED, FAILED)
4. Verify settlement_time populated

**Expected Result:**
```json
{
  "data": {
    "trade_id": "trade-123",
    "settlement_status": "CONFIRMED",
    "settlement_time": "2025-11-30T10:00:05Z"
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

## PHASE 5: Advanced Features Tests (8 Tests)

### Purpose
Verify technical indicators, price alerts, and trading signals.

### TC-501: Price Alerts - Create alert

**Feature:** Story 3.8 - Price Alerts
**Type:** API Integration
**Priority:** P1

**Steps:**
1. POST /api/v1/alerts with:
   ```json
   {
     "symbol": "BTC-USDT",
     "alert_type": "above",
     "target_price": "45000.00"
   }
   ```
2. Verify status 201
3. Verify alert created with is_active=true

**Expected Result:**
```json
{
  "data": {
    "id": "alert-123",
    "symbol": "BTC-USDT",
    "alert_type": "above",
    "target_price": "45000.00",
    "is_active": true
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-502: Price Alerts - Trigger notification

**Feature:** Story 3.8 - Alert Triggers
**Type:** Integration
**Priority:** P1

**Steps:**
1. Create "above" alert @ 45000
2. Simulate price move to 45100
3. Verify WebSocket alert event sent
4. Verify notification sent to user

**Expected Result:**
- Alert triggered and notification sent within 5 seconds

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-503: Price Alerts - Webhook delivery

**Feature:** Story 3.8 - Webhooks
**Type:** Integration
**Priority:** P2

**Steps:**
1. Setup webhook endpoint
2. Create alert with webhook
3. Trigger alert
4. Verify POST to webhook endpoint
5. Verify alert data in request body

**Expected Result:**
- Webhook called with alert details
- HTTP 2xx response expected

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-504: SMA Indicator - Calculate 20-period

**Feature:** Story 3.9 - Technical Indicators
**Type:** API Integration
**Priority:** P2

**Steps:**
1. GET /api/v1/market/indicators/BTC-USDT?type=sma&period=20
2. Verify response has value
3. Verify calculation: (sum of last 20 closes) / 20
4. Verify value between lowest and highest price in period

**Expected Result:**
```json
{
  "data": {
    "symbol": "BTC-USDT",
    "indicator_type": "SMA",
    "period": 20,
    "value": "42300.50",
    "calculated_at": "2025-11-30T10:30:00Z"
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-505: EMA Indicator - Calculate 12-period

**Feature:** Story 3.9 - Technical Indicators
**Type:** API Integration
**Priority:** P2

**Steps:**
1. GET /api/v1/market/indicators/ETH-USDT?type=ema&period=12
2. Verify response has value
3. Verify EMA formula applied correctly
4. Verify value is responsive to recent prices

**Expected Result:**
- EMA value returned
- Value between min/max prices

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-506: RSI Indicator - Calculate momentum

**Feature:** Story 3.9 - Technical Indicators
**Type:** API Integration
**Priority:** P2

**Steps:**
1. GET /api/v1/market/indicators/BTC-USDT?type=rsi&period=14
2. Verify RSI between 0-100
3. Verify RSI formula applied (gains/losses over 14 periods)

**Expected Result:**
```json
{
  "data": {
    "indicator_type": "RSI",
    "period": 14,
    "value": "65.5",
    "status": "overbought|neutral|oversold"
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-507: MACD Indicator - Calculate trend

**Feature:** Story 3.9 - Technical Indicators
**Type:** API Integration
**Priority:** P2

**Steps:**
1. GET /api/v1/market/indicators/BTC-USDT?type=macd
2. Verify response has: macd_line, signal_line, histogram
3. Verify MACD formula applied correctly

**Expected Result:**
```json
{
  "data": {
    "indicator_type": "MACD",
    "macd_line": "150.25",
    "signal_line": "148.50",
    "histogram": "1.75",
    "trend": "bullish|bearish|neutral"
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-508: Signals - Buy/sell recommendations

**Feature:** Story 3.10 - Trading Signals
**Type:** API Integration
**Priority:** P2

**Steps:**
1. GET /api/v1/market/signals/BTC-USDT
2. Verify response has signal (BUY/SELL/HOLD)
3. Verify indicators used (SMA, RSI, MACD)
4. Verify confidence score

**Expected Result:**
```json
{
  "data": {
    "symbol": "BTC-USDT",
    "signal": "BUY",
    "confidence": 0.75,
    "indicators": {
      "sma": "bullish",
      "rsi": "oversold",
      "macd": "bullish"
    }
  }
}
```

**Actual Result:** [To be filled]

**Status:** Not Tested

---

## PHASE 6: Performance & WebSocket Tests (5+ Tests)

### Purpose
Verify performance, WebSocket reliability, and load handling.

### TC-601: WebSocket Connection - Stable connection

**Feature:** Story 3.1 - WebSocket Reliability
**Type:** Performance / Integration
**Priority:** P0

**Steps:**
1. Connect to ws://localhost:8001/ws
2. Subscribe to market data
3. Keep connection open for 5 minutes
4. Verify no disconnects
5. Verify no data loss

**Expected Result:**
- Connection stable for 5 minutes
- No unplanned disconnects
- All subscribed events received

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-602: Message Ordering - Events in sequence

**Feature:** Story 3.1 - Data Integrity
**Type:** Performance / Integration
**Priority:** P0

**Steps:**
1. Subscribe to orderbook updates
2. Collect 100 order updates
3. Verify sequence numbers increment
4. Verify no gaps in sequence
5. Verify timestamp consistency

**Expected Result:**
- Sequence numbers: 1, 2, 3, ..., 100
- No missing sequence numbers
- Timestamps monotonic increasing

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-603: Heartbeat - Connection keep-alive

**Feature:** Story 3.1 - Connection Stability
**Type:** Performance / Integration
**Priority:** P1

**Steps:**
1. Connect to WebSocket
2. Wait 30 seconds without subscribing
3. Verify heartbeat ping/pong received
4. Verify connection stays alive

**Expected Result:**
- Heartbeat received every 15-30 seconds
- Connection remains open

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-604: Reconnect - Auto-reconnect on disconnect

**Feature:** Story 3.1 - Resilience
**Type:** Performance / Integration
**Priority:** P1

**Steps:**
1. Connect and subscribe
2. Simulate disconnect (network failure)
3. Verify client auto-reconnects
4. Verify subscription re-established
5. Verify no data loss after reconnect

**Expected Result:**
- Auto-reconnect within 5 seconds
- Subscription restored
- Data continues flowing

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-605: Load Test - 100 concurrent orders/sec

**Feature:** Story 3.5 - Performance
**Type:** Load Testing
**Priority:** P1

**Steps:**
1. Send 100 concurrent order requests
2. Measure response time
3. Verify 95% latency < 500ms
4. Verify all orders processed
5. Verify no errors

**Expected Result:**
- 100 orders processed successfully
- 95th percentile latency < 500ms
- 99th percentile latency < 1000ms

**Actual Result:** [To be filled]

**Status:** Not Tested

---

### TC-606: Performance Baseline - <50ms latency

**Feature:** Story 3.1 - Performance
**Type:** Performance / Benchmark
**Priority:** P0

**Steps:**
1. Execute 100 market ticker requests
2. Record response times
3. Calculate: p50, p95, p99
4. Verify p50 < 50ms
5. Verify p99 < 200ms

**Expected Result:**
- p50 latency: 20-40ms
- p95 latency: 40-80ms
- p99 latency: 80-150ms

**Actual Result:** [To be filled]

**Status:** Not Tested

---

## Test Execution Summary

### Execution Order
1. **Phase 1:** Market Data (12 tests) - 45 min
2. **Phase 2:** Order Placement (8 tests) - 30 min
3. **Phase 3:** Order Management (8 tests) - 30 min
4. **Phase 4:** History & Analytics (8 tests) - 30 min
5. **Phase 5:** Advanced Features (8 tests) - 30 min
6. **Phase 6:** Performance & WebSocket (5+ tests) - 60 min

**Total Estimated Time:** 3.5-4 hours

### Test Artifacts

#### Postman Collection
- File: `EPIC3_Trading_Engine_Phase4_QA_Collection.postman_collection.json`
- Contains: 30+ REST API tests with assertions
- Usage: `newman run EPIC3_Trading_Engine_Phase4_QA_Collection.postman_collection.json`

#### Cypress E2E Tests
- File: `EPIC3_Trading_Engine_Phase4.spec.ts`
- Contains: UI workflow tests
- Usage: `cypress run --spec "cypress/e2e/EPIC3_Trading_Engine_Phase4.spec.ts"`

#### Test Data
- Use test fixtures for known data
- Generate random data for stress testing
- Use realistic market scenarios

### Pass/Fail Criteria

**PASS:** Test case result matches Expected Result exactly
**FAIL:** Test case result differs from Expected Result

- Bug reproduction steps documented
- Screenshots attached for UI failures
- API responses compared against schema

### Reporting

#### Real-time Updates
- Update each test case's "Actual Result" field
- Note any bugs encountered
- Record response times for performance tests

#### Final Report
- Summary: X/44 tests passed (XX%)
- Critical bugs: 0
- High bugs: X
- Medium bugs: X
- Low bugs: X

---

## Appendix: Running Tests Locally

### Prerequisites
```bash
# Service dependencies
docker-compose up -d postgres redis

# Trade Engine
cd services/trade-engine
go build -o bin/trade-engine ./cmd/server
./bin/trade-engine

# Alternative: Run in Docker
docker build -t trade-engine .
docker run -p 8001:8001 trade-engine
```

### Postman Testing
```bash
# Install Newman (CLI for Postman)
npm install -g newman

# Run collection
newman run EPIC3_Trading_Engine_Phase4_QA_Collection.postman_collection.json \
  --environment postman_env.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

### Cypress Testing
```bash
# Install Cypress
npm install --save-dev cypress

# Open Cypress UI
npx cypress open

# Run headless
npx cypress run --spec "cypress/e2e/EPIC3_Trading_Engine_Phase4.spec.ts"
```

### WebSocket Testing (Manual)
```bash
# Using wscat
npm install -g wscat

wscat -c ws://localhost:8001/ws
> {"action": "subscribe", "channel": "orderbook:BTC-USDT"}
```

---

## Sign-Off Checklist

- [ ] All 44 tests executed
- [ ] Test results documented
- [ ] Screenshots captured for failures
- [ ] Bugs reported with repro steps
- [ ] Bug severity assessed
- [ ] All tests passing OR blocking bugs resolved
- [ ] Performance within SLA
- [ ] Final report generated
- [ ] QA Sign-off provided

**QA Engineer:** [Name]
**Date:** YYYY-MM-DD
**Status:** APPROVED / BLOCKED

---

**End of QA Phase 4 Test Execution Plan**
