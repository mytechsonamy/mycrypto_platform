# Trade Engine Database Schema Documentation

**Version:** 1.0.0
**Last Updated:** 2025-11-23
**Database:** PostgreSQL 16
**Schema Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [ENUM Types](#enum-types)
4. [Core Tables](#core-tables)
5. [Auxiliary Tables](#auxiliary-tables)
6. [Partitioning Strategy](#partitioning-strategy)
7. [Indexes](#indexes)
8. [Views](#views)
9. [Functions](#functions)
10. [Triggers](#triggers)
11. [Performance Considerations](#performance-considerations)
12. [Migration Guide](#migration-guide)

---

## Overview

The Trade Engine database schema is designed to support a high-performance cryptocurrency exchange platform with the following key features:

- **Partitioned Tables**: Orders and trades tables use range partitioning for scalability
- **Real-time Order Book**: Optimized indexes for fast order matching
- **Audit Trail**: Complete history of all orders and trades
- **Stop Order Monitoring**: Dedicated watchlist for stop order triggers
- **Performance Monitoring**: Built-in views and functions for metrics

### Design Goals

1. **Scalability**: Handle millions of orders and trades efficiently
2. **Performance**: Sub-millisecond order book queries
3. **Data Integrity**: ACID compliance with comprehensive constraints
4. **Regulatory Compliance**: 5-year data retention for audit trails
5. **Recovery**: Point-in-time recovery with snapshot capabilities

---

## Database Architecture

### Connection Details

```
Database Name: trade_engine_db
User: trade_engine_user
Password: trade_engine_pass
Host: localhost
Port: 5433 (mapped from container port 5432)
```

### Schema Structure

```
trade_engine_db/
├── ENUM Types (5)
│   ├── order_side_enum
│   ├── order_type_enum
│   ├── order_status_enum
│   ├── time_in_force_enum
│   └── symbol_status_enum
│
├── Core Tables (3)
│   ├── symbols
│   ├── orders (partitioned by month)
│   └── trades (partitioned by day)
│
├── Auxiliary Tables (3)
│   ├── stop_orders_watchlist
│   ├── order_book_snapshots
│   └── partition_retention_config
│
├── Views (7)
│   ├── v_active_orders
│   ├── v_user_order_summary
│   ├── v_symbol_stats_24h
│   ├── v_monitoring_active_orders
│   ├── v_monitoring_trade_volume_24h
│   ├── v_monitoring_order_status
│   └── mv_order_book_snapshot (materialized)
│
└── Functions (13)
    ├── Partition Management (3)
    ├── Order Book Queries (2)
    ├── Analytics (3)
    ├── Monitoring (3)
    └── Triggers (4)
```

---

## ENUM Types

### 1. order_side_enum

Defines the side of an order (buy or sell).

```sql
CREATE TYPE order_side_enum AS ENUM ('BUY', 'SELL');
```

**Values:**
- `BUY`: Buy order (bid)
- `SELL`: Sell order (ask)

---

### 2. order_type_enum

Defines the type of order execution.

```sql
CREATE TYPE order_type_enum AS ENUM (
  'MARKET',
  'LIMIT',
  'STOP',
  'STOP_LIMIT',
  'TRAILING_STOP'
);
```

**Values:**
- `MARKET`: Execute immediately at best available price
- `LIMIT`: Execute only at specified price or better
- `STOP`: Convert to market order when stop price is reached
- `STOP_LIMIT`: Convert to limit order when stop price is reached
- `TRAILING_STOP`: Stop price adjusts with market movement (Phase 2)

---

### 3. order_status_enum

Defines the current state of an order.

```sql
CREATE TYPE order_status_enum AS ENUM (
  'PENDING',
  'OPEN',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCELLED',
  'REJECTED',
  'EXPIRED'
);
```

**State Transitions:**
```
PENDING → OPEN → PARTIALLY_FILLED → FILLED
        ↓       ↓                   ↓
        ↓       ↓                   ↓
        → REJECTED | CANCELLED | EXPIRED
```

**Terminal States:** FILLED, CANCELLED, REJECTED, EXPIRED (cannot transition from these)

---

### 4. time_in_force_enum

Defines order lifetime and execution rules.

```sql
CREATE TYPE time_in_force_enum AS ENUM ('GTC', 'IOC', 'FOK', 'DAY');
```

**Values:**
- `GTC` (Good Till Cancelled): Remains active until filled or cancelled
- `IOC` (Immediate or Cancel): Fill immediately, cancel unfilled portion
- `FOK` (Fill or Kill): Fill entire order immediately or cancel
- `DAY` (Day Order): Expires at end of trading day (Phase 2)

---

### 5. symbol_status_enum

Defines trading status of a symbol.

```sql
CREATE TYPE symbol_status_enum AS ENUM (
  'ACTIVE',
  'HALTED',
  'MAINTENANCE',
  'DELISTED'
);
```

**Values:**
- `ACTIVE`: Normal trading
- `HALTED`: Trading temporarily suspended
- `MAINTENANCE`: Under maintenance, no trading
- `DELISTED`: No longer tradable

---

## Core Tables

### 1. symbols

Stores trading pair configurations and parameters.

**Purpose:** Define available trading pairs with their trading rules, fees, and constraints.

```sql
CREATE TABLE symbols (
  symbol_id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  base_asset VARCHAR(10) NOT NULL,
  quote_asset VARCHAR(10) NOT NULL,
  status symbol_status_enum NOT NULL DEFAULT 'ACTIVE',
  status_reason TEXT,
  estimated_resume TIMESTAMP,
  tick_size DECIMAL(20,8) NOT NULL DEFAULT 0.01,
  min_order_size DECIMAL(20,8) NOT NULL DEFAULT 0.0001,
  max_order_size DECIMAL(20,8) NOT NULL DEFAULT 100,
  min_order_value DECIMAL(20,8) NOT NULL DEFAULT 10,
  price_band_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  maker_fee DECIMAL(6,4) NOT NULL DEFAULT 0.0005,
  taker_fee DECIMAL(6,4) NOT NULL DEFAULT 0.0010,
  trading_start TIME,
  trading_end TIME,
  trading_timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Key Columns:**
- `symbol`: Trading pair identifier (e.g., 'BTC/USDT')
- `tick_size`: Minimum price increment (e.g., 0.01)
- `min_order_size`: Minimum order quantity
- `max_order_size`: Maximum order quantity
- `price_band_percentage`: Max price deviation from last trade (±%)
- `maker_fee`: Fee for providing liquidity (0.0005 = 0.05%)
- `taker_fee`: Fee for taking liquidity (0.0010 = 0.10%)

**Indexes:**
- `symbols_pkey` (PRIMARY KEY on symbol_id)
- `symbols_symbol_key` (UNIQUE on symbol)
- `IDX_symbols_status` (status)
- `IDX_symbols_base_quote` (base_asset, quote_asset)

**Default Trading Pairs:**
- BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT, XRP/USDT
- ADA/USDT, DOGE/USDT, AVAX/USDT, DOT/USDT, MATIC/USDT

---

### 2. orders (Partitioned)

Stores all order lifecycle data with monthly partitioning.

**Purpose:** Track all orders from creation through completion with full audit trail.

```sql
CREATE TABLE orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  institution_id UUID,
  symbol VARCHAR(20) NOT NULL,
  side order_side_enum NOT NULL,
  order_type order_type_enum NOT NULL,
  status order_status_enum NOT NULL DEFAULT 'PENDING',
  quantity DECIMAL(20,8) NOT NULL,
  filled_quantity DECIMAL(20,8) NOT NULL DEFAULT 0,
  price DECIMAL(20,8),
  average_price DECIMAL(20,8),
  stop_price DECIMAL(20,8),
  time_in_force time_in_force_enum NOT NULL DEFAULT 'GTC',
  client_order_id VARCHAR(100),
  order_source VARCHAR(50),
  fee_profile_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  filled_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  expires_at TIMESTAMP
) PARTITION BY RANGE (created_at);
```

**Key Columns:**
- `order_id`: Unique order identifier (UUID)
- `client_order_id`: Client-provided ID for idempotency (24h TTL)
- `quantity`: Total order quantity
- `filled_quantity`: Amount filled so far
- `price`: Limit price (NULL for MARKET orders)
- `average_price`: Average fill price for partial fills
- `stop_price`: Trigger price for STOP orders

**Constraints:**
- `chk_quantity_positive`: quantity > 0
- `chk_filled_lte_quantity`: filled_quantity <= quantity
- `chk_market_no_price`: MARKET orders must have NULL price
- `chk_limit_has_price`: LIMIT orders must have price
- `chk_stop_has_stop_price`: STOP orders must have stop_price

**Partitioning:**
- **Strategy:** RANGE partitioning by created_at (monthly)
- **Partition Naming:** orders_YYYY_MM (e.g., orders_2024_11)
- **Initial Partitions:** 12 months (current month + 11 months ahead)
- **Maintenance:** Auto-create future partitions, archive old ones

**Partition Example:**
```sql
orders_2024_11  -- FOR VALUES FROM ('2024-11-01') TO ('2024-12-01')
orders_2024_12  -- FOR VALUES FROM ('2024-12-01') TO ('2025-01-01')
orders_2025_01  -- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')
```

**Indexes:** (see Indexes section for details)

---

### 3. trades (Partitioned)

Stores all executed trade records with daily partitioning.

**Purpose:** Immutable record of all matched trades for settlement and reporting.

```sql
CREATE TABLE trades (
  trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  buyer_order_id UUID NOT NULL,
  seller_order_id UUID NOT NULL,
  buyer_user_id UUID NOT NULL,
  seller_user_id UUID NOT NULL,
  buyer_institution_id UUID,
  seller_institution_id UUID,
  price DECIMAL(20,8) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  buyer_fee DECIMAL(20,8) NOT NULL,
  seller_fee DECIMAL(20,8) NOT NULL,
  buyer_fee_asset VARCHAR(10) NOT NULL,
  seller_fee_asset VARCHAR(10) NOT NULL,
  is_buyer_maker BOOLEAN NOT NULL,
  trade_source VARCHAR(50),
  execution_venue VARCHAR(50),
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP
) PARTITION BY RANGE (executed_at);
```

**Key Columns:**
- `trade_id`: Unique trade identifier
- `buyer_order_id`, `seller_order_id`: Orders involved in trade
- `is_buyer_maker`: TRUE if buyer provided liquidity (passive)
- `trade_source`: INTERNAL | BROKER | SIMULATION
- `execution_venue`: For multi-venue routing (Phase 3)

**Constraints:**
- `chk_price_positive`: price > 0
- `chk_quantity_positive`: quantity > 0
- `chk_self_trade_prevention`: buyer_user_id != seller_user_id

**Partitioning:**
- **Strategy:** RANGE partitioning by executed_at (daily)
- **Partition Naming:** trades_YYYY_MM_DD (e.g., trades_2024_11_22)
- **Initial Partitions:** 30 days (today + 29 days ahead)
- **Maintenance:** Auto-create future partitions daily

**Partition Example:**
```sql
trades_2024_11_22  -- FOR VALUES FROM ('2024-11-22') TO ('2024-11-23')
trades_2024_11_23  -- FOR VALUES FROM ('2024-11-23') TO ('2024-11-24')
```

---

## Auxiliary Tables

### 1. stop_orders_watchlist

Active stop orders being monitored for trigger conditions.

```sql
CREATE TABLE stop_orders_watchlist (
  order_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  side order_side_enum NOT NULL,
  stop_price DECIMAL(20,8) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Efficiently track stop orders that need price monitoring.

**Lifecycle:**
- **Added:** When STOP/STOP_LIMIT order is created with status OPEN
- **Removed:** When order status changes to FILLED, CANCELLED, REJECTED, or EXPIRED

---

### 2. order_book_snapshots

Periodic snapshots of order book state for recovery and auditing.

```sql
CREATE TABLE order_book_snapshots (
  snapshot_id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  bids JSONB NOT NULL,
  asks JSONB NOT NULL,
  sequence_number BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT UQ_symbol_sequence UNIQUE (symbol, sequence_number)
);
```

**Purpose:** Point-in-time recovery and historical order book analysis.

**JSON Format:**
```json
{
  "bids": [
    {"price": "50000.00", "quantity": "1.5", "orders": ["uuid1", "uuid2"]},
    {"price": "49999.00", "quantity": "0.8", "orders": ["uuid3"]}
  ],
  "asks": [
    {"price": "50001.00", "quantity": "2.0", "orders": ["uuid4"]},
    {"price": "50002.00", "quantity": "1.2", "orders": ["uuid5", "uuid6"]}
  ]
}
```

---

### 3. partition_retention_config

Configuration for partition retention policies.

```sql
CREATE TABLE partition_retention_config (
  table_name VARCHAR(50) PRIMARY KEY,
  retention_months INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Default Policies:**
- `orders`: 60 months (5 years) - regulatory requirement
- `trades`: 60 months (5 years) - regulatory requirement

---

## Partitioning Strategy

### Why Partitioning?

1. **Performance**: Faster queries by scanning only relevant partitions
2. **Maintenance**: Easier to archive/drop old data
3. **Scalability**: Distribute data across multiple physical files
4. **Backup**: Backup recent partitions more frequently

### Orders Table Partitioning (Monthly)

**Reasoning:** Orders have longer lifecycle, monthly granularity is sufficient.

```sql
-- Partition by month (created_at)
orders_2024_11  -- November 2024 orders
orders_2024_12  -- December 2024 orders
orders_2025_01  -- January 2025 orders
```

**Partition Management:**
```sql
-- Create new partition
SELECT create_orders_partition('2025-02-01'::DATE);

-- View partitions
SELECT tablename FROM pg_tables WHERE tablename LIKE 'orders_%' ORDER BY tablename;
```

---

### Trades Table Partitioning (Daily)

**Reasoning:** High-volume table, daily partitioning for better performance.

```sql
-- Partition by day (executed_at)
trades_2024_11_22  -- Nov 22, 2024 trades
trades_2024_11_23  -- Nov 23, 2024 trades
trades_2024_11_24  -- Nov 24, 2024 trades
```

**Partition Management:**
```sql
-- Create new partition
SELECT create_trades_partition('2024-11-25'::DATE);

-- View partitions
SELECT tablename FROM pg_tables WHERE tablename LIKE 'trades_%' ORDER BY tablename;
```

---

### Automated Partition Maintenance

**Function:** `maintain_partitions()`

```sql
-- Run daily to create future partitions
SELECT maintain_partitions();
```

**What it does:**
1. Creates order partitions for next 3 months
2. Creates trade partitions for next 7 days
3. Logs retention policy status

**Recommended Schedule:** Run daily at 2 AM via cron or scheduler.

---

## Indexes

### Orders Table Indexes

```sql
-- User queries (order history)
IDX_orders_user_symbol_status (user_id, symbol, status)
  WHERE status IN ('OPEN', 'PARTIALLY_FILLED')

-- Order matching (by price-time priority)
IDX_orders_matching (symbol, side, price, created_at)
  WHERE status IN ('OPEN', 'PARTIALLY_FILLED') AND price IS NOT NULL

-- Symbol-specific queries
IDX_orders_symbol_status_price (symbol, status, price)
  WHERE status IN ('OPEN', 'PARTIALLY_FILLED') AND price IS NOT NULL

-- Status monitoring
IDX_orders_status_created (status, created_at DESC)

-- Idempotency checks
IDX_orders_client_order_id (client_order_id, user_id)
  WHERE client_order_id IS NOT NULL

-- Stop order monitoring
IDX_orders_stop_monitoring (symbol, stop_price)
  WHERE order_type IN ('STOP', 'STOP_LIMIT') AND status = 'OPEN'

-- User order history
IDX_orders_user_created (user_id, created_at DESC)

-- Active order book
IDX_orders_active (symbol, side, price)
  WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
```

### Trades Table Indexes

```sql
-- User trade history
IDX_trades_buyer (buyer_user_id, executed_at DESC)
IDX_trades_seller (seller_user_id, executed_at DESC)

-- Symbol analytics
IDX_trades_symbol_time (symbol, executed_at DESC)

-- Time-series queries
IDX_trades_executed_at (executed_at DESC)

-- Order-to-trade lookup
IDX_trades_buyer_order (buyer_order_id)
IDX_trades_seller_order (seller_order_id)
```

### Index Strategy

**Partial Indexes:** Only index rows that are frequently queried (e.g., active orders)

**Composite Indexes:** Match common query patterns (e.g., user_id + symbol)

**B-Tree vs Hash:** B-Tree for range queries, Hash for exact matches (client_order_id)

---

## Views

### 1. v_active_orders

Active orders sorted by price-time priority for matching engine.

```sql
SELECT * FROM v_active_orders WHERE symbol = 'BTC/USDT';
```

---

### 2. v_user_order_summary

User order statistics per symbol.

```sql
SELECT * FROM v_user_order_summary WHERE user_id = 'uuid';
```

---

### 3. v_symbol_stats_24h

24-hour trading statistics per symbol.

```sql
SELECT * FROM v_symbol_stats_24h;
```

**Returns:** trade_count, volume, quote_volume, low_price, high_price, last_price

---

### 4. v_monitoring_active_orders

Real-time active order counts by symbol.

---

### 5. v_monitoring_trade_volume_24h

24-hour trade volume by symbol.

---

### 6. v_monitoring_order_status

Order status distribution (24h).

---

### 7. mv_order_book_snapshot (Materialized View)

Pre-aggregated order book for fast queries.

```sql
-- Refresh materialized view
SELECT refresh_order_book_snapshot();

-- Query
SELECT * FROM mv_order_book_snapshot WHERE symbol = 'BTC/USDT';
```

---

## Functions

### Partition Management

1. **create_orders_partition(DATE)**: Create monthly partition for orders
2. **create_trades_partition(DATE)**: Create daily partition for trades
3. **maintain_partitions()**: Automated partition maintenance

### Order Book Queries

4. **get_order_book_depth(symbol, depth)**: Get order book with specified depth
5. **get_best_bid_ask(symbol)**: Get best bid/ask and spread

### User Queries

6. **get_user_trade_history(user_id, symbol, limit, offset)**: User trade history

### Analytics

7. **calculate_vwap(symbol, interval_hours)**: Volume Weighted Average Price
8. **get_trading_volume(symbol, period)**: Trading volume by period
9. **get_order_fill_rate(user_id, days)**: User order fill rate

### Monitoring

10. **check_db_connections()**: Database connection health
11. **check_table_sizes()**: Table size monitoring
12. **check_partition_health()**: Partition statistics

### Utility

13. **refresh_order_book_snapshot()**: Refresh materialized view

---

## Triggers

### 1. Auto-Update Timestamps

**Tables:** symbols, orders
**Function:** `update_updated_at_column()`
**Action:** Sets updated_at to CURRENT_TIMESTAMP on UPDATE

---

### 2. Order Lifecycle Management

**set_filled_at_timestamp()**: Sets filled_at when order status becomes FILLED

**set_cancelled_at_timestamp()**: Sets cancelled_at when order status becomes CANCELLED

**validate_order_status_transition()**: Prevents invalid status transitions (e.g., FILLED → CANCELLED)

---

### 3. Stop Order Watchlist

**add_stop_order_to_watchlist()**: Adds STOP/STOP_LIMIT orders to watchlist on INSERT

**remove_stop_order_from_watchlist()**: Removes from watchlist when order completes

---

## Performance Considerations

### Query Optimization

1. **Use Partial Indexes**: Most queries target active orders only
2. **Leverage Partitions**: Include created_at/executed_at in WHERE clause
3. **Avoid Full Table Scans**: Always use indexed columns

### Example: Fast Order Book Query

```sql
-- Good: Uses index on symbol + status
SELECT * FROM orders
WHERE symbol = 'BTC/USDT'
  AND status = 'OPEN'
  AND side = 'BUY'
ORDER BY price DESC, created_at ASC
LIMIT 20;

-- Bad: Full table scan
SELECT * FROM orders
WHERE quantity > 1.0;
```

### Connection Pooling

Use PgBouncer for connection pooling:
- Pool mode: transaction
- Max connections: 100
- Default pool size: 20

---

## Migration Guide

### Running Migrations

Migrations are executed in sequence using TypeORM:

```bash
# Run all migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Migration Order

1. `1700000001000-CreateEnums.ts` - ENUM types
2. `1700000002000-CreateSymbolsTable.ts` - Symbols table
3. `1700000003000-CreateOrdersTable.ts` - Orders table with partitions
4. `1700000004000-CreateTradesTable.ts` - Trades table with partitions
5. `1700000005000-CreateAuxiliaryTables.ts` - Supporting tables and views
6. `1700000006000-CreateUtilityFunctions.ts` - Utility functions

### Rollback Strategy

Each migration includes a `down()` method for safe rollback:

```typescript
public async down(queryRunner: QueryRunner): Promise<void> {
  // Clean rollback logic
}
```

---

## Best Practices

### Data Integrity

1. Always use constraints (CHECK, NOT NULL, UNIQUE)
2. Validate status transitions with triggers
3. Prevent self-trading with constraints

### Performance

1. Create indexes before inserting large datasets
2. Use EXPLAIN to validate query plans
3. Monitor index usage with pg_stat_user_indexes

### Maintenance

1. Run `maintain_partitions()` daily
2. Monitor partition health weekly
3. Archive old partitions according to retention policy
4. Vacuum and analyze tables regularly

---

## Monitoring Queries

### Check Active Orders

```sql
SELECT * FROM v_monitoring_active_orders;
```

### Check Database Health

```sql
SELECT * FROM check_db_connections();
SELECT * FROM check_table_sizes();
SELECT * FROM check_partition_health();
```

### Analyze Performance

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
```

---

## Support and Troubleshooting

### Common Issues

**Issue:** Partition not found
**Solution:** Run `maintain_partitions()` to create missing partitions

**Issue:** Slow order book queries
**Solution:** Refresh materialized view: `SELECT refresh_order_book_snapshot()`

**Issue:** High connection count
**Solution:** Check `check_db_connections()` and adjust pool settings

---

## Change Log

### Version 1.0.0 (2025-11-23)

- Initial schema design
- Implemented monthly order partitioning
- Implemented daily trade partitioning
- Added stop order watchlist
- Added monitoring views and functions
- Added utility functions for analytics

---

**End of Documentation**
