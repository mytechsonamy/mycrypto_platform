-- Migration: 001_create_users_table.sql
-- Description: Create users table for user registration (Story 1.1)
-- Author: Database Agent
-- Date: 2025-11-19
--
-- This migration creates the foundational users table with:
-- - UUID primary key
-- - Email with unique constraint and format validation
-- - Password hash storage
-- - Email verification flow fields
-- - Consent tracking (Terms & KVKK)
-- - Automatic timestamp management

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

BEGIN;

-- Create the users table
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
    -- Email format validation using regex
    CONSTRAINT users_email_format_check CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
    ),
    -- Password hash must not be empty (actual validation done at app layer)
    CONSTRAINT users_password_hash_not_empty CHECK (
        password_hash IS NOT NULL AND LENGTH(password_hash) > 0
    ),
    -- Terms must be accepted for registration
    CONSTRAINT users_terms_required CHECK (
        terms_accepted = TRUE
    ),
    -- KVKK consent must be accepted for registration
    CONSTRAINT users_kvkk_required CHECK (
        kvkk_consent_accepted = TRUE
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index on email for fast login lookups
CREATE INDEX idx_users_email ON users(email);

-- Index on email_verification_token for verification flow
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token)
    WHERE email_verification_token IS NOT NULL;

-- Index on created_at for reporting and sorting
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Index on email_verified for filtering unverified users
CREATE INDEX idx_users_email_verified ON users(email_verified)
    WHERE email_verified = FALSE;

-- ============================================================================
-- TRIGGER FUNCTION FOR updated_at
-- ============================================================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts for the cryptocurrency exchange platform';
COMMENT ON COLUMN users.id IS 'Unique identifier (UUID v4)';
COMMENT ON COLUMN users.email IS 'User email address - used for login and notifications';
COMMENT ON COLUMN users.password_hash IS 'Argon2id hashed password - never store plaintext';
COMMENT ON COLUMN users.email_verified IS 'Flag indicating if email has been verified';
COMMENT ON COLUMN users.email_verification_token IS 'Token sent via email for verification (expires in 24h)';
COMMENT ON COLUMN users.email_verification_expires_at IS 'Expiration timestamp for email verification token';
COMMENT ON COLUMN users.terms_accepted IS 'User accepted Terms & Conditions v1.0';
COMMENT ON COLUMN users.kvkk_consent_accepted IS 'User accepted KVKK (Turkish data protection) consent';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user registered';
COMMENT ON COLUMN users.updated_at IS 'Timestamp of last update (auto-updated by trigger)';

COMMIT;
