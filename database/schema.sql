-- Schema Documentation: MyCrypto Platform Database Schema
-- Version: 1.0.0
-- Date: 2025-11-19
--
-- This file contains the complete database schema for the MyCrypto Platform.
-- It serves as documentation and can be used to recreate the database from scratch.

-- ============================================================================
-- DATABASE SCHEMA OVERVIEW
-- ============================================================================
--
-- Tables:
-- 1. users - User accounts and authentication
--
-- Future tables (planned for subsequent migrations):
-- - user_sessions - Session management
-- - kyc_documents - KYC verification documents
-- - wallets - User cryptocurrency wallets
-- - fiat_accounts - User fiat currency accounts
-- - orders - Trading orders
-- - trades - Executed trades
-- - transactions - Deposit/withdrawal transactions
-- - audit_logs - System audit trail
--
-- ============================================================================

-- ============================================================================
-- EXTENSION REQUIREMENTS
-- ============================================================================

-- Ensure pgcrypto is available for gen_random_uuid()
-- (Usually included by default in PostgreSQL 13+)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TABLE: users
-- ============================================================================
--
-- Purpose: Store user account information for authentication and profile
-- Related Stories: 1.1 (User Registration), 1.2 (User Login), 1.4 (Password Reset)
--
-- Schema Diagram:
-- +-------------------------+
-- |         users           |
-- +-------------------------+
-- | id (PK, UUID)           |
-- | email (UNIQUE)          |
-- | password_hash           |
-- | email_verified          |
-- | email_verification_token|
-- | email_verification_expires_at |
-- | terms_accepted          |
-- | kvkk_consent_accepted   |
-- | created_at              |
-- | updated_at              |
-- +-------------------------+

CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Email Verification
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires_at TIMESTAMP WITH TIME ZONE,

    -- Consent Tracking
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    kvkk_consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT users_email_format_check CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
    ),
    CONSTRAINT users_password_hash_not_empty CHECK (
        password_hash IS NOT NULL AND LENGTH(password_hash) > 0
    ),
    CONSTRAINT users_terms_required CHECK (
        terms_accepted = TRUE
    ),
    CONSTRAINT users_kvkk_required CHECK (
        kvkk_consent_accepted = TRUE
    )
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token)
    WHERE email_verification_token IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_email_verified ON users(email_verified)
    WHERE email_verified = FALSE;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Register a new user:
-- INSERT INTO users (email, password_hash, terms_accepted, kvkk_consent_accepted,
--                   email_verification_token, email_verification_expires_at)
-- VALUES ('user@example.com', '$argon2id$...', TRUE, TRUE,
--         'token-uuid', CURRENT_TIMESTAMP + INTERVAL '24 hours');

-- Verify email:
-- UPDATE users
-- SET email_verified = TRUE,
--     email_verification_token = NULL,
--     email_verification_expires_at = NULL
-- WHERE email_verification_token = 'token-uuid'
--   AND email_verification_expires_at > CURRENT_TIMESTAMP;

-- Find user by email for login:
-- SELECT id, email, password_hash, email_verified
-- FROM users
-- WHERE email = 'user@example.com';

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Expected data volume (MVP): ~100,000 users
--
-- Index Analysis:
-- - idx_users_email: Most frequent query (login), B-tree scan
-- - idx_users_email_verification_token: Partial index, smaller size
-- - idx_users_created_at: For admin reporting, sorted DESC
-- - idx_users_email_verified: Partial index for unverified user queries
--
-- Estimated sizes (100K users):
-- - Table: ~50 MB
-- - Indexes: ~20 MB total
--
-- Query Performance:
-- - Login by email: < 1ms (index scan)
-- - Token verification: < 1ms (index scan)
-- - List unverified users: < 10ms (partial index scan)

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- 1. Password hashing: Use Argon2id at application layer (min 12 rounds)
-- 2. Email verification token: Generate using crypto-secure random
-- 3. SQL injection: Use parameterized queries (ORM handles this)
-- 4. Rate limiting: Implement at application layer (5 attempts/hour)
-- 5. Future: Add Row Level Security (RLS) when admin features are added
