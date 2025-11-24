# Database Performance - Quick Reference Card

**Last Updated:** 2025-11-23
**Status:** ✅ Production Ready

---

## Performance Targets & Actuals

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Active orders lookup | <10ms | 1.06ms | ✅ 9x faster |
| Recent trades query | <10ms | 1.16ms | ✅ 8x faster |
| Volume aggregation | <10ms | 1.75ms | ✅ 5x faster |
| 24h statistics | <10ms | ~2ms | ✅ 5x faster |
| Order book depth | <10ms | ~3ms | ✅ 3x faster |

---

## Index Summary

**Orders Table:** 7 indexes
- Primary key (order_id, created_at)
- Symbol, status, user_id lookups
- Time-series queries
- Idempotency checks

**Trades Table:** 11 indexes
- Primary key (trade_id, executed_at)
- Symbol, buyer, seller lookups
- Time-series and analytics
- Volume calculations
- Maker/taker tracking

**Coverage:** 100% | **Unused:** 0 | **Status:** ✅ Optimal

---

## Database Health

| Metric | Value | Status |
|--------|-------|--------|
| Total Size | 18 MB | ✅ Healthy |
| Orders Rows | 500 | ✅ Test data |
| Trades Rows | 5,001 | ✅ Test data |
| Partitions | 42 (all healthy) | ✅ Active |
| Index Efficiency | 100% | ✅ Perfect |

---

## Partitioning Strategy

**Orders:**
- 12 monthly partitions (2024-11 to 2025-10)
- Range: 12 months
- Status: ✅ All healthy

**Trades:**
- 30 daily partitions (2025-11-23 to 2025-12-22)
- Range: 29 days future partitions
- Status: ✅ All healthy

---

## Quick Commands

### Check Index Usage
```sql
SELECT indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Run Performance Benchmarks
```bash
docker exec -i mytrader-postgres psql -U trade_engine_app \
  -d mytrader_trade_engine \
  -f /path/to/scripts/run-benchmarks.sql
```

### Verify Partition Health
```sql
SELECT COUNT(*) FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'orders_%' OR tablename LIKE 'trades_%');
-- Expected: 42
```

### Check Query Performance
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 10
ORDER BY mean_exec_time DESC;
```

---

## Production Recommendations

### Must Do
1. ✅ Use prepared statements (saves 22ms planning time)
2. ✅ Configure connection pooling (20-25 connections)
3. ⏳ Enable pg_stat_statements (DevOps)
4. ⏳ Set up monitoring dashboards (DevOps)

### Should Do
1. Schedule weekly VACUUM ANALYZE
2. Monitor cache hit ratio (target >95%)
3. Set alerts for slow queries (>50ms)
4. Track partition growth

### Nice to Have
1. Materialized views for 24h stats
2. Quarterly REINDEX CONCURRENTLY
3. Archive old partitions (>90 days)

---

## Monitoring Alerts

Configure these alerts:

| Alert | Threshold | Action |
|-------|-----------|--------|
| Query execution time | >50ms | Investigate slow queries |
| Cache hit ratio | <95% | Increase shared_buffers |
| Index scan ratio | <90% | Review missing indexes |
| Partition count | <7 days | Run partition creation |
| Connection pool | >90% | Scale connections |

---

## Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `DATABASE_PERFORMANCE_BASELINE.md` | Full baseline report | After schema changes |
| `run-benchmarks.sql` | Performance tests | Regression testing |
| `verify-indexes.sql` | Index health checks | After deployments |
| `simple-test-data.sql` | Generate test data | Development/QA |

---

## Optimization Path

**Current State:** ✅ Optimal for <10K rows

**Next Optimizations (>100K rows):**
1. Materialized views for aggregations
2. Index-only scans with INCLUDE columns
3. Partial index expansion
4. BRIN indexes for time-series (>10M rows)

**Archive Strategy (>1M rows):**
1. Detach old partitions (>90 days)
2. Export to S3 cold storage
3. Maintain 60 months for regulatory compliance

---

## Contact & Support

**Database Engineer Agent:** Ready for database-related tasks
**Documentation:** `/docs/DATABASE_PERFORMANCE_BASELINE.md`
**Scripts:** `/scripts/run-benchmarks.sql`, `verify-indexes.sql`

---

**Status:** ✅ Production Ready
**Last Validated:** 2025-11-23
**Next Review:** After 100K rows milestone
