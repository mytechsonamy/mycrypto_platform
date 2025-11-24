# Trading API Quick Start Guide

## Setup (5 minutes)

### 1. Environment Configuration

Add to `/services/auth-service/.env`:

```env
TRADE_ENGINE_API_URL=http://localhost:8080/api/v1
TRADE_ENGINE_SERVICE_TOKEN=dev-service-token-change-in-production
```

### 2. Start Services

```bash
# Terminal 1: Start Trade Engine
cd services/trade-engine
go run cmd/server/main.go

# Terminal 2: Start Auth Service
cd services/auth-service
npm run start:dev
```

### 3. Verify Setup

```bash
# Check Trade Engine
curl http://localhost:8080/health

# Check Auth Service
curl http://localhost:3001/health
```

## API Endpoints

Base URL: `http://localhost:3001/api/v1/trading`

All endpoints require JWT authentication in header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Place Order

```bash
curl -X POST http://localhost:3001/api/v1/trading/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC-USDT",
    "side": "buy",
    "type": "limit",
    "quantity": "0.1",
    "price": "50000.00",
    "timeInForce": "GTC"
  }'
```

### Get Order Book

```bash
curl http://localhost:3001/api/v1/trading/orderbook/BTC-USDT?depth=20 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Market Ticker

```bash
curl http://localhost:3001/api/v1/trading/markets/BTC-USDT/ticker \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List Orders

```bash
# All orders
curl http://localhost:3001/api/v1/trading/orders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by status
curl http://localhost:3001/api/v1/trading/orders?status=open \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Cancel Order

```bash
curl -X DELETE http://localhost:3001/api/v1/trading/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Recent Trades

```bash
# All trades
curl http://localhost:3001/api/v1/trading/trades \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by symbol
curl http://localhost:3001/api/v1/trading/trades?symbol=BTC-USDT&limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Order Types

### Market Order
Executes immediately at best available price:
```json
{
  "symbol": "BTC-USDT",
  "side": "buy",
  "type": "market",
  "quantity": "0.1"
}
```

### Limit Order
Executes at specified price or better:
```json
{
  "symbol": "BTC-USDT",
  "side": "buy",
  "type": "limit",
  "quantity": "0.1",
  "price": "50000.00",
  "timeInForce": "GTC"
}
```

### Stop Market Order
Triggers market order when price reaches trigger:
```json
{
  "symbol": "BTC-USDT",
  "side": "sell",
  "type": "stop_market",
  "quantity": "0.1",
  "triggerPrice": "49000.00"
}
```

## Order Parameters

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| symbol | Yes | string | Trading pair (e.g., "BTC-USDT") |
| side | Yes | enum | "buy" or "sell" |
| type | Yes | enum | "market", "limit", "stop_market", "stop_limit" |
| quantity | Yes | string | Order size (decimal as string) |
| price | Conditional | string | Required for limit orders |
| timeInForce | No | enum | "GTC", "IOC", "FOK" (default: GTC) |
| triggerPrice | Conditional | string | Required for stop orders |
| postOnly | No | boolean | Maker-only flag (default: false) |

## Time In Force Options

- **GTC** (Good Till Cancel): Order stays active until filled or cancelled
- **IOC** (Immediate Or Cancel): Fill immediately, cancel unfilled portion
- **FOK** (Fill Or Kill): Fill entire order immediately or cancel

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "symbol": "BTC-USDT",
      "side": "buy",
      "type": "limit",
      "status": "open",
      "quantity": "0.1",
      "filled_quantity": "0",
      "remaining_quantity": "0.1",
      "price": "50000.00",
      "created_at": "2025-11-23T00:00:00Z"
    },
    "trades": []
  },
  "meta": {
    "timestamp": "2025-11-23T00:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Invalid order parameters",
  "error": "Bad Request"
}
```

## Common Error Codes

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | BadRequestException | Invalid order parameters | Check order fields |
| 401 | UnauthorizedException | Missing/invalid JWT | Provide valid token |
| 404 | NotFoundException | Order/Symbol not found | Verify ID/symbol |
| 503 | ServiceUnavailableException | Trade Engine down | Check Trade Engine status |

## Testing

### Run Tests

```bash
cd services/auth-service

# Run all trading tests
npm test -- --testPathPatterns=trading

# Run with coverage
npm test -- --testPathPatterns=trading --coverage

# Run specific test file
npm test trade-engine.client.spec.ts
```

### Manual Testing

1. **Get JWT Token:**
```bash
# Login first
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Copy accessToken from response
```

2. **Use Token:**
```bash
export JWT_TOKEN="YOUR_ACCESS_TOKEN"

curl http://localhost:3001/api/v1/trading/orderbook/BTC-USDT \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Swagger Documentation

Access interactive API documentation:

**URL:** http://localhost:3001/api

Navigate to "Trading" section for:
- Endpoint descriptions
- Request/response schemas
- Try-it-out functionality

## Troubleshooting

### Trade Engine Not Responding

**Error:** `ServiceUnavailableException: Trade Engine service unavailable`

**Check:**
```bash
# Is Trade Engine running?
curl http://localhost:8080/health

# Check logs
cd services/trade-engine
tail -f logs/trade-engine.log
```

### Authentication Errors

**Error:** `401 Unauthorized`

**Solutions:**
1. Verify JWT token is valid
2. Check token hasn't expired
3. Ensure "Bearer " prefix in Authorization header

### Invalid Order Parameters

**Error:** `400 Bad Request: Invalid order parameters`

**Common Mistakes:**
- Missing `price` for limit orders
- Missing `triggerPrice` for stop orders
- Invalid symbol format (use "BTC-USDT" not "BTCUSDT")
- Negative or zero quantity

## Code Examples

### TypeScript/JavaScript

```typescript
// Place Order
async function placeOrder(token: string) {
  const response = await fetch('http://localhost:3001/api/v1/trading/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      symbol: 'BTC-USDT',
      side: 'buy',
      type: 'limit',
      quantity: '0.1',
      price: '50000.00',
    }),
  });

  return response.json();
}

// Get Order Book
async function getOrderBook(token: string, symbol: string) {
  const response = await fetch(
    `http://localhost:3001/api/v1/trading/orderbook/${symbol}?depth=20`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return response.json();
}
```

### Python

```python
import requests

# Place Order
def place_order(token):
    response = requests.post(
        'http://localhost:3001/api/v1/trading/orders',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
        json={
            'symbol': 'BTC-USDT',
            'side': 'buy',
            'type': 'limit',
            'quantity': '0.1',
            'price': '50000.00',
        }
    )
    return response.json()

# Get Order Book
def get_order_book(token, symbol):
    response = requests.get(
        f'http://localhost:3001/api/v1/trading/orderbook/{symbol}',
        headers={'Authorization': f'Bearer {token}'},
        params={'depth': 20}
    )
    return response.json()
```

## Performance Tips

1. **Use appropriate depth for order book:**
   - Default: 20 levels
   - For charts: 50-100 levels
   - For quick quotes: 1-5 levels

2. **Filter trades by symbol:**
   - More efficient than fetching all trades
   - Reduces response size

3. **Batch order queries:**
   - Use status filter to get only active orders
   - Reduces unnecessary data transfer

## Security Best Practices

1. **Never hardcode tokens in code**
2. **Use environment variables for sensitive data**
3. **Implement token refresh logic**
4. **Validate all inputs on frontend**
5. **Handle errors gracefully without exposing system details**

## Next Steps

1. ✅ Environment configured
2. ✅ Services running
3. ✅ API tested manually
4. 📱 Implement frontend trading UI
5. 🧪 Run integration tests
6. 🚀 Deploy to staging

## Support

- **Documentation:** `/services/auth-service/src/trading/README.md`
- **API Docs:** http://localhost:3001/api
- **Issues:** Contact Backend Team Lead
- **Trade Engine:** Contact Go Services Team

---

**Last Updated:** November 23, 2025
**Version:** 1.0.0
