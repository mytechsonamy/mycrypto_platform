import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUtilityFunctions1700000006000 implements MigrationInterface {
  name = 'CreateUtilityFunctions1700000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Function: Get Order Book Depth
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_order_book_depth(
        p_symbol character varying(20),
        p_depth INT DEFAULT 20
      )
      RETURNS TABLE (
        side character varying(4),
        price decimal(20,8),
        quantity decimal(20,8),
        order_count INT
      ) AS $$
      BEGIN
        -- Get BUY side (bids) - highest price first
        RETURN QUERY
        SELECT
          'BID'::character varying(4) AS side,
          o.price,
          SUM(o.quantity - o.filled_quantity) AS quantity,
          COUNT(*)::INT AS order_count
        FROM orders o
        WHERE o.symbol = p_symbol
          AND o.side = 'BUY'
          AND o.status IN ('OPEN', 'PARTIALLY_FILLED')
          AND o.price IS NOT NULL
        GROUP BY o.price
        ORDER BY o.price DESC
        LIMIT p_depth;

        -- Get SELL side (asks) - lowest price first
        RETURN QUERY
        SELECT
          'ASK'::character varying(4) AS side,
          o.price,
          SUM(o.quantity - o.filled_quantity) AS quantity,
          COUNT(*)::INT AS order_count
        FROM orders o
        WHERE o.symbol = p_symbol
          AND o.side = 'SELL'
          AND o.status IN ('OPEN', 'PARTIALLY_FILLED')
          AND o.price IS NOT NULL
        GROUP BY o.price
        ORDER BY o.price ASC
        LIMIT p_depth;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION get_order_book_depth(character varying(20), INT) IS 'Returns order book depth for a symbol (bids and asks up to specified depth)'
    `);

    // Function: Get User Trade History
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_user_trade_history(
        p_user_id uuid,
        p_symbol character varying(20) DEFAULT NULL,
        p_limit INT DEFAULT 50,
        p_offset INT DEFAULT 0
      )
      RETURNS TABLE (
        trade_id uuid,
        symbol character varying(20),
        side character varying(4),
        price decimal(20,8),
        quantity decimal(20,8),
        fee decimal(20,8),
        is_maker boolean,
        executed_at timestamp with time zone
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          t.trade_id,
          t.symbol,
          CASE
            WHEN t.buyer_user_id = p_user_id THEN 'BUY'::character varying(4)
            ELSE 'SELL'::character varying(4)
          END AS side,
          t.price,
          t.quantity,
          CASE
            WHEN t.buyer_user_id = p_user_id THEN t.buyer_fee
            ELSE t.seller_fee
          END AS fee,
          CASE
            WHEN t.buyer_user_id = p_user_id THEN t.is_buyer_maker
            ELSE NOT t.is_buyer_maker
          END AS is_maker,
          t.executed_at
        FROM trades t
        WHERE (t.buyer_user_id = p_user_id OR t.seller_user_id = p_user_id)
          AND (p_symbol IS NULL OR t.symbol = p_symbol)
        ORDER BY t.executed_at DESC
        LIMIT p_limit
        OFFSET p_offset;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION get_user_trade_history(uuid, character varying(20), INT, INT) IS 'Returns trade history for a user with pagination'
    `);

    // Function: Check Database Connections (Health Check)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_db_connections()
      RETURNS TABLE (
        active_connections INT,
        idle_connections INT,
        max_connections INT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          COUNT(*) FILTER (WHERE state = 'active')::INT AS active_connections,
          COUNT(*) FILTER (WHERE state = 'idle')::INT AS idle_connections,
          (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') AS max_connections
        FROM pg_stat_activity
        WHERE datname = current_database();
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION check_db_connections() IS 'Health check: returns database connection statistics'
    `);

    // Function: Check Table Sizes (Monitoring)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_table_sizes()
      RETURNS TABLE (
        table_name text,
        row_count bigint,
        total_size text
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          tablename::text,
          n_live_tup AS row_count,
          pg_size_pretty(pg_total_relation_size(quote_ident(tablename)::regclass)) AS total_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(quote_ident(tablename)::regclass) DESC;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION check_table_sizes() IS 'Monitoring: returns table sizes and row counts'
    `);

    // Function: Get Best Bid and Ask (Spread Calculation)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_best_bid_ask(p_symbol character varying(20))
      RETURNS TABLE (
        best_bid decimal(20,8),
        best_ask decimal(20,8),
        spread decimal(20,8),
        spread_percentage decimal(10,4)
      ) AS $$
      DECLARE
        v_best_bid decimal(20,8);
        v_best_ask decimal(20,8);
        v_spread decimal(20,8);
        v_spread_pct decimal(10,4);
      BEGIN
        -- Get best bid (highest buy price)
        SELECT MAX(price) INTO v_best_bid
        FROM orders
        WHERE symbol = p_symbol
          AND side = 'BUY'
          AND status IN ('OPEN', 'PARTIALLY_FILLED')
          AND price IS NOT NULL;

        -- Get best ask (lowest sell price)
        SELECT MIN(price) INTO v_best_ask
        FROM orders
        WHERE symbol = p_symbol
          AND side = 'SELL'
          AND status IN ('OPEN', 'PARTIALLY_FILLED')
          AND price IS NOT NULL;

        -- Calculate spread
        IF v_best_bid IS NOT NULL AND v_best_ask IS NOT NULL THEN
          v_spread := v_best_ask - v_best_bid;
          v_spread_pct := (v_spread / v_best_bid) * 100;
        END IF;

        RETURN QUERY SELECT v_best_bid, v_best_ask, v_spread, v_spread_pct;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION get_best_bid_ask(character varying(20)) IS 'Returns best bid/ask prices and spread for a symbol'
    `);

    // Function: Calculate VWAP (Volume Weighted Average Price)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION calculate_vwap(
        p_symbol character varying(20),
        p_interval_hours INT DEFAULT 24
      )
      RETURNS decimal(20,8) AS $$
      DECLARE
        v_vwap decimal(20,8);
      BEGIN
        SELECT
          SUM(price * quantity) / NULLIF(SUM(quantity), 0)
        INTO v_vwap
        FROM trades
        WHERE symbol = p_symbol
          AND executed_at >= CURRENT_TIMESTAMP - (p_interval_hours || ' hours')::INTERVAL;

        RETURN v_vwap;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION calculate_vwap(character varying(20), INT) IS 'Calculates Volume Weighted Average Price for a symbol over specified hours'
    `);

    // Function: Get Order Fill Rate (User Performance Metric)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_order_fill_rate(
        p_user_id uuid,
        p_days INT DEFAULT 30
      )
      RETURNS TABLE (
        total_orders bigint,
        filled_orders bigint,
        partially_filled_orders bigint,
        cancelled_orders bigint,
        fill_rate decimal(5,2)
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          COUNT(*) AS total_orders,
          COUNT(*) FILTER (WHERE status = 'FILLED') AS filled_orders,
          COUNT(*) FILTER (WHERE status = 'PARTIALLY_FILLED') AS partially_filled_orders,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders,
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'FILLED')::decimal / NULLIF(COUNT(*), 0)) * 100,
            2
          ) AS fill_rate
        FROM orders
        WHERE user_id = p_user_id
          AND created_at >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION get_order_fill_rate(uuid, INT) IS 'Returns order fill rate statistics for a user over specified days'
    `);

    // Function: Check Partition Health
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_partition_health()
      RETURNS TABLE (
        parent_table text,
        partition_count bigint,
        oldest_partition text,
        newest_partition text
      ) AS $$
      BEGIN
        RETURN QUERY
        WITH partition_info AS (
          SELECT
            parent.relname AS parent_table,
            child.relname AS partition_name
          FROM pg_inherits
          JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
          JOIN pg_class child ON pg_inherits.inhrelid = child.oid
          WHERE parent.relname IN ('orders', 'trades')
        )
        SELECT
          pi.parent_table::text,
          COUNT(*)::bigint AS partition_count,
          MIN(pi.partition_name)::text AS oldest_partition,
          MAX(pi.partition_name)::text AS newest_partition
        FROM partition_info pi
        GROUP BY pi.parent_table
        ORDER BY pi.parent_table;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION check_partition_health() IS 'Monitoring: returns partition statistics for orders and trades tables'
    `);

    // Function: Get Trading Volume by Time Period
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_trading_volume(
        p_symbol character varying(20),
        p_period character varying(10) DEFAULT '24h'
      )
      RETURNS TABLE (
        symbol character varying(20),
        trade_count bigint,
        base_volume decimal(20,8),
        quote_volume decimal(20,8),
        period_start timestamp with time zone,
        period_end timestamp with time zone
      ) AS $$
      DECLARE
        v_interval INTERVAL;
      BEGIN
        -- Parse period string to interval
        v_interval := CASE p_period
          WHEN '1h' THEN INTERVAL '1 hour'
          WHEN '4h' THEN INTERVAL '4 hours'
          WHEN '24h' THEN INTERVAL '24 hours'
          WHEN '7d' THEN INTERVAL '7 days'
          WHEN '30d' THEN INTERVAL '30 days'
          ELSE INTERVAL '24 hours'
        END;

        RETURN QUERY
        SELECT
          p_symbol,
          COUNT(*)::bigint AS trade_count,
          SUM(t.quantity) AS base_volume,
          SUM(t.quantity * t.price) AS quote_volume,
          CURRENT_TIMESTAMP - v_interval AS period_start,
          CURRENT_TIMESTAMP AS period_end
        FROM trades t
        WHERE t.symbol = p_symbol
          AND t.executed_at >= CURRENT_TIMESTAMP - v_interval;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION get_trading_volume(character varying(20), character varying(10)) IS 'Returns trading volume for a symbol over specified period (1h, 4h, 24h, 7d, 30d)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all utility functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS get_trading_volume(character varying(20), character varying(10))`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS check_partition_health()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS get_order_fill_rate(uuid, INT)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS calculate_vwap(character varying(20), INT)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS get_best_bid_ask(character varying(20))`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS check_table_sizes()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS check_db_connections()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS get_user_trade_history(uuid, character varying(20), INT, INT)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS get_order_book_depth(character varying(20), INT)`);
  }
}
