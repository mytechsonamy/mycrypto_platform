-- migrations/006_create_wallet_tables.down.sql (DOWN)
-- Rollback Wallet Management tables for Sprint 2
-- Description: Drops all wallet-related tables, triggers, and functions in reverse order

-- ============================================================================
-- ROLLBACK - Remove all wallet tables in reverse dependency order
-- ============================================================================

BEGIN;

-- Drop withdrawal_requests table and dependencies
DROP TRIGGER IF EXISTS trigger_update_withdrawal_requests_updated_at ON withdrawal_requests;
DROP FUNCTION IF EXISTS update_withdrawal_requests_updated_at();
DROP TABLE IF EXISTS withdrawal_requests CASCADE;

-- Drop deposit_requests table and dependencies
DROP TRIGGER IF EXISTS trigger_update_deposit_requests_updated_at ON deposit_requests;
DROP FUNCTION IF EXISTS update_deposit_requests_updated_at();
DROP TABLE IF EXISTS deposit_requests CASCADE;

-- Drop fiat_accounts table and dependencies
DROP TRIGGER IF EXISTS trigger_update_fiat_accounts_updated_at ON fiat_accounts;
DROP FUNCTION IF EXISTS update_fiat_accounts_updated_at();
DROP TABLE IF EXISTS fiat_accounts CASCADE;

-- Drop ledger_entries table
-- (No triggers or functions, just drop the table)
DROP TABLE IF EXISTS ledger_entries CASCADE;

-- Drop user_wallets table and dependencies
DROP TRIGGER IF EXISTS trigger_update_user_wallets_updated_at ON user_wallets;
DROP FUNCTION IF EXISTS update_user_wallets_updated_at();
DROP TABLE IF EXISTS user_wallets CASCADE;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify all tables were dropped
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('user_wallets', 'ledger_entries', 'fiat_accounts', 'deposit_requests', 'withdrawal_requests')) = 0,
        'Some wallet tables were not dropped successfully';

    RAISE NOTICE 'Migration 006 Rollback: All wallet tables dropped successfully';
    RAISE NOTICE '  - withdrawal_requests (DROPPED)';
    RAISE NOTICE '  - deposit_requests (DROPPED)';
    RAISE NOTICE '  - fiat_accounts (DROPPED)';
    RAISE NOTICE '  - ledger_entries (DROPPED)';
    RAISE NOTICE '  - user_wallets (DROPPED)';
END $$;

COMMIT;
