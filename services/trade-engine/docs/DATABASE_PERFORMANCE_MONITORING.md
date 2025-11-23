# Trade Engine Database - Performance Monitoring Guide

**Date:** 2025-11-23
**Author:** Database Agent
**Version:** 1.0
**Status:** Production Ready

---

## Overview

This document provides a comprehensive guide to the database performance monitoring infrastructure for the Trade Engine. All monitoring tools, views, and functions have been implemented and tested.

**Features Implemented:**
- pg_stat_statements extension for query performance tracking
- 13 monitoring views for real-time database health
- 14 performance analysis functions
- Automated maintenance scheduling
- Partition management automation
- Performance baseline documentation

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Monitoring Views](#monitoring-views)
3. [Performance Functions](#performance-functions)
4. [Automated Maintenance](#automated-maintenance)
5. [Performance Baselines](#performance-baselines)
6. [Query Optimization](#query-optimization)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Quick Start

### Enable pg_stat_statements (Required)

**IMPORTANT:** pg_stat_statements requires PostgreSQL restart after initial setup.

```bash
# 1. Update PostgreSQL configuration
docker exec -it mytrader-postgres bash
echo "shared_preload_libraries = 'pg_stat_statements'" >> /var/lib/postgresql/data/postgresql.conf
echo "pg_stat_statements.track = all" >> /var/lib/postgresql/data/postgresql.conf
echo "pg_stat_statements.max = 10000" >> /var/lib/postgresql/data/postgresql.conf
exit

# 2. Restart PostgreSQL container
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine
docker-compose restart postgres

# 3. Wait for PostgreSQL to be healthy
docker-compose ps postgres

# 4. Verify extension is loaded
docker exec -i mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine -c "SELECT * FROM pg_stat_statements LIMIT 1;"
```

### Run Verification

```bash
# Verify all monitoring components
cat scripts/verify-monitoring-setup.sql | docker exec -i mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine
```

### View Database Health

```sql
-- Quick health check
SELECT * FROM monitoring.database_health_check();

-- Cache hit ratios (should be >99%)
SELECT * FROM monitoring.v_cache_hit_ratio;

-- Active connections
SELECT * FROM monitoring.v_connection_summary;
```

---

## Monitoring Views

All views are in the `monitoring` schema.

### 1. Query Performance Views

#### `v_slow_queries`
Lists queries with mean execution time > 100ms.

```sql
SELECT * FROM monitoring.v_slow_queries LIMIT 10;
```

**Columns:**
- `query_snippet` - First 100 characters of the query
- `calls` - Number of times executed
- `mean_exec_time_ms` - Average execution time
- `max_exec_time_ms` - Maximum execution time
- `cache_hit_ratio` - Percentage of cache hits

**Use Case:** Identify slow queries for optimization.

---

#### `v_top_queries_by_time`
Top 50 queries by total execution time.

```sql
SELECT * FROM monitoring.v_top_queries_by_time LIMIT 10;
```

**Columns:**
- `query_snippet` - Query text
- `total_exec_time_ms` - Total time spent
- `pct_total_time` - Percentage of total database time
- `rows_per_call` - Average rows returned

**Use Case:** Find queries consuming most database resources.

---

### 2. Table Statistics Views

#### `v_table_stats`
Comprehensive table statistics including size, bloat, and vacuum status.

```sql
SELECT * FROM monitoring.v_table_stats ORDER BY total_size DESC LIMIT 10;
```

**Columns:**
- `tablename` - Table name
- `total_size` - Total size (table + indexes)
- `table_size` - Table data size only
- `indexes_size` - Total index size
- `n_live_tup` - Live row count
- `n_dead_tup` - Dead row count (needs VACUUM)
- `bloat_pct` - Percentage of dead tuples
- `index_usage_pct` - Percentage of queries using indexes vs seq scans

**Use Case:** Monitor table growth and identify bloat.

---

#### `v_table_bloat`
Tables with >10% dead tuples (bloat).

```sql
SELECT * FROM monitoring.v_table_bloat;
```

**Action Items:**
- `bloat_pct > 30%` → Run VACUUM immediately
- `bloat_pct > 15%` → Schedule VACUUM soon
- `bloat_pct > 10%` → Monitor closely

---

### 3. Index Usage Views

#### `v_index_usage`
Index usage statistics with categorization.

```sql
SELECT * FROM monitoring.v_index_usage WHERE usage_category = 'UNUSED';
```

**Categories:**
- `UNUSED` - Never used (candidate for removal)
- `LOW_USAGE` - < 100 scans (review necessity)
- `ACTIVE` - Actively used

**Use Case:** Identify unused indexes wasting space and write performance.

---

#### `v_unused_indexes`
Indexes that have never been scanned.

```sql
SELECT * FROM monitoring.v_unused_indexes;
```

**Action:** Review and consider dropping (except primary keys).

---

#### `v_index_cache_hit_ratio`
Index cache hit ratios.

```sql
SELECT * FROM monitoring.v_index_cache_hit_ratio
WHERE cache_hit_ratio < 95
ORDER BY cache_hit_ratio ASC;
```

**Threshold:** < 95% may indicate need for more RAM or frequently accessed cold data.

---

### 4. Connection Monitoring Views

#### `v_connection_stats`
Active database connections with wait events and query duration.

```sql
SELECT * FROM monitoring.v_connection_stats;
```

**Use Case:** Debug slow queries and identify connection pool issues.

---

#### `v_connection_summary`
Connection count by state.

```sql
SELECT * FROM monitoring.v_connection_summary;
```

**Thresholds:**
- Total connections > 80 → Warning: Pool may need tuning
- Total connections > 50 → Notice: High usage

---

### 5. Partition Health Views

#### `v_partition_health`
Health and size metrics for partitioned tables (orders, trades).

```sql
SELECT * FROM monitoring.v_partition_health ORDER BY partition_date DESC LIMIT 20;
```

**Columns:**
- `tablename` - Partition name (e.g., `orders_2024_11`)
- `parent_table` - Parent table (orders or trades)
- `partition_date` - Date this partition covers
- `row_count` - Number of rows
- `total_size` - Partition size

**Use Case:** Monitor partition growth and plan retention.

---

#### `v_partition_growth`
Partition growth trends and distribution.

```sql
SELECT * FROM monitoring.v_partition_growth;
```

**Use Case:** Predict storage needs and validate partitioning strategy.

---

### 6. Cache Performance Views

#### `v_cache_hit_ratio`
Overall cache hit ratios.

```sql
SELECT * FROM monitoring.v_cache_hit_ratio;
```

**Metrics:**
- `table_hit_ratio` - Table data cache hits
- `index_hit_ratio` - Index cache hits
- `overall_hit_ratio` - Combined hit ratio

**Optimal:** > 99% for production workloads.

**Action if < 95%:**
- Increase `shared_buffers`
- Add more RAM
- Review query patterns

---

#### `v_blocking_queries`
Queries blocking other queries (lock contention).

```sql
SELECT * FROM monitoring.v_blocking_queries;
```

**Use Case:** Debug deadlocks and performance issues.

---

## Performance Functions

All functions are in the `monitoring` schema.

### 1. Query Analysis Functions

#### `get_query_performance(interval)`
Get query performance statistics for time period.

```sql
-- Get last hour's query stats
SELECT * FROM monitoring.get_query_performance(INTERVAL '1 hour') LIMIT 20;

-- Get last 24 hours
SELECT * FROM monitoring.get_query_performance(INTERVAL '24 hours') LIMIT 20;
```

**Returns:**
- Query snippet
- Call count
- Total/mean/max execution time
- Rows returned
- Cache hit ratio

---

#### `get_table_bloat()`
Identify bloated tables with actionable recommendations.

```sql
SELECT * FROM monitoring.get_table_bloat();
```

**Returns:**
- Table name
- Live vs dead tuples
- Bloat percentage
- Wasted space
- Recommendation (OK, MONITOR, WARNING, CRITICAL)

**Actions:**
- CRITICAL → Run `VACUUM FULL` immediately
- WARNING → Run `VACUUM` soon
- MONITOR → Keep watching

---

#### `get_missing_indexes()`
Suggest tables that may benefit from additional indexes.

```sql
SELECT * FROM monitoring.get_missing_indexes() WHERE priority = 'HIGH';
```

**Priority Levels:**
- HIGH - Seq scans > 1000 AND rows > 10,000
- MEDIUM - Seq scans > 100 AND rows > 1,000
- LOW - Seq scans > 10
- NONE - No action needed

**Use Case:** Optimize query performance by adding indexes where needed.

---

### 2. Partition Management Functions

#### `create_future_order_partitions(months_ahead)`
Auto-create future monthly partitions for orders table.

```sql
-- Create next 3 months of partitions
SELECT * FROM monitoring.create_future_order_partitions(3);
```

**Recommended:** Run monthly via cron job.

---

#### `create_future_trade_partitions(days_ahead)`
Auto-create future daily partitions for trades table.

```sql
-- Create next 30 days of partitions
SELECT * FROM monitoring.create_future_trade_partitions(30);
```

**Recommended:** Run weekly via cron job.

---

#### `analyze_partition_usage()`
Analyze partition access patterns and suggest retention actions.

```sql
SELECT * FROM monitoring.analyze_partition_usage()
WHERE retention_action LIKE 'ARCHIVE_CANDIDATE%';
```

**Retention Actions:**
- ACTIVE - Keep current
- MONITOR - Older than 3 months
- CONSIDER_ARCHIVE - Low access over 6+ months
- ARCHIVE_CANDIDATE - Not accessed in 1+ year

---

#### `archive_old_partitions(retention_months)`
Detach old partitions for archival (does NOT drop data).

```sql
-- Detach partitions older than 12 months
SELECT * FROM monitoring.archive_old_partitions(12);
```

**IMPORTANT:** This only detaches partitions. Manual review recommended before dropping.

---

### 3. Maintenance Functions

#### `run_maintenance_vacuum()`
Run VACUUM ANALYZE on all tables.

```sql
SELECT * FROM monitoring.run_maintenance_vacuum();
```

**Use Case:** Scheduled maintenance window (weekly recommended).

---

#### `update_table_statistics()`
Update table statistics (planner statistics) for all tables.

```sql
SELECT * FROM monitoring.update_table_statistics();
```

**Use Case:** After bulk data loads or significant data changes.

---

#### `partition_maintenance()`
Automated partition creation and archive detection.

```sql
SELECT * FROM monitoring.partition_maintenance();
```

**Use Case:** Daily cron job for partition management.

---

#### `database_health_check()`
Comprehensive database health check with recommendations.

```sql
SELECT * FROM monitoring.database_health_check();
```

**Checks:**
1. Cache hit ratio
2. Table bloat
3. Unused indexes
4. Connection count

**Use Case:** Daily health monitoring and alerting.

---

#### `reset_query_stats()`
Reset pg_stat_statements statistics (use with caution).

```sql
SELECT monitoring.reset_query_stats();
```

**CAUTION:** Only use when establishing new baselines.

---

## Automated Maintenance

### Maintenance Schedule

Four jobs are pre-configured in `monitoring.maintenance_schedule`:

| Job Name | Type | Schedule | Description |
|----------|------|----------|-------------|
| `daily_partition_creation` | PARTITION | `0 1 * * *` | Daily at 1 AM |
| `daily_statistics_update` | ANALYZE | `0 2 * * *` | Daily at 2 AM |
| `weekly_vacuum` | VACUUM | `0 3 * * 0` | Sunday at 3 AM |
| `hourly_query_stats` | STATS | `0 * * * *` | Every hour |

### View Schedule

```sql
SELECT * FROM monitoring.maintenance_schedule;
```

### Run Scheduled Job

```sql
SELECT monitoring.run_scheduled_maintenance('daily_partition_creation');
```

### View Maintenance Log

```sql
SELECT *
FROM monitoring.maintenance_log
ORDER BY started_at DESC
LIMIT 20;
```

### Cron Job Setup (Recommended)

Add to host crontab or Kubernetes CronJob:

```bash
# Daily partition creation (1 AM)
0 1 * * * docker exec mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine -c "SELECT monitoring.run_scheduled_maintenance('daily_partition_creation');"

# Daily statistics update (2 AM)
0 2 * * * docker exec mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine -c "SELECT monitoring.run_scheduled_maintenance('daily_statistics_update');"

# Weekly vacuum (Sunday 3 AM)
0 3 * * 0 docker exec mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine -c "SELECT monitoring.run_scheduled_maintenance('weekly_vacuum');"
```

---

## Performance Baselines

### Initial Baseline (2025-11-23)

**Database Configuration:**
- PostgreSQL 15-alpine
- Partitioned tables: orders (monthly), trades (daily)
- Total objects: 97+ (tables, views, functions, indexes)
- Partitions: 42+

**Expected Performance:**

| Metric | Baseline | Target |
|--------|----------|--------|
| Cache hit ratio | > 99% | > 99% |
| Query latency (p99) | < 100ms | < 100ms |
| Index usage | > 80% | > 90% |
| Table bloat | < 10% | < 15% |
| Connection pool usage | < 50 | < 80 |

### Cache Hit Ratio Baseline

```sql
-- Expected results
table_hit_ratio:  99.5%+
index_hit_ratio:  99.0%+
overall_hit_ratio: 99.3%+
```

### Database Size Baseline

```sql
-- Current size (empty database)
Database size: ~50MB (schema only)

-- Expected growth (per month)
Orders: ~10GB/month @ 1M orders
Trades: ~50GB/month @ 10M trades
Order book: ~1GB (in-memory cache primary)
```

### Partition Count Baseline

```sql
-- Initial partitions created
Orders: 42 monthly partitions (2024-01 to 2027-06)
Trades: 90 daily partitions (90 days future)
```

---

## Query Optimization

### Run Query Analysis

```bash
# Analyze key queries and verify index usage
cat scripts/analyze-query-performance.sql | docker exec -i mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine
```

### Key Queries to Monitor

1. **Order listing by user**
   - Expected: Index scan on `idx_orders_user_status`
   - Target latency: < 50ms

2. **Order book depth**
   - Expected: Index scan on `idx_orderbook_symbol_side_price`
   - Target latency: < 20ms

3. **Trade history**
   - Expected: Index scan with partition pruning
   - Target latency: < 100ms

4. **User trade history**
   - Expected: Bitmap scan on user indexes
   - Target latency: < 100ms

### Optimization Checklist

- [ ] All key queries use indexes (no seq scans on large tables)
- [ ] Partition pruning works correctly
- [ ] Cache hit ratio > 99%
- [ ] No table bloat > 15%
- [ ] No unused indexes > 100MB
- [ ] Connection count < 80
- [ ] No blocking queries

---

## Troubleshooting

### Issue: pg_stat_statements not collecting data

**Symptom:** `SELECT * FROM pg_stat_statements` returns error or empty results.

**Solution:**
```bash
# 1. Check if extension is loaded
docker exec -i mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine -c "SHOW shared_preload_libraries;"

# 2. If not loaded, add to postgresql.conf and restart
docker exec -it mytrader-postgres bash
echo "shared_preload_libraries = 'pg_stat_statements'" >> /var/lib/postgresql/data/postgresql.conf
exit
docker-compose restart postgres

# 3. Recreate extension
docker exec -i mytrader-postgres psql -U trade_engine_app -d mytrader_trade_engine -c "DROP EXTENSION IF EXISTS pg_stat_statements; CREATE EXTENSION pg_stat_statements;"
```

---

### Issue: Slow queries detected

**Symptom:** Queries appearing in `v_slow_queries` with high execution time.

**Steps:**
1. Identify the query:
   ```sql
   SELECT * FROM monitoring.v_slow_queries LIMIT 5;
   ```

2. Run EXPLAIN ANALYZE:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) <your_query>;
   ```

3. Check for missing indexes:
   ```sql
   SELECT * FROM monitoring.get_missing_indexes() WHERE priority = 'HIGH';
   ```

4. Verify partition pruning (if applicable):
   - Look for "Partitions scanned" in EXPLAIN output
   - Should only scan relevant partitions

---

### Issue: High table bloat

**Symptom:** Tables in `v_table_bloat` with > 30% bloat.

**Solution:**
```sql
-- 1. Check bloat
SELECT * FROM monitoring.get_table_bloat();

-- 2. Run VACUUM ANALYZE
VACUUM ANALYZE table_name;

-- 3. If bloat persists, run VACUUM FULL (requires table lock)
VACUUM FULL table_name;
```

---

### Issue: Low cache hit ratio

**Symptom:** Cache hit ratio < 95%.

**Solutions:**
1. Increase shared_buffers:
   ```conf
   # postgresql.conf
   shared_buffers = 256MB  # Increase to 512MB or 1GB
   ```

2. Increase effective_cache_size:
   ```conf
   effective_cache_size = 1GB  # Set to 50-75% of total RAM
   ```

3. Review query patterns for full table scans

---

### Issue: Too many connections

**Symptom:** Connection count > 80.

**Solutions:**
1. Check connection summary:
   ```sql
   SELECT * FROM monitoring.v_connection_summary;
   ```

2. Tune PgBouncer pool size (if using)

3. Adjust max_connections in postgresql.conf

4. Review application connection pooling settings

---

## Best Practices

### Daily Monitoring

Run these queries daily (or integrate with Grafana):

```sql
-- 1. Health check
SELECT * FROM monitoring.database_health_check();

-- 2. Cache hit ratios
SELECT * FROM monitoring.v_cache_hit_ratio;

-- 3. Slow queries
SELECT * FROM monitoring.v_slow_queries LIMIT 10;

-- 4. Connection count
SELECT * FROM monitoring.v_connection_summary;

-- 5. Table bloat
SELECT * FROM monitoring.get_table_bloat() WHERE bloat_percentage > 15;
```

### Weekly Review

```sql
-- 1. Top queries by time
SELECT * FROM monitoring.v_top_queries_by_time LIMIT 20;

-- 2. Unused indexes
SELECT * FROM monitoring.v_unused_indexes WHERE index_size LIKE '%GB%';

-- 3. Partition growth
SELECT * FROM monitoring.v_partition_growth;

-- 4. Missing indexes
SELECT * FROM monitoring.get_missing_indexes() WHERE priority IN ('HIGH', 'MEDIUM');
```

### Monthly Maintenance

```sql
-- 1. Create future partitions
SELECT * FROM monitoring.create_future_order_partitions(3);
SELECT * FROM monitoring.create_future_trade_partitions(30);

-- 2. Review partition retention
SELECT * FROM monitoring.analyze_partition_usage()
WHERE retention_action LIKE 'ARCHIVE%';

-- 3. Vacuum analyze all tables
SELECT * FROM monitoring.run_maintenance_vacuum();

-- 4. Update statistics
SELECT * FROM monitoring.update_table_statistics();
```

### Performance Tuning Workflow

1. **Identify** - Use `v_slow_queries` to find slow queries
2. **Analyze** - Run EXPLAIN ANALYZE on the query
3. **Optimize** - Add indexes, rewrite query, or partition
4. **Verify** - Re-run and check execution time
5. **Monitor** - Track improvements over time

### Alerting Thresholds

Set up alerts for:

- Cache hit ratio < 95%
- Query latency p99 > 100ms
- Table bloat > 30%
- Connection count > 80
- Unused indexes > 500MB
- Partition creation failures

---

## Integration with Grafana

### Metrics to Expose

1. **Query Performance**
   - Average query latency
   - p50, p95, p99 latencies
   - Queries per second

2. **Database Health**
   - Cache hit ratios
   - Table bloat percentage
   - Active connections

3. **Partition Health**
   - Partition count
   - Total rows
   - Storage usage

### Sample Grafana Queries

```sql
-- Cache hit ratio timeseries
SELECT
    NOW() as time,
    metric,
    percentage as value
FROM monitoring.v_cache_hit_ratio;

-- Connection count timeseries
SELECT
    NOW() as time,
    state,
    connection_count as value
FROM monitoring.v_connection_summary;

-- Table size growth
SELECT
    NOW() as time,
    tablename,
    pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_stat_user_tables
WHERE schemaname = 'public';
```

---

## Support and Escalation

### Database Agent Contact

For performance issues or monitoring questions:
- **Agent:** Database Engineer Agent
- **Scope:** Query optimization, schema tuning, monitoring setup
- **Response Time:** Best effort (agent-based)

### Escalation Path

1. **Level 1:** Check this documentation
2. **Level 2:** Review monitoring views and functions
3. **Level 3:** Run verification and query analysis scripts
4. **Level 4:** Contact Tech Lead for architecture review

---

## Appendix

### File Locations

- **Migrations:** `/services/trade-engine/migrations/`
  - `004-performance-monitoring.sql` - Views setup
  - `005-performance-functions.sql` - Functions
  - `006-automated-maintenance.sql` - Maintenance config

- **Scripts:** `/services/trade-engine/scripts/`
  - `verify-monitoring-setup.sql` - Verification
  - `analyze-query-performance.sql` - Query analysis

- **Documentation:** `/services/trade-engine/docs/`
  - `DATABASE_PERFORMANCE_MONITORING.md` (this file)

### Related Documentation

- Database Schema Design (Day 1)
- Partitioning Strategy (Day 1)
- Index Strategy (Day 1)
- Query Optimization Guide (this document)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-23
**Next Review:** 2025-12-23
