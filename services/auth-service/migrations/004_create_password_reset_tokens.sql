-- Migration: 004_create_password_reset_tokens.sql
-- Description: Create password_reset_tokens table for secure password recovery
-- Story: 1.3 - Logout & Password Reset
-- Author: Database Agent
-- Date: 2025-11-19

-- Create password_reset_tokens table for storing hashed reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on user_id for efficient user token lookups and cleanup
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Index on token_hash for fast token validation queries
-- Using UNIQUE ensures only one token with same hash exists (security)
CREATE UNIQUE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- Index on expires_at for cleanup of expired tokens
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Partial index for finding valid (unused, not expired) tokens efficiently
CREATE INDEX idx_password_reset_tokens_valid ON password_reset_tokens(user_id, expires_at)
    WHERE used_at IS NULL;

-- Add index on sessions.is_revoked for efficient cleanup queries (DB-002)
-- This partial index helps find revoked sessions for batch cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_is_revoked ON sessions(is_revoked)
    WHERE is_revoked = TRUE;

-- Table comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens for secure password recovery flow';
COMMENT ON COLUMN password_reset_tokens.id IS 'Unique token identifier (UUID v4)';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'Foreign key to users table - cascades on delete';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token (64 chars hex)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration timestamp (1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was consumed (NULL if unused)';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address that requested the password reset';
COMMENT ON COLUMN password_reset_tokens.user_agent IS 'Browser/client user agent from reset request';
COMMENT ON COLUMN password_reset_tokens.created_at IS 'Timestamp when the reset token was created';
