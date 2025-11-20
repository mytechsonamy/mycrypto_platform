-- Rollback Migration: 002_create_sessions_table.down.sql
-- Description: Rollback sessions table creation
-- Story: 1.2 - User Login with JWT
-- Author: Database Agent
-- Date: 2025-11-19

-- Drop trigger first
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_sessions_updated_at_column();

-- Drop all indexes (they will be dropped with the table, but explicit for clarity)
DROP INDEX IF EXISTS idx_sessions_user_active;
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_sessions_refresh_token;
DROP INDEX IF EXISTS idx_sessions_user_id;

-- Drop the sessions table
DROP TABLE IF EXISTS sessions;
