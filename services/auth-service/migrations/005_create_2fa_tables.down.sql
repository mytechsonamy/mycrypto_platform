-- migrations/005_create_2fa_tables.down.sql (ROLLBACK)
-- Removes Two-Factor Authentication related tables
-- Part of Story 1.4: Two-Factor Authentication

-- Drop tables in reverse order of creation (respecting foreign key dependencies)

-- ============================================================================
-- Table 3: two_factor_audit_log
-- ============================================================================
DROP INDEX IF EXISTS idx_2fa_audit_action;
DROP INDEX IF EXISTS idx_2fa_audit_user_time;
DROP INDEX IF EXISTS idx_2fa_audit_created_at;
DROP INDEX IF EXISTS idx_2fa_audit_user_id;
DROP TABLE IF EXISTS two_factor_audit_log;

-- ============================================================================
-- Table 2: two_factor_backup_codes
-- ============================================================================
DROP INDEX IF EXISTS idx_backup_codes_unused;
DROP INDEX IF EXISTS idx_backup_codes_code_hash;
DROP INDEX IF EXISTS idx_backup_codes_user_id;
DROP TABLE IF EXISTS two_factor_backup_codes;

-- ============================================================================
-- Table 1: two_factor_auth
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_two_factor_auth_updated_at ON two_factor_auth;
DROP FUNCTION IF EXISTS update_two_factor_auth_updated_at();
DROP TABLE IF EXISTS two_factor_auth;
