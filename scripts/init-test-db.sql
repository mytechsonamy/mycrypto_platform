-- Test Database Initialization Script
-- Purpose: Additional setup for test environment (migrations handle main schema)
-- This runs after migrations have initialized the core schema

-- Create test-specific schemas and roles if needed
-- (Most will be created by migrations)

-- Insert test fixtures if needed (optional - seed script handles this)

-- Disable foreign key constraints temporarily for faster test data insertion
SET session_replication_role = replica;

-- Re-enable after insertion
SET session_replication_role = default;

-- Log that setup completed
DO $$
BEGIN
    RAISE NOTICE 'Test database initialization completed at %', NOW();
END $$;
