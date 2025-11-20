-- Migration: 002_create_sessions_table.sql
-- Description: Create sessions table for JWT refresh tokens
-- Story: 1.2 - User Login with JWT
-- Author: Database Agent
-- Date: 2025-11-19

-- Create sessions table for storing JWT refresh tokens
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on user_id for efficient user session lookups
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Index on refresh_token_hash for token validation queries
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token_hash);

-- Index on expires_at for cleanup of expired sessions
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Composite index for common query patterns (active sessions per user)
CREATE INDEX idx_sessions_user_active ON sessions(user_id, is_revoked)
    WHERE is_revoked = FALSE;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sessions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_sessions_updated_at_column();

-- Table comment for documentation
COMMENT ON TABLE sessions IS 'JWT refresh token sessions for user authentication';
COMMENT ON COLUMN sessions.id IS 'Unique session identifier (UUID v4)';
COMMENT ON COLUMN sessions.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN sessions.refresh_token_hash IS 'SHA-256 hash of the refresh token';
COMMENT ON COLUMN sessions.expires_at IS 'Timestamp when the refresh token expires';
COMMENT ON COLUMN sessions.ip_address IS 'IP address from which the session was created';
COMMENT ON COLUMN sessions.user_agent IS 'Browser/client user agent string';
COMMENT ON COLUMN sessions.is_revoked IS 'Whether the session has been manually revoked';
COMMENT ON COLUMN sessions.created_at IS 'Timestamp when the session was created';
COMMENT ON COLUMN sessions.updated_at IS 'Timestamp when the session was last updated';
