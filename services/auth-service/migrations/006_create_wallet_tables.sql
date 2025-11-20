-- migrations/006_create_wallet_tables.sql (UP)
-- Creates Wallet Management tables for Sprint 2
-- Part of Stories: 2.1, 2.2, 2.3, 2.6 - Wallet Management
-- Description: User wallets, ledger entries, fiat accounts, and deposit/withdrawal requests

-- ============================================================================
-- Table 1: user_wallets
-- Stores user wallet balances for each currency (BTC, ETH, USDT, TRY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,  -- 'TRY', 'BTC', 'ETH', 'USDT'
    available_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    locked_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_balance DECIMAL(20, 8) GENERATED ALWAYS AS (available_balance + locked_balance) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_currency UNIQUE(user_id, currency),
    CONSTRAINT chk_available_balance_non_negative CHECK (available_balance >= 0),
    CONSTRAINT chk_locked_balance_non_negative CHECK (locked_balance >= 0),
    CONSTRAINT chk_valid_currency CHECK (currency IN ('TRY', 'BTC', 'ETH', 'USDT'))
);

-- Indexes for user_wallets
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_currency ON user_wallets(currency);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_currency ON user_wallets(user_id, currency);

-- Comments for documentation
COMMENT ON TABLE user_wallets IS 'User wallet balances for each supported currency';
COMMENT ON COLUMN user_wallets.currency IS 'Currency type: TRY (fiat), BTC, ETH, USDT (crypto)';
COMMENT ON COLUMN user_wallets.available_balance IS 'Available balance for trading and withdrawals';
COMMENT ON COLUMN user_wallets.locked_balance IS 'Balance locked in pending orders or withdrawals';
COMMENT ON COLUMN user_wallets.total_balance IS 'Total balance (available + locked) - computed column';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_wallets_updated_at
BEFORE UPDATE ON user_wallets
FOR EACH ROW
EXECUTE FUNCTION update_user_wallets_updated_at();

-- ============================================================================
-- Table 2: ledger_entries
-- Double-entry bookkeeping for all balance changes (immutable audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'DEPOSIT', 'WITHDRAWAL', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'REFUND'
    amount DECIMAL(20, 8) NOT NULL,
    balance_before DECIMAL(20, 8) NOT NULL,
    balance_after DECIMAL(20, 8) NOT NULL,
    reference_id UUID,  -- Links to deposit/withdrawal/trade ID
    reference_type VARCHAR(50),  -- 'DEPOSIT_REQUEST', 'WITHDRAWAL_REQUEST', 'TRADE', 'ADMIN_ADJUSTMENT'
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_valid_ledger_type CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'REFUND', 'ADMIN_ADJUSTMENT')),
    CONSTRAINT chk_valid_reference_type CHECK (reference_type IS NULL OR reference_type IN ('DEPOSIT_REQUEST', 'WITHDRAWAL_REQUEST', 'TRADE', 'ADMIN_ADJUSTMENT'))
);

-- Indexes for ledger_entries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_currency ON ledger_entries(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(type);

-- Composite index for transaction history queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_time ON ledger_entries(user_id, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE ledger_entries IS 'Immutable ledger for all balance changes (double-entry bookkeeping)';
COMMENT ON COLUMN ledger_entries.type IS 'Transaction type: DEPOSIT, WITHDRAWAL, TRADE_BUY, TRADE_SELL, FEE, REFUND';
COMMENT ON COLUMN ledger_entries.amount IS 'Transaction amount (positive for credit, negative for debit)';
COMMENT ON COLUMN ledger_entries.balance_before IS 'User balance before this transaction';
COMMENT ON COLUMN ledger_entries.balance_after IS 'User balance after this transaction';
COMMENT ON COLUMN ledger_entries.reference_id IS 'Foreign key to related transaction (deposit, withdrawal, trade)';
COMMENT ON COLUMN ledger_entries.reference_type IS 'Type of referenced transaction';
COMMENT ON COLUMN ledger_entries.metadata IS 'Additional transaction data in JSON format';

-- ============================================================================
-- Table 3: fiat_accounts
-- User bank accounts for TRY deposits/withdrawals
-- ============================================================================
CREATE TABLE IF NOT EXISTS fiat_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_holder_name VARCHAR(255) NOT NULL,
    iban VARCHAR(34) NOT NULL,  -- TR format: 26 characters
    bank_name VARCHAR(100) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_iban UNIQUE(user_id, iban),
    CONSTRAINT chk_iban_format CHECK (iban ~* '^TR[0-9]{24}$'),
    CONSTRAINT chk_iban_length CHECK (LENGTH(iban) = 26),
    CONSTRAINT chk_account_holder_not_empty CHECK (LENGTH(TRIM(account_holder_name)) > 0),
    CONSTRAINT chk_bank_name_not_empty CHECK (LENGTH(TRIM(bank_name)) > 0)
);

-- Indexes for fiat_accounts
CREATE INDEX IF NOT EXISTS idx_fiat_accounts_user_id ON fiat_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_fiat_accounts_iban ON fiat_accounts(iban);
CREATE INDEX IF NOT EXISTS idx_fiat_accounts_verified ON fiat_accounts(is_verified) WHERE is_verified = TRUE;

-- Comments for documentation
COMMENT ON TABLE fiat_accounts IS 'User bank accounts for TRY fiat deposits and withdrawals';
COMMENT ON COLUMN fiat_accounts.iban IS 'Turkish IBAN (26 characters, TR format)';
COMMENT ON COLUMN fiat_accounts.account_holder_name IS 'Must match KYC verified name for withdrawals';
COMMENT ON COLUMN fiat_accounts.is_verified IS 'Admin verification status for first-time usage';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_fiat_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fiat_accounts_updated_at
BEFORE UPDATE ON fiat_accounts
FOR EACH ROW
EXECUTE FUNCTION update_fiat_accounts_updated_at();

-- ============================================================================
-- Table 4: deposit_requests
-- Track TRY deposit requests (bank transfer flow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deposit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    amount DECIMAL(20, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',  -- 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'
    fiat_account_id UUID REFERENCES fiat_accounts(id),
    transaction_reference VARCHAR(255),  -- Bank transaction reference
    admin_notes TEXT,
    receipt_url TEXT,  -- URL to uploaded receipt/proof
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT chk_deposit_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_deposit_min_amount CHECK (amount >= 100),  -- Minimum 100 TRY
    CONSTRAINT chk_valid_deposit_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
    CONSTRAINT chk_deposit_currency CHECK (currency IN ('TRY'))
);

-- Indexes for deposit_requests
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_created_at ON deposit_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_status ON deposit_requests(user_id, status);

-- Partial index for pending deposits (admin queue)
CREATE INDEX IF NOT EXISTS idx_deposit_requests_pending ON deposit_requests(created_at DESC) WHERE status = 'PENDING';

-- Comments for documentation
COMMENT ON TABLE deposit_requests IS 'TRY deposit requests via bank transfer';
COMMENT ON COLUMN deposit_requests.status IS 'PENDING: awaiting admin approval, APPROVED: approved but not credited, COMPLETED: balance credited';
COMMENT ON COLUMN deposit_requests.transaction_reference IS 'Bank transaction reference from transfer';
COMMENT ON COLUMN deposit_requests.receipt_url IS 'User-uploaded receipt or proof of transfer';
COMMENT ON COLUMN deposit_requests.admin_notes IS 'Admin comments on approval/rejection';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_deposit_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deposit_requests_updated_at
BEFORE UPDATE ON deposit_requests
FOR EACH ROW
EXECUTE FUNCTION update_deposit_requests_updated_at();

-- ============================================================================
-- Table 5: withdrawal_requests
-- Track TRY withdrawal requests (bank payout flow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    amount DECIMAL(20, 2) NOT NULL,
    fee DECIMAL(20, 2) NOT NULL DEFAULT 5,  -- Flat 5 TRY fee
    net_amount DECIMAL(20, 2) GENERATED ALWAYS AS (amount - fee) STORED,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',  -- 'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'
    fiat_account_id UUID NOT NULL REFERENCES fiat_accounts(id),
    transaction_reference VARCHAR(255),  -- Bank payout reference
    admin_notes TEXT,
    two_fa_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT chk_withdrawal_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_withdrawal_min_amount CHECK (amount >= 100),  -- Minimum 100 TRY
    CONSTRAINT chk_withdrawal_fee_non_negative CHECK (fee >= 0),
    CONSTRAINT chk_valid_withdrawal_status CHECK (status IN ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED')),
    CONSTRAINT chk_withdrawal_currency CHECK (currency IN ('TRY'))
);

-- Indexes for withdrawal_requests
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_status ON withdrawal_requests(user_id, status);

-- Partial index for pending withdrawals (admin approval queue)
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_pending ON withdrawal_requests(created_at DESC) WHERE status = 'PENDING';

-- Partial index for processing withdrawals (payout queue)
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_processing ON withdrawal_requests(created_at DESC) WHERE status IN ('APPROVED', 'PROCESSING');

-- Comments for documentation
COMMENT ON TABLE withdrawal_requests IS 'TRY withdrawal requests to bank accounts';
COMMENT ON COLUMN withdrawal_requests.status IS 'PENDING: awaiting approval, APPROVED: approved awaiting processing, PROCESSING: bank payout initiated, COMPLETED: payout successful, REJECTED: rejected by admin, FAILED: bank payout failed';
COMMENT ON COLUMN withdrawal_requests.fee IS 'Withdrawal fee (flat 5 TRY)';
COMMENT ON COLUMN withdrawal_requests.net_amount IS 'Amount user receives (amount - fee) - computed column';
COMMENT ON COLUMN withdrawal_requests.transaction_reference IS 'Bank payout transaction reference';
COMMENT ON COLUMN withdrawal_requests.two_fa_verified IS 'Whether 2FA code was verified for this withdrawal';
COMMENT ON COLUMN withdrawal_requests.admin_notes IS 'Admin comments on approval/rejection';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_withdrawal_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_withdrawal_requests_updated_at
BEFORE UPDATE ON withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION update_withdrawal_requests_updated_at();

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify all tables were created
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('user_wallets', 'ledger_entries', 'fiat_accounts', 'deposit_requests', 'withdrawal_requests')) = 5,
        'Not all wallet tables were created successfully';

    RAISE NOTICE 'Migration 006: All 5 wallet tables created successfully';
    RAISE NOTICE '  - user_wallets';
    RAISE NOTICE '  - ledger_entries';
    RAISE NOTICE '  - fiat_accounts';
    RAISE NOTICE '  - deposit_requests';
    RAISE NOTICE '  - withdrawal_requests';
END $$;
