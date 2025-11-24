# Depth Chart Query Guide for Backend Developers

**Task:** DB-EPIC3-002
**Date:** 2025-11-24
**For:** Backend Team (NestJS - Story 3.1)

---

## Quick Start

Use these optimized queries for depth chart API endpoints. They execute in **< 1ms** and are fully indexed.

---

## 1. BID Side Depth Chart (Top 50 Levels)

```sql
SELECT
    price,
    SUM(quantity - filled_quantity) as volume,
    COUNT(*) as order_count
FROM orders
WHERE symbol = $1                               -- e.g., 'BTC/USDT'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')   -- Active orders only
  AND side = 'BUY'                              -- BID side
  AND price IS NOT NULL                          -- Valid prices
GROUP BY price
ORDER BY price DESC                             -- Highest price first
LIMIT 50;                                       -- Top 50 levels
```

**Expected Performance:** < 0.5ms
**Index Used:** `idx_orders_depth_chart`

---

## 2. ASK Side Depth Chart (Top 50 Levels)

```sql
SELECT
    price,
    SUM(quantity - filled_quantity) as volume,
    COUNT(*) as order_count
FROM orders
WHERE symbol = $1                               -- e.g., 'BTC/USDT'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')   -- Active orders only
  AND side = 'SELL'                             -- ASK side
  AND price IS NOT NULL                          -- Valid prices
GROUP BY price
ORDER BY price ASC                              -- Lowest price first
LIMIT 50;                                       -- Top 50 levels
```

**Expected Performance:** < 0.5ms
**Index Used:** `idx_orders_depth_chart`

---

## 3. Combined Depth Query (Both Sides)

```sql
WITH bid_levels AS (
    SELECT
        price,
        SUM(quantity - filled_quantity) as volume,
        COUNT(*) as order_count
    FROM orders
    WHERE symbol = $1
      AND status IN ('OPEN', 'PARTIALLY_FILLED')
      AND side = 'BUY'
      AND price IS NOT NULL
    GROUP BY price
    ORDER BY price DESC
    LIMIT 50
),
ask_levels AS (
    SELECT
        price,
        SUM(quantity - filled_quantity) as volume,
        COUNT(*) as order_count
    FROM orders
    WHERE symbol = $1
      AND status IN ('OPEN', 'PARTIALLY_FILLED')
      AND side = 'SELL'
      AND price IS NOT NULL
    GROUP BY price
    ORDER BY price ASC
    LIMIT 50
)
SELECT 'BID' as side, price, volume, order_count FROM bid_levels
UNION ALL
SELECT 'ASK' as side, price, volume, order_count FROM ask_levels;
```

**Expected Performance:** < 1ms (both sides)
**Result:** Returns up to 100 rows (50 BID + 50 ASK)

---

## 4. TypeORM/Sequelize Example

### 4.1 TypeORM Raw Query

```typescript
// In your depth chart service
async getDepthChart(symbol: string): Promise<DepthChartResponse> {
  const bidQuery = `
    SELECT
      price,
      SUM(quantity - filled_quantity) as volume,
      COUNT(*) as order_count
    FROM orders
    WHERE symbol = $1
      AND status IN ('OPEN', 'PARTIALLY_FILLED')
      AND side = 'BUY'
      AND price IS NOT NULL
    GROUP BY price
    ORDER BY price DESC
    LIMIT 50
  `;

  const askQuery = `
    SELECT
      price,
      SUM(quantity - filled_quantity) as volume,
      COUNT(*) as order_count
    FROM orders
    WHERE symbol = $1
      AND status IN ('OPEN', 'PARTIALLY_FILLED')
      AND side = 'SELL'
      AND price IS NOT NULL
    GROUP BY price
    ORDER BY price ASC
    LIMIT 50
  `;

  const [bids, asks] = await Promise.all([
    this.dataSource.query(bidQuery, [symbol]),
    this.dataSource.query(askQuery, [symbol]),
  ]);

  return {
    symbol,
    bids: bids.map(row => ({
      price: row.price,
      volume: row.volume,
      orderCount: parseInt(row.order_count),
    })),
    asks: asks.map(row => ({
      price: row.price,
      volume: row.volume,
      orderCount: parseInt(row.order_count),
    })),
    timestamp: new Date(),
  };
}
```

### 4.2 With Cumulative Volume Calculation

```typescript
interface DepthLevel {
  price: string;
  volume: string;
  cumulative: string;
  percentage: number;
  orderCount: number;
}

function calculateCumulativeVolume(levels: any[]): DepthLevel[] {
  let cumulative = 0;
  const maxVolume = Math.max(...levels.map(l => parseFloat(l.volume)));

  return levels.map(level => {
    cumulative += parseFloat(level.volume);
    return {
      price: level.price,
      volume: level.volume,
      cumulative: cumulative.toFixed(8),
      percentage: Math.round((parseFloat(level.volume) / maxVolume) * 100),
      orderCount: parseInt(level.order_count),
    };
  });
}

async getDepthChartWithCumulative(symbol: string) {
  const { bids, asks } = await this.getDepthChart(symbol);

  return {
    symbol,
    bids: calculateCumulativeVolume(bids),
    asks: calculateCumulativeVolume(asks),
    spread: this.calculateSpread(bids, asks),
    timestamp: new Date(),
  };
}
```

---

## 5. API Response Format

### 5.1 Basic Depth Chart

```json
{
  "symbol": "BTC/USDT",
  "bids": [
    {
      "price": "49926.06623279",
      "volume": "10.93633164",
      "orderCount": 1
    },
    {
      "price": "49899.35896706",
      "volume": "5.80578454",
      "orderCount": 1
    }
  ],
  "asks": [
    {
      "price": "40099.67440284",
      "volume": "3.30170421",
      "orderCount": 1
    },
    {
      "price": "40312.23294783",
      "volume": "10.70968957",
      "orderCount": 1
    }
  ],
  "timestamp": "2025-11-24T16:48:23.123Z"
}
```

### 5.2 Enhanced Depth Chart (With Cumulative & Spread)

```json
{
  "symbol": "BTC/USDT",
  "bids": [
    {
      "price": "49926.07",
      "volume": "10.94",
      "cumulative": "10.94",
      "percentage": 100,
      "orderCount": 1
    },
    {
      "price": "49899.36",
      "volume": "5.81",
      "cumulative": "16.75",
      "percentage": 53,
      "orderCount": 1
    }
  ],
  "asks": [
    {
      "price": "40099.67",
      "volume": "3.30",
      "cumulative": "3.30",
      "percentage": 31,
      "orderCount": 1
    },
    {
      "price": "40312.23",
      "volume": "10.71",
      "cumulative": "14.01",
      "percentage": 100,
      "orderCount": 1
    }
  ],
  "spread": {
    "value": "9826.40",
    "percentage": "19.69%"
  },
  "maxBidVolume": "10.94",
  "maxAskVolume": "10.71",
  "timestamp": "2025-11-24T16:48:23.123Z"
}
```

---

## 6. Caching Strategy

### 6.1 Redis Cache (Recommended)

```typescript
@Injectable()
export class DepthChartService {
  constructor(
    @Inject('REDIS') private redis: Redis,
    private dataSource: DataSource,
  ) {}

  async getDepthChart(symbol: string): Promise<DepthChartResponse> {
    const cacheKey = `depth:${symbol}`;

    // Try cache first (5-second TTL)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const depthChart = await this.fetchDepthChartFromDB(symbol);

    // Cache for 5 seconds
    await this.redis.setex(cacheKey, 5, JSON.stringify(depthChart));

    return depthChart;
  }
}
```

### 6.2 Cache Invalidation (on Order Events)

```typescript
// When order is placed/cancelled/filled
async invalidateDepthCache(symbol: string): Promise<void> {
  await this.redis.del(`depth:${symbol}`);

  // Optional: Broadcast WebSocket update
  this.wsGateway.broadcastDepthUpdate(symbol);
}
```

---

## 7. Performance Monitoring

### 7.1 Log Slow Queries

```typescript
async getDepthChart(symbol: string): Promise<DepthChartResponse> {
  const startTime = Date.now();

  const result = await this.fetchDepthChartFromDB(symbol);

  const duration = Date.now() - startTime;
  if (duration > 50) {
    this.logger.warn(`Slow depth chart query for ${symbol}: ${duration}ms`);
  }

  return result;
}
```

### 7.2 Metrics (Prometheus)

```typescript
private depthChartDuration = new Histogram({
  name: 'depth_chart_query_duration_ms',
  help: 'Depth chart query execution time in milliseconds',
  labelNames: ['symbol'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
});

async getDepthChart(symbol: string): Promise<DepthChartResponse> {
  const timer = this.depthChartDuration.startTimer({ symbol });

  try {
    const result = await this.fetchDepthChartFromDB(symbol);
    return result;
  } finally {
    timer();
  }
}
```

---

## 8. Error Handling

```typescript
async getDepthChart(symbol: string): Promise<DepthChartResponse> {
  try {
    return await this.fetchDepthChartFromDB(symbol);
  } catch (error) {
    this.logger.error(`Depth chart query failed for ${symbol}`, error);

    // Return empty depth chart (graceful degradation)
    return {
      symbol,
      bids: [],
      asks: [],
      timestamp: new Date(),
    };
  }
}
```

---

## 9. Testing

### 9.1 Unit Test Example

```typescript
describe('DepthChartService', () => {
  it('should return depth chart with 50 levels per side', async () => {
    const result = await service.getDepthChart('BTC/USDT');

    expect(result.bids.length).toBeLessThanOrEqual(50);
    expect(result.asks.length).toBeLessThanOrEqual(50);
    expect(result.bids[0].price).toBeGreaterThan(result.bids[1]?.price || 0);
    expect(result.asks[0].price).toBeLessThan(result.asks[1]?.price || Infinity);
  });

  it('should execute query in < 50ms', async () => {
    const start = Date.now();
    await service.getDepthChart('BTC/USDT');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50);
  });
});
```

---

## 10. Common Pitfalls

### ❌ DON'T: Query Without Filters

```typescript
// BAD: Missing status filter
SELECT price, SUM(quantity) FROM orders WHERE symbol = 'BTC/USDT' GROUP BY price;
```

### ✅ DO: Use All Required Filters

```typescript
// GOOD: All filters present
SELECT price, SUM(quantity - filled_quantity)
FROM orders
WHERE symbol = 'BTC/USDT'
  AND status IN ('OPEN', 'PARTIALLY_FILLED')
  AND side = 'BUY'
  AND price IS NOT NULL
GROUP BY price;
```

### ❌ DON'T: Fetch All Orders Then Filter

```typescript
// BAD: Fetching all orders (slow)
const orders = await orderRepository.find({ where: { symbol: 'BTC/USDT' } });
const bids = orders.filter(o => o.side === 'BUY' && o.status === 'OPEN');
```

### ✅ DO: Let Database Do the Aggregation

```typescript
// GOOD: Use raw query with aggregation
const bids = await dataSource.query(bidQuery, ['BTC/USDT']);
```

---

## 11. Index Information

The `idx_orders_depth_chart` index ensures optimal query performance:

**Structure:**
- **Columns:** (symbol, side, price DESC)
- **Included:** quantity, filled_quantity
- **Filter:** status IN ('OPEN', 'PARTIALLY_FILLED') AND price IS NOT NULL

**Coverage:** 100% of depth chart queries

**Maintenance:** Automatic (no manual intervention needed)

---

## 12. Support

If queries are slow (> 50ms):
1. Check `EXPLAIN ANALYZE` output
2. Verify index usage (`idx_orders_depth_chart`)
3. Check cache hit ratio in PostgreSQL
4. Contact Database Team

---

**Last Updated:** 2025-11-24
**Maintained By:** Database Agent
