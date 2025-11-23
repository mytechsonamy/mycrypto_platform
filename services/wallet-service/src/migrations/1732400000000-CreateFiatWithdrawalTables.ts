import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFiatWithdrawalTables1732400000000 implements MigrationInterface {
  name = 'CreateFiatWithdrawalTables1732400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create bank_accounts table
    await queryRunner.query(`
      CREATE TABLE "bank_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" character varying NOT NULL,
        "currency" character varying(3) NOT NULL,
        "bank_name" character varying(255) NOT NULL,
        "iban" character varying(34),
        "swift_code" character varying(11),
        "account_number" character varying(17),
        "routing_number" character varying(9),
        "account_holder_name" character varying(255) NOT NULL,
        "is_verified" boolean NOT NULL DEFAULT false,
        "verified_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bank_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_bank_account_details" CHECK (
          (currency IN ('EUR', 'TRY', 'GBP', 'CHF', 'PLN', 'SEK', 'NOK', 'DKK') AND iban IS NOT NULL) OR
          (currency = 'USD' AND account_number IS NOT NULL AND routing_number IS NOT NULL)
        )
      )
    `);

    // Create indexes for bank_accounts
    await queryRunner.query(`
      CREATE INDEX "IDX_bank_accounts_user_id" ON "bank_accounts" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_bank_accounts_user_currency" ON "bank_accounts" ("user_id", "currency")
    `);

    // Create fiat_withdrawal_requests table
    await queryRunner.query(`
      CREATE TABLE "fiat_withdrawal_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" character varying NOT NULL,
        "currency" character varying(3) NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "fee" decimal(15,2) NOT NULL,
        "total_amount" decimal(15,2) NOT NULL,
        "bank_account_id" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "requires_admin_approval" boolean NOT NULL DEFAULT false,
        "admin_approved_by" character varying,
        "admin_approved_at" timestamp with time zone,
        "two_fa_verified_at" timestamp with time zone,
        "error_message" text,
        "admin_notes" text,
        "reference_number" character varying(100),
        "completed_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fiat_withdrawal_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fiat_withdrawal_bank_account" FOREIGN KEY ("bank_account_id")
          REFERENCES "bank_accounts"("id") ON DELETE RESTRICT
      )
    `);

    // Create indexes for fiat_withdrawal_requests
    await queryRunner.query(`
      CREATE INDEX "IDX_fiat_withdrawal_user_id" ON "fiat_withdrawal_requests" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_fiat_withdrawal_status" ON "fiat_withdrawal_requests" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_fiat_withdrawal_user_status" ON "fiat_withdrawal_requests" ("user_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_fiat_withdrawal_status_created" ON "fiat_withdrawal_requests" ("status", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_fiat_withdrawal_bank_account" ON "fiat_withdrawal_requests" ("bank_account_id")
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "bank_accounts" IS 'User bank account details for fiat withdrawals (USD, EUR, TRY, etc.)'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE "fiat_withdrawal_requests" IS 'Fiat withdrawal requests with approval workflow and status tracking'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "bank_accounts"."iban" IS 'International Bank Account Number (for EUR, TRY, GBP, etc.)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "bank_accounts"."swift_code" IS 'SWIFT/BIC code for international transfers (8 or 11 characters)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "bank_accounts"."account_number" IS 'US bank account number (6-17 digits, for USD)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "bank_accounts"."routing_number" IS 'US ABA routing number (9 digits, for USD)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "fiat_withdrawal_requests"."status" IS 'Withdrawal status: PENDING, APPROVED, PROCESSING, COMPLETED, REJECTED, CANCELLED, FAILED'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "fiat_withdrawal_requests"."requires_admin_approval" IS 'True if withdrawal amount exceeds threshold ($10,000)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "fiat_withdrawal_requests"."reference_number" IS 'Bank transfer reference number from payment provider'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop fiat_withdrawal_requests table first (has foreign key)
    await queryRunner.query(`DROP TABLE "fiat_withdrawal_requests"`);

    // Drop bank_accounts table
    await queryRunner.query(`DROP TABLE "bank_accounts"`);
  }
}
