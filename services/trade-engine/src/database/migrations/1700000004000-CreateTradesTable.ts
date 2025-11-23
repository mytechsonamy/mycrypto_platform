import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTradesTable1700000004000 implements MigrationInterface {
  name = 'CreateTradesTable1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create trades table with partitioning by RANGE on executed_at (daily partitions)
    await queryRunner.query(`
      CREATE TABLE "trades" (
        "trade_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "symbol" character varying(20) NOT NULL,
        "buyer_order_id" uuid NOT NULL,
        "seller_order_id" uuid NOT NULL,
        "buyer_user_id" uuid NOT NULL,
        "seller_user_id" uuid NOT NULL,
        "buyer_institution_id" uuid,
        "seller_institution_id" uuid,
        "price" decimal(20,8) NOT NULL,
        "quantity" decimal(20,8) NOT NULL,
        "buyer_fee" decimal(20,8) NOT NULL,
        "seller_fee" decimal(20,8) NOT NULL,
        "buyer_fee_asset" character varying(10) NOT NULL,
        "seller_fee_asset" character varying(10) NOT NULL,
        "is_buyer_maker" boolean NOT NULL,
        "trade_source" character varying(50),
        "execution_venue" character varying(50),
        "executed_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "settled_at" timestamp with time zone,
        CONSTRAINT "chk_price_positive" CHECK (price > 0),
        CONSTRAINT "chk_quantity_positive" CHECK (quantity > 0),
        CONSTRAINT "chk_self_trade_prevention" CHECK (buyer_user_id != seller_user_id)
      ) PARTITION BY RANGE (executed_at)
    `);

    // Create indexes for trades table (inherited by partitions)
    await queryRunner.query(`
      CREATE INDEX "IDX_trades_buyer" ON "trades" (buyer_user_id, executed_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trades_seller" ON "trades" (seller_user_id, executed_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trades_symbol_time" ON "trades" (symbol, executed_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trades_executed_at" ON "trades" (executed_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trades_buyer_order" ON "trades" (buyer_order_id)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trades_seller_order" ON "trades" (seller_order_id)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "trades" IS 'Trade execution records - partitioned by executed_at (daily). Stores all matched and executed trades.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "trades"."is_buyer_maker" IS 'TRUE if buyer is maker (passive order), FALSE if buyer is taker (aggressive order)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "trades"."trade_source" IS 'Execution source: INTERNAL (matching engine), BROKER (external), SIMULATION (paper trading)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "trades"."execution_venue" IS 'For multi-venue routing (Phase 3) - identifies where trade was executed'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "trades"."settled_at" IS 'Settlement timestamp for real broker trades (null for internal trades)'
    `);

    // Create partition management function for trades
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_trades_partition(partition_date DATE)
      RETURNS TEXT AS $$
      DECLARE
        partition_name TEXT;
        start_date DATE;
        end_date DATE;
      BEGIN
        start_date := partition_date;
        end_date := start_date + INTERVAL '1 day';

        -- Generate partition name (e.g., trades_2024_11_22)
        partition_name := 'trades_' || TO_CHAR(start_date, 'YYYY_MM_DD');

        IF EXISTS (
          SELECT 1 FROM pg_class
          WHERE relname = partition_name
        ) THEN
          RETURN 'Partition ' || partition_name || ' already exists';
        END IF;

        EXECUTE format(
          'CREATE TABLE %I PARTITION OF trades FOR VALUES FROM (%L) TO (%L)',
          partition_name,
          start_date,
          end_date
        );

        RETURN 'Created partition: ' || partition_name;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION create_trades_partition(DATE) IS 'Creates a daily partition for the trades table'
    `);

    // Create initial partitions (30 days: today + 29 days ahead)
    await queryRunner.query(`
      DO $$
      DECLARE
        i INT;
      BEGIN
        FOR i IN 0..29 LOOP
          PERFORM create_trades_partition(CURRENT_DATE + i);
        END LOOP;
      END $$;
    `);

    // Create retention policy configuration table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "partition_retention_config" (
        "table_name" character varying(50) PRIMARY KEY,
        "retention_months" integer NOT NULL,
        "description" text,
        "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "partition_retention_config" IS 'Retention policy configuration for partitioned tables'
    `);

    // Insert default retention policies
    await queryRunner.query(`
      INSERT INTO partition_retention_config (table_name, retention_months, description) VALUES
      ('orders', 60, 'Keep orders for 5 years (regulatory compliance)'),
      ('trades', 60, 'Keep trades for 5 years (regulatory requirement)')
      ON CONFLICT (table_name) DO NOTHING
    `);

    // Create automated partition maintenance function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION maintain_partitions()
      RETURNS VOID AS $$
      DECLARE
        orders_retention INT;
        trades_retention INT;
      BEGIN
        -- Get retention policies
        SELECT retention_months INTO orders_retention
        FROM partition_retention_config WHERE table_name = 'orders';

        SELECT retention_months INTO trades_retention
        FROM partition_retention_config WHERE table_name = 'trades';

        -- Create order partitions for next 3 months if not exist
        PERFORM create_orders_partition(CURRENT_DATE + (i || ' months')::INTERVAL)
        FROM generate_series(1, 3) i;

        -- Create trade partitions for next 7 days if not exist
        PERFORM create_trades_partition(CURRENT_DATE + i)
        FROM generate_series(1, 7) i;

        RAISE NOTICE 'Partition maintenance completed. Orders retention: % months, Trades retention: % months',
          orders_retention, trades_retention;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION maintain_partitions() IS 'Automated partition maintenance - creates future partitions. Run daily via cron.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop partition maintenance function
    await queryRunner.query(`DROP FUNCTION IF EXISTS maintain_partitions()`);

    // Drop partition retention config table
    await queryRunner.query(`DROP TABLE IF EXISTS "partition_retention_config"`);

    // Drop partition management function
    await queryRunner.query(`DROP FUNCTION IF EXISTS create_trades_partition(DATE)`);

    // Drop all trade partitions first
    const partitions = await queryRunner.query(`
      SELECT child.relname AS partition_name
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      WHERE parent.relname = 'trades'
    `);

    for (const partition of partitions) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${partition.partition_name}" CASCADE`);
    }

    // Drop trades table
    await queryRunner.query(`DROP TABLE IF EXISTS "trades" CASCADE`);
  }
}
