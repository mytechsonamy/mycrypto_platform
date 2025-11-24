# Trading Module - NestJS Trade Engine Integration

This module provides a NestJS wrapper around the Go Trade Engine API, enabling the auth-service to place orders, query order books, and retrieve market data.

## Architecture

```
┌─────────────────────┐
│ TradingController   │ ← REST API endpoints
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  TradingService     │ ← Business logic layer
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ TradeEngineClient   │ ← HTTP client wrapper
└──────────┬──────────┘
           │
           ▼
   Go Trade Engine API
   (http://localhost:8080/api/v1)
```

## Components

### 1. TradeEngineClient (`services/trade-engine.client.ts`)

Low-level HTTP client for communicating with the Go Trade Engine.

**Methods:**
- `placeOrder(userId, orderRequest)` - Place a new order
- `getOrderBook(symbol, depth)` - Get order book for a trading pair
- `getMarketData(symbol)` - Get market ticker data
- `getUserOrders(userId, status?)` - Get user's orders
- `getOrder(userId, orderId)` - Get specific order details
- `cancelOrder(userId, orderId)` - Cancel an order
- `getTrades(symbol?, limit?)` - Get recent trades

**Features:**
- Service-to-service authentication via Bearer token
- Comprehensive error handling (network errors, HTTP errors)
- 10-second request timeout
- Structured logging with trace context
- Automatic error mapping to NestJS exceptions

### 2. TradingService (`services/trading.service.ts`)

Business logic layer that wraps the TradeEngineClient.

**Responsibilities:**
- DTO transformation (NestJS ↔ Trade Engine formats)
- Additional logging and error context
- Business rule validation (future)

### 3. TradingController (`controllers/trading.controller.ts`)

REST API endpoints for trading operations.

**Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/trading/orders` | JWT | Place a new order |
| GET | `/api/v1/trading/orders` | JWT | Get user's orders |
| GET | `/api/v1/trading/orders/:orderId` | JWT | Get specific order |
| DELETE | `/api/v1/trading/orders/:orderId` | JWT | Cancel an order |
| GET | `/api/v1/trading/orderbook/:symbol` | JWT | Get order book |
| GET | `/api/v1/trading/markets/:symbol/ticker` | JWT | Get market ticker |
| GET | `/api/v1/trading/trades` | JWT | Get recent trades |

### 4. DTOs (`dto/create-order.dto.ts`)

**CreateOrderDTO:**
```typescript
{
  symbol: string;           // e.g., "BTC-USDT"
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop_market' | 'stop_limit';
  quantity: string;         // decimal as string
  price?: string;           // required for limit orders
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  triggerPrice?: string;    // for stop orders
  postOnly?: boolean;       // maker-only flag
}
```

## Configuration

### Environment Variables

Add to `.env`:

```env
# Trade Engine API base URL
TRADE_ENGINE_API_URL=http://localhost:8080/api/v1

# Service-to-service authentication token
TRADE_ENGINE_SERVICE_TOKEN=your-secure-service-token
```

### Module Registration

Already registered in `app.module.ts`:

```typescript
@Module({
  imports: [
    // ...
    TradingModule,
  ],
})
export class AppModule {}
```

## Usage Examples

### Place a Limit Order

```bash
curl -X POST http://localhost:3001/api/v1/trading/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
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

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user123",
      "symbol": "BTC-USDT",
      "side": "buy",
      "type": "limit",
      "status": "open",
      "quantity": "0.1",
      "filled_quantity": "0",
      "remaining_quantity": "0.1",
      "price": "50000.00",
      "time_in_force": "GTC",
      "created_at": "2025-11-23T00:00:00Z"
    },
    "trades": []
  }
}
```

### Get Order Book

```bash
curl http://localhost:3001/api/v1/trading/orderbook/BTC-USDT?depth=20 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-USDT",
    "bids": [
      { "price": "50000.00", "quantity": "1.5", "order_count": 3 },
      { "price": "49999.00", "quantity": "2.0", "order_count": 5 }
    ],
    "asks": [
      { "price": "50001.00", "quantity": "1.0", "order_count": 2 },
      { "price": "50002.00", "quantity": "3.0", "order_count": 4 }
    ],
    "timestamp": "2025-11-23T00:00:00Z"
  }
}
```

### Get Market Ticker

```bash
curl http://localhost:3001/api/v1/trading/markets/BTC-USDT/ticker \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC-USDT",
    "last_price": "50000.00",
    "bid_price": "49999.00",
    "ask_price": "50001.00",
    "high_24h": "51000.00",
    "low_24h": "49000.00",
    "volume_24h": "1000.00",
    "price_change_24h": "1000.00",
    "price_change_percent_24h": "2.04",
    "timestamp": "2025-11-23T00:00:00Z"
  }
}
```

### Cancel an Order

```bash
curl -X DELETE http://localhost:3001/api/v1/trading/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Error Handling

The module handles various error scenarios:

### Network Errors

- `ECONNREFUSED` → `ServiceUnavailableException` (503)
- `ENOTFOUND` → `ServiceUnavailableException` (503)
- `ETIMEDOUT` → `ServiceUnavailableException` (503)

### HTTP Errors

- `400 Bad Request` → `BadRequestException` (400)
- `404 Not Found` → `NotFoundException` (404)
- `503 Service Unavailable` → `ServiceUnavailableException` (503)
- Other errors → `InternalServerErrorException` (500)

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Invalid order parameters",
  "error": "Bad Request"
}
```

## Testing

### Run Tests

```bash
# Run all trading module tests
npm test -- --testPathPatterns=trading

# Run with coverage
npm test -- --testPathPatterns=trading --coverage

# Run specific test file
npm test trade-engine.client.spec.ts
```

### Test Coverage

- **TradeEngineClient:** 100% coverage (40+ test cases)
- **TradingService:** 100% coverage (error scenarios, success paths)
- **TradingController:** 100% coverage (all endpoints tested)

### Test Files

- `tests/trade-engine.client.spec.ts` - HTTP client unit tests
- `tests/trading.service.spec.ts` - Service layer unit tests
- `tests/trading.controller.spec.ts` - Controller integration tests

## Security Considerations

1. **Authentication:**
   - All endpoints require JWT authentication
   - Service-to-service token for Trade Engine communication

2. **User Isolation:**
   - User ID from JWT is passed in `X-User-ID` header
   - Trade Engine validates user ownership of orders

3. **Input Validation:**
   - All DTOs use `class-validator` decorators
   - Type safety enforced at compile-time

4. **Rate Limiting:**
   - Inherited from global rate limiting configuration
   - Consider per-user trading limits (future enhancement)

## Performance

- **Timeout:** 10 seconds per request
- **Connection Pooling:** HttpModule handles connection reuse
- **Caching:** None (real-time data requirement)
- **Retries:** Not implemented (fail-fast for trading operations)

## Monitoring & Logging

All operations are logged with structured JSON format:

```json
{
  "timestamp": "2025-11-23T00:00:00Z",
  "level": "info",
  "context": "TradingService",
  "message": "Order placed successfully for user user123",
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "BTC-USDT",
  "side": "buy"
}
```

## Future Enhancements

- [ ] WebSocket integration for real-time updates
- [ ] Order validation against user balances
- [ ] Trading limits and risk management
- [ ] Order history pagination
- [ ] Advanced order types (OCO, trailing stops)
- [ ] Retry logic with exponential backoff
- [ ] Circuit breaker pattern for resilience
- [ ] Metrics and monitoring (Prometheus)

## Troubleshooting

### Trade Engine Unavailable

**Symptom:** `ServiceUnavailableException: Trade Engine service unavailable`

**Solutions:**
1. Check if Trade Engine is running: `curl http://localhost:8080/health`
2. Verify `TRADE_ENGINE_API_URL` in `.env`
3. Check network connectivity

### Authentication Errors

**Symptom:** 401 Unauthorized responses

**Solutions:**
1. Verify `TRADE_ENGINE_SERVICE_TOKEN` is configured
2. Check JWT token is valid and not expired
3. Ensure user ID is present in JWT payload

### Order Placement Fails

**Symptom:** `BadRequestException: Invalid order parameters`

**Solutions:**
1. Verify order DTO fields (price required for limit orders)
2. Check symbol format (e.g., "BTC-USDT" not "BTCUSDT")
3. Ensure quantity is positive decimal string

## API Documentation

Full OpenAPI/Swagger documentation available at:
- Development: `http://localhost:3001/api`
- Tag: `Trading`

## Dependencies

- `@nestjs/axios` - HTTP client
- `@nestjs/config` - Configuration management
- `rxjs` - Reactive programming (used by HttpService)
- `class-validator` - DTO validation
- `class-transformer` - DTO transformation

## Contact

For questions or issues:
- Backend Team Lead
- Trade Engine Team
