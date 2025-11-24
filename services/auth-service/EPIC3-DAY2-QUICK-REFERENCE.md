# EPIC 3 Day 2 - Quick Reference Guide

## Quick Start

### 1. Depth Chart API

**Endpoint:** `GET /api/v1/market/orderbook/:symbol/depth-chart`

**Example:**
```bash
curl http://localhost:3000/api/v1/market/orderbook/BTC_TRY/depth-chart
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC_TRY",
    "bids": [
      {
        "price": "50000.00000000",
        "volume": "1.50000000",
        "cumulative": "1.50000000",
        "percentage": "33.33"
      }
    ],
    "asks": [...],
    "spread": {
      "value": "100.00000000",
      "percentage": "0.20%"
    },
    "maxBidVolume": "4.50000000",
    "maxAskVolume": "5.00000000",
    "timestamp": "2025-11-25T10:00:00Z"
  }
}
```

---

### 2. User Order Highlighting (WebSocket)

**Connect:**
```javascript
const socket = io('http://localhost:3000/market')
```

**Subscribe:**
```javascript
socket.emit('subscribe_user_orders', { userId: 'user-uuid' })
```

**Listen:**
```javascript
socket.on('user_order_prices', (event) => {
  console.log('Price levels:', event.prices)
  // ["50000.00000000", "49990.00000000", ...]
})
```

**Unsubscribe:**
```javascript
socket.emit('unsubscribe_user_orders')
```

---

### 3. Circuit Breaker Status

**Get Metrics (internal):**
```typescript
const metrics = tradeEngineClient.getCircuitBreakerMetrics()
console.log(metrics)
// {
//   state: 'CLOSED',
//   failureCount: 0,
//   lastFailureTime: null,
//   nextAttemptTime: null
// }
```

**Check Status:**
```typescript
const isOpen = tradeEngineClient.isCircuitOpen()
```

---

## File Structure

```
services/auth-service/src/
├── market/
│   ├── dto/
│   │   └── depth-chart-response.dto.ts          # NEW
│   ├── services/
│   │   ├── market.service.ts                     # ENHANCED
│   │   └── user-order-highlight.service.ts       # NEW
│   ├── controllers/
│   │   └── market.controller.ts                  # ENHANCED
│   ├── gateways/
│   │   └── market.gateway.ts                     # ENHANCED
│   └── tests/
│       ├── market.service.depth-chart.spec.ts    # NEW
│       ├── user-order-highlight.service.spec.ts  # NEW
│       └── market.controller.depth-chart.integration.spec.ts # NEW
├── common/
│   └── utils/
│       ├── circuit-breaker.ts                    # NEW
│       └── circuit-breaker.spec.ts               # NEW
└── trading/
    └── services/
        └── trade-engine.client.ts                # ENHANCED
```

---

## Key Methods

### MarketService
- `getDepthChart(symbol: string): Promise<DepthChartResponseDto>`

### UserOrderHighlightService
- `getHighlightedPrices(userId: string): Promise<string[]>`
- `buildUserOrderPricesEvent(userId: string, prices: string[]): UserOrderPricesEvent`
- `invalidateUserCache(userId: string): Promise<void>`

### MarketGateway (WebSocket)
- `handleSubscribeUserOrders(data: { userId: string }, client: Socket)`
- `handleUnsubscribeUserOrders(client: Socket)`
- `broadcastUserOrderUpdate(userId: string)`

### TradeEngineClient
- `getOrderBook(symbol: string, depth: number): Promise<TradeEngineResponse<OrderBook>>`
- `getCircuitBreakerMetrics()`
- `isCircuitOpen(): boolean`
- `resetCircuitBreaker(): void`

### CircuitBreaker
- `execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>`
- `getState(): CircuitState`
- `reset(): void`

---

## Testing

### Run All Tests
```bash
npm test -- --testPathPatterns="depth-chart|user-order-highlight|circuit-breaker"
```

### Run Specific Test Suite
```bash
npm test -- market.service.depth-chart.spec.ts
npm test -- user-order-highlight.service.spec.ts
npm test -- circuit-breaker.spec.ts
```

### Run with Coverage
```bash
npm test -- --coverage --collectCoverageFrom="src/market/**/*.ts"
```

---

## Configuration

### Environment Variables
```env
TRADE_ENGINE_API_URL=http://localhost:8080/api/v1
TRADE_ENGINE_SERVICE_TOKEN=your-service-token
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Cache TTLs
- **Depth Chart:** 5 seconds
- **User Order Prices:** 60 seconds
- **Orderbook (fallback):** 5 minutes (stale threshold)

### Circuit Breaker Settings
- **Failure Threshold:** 3 consecutive failures
- **Reset Timeout:** 60 seconds
- **Monitoring Period:** 60 seconds
- **Request Timeout:** 5 seconds

---

## Monitoring & Debugging

### Correlation IDs
All requests to Trade Engine include:
- `X-Correlation-ID`: Unique request identifier
- `X-Request-Source`: 'auth-service'

**Example Log:**
```
[MarketService] Fetching order book for BTC_TRY with depth 50 [correlation_id: te_1732478400000_abc123xyz]
```

### Circuit Breaker Logs
```
[TradeEngineClient] Circuit breaker TestCircuit failure count: 1/3
[TradeEngineClient] Circuit TestCircuit OPENED. Next attempt at 2025-11-24T17:00:00Z
[TradeEngineClient] Circuit TestCircuit transitioning to HALF_OPEN
[TradeEngineClient] Circuit TestCircuit closed after successful execution
```

### Cache Monitoring
```
[MarketService] Depth chart cache hit for BTC_TRY (15ms)
[MarketService] Depth chart cache miss for BTC_TRY, fetching from Trade Engine
[UserOrderHighlightService] User order prices cache hit for user-123 (8ms)
```

---

## Performance Benchmarks

| Operation | Target | Actual (cached) | Actual (uncached) |
|-----------|--------|-----------------|-------------------|
| Depth Chart | <50ms | <30ms | ~100ms |
| User Highlighting | <20ms | <15ms | ~50ms |
| Circuit Breaker Execute | - | <5ms | - |

---

## Error Handling

### Depth Chart Errors
- **Invalid Symbol:** 400 Bad Request
- **Orderbook Not Found:** 404 Not Found
- **Trade Engine Down:** Returns cached data or empty orderbook

### User Order Errors
- **Invalid User ID:** 404 Not Found
- **No Orders:** Returns empty array `[]`
- **Trade Engine Down:** Returns empty array

### Circuit Breaker States
- **CLOSED:** Normal operation
- **OPEN:** All requests use fallback
- **HALF_OPEN:** Testing if service recovered

---

## Common Use Cases

### 1. Display Depth Chart
```typescript
const response = await fetch('/api/v1/market/orderbook/BTC_TRY/depth-chart')
const { data } = await response.json()

// Render chart with data.bids and data.asks
// Use data.maxBidVolume and data.maxAskVolume for scaling
```

### 2. Highlight User Orders
```typescript
socket.emit('subscribe_user_orders', { userId: currentUser.id })

socket.on('user_order_prices', (event) => {
  const highlightPrices = new Set(event.prices)

  // In orderbook rendering
  orderbookLevels.forEach(level => {
    if (highlightPrices.has(level.price)) {
      // Highlight this row
    }
  })
})
```

### 3. Handle Trade Engine Failure
```typescript
// Circuit breaker automatically handles failures
// Client receives either:
// 1. Fresh data from Trade Engine
// 2. Cached data (if available)
// 3. Empty orderbook (if no cache)

// No special client-side handling required
```

---

## Troubleshooting

### Depth Chart Not Loading
1. Check Trade Engine is running: `curl http://localhost:8080/health`
2. Check Redis is running: `redis-cli ping`
3. Check logs for circuit breaker state
4. Verify symbol is valid (BTC_TRY, ETH_TRY, USDT_TRY)

### User Orders Not Highlighting
1. Verify WebSocket connection: Check browser console
2. Verify user has open orders
3. Check subscription status: Look for 'subscribed' event
4. Verify userId is correct

### Circuit Breaker Stuck Open
1. Check Trade Engine health
2. View metrics: `tradeEngineClient.getCircuitBreakerMetrics()`
3. Manual reset (if needed): `tradeEngineClient.resetCircuitBreaker()`
4. Wait 60 seconds for automatic reset

---

## API Examples

### cURL
```bash
# Get depth chart
curl -X GET http://localhost:3000/api/v1/market/orderbook/BTC_TRY/depth-chart

# Get regular orderbook (for comparison)
curl -X GET http://localhost:3000/api/v1/market/orderbook/BTC_TRY?depth=20
```

### JavaScript (fetch)
```javascript
const getDepthChart = async (symbol) => {
  const response = await fetch(
    `http://localhost:3000/api/v1/market/orderbook/${symbol}/depth-chart`
  )
  return response.json()
}

const data = await getDepthChart('BTC_TRY')
console.log('Spread:', data.data.spread.percentage)
```

### TypeScript (with types)
```typescript
import { DepthChartResponseDto } from './dto/depth-chart-response.dto'

const getDepthChart = async (symbol: string): Promise<DepthChartResponseDto> => {
  const response = await fetch(
    `http://localhost:3000/api/v1/market/orderbook/${symbol}/depth-chart`
  )
  const json = await response.json()
  return json.data
}
```

---

**Last Updated:** 2025-11-24
**Version:** 1.0.0
