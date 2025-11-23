# Trade Engine API Endpoints Reference

**Version:** 2.0 (Day 5 - HTTP API Integration)
**Base URL:** `http://localhost:8080/api/v1`
**Authentication:** X-User-ID header (temporary - JWT not yet implemented)

---

## Order Management Endpoints

### 1. Place Order
**Endpoint:** `POST /api/v1/orders`

**Description:** Place a new order and execute matching. Returns the order details and any executed trades.

**Request Headers:**
```
Content-Type: application/json
X-User-ID: {user-uuid}
```

**Request Body:**
```json
{
  "symbol": "BTC-USDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": "1.5",
  "price": "50000.00",
  "time_in_force": "GTC",
  "client_order_id": "my-order-123"
}
```

**Field Descriptions:**
- `symbol` (required): Trading pair (e.g., "BTC-USDT")
- `side` (required): "BUY" or "SELL"
- `type` (required): "MARKET" or "LIMIT"
- `quantity` (required): Order quantity (decimal string)
- `price` (required for LIMIT): Price per unit (decimal string)
- `time_in_force` (optional): "GTC", "IOC", or "FOK" (default: "GTC")
- `client_order_id` (optional): User-defined order identifier

**Response (201 Created):**
```json
{
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "BTC-USDT",
    "side": "BUY",
    "type": "LIMIT",
    "status": "PARTIALLY_FILLED",
    "quantity": "1.5",
    "filled_quantity": "0.8",
    "price": "50000.00",
    "time_in_force": "GTC",
    "client_order_id": "my-order-123",
    "created_at": "2025-11-23T10:30:45Z",
    "updated_at": "2025-11-23T10:30:45Z"
  },
  "trades": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "symbol": "BTC-USDT",
      "price": "50000.00",
      "quantity": "0.8",
      "buyer_order_id": "550e8400-e29b-41d4-a716-446655440000",
      "seller_order_id": "770e8400-e29b-41d4-a716-446655440000",
      "buyer_user_id": "user-123",
      "seller_user_id": "user-456",
      "buyer_fee": "20.00",
      "seller_fee": "10.00",
      "is_buyer_maker": false,
      "executed_at": "2025-11-23T10:30:45Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid X-User-ID
- `503 Service Unavailable`: Wallet service unavailable

---

### 2. Get Order
**Endpoint:** `GET /api/v1/orders/{id}`

**Description:** Retrieve order details by order ID.

**Request Headers:**
```
X-User-ID: {user-uuid}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "BTC-USDT",
  "side": "BUY",
  "type": "LIMIT",
  "status": "FILLED",
  "quantity": "1.5",
  "filled_quantity": "1.5",
  "price": "50000.00",
  "time_in_force": "GTC",
  "created_at": "2025-11-23T10:30:45Z",
  "updated_at": "2025-11-23T10:30:46Z",
  "filled_at": "2025-11-23T10:30:46Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid order ID format
- `403 Forbidden`: Order belongs to different user
- `404 Not Found`: Order not found

---

### 3. List Orders
**Endpoint:** `GET /api/v1/orders`

**Description:** List orders for the authenticated user with optional filters.

**Request Headers:**
```
X-User-ID: {user-uuid}
```

**Query Parameters:**
- `symbol` (optional): Filter by symbol (e.g., "BTC-USDT")
- `status` (optional): Filter by status ("OPEN", "FILLED", "CANCELLED", etc.)
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```
GET /api/v1/orders?symbol=BTC-USDT&status=OPEN&limit=20
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "BTC-USDT",
    "side": "BUY",
    "type": "LIMIT",
    "status": "OPEN",
    "quantity": "1.5",
    "filled_quantity": "0.0",
    "price": "50000.00",
    "created_at": "2025-11-23T10:30:45Z"
  }
]
```

---

### 4. Cancel Order
**Endpoint:** `DELETE /api/v1/orders/{id}`

**Description:** Cancel an existing order.

**Request Headers:**
```
X-User-ID: {user-uuid}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "BTC-USDT",
  "side": "BUY",
  "type": "LIMIT",
  "status": "CANCELLED",
  "quantity": "1.5",
  "filled_quantity": "0.8",
  "price": "50000.00",
  "cancelled_at": "2025-11-23T10:31:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid order ID
- `403 Forbidden`: Order belongs to different user
- `404 Not Found`: Order not found
- `409 Conflict`: Order cannot be cancelled (already filled/cancelled)

---

## Market Data Endpoints

### 5. Get Order Book
**Endpoint:** `GET /api/v1/orderbook/{symbol}`

**Description:** Retrieve current order book snapshot with bids and asks.

**Query Parameters:**
- `depth` (optional): Number of price levels (default: 50, max: 100)

**Example Request:**
```
GET /api/v1/orderbook/BTC-USDT?depth=10
```

**Response (200 OK):**
```json
{
  "symbol": "BTC-USDT",
  "bids": [
    {
      "price": "50000.00",
      "volume": "5.2",
      "count": 3
    },
    {
      "price": "49999.00",
      "volume": "2.1",
      "count": 1
    }
  ],
  "asks": [
    {
      "price": "50001.00",
      "volume": "3.5",
      "count": 2
    },
    {
      "price": "50002.00",
      "volume": "1.8",
      "count": 1
    }
  ],
  "timestamp": "2025-11-23T10:30:45Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid symbol
- `404 Not Found`: No order book exists for symbol

---

### 6. List Recent Trades
**Endpoint:** `GET /api/v1/trades`

**Description:** Retrieve recent executed trades for a symbol.

**Query Parameters:**
- `symbol` (required): Trading symbol (e.g., "BTC-USDT")
- `limit` (optional): Max results (default: 50, max: 500)

**Example Request:**
```
GET /api/v1/trades?symbol=BTC-USDT&limit=20
```

**Response (200 OK):**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "symbol": "BTC-USDT",
    "price": "50000.50",
    "quantity": "1.2",
    "buyer_order_id": "550e8400-e29b-41d4-a716-446655440000",
    "seller_order_id": "770e8400-e29b-41d4-a716-446655440000",
    "buyer_user_id": "user-123",
    "seller_user_id": "user-456",
    "buyer_fee": "30.00",
    "seller_fee": "15.00",
    "is_buyer_maker": true,
    "executed_at": "2025-11-23T10:30:45Z"
  }
]
```

**Error Responses:**
- `400 Bad Request`: Missing or invalid symbol

---

### 7. Get Trade
**Endpoint:** `GET /api/v1/trades/{id}`

**Description:** Retrieve trade details by trade ID.

**Response (200 OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "symbol": "BTC-USDT",
  "price": "50000.50",
  "quantity": "1.2",
  "buyer_order_id": "550e8400-e29b-41d4-a716-446655440000",
  "seller_order_id": "770e8400-e29b-41d4-a716-446655440000",
  "buyer_user_id": "user-123",
  "seller_user_id": "user-456",
  "buyer_fee": "30.00",
  "seller_fee": "15.00",
  "is_buyer_maker": true,
  "executed_at": "2025-11-23T10:30:45Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid trade ID format
- `404 Not Found`: Trade not found

---

### 8. Get Market Ticker
**Endpoint:** `GET /api/v1/markets/{symbol}/ticker`

**Description:** Retrieve current market ticker data for a symbol.

**Example Request:**
```
GET /api/v1/markets/BTC-USDT/ticker
```

**Response (200 OK):**
```json
{
  "symbol": "BTC-USDT",
  "last_price": "50000.50",
  "best_bid_price": "50000.00",
  "best_ask_price": "50001.00",
  "best_bid_volume": "5.2",
  "best_ask_volume": "3.5",
  "spread": "1.00",
  "spread_percentage": "0.00",
  "total_bids_volume": "125.5",
  "total_asks_volume": "98.3",
  "timestamp": "2025-11-23T10:30:45Z"
}
```

**Field Descriptions:**
- `last_price`: Price of most recent trade
- `best_bid_price`: Highest buy order price
- `best_ask_price`: Lowest sell order price
- `spread`: Absolute price difference (ask - bid)
- `spread_percentage`: Spread as percentage of bid price
- `total_bids_volume`: Total volume in all buy orders
- `total_asks_volume`: Total volume in all sell orders

**Error Responses:**
- `400 Bad Request`: Invalid symbol
- `404 Not Found`: No market data for symbol

---

## Common Error Response Format

All endpoints return errors in the following format:

```json
{
  "error": "Human-readable error message",
  "code": "HTTP_STATUS_TEXT",
  "details": {
    "error": "Detailed error description"
  }
}
```

**HTTP Status Codes:**
- `200 OK`: Successful GET request
- `201 Created`: Successful POST request (order placed)
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Access denied (not your resource)
- `404 Not Found`: Resource not found
- `409 Conflict`: Operation not allowed (e.g., can't cancel filled order)
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: External service (wallet) unavailable

---

## Order Status Values

- `PENDING`: Order created, not yet submitted to matching engine
- `OPEN`: Order active in order book, awaiting match
- `PARTIALLY_FILLED`: Order partially matched, remaining quantity in book
- `FILLED`: Order completely matched
- `CANCELLED`: Order cancelled by user or system
- `REJECTED`: Order rejected by matching engine (validation failed)

---

## Time-in-Force Values

- `GTC` (Good-Till-Cancel): Order remains in book until filled or cancelled
- `IOC` (Immediate-or-Cancel): Match immediately, cancel unfilled portion
- `FOK` (Fill-or-Kill): Fill completely or reject entire order

---

## Testing Examples (cURL)

### Place Limit Buy Order
```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "1.5",
    "price": "50000.00",
    "time_in_force": "GTC"
  }'
```

### Get Order Book
```bash
curl http://localhost:8080/api/v1/orderbook/BTC-USDT?depth=20
```

### Get Recent Trades
```bash
curl http://localhost:8080/api/v1/trades?symbol=BTC-USDT&limit=50
```

### Get Market Ticker
```bash
curl http://localhost:8080/api/v1/markets/BTC-USDT/ticker
```

### Cancel Order
```bash
curl -X DELETE http://localhost:8080/api/v1/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000"
```

---

## Notes

1. **Authentication**: Currently using X-User-ID header. Will be replaced with JWT in production.
2. **Decimal Precision**: All prices and quantities use 8 decimal places.
3. **Timestamps**: All timestamps in ISO 8601 format (UTC).
4. **Order Matching**: Uses Price-Time Priority algorithm.
5. **Fees**: Maker fee: 0.05%, Taker fee: 0.10% (configurable).
6. **Performance**: Target 100 orders/sec sustained, matching engine capable of 1000+ matches/sec.

---

## Integration with Settlement Service

Trades from the `/orders` endpoint are automatically persisted with `settlement_status: "PENDING"`. The settlement service (TASK-BACKEND-008) will:
1. Query pending trades via TradeRepository
2. Execute wallet debits/credits
3. Mark trades as settled

---

**Last Updated:** 2025-11-23
**API Version:** 2.0
**Matching Engine Version:** Day 4 (476K ops/sec)
