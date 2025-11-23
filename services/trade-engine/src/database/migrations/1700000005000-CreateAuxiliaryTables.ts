import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuxiliaryTables1700000005000 implements MigrationInterface {
  name = 'CreateAuxiliaryTables1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create stop_orders_watchlist table for monitoring stop orders
    await queryRunner.query(`
      CREATE TABLE "stop_orders_watchlist" (
        "order_id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "symbol" character varying(20) NOT NULL,
        "side" order_side_enum NOT NULL,
        "stop_price" decimal(20,8) NOT NULL,
        "quantity" decimal(20,8) NOT NULL,
        "added_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for stop_orders_watchlist
    await queryRunner.query(`
      CREATE INDEX "IDX_stop_watchlist_symbol_price" ON "stop_orders_watchlist" (symbol, stop_price)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stop_watchlist_user" ON "stop_orders_watchlist" (user_id)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE "stop_orders_watchlist" IS 'Active stop orders being monitored for trigger conditions'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "stop_orders_watchlist"."stop_price" IS 'Price threshold at which stop order should be triggered'
    `);

    // Create order_book_snapshots table for periodic snapshots
    await queryRunner.query(`
      CREATE TABLE "order_book_snapshots" (
        "snapshot_id" BIGSERIAL PRIMARY KEY,
        "symbol" character varying(20) NOT NULL,
        "bids" jsonb NOT NULL,
        "asks" jsonb NOT NULL,
        "sequence_number" bigint NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_symbol_sequence" UNIQUE (symbol, sequence_number)
      )
    `);

    // Create index for order_book_snapshots
    await queryRunner.query(`
      CREATE INDEX "IDX_snapshots_symbol_time" ON "order_book_snapshots" (symbol, created_at DESC)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE "order_book_snapshots" IS 'Periodic order book snapshots for recovery and auditing'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "order_book_snapshots"."bids" IS 'JSON array of bid orders: [{price, quantity, orders: [order_ids]}]'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "order_book_snapshots"."asks" IS 'JSON array of ask orders: [{price, quantity, orders: [order_ids]}]'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "order_book_snapshots"."sequence_number" IS 'Monotonically increasing sequence for snapshot ordering'
    `);

    // Create triggers for stop orders watchlist management

    // Trigger: Add to stop_orders_watchlist on STOP order creation
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION add_stop_order_to_watchlist()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.order_type IN ('STOP', 'STOP_LIMIT') AND NEW.status = 'OPEN' THEN
          INSERT INTO stop_orders_watchlist (
            order_id, user_id, symbol, side, stop_price, quantity
          ) VALUES (
            NEW.order_id, NEW.user_id, NEW.symbol, NEW.side, NEW.stop_price, NEW.quantity
          )
          ON CONFLICT (order_id) DO NOTHING;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_add_stop_order_to_watchlist
        AFTER INSERT ON orders
        FOR EACH ROW
        EXECUTE FUNCTION add_stop_order_to_watchlist();
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION add_stop_order_to_watchlist() IS 'Automatically adds STOP/STOP_LIMIT orders to watchlist when created'
    `);

    // Trigger: Remove from stop_orders_watchlist on status change
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION remove_stop_order_from_watchlist()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.status IN ('FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED') THEN
          DELETE FROM stop_orders_watchlist WHERE order_id = NEW.order_id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_remove_stop_order_from_watchlist
        AFTER UPDATE ON orders
        FOR EACH ROW
        WHEN (OLD.status != NEW.status)
        EXECUTE FUNCTION remove_stop_order_from_watchlist();
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION remove_stop_order_from_watchlist() IS 'Automatically removes stop orders from watchlist when completed/cancelled'
    `);

    // Create views for order book and monitoring

    // View: Active Orders (For Order Book)
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_active_orders AS
      SELECT
        order_id,
        user_id,
        symbol,
        side,
        order_type,
        quantity,
        filled_quantity,
        (quantity - filled_quantity) AS remaining_quantity,
        price,
        created_at,
        updated_at
      FROM orders
      WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
        AND price IS NOT NULL
      ORDER BY
        symbol,
        side,
        CASE
          WHEN side = 'BUY' THEN -price
          ELSE price
        END,
        created_at
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_active_orders IS 'Active orders sorted by Price-Time Priority for matching engine'
    `);

    // View: User Order Summary
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_user_order_summary AS
      SELECT
        user_id,
        symbol,
        COUNT(*) FILTER (WHERE status IN ('OPEN', 'PARTIALLY_FILLED')) AS open_orders,
        COUNT(*) FILTER (WHERE status = 'FILLED') AS filled_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders,
        SUM(quantity * price) FILTER (WHERE status = 'FILLED') AS total_volume
      FROM orders
      GROUP BY user_id, symbol
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_user_order_summary IS 'Summary statistics of user orders per symbol'
    `);

    // View: Symbol Statistics (24h)
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_symbol_stats_24h AS
      SELECT
        symbol,
        COUNT(*) AS trade_count,
        SUM(quantity) AS volume,
        SUM(quantity * price) AS quote_volume,
        MIN(price) AS low_price,
        MAX(price) AS high_price,
        (SELECT price FROM trades t2 WHERE t2.symbol = t1.symbol ORDER BY executed_at DESC LIMIT 1) AS last_price
      FROM trades t1
      WHERE executed_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      GROUP BY symbol
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_symbol_stats_24h IS '24-hour trading statistics per symbol'
    `);

    // View: Monitoring - Active Orders Count
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_monitoring_active_orders AS
      SELECT
        symbol,
        COUNT(*) FILTER (WHERE side = 'BUY') AS buy_orders,
        COUNT(*) FILTER (WHERE side = 'SELL') AS sell_orders,
        COUNT(*) AS total_orders,
        SUM(quantity - filled_quantity) AS total_quantity
      FROM orders
      WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
      GROUP BY symbol
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_monitoring_active_orders IS 'Monitoring view: active order counts by symbol'
    `);

    // View: Monitoring - Trade Volume (24h)
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_monitoring_trade_volume_24h AS
      SELECT
        symbol,
        COUNT(*) AS trade_count,
        SUM(quantity) AS volume,
        SUM(quantity * price) AS quote_volume,
        AVG(price) AS avg_price
      FROM trades
      WHERE executed_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      GROUP BY symbol
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_monitoring_trade_volume_24h IS 'Monitoring view: 24-hour trade volume by symbol'
    `);

    // View: Monitoring - Order Status Distribution
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_monitoring_order_status AS
      SELECT
        status,
        COUNT(*) AS count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
      FROM orders
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      GROUP BY status
      ORDER BY count DESC
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_monitoring_order_status IS 'Monitoring view: order status distribution (24h)'
    `);

    // Create materialized view for order book snapshot
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW mv_order_book_snapshot AS
      SELECT
        symbol,
        side,
        price,
        SUM(quantity - filled_quantity) AS total_quantity,
        COUNT(*) AS order_count,
        CURRENT_TIMESTAMP AS last_refresh
      FROM orders
      WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
        AND price IS NOT NULL
      GROUP BY symbol, side, price
      ORDER BY symbol, side, price
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_mv_order_book" ON mv_order_book_snapshot (symbol, side, price)
    `);

    await queryRunner.query(`
      COMMENT ON MATERIALIZED VIEW mv_order_book_snapshot IS 'Materialized view of order book - refresh periodically for performance'
    `);

    // Function to refresh materialized view
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_order_book_snapshot()
      RETURNS VOID AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_book_snapshot;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION refresh_order_book_snapshot() IS 'Refresh order book materialized view - call periodically or on-demand'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop function
    await queryRunner.query(`DROP FUNCTION IF EXISTS refresh_order_book_snapshot()`);

    // Drop materialized view
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS mv_order_book_snapshot`);

    // Drop views
    await queryRunner.query(`DROP VIEW IF EXISTS v_monitoring_order_status`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_monitoring_trade_volume_24h`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_monitoring_active_orders`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_symbol_stats_24h`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_user_order_summary`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_active_orders`);

    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_remove_stop_order_from_watchlist ON orders`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_add_stop_order_to_watchlist ON orders`);

    // Drop trigger functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS remove_stop_order_from_watchlist()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS add_stop_order_to_watchlist()`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "order_book_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stop_orders_watchlist"`);
  }
}
