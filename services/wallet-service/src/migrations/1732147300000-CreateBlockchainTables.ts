import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlockchainTables1732147300000 implements MigrationInterface {
  name = 'CreateBlockchainTables1732147300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create blockchain_addresses table
    await queryRunner.query(`
      CREATE TABLE "blockchain_addresses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "currency" character varying(10) NOT NULL,
        "address" character varying(100) NOT NULL,
        "address_index" integer NOT NULL,
        "derivation_path" character varying(100) NOT NULL,
        "public_key" character varying(200),
        "qr_code_url" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "last_used_at" timestamp with time zone,
        "total_received" decimal(20,8) NOT NULL DEFAULT '0',
        "transaction_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blockchain_addresses" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_blockchain_address" UNIQUE ("address")
      )
    `);

    // Create indexes for blockchain_addresses
    await queryRunner.query(`
      CREATE INDEX "IDX_blockchain_addresses_user_id" ON "blockchain_addresses" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_blockchain_addresses_address" ON "blockchain_addresses" ("address")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_blockchain_addresses_user_currency" ON "blockchain_addresses" ("user_id", "currency")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_blockchain_addresses_currency_index" ON "blockchain_addresses" ("currency", "address_index")
    `);

    // Create blockchain_transactions table
    await queryRunner.query(`
      CREATE TABLE "blockchain_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "blockchain_address_id" uuid NOT NULL,
        "currency" character varying(10) NOT NULL,
        "tx_hash" character varying(100) NOT NULL,
        "from_address" character varying(100) NOT NULL,
        "to_address" character varying(100) NOT NULL,
        "amount" decimal(20,8) NOT NULL,
        "amount_usd" decimal(15,2),
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "confirmations" integer NOT NULL DEFAULT 0,
        "required_confirmations" integer NOT NULL,
        "block_height" bigint,
        "block_time" timestamp with time zone,
        "blockcypher_webhook_id" character varying(100),
        "blockchain_response" jsonb,
        "credited_at" timestamp with time zone,
        "error_message" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blockchain_transactions" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for blockchain_transactions
    await queryRunner.query(`
      CREATE INDEX "IDX_blockchain_transactions_tx_hash" ON "blockchain_transactions" ("tx_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_blockchain_transactions_user_id" ON "blockchain_transactions" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_blockchain_transactions_user_status" ON "blockchain_transactions" ("user_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_blockchain_transactions_currency_status" ON "blockchain_transactions" ("currency", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_blockchain_transactions_address_id" ON "blockchain_transactions" ("blockchain_address_id")
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "blockchain_addresses" IS 'HD Wallet generated cryptocurrency deposit addresses (BTC, ETH, USDT)'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE "blockchain_transactions" IS 'Cryptocurrency deposit transactions with confirmation tracking'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "blockchain_addresses"."derivation_path" IS 'BIP-44 derivation path (e.g., m/44''/0''/0''/0/0)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "blockchain_addresses"."qr_code_url" IS 'QR code data URL for mobile deposit scanning'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "blockchain_transactions"."confirmations" IS 'Number of blockchain confirmations (BTC: 3, ETH/USDT: 12)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "blockchain_transactions"."blockchain_response" IS 'Full BlockCypher API response for debugging'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop blockchain_transactions table
    await queryRunner.query(`DROP TABLE "blockchain_transactions"`);

    // Drop blockchain_addresses table
    await queryRunner.query(`DROP TABLE "blockchain_addresses"`);
  }
}
