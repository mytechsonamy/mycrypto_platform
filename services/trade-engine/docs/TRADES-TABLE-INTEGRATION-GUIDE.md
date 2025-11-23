# Trades Table Integration Guide
## Quick Reference for Backend Agent

**Version:** 1.0
**Date:** 2025-11-23
**Purpose:** Quick integration guide for matching engine trade persistence

---

## Database Connection

```typescript
// PostgreSQL connection (already configured in trade-engine)
const dbConfig = {
  host: 'localhost',
  port: 5436,
  database: 'mytrader_trade_engine',
  user: 'trade_engine_app',
  password: 'dev_password_change_in_prod'
};
```

---

## Trade Insert (Single Trade)

### TypeScript/Node.js Example

```typescript
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface TradeInsert {
  symbol: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerUserId: string;
  sellerUserId: string;
  price: number;
  quantity: number;
  buyerFee: number;
  sellerFee: number;
  isBuyerMaker: boolean;
  executedAt?: Date;
}

async function insertTrade(pool: Pool, trade: TradeInsert): Promise<string> {
  const tradeId = uuidv4();

  const query = `
    INSERT INTO trades (
      trade_id, symbol, buy_order_id, sell_order_id,
      buyer_user_id, seller_user_id, price, quantity,
      buyer_fee, seller_fee, is_buyer_maker, executed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING trade_id, executed_at
  `;

  const values = [
    tradeId,
    trade.symbol,
    trade.buyOrderId,
    trade.sellOrderId,
    trade.buyerUserId,
    trade.sellerUserId,
    trade.price,
    trade.quantity,
    trade.buyerFee,
    trade.sellerFee,
    trade.isBuyerMaker,
    trade.executedAt || new Date()
  ];

  const result = await pool.query(query, values);
  return result.rows[0].trade_id;
}
```

### Go Example (for trade-engine)

```go
package repository

import (
    "context"
    "database/sql"
    "time"
    "github.com/google/uuid"
    "github.com/shopspring/decimal"
)

type Trade struct {
    TradeID       uuid.UUID
    Symbol        string
    BuyOrderID    uuid.UUID
    SellOrderID   uuid.UUID
    BuyerUserID   uuid.UUID
    SellerUserID  uuid.UUID
    Price         decimal.Decimal
    Quantity      decimal.Decimal
    BuyerFee      decimal.Decimal
    SellerFee     decimal.Decimal
    IsBuyerMaker  bool
    ExecutedAt    time.Time
    CreatedAt     time.Time
}

func InsertTrade(ctx context.Context, db *sql.DB, trade *Trade) error {
    query := `
        INSERT INTO trades (
            trade_id, symbol, buy_order_id, sell_order_id,
            buyer_user_id, seller_user_id, price, quantity,
            buyer_fee, seller_fee, is_buyer_maker, executed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING created_at
    `

    return db.QueryRowContext(ctx, query,
        trade.TradeID,
        trade.Symbol,
        trade.BuyOrderID,
        trade.SellOrderID,
        trade.BuyerUserID,
        trade.SellerUserID,
        trade.Price,
        trade.Quantity,
        trade.BuyerFee,
        trade.SellerFee,
        trade.IsBuyerMaker,
        trade.ExecutedAt,
    ).Scan(&trade.CreatedAt)
}
```

---

## Bulk Insert (Multiple Trades)

### Batch Insert for High Performance

```go
func InsertTrades(ctx context.Context, db *sql.DB, trades []*Trade) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    stmt, err := tx.PrepareContext(ctx, `
        INSERT INTO trades (
            trade_id, symbol, buy_order_id, sell_order_id,
            buyer_user_id, seller_user_id, price, quantity,
            buyer_fee, seller_fee, is_buyer_maker, executed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `)
    if err != nil {
        return err
    }
    defer stmt.Close()

    for _, trade := range trades {
        _, err = stmt.ExecContext(ctx,
            trade.TradeID,
            trade.Symbol,
            trade.BuyOrderID,
            trade.SellOrderID,
            trade.BuyerUserID,
            trade.SellerUserID,
            trade.Price,
            trade.Quantity,
            trade.BuyerFee,
            trade.SellerFee,
            trade.IsBuyerMaker,
            trade.ExecutedAt,
        )
        if err != nil {
            return err
        }
    }

    return tx.Commit()
}
```

---

## Fee Calculation

### Standard Fee Structure

```typescript
const MAKER_FEE = 0.0005;  // 0.05%
const TAKER_FEE = 0.0010;  // 0.10%

function calculateFees(
  price: number,
  quantity: number,
  isBuyerMaker: boolean
): { buyerFee: number; sellerFee: number } {
  const tradeValue = price * quantity;

  if (isBuyerMaker) {
    return {
      buyerFee: tradeValue * MAKER_FEE,   // Buyer is maker
      sellerFee: tradeValue * TAKER_FEE   // Seller is taker
    };
  } else {
    return {
      buyerFee: tradeValue * TAKER_FEE,   // Buyer is taker
      sellerFee: tradeValue * MAKER_FEE   // Seller is maker
    };
  }
}
```

### Go Version

```go
const (
    MakerFee = 0.0005 // 0.05%
    TakerFee = 0.0010 // 0.10%
)

func CalculateFees(
    price decimal.Decimal,
    quantity decimal.Decimal,
    isBuyerMaker bool,
) (buyerFee, sellerFee decimal.Decimal) {
    tradeValue := price.Mul(quantity)
    makerFeeDecimal := decimal.NewFromFloat(MakerFee)
    takerFeeDecimal := decimal.NewFromFloat(TakerFee)

    if isBuyerMaker {
        buyerFee = tradeValue.Mul(makerFeeDecimal)
        sellerFee = tradeValue.Mul(takerFeeDecimal)
    } else {
        buyerFee = tradeValue.Mul(takerFeeDecimal)
        sellerFee = tradeValue.Mul(makerFeeDecimal)
    }

    return buyerFee, sellerFee
}
```

---

## Query Functions

### Get User Trades

```typescript
async function getUserTrades(
  pool: Pool,
  userId: string,
  symbol?: string,
  limit: number = 100
): Promise<any[]> {
  const query = `
    SELECT * FROM get_user_trades($1, $2, $3)
  `;

  const result = await pool.query(query, [userId, symbol || null, limit]);
  return result.rows;
}
```

### Get Symbol Trades

```typescript
async function getSymbolTrades(
  pool: Pool,
  symbol: string,
  startTime: Date,
  endTime: Date,
  limit: number = 1000
): Promise<any[]> {
  const query = `
    SELECT * FROM get_symbol_trades($1, $2, $3, $4)
  `;

  const result = await pool.query(query, [symbol, startTime, endTime, limit]);
  return result.rows;
}
```

### Calculate VWAP

```typescript
async function calculateVWAP(
  pool: Pool,
  symbol: string,
  intervalMinutes: number = 60
): Promise<number> {
  const query = `
    SELECT calculate_vwap($1, INTERVAL '${intervalMinutes} minutes')
  `;

  const result = await pool.query(query, [symbol]);
  return parseFloat(result.rows[0].calculate_vwap);
}
```

### Get OHLCV Data

```typescript
async function getOHLCV(
  pool: Pool,
  symbol: string,
  intervalMinutes: number = 60,
  lookbackHours: number = 24
): Promise<any[]> {
  const query = `
    SELECT * FROM get_ohlcv(
      $1,
      INTERVAL '${intervalMinutes} minutes',
      INTERVAL '${lookbackHours} hours'
    )
  `;

  const result = await pool.query(query, [symbol]);
  return result.rows;
}
```

---

## Analytics Views

### Recent Trades (24h)

```sql
SELECT * FROM v_recent_trades
WHERE symbol = 'BTC/USDT'
ORDER BY executed_at DESC
LIMIT 100;
```

### Trading Volume (24h)

```sql
SELECT * FROM v_trade_volume_24h
ORDER BY total_volume_quote DESC;
```

### User Trade History

```sql
SELECT * FROM v_user_trade_history
WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND symbol = 'BTC/USDT'
ORDER BY executed_at DESC
LIMIT 100;
```

### Price History (OHLCV)

```sql
SELECT * FROM v_symbol_price_history
WHERE symbol = 'BTC/USDT'
ORDER BY candle_time DESC
LIMIT 24;  -- Last 24 hours
```

---

## Performance Tips

### 1. Use Prepared Statements

```go
// Prepare once, execute many times
stmt, err := db.Prepare(`INSERT INTO trades (...)VALUES (...)`)
defer stmt.Close()

for _, trade := range trades {
    stmt.Exec(trade.TradeID, ...)
}
```

### 2. Batch Inserts in Transactions

```go
tx, _ := db.Begin()
for _, trade := range trades {
    tx.Exec(`INSERT INTO trades ...`, ...)
}
tx.Commit()  // Atomic commit
```

### 3. Use Connection Pooling

```typescript
const pool = new Pool({
  host: 'localhost',
  port: 5436,
  database: 'mytrader_trade_engine',
  user: 'trade_engine_app',
  password: 'dev_password_change_in_prod',
  max: 20,              // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### 4. Index-Aware Queries

```sql
-- GOOD: Uses idx_trades_buyer_user_executed
SELECT * FROM trades
WHERE buyer_user_id = $1
ORDER BY executed_at DESC
LIMIT 100;

-- BAD: Sequential scan
SELECT * FROM trades
WHERE buyer_fee > 100
ORDER BY executed_at DESC;
```

---

## Error Handling

### Common Errors and Solutions

**1. Partition Not Found**
```
ERROR: no partition of relation "trades" found for row
DETAIL: Partition key of the failing row contains (executed_at) = (2025-12-31...)
```

**Solution:** Create partition before inserting
```sql
SELECT create_trade_partition();
```

**2. Foreign Key Violation**
```
ERROR: insert or update on table "trades" violates foreign key constraint
```

**Solution:** Ensure order IDs exist in orders table before inserting trade

**3. Check Constraint Violation**
```
ERROR: new row for relation "trades" violates check constraint "trades_price_check"
```

**Solution:** Ensure price > 0, quantity > 0, fees >= 0

---

## Testing Checklist

- [ ] Single trade insert (<5ms)
- [ ] Bulk insert (1000 trades <1s)
- [ ] Fee calculation accuracy
- [ ] User trade query performance (<50ms)
- [ ] Symbol trade query performance (<100ms)
- [ ] VWAP calculation
- [ ] OHLCV generation
- [ ] Partition boundary handling (midnight UTC)
- [ ] Transaction rollback on error
- [ ] Concurrent insert handling

---

## Monitoring Queries

### Check Trade Insert Rate

```sql
SELECT
    COUNT(*) AS trades_today,
    COUNT(*) / EXTRACT(EPOCH FROM (NOW() - DATE_TRUNC('day', NOW()))) AS trades_per_second
FROM trades
WHERE executed_at >= CURRENT_DATE;
```

### Check Index Usage

```sql
SELECT * FROM v_trade_index_usage
WHERE scans > 0
ORDER BY scans DESC;
```

### Check Partition Sizes

```sql
SELECT * FROM v_trade_partition_info
ORDER BY partition_name DESC
LIMIT 10;
```

---

## Quick Reference Summary

| Operation | Function/Query | Expected Time |
|-----------|---------------|---------------|
| Insert single trade | `INSERT INTO trades` | <5ms |
| Insert 1000 trades | Batch insert in transaction | <1s |
| Get user trades | `get_user_trades()` | <50ms |
| Get symbol trades | `get_symbol_trades()` | <100ms |
| Calculate VWAP | `calculate_vwap()` | <100ms |
| Generate OHLCV | `get_ohlcv()` | <300ms |
| Recent trades view | `v_recent_trades` | <50ms |
| Volume stats | `v_trade_volume_24h` | <200ms |

---

## Need Help?

- **Database Schema:** See `/services/trade-engine/migrations/007-enhance-trades-table.sql`
- **Full Documentation:** See `/services/trade-engine/docs/TASK-DB-004-COMPLETION-REPORT.md`
- **Test Scripts:** See `/services/trade-engine/scripts/test-trade-functions.sql`
- **Benchmarks:** See `/services/trade-engine/scripts/benchmark-trades-performance.sql`

---

**Last Updated:** 2025-11-23
**Maintained By:** Database Engineer Agent
