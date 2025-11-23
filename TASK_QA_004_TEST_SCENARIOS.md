# TASK-QA-004: Matching Engine Test Scenarios

**Task ID:** TASK-QA-004
**Sprint:** Trade Engine Sprint 1
**Date:** 2025-11-25
**Deadline:** 5:00 PM
**Estimated Duration:** 3 hours
**Status:** EXECUTION IN PROGRESS

---

## Executive Summary

This document defines 50+ comprehensive test scenarios for the Trade Engine Matching Engine. The matching engine is the core financial component responsible for matching buy and sell orders using the Price-Time Priority algorithm.

**Critical Success Factors:**
- Algorithmic correctness (Price-Time Priority)
- Financial accuracy (fee calculations)
- Performance targets (1000+ matches/sec)
- Edge case handling
- Thread safety

---

## Test Categories & Scenarios

### CATEGORY A: BASIC MATCHING (10 Scenarios)

#### TC-A-001: Market Buy Matches Single Level Sell

**Feature:** Basic Matching
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Market buy order fully executes against a single sell price level.

**Preconditions:**
- Order book is empty
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell order: 1 BTC @ 50,000 USDT (seller order)
2. Place market buy order: 1 BTC (buyer order)
3. Verify order matching and trade creation
4. Check order book state

**Expected Results:**
- Trade created with:
  - Price: 50,000 USDT
  - Quantity: 1 BTC
  - Buyer order ID matches input
  - Seller order ID matches step 1
  - Taker fee: 0.1% (10 USDT on 10,000 USDT value)
  - Maker fee: 0.05% (5 USDT)
- Both orders marked as FILLED
- Order book for BTC/USDT is empty

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-A-002: Market Sell Matches Single Level Buy

**Feature:** Basic Matching
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Market sell order fully executes against a single buy price level.

**Preconditions:**
- Order book is empty
- Symbol: ETH/USDT

**Steps:**
1. Add limit buy order: 10 ETH @ 3,000 USDT (buyer order)
2. Place market sell order: 10 ETH (seller order)
3. Verify order matching

**Expected Results:**
- Trade created at 3,000 USDT (best bid)
- Quantity: 10 ETH
- Buyer is maker (fee: 0.05%)
- Seller is taker (fee: 0.1%)
- Both orders FILLED

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-A-003: Limit Buy Matches Limit Sell (Price Crosses)

**Feature:** Basic Matching
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Limit buy order executes immediately when price crosses with limit sell.

**Preconditions:**
- Order book empty
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 0.5 BTC @ 51,000 USDT
2. Place limit buy: 0.5 BTC @ 51,500 USDT
3. Verify immediate matching

**Expected Results:**
- Trade at 51,000 USDT (seller's limit)
- Quantity: 0.5 BTC
- Buyer order marked FILLED
- Seller order marked FILLED
- No remaining orders in book

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-A-004: Limit Buy Added to Book (No Match)

**Feature:** Basic Matching
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Limit buy order is added to order book when no matching sell exists.

**Preconditions:**
- Order book empty
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 1 BTC @ 52,000 USDT
2. Place limit buy: 1 BTC @ 50,000 USDT (below ask)
3. Verify order added to book

**Expected Results:**
- Buy order remains in order book
- Status: OPEN
- No trade created
- Order book contains 1 bid and 1 ask

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-A-005: Limit Sell Added to Book (No Match)

**Feature:** Basic Matching
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Limit sell order added to book when no matching buy exists.

**Preconditions:**
- Order book empty
- Symbol: ETH/USDT

**Steps:**
1. Add limit buy: 5 ETH @ 2,500 USDT
2. Place limit sell: 5 ETH @ 3,500 USDT (above bid)
3. Verify order added to book

**Expected Results:**
- Sell order in order book
- Status: OPEN
- No trade created
- Spread exists (bid-ask gap)

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-A-006: Market Order with No Liquidity (Insufficient Liquidity)

**Feature:** Edge Case Handling
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Market order fails when insufficient liquidity exists (for IOC/FOK), or partially fills based on TIF.

**Preconditions:**
- Order book has limited liquidity

**Steps:**
1. Add limit sell: 0.1 BTC @ 50,000 USDT
2. Place market buy: 1 BTC (IOC - Immediate or Cancel)
3. Verify handling

**Expected Results:**
- For IOC: Order partially filled (0.1 BTC) or rejected based on TIF
- Remaining 0.9 BTC cancelled
- Status reflects partial fill or rejection

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-A-007: Exact Quantity Match

**Feature:** Basic Matching
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Orders match exactly with no remainder.

**Preconditions:**
- Order book empty

**Steps:**
1. Add limit buy: 2.5 BTC @ 50,000 USDT
2. Place market sell: 2.5 BTC
3. Verify exact match

**Expected Results:**
- Quantity matched: 2.5 BTC
- No partial fills
- Both orders FILLED
- Order book empty

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-A-008: Multiple Price Levels Matched

**Feature:** Basic Matching
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Market order walks through multiple price levels to fill completely.

**Preconditions:**
- Order book empty
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 0.3 BTC @ 50,000 USDT
2. Add limit sell: 0.4 BTC @ 50,100 USDT
3. Add limit sell: 0.3 BTC @ 50,200 USDT
4. Place market buy: 1 BTC
5. Verify all three levels consumed

**Expected Results:**
- 0.3 BTC filled at 50,000
- 0.4 BTC filled at 50,100
- 0.3 BTC filled at 50,200
- Total 1 BTC filled
- Trades created for each price level
- Order book asks level clear

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-A-009: Large Market Order Walks Book

**Feature:** Performance / Edge Case
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Large market order consumes multiple price levels efficiently.

**Preconditions:**
- Order book with 10+ price levels
- Total liquidity > order size

**Steps:**
1. Add 10 limit sells at prices 50,000 - 50,900 (0.2 BTC each)
2. Place market buy: 1.5 BTC
3. Verify efficient consumption

**Expected Results:**
- All 10 price levels partially/fully consumed
- Remainder 0.5 BTC at level 11
- Total latency < 20ms
- Correct fee calculations at each level

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-A-010: Small Limit Order Placed

**Feature:** Basic Matching
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Small limit order added to book without matching existing orders.

**Preconditions:**
- Order book with active orders

**Steps:**
1. Add limit buy: 10 BTC @ 45,000 USDT
2. Add limit sell: 10 BTC @ 55,000 USDT
3. Place limit buy: 0.01 BTC @ 46,000 USDT
4. Verify addition without matching

**Expected Results:**
- New limit buy order added to book
- Status: OPEN
- Not matched with existing orders
- Book contains 2 bid levels

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### CATEGORY B: PARTIAL FILLS (10 Scenarios)

#### TC-B-001: Market Order Partial Fill

**Feature:** Partial Fills
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Market order receives partial fill when insufficient liquidity available.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 0.5 BTC @ 50,000 USDT
2. Place market buy: 1.0 BTC
3. Verify partial fill

**Expected Results:**
- 0.5 BTC filled at 50,000
- Order status: PARTIALLY_FILLED
- Filled quantity: 0.5 BTC
- Remaining quantity: 0.5 BTC
- Unfilled portion handled per TIF

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-B-002: Limit Order Partial Fill

**Feature:** Partial Fills
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Limit order partially fills and remainder stays in order book.

**Preconditions:**
- Symbol: ETH/USDT

**Steps:**
1. Add limit buy: 10 ETH @ 3,000 USDT
2. Place limit sell: 15 ETH @ 2,900 USDT
3. Verify partial fill and remainder in book

**Expected Results:**
- 10 ETH matched at 2,900 USDT
- Sell order status: PARTIALLY_FILLED
- Remaining: 5 ETH
- Remainder added to order book
- Buyer marked FILLED

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-B-003: Remainder Added to Book

**Feature:** Partial Fills
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Unfilled portion of limit order is correctly added to order book.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit buy: 0.5 BTC @ 49,500 USDT
2. Place limit sell: 1.0 BTC @ 49,500 USDT
3. Verify remainder in book

**Expected Results:**
- 0.5 BTC matched
- Sell order status: PARTIALLY_FILLED
- Remaining: 0.5 BTC
- Remainder in ask side of book
- Can be matched by subsequent buy

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-B-004: Multiple Partial Fills Sequence

**Feature:** Partial Fills
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Order receives multiple partial fills as matching orders arrive.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 1.0 BTC @ 50,000 USDT
2. Place limit buy: 0.3 BTC @ 50,500 USDT
3. Place limit buy: 0.4 BTC @ 50,200 USDT
4. Place limit buy: 0.3 BTC @ 50,300 USDT
5. Verify order fills sequentially

**Expected Results:**
- First buy (0.3 BTC) partially fills sell order
- Second buy (0.4 BTC) further fills
- Third buy (0.3 BTC) completes fill
- Final status: FILLED
- Total filled: 1.0 BTC

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-B-005: Partial Fill at Multiple Price Levels

**Feature:** Partial Fills
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Limit order matches at multiple price levels and partial fills.

**Preconditions:**
- Symbol: ETH/USDT

**Steps:**
1. Add limit buy: 5 ETH @ 3,100 USDT
2. Add limit buy: 5 ETH @ 3,050 USDT
3. Place limit sell: 12 ETH @ 3,000 USDT
4. Verify matching and partial fill

**Expected Results:**
- 5 ETH matched at 3,100 USDT
- 5 ETH matched at 3,050 USDT
- Remaining 2 ETH as partial fill
- Sell order: PARTIALLY_FILLED
- Remaining quantity: 2 ETH

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-B-006: Quantity Tracking Accuracy

**Feature:** Data Integrity
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Filled and remaining quantities are accurately tracked.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Place limit sell: 1.5 BTC @ 50,000 USDT
2. Place limit buy: 0.6 BTC @ 50,500 USDT
3. Verify filled and remaining quantities

**Expected Results:**
- Sell order filled quantity: 0.6 BTC
- Sell order remaining quantity: 0.9 BTC
- Total: 0.6 + 0.9 = 1.5 BTC
- RemainingQuantity() = 0.9 BTC

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-B-007: Status Updates Through Fill States

**Feature:** Order Lifecycle
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Order status transitions correctly: PENDING → PARTIALLY_FILLED → FILLED.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 1.0 BTC @ 50,000 USDT (status: OPEN)
2. Place limit buy: 0.4 BTC @ 50,500 USDT
3. Check order status
4. Place limit buy: 0.6 BTC @ 50,200 USDT
5. Check final status

**Expected Results:**
- Initial status: OPEN
- After 1st buy: PARTIALLY_FILLED
- After 2nd buy: FILLED
- Timestamps updated at each state

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-B-008: Unfilled Quantity Calculation

**Feature:** Order Management
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Unfilled quantity calculated correctly at each state.

**Preconditions:**
- Symbol: ETH/USDT

**Steps:**
1. Add limit sell: 10 ETH @ 3,000 USDT
2. Place market buy: 3 ETH
3. Verify unfilled quantity
4. Place market buy: 5 ETH
5. Verify updated unfilled quantity

**Expected Results:**
- After step 3: Unfilled = 7 ETH
- After step 5: Unfilled = 2 ETH
- RemainingQuantity() accurate at each step

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-B-009: Fee Calculation on Partial Fills

**Feature:** Financial Accuracy
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Fees calculated correctly on partial fill amounts, not full order.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit buy: 1.0 BTC @ 50,000 USDT (0.05% = 25 USDT maker fee)
2. Place market sell: 0.5 BTC (taker)
3. Verify fee on 0.5 BTC only

**Expected Results:**
- Trade fee (maker): 0.5 * 50,000 * 0.0005 = 12.5 USDT
- Trade fee (taker): 0.5 * 50,000 * 0.001 = 25 USDT
- Fees calculated on filled quantity, not total order

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-B-010: Multiple Taker Orders Match One Maker

**Feature:** Matching Logic
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Single maker order is matched by multiple taker orders in sequence.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 2.0 BTC @ 50,000 USDT (maker)
2. Place market buy: 0.5 BTC (taker 1)
3. Place market buy: 0.7 BTC (taker 2)
4. Place market buy: 0.8 BTC (taker 3)
5. Verify maker order state

**Expected Results:**
- After taker 1: Maker status = PARTIALLY_FILLED
- After taker 2: Maker status = PARTIALLY_FILLED
- After taker 3: Maker status = FILLED
- 3 trades created with same seller_order_id

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### CATEGORY C: PRICE-TIME PRIORITY (10 Scenarios)

#### TC-C-001: Time Priority at Same Price (FIFO)

**Feature:** Price-Time Priority Algorithm
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
At same price level, earlier order is filled first (FIFO).

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 0.5 BTC @ 50,000 USDT (order A, time T1)
2. Add limit sell: 0.5 BTC @ 50,000 USDT (order B, time T2, where T2 > T1)
3. Place market buy: 0.5 BTC
4. Verify order A filled first

**Expected Results:**
- Order A filled (created trade with seller_order_id = A)
- Order B remains in book
- FIFO strictly enforced
- CreatedAt timestamp controls priority

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-C-002: Price Priority (Best Price First)

**Feature:** Price-Time Priority Algorithm
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Best price is always matched first, regardless of time.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 0.5 BTC @ 50,100 USDT (placed first)
2. Add limit sell: 0.5 BTC @ 50,000 USDT (placed second)
3. Place market buy: 0.5 BTC
4. Verify 50,000 matched (best price)

**Expected Results:**
- Trade at 50,000 USDT (not 50,100)
- Price priority overrides time
- Best ask (lowest sell price) always matched first

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-C-003: Multiple Orders at Same Price

**Feature:** Price-Time Priority Algorithm
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Multiple orders at same price are filled in time order (FIFO).

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit buy: 0.2 BTC @ 49,000 USDT (A, time T1)
2. Add limit buy: 0.3 BTC @ 49,000 USDT (B, time T2)
3. Add limit buy: 0.25 BTC @ 49,000 USDT (C, time T3)
4. Place market sell: 0.5 BTC
5. Verify fill order

**Expected Results:**
- Order A (0.2 BTC) filled first
- Order B partially filled (0.3 BTC request, gets 0.3 BTC)
- Order C not filled or partially based on quantity
- Time stamps enforce FIFO

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-C-004: Order Placement Timestamp Matters

**Feature:** Price-Time Priority Algorithm
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Order's created_at timestamp is sole determinant for time priority.

**Preconditions:**
- Symbol: ETH/USDT

**Steps:**
1. Create order A (timestamp 10:00:00)
2. Create order B (timestamp 10:00:05)
3. Add both to book at same price
4. Verify A is preferred in matching

**Expected Results:**
- Order A placed first (older timestamp)
- Order B placed second (newer timestamp)
- Market order matches A first despite B added later

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-C-005: Earlier Order Filled First

**Feature:** Price-Time Priority Algorithm
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Earlier order (smaller timestamp) filled before later order at same price.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add order O1 @ 50,000: timestamp 10:00:00
2. Add order O2 @ 50,000: timestamp 10:00:10
3. Place market order for amount of O1
4. Verify O1 selected

**Expected Results:**
- O1 (earlier) filled
- O2 (later) remains in book
- Order.CreatedAt field determines selection

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-C-006: Later Order Waits in Queue

**Feature:** Price-Time Priority Algorithm
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Later order at same price waits for earlier orders to fill.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit buy: 0.4 BTC @ 49,500 USDT (order 1, time 1)
2. Add limit buy: 0.6 BTC @ 49,500 USDT (order 2, time 2)
3. Place market sell: 0.4 BTC
4. Verify order 2 remains in queue

**Expected Results:**
- Order 1 filled completely
- Order 2 not filled
- Order 2 remains in queue at 49,500
- Ready to match when more sell orders arrive

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-C-007: Verify Queue Order Preserved

**Feature:** Price-Time Priority Algorithm
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Order queue preserves time-order across partial fills and additions.

**Preconditions:**
- Symbol: ETH/USDT

**Steps:**
1. Add 5 buy orders @ 3,000: O1, O2, O3, O4, O5 (in time order)
2. Place market sell: 0.2 BTC (partial fill of O1)
3. Add 2 more orders: O6, O7
4. Place market sell: 0.5 BTC
5. Verify queue order: O1 (remainder), O2, O3, O4, O5, O6, O7

**Expected Results:**
- Queue order maintained throughout
- Older orders matched before newer
- Insertions respect time priority

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-C-008: Verify Best Price Always Matched

**Feature:** Price-Time Priority Algorithm
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Best available price always matched regardless of time priority.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 0.5 BTC @ 50,500 USDT (old, T1)
2. Add limit sell: 0.5 BTC @ 50,000 USDT (new, T2)
3. Place market buy: 0.5 BTC
4. Verify 50,000 matched

**Expected Results:**
- Trade at 50,000 (best ask)
- Time priority (T1 vs T2) irrelevant
- Price priority always wins

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-C-009: Cross-Side Priority Validation

**Feature:** Price-Time Priority Algorithm
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Price-Time Priority applied correctly across buy and sell sides.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add 3 limit sells @ various prices (50k, 51k, 52k)
2. Place limit buy @ 51k
3. Verify matching: should match against 50k first (best price)
4. Add more sells at same price as existing level
5. Verify time priority within level

**Expected Results:**
- Buy matches best ask (50k)
- Time priority applied within each price level
- No cross-level matching issues

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-C-010: Complex Multi-Level Scenario

**Feature:** Price-Time Priority Algorithm
**Type:** Integration Test
**Priority:** P1 (High)

**Description:**
Complex scenario testing all aspects of Price-Time Priority.

**Preconditions:**
- Symbol: BTC/USDT
- Multiple price levels and orders

**Steps:**
1. Add asks: 0.1 @ 50.0k (A1), 0.2 @ 50.1k (A2), 0.15 @ 50.1k (A3)
2. Add bids: 0.3 @ 49.5k (B1), 0.2 @ 49.5k (B2)
3. Place market buy: 0.3 BTC
4. Place market buy: 0.1 BTC
5. Place market buy: 0.15 BTC
6. Verify all matchings

**Expected Results:**
- Buy 1: Matches A1 (0.1) + A2 (0.2) = 0.3 BTC
- Buy 2: Matches A3 (0.1 of 0.15)
- Buy 3: Matches A3 (0.05 remaining)
- All price priority and time priority correct

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### CATEGORY D: EDGE CASES (10 Scenarios)

#### TC-D-001: Empty Order Book

**Feature:** Edge Cases
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Market order rejected when order book is empty.

**Preconditions:**
- Order book completely empty
- Symbol: BTC/USDT

**Steps:**
1. Verify order book is empty
2. Place market buy order: 1.0 BTC
3. Verify rejection or handling

**Expected Results:**
- Market order rejected OR
- Status: PENDING (if IOC with no fill)
- No trade created
- Order not added to book

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-D-002: Single Order in Book

**Feature:** Edge Cases
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Market order matches against single order in entire book.

**Preconditions:**
- Order book has exactly one order

**Steps:**
1. Add limit sell: 1.0 BTC @ 50,000 USDT
2. Place market buy: 1.0 BTC
3. Verify exact match

**Expected Results:**
- Trade created
- Both orders FILLED
- Order book empty
- Successful edge case handling

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-D-003: Self-Trade Prevention

**Feature:** Edge Cases / Risk Management
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Order from same user should not match own order (self-trade prevention).

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Create user ID U1
2. Add limit sell: 1.0 BTC @ 50,000 USDT (U1 order A)
3. Place limit buy: 1.0 BTC @ 50,500 USDT (U1 order B)
4. Verify no self-trade

**Expected Results:**
- No trade created between A and B
- Both orders remain in book
- Buy and sell on opposite sides prevented

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-D-004: Minimum Quantity Requirements

**Feature:** Validation
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Orders below minimum quantity are rejected.

**Preconditions:**
- Minimum order size: 0.0001 BTC

**Steps:**
1. Place limit order: 0.00001 BTC @ 50,000 (below minimum)
2. Verify rejection

**Expected Results:**
- Order rejected with validation error
- Message: "Quantity below minimum"
- Order not added to book

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-D-005: Maximum Quantity Limits

**Feature:** Validation
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Orders exceeding maximum quantity are rejected.

**Preconditions:**
- Maximum order size: 1000 BTC

**Steps:**
1. Place limit order: 1001 BTC @ 50,000 (exceeds maximum)
2. Verify rejection

**Expected Results:**
- Order rejected
- Message: "Quantity exceeds maximum"
- Order not added to book

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-D-006: Zero Quantity Orders Rejected

**Feature:** Validation
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Orders with zero quantity are rejected.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Create order with Quantity = 0
2. Attempt to place order
3. Verify rejection

**Expected Results:**
- Order rejected
- Error: "Quantity must be positive"
- Order not added to book

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-D-007: Negative Prices Rejected

**Feature:** Validation
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Orders with negative prices are rejected.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Create limit order with Price = -50,000
2. Attempt placement
3. Verify rejection

**Expected Results:**
- Order rejected
- Error: "Price must be positive"
- Order not added to book

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-D-008: Invalid Symbols Rejected

**Feature:** Validation
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Orders with invalid trading symbols are rejected.

**Preconditions:**
- Supported symbols: BTC/USDT, ETH/USDT, etc.

**Steps:**
1. Create order with Symbol = "INVALID/XXX"
2. Attempt placement
3. Verify rejection

**Expected Results:**
- Order rejected
- Error: "Invalid symbol"
- Order not added to book

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-D-009: Concurrent Order Submission

**Feature:** Concurrency / Thread Safety
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Multiple orders submitted concurrently are handled correctly.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Create 100 concurrent goroutines
2. Each submits a random order (buy or sell)
3. Wait for all to complete
4. Verify consistency

**Expected Results:**
- All orders processed without race conditions
- Order book consistent
- Correct trades created
- No deadlocks

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-D-010: Race Condition Testing

**Feature:** Concurrency / Thread Safety
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Simultaneous matching events don't cause race conditions.

**Preconditions:**
- Matching engine with concurrency

**Steps:**
1. Run Go race detector: go test -race
2. Verify no race conditions reported
3. Stress test with concurrent operations

**Expected Results:**
- Zero race conditions reported
- No data corruption
- Mutex usage correct
- RWMutex optimizations valid

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### CATEGORY E: FEE CALCULATION (5 Scenarios)

#### TC-E-001: Maker Fee Correct (0.05%)

**Feature:** Financial Accuracy
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Maker fee calculated at exactly 0.05% of notional value.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit buy: 1.0 BTC @ 50,000 USDT (maker)
2. Place market sell: 1.0 BTC (taker)
3. Verify maker fee

**Expected Results:**
- Notional: 1.0 * 50,000 = 50,000 USDT
- Maker fee: 50,000 * 0.0005 = 25 USDT
- Fee precision: 8 decimals

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-E-002: Taker Fee Correct (0.1%)

**Feature:** Financial Accuracy
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Taker fee calculated at exactly 0.1% of notional value.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit buy: 1.0 BTC @ 50,000 USDT
2. Place market sell: 1.0 BTC (taker)
3. Verify taker fee

**Expected Results:**
- Notional: 1.0 * 50,000 = 50,000 USDT
- Taker fee: 50,000 * 0.001 = 50 USDT
- Fee precision: 8 decimals

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-E-003: Fee Precision (8 Decimals)

**Feature:** Financial Accuracy
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Fee calculations maintain 8 decimal precision (cryptocurrency standard).

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit buy: 0.123456789 BTC @ 50,000.12345678 USDT
2. Place market sell
3. Calculate fee with full precision

**Expected Results:**
- Fees calculated to 8 decimal places
- No rounding errors
- Decimal.Decimal used throughout
- No float64 precision loss

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-E-004: Fee Calculation on Partial Fills

**Feature:** Financial Accuracy
**Type:** Unit Test
**Priority:** P0 (Critical)

**Description:**
Fees calculated only on filled quantity in partial fill scenario.

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Add limit sell: 1.0 BTC @ 50,000 USDT
2. Place market buy: 0.3 BTC
3. Verify fee only on 0.3 BTC

**Expected Results:**
- Fee = 0.3 * 50,000 * 0.001 = 15 USDT (for taker)
- NOT 1.0 * 50,000 * 0.001 = 50 USDT
- Fee per trade, not per order

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-E-005: Fee Rounding Behavior

**Feature:** Financial Accuracy
**Type:** Unit Test
**Priority:** P1 (High)

**Description:**
Fees rounded consistently (banker's rounding or specified method).

**Preconditions:**
- Symbol: BTC/USDT

**Steps:**
1. Calculate fees with amounts causing rounding
2. Example: 0.333... BTC @ 50,000.50 USDT
3. Verify rounding consistent

**Expected Results:**
- Rounding applied consistently
- Documentation explains rounding method
- No arbitrary truncation
- Decimal library's rounding used

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

### CATEGORY F: PERFORMANCE VALIDATION (5 Scenarios)

#### TC-F-001: 100 Matches/Second Sustained

**Feature:** Performance
**Type:** Benchmark
**Priority:** P1 (High)

**Description:**
Matching engine sustains 100 matches/second over 10-second period.

**Preconditions:**
- Order book with diverse liquidity

**Steps:**
1. Generate 100 orders/second for 10 seconds
2. Measure matching latency
3. Calculate sustainable throughput

**Expected Results:**
- Throughput: >= 100 matches/second
- No timeouts
- Consistent performance
- Memory stable

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-F-002: 1,000 Matches/Second Burst

**Feature:** Performance
**Type:** Benchmark
**Priority:** P1 (High)

**Description:**
Matching engine achieves 1,000 matches/second in burst scenario.

**Preconditions:**
- Order book with liquidity
- Warm cache

**Steps:**
1. Pre-populate order book
2. Submit 1,000 matching orders
3. Measure throughput
4. Calculate latency distribution

**Expected Results:**
- Throughput: >= 1,000 matches/second
- p50 latency: < 5ms
- p99 latency: < 10ms
- No errors

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-F-003: Latency <10ms (p99)

**Feature:** Performance
**Type:** Benchmark
**Priority:** P0 (Critical)

**Description:**
99th percentile matching latency is below 10 milliseconds.

**Preconditions:**
- Typical order book state
- 1000 concurrent orders

**Steps:**
1. Execute 10,000 matching operations
2. Collect latency measurements
3. Calculate p99 percentile

**Expected Results:**
- p99 latency: < 10ms
- p95 latency: < 5ms
- p50 latency: < 1ms
- Consistent across runs

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-F-004: Memory Usage Stable

**Feature:** Performance
**Type:** Benchmark
**Priority:** P1 (High)

**Description:**
Memory usage remains stable throughout extended matching operations.

**Preconditions:**
- Extended operation (10+ minutes)
- 1000+ orders in book

**Steps:**
1. Start memory measurement
2. Execute matching for 10 minutes
3. Add/remove orders continuously
4. Measure heap growth

**Expected Results:**
- Memory growth < 5% over test period
- No memory leaks detected
- Garbage collection effective
- Stable heap size

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

#### TC-F-005: No Memory Leaks

**Feature:** Performance
**Type:** Benchmark
**Priority:** P1 (High)

**Description:**
Extended testing reveals no memory leaks in matching logic.

**Preconditions:**
- Order book operations
- Multiple symbols

**Steps:**
1. Run memory profiler
2. Execute 100,000+ matching operations
3. Force garbage collection
4. Analyze heap dumps

**Expected Results:**
- Heap size returns to baseline
- No growing allocations
- Memory profiles clean
- pprof analysis shows no leaks

**Actual Result:**
[To be filled during testing]

**Status:** Not Tested

---

---

## Summary Statistics

**Total Test Scenarios:** 50+

**By Category:**
- A. Basic Matching: 10 scenarios
- B. Partial Fills: 10 scenarios
- C. Price-Time Priority: 10 scenarios
- D. Edge Cases: 10 scenarios
- E. Fee Calculation: 5 scenarios
- F. Performance Validation: 5 scenarios

**By Priority:**
- P0 (Critical): 23 scenarios
- P1 (High): 27 scenarios

**By Type:**
- Unit Tests: 43
- Integration Tests: 2
- Benchmark Tests: 5

---

## Test Data Requirements

### Test Symbols
- BTC/USDT
- ETH/USDT
- SOL/USDT
- (Any 10+ supported symbols)

### Price Ranges
- BTC: 40,000 - 60,000 USDT
- ETH: 2,000 - 4,000 USDT
- SOL: 50 - 300 USDT

### Quantities
- BTC: 0.0001 - 1000 BTC
- ETH: 0.001 - 10,000 ETH
- SOL: 1 - 1,000,000 SOL

### User IDs
- 100+ unique user IDs for testing

---

## Success Criteria

- [ ] All 50+ scenarios documented
- [ ] 50+ scenarios implemented
- [ ] 50+ scenarios executed
- [ ] 100% pass rate (or documented failures with root cause)
- [ ] Price-Time Priority validated (100%)
- [ ] Performance targets met
- [ ] Edge cases covered
- [ ] Fee calculations verified
- [ ] Concurrency validated
- [ ] Test report generated

---

## Next Steps

1. Implement test scenarios as code
2. Execute tests against matching engine
3. Document results (pass/fail/performance)
4. File bugs for any failures
5. Validate performance metrics
6. Generate final test report

---

**Status:** SCENARIOS DOCUMENTED, READY FOR IMPLEMENTATION

**Created:** 2025-11-25
**By:** QA Agent
**Next Update:** Post-implementation
