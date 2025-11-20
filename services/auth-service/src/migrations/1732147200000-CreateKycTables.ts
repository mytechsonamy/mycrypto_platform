import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKycTables1732147200000 implements MigrationInterface {
  name = 'CreateKycTables1732147200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create kyc_submissions table
    await queryRunner.query(`
      CREATE TABLE "kyc_submissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "level" character varying(20) NOT NULL DEFAULT 'LEVEL_1',
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "tc_kimlik_no" character varying(11),
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "date_of_birth" date NOT NULL,
        "phone" character varying(20) NOT NULL,
        "id_front_url" character varying(500),
        "id_back_url" character varying(500),
        "selfie_url" character varying(500),
        "address_proof_url" character varying(500),
        "mks_verification_id" character varying(100),
        "mks_response" jsonb,
        "mks_verified" boolean NOT NULL DEFAULT false,
        "submitted_at" timestamp with time zone,
        "reviewed_at" timestamp with time zone,
        "reviewed_by" uuid,
        "rejection_reason" text,
        "ip_address" character varying(45),
        "user_agent" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kyc_submissions" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for kyc_submissions
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_submissions_user_id" ON "kyc_submissions" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_submissions_status" ON "kyc_submissions" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_submissions_tc_kimlik_no" ON "kyc_submissions" ("tc_kimlik_no")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_submissions_user_status" ON "kyc_submissions" ("user_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_submissions_created_at" ON "kyc_submissions" ("created_at")
    `);

    // Create kyc_documents table
    await queryRunner.query(`
      CREATE TABLE "kyc_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "submission_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "document_type" character varying(50) NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'UPLOADED',
        "original_filename" character varying(255) NOT NULL,
        "file_size" bigint NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "file_hash" character varying(64) NOT NULL,
        "s3_bucket" character varying(100) NOT NULL,
        "s3_key" character varying(500) NOT NULL,
        "s3_url" character varying(1000) NOT NULL,
        "encrypted" boolean NOT NULL DEFAULT true,
        "virus_scan_result" character varying(50),
        "virus_scanned_at" timestamp with time zone,
        "metadata" jsonb,
        "rejection_reason" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kyc_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_kyc_documents_submission" FOREIGN KEY ("submission_id")
          REFERENCES "kyc_submissions"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for kyc_documents
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_documents_submission_id" ON "kyc_documents" ("submission_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_documents_user_id" ON "kyc_documents" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_documents_status" ON "kyc_documents" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_documents_document_type" ON "kyc_documents" ("document_type")
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "kyc_submissions" IS 'KYC (Know Your Customer) submission records for user identity verification'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE "kyc_documents" IS 'Uploaded KYC documents (ID, selfie, proof of address) with virus scan status'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "kyc_submissions"."tc_kimlik_no" IS 'Turkish ID number (TC Kimlik No) - 11 digits with checksum validation'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "kyc_submissions"."mks_response" IS 'Response from MKS (Turkish government ID verification API)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "kyc_documents"."file_hash" IS 'SHA-256 hash of the file for integrity verification'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop kyc_documents table (will cascade due to FK constraint)
    await queryRunner.query(`DROP TABLE "kyc_documents"`);

    // Drop kyc_submissions table
    await queryRunner.query(`DROP TABLE "kyc_submissions"`);
  }
}
