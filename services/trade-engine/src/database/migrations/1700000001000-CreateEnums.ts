import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnums1700000001000 implements MigrationInterface {
  name = 'CreateEnums1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create order_side_enum
    await queryRunner.query(`
      CREATE TYPE order_side_enum AS ENUM ('BUY', 'SELL')
    `);

    // Create order_type_enum
    await queryRunner.query(`
      CREATE TYPE order_type_enum AS ENUM (
        'MARKET',
        'LIMIT',
        'STOP',
        'STOP_LIMIT',
        'TRAILING_STOP'
      )
    `);

    // Create order_status_enum
    await queryRunner.query(`
      CREATE TYPE order_status_enum AS ENUM (
        'PENDING',
        'OPEN',
        'PARTIALLY_FILLED',
        'FILLED',
        'CANCELLED',
        'REJECTED',
        'EXPIRED'
      )
    `);

    // Create time_in_force_enum
    await queryRunner.query(`
      CREATE TYPE time_in_force_enum AS ENUM (
        'GTC',
        'IOC',
        'FOK',
        'DAY'
      )
    `);

    // Create symbol_status_enum
    await queryRunner.query(`
      CREATE TYPE symbol_status_enum AS ENUM (
        'ACTIVE',
        'HALTED',
        'MAINTENANCE',
        'DELISTED'
      )
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TYPE order_side_enum IS 'Order side: BUY or SELL'
    `);

    await queryRunner.query(`
      COMMENT ON TYPE order_type_enum IS 'Type of order: MARKET, LIMIT, STOP, etc.'
    `);

    await queryRunner.query(`
      COMMENT ON TYPE order_status_enum IS 'Current status of an order'
    `);

    await queryRunner.query(`
      COMMENT ON TYPE time_in_force_enum IS 'Time in force instruction for order: GTC (Good Till Cancelled), IOC (Immediate or Cancel), FOK (Fill or Kill), DAY (Day order)'
    `);

    await queryRunner.query(`
      COMMENT ON TYPE symbol_status_enum IS 'Trading status of a symbol'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all ENUM types in reverse order
    await queryRunner.query(`DROP TYPE IF EXISTS symbol_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS time_in_force_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_side_enum`);
  }
}
