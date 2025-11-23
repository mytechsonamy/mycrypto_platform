# Database Migrations

This directory contains database migration files for the Trade Engine service.

## Location

The actual TypeORM migration files are located in:
```
/services/trade-engine/src/database/migrations/
```

This directory is for reference and additional SQL migration scripts if needed.

## Migration Files

The database schema is managed through TypeORM migrations:

1. **1700000001000-CreateEnums.ts** - Create all ENUM types
   - order_side_enum: BUY, SELL
   - order_type_enum: MARKET, LIMIT, STOP, STOP_LIMIT, TRAILING_STOP
   - order_status_enum: PENDING, OPEN, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED, EXPIRED
   - time_in_force_enum: GTC, IOC, FOK, DAY
   - symbol_status_enum: ACTIVE, HALTED, MAINTENANCE, DELISTED

2. **1700000002000-CreateSymbolsTable.ts** - Create symbols table
   - 10 default trading pairs loaded
   - Columns: symbol, name, base_asset, quote_asset, min_order_value, max_order_value, price_step, quantity_step

3. **1700000003000-CreateOrdersTable.ts** - Create orders table with monthly partitioning
   - Base table + 12 monthly partitions
   - Columns: order_id, user_id, symbol, side, order_type, status, quantity, filled_quantity, price, stop_price, time_in_force, created_at, updated_at, expires_at
   - Indexes: user_id, symbol+status

4. **1700000004000-CreateTradesTable.ts** - Create trades table with daily partitioning
   - Base table + 30 daily partitions
   - Columns: trade_id, buy_order_id, sell_order_id, buyer_user_id, seller_user_id, symbol, quantity, price, executed_at
   - Indexes: symbol+executed_at, buyer_user_id, seller_user_id

5. **1700000005000-CreateAuxiliaryTables.ts** - Create supporting tables and views
   - stop_orders_watchlist: Active stop order monitoring
   - order_book_snapshots: Periodic snapshots for recovery
   - partition_retention_config: Retention policy settings
   - Views: v_active_orders, v_trade_volume_24h, v_order_status, mv_order_book_snapshot
   - Triggers: Lifecycle management and validation

6. **1700000006000-CreateUtilityFunctions.ts** - Create utility functions
   - maintain_partitions(): Automated partition creation
   - check_partition_health(): Partition health monitoring
   - refresh_order_book_snapshot(): View updates
   - check_db_connections(): Connection monitoring
   - check_table_sizes(): Capacity monitoring

## Running Migrations

Using TypeORM CLI:
```bash
# Install TypeORM globally (if needed)
npm install -g typeorm

# Run all pending migrations
npx typeorm migration:run -d src/database/data-source.ts

# Revert last migration
npx typeorm migration:revert -d src/database/data-source.ts

# Show migration status
npx typeorm migration:show -d src/database/data-source.ts
```

Using Make commands:
```bash
# From trade-engine directory
make migrate            # Run migrations
make migrate-revert     # Revert last migration
make migrate-show       # Show status
```

## Migration Order

Migrations are timestamped and run in order:
1. CreateEnums (must be first - types are needed by tables)
2. CreateSymbolsTable
3. CreateOrdersTable (depends on symbols, ENUM types)
4. CreateTradesTable (depends on symbols, ENUM types)
5. CreateAuxiliaryTables (depends on orders, trades, symbols)
6. CreateUtilityFunctions (depends on all tables)

## Verification

After running migrations, verify the schema:

```bash
# Run verification script
./scripts/verify-schema.sh

# Or check manually
make db-shell
# Inside psql:
\dt                        # List tables
\dT+                       # List ENUM types
SELECT tablename FROM pg_tables WHERE tablename LIKE 'orders_%';  # Check partitions
SELECT * FROM check_partition_health();  # Check partition health
```

## Adding New Migrations

When adding new migrations:

1. Create migration file with naming convention: `{timestamp}-{description}.ts`
2. Use next available timestamp
3. Implement both `up()` and `down()` methods
4. Test both upgrade and rollback
5. Document in this README

Example timestamp: `1700000007000` (increment by 1000)

## Database Connection

From Docker container:
```
postgresql://trade_engine_user:trade_engine_pass@postgres:5432/trade_engine_db
```

From host machine:
```
postgresql://trade_engine_user:trade_engine_pass@localhost:5433/trade_engine_db
```

## Troubleshooting

### Issue: "No pending migrations"
The migrations have already been run. This is expected after initial setup.

### Issue: "Cannot create ENUM type, already exists"
The migration has already been applied. Run `make migrate-show` to check status.

### Issue: "Partition not found when inserting data"
Run `SELECT maintain_partitions();` to create future partitions.

### Issue: "Migration failed - need rollback"
```bash
make migrate-revert
# Fix the issue
make migrate
```

## More Information

- Full schema documentation: `/docs/database-schema.md`
- Handoff document: `/docs/HANDOFF-TO-DEVOPS.md`
- Verification script: `/scripts/verify-schema.sh`

---

**Last Updated:** 2025-11-23
**Status:** Complete with 6 migration files
