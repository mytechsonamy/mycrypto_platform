# Order Management API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:8085/api/v1`

## Overview

The Order Management API provides endpoints for creating, retrieving, listing, and cancelling orders in the Trade Engine. All orders are validated, have their balances reserved via the Wallet Service, and are queued for matching.

## Authentication

All API endpoints require authentication. Include the user ID in the `X-User-ID` header:

```
X-User-ID: 550e8400-e29b-41d4-a716-446655440000
```

Note: Full JWT authentication will be implemented in a future phase. For testing, a valid UUID is required.

## Endpoints

### 1. Place Order

Creates a new order in the system.

**Endpoint:** `POST /api/v1/orders`

**Request Body:**

```json
{
  "symbol": "BTC/USDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": "1.5",
  "price": "50000.00",
  "time_in_force": "GTC",
  "client_order_id": "my-order-123"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Yes | Trading pair (e.g., "BTC/USDT", "ETH/BTC") |
| side | string | Yes | Order side: "BUY" or "SELL" |
| type | string | Yes | Order type: "MARKET", "LIMIT", or "STOP" |
| quantity | string | Yes | Order quantity (decimal as string) |
| price | string | Conditional | Required for LIMIT orders |
| stop_price | string | Conditional | Required for STOP orders |
| time_in_force | string | No | "GTC" (default), "IOC", or "FOK" |
| client_order_id | string | No | Client-specified unique order ID (max 100 chars) |

**Success Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "BTC/USDT",
  "side": "BUY",
  "type": "LIMIT",
  "status": "OPEN",
  "quantity": "1.5",
  "filled_quantity": "0",
  "price": "50000.00",
  "time_in_force": "GTC",
  "client_order_id": "my-order-123",
  "created_at": "2025-11-23T10:30:45Z",
  "updated_at": "2025-11-23T10:30:45Z"
}
```

**Error Responses:**

```json
// 400 Bad Request - Invalid parameters
{
  "error": "Invalid order parameters",
  "code": "Bad Request",
  "details": {
    "error": "price must be greater than 0 for limit orders"
  }
}

// 400 Bad Request - Insufficient balance
{
  "error": "Insufficient balance",
  "code": "Bad Request",
  "details": {
    "error": "insufficient balance"
  }
}

// 409 Conflict - Duplicate client order ID
{
  "error": "Duplicate client order ID",
  "code": "Conflict",
  "details": {
    "error": "duplicate client order ID"
  }
}

// 503 Service Unavailable - Wallet service down
{
  "error": "Wallet service unavailable",
  "code": "Service Unavailable",
  "details": {
    "error": "wallet service unavailable"
  }
}
```

**Example cURL:**

```bash
curl -X POST http://localhost:8085/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "symbol": "BTC/USDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "1.5",
    "price": "50000.00",
    "time_in_force": "GTC"
  }'
```

---

### 2. Get Order

Retrieves details of a specific order.

**Endpoint:** `GET /api/v1/orders/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Order ID |

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "BTC/USDT",
  "side": "BUY",
  "type": "LIMIT",
  "status": "PARTIALLY_FILLED",
  "quantity": "1.5",
  "filled_quantity": "0.75",
  "price": "50000.00",
  "time_in_force": "GTC",
  "created_at": "2025-11-23T10:30:45Z",
  "updated_at": "2025-11-23T10:35:22Z"
}
```

**Error Responses:**

```json
// 404 Not Found
{
  "error": "Order not found",
  "code": "Not Found",
  "details": {
    "error": "order not found"
  }
}

// 403 Forbidden - Order belongs to different user
{
  "error": "Unauthorized",
  "code": "Forbidden",
  "details": {
    "error": "unauthorized access to order"
  }
}
```

**Example cURL:**

```bash
curl http://localhost:8085/api/v1/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000"
```

---

### 3. List Orders

Retrieves a list of orders for the authenticated user with optional filters.

**Endpoint:** `GET /api/v1/orders`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| symbol | string | Filter by trading pair (e.g., "BTC/USDT") |
| status | string | Filter by status (PENDING, OPEN, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED) |
| limit | integer | Maximum number of results (default: 50, max: 100) |
| offset | integer | Number of results to skip (for pagination) |

**Success Response (200 OK):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "BTC/USDT",
    "side": "BUY",
    "type": "LIMIT",
    "status": "OPEN",
    "quantity": "1.5",
    "filled_quantity": "0",
    "price": "50000.00",
    "time_in_force": "GTC",
    "created_at": "2025-11-23T10:30:45Z",
    "updated_at": "2025-11-23T10:30:45Z"
  },
  {
    "id": "660f9511-f3ab-52e5-b827-557766551111",
    "symbol": "ETH/USDT",
    "side": "SELL",
    "type": "LIMIT",
    "status": "FILLED",
    "quantity": "10.0",
    "filled_quantity": "10.0",
    "price": "3500.00",
    "time_in_force": "GTC",
    "created_at": "2025-11-23T09:15:30Z",
    "updated_at": "2025-11-23T09:20:45Z",
    "filled_at": "2025-11-23T09:20:45Z"
  }
]
```

**Example cURL:**

```bash
# List all orders
curl http://localhost:8085/api/v1/orders \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000"

# List orders for BTC/USDT, status OPEN, limit 10
curl "http://localhost:8085/api/v1/orders?symbol=BTC/USDT&status=OPEN&limit=10" \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000"

# Pagination example (page 2, 20 per page)
curl "http://localhost:8085/api/v1/orders?limit=20&offset=20" \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000"
```

---

### 4. Cancel Order

Cancels an existing order and releases reserved balance.

**Endpoint:** `DELETE /api/v1/orders/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Order ID to cancel |

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "BTC/USDT",
  "side": "BUY",
  "type": "LIMIT",
  "status": "CANCELLED",
  "quantity": "1.5",
  "filled_quantity": "0",
  "price": "50000.00",
  "time_in_force": "GTC",
  "created_at": "2025-11-23T10:30:45Z",
  "updated_at": "2025-11-23T10:40:12Z",
  "cancelled_at": "2025-11-23T10:40:12Z"
}
```

**Error Responses:**

```json
// 404 Not Found
{
  "error": "Order not found",
  "code": "Not Found",
  "details": {
    "error": "order not found"
  }
}

// 409 Conflict - Order cannot be cancelled
{
  "error": "Order cannot be cancelled",
  "code": "Conflict",
  "details": {
    "error": "order cannot be cancelled in current status"
  }
}

// 403 Forbidden - Order belongs to different user
{
  "error": "Unauthorized",
  "code": "Forbidden",
  "details": {
    "error": "unauthorized access to order"
  }
}
```

**Example cURL:**

```bash
curl -X DELETE http://localhost:8085/api/v1/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000"
```

---

## Order Lifecycle

1. **PENDING** - Order created, validating
2. **OPEN** - Order validated, waiting for match
3. **PARTIALLY_FILLED** - Order partially matched
4. **FILLED** - Order completely matched
5. **CANCELLED** - Order cancelled by user
6. **REJECTED** - Order rejected (validation failed, insufficient balance, etc.)

## Order Types

### MARKET Order

Executes immediately at the best available price.

```json
{
  "symbol": "BTC/USDT",
  "side": "BUY",
  "type": "MARKET",
  "quantity": "1.0",
  "time_in_force": "IOC"
}
```

- No `price` field
- Usually uses `IOC` or `FOK` time in force
- Executes against the best available orders in the book

### LIMIT Order

Executes at a specified price or better.

```json
{
  "symbol": "BTC/USDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": "1.5",
  "price": "50000.00",
  "time_in_force": "GTC"
}
```

- Requires `price` field
- Remains in order book until filled or cancelled
- Can use any time in force option

### STOP Order

Triggers when price reaches stop price.

```json
{
  "symbol": "BTC/USDT",
  "side": "SELL",
  "type": "STOP",
  "quantity": "1.0",
  "stop_price": "48000.00",
  "time_in_force": "GTC"
}
```

- Requires `stop_price` field
- Converts to market order when stop price is reached

## Time In Force Options

- **GTC (Good Till Cancelled)**: Order remains active until filled or manually cancelled
- **IOC (Immediate or Cancel)**: Execute immediately, cancel unfilled portion
- **FOK (Fill or Kill)**: Execute completely or cancel entirely

## Balance Reservation

When an order is placed:

1. **Buy Orders**: Quote currency is reserved (quantity × price)
   - Example: BUY 1.5 BTC @ 50000 USDT → Reserve 75000 USDT

2. **Sell Orders**: Base currency is reserved (quantity)
   - Example: SELL 1.5 BTC → Reserve 1.5 BTC

Reserved balance is released when:
- Order is cancelled
- Order is filled (transferred to counterparty)
- Order is rejected

## Client Order ID

Optional field for idempotency and tracking:

```json
{
  "client_order_id": "my-unique-id-123"
}
```

- Must be unique per user
- Prevents duplicate orders
- Useful for reconciliation
- Maximum 100 characters

## Error Codes

| HTTP Code | Error Message | Description |
|-----------|---------------|-------------|
| 400 | Invalid request body | Malformed JSON |
| 400 | Invalid order parameters | Validation failed |
| 400 | Insufficient balance | Not enough funds |
| 401 | Invalid user ID | Authentication failed |
| 403 | Unauthorized | Order belongs to different user |
| 404 | Order not found | Order ID doesn't exist |
| 409 | Duplicate client order ID | client_order_id already used |
| 409 | Order cannot be cancelled | Order in final state |
| 500 | Internal server error | Unexpected error |
| 503 | Wallet service unavailable | Wallet service down |

## Rate Limiting

Not implemented in MVP. Planned for future releases.

## Testing

### Test User IDs

For testing, use any valid UUID:

```
550e8400-e29b-41d4-a716-446655440000
660f9511-f3ab-52e5-b827-557766551111
770f8622-g4bc-63f6-c938-668877662222
```

### Mock Wallet Service

By default, the wallet service uses a mock client for testing:

```yaml
# config.yaml
wallet_client:
  use_mock: true  # Set to false for production
```

The mock client:
- Always returns success for balance reservations
- Generates fake reservation IDs
- Allows all operations without real balance checks

### Sample Test Scenarios

**1. Place a buy limit order:**

```bash
curl -X POST http://localhost:8085/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "symbol": "BTC/USDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "2.0",
    "price": "50000.00"
  }'
```

**2. List all BTC/USDT orders:**

```bash
curl "http://localhost:8085/api/v1/orders?symbol=BTC/USDT" \
  -H "X-User-ID": "550e8400-e29b-41d4-a716-446655440000"
```

**3. Cancel an order:**

```bash
curl -X DELETE http://localhost:8085/api/v1/orders/{order-id} \
  -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000"
```

## Monitoring

All order operations are instrumented with Prometheus metrics:

- `trade_engine_orders_created_total{side, type}` - Counter of orders created
- `trade_engine_orders_cancelled_total{reason}` - Counter of orders cancelled
- `trade_engine_database_query_duration_seconds{operation, table}` - Database query latency
- `trade_engine_http_requests_total{method, path, status}` - HTTP request counter
- `trade_engine_http_request_duration_seconds{method, path}` - HTTP request latency

View metrics at: `http://localhost:8085/metrics`

## Next Steps

This is Phase 1 (MVP) of the Order Management API. Future enhancements include:

- Order matching engine integration
- Trade execution and settlement
- Order book snapshots and updates
- WebSocket order updates
- Advanced order types (Stop-Limit, Trailing Stop, etc.)
- Order history and analytics
- Bulk order operations

## Support

For issues or questions:
- Check service health: `GET /health`
- Check service readiness: `GET /ready`
- View logs: Check Trade Engine logs for detailed error messages
- View metrics: `http://localhost:8085/metrics`
