# QA Phase 4: EPIC 3 Trading Engine - Comprehensive Test Plan

**Date:** 2025-11-30
**QA Engineer:** Senior QA Agent
**EPIC:** 3 (Trading Engine & Market Data)
**Sprint:** Phase 4
**Status:** In Progress

---

## Document Overview

This document defines the comprehensive test plan for EPIC 3 (Trading Engine & Market Data Services) covering 11 user stories with 40+ test cases including manual, automated, API, and WebSocket testing.

---

## Executive Summary

### Scope
EPIC 3 comprises 11 user stories with ~40 test cases covering:
1. Order Book Real-Time Display
2. Market Ticker Data
3. Recent Trades Feed
4. Market Order Placement
5. Limit Order Placement
6. Open Orders Management
7. Cancel Order & Fund Release
8. Order History with Filters
9. Trade History & P&L
10. Price Alerts (optional)
11. Technical Indicators (optional)

### Testing Approach
- **Manual Testing:** UI flows, real-time updates
- **API Testing:** REST endpoints via Postman/Newman
- **WebSocket Testing:** Real-time market data delivery
- **Load Testing:** Concurrent orders, WebSocket clients
- **Integration Testing:** End-to-end order flow

### Success Criteria
- All 40+ test cases executed
- 100% acceptance criteria coverage
- Zero critical/high-priority bugs
- WebSocket latency <50ms (p99)
- Order throughput 100+ orders/sec
- Concurrent WebSocket support 100+ clients

---

## Detailed Test Plan

### Story 3.1: View Order Book (Real-Time)

**Acceptance Criteria:** 7 items
**Test Cases:** 4

#### Test Case 3.1.1: Display Order Book - Happy Path
**Type:** UI/API
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated and logged in
- Trading pair BTC/TRY selected
- Order book service operational
- WebSocket connection available

**Steps:**
1. Navigate to trading page with BTC/TRY pair
2. Verify order book renders with bids/asks
3. Confirm top 20 levels displayed each side
4. Check price/amount/total columns visible
5. Verify buy orders (green) and sell orders (red) colored correctly
6. Confirm spread calculated correctly (best bid - best ask)

**Expected Result:**
- Order book displays within 100ms
- Bids in descending price order
- Asks in ascending price order
- Visual bar chart showing depth
- Spread highlighted clearly
- User's own orders highlighted in different color

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.1.2: Real-Time WebSocket Updates
**Type:** WebSocket
**Priority:** P0 (Critical)

**Preconditions:**
- Order book displayed
- WebSocket connection established
- Market activity occurring (orders being placed)

**Steps:**
1. Observe initial order book state
2. Place order from another user (or test client)
3. Monitor WebSocket channel: `wss://api.exchange.com/orderbook?symbol=BTC_TRY`
4. Verify update message received within 100ms
5. Confirm order book UI updates in real-time
6. Place multiple orders in succession
7. Verify message ordering maintained

**Expected Result:**
- Update notification received via WebSocket
- Order book refreshes within 100ms
- Message sequence numbers maintained
- No duplicate messages
- No missed updates

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.1.3: Order Book Aggregation (Grouping)
**Type:** UI/API
**Priority:** P1 (High)

**Preconditions:**
- Order book displayed
- Aggregation dropdown available

**Steps:**
1. Select "Aggregate by 0.1%" option
2. Verify orders grouped at 0.1% intervals
3. Amounts summed for grouped levels
4. Confirm visual representation updated
5. Select "Aggregate by 0.5%"
6. Verify regrouping with new intervals
7. Select "No Aggregation"
8. Confirm individual orders displayed

**Expected Result:**
- Aggregation working correctly
- Levels properly summed
- Visual representation accurate
- Seamless switching between modes
- No data loss during aggregation

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.1.4: Order Book Performance (100+ Concurrent Orders)
**Type:** Performance/Load
**Priority:** P1 (High)

**Preconditions:**
- Order book page open
- Load testing tools ready
- 100+ simulated orders prepared

**Steps:**
1. Send 100 orders sequentially to matching engine
2. Monitor order book update latency
3. Measure WebSocket message delivery time
4. Check UI responsiveness
5. Verify no orders dropped
6. Monitor memory usage on browser

**Expected Result:**
- All 100 orders displayed in order book
- WebSocket latency <50ms (p99)
- UI responsive (60 fps)
- No memory leaks
- No visual lag

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.2: View Market Data (Ticker)

**Acceptance Criteria:** 6 items
**Test Cases:** 4

#### Test Case 3.2.1: Ticker Display - All Pairs
**Type:** UI/API
**Priority:** P0 (Critical)

**Preconditions:**
- User on homepage/dashboard
- API endpoint operational: `GET /api/v1/market/ticker`

**Steps:**
1. Navigate to trading homepage
2. Verify all 3 pairs displayed: BTC/TRY, ETH/TRY, USDT/TRY
3. Check each pair shows:
   - Last Price (current)
   - 24h Change (% and absolute)
   - 24h High/Low
   - 24h Volume (base + quote)
4. Verify color coding (green up, red down)
5. Confirm data updated within 1 second

**Expected Result:**
- All 3 pairs visible
- Price formatting correct (2 decimals for TRY)
- Volume in correct currency units
- Color coding accurate
- Update frequency <1 second

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.2.2: Real-Time Price Updates (WebSocket)
**Type:** WebSocket
**Priority:** P0 (Critical)

**Preconditions:**
- Ticker displayed
- Market activity occurring

**Steps:**
1. Subscribe to ticker WebSocket: `wss://api.exchange.com/ticker`
2. Observe current price (e.g., BTC: 450000 TRY)
3. Place order that changes last traded price
4. Monitor for WebSocket update within 100ms
5. Verify price field updated in UI
6. Verify 24h change recalculated
7. Verify color changed if direction changed

**Expected Result:**
- WebSocket update received <100ms
- Price updated immediately
- 24h stats recalculated
- Color changed appropriately
- No stale data displayed

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.2.3: Delta Updates (Incremental Changes)
**Type:** API/WebSocket
**Priority:** P1 (High)

**Preconditions:**
- Ticker subscription active
- Multiple trades occurring

**Steps:**
1. Monitor WebSocket for delta (partial) updates
2. Verify update includes:
   - Symbol
   - Price delta
   - 24h change delta
   - Timestamp
3. Confirm client accumulates deltas correctly
4. Verify against full snapshot every N seconds

**Expected Result:**
- Delta updates received
- Client accumulation correct
- Bandwidth efficient
- No data discrepancies

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.2.4: Price Alert Triggering
**Type:** API/Integration
**Priority:** P2 (Medium)

**Preconditions:**
- User has set price alert: "Alert when BTC > 460000 TRY"
- Current BTC price: 450000 TRY

**Steps:**
1. Place buy order that pushes BTC price to 461000 TRY
2. Wait for alert evaluation (check every 10 seconds)
3. Verify user receives alert notification
4. Check alert appears in alerts history
5. Verify alert auto-deleted after trigger

**Expected Result:**
- Alert triggered correctly
- Notification delivered (email + push)
- Alert removed from active list
- Timestamp recorded

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.3: View Recent Trades Feed

**Acceptance Criteria:** 5 items
**Test Cases:** 4

#### Test Case 3.3.1: Recent Trades Display
**Type:** UI/API
**Priority:** P0 (Critical)

**Preconditions:**
- User viewing trading pair (BTC/TRY)
- Recent trades exist in database

**Steps:**
1. Navigate to "Recent Trades" panel
2. Verify list shows: Time, Price, Amount, Side
3. Confirm last 50 trades displayed
4. Verify format: Green (Buy), Red (Sell)
5. Check prices sorted by time (newest first)
6. Confirm amounts in BTC (base currency)
7. Verify prices in TRY (quote currency)

**Expected Result:**
- 50 trades displayed
- Sorted by time descending
- Color coding correct
- Format matches specification
- Data populated within 1 second

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.3.2: Real-Time Trade Broadcasting
**Type:** WebSocket
**Priority:** P0 (Critical)

**Preconditions:**
- Recent trades panel open
- New trade occurs

**Steps:**
1. Place buy order that matches with sell order
2. Monitor WebSocket: `wss://api.exchange.com/trades?symbol=BTC_TRY`
3. Verify trade execution message received
4. Confirm new trade appears at top of list
5. Check trade details: time, price, amount, side
6. Verify previous trades scrolled down

**Expected Result:**
- Trade broadcast within 50ms
- New trade visible immediately
- Trade details correct
- UI animates smoothly

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.3.3: Auto-Scroll Behavior
**Type:** UI
**Priority:** P2 (Medium)

**Preconditions:**
- Recent trades panel open
- Auto-scroll toggle available

**Steps:**
1. Enable "Auto-scroll new trades" toggle
2. Observe recent trades list
3. New trade occurs
4. Verify list scrolls to show new trade
5. Disable auto-scroll
6. Another trade occurs
7. Verify list does NOT auto-scroll
8. Manually scroll to view

**Expected Result:**
- Auto-scroll toggles correctly
- Behavior matches setting
- Smooth scrolling animation

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.3.4: Trade Feed Performance (High Volume)
**Type:** Performance
**Priority:** P1 (High)

**Preconditions:**
- Trade feed displayed
- 100+ trades executed in sequence

**Steps:**
1. Execute 100 trades rapidly
2. Monitor trade feed update latency
3. Verify all 100 trades broadcast
4. Check WebSocket message ordering
5. Monitor browser CPU/memory

**Expected Result:**
- All trades broadcast within 50ms
- No trades lost
- Message sequence maintained
- UI remains responsive
- No memory leaks

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.4: Place Market Order

**Acceptance Criteria:** 11 items
**Test Cases:** 4

#### Test Case 3.4.1: Market Order - Buy (Happy Path)
**Type:** API/UI
**Priority:** P0 (Critical)

**Preconditions:**
- User authenticated with KYC Level 1
- User has 10,000 TRY available balance
- Order amount 1 BTC
- Current BTC/TRY price: 450,000

**Steps:**
1. Navigate to Market Order form
2. Select BTC/TRY pair
3. Select "Buy" side
4. Enter amount: 1 BTC
5. Note estimated total: ~450,000 TRY + fee
6. Verify fee displayed: 0.2% (900 TRY)
7. Total with fee: 450,900 TRY
8. Verify "Buy" button active
9. Click "Buy" button
10. Confirm modal appears
11. Click "Confirm"
12. Order submitted

**Expected Result:**
- Order accepted (HTTP 201)
- Order ID returned
- "Sipariş alındı!" notification shown
- Order appears in "Open Orders"
- Balance locked immediately
- Execution notification received (WebSocket)

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.4.2: Market Order - Insufficient Balance
**Type:** Validation
**Priority:** P0 (Critical)

**Preconditions:**
- User balance: 100,000 TRY
- Order amount: 1 BTC (requires 450,900 TRY)

**Steps:**
1. Navigate to Market Order form
2. Select "Buy" side
3. Enter 1 BTC
4. Observe "Buy" button state
5. Attempt to click "Buy" button

**Expected Result:**
- "Buy" button disabled
- Error message: "Yetersiz bakiye. İhtiyaç: 450,900 TRY"
- No confirmation modal shown

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.4.3: Market Order - 2FA Required (Large Order)
**Type:** Security
**Priority:** P0 (Critical)

**Preconditions:**
- 2FA enabled for user
- Order amount: 15,000 TRY (exceeds 10,000 TRY threshold)
- User has sufficient balance

**Steps:**
1. Place market order for 15,000 TRY equivalent
2. Confirmation modal appears
3. Click "Confirm"
4. 2FA code prompt appears
5. User enters incorrect code
6. Verify error message
7. User enters correct 2FA code
8. Order executed

**Expected Result:**
- 2FA required and enforced
- Order blocked until 2FA passed
- Error message on incorrect code
- Order executes after correct code

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.4.4: Partial Fill Handling
**Type:** Integration
**Priority:** P1 (High)

**Preconditions:**
- Order book has limited sell side liquidity
- User places buy order for 2 BTC
- Only 1.5 BTC available at various prices
- Partial fills enabled

**Steps:**
1. Submit market order for 2 BTC
2. Observe order accepted
3. Check order status: PARTIALLY_FILLED
4. Monitor order book for remaining sell orders
5. More sell orders appear
6. Remaining 0.5 BTC fills
7. Order status changes to FILLED

**Expected Result:**
- Partial fill accepted
- Status updated to PARTIALLY_FILLED
- Remaining amount still open
- Order settles when fully filled

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.5: Place Limit Order

**Acceptance Criteria:** 13 items
**Test Cases:** 4

#### Test Case 3.5.1: Limit Order - Sell (Happy Path)
**Type:** API/UI
**Priority:** P0 (Critical)

**Preconditions:**
- User owns 0.5 BTC
- Current BTC/TRY price: 450,000
- User wants to sell at 460,000 TRY

**Steps:**
1. Navigate to Limit Order form
2. Select BTC/TRY pair
3. Select "Sell" side
4. Enter Price: 460,000 TRY
5. Enter Amount: 0.5 BTC
6. Total: 230,000 TRY (before fee)
7. Fee: 0.2% = 460 TRY
8. Note: Post-only option available
9. Check Time-in-Force: GTC selected (default)
10. Click "Sell" button
11. Confirmation modal shows
12. Click "Confirm"

**Expected Result:**
- Order created with status OPEN
- Order appears in "Open Orders"
- Balance locked (0.5 BTC)
- Order book updated with new sell order at 460,000
- WebSocket notification sent

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.5.2: Limit Order - Price Validation (±10% Rule)
**Type:** Validation
**Priority:** P0 (Critical)

**Preconditions:**
- Current price: 450,000 TRY
- ±10% range: 405,000 - 495,000 TRY

**Steps:**
1. Attempt to place order at 400,000 TRY (below range)
2. Verify error message
3. Attempt to place order at 500,000 TRY (above range)
4. Verify error message
5. Place order at 450,000 TRY (within range)
6. Verify accepted

**Expected Result:**
- Out-of-range orders rejected
- Error message: "Fiyat ±10% aralığının dışında"
- Within-range order accepted

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.5.3: IOC (Immediate or Cancel) Order
**Type:** Time-in-Force
**Priority:** P1 (High)

**Preconditions:**
- Order book: BTC/TRY bids at 449,000
- No bids at 450,000 or above

**Steps:**
1. Place limit buy order at 450,000 TRY
2. Select Time-in-Force: IOC
3. Order amount: 0.1 BTC
4. Submit order
5. Verify order executes against available bids
6. Remaining amount (if any) auto-cancelled

**Expected Result:**
- Order partially fills against 449,000 bids
- Remaining amount cancelled automatically
- No order left in order book
- Status shows CANCELLED

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.5.4: FOK (Fill or Kill) Order
**Type:** Time-in-Force
**Priority:** P1 (High)

**Preconditions:**
- Order book has 0.3 BTC available at 449,000
- User requests 0.5 BTC

**Steps:**
1. Place limit buy order for 0.5 BTC
2. Select Time-in-Force: FOK
3. Available liquidity: only 0.3 BTC
4. Submit order
5. Verify order rejected (cannot fill entire amount)

**Expected Result:**
- Order rejected with error
- No partial execution
- Balance not locked
- Status: REJECTED

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.6: View Open Orders

**Acceptance Criteria:** 6 items
**Test Cases:** 4

#### Test Case 3.6.1: Open Orders List Display
**Type:** UI/API
**Priority:** P0 (Critical)

**Preconditions:**
- User has multiple open orders
- Orders: 2 buy, 1 sell, 1 partially filled

**Steps:**
1. Navigate to "Open Orders" page
2. Verify list shows:
   - Order ID
   - Date/Time
   - Pair (BTC/TRY, ETH/TRY)
   - Side (Buy/Sell)
   - Type (Market/Limit)
   - Price
   - Amount
   - Filled % (0-100%)
   - Status (Open, Partially Filled)
3. Verify 20 per page pagination
4. Confirm column headers visible

**Expected Result:**
- All open orders displayed
- Columns match specification
- Formatting correct (prices 2 decimals, amounts 8 decimals)
- Pagination working

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.6.2: Real-Time Order Status Updates
**Type:** WebSocket
**Priority:** P0 (Critical)

**Preconditions:**
- Open Orders page displayed
- Order partially fills from market activity

**Steps:**
1. Monitor WebSocket: `order.status.updated`
2. Observe matching order execution
3. Verify WebSocket notification received
4. Check order Filled % updates in UI
5. Confirm status changes from OPEN to PARTIALLY_FILLED
6. Monitor order book for remaining amount

**Expected Result:**
- Status updated within 50ms
- Filled % reflects actual fill
- UI refreshes automatically
- No manual refresh needed

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.6.3: Cancel Order Button
**Type:** UI/API
**Priority:** P0 (Critical)

**Preconditions:**
- Open order visible in list
- Order status: OPEN

**Steps:**
1. Click "Cancel" button for order
2. Confirmation modal appears: "Emin misiniz?"
3. Click "Cancel Order"
4. Verify order cancelled within 200ms
5. Order disappears from Open Orders
6. Balance unlocked immediately
7. Order appears in Order History with status CANCELLED

**Expected Result:**
- Order cancelled within 200ms SLA
- Balance released immediately
- Order moves to history
- WebSocket notification sent
- Status shows CANCELLED

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.6.4: Cancel All Orders
**Type:** UI
**Priority:** P1 (High)

**Preconditions:**
- User has 5 open orders across 2 pairs

**Steps:**
1. Click "Cancel All" button
2. Confirmation modal: "5 emirden tamamı iptal edilecek"
3. Click "Cancel All"
4. Monitor cancellation progress
5. Verify all 5 orders cancelled
6. Verify all balances released
7. Open Orders list empty

**Expected Result:**
- All orders cancelled
- All balances released
- Open Orders list empty
- Order History updated

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.7: Cancel Order & Fund Release

**Acceptance Criteria:** 4 items
**Test Cases:** 4

#### Test Case 3.7.1: Immediate Fund Release on Cancellation
**Type:** Integration
**Priority:** P0 (Critical)

**Preconditions:**
- User places buy order: 0.5 BTC at 450,000 TRY
- Balance before order: 500,000 TRY
- Balance after order: 500,000 - (0.5 * 450,000 + fee) = ~24,775 TRY available
- 225,225 TRY locked

**Steps:**
1. Check balance widget: Available 24,775 TRY, Locked 225,225 TRY
2. Click "Cancel" on order
3. Confirm cancellation
4. Check balance immediately after

**Expected Result:**
- Immediately after cancellation: Available 500,000 TRY, Locked 0 TRY
- Total balance unchanged
- Fund release instant (not queued)

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.7.2: Partial Fill & Partial Cancel
**Type:** Integration
**Priority:** P1 (High)

**Preconditions:**
- Order: Buy 1 BTC at 450,000 TRY
- Order partially fills: 0.3 BTC (135,000 TRY executed)
- Remaining: 0.7 BTC (315,000 TRY locked)

**Steps:**
1. Check status: PARTIALLY_FILLED
2. Check balance: Locked 315,000 TRY (remaining)
3. Cancel the order
4. Verify only remaining 0.7 BTC locked released
5. Verify executed 0.3 BTC stays in balance

**Expected Result:**
- Only pending amount released
- Executed amount stays in balance
- Status: FILLED (for executed portion)
- Cancelled (for pending portion)

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.7.3: WebSocket Notification on Cancellation
**Type:** WebSocket
**Priority:** P0 (Critical)

**Preconditions:**
- Order visible to other users via WebSocket
- Subscription active: `order.cancelled`

**Steps:**
1. Subscribe to: `wss://api.exchange.com/orders`
2. Order: Sell 0.5 BTC at 460,000 visible on order book
3. User cancels order
4. Monitor WebSocket for cancellation event
5. Verify event includes: Order ID, timestamp, reason

**Expected Result:**
- Cancellation event broadcast
- Other users notified
- Order removed from their order book
- WebSocket message within 50ms

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.7.4: Concurrent Cancellation (Race Condition)
**Type:** Edge Case
**Priority:** P1 (High)

**Preconditions:**
- Order visible
- Two requests submitted simultaneously:
  - Request 1: Cancel order
  - Request 2: Execute order (match from market)

**Steps:**
1. Place order
2. Simulate race condition
3. Submit cancel request
4. Simultaneously receive match execution
5. Verify system handles gracefully

**Expected Result:**
- Either order fully executed OR fully cancelled
- No partial state
- Balance consistent
- No duplicate cancellations
- User notified of final state

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.8: View Order History

**Acceptance Criteria:** 5 items
**Test Cases:** 4

#### Test Case 3.8.1: Order History Display with Filters
**Type:** UI/API
**Priority:** P0 (Critical)

**Preconditions:**
- User has 100+ historical orders
- Orders from last 90 days
- Mix of BTC/TRY, ETH/TRY, USDT/TRY
- Statuses: FILLED, CANCELLED, PARTIALLY_FILLED

**Steps:**
1. Navigate to "Order History" page
2. Display all orders (default)
3. Verify columns: ID, Date, Pair, Side, Type, Price, Amount, Filled%, Status, Fee
4. Apply filter: Pair = BTC/TRY
5. Verify only BTC/TRY orders shown
6. Apply filter: Status = FILLED
7. Verify only filled orders shown
8. Apply date filter: Last 7 days
9. Verify date range filtering
10. Clear all filters
11. Verify pagination: 50 per page

**Expected Result:**
- Filters working correctly
- Multiple filters can apply simultaneously
- Pagination responsive
- Data loads within 500ms

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.8.2: Order Details on Click
**Type:** UI
**Priority:** P1 (High)

**Preconditions:**
- Order History displayed
- Partially filled order visible

**Steps:**
1. Click on order row
2. Detail panel opens
3. Verify shows: Order ID, timestamps, full details
4. For partially filled order, verify "Fill History" section
5. Fill History shows: Trade ID, timestamp, price, amount
6. Confirm all fills sum to current filled amount

**Expected Result:**
- Details panel displays correctly
- Fill history accurate
- Calculation verified (sum of fills = filled amount)

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.8.3: Export Order History to CSV
**Type:** API/Feature
**Priority:** P2 (Medium)

**Preconditions:**
- Order History page open
- 30+ orders to export

**Steps:**
1. Click "Export to CSV" button
2. Select date range: Last 90 days
3. Wait for CSV generation
4. Verify download prompt
5. Download file
6. Open CSV in spreadsheet
7. Verify columns: Order ID, Date, Pair, Side, Type, Price, Amount, Filled%, Status, Fee
8. Spot check 5 random rows against original data
9. Verify data accuracy

**Expected Result:**
- CSV generates within 2 seconds
- All orders included
- Columns correct
- Data accurate
- File downloadable

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.8.4: Order History Performance (1000+ Orders)
**Type:** Performance
**Priority:** P1 (High)

**Preconditions:**
- Database has 1000+ historical orders

**Steps:**
1. Load Order History page
2. Measure page load time
3. Apply filter
4. Measure filter response time
5. Scroll to page 20 (1000 orders)
6. Measure pagination load time
7. Export to CSV
8. Measure export time

**Expected Result:**
- Page load: <500ms
- Filter response: <300ms
- Pagination: <300ms
- CSV export: <2 seconds
- Smooth scrolling (60 fps)

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.9: View Trade History & P&L

**Acceptance Criteria:** 5 items
**Test Cases:** 4

#### Test Case 3.9.1: Trade History Display
**Type:** UI/API
**Priority:** P0 (Critical)

**Preconditions:**
- User has 50+ executed trades
- Trades from different dates
- Trades from different pairs

**Steps:**
1. Navigate to "Trade History" page
2. Verify columns: Trade ID, Date, Pair, Side, Price, Amount, Fee, Total
3. Verify data populated
4. Check sorting: newest first
5. Verify prices in correct format (2 decimals for TRY)
6. Verify amounts in correct format (8 decimals for crypto)
7. Spot check 5 rows: fee = amount * price * 0.002

**Expected Result:**
- All trades displayed
- Columns match specification
- Sorting correct
- Formatting accurate
- Fee calculation verified

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.9.2: Trade History Filtering
**Type:** UI/API
**Priority:** P1 (High)

**Preconditions:**
- Trade History displayed
- Multiple pairs represented

**Steps:**
1. Apply filter: Pair = BTC/TRY
2. Verify only BTC/TRY trades shown
3. Apply filter: Side = Buy
4. Verify only buy trades shown
5. Apply date filter: Last 30 days
6. Verify date range filter
7. Clear filters
8. Verify all trades shown again

**Expected Result:**
- Filters work individually
- Filters work in combination
- Results accurate
- Performance good (<300ms per filter)

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.9.3: Basic P&L Calculation
**Type:** Calculation
**Priority:** P2 (Medium)

**Preconditions:**
- User buy trade: 0.5 BTC at 450,000 TRY
- User sell trade: 0.5 BTC at 460,000 TRY
- Fees: 0.2% on each = 450 TRY + 460 TRY = 910 TRY

**Steps:**
1. Identify buy trade: Cost = 0.5 * 450,000 - 450 = 224,775 TRY
2. Identify matching sell trade: Revenue = 0.5 * 460,000 - 460 = 229,540 TRY
3. P&L = Revenue - Cost = 229,540 - 224,775 = 4,765 TRY
4. P&L % = (4,765 / 224,775) * 100 = 2.12%
5. Verify UI shows this P&L for matched trades

**Expected Result:**
- P&L calculation accurate
- P&L percentage shown
- Fees properly deducted
- Positive P&L shows in green
- Negative P&L shows in red

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.9.4: Trade History Export to CSV
**Type:** API/Feature
**Priority:** P2 (Medium)

**Preconditions:**
- Trade History page open
- 50+ trades to export

**Steps:**
1. Click "Export to CSV" button
2. Select date range: Last 90 days
3. Wait for CSV generation
4. Download file
5. Verify columns in CSV
6. Spot check 5 rows
7. Verify P&L included (if implemented)

**Expected Result:**
- CSV exports correctly
- All trades included
- Columns match UI
- Data accurate
- Performance: <2 seconds

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.10: Price Alerts (Optional)

**Acceptance Criteria:** 4 items
**Test Cases:** 4

#### Test Case 3.10.1: Create Price Alert
**Type:** API/UI
**Priority:** P2 (Medium)

**Preconditions:**
- User authenticated
- User limit: 10 active alerts

**Steps:**
1. Navigate to "Price Alerts" section
2. Click "Create Alert"
3. Select Pair: BTC/TRY
4. Select Condition: "Above"
5. Enter Target Price: 460,000 TRY
6. Click "Create"
7. Verify alert created
8. Verify alert in alerts list
9. Verify alert status: Active

**Expected Result:**
- Alert created successfully
- Displayed in alerts list
- Status: Active
- Ready to trigger

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.10.2: Alert Triggering
**Type:** Integration
**Priority:** P2 (Medium)

**Preconditions:**
- Alert created: BTC > 460,000
- Current price: 459,000

**Steps:**
1. Place order that causes price to move to 461,000
2. System evaluates alerts (every 10 seconds)
3. Alert condition met: Price > 460,000
4. User receives email notification
5. User receives push notification
6. Alert moved to "Triggered" history
7. Alert auto-deleted from active list

**Expected Result:**
- Alert triggers correctly
- Notifications delivered (email + push)
- Alert removed from active list
- Timestamp recorded in history

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.10.3: Alert Management (Delete, Edit)
**Type:** UI
**Priority:** P2 (Medium)

**Preconditions:**
- User has 3 active alerts

**Steps:**
1. Edit alert: Change target price from 460,000 to 465,000
2. Verify edit saved
3. Delete one alert
4. Verify alert removed from list
5. Verify count: 2 active alerts

**Expected Result:**
- Edit works correctly
- Delete works correctly
- Alerts list updated

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.10.4: Max Alerts Limit (10)
**Type:** Validation
**Priority:** P2 (Medium)

**Preconditions:**
- User has 10 active alerts

**Steps:**
1. Attempt to create 11th alert
2. Verify error message

**Expected Result:**
- Error: "Maksimum 10 alarm ayarlayabilirsiniz"
- 11th alert not created
- UI shows remaining: 0

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

### Story 3.11: Technical Indicators (Optional)

**Acceptance Criteria:** 4 items
**Test Cases:** 4

#### Test Case 3.11.1: SMA (Simple Moving Average) Calculation
**Type:** Calculation
**Priority:** P3 (Low)

**Preconditions:**
- Historical price data available
- SMA periods: 20, 50, 200
- Chart timeframe: 1 hour

**Steps:**
1. View 1-hour chart
2. Enable SMA(20) indicator
3. Verify SMA line displayed
4. Spot check 5 candles: Calculate manual SMA(20)
5. Compare manual vs. displayed value
6. Enable SMA(50) and SMA(200)
7. Verify all three lines visible

**Expected Result:**
- SMA calculated correctly
- Verified with manual calculation
- Lines displayed on chart
- Multiple SMAs visible simultaneously

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.11.2: EMA (Exponential Moving Average)
**Type:** Calculation
**Priority:** P3 (Low)

**Preconditions:**
- Historical price data available
- EMA period: 12
- Chart timeframe: 1 hour

**Steps:**
1. Enable EMA(12) indicator
2. Verify EMA line displayed
3. Verify EMA follows price more closely than SMA
4. Disable and re-enable
5. Verify consistency

**Expected Result:**
- EMA calculated correctly
- Line displayed on chart
- EMA responds faster than SMA to price changes

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.11.3: RSI (Relative Strength Index)
**Type:** Calculation
**Priority:** P3 (Low)

**Preconditions:**
- Historical price data available
- RSI period: 14

**Steps:**
1. Enable RSI(14) indicator
2. Verify RSI displayed in separate panel
3. Verify scale: 0-100
4. Verify overbought zone (>70) marked
5. Verify oversold zone (<30) marked
6. Spot check RSI value calculation

**Expected Result:**
- RSI displayed correctly
- Scale 0-100
- Zones marked
- Calculation accurate

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

#### Test Case 3.11.4: MACD (Moving Average Convergence Divergence)
**Type:** Calculation
**Priority:** P3 (Low)

**Preconditions:**
- Historical price data available
- MACD periods: 12, 26, 9

**Steps:**
1. Enable MACD indicator
2. Verify MACD line, signal line, histogram displayed
3. Verify zero line marked
4. Verify histogram colors: green (positive), red (negative)
5. Spot check MACD value calculation

**Expected Result:**
- MACD displayed correctly
- All three components visible
- Zero line marked
- Histogram colors correct
- Calculation accurate

**Actual Result:**
[To be filled after testing]

**Status:** Not Tested

---

## Test Execution Schedule

| Phase | Timeline | Activities |
|-------|----------|------------|
| Phase 1: Planning | Today | Create test plan, prepare test data, setup environments |
| Phase 2: Manual Testing | Today + 1 day | Execute manual test cases, verify UI, test WebSocket |
| Phase 3: API Testing | Today + 1 day | Execute Postman collection, verify endpoints |
| Phase 4: Bug Reporting | As found | Document bugs with reproduction steps |
| Phase 5: Re-testing | As bugs fixed | Re-test fixed bugs |
| Phase 6: Final Report | After completion | Generate comprehensive report, sign-off |

---

## Test Environment Setup

### Services Required
- Auth Service: http://localhost:3001
- Wallet Service: http://localhost:3002
- Trade Engine: http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Test Data
- User 1: test1@example.com / Password123!
- User 2: test2@example.com / Password123!
- Initial balances: 500,000 TRY, 2 BTC, 5 ETH, 100 USDT

### Tools
- Postman: API testing collection
- Browser DevTools: Network monitoring, WebSocket inspection
- Load testing: Apache JMeter or k6
- Screenshots: For bug documentation

---

## Success Criteria & Sign-Off

### Criteria for Phase 4 Completion
- [ ] All 40+ test cases executed
- [ ] 100% acceptance criteria coverage
- [ ] Zero critical bugs remaining
- [ ] All high-priority bugs fixed and re-tested
- [ ] WebSocket latency verified <50ms (p99)
- [ ] Order throughput verified 100+ orders/sec
- [ ] Concurrent WebSocket support verified 100+ clients
- [ ] Comprehensive bug report (if any)
- [ ] Postman collection created with all endpoints
- [ ] Final report generated

### Sign-Off Conditions
Phase 4 will be signed off when:
1. All manual tests complete and documented
2. All API tests complete via Postman/Newman
3. All WebSocket tests complete
4. No blocking bugs remain
5. Performance targets met
6. Test artifacts created

---

## Next Steps

1. Execute all 40+ test cases systematically
2. Document results in this plan
3. Create bug reports for any issues found
4. Generate Postman collection for automation
5. Prepare final comprehensive report
6. Provide sign-off recommendation

---

**Document Version:** 1.0
**Created:** 2025-11-30
**Status:** In Progress
**Last Updated:** 2025-11-30

