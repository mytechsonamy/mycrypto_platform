import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSymbolsTable1700000002000 implements MigrationInterface {
  name = 'CreateSymbolsTable1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create symbols table
    await queryRunner.query(`
      CREATE TABLE "symbols" (
        "symbol_id" SERIAL PRIMARY KEY,
        "symbol" character varying(20) UNIQUE NOT NULL,
        "base_asset" character varying(10) NOT NULL,
        "quote_asset" character varying(10) NOT NULL,
        "status" symbol_status_enum NOT NULL DEFAULT 'ACTIVE',
        "status_reason" text,
        "estimated_resume" timestamp with time zone,
        "tick_size" decimal(20,8) NOT NULL DEFAULT 0.01,
        "min_order_size" decimal(20,8) NOT NULL DEFAULT 0.0001,
        "max_order_size" decimal(20,8) NOT NULL DEFAULT 100,
        "min_order_value" decimal(20,8) NOT NULL DEFAULT 10,
        "price_band_percentage" decimal(5,2) NOT NULL DEFAULT 10.00,
        "maker_fee" decimal(6,4) NOT NULL DEFAULT 0.0005,
        "taker_fee" decimal(6,4) NOT NULL DEFAULT 0.0010,
        "trading_start" time,
        "trading_end" time,
        "trading_timezone" character varying(50) DEFAULT 'UTC',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "chk_tick_size_positive" CHECK (tick_size > 0),
        CONSTRAINT "chk_min_order_positive" CHECK (min_order_size > 0),
        CONSTRAINT "chk_max_gt_min" CHECK (max_order_size >= min_order_size),
        CONSTRAINT "chk_price_band_positive" CHECK (price_band_percentage > 0)
      )
    `);

    // Create indexes for symbols table
    await queryRunner.query(`
      CREATE INDEX "IDX_symbols_status" ON "symbols" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_symbols_base_quote" ON "symbols" ("base_asset", "quote_asset")
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "symbols" IS 'Trading pairs configuration and parameters'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "symbols"."tick_size" IS 'Minimum price increment (e.g., 0.01 for BTC/USDT)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "symbols"."price_band_percentage" IS 'Max price deviation from last trade (±%)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "symbols"."maker_fee" IS 'Fee for maker orders (provides liquidity) - decimal format (0.0005 = 0.05%)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "symbols"."taker_fee" IS 'Fee for taker orders (removes liquidity) - decimal format (0.0010 = 0.10%)'
    `);

    // Create trigger function for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for symbols table
    await queryRunner.query(`
      CREATE TRIGGER trg_symbols_updated_at
        BEFORE UPDATE ON symbols
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // Insert default trading pairs
    await queryRunner.query(`
      INSERT INTO symbols (symbol, base_asset, quote_asset, status, tick_size, min_order_size, max_order_size) VALUES
      ('BTC/USDT', 'BTC', 'USDT', 'ACTIVE', 0.01, 0.0001, 100),
      ('ETH/USDT', 'ETH', 'USDT', 'ACTIVE', 0.01, 0.001, 1000),
      ('BNB/USDT', 'BNB', 'USDT', 'ACTIVE', 0.01, 0.01, 10000),
      ('SOL/USDT', 'SOL', 'USDT', 'ACTIVE', 0.01, 0.1, 50000),
      ('XRP/USDT', 'XRP', 'USDT', 'ACTIVE', 0.0001, 1, 1000000),
      ('ADA/USDT', 'ADA', 'USDT', 'ACTIVE', 0.0001, 1, 1000000),
      ('DOGE/USDT', 'DOGE', 'USDT', 'ACTIVE', 0.00001, 1, 10000000),
      ('AVAX/USDT', 'AVAX', 'USDT', 'ACTIVE', 0.01, 0.1, 10000),
      ('DOT/USDT', 'DOT', 'USDT', 'ACTIVE', 0.01, 0.1, 10000),
      ('MATIC/USDT', 'MATIC', 'USDT', 'ACTIVE', 0.0001, 1, 1000000)
      ON CONFLICT (symbol) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_symbols_updated_at ON symbols`);

    // Drop symbols table (cascade will handle dependencies)
    await queryRunner.query(`DROP TABLE IF EXISTS "symbols"`);

    // Drop trigger function (only if not used by other tables)
    // Note: We'll keep this function as it will be used by other tables
    // await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);
  }
}
