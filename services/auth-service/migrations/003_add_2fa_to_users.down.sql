-- migrations/003_add_2fa_to_users.down.sql (ROLLBACK)
-- Removes Two-Factor Authentication fields from users table
-- WARNING: This will permanently delete all backup codes and 2FA timestamps

-- Remove index first (must be done before dropping columns)
DROP INDEX IF EXISTS idx_users_two_fa_enabled;

-- Remove columns added in the up migration
ALTER TABLE users
DROP COLUMN IF EXISTS backup_codes;

ALTER TABLE users
DROP COLUMN IF EXISTS two_fa_enabled_at;
