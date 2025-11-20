-- migrations/005_create_2fa_tables.sql (UP)
-- Creates Two-Factor Authentication related tables
-- Part of Story 1.4: Two-Factor Authentication

-- ============================================================================
-- Table 1: two_factor_auth
-- Stores encrypted TOTP secrets for users with 2FA enabled
-- ============================================================================
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret_encrypted VARCHAR(255) NOT NULL,  -- AES-256 encrypted TOTP secret
    is_enabled BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on user_id for fast lookups (already has UNIQUE constraint which creates index)
-- Additional comment for documentation
COMMENT ON TABLE two_factor_auth IS 'Stores encrypted TOTP secrets for two-factor authentication';
COMMENT ON COLUMN two_factor_auth.secret_encrypted IS 'AES-256 encrypted TOTP secret key';
COMMENT ON COLUMN two_factor_auth.is_enabled IS 'Whether 2FA is currently active for this user';
COMMENT ON COLUMN two_factor_auth.verified_at IS 'Timestamp when 2FA was successfully verified and enabled';

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_two_factor_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_two_factor_auth_updated_at
BEFORE UPDATE ON two_factor_auth
FOR EACH ROW
EXECUTE FUNCTION update_two_factor_auth_updated_at();

-- ============================================================================
-- Table 2: two_factor_backup_codes
-- Stores hashed backup codes for 2FA recovery (single-use)
-- ============================================================================
CREATE TABLE IF NOT EXISTS two_factor_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,  -- bcrypt hashed backup code
    used_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for backup codes table
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON two_factor_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_code_hash ON two_factor_backup_codes(code_hash);

-- Partial index for unused codes (common query pattern)
CREATE INDEX IF NOT EXISTS idx_backup_codes_unused ON two_factor_backup_codes(user_id) WHERE used_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE two_factor_backup_codes IS 'Single-use backup codes for 2FA recovery';
COMMENT ON COLUMN two_factor_backup_codes.code_hash IS 'Bcrypt hashed backup code (XXXX-XXXX format)';
COMMENT ON COLUMN two_factor_backup_codes.used_at IS 'Timestamp when code was used (NULL if unused)';

-- ============================================================================
-- Table 3: two_factor_audit_log
-- Audit log for all 2FA related security events
-- ============================================================================
CREATE TABLE IF NOT EXISTS two_factor_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,  -- Event type: setup, enabled, disabled, verify_success, verify_failed, backup_used
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log table
CREATE INDEX IF NOT EXISTS idx_2fa_audit_user_id ON two_factor_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_audit_created_at ON two_factor_audit_log(created_at);

-- Composite index for common query pattern (user + time range)
CREATE INDEX IF NOT EXISTS idx_2fa_audit_user_time ON two_factor_audit_log(user_id, created_at DESC);

-- Index on action for filtering by event type
CREATE INDEX IF NOT EXISTS idx_2fa_audit_action ON two_factor_audit_log(action);

-- Comments for documentation
COMMENT ON TABLE two_factor_audit_log IS 'Audit log for 2FA security events';
COMMENT ON COLUMN two_factor_audit_log.action IS 'Event type: setup, enabled, disabled, verify_success, verify_failed, backup_used';
COMMENT ON COLUMN two_factor_audit_log.ip_address IS 'Client IP address at time of event';
COMMENT ON COLUMN two_factor_audit_log.user_agent IS 'Client user agent string';
COMMENT ON COLUMN two_factor_audit_log.metadata IS 'Additional event-specific data in JSON format';

-- Add CHECK constraint for valid action types
ALTER TABLE two_factor_audit_log
ADD CONSTRAINT chk_2fa_audit_action
CHECK (action IN ('setup', 'enabled', 'disabled', 'verify_success', 'verify_failed', 'backup_used', 'backup_regenerated', 'rate_limit_exceeded'));
