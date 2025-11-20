-- Rollback Migration: 004_create_password_reset_tokens.down.sql
-- Description: Rollback password_reset_tokens table creation
-- Story: 1.3 - Logout & Password Reset
-- Author: Database Agent
-- Date: 2025-11-19
-- WARNING: This will permanently delete all password reset tokens

-- Drop the index added to sessions table (DB-002)
DROP INDEX IF EXISTS idx_sessions_is_revoked;

-- Drop all indexes on password_reset_tokens
-- (They will be dropped with the table, but explicit for clarity)
DROP INDEX IF EXISTS idx_password_reset_tokens_valid;
DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at;
DROP INDEX IF EXISTS idx_password_reset_tokens_token_hash;
DROP INDEX IF EXISTS idx_password_reset_tokens_user_id;

-- Drop the password_reset_tokens table
DROP TABLE IF EXISTS password_reset_tokens;
