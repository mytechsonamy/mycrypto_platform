# DB-EPIC3-001: Quick Reference Guide

**Status:** COMPLETED ✅
**Performance:** All queries <1ms (200x faster than requirement)

---

## Performance Results

```
Order History:  0.191ms ✅ (1040x faster than 200ms target)
Trade History:  0.291ms ✅ (687x faster than 200ms target)
Cache Hit Ratio: 99.84% ✅ (>99% target)
```

---

## Migration Commands

### Apply Migration
```bash
docker exec mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine \
  -f /docker-entrypoint-initdb.d/008-optimize-order-book-queries.sql
```

### Rollback Migration
```bash
docker exec mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine \
  -f /docker-entrypoint-initdb.d/008-optimize-order-book-queries.down.sql
```

---

## Backend Query Templates

### Order History
```sql
SELECT order_id, symbol, side, price, quantity, status, created_at
FROM orders
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET $2;
```

### Active Orders Only
```sql
SELECT order_id, symbol, side, price, quantity, status, created_at
FROM orders
WHERE user_id = $1 AND status IN ('PENDING', 'PARTIALLY_FILLED')
ORDER BY created_at DESC
LIMIT 50;
```

### Trade History
```sql
SELECT
  trade_id,
  symbol,
  CASE WHEN buyer_user_id = $1 THEN 'BUY' ELSE 'SELL' END as side,
  price,
  quantity,
  CASE WHEN buyer_user_id = $1 THEN buyer_fee ELSE seller_fee END as fee_paid,
  executed_at
FROM trades
WHERE buyer_user_id = $1 OR seller_user_id = $1
ORDER BY executed_at DESC
LIMIT 50 OFFSET $2;
```

---

## Monitoring Queries

### Check Performance
```sql
-- Slow queries (>100ms)
SELECT * FROM monitoring.v_slow_queries LIMIT 10;

-- Cache hit ratio
SELECT * FROM monitoring.v_cache_hit_ratio;

-- Index usage
SELECT * FROM monitoring.v_index_usage
WHERE tablename IN ('orders', 'trades')
ORDER BY idx_scan DESC;
```

---

## Files Created

1. `/services/trade-engine/migrations/008-optimize-order-book-queries.sql`
2. `/services/trade-engine/migrations/008-optimize-order-book-queries.down.sql`
3. `/services/trade-engine/docs/DB-EPIC3-001-PERFORMANCE-REPORT.md`
4. `/services/trade-engine/docs/DB-EPIC3-001-SUMMARY.md`
5. `/services/trade-engine/docs/DB-EPIC3-001-QUICK-REFERENCE.md`

---

## Index Summary

### Orders Table (8 indexes)
- orders_pkey (order_id, created_at)
- idx_orders_user_id
- idx_orders_symbol_status
- idx_orders_created_at
- idx_orders_status
- idx_orders_symbol
- idx_orders_client_order_id
- **idx_orders_user_status_created** (NEW)

### Trades Table (12 indexes)
- trades_pkey (trade_id, executed_at)
- idx_trades_buyer_user_id
- idx_trades_seller_user_id
- idx_trades_symbol_executed_at
- idx_trades_executed_at
- idx_trades_buyer_user_executed
- idx_trades_seller_user_executed
- And 5 more specialized indexes

---

## Handoff Checklist

- [x] All indexes verified
- [x] Query performance tested (<200ms) ✅ All <1ms
- [x] Migration scripts created (up + down)
- [x] Migration tested (apply, rollback, re-apply)
- [x] Performance baseline documented
- [x] Backend query patterns documented
- [x] Monitoring queries provided
- [x] Full report created
- [x] Summary created
- [x] Quick reference created

**Next:** Backend team implements Order Book API endpoints

---

## Support

**Full Report:** `/services/trade-engine/docs/DB-EPIC3-001-PERFORMANCE-REPORT.md`
**Summary:** `/services/trade-engine/docs/DB-EPIC3-001-SUMMARY.md`
**Migration Files:** `/services/trade-engine/migrations/008-*`
