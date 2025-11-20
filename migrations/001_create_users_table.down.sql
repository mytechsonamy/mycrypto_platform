-- Rollback Migration: 001_create_users_table.down.sql
-- Description: Rollback users table creation
-- Author: Database Agent
-- Date: 2025-11-19
--
-- This rollback script removes all objects created by 001_create_users_table.sql
-- in reverse order of creation to handle dependencies properly.

-- ============================================================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================================================

BEGIN;

-- Drop trigger first (depends on function and table)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop the trigger function
-- Note: Using CASCADE to handle any dependencies
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop indexes (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_email_verification_token;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_email_verified;

-- Drop the users table (this will also drop constraints)
DROP TABLE IF EXISTS users CASCADE;

COMMIT;
