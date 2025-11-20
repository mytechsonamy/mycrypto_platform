-- migrations/003_add_2fa_to_users.sql (UP)
-- Adds Two-Factor Authentication fields to users table
-- Part of Story 1.3: Two-Factor Authentication

-- Add backup codes column for storing encrypted recovery codes
ALTER TABLE users
ADD COLUMN IF NOT EXISTS backup_codes TEXT NULL;

-- Add timestamp for when 2FA was enabled
ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_fa_enabled_at TIMESTAMP NULL;

-- Create index on two_fa_enabled for filtering users with 2FA
-- Useful for admin queries and analytics
CREATE INDEX IF NOT EXISTS idx_users_two_fa_enabled ON users(two_fa_enabled);

-- Add column comments for documentation
COMMENT ON COLUMN users.two_fa_secret IS 'Encrypted TOTP secret for 2FA authentication';
COMMENT ON COLUMN users.two_fa_enabled IS 'Whether 2FA is currently enabled for this user';
COMMENT ON COLUMN users.backup_codes IS 'JSON array of encrypted backup codes for 2FA recovery';
COMMENT ON COLUMN users.two_fa_enabled_at IS 'Timestamp when 2FA was enabled for this user';
