import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEmailVerificationTokenFields1731999999999
  implements MigrationInterface
{
  name = 'UpdateEmailVerificationTokenFields1731999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename existing columns if they exist
    const hasOldTokenColumn = await queryRunner.hasColumn(
      'users',
      'email_verification_token',
    );
    const hasOldExpiresColumn = await queryRunner.hasColumn(
      'users',
      'email_verification_expires_at',
    );

    if (hasOldTokenColumn) {
      // First drop the column since we're changing from storing plain token to hash
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verification_token"`,
      );
    }

    if (hasOldExpiresColumn) {
      // Rename the expires column to match new naming convention
      await queryRunner.query(
        `ALTER TABLE "users" RENAME COLUMN "email_verification_expires_at" TO "email_verification_token_expires_at"`,
      );
    } else {
      // Add the expires column if it doesn't exist
      await queryRunner.query(
        `ALTER TABLE "users" ADD "email_verification_token_expires_at" TIMESTAMP`,
      );
    }

    // Add the new token hash column
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_verification_token_hash" character varying(64)`,
    );

    // Create index for the token hash
    await queryRunner.query(
      `CREATE INDEX "idx_users_verification_token" ON "users" ("email_verification_token_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`DROP INDEX "idx_users_verification_token"`);

    // Drop the new token hash column
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "email_verification_token_hash"`,
    );

    // Rename the expires column back
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "email_verification_token_expires_at" TO "email_verification_expires_at"`,
    );

    // Add back the old token column
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_verification_token" character varying(512)`,
    );
  }
}