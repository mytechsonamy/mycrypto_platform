import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTable1700000003000 implements MigrationInterface {
  name = 'CreateOrdersTable1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create orders table with partitioning by RANGE on created_at (monthly partitions)
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "order_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "institution_id" uuid,
        "symbol" character varying(20) NOT NULL,
        "side" order_side_enum NOT NULL,
        "order_type" order_type_enum NOT NULL,
        "status" order_status_enum NOT NULL DEFAULT 'PENDING',
        "quantity" decimal(20,8) NOT NULL,
        "filled_quantity" decimal(20,8) NOT NULL DEFAULT 0,
        "price" decimal(20,8),
        "average_price" decimal(20,8),
        "stop_price" decimal(20,8),
        "time_in_force" time_in_force_enum NOT NULL DEFAULT 'GTC',
        "client_order_id" character varying(100),
        "order_source" character varying(50),
        "fee_profile_id" uuid,
        "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "filled_at" timestamp with time zone,
        "cancelled_at" timestamp with time zone,
        "expires_at" timestamp with time zone,
        CONSTRAINT "chk_quantity_positive" CHECK (quantity > 0),
        CONSTRAINT "chk_filled_lte_quantity" CHECK (filled_quantity <= quantity),
        CONSTRAINT "chk_market_no_price" CHECK (
          order_type != 'MARKET' OR price IS NULL
        ),
        CONSTRAINT "chk_limit_has_price" CHECK (
          order_type != 'LIMIT' OR price IS NOT NULL
        ),
        CONSTRAINT "chk_stop_has_stop_price" CHECK (
          order_type NOT IN ('STOP', 'STOP_LIMIT') OR stop_price IS NOT NULL
        )
      ) PARTITION BY RANGE (created_at)
    `);

    // Create base indexes for orders (will be inherited by partitions)
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_user_symbol_status" ON "orders" (user_id, symbol, status)
      WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_symbol_status_price" ON "orders" (symbol, status, price)
      WHERE status IN ('OPEN', 'PARTIALLY_FILLED') AND price IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_status_created" ON "orders" (status, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_client_order_id" ON "orders" (client_order_id, user_id)
      WHERE client_order_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_stop_monitoring" ON "orders" (symbol, stop_price)
      WHERE order_type IN ('STOP', 'STOP_LIMIT') AND status = 'OPEN'
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_matching" ON "orders" (symbol, side, price, created_at)
      WHERE status IN ('OPEN', 'PARTIALLY_FILLED') AND price IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_user_created" ON "orders" (user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_orders_active" ON "orders" (symbol, side, price)
      WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "orders" IS 'Main orders table - partitioned by created_at (monthly). Stores all order lifecycle data.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "orders"."client_order_id" IS 'Client-provided unique ID for idempotency (24h TTL)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "orders"."average_price" IS 'Average fill price for partially filled orders'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "orders"."fee_profile_id" IS 'Reference to user fee tier (VIP, etc.)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "orders"."order_source" IS 'Order origin: WEB | MOBILE | API | BOT'
    `);

    // Create trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER trg_orders_updated_at
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create partition management functions
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_orders_partition(partition_date DATE)
      RETURNS TEXT AS $$
      DECLARE
        partition_name TEXT;
        start_date DATE;
        end_date DATE;
      BEGIN
        -- Calculate partition boundaries
        start_date := DATE_TRUNC('month', partition_date)::DATE;
        end_date := (start_date + INTERVAL '1 month')::DATE;

        -- Generate partition name (e.g., orders_2024_11)
        partition_name := 'orders_' || TO_CHAR(start_date, 'YYYY_MM');

        -- Check if partition already exists
        IF EXISTS (
          SELECT 1 FROM pg_class
          WHERE relname = partition_name
        ) THEN
          RETURN 'Partition ' || partition_name || ' already exists';
        END IF;

        -- Create partition
        EXECUTE format(
          'CREATE TABLE %I PARTITION OF orders FOR VALUES FROM (%L) TO (%L)',
          partition_name,
          start_date,
          end_date
        );

        RETURN 'Created partition: ' || partition_name;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION create_orders_partition(DATE) IS 'Creates a monthly partition for the orders table'
    `);

    // Create initial partitions (12 months: current month + 11 months ahead)
    await queryRunner.query(`
      DO $$
      DECLARE
        i INT;
      BEGIN
        FOR i IN 0..11 LOOP
          PERFORM create_orders_partition(CURRENT_DATE + (i || ' months')::INTERVAL);
        END LOOP;
      END $$;
    `);

    // Create triggers for order lifecycle management

    // Trigger: Set filled_at timestamp when order is filled
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_filled_at_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.status = 'FILLED' AND OLD.status != 'FILLED' THEN
          NEW.filled_at = CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_set_filled_at
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION set_filled_at_timestamp();
    `);

    // Trigger: Set cancelled_at timestamp when order is cancelled
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_cancelled_at_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
          NEW.cancelled_at = CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_set_cancelled_at
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION set_cancelled_at_timestamp();
    `);

    // Trigger: Validate order status transitions
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_order_status_transition()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Define valid state transitions
        IF OLD.status = 'FILLED' AND NEW.status != 'FILLED' THEN
          RAISE EXCEPTION 'Cannot change status of a filled order';
        END IF;

        IF OLD.status = 'CANCELLED' AND NEW.status != 'CANCELLED' THEN
          RAISE EXCEPTION 'Cannot change status of a cancelled order';
        END IF;

        IF OLD.status = 'REJECTED' AND NEW.status != 'REJECTED' THEN
          RAISE EXCEPTION 'Cannot change status of a rejected order';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_validate_order_status_transition
        BEFORE UPDATE ON orders
        FOR EACH ROW
        WHEN (OLD.status IS DISTINCT FROM NEW.status)
        EXECUTE FUNCTION validate_order_status_transition();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_validate_order_status_transition ON orders`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_set_cancelled_at ON orders`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_set_filled_at ON orders`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders`);

    // Drop trigger functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS validate_order_status_transition()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_cancelled_at_timestamp()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_filled_at_timestamp()`);

    // Drop partition management function
    await queryRunner.query(`DROP FUNCTION IF EXISTS create_orders_partition(DATE)`);

    // Drop all partitions first
    const partitions = await queryRunner.query(`
      SELECT child.relname AS partition_name
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      WHERE parent.relname = 'orders'
    `);

    for (const partition of partitions) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${partition.partition_name}" CASCADE`);
    }

    // Drop orders table
    await queryRunner.query(`DROP TABLE IF EXISTS "orders" CASCADE`);
  }
}
