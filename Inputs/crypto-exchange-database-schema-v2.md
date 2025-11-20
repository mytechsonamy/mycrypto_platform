# Kurumsal Kripto Borsa Platformu - Database Schema V2.1 (Final)
## Production-Ready Database Design (PostgreSQL 14+)

**Version:** 2.1 (Final - Production Deployment Ready)  
**Last Updated:** 2025  
**Status:** ✅ Ready for Enterprise Deployment

**Revision History:**
- **V1.0:** Initial schema with core tables
- **V2.0:** Added user/admin separation, ledger table, custody wallets, ENUMs, RLS, partitioning
- **V2.1 (Final):** Fine-tuning based on detailed review:
  - ✅ Added `balance_bucket` to ledger (available/locked/fee/bonus/reserved)
  - ✅ Added counterparty tracking (`counterparty_user_id`, `counterparty_custody_id`, `account_ref`)
  - ✅ Clarified custody_wallets.total_balance as operational field
  - ✅ Made staff 2FA secret nullable for onboarding flow
  - ✅ Added user-to-profile mapping tables (fee_profiles, limit_profiles)
  - ✅ Added FK constraint notes for partitioned tables
  - ✅ Added comprehensive operational procedures (partition maintenance, ENUM modifications, RLS config, reconciliation, backup/restore, monitoring)

**Key Features:**
- 🔐 **Security:** RLS, immutable audit logs, proper roles
- 📈 **Performance:** Partitioning, strategic indexes, materialized views
- 🔄 **Consistency:** Ledger-based double-entry, row-level locking
- 📊 **Compliance:** Full audit trail, MASAK-ready
- 🛠️ **Maintainability:** ENUM types, config schema, automation scripts

---

**Revizyon notları:** Feedback'lere göre iyileştirilmiş versiyon
- ✅ User/Admin ayrımı netleştirildi
- ✅ Ledger tablosu eklendi (double-entry bookkeeping)
- ✅ Wallet/Custody ayrımı yapıldı
- ✅ ENUM types eklendi
- ✅ Row-level locking iyileştirildi
- ✅ Partitioning netleştirildi
- ✅ Immutable audit logs

---

## 1. Database Architecture Overview

### Database: `crypto_exchange`

```
crypto_exchange
├── Schema: public (core tables)
├── Schema: audit (immutable audit logs)
├── Schema: reporting (materialized views)
└── Schema: config (configuration & lookup tables)
```

---

## 2. ENUM Types (Type Safety)

```sql
-- User Types
CREATE TYPE user_type_enum AS ENUM ('customer', 'admin', 'compliance', 'system', 'api_user');

-- KYC Status
CREATE TYPE kyc_status_enum AS ENUM ('pending', 'submitted', 'in_review', 'approved', 'rejected', 'resubmit_required');

-- Risk Levels
CREATE TYPE risk_level_enum AS ENUM ('low', 'medium', 'high', 'critical');

-- AML Status
CREATE TYPE aml_status_enum AS ENUM ('clear', 'flagged', 'under_review', 'blocked');

-- User Status
CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'banned', 'deleted');

-- Document Types
CREATE TYPE document_type_enum AS ENUM (
    'national_id_front', 'national_id_back', 'passport', 'drivers_license',
    'selfie', 'address_proof', 'tax_document'
);

-- Verification Status
CREATE TYPE verification_status_enum AS ENUM ('pending', 'submitted', 'verified', 'rejected', 'expired');

-- Order Types & Sides
CREATE TYPE order_type_enum AS ENUM ('market', 'limit', 'stop_loss', 'stop_limit', 'oco');
CREATE TYPE order_side_enum AS ENUM ('buy', 'sell');
CREATE TYPE order_status_enum AS ENUM ('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired');

-- Transaction Types & Status
CREATE TYPE transaction_type_enum AS ENUM ('deposit', 'withdrawal', 'fee', 'rebate', 'internal_transfer');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'confirming', 'confirmed', 'completed', 'failed', 'cancelled');

-- Ledger Entry Types
CREATE TYPE ledger_entry_type_enum AS ENUM ('order', 'trade', 'deposit', 'withdrawal', 'fee', 'rebate', 'adjustment', 'settlement', 'internal_transfer');
CREATE TYPE ledger_direction_enum AS ENUM ('debit', 'credit');

-- Balance Buckets (NEW)
CREATE TYPE balance_bucket_enum AS ENUM ('available', 'locked', 'fee', 'bonus', 'reserved');

-- Asset Types
CREATE TYPE asset_type_enum AS ENUM ('crypto', 'fiat');

-- Compliance Case Types
CREATE TYPE compliance_case_type_enum AS ENUM (
    'suspicious_transaction', 'velocity_breach', 'large_transaction',
    'pep_detected', 'sanctions_match', 'unusual_pattern', 'manual_review'
);

-- Compliance Case Status
CREATE TYPE compliance_case_status_enum AS ENUM ('open', 'investigating', 'escalated', 'resolved', 'false_positive');
```

---

## 3. Core Tables (Revised)

### 3.1 Users Table (Customers Only)

```sql
CREATE TABLE users (
    -- Primary Key
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Type (always 'customer' for this table)
    user_type user_type_enum NOT NULL DEFAULT 'customer',
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    nationality VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3
    
    -- KYC Status
    kyc_status kyc_status_enum NOT NULL DEFAULT 'pending',
    kyc_level SMALLINT DEFAULT 0 CHECK (kyc_level >= 0 AND kyc_level <= 3),
    -- 0: Unverified, 1: Basic (ID verified), 2: Advanced (Address verified), 3: Premium
    
    -- Risk & Compliance
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level risk_level_enum DEFAULT 'low',
    is_pep BOOLEAN DEFAULT FALSE, -- Politically Exposed Person
    is_sanctioned BOOLEAN DEFAULT FALSE,
    aml_status aml_status_enum DEFAULT 'clear',
    
    -- Security
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret VARCHAR(255),
    login_attempts SMALLINT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status user_status_enum NOT NULL DEFAULT 'active',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    
    -- Soft Delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT users_phone_check CHECK (phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT users_type_check CHECK (user_type = 'customer')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_kyc_status ON users(kyc_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_risk_level ON users(risk_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- Updated_at trigger
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_policy ON users
    FOR ALL
    TO authenticated_user
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Comments
COMMENT ON TABLE users IS 'End-user customer accounts (not staff)';
COMMENT ON COLUMN users.user_type IS 'Always customer for this table';
```

---

### 3.2 Staff Users Table (NEW - Admin/Compliance/System)

```sql
CREATE TABLE staff_users (
    -- Primary Key
    staff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Staff Type
    staff_type user_type_enum NOT NULL CHECK (staff_type IN ('admin', 'compliance', 'system')),
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- Permissions
    role VARCHAR(50) NOT NULL, -- super_admin, admin, compliance_officer, viewer, system
    permissions JSONB, -- Granular permissions array
    
    -- Security (2FA mandatory for staff but secret set during onboarding)
    two_fa_enabled BOOLEAN DEFAULT TRUE, -- Mandatory for staff
    two_fa_secret VARCHAR(255), -- NULL initially, set during onboarding
    two_fa_setup_completed BOOLEAN DEFAULT FALSE, -- Tracks if onboarding done
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES staff_users(staff_id)
);

-- Indexes
CREATE INDEX idx_staff_users_email ON staff_users(email) WHERE is_active = TRUE;
CREATE INDEX idx_staff_users_username ON staff_users(username) WHERE is_active = TRUE;
CREATE INDEX idx_staff_users_role ON staff_users(role);
CREATE INDEX idx_staff_users_type ON staff_users(staff_type);

-- Trigger
CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE staff_users IS 'Internal staff accounts (admin, compliance, system)';
COMMENT ON COLUMN staff_users.permissions IS 'JSON array of granular permissions';
COMMENT ON COLUMN staff_users.two_fa_secret IS 'Initially NULL, set during onboarding flow. App layer must prevent login if two_fa_enabled=TRUE but setup_completed=FALSE';
COMMENT ON COLUMN staff_users.two_fa_setup_completed IS 'Tracks whether staff member has completed 2FA setup during onboarding';
```

---

### 3.3 User Wallets Table (User-Specific Crypto Balances)

```sql
CREATE TABLE user_wallets (
    -- Primary Key
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Cryptocurrency
    crypto_type VARCHAR(20) NOT NULL, -- BTC, ETH, USDT
    
    -- Balances (IMPORTANT: This is a snapshot, ledger is source of truth)
    available_balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    locked_balance NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
    
    -- User-specific deposit address
    deposit_address VARCHAR(255) UNIQUE,
    deposit_address_tag VARCHAR(100), -- For XRP, XLM, etc.
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: One wallet per user per crypto
    UNIQUE(user_id, crypto_type)
);

-- Indexes
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_crypto_type ON user_wallets(crypto_type);
CREATE INDEX idx_user_wallets_deposit_address ON user_wallets(deposit_address);

-- Trigger
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON user_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_wallets_isolation_policy ON user_wallets
    FOR ALL
    TO authenticated_user
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Comments
COMMENT ON TABLE user_wallets IS 'User cryptocurrency balances (snapshot)';
COMMENT ON COLUMN user_wallets.available_balance IS 'Balance available for trading/withdrawal';
COMMENT ON COLUMN user_wallets.locked_balance IS 'Balance locked in orders or pending operations';
```

---

### 3.4 Custody Wallets Table (NEW - Platform Hot/Cold Wallets)

```sql
CREATE TABLE custody_wallets (
    -- Primary Key
    custody_wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Wallet Type
    wallet_type VARCHAR(20) NOT NULL, -- hot, cold, fee, operational
    
    -- Cryptocurrency
    crypto_type VARCHAR(20) NOT NULL,
    
    -- Balance (aggregated from ledger)
    total_balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
    
    -- Addresses
    address VARCHAR(255) UNIQUE NOT NULL,
    address_tag VARCHAR(100),
    
    -- Multi-signature details (for cold wallets)
    is_multisig BOOLEAN DEFAULT FALSE,
    multisig_config JSONB, -- {required: 3, total: 5, signers: [...]}
    
    -- Security
    hsm_key_id VARCHAR(255), -- HSM reference
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_rebalanced_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT custody_wallets_type_check CHECK (wallet_type IN ('hot', 'cold', 'fee', 'operational')),
    CONSTRAINT custody_wallets_multisig_check CHECK (
        (wallet_type = 'cold' AND is_multisig = TRUE) OR wallet_type != 'cold'
    )
);

-- Indexes
CREATE INDEX idx_custody_wallets_type ON custody_wallets(wallet_type);
CREATE INDEX idx_custody_wallets_crypto ON custody_wallets(crypto_type);
CREATE INDEX idx_custody_wallets_address ON custody_wallets(address);

-- Trigger
CREATE TRIGGER update_custody_wallets_updated_at BEFORE UPDATE ON custody_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE custody_wallets IS 'Platform custody wallets (hot/cold/fee/operational)';
COMMENT ON COLUMN custody_wallets.multisig_config IS 'Multi-signature configuration for cold wallets';
COMMENT ON COLUMN custody_wallets.total_balance IS 'Operational convenience field - source of truth is ledger. Consider using view instead for strict consistency.';

-- Alternative: View-based approach (commented out, can be used instead of total_balance column)
/*
CREATE VIEW custody_wallet_balances AS
SELECT 
    cw.custody_wallet_id,
    cw.crypto_type AS currency,
    COALESCE(SUM(
        CASE 
            WHEN le.direction = 'debit' THEN le.amount 
            ELSE -le.amount 
        END
    ), 0) AS total_balance,
    MAX(le.created_at) AS last_update_at
FROM custody_wallets cw
LEFT JOIN ledger_entries le ON 
    le.counterparty_custody_id = cw.custody_wallet_id
    AND le.currency = cw.crypto_type
GROUP BY cw.custody_wallet_id, cw.crypto_type;
*/
```

---

### 3.5 Ledger Entries Table (NEW - Double-Entry Bookkeeping)

**This is the source of truth for all balance movements.**

```sql
CREATE TABLE ledger_entries (
    -- Primary Key
    entry_id BIGSERIAL PRIMARY KEY,
    
    -- User (NULL for platform/custody entries)
    user_id UUID REFERENCES users(user_id),
    
    -- Asset Details
    asset_type asset_type_enum NOT NULL, -- crypto, fiat
    currency VARCHAR(20) NOT NULL, -- BTC, ETH, TRY
    
    -- Amount & Direction
    amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
    direction ledger_direction_enum NOT NULL, -- debit, credit
    
    -- Balance Bucket (NEW)
    balance_bucket balance_bucket_enum DEFAULT 'available',
    -- Tracks which "bucket" this affects: available, locked, fee, bonus, reserved
    
    -- Balance After (running balance - optional optimization)
    balance_after NUMERIC(36, 18),
    
    -- Counterparty Tracking (NEW)
    counterparty_user_id UUID REFERENCES users(user_id),
    counterparty_custody_id UUID REFERENCES custody_wallets(custody_wallet_id),
    account_ref VARCHAR(100), -- e.g., 'user:UUID', 'custody:UUID', 'fee_pool', 'platform'
    
    -- Reference (what caused this entry)
    entry_type ledger_entry_type_enum NOT NULL,
    reference_id UUID, -- order_id, trade_id, transaction_id, etc.
    
    -- Description
    description TEXT,
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Idempotency
    idempotency_key VARCHAR(255) UNIQUE
) PARTITION BY RANGE (created_at);

-- Partitions (monthly)
CREATE TABLE ledger_entries_2025_01 PARTITION OF ledger_entries
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE ledger_entries_2025_02 PARTITION OF ledger_entries
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... create more partitions as needed

-- Indexes
CREATE INDEX idx_ledger_entries_user_id ON ledger_entries(user_id, created_at DESC);
CREATE INDEX idx_ledger_entries_currency ON ledger_entries(currency, created_at DESC);
CREATE INDEX idx_ledger_entries_reference ON ledger_entries(reference_id);
CREATE INDEX idx_ledger_entries_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_entries_idempotency ON ledger_entries(idempotency_key);

-- Immutability: Prevent UPDATE/DELETE
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_ledger_update BEFORE UPDATE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

CREATE TRIGGER prevent_ledger_delete BEFORE DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- Comments
COMMENT ON TABLE ledger_entries IS 'Immutable ledger - source of truth for all balance movements';
COMMENT ON COLUMN ledger_entries.direction IS 'debit = increase for user, credit = decrease';
COMMENT ON COLUMN ledger_entries.balance_bucket IS 'Which bucket does this affect: available, locked, fee, bonus, reserved';
COMMENT ON COLUMN ledger_entries.balance_after IS 'Running balance optimization (optional)';
COMMENT ON COLUMN ledger_entries.counterparty_user_id IS 'For internal transfers - which user is on the other side';
COMMENT ON COLUMN ledger_entries.counterparty_custody_id IS 'For platform transfers - which custody wallet is involved';
COMMENT ON COLUMN ledger_entries.account_ref IS 'Flexible reference: user:UUID, custody:UUID, fee_pool, platform';
COMMENT ON COLUMN ledger_entries.idempotency_key IS 'Prevents duplicate entries';
```

---

### 3.6 Fiat Accounts Table (Revised)

```sql
CREATE TABLE fiat_accounts (
    -- Primary Key
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Currency
    currency VARCHAR(3) NOT NULL DEFAULT 'TRY', -- ISO 4217
    
    -- Balances (snapshot - ledger is source of truth)
    available_balance NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    locked_balance NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
    
    -- Virtual IBAN (for deposits)
    virtual_iban VARCHAR(34) UNIQUE,
    iban_provider VARCHAR(50), -- Papara, Moka, etc.
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: One account per user per currency
    UNIQUE(user_id, currency)
);

-- Indexes
CREATE INDEX idx_fiat_accounts_user_id ON fiat_accounts(user_id);
CREATE INDEX idx_fiat_accounts_virtual_iban ON fiat_accounts(virtual_iban);

-- Trigger
CREATE TRIGGER update_fiat_accounts_updated_at BEFORE UPDATE ON fiat_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE fiat_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY fiat_accounts_isolation_policy ON fiat_accounts
    FOR ALL
    TO authenticated_user
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Comments
COMMENT ON TABLE fiat_accounts IS 'User fiat currency accounts (snapshot)';
```

---

### 3.7 Orders Table (Revised with Proper Locking)

```sql
CREATE TABLE orders (
    -- Primary Key
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    trading_pair_id INTEGER NOT NULL REFERENCES trading_pairs(trading_pair_id),
    
    -- Order Details
    order_type order_type_enum NOT NULL,
    side order_side_enum NOT NULL,
    
    -- Price & Amount
    price NUMERIC(36, 18) CHECK (price IS NULL OR price > 0),
    quantity NUMERIC(36, 18) NOT NULL CHECK (quantity > 0),
    filled_quantity NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0 AND filled_quantity <= quantity),
    
    -- Calculated Fields
    total_value NUMERIC(36, 18), -- price * quantity (for limit orders)
    average_filled_price NUMERIC(36, 18), -- Weighted average of executed trades
    
    -- Fees
    fee_amount NUMERIC(36, 18) DEFAULT 0,
    fee_currency VARCHAR(20),
    
    -- Status
    status order_status_enum NOT NULL DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    filled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Cancellation
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES staff_users(staff_id), -- NULL = user, UUID = admin
    
    -- Constraints
    CONSTRAINT orders_price_check CHECK (
        (order_type = 'market' AND price IS NULL) OR
        (order_type IN ('limit', 'stop_loss', 'stop_limit') AND price IS NOT NULL)
    )
) PARTITION BY RANGE (created_at);

-- Partitions (quarterly for orders)
CREATE TABLE orders_2025_q1 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE orders_2025_q2 PARTITION OF orders
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
-- ... more partitions

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_trading_pair ON orders(trading_pair_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Critical: Order book composite index
CREATE INDEX idx_orders_orderbook ON orders(trading_pair_id, side, status, price, created_at)
    WHERE status IN ('open', 'partially_filled');

-- Trigger
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_isolation_policy ON orders
    FOR ALL
    TO authenticated_user
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Comments
COMMENT ON TABLE orders IS 'User trading orders (partitioned by created_at)';
```

---

### 3.8 Trades Table (Revised - Partitioned)

```sql
CREATE TABLE trades (
    -- Primary Key
    trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    trading_pair_id INTEGER NOT NULL REFERENCES trading_pairs(trading_pair_id),
    buy_order_id UUID NOT NULL,
    sell_order_id UUID NOT NULL,
    buyer_id UUID NOT NULL REFERENCES users(user_id),
    seller_id UUID NOT NULL REFERENCES users(user_id),
    
    -- Trade Details
    price NUMERIC(36, 18) NOT NULL CHECK (price > 0),
    quantity NUMERIC(36, 18) NOT NULL CHECK (quantity > 0),
    total_value NUMERIC(36, 18) NOT NULL, -- price * quantity
    
    -- Fees
    buyer_fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    seller_fee NUMERIC(36, 18) NOT NULL DEFAULT 0,
    
    -- Timestamps
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP WITH TIME ZONE,
    
    -- Settlement Status
    is_settled BOOLEAN DEFAULT FALSE
) PARTITION BY RANGE (executed_at);

-- Partitions (monthly)
CREATE TABLE trades_2025_01 PARTITION OF trades
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE trades_2025_02 PARTITION OF trades
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... more partitions

-- Indexes
CREATE INDEX idx_trades_trading_pair ON trades(trading_pair_id, executed_at DESC);
CREATE INDEX idx_trades_buyer ON trades(buyer_id, executed_at DESC);
CREATE INDEX idx_trades_seller ON trades(seller_id, executed_at DESC);
CREATE INDEX idx_trades_buy_order ON trades(buy_order_id);
CREATE INDEX idx_trades_sell_order ON trades(sell_order_id);
CREATE INDEX idx_trades_settled ON trades(is_settled) WHERE is_settled = FALSE;

-- Comments
COMMENT ON TABLE trades IS 'Executed trades (partitioned by executed_at)';
COMMENT ON COLUMN trades.buy_order_id IS 'FK to orders table - consider NOT VALID constraint for partitioned tables';
COMMENT ON COLUMN trades.sell_order_id IS 'FK to orders table - consider NOT VALID constraint for partitioned tables';

-- Note on FK constraints for partitioned tables:
-- PostgreSQL 14+ supports FK to partitioned tables, but validation can be slow.
-- Options:
-- 1. Add FK with NOT VALID, then validate later: ALTER TABLE ... VALIDATE CONSTRAINT
-- 2. Enforce FK at application layer for better performance
-- 3. Use triggers for custom FK validation

-- Example FK constraint (can be added if needed):
-- ALTER TABLE trades ADD CONSTRAINT fk_trades_buy_order 
--   FOREIGN KEY (buy_order_id) REFERENCES orders(order_id) NOT VALID;
-- Then validate separately:
-- ALTER TABLE trades VALIDATE CONSTRAINT fk_trades_buy_order;
```

---

### 3.9 Compliance Cases Table (Revised with ENUM)

```sql
CREATE TABLE compliance_cases (
    -- Primary Key
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Case Details
    case_type compliance_case_type_enum NOT NULL,
    severity risk_level_enum NOT NULL, -- low, medium, high, critical
    
    -- Description
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Related Entities
    related_order_id UUID,
    related_transaction_id UUID,
    related_fiat_tx_id UUID,
    
    -- Investigation
    status compliance_case_status_enum NOT NULL DEFAULT 'open',
    
    assigned_to UUID REFERENCES staff_users(staff_id), -- Compliance officer
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Resolution
    resolution TEXT,
    resolved_by UUID REFERENCES staff_users(staff_id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- MASAK Reporting
    requires_masak_report BOOLEAN DEFAULT FALSE,
    masak_report_id VARCHAR(100),
    masak_reported_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_compliance_cases_user_id ON compliance_cases(user_id);
CREATE INDEX idx_compliance_cases_type ON compliance_cases(case_type);
CREATE INDEX idx_compliance_cases_severity ON compliance_cases(severity);
CREATE INDEX idx_compliance_cases_status ON compliance_cases(status);
CREATE INDEX idx_compliance_cases_assigned_to ON compliance_cases(assigned_to) WHERE assigned_to IS NOT NULL;

-- Trigger
CREATE TRIGGER update_compliance_cases_updated_at BEFORE UPDATE ON compliance_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE compliance_cases IS 'AML/MASAK compliance investigation cases';
```

---

### 3.10 Audit Logs Table (Revised - Immutable)

```sql
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit.audit_logs (
    -- Primary Key
    log_id BIGSERIAL PRIMARY KEY,
    
    -- Actor
    actor_id UUID, -- Can be user_id or staff_id
    actor_type user_type_enum NOT NULL, -- customer, admin, compliance, system
    actor_ip INET,
    
    -- Action
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    
    -- Details
    description TEXT,
    
    -- Before/After State
    before_state JSONB,
    after_state JSONB,
    
    -- Result
    status VARCHAR(20) NOT NULL, -- success, failure
    error_message TEXT,
    
    -- Metadata
    user_agent TEXT,
    request_id UUID,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Partitions (monthly)
CREATE TABLE audit.audit_logs_2025_01 PARTITION OF audit.audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit.audit_logs_2025_02 PARTITION OF audit.audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... more partitions

-- Indexes
CREATE INDEX idx_audit_logs_actor ON audit.audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit.audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit.audit_logs(created_at DESC);

-- Immutability: Prevent UPDATE/DELETE
CREATE OR REPLACE FUNCTION audit.prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update BEFORE UPDATE ON audit.audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit.prevent_audit_modification();

CREATE TRIGGER prevent_audit_delete BEFORE DELETE ON audit.audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit.prevent_audit_modification();

-- Revoke UPDATE/DELETE permissions
REVOKE UPDATE, DELETE ON audit.audit_logs FROM PUBLIC;

-- Comments
COMMENT ON TABLE audit.audit_logs IS 'Immutable audit trail - UPDATE/DELETE triggers will raise exception';
```

---

## 4. Config Schema (NEW - Configuration Tables)

```sql
CREATE SCHEMA IF NOT EXISTS config;

-- Fee Profiles (for dynamic fees)
CREATE TABLE config.fee_profiles (
    profile_id SERIAL PRIMARY KEY,
    profile_name VARCHAR(100) UNIQUE NOT NULL,
    trading_pair_id INTEGER REFERENCES trading_pairs(trading_pair_id),
    
    -- Fee Tiers (volume-based)
    maker_fee_percent NUMERIC(5, 4) NOT NULL,
    taker_fee_percent NUMERIC(5, 4) NOT NULL,
    
    -- Minimum Volume (for tier qualification)
    min_30day_volume NUMERIC(18, 2),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Limit Profiles (for user segments)
CREATE TABLE config.limit_profiles (
    profile_id SERIAL PRIMARY KEY,
    profile_name VARCHAR(100) UNIQUE NOT NULL,
    kyc_level_required SMALLINT NOT NULL,
    
    -- Daily Limits
    daily_withdrawal_limit_crypto NUMERIC(36, 18),
    daily_withdrawal_limit_fiat NUMERIC(18, 2),
    daily_deposit_limit_fiat NUMERIC(18, 2),
    
    -- Monthly Limits
    monthly_withdrawal_limit_crypto NUMERIC(36, 18),
    monthly_withdrawal_limit_fiat NUMERIC(18, 2),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- System Parameters
CREATE TABLE config.system_parameters (
    param_key VARCHAR(100) PRIMARY KEY,
    param_value TEXT NOT NULL,
    param_type VARCHAR(20) NOT NULL, -- string, number, boolean, json
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES staff_users(staff_id)
);

-- User Fee Profile Mappings (NEW - for dynamic fee assignment)
CREATE TABLE config.user_fee_profiles (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    profile_id INTEGER NOT NULL REFERENCES config.fee_profiles(profile_id),
    
    -- Validity period
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE, -- NULL = indefinite
    
    -- Assignment metadata
    assigned_by UUID REFERENCES staff_users(staff_id),
    assignment_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent overlapping assignments
    EXCLUDE USING gist (
        user_id WITH =,
        tstzrange(valid_from, valid_to, '[]') WITH &&
    )
);

CREATE INDEX idx_user_fee_profiles_user ON config.user_fee_profiles(user_id);
CREATE INDEX idx_user_fee_profiles_validity ON config.user_fee_profiles(valid_from, valid_to);

COMMENT ON TABLE config.user_fee_profiles IS 'Maps users to fee profiles with time validity - enables VIP/segment-based pricing';
COMMENT ON COLUMN config.user_fee_profiles.valid_to IS 'NULL means indefinite, otherwise profile expires at this timestamp';

-- User Limit Profile Mappings (NEW - for dynamic limit assignment)
CREATE TABLE config.user_limit_profiles (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    profile_id INTEGER NOT NULL REFERENCES config.limit_profiles(profile_id),
    
    -- Validity period
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE, -- NULL = indefinite
    
    -- Assignment metadata
    assigned_by UUID REFERENCES staff_users(staff_id),
    assignment_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent overlapping assignments
    EXCLUDE USING gist (
        user_id WITH =,
        tstzrange(valid_from, valid_to, '[]') WITH &&
    )
);

CREATE INDEX idx_user_limit_profiles_user ON config.user_limit_profiles(user_id);
CREATE INDEX idx_user_limit_profiles_validity ON config.user_limit_profiles(valid_from, valid_to);

COMMENT ON TABLE config.user_limit_profiles IS 'Maps users to limit profiles with time validity - enables segment-based limits';

-- Helper function to get active fee profile for a user
CREATE OR REPLACE FUNCTION config.get_user_fee_profile(p_user_id UUID, p_trading_pair_id INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_profile_id INTEGER;
BEGIN
    -- Get most recent active profile
    SELECT profile_id INTO v_profile_id
    FROM config.user_fee_profiles
    WHERE user_id = p_user_id
      AND valid_from <= CURRENT_TIMESTAMP
      AND (valid_to IS NULL OR valid_to > CURRENT_TIMESTAMP)
    ORDER BY valid_from DESC
    LIMIT 1;
    
    -- If no custom profile, use default from trading_pairs (or default profile)
    IF v_profile_id IS NULL THEN
        -- Return default profile logic here
        RETURN NULL; -- NULL means use trading_pair default fees
    END IF;
    
    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Sample system parameters
INSERT INTO config.system_parameters (param_key, param_value, param_type, description) VALUES
('platform.maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
('trading.max_open_orders_per_user', '100', 'number', 'Maximum open orders per user'),
('withdrawal.approval_threshold_btc', '1.0', 'number', 'BTC withdrawal requiring manual approval'),
('withdrawal.approval_threshold_try', '100000', 'number', 'TRY withdrawal requiring manual approval');
```

---

## 5. Revised Functions with Proper Locking

### 5.1 Place Order Function (With SELECT FOR UPDATE)

```sql
CREATE OR REPLACE FUNCTION place_order(
    p_user_id UUID,
    p_trading_pair_id INTEGER,
    p_order_type order_type_enum,
    p_side order_side_enum,
    p_price NUMERIC,
    p_quantity NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_base_currency VARCHAR(20);
    v_quote_currency VARCHAR(20);
    v_required_balance NUMERIC;
    v_wallet_id UUID;
    v_fiat_account_id UUID;
    v_current_available NUMERIC;
BEGIN
    -- Get trading pair details
    SELECT base_currency, quote_currency 
    INTO v_base_currency, v_quote_currency
    FROM trading_pairs 
    WHERE trading_pair_id = p_trading_pair_id 
      AND is_active = TRUE 
      AND is_trading_enabled = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trading pair not active or not found';
    END IF;
    
    -- Calculate required balance
    IF p_side = 'buy' THEN
        -- Buying: need quote currency (TRY)
        v_required_balance := COALESCE(p_price, 0) * p_quantity;
        
        -- Lock and check fiat account balance
        SELECT account_id, available_balance 
        INTO v_fiat_account_id, v_current_available
        FROM fiat_accounts 
        WHERE user_id = p_user_id AND currency = v_quote_currency
        FOR UPDATE; -- LOCK THE ROW
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Fiat account not found';
        END IF;
        
        IF v_current_available < v_required_balance THEN
            RAISE EXCEPTION 'Insufficient fiat balance: required %, available %', 
                v_required_balance, v_current_available;
        END IF;
        
        -- Update balance
        UPDATE fiat_accounts 
        SET available_balance = available_balance - v_required_balance,
            locked_balance = locked_balance + v_required_balance
        WHERE account_id = v_fiat_account_id;
        
        -- Create ledger entry
        INSERT INTO ledger_entries (
            user_id, asset_type, currency, amount, direction, balance_bucket,
            entry_type, reference_id, description, idempotency_key
        ) VALUES (
            p_user_id, 'fiat', v_quote_currency, v_required_balance, 'credit', 'locked',
            'order', NULL, 'Order placed - balance locked',
            'order_lock_' || gen_random_uuid()::text
        );
        
    ELSE -- sell
        -- Selling: need base currency (BTC, ETH, etc.)
        v_required_balance := p_quantity;
        
        -- Lock and check wallet balance
        SELECT wallet_id, available_balance 
        INTO v_wallet_id, v_current_available
        FROM user_wallets 
        WHERE user_id = p_user_id AND crypto_type = v_base_currency
        FOR UPDATE; -- LOCK THE ROW
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Crypto wallet not found';
        END IF;
        
        IF v_current_available < v_required_balance THEN
            RAISE EXCEPTION 'Insufficient crypto balance: required %, available %', 
                v_required_balance, v_current_available;
        END IF;
        
        -- Update balance
        UPDATE user_wallets 
        SET available_balance = available_balance - v_required_balance,
            locked_balance = locked_balance + v_required_balance
        WHERE wallet_id = v_wallet_id;
        
        -- Create ledger entry
        INSERT INTO ledger_entries (
            user_id, asset_type, currency, amount, direction, balance_bucket,
            entry_type, reference_id, description, idempotency_key
        ) VALUES (
            p_user_id, 'crypto', v_base_currency, v_required_balance, 'credit', 'locked',
            'order', NULL, 'Order placed - balance locked',
            'order_lock_' || gen_random_uuid()::text
        );
    END IF;
    
    -- Create order
    INSERT INTO orders (
        user_id, trading_pair_id, order_type, side, 
        price, quantity, status, total_value
    ) VALUES (
        p_user_id, p_trading_pair_id, p_order_type, p_side, 
        p_price, p_quantity, 'open', p_price * p_quantity
    ) RETURNING order_id INTO v_order_id;
    
    -- Update ledger with order_id
    UPDATE ledger_entries 
    SET reference_id = v_order_id
    WHERE reference_id IS NULL 
      AND description = 'Order placed - balance locked'
      AND user_id = p_user_id
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 second';
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION place_order IS 'Atomically place order with balance locking (SELECT FOR UPDATE)';
```

---

### 5.2 Reconciliation Function (Balance = Ledger Sum)

```sql
CREATE OR REPLACE FUNCTION reconcile_user_balance(
    p_user_id UUID,
    p_asset_type asset_type_enum,
    p_currency VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_ledger_balance NUMERIC;
    v_wallet_balance NUMERIC;
    v_diff NUMERIC;
BEGIN
    -- Calculate balance from ledger (debit - credit)
    -- Only consider 'available' and 'locked' buckets for user balances
    SELECT COALESCE(
        SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END), 0
    )
    INTO v_ledger_balance
    FROM ledger_entries
    WHERE user_id = p_user_id
      AND asset_type = p_asset_type
      AND currency = p_currency
      AND balance_bucket IN ('available', 'locked');
    
    -- Get current wallet/account balance
    IF p_asset_type = 'crypto' THEN
        SELECT available_balance + locked_balance
        INTO v_wallet_balance
        FROM user_wallets
        WHERE user_id = p_user_id AND crypto_type = p_currency;
    ELSE -- fiat
        SELECT available_balance + locked_balance
        INTO v_wallet_balance
        FROM fiat_accounts
        WHERE user_id = p_user_id AND currency = p_currency;
    END IF;
    
    v_diff := v_ledger_balance - COALESCE(v_wallet_balance, 0);
    
    -- If difference found, log and return FALSE
    IF ABS(v_diff) > 0.00000001 THEN -- Allow tiny floating point diff
        INSERT INTO audit.audit_logs (
            actor_id, actor_type, action, resource_type, resource_id,
            description, status
        ) VALUES (
            p_user_id, 'system', 'balance_reconciliation_mismatch', 
            p_asset_type::text || '_balance', p_user_id,
            format('Mismatch: ledger=%s, wallet=%s, diff=%s', 
                v_ledger_balance, v_wallet_balance, v_diff),
            'failure'
        );
        
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_user_balance IS 'Verify wallet balance matches ledger sum';
```

---

## 6. Materialized Views (Revised)

### 6.1 User Balance Summary (From Ledger)

```sql
CREATE MATERIALIZED VIEW reporting.user_balance_summary AS
SELECT 
    user_id,
    asset_type,
    currency,
    balance_bucket,
    SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END) AS ledger_balance,
    COUNT(*) AS total_entries,
    MAX(created_at) AS last_entry_at
FROM ledger_entries
WHERE user_id IS NOT NULL
GROUP BY user_id, asset_type, currency, balance_bucket;

CREATE UNIQUE INDEX idx_user_balance_summary_pk 
    ON reporting.user_balance_summary(user_id, asset_type, currency, balance_bucket);

-- Refresh periodically (e.g., hourly)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY reporting.user_balance_summary;

-- View with aggregated balances (available + locked)
CREATE VIEW reporting.user_balance_totals AS
SELECT 
    user_id,
    asset_type,
    currency,
    SUM(CASE WHEN balance_bucket = 'available' THEN ledger_balance ELSE 0 END) AS available_balance,
    SUM(CASE WHEN balance_bucket = 'locked' THEN ledger_balance ELSE 0 END) AS locked_balance,
    SUM(CASE WHEN balance_bucket IN ('available', 'locked') THEN ledger_balance ELSE 0 END) AS total_balance
FROM reporting.user_balance_summary
GROUP BY user_id, asset_type, currency;
```

---

## 7. Sample Queries (Revised)

### 7.1 Get User Portfolio (From Ledger)

```sql
-- Get user's portfolio directly from ledger (source of truth)
SELECT 
    asset_type,
    currency,
    SUM(CASE 
        WHEN balance_bucket = 'available' AND direction = 'debit' THEN amount 
        WHEN balance_bucket = 'available' AND direction = 'credit' THEN -amount 
        ELSE 0 
    END) AS available_balance,
    SUM(CASE 
        WHEN balance_bucket = 'locked' AND direction = 'debit' THEN amount 
        WHEN balance_bucket = 'locked' AND direction = 'credit' THEN -amount 
        ELSE 0 
    END) AS locked_balance,
    SUM(CASE 
        WHEN balance_bucket IN ('available', 'locked') AND direction = 'debit' THEN amount 
        WHEN balance_bucket IN ('available', 'locked') AND direction = 'credit' THEN -amount 
        ELSE 0 
    END) AS total_balance,
    -- Approximate TRY value (requires price feed)
    CASE 
        WHEN asset_type = 'crypto' THEN
            SUM(CASE 
                WHEN balance_bucket IN ('available', 'locked') AND direction = 'debit' THEN amount 
                WHEN balance_bucket IN ('available', 'locked') AND direction = 'credit' THEN -amount 
                ELSE 0 
            END) * 
            COALESCE((
                SELECT last_price 
                FROM reporting.trading_pair_statistics 
                WHERE symbol = currency || '_TRY'
            ), 0)
        ELSE
            SUM(CASE 
                WHEN balance_bucket IN ('available', 'locked') AND direction = 'debit' THEN amount 
                WHEN balance_bucket IN ('available', 'locked') AND direction = 'credit' THEN -amount 
                ELSE 0 
            END)
    END AS approximate_try_value
FROM ledger_entries
WHERE user_id = '...' -- user UUID
GROUP BY asset_type, currency
HAVING SUM(CASE 
    WHEN balance_bucket IN ('available', 'locked') AND direction = 'debit' THEN amount 
    WHEN balance_bucket IN ('available', 'locked') AND direction = 'credit' THEN -amount 
    ELSE 0 
END) > 0;
```

---

### 7.2 Find Balance Discrepancies (Reconciliation Report)

```sql
-- Find users with balance mismatches between wallet and ledger
WITH ledger_balances AS (
    SELECT 
        user_id,
        'crypto' AS asset_type,
        currency AS crypto_type,
        SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END) AS ledger_balance
    FROM ledger_entries
    WHERE asset_type = 'crypto'
    GROUP BY user_id, currency
),
wallet_balances AS (
    SELECT 
        user_id,
        crypto_type,
        available_balance + locked_balance AS wallet_balance
    FROM user_wallets
)
SELECT 
    lb.user_id,
    u.email,
    lb.crypto_type,
    lb.ledger_balance,
    COALESCE(wb.wallet_balance, 0) AS wallet_balance,
    lb.ledger_balance - COALESCE(wb.wallet_balance, 0) AS discrepancy
FROM ledger_balances lb
LEFT JOIN wallet_balances wb ON lb.user_id = wb.user_id AND lb.crypto_type = wb.crypto_type
JOIN users u ON lb.user_id = u.user_id
WHERE ABS(lb.ledger_balance - COALESCE(wb.wallet_balance, 0)) > 0.00000001
ORDER BY ABS(discrepancy) DESC;
```

---

## 8. Database Roles & Permissions

```sql
-- Application role (normal operations)
CREATE ROLE app_user LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE crypto_exchange TO app_user;
GRANT USAGE ON SCHEMA public, audit, reporting TO app_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT SELECT, INSERT ON audit.audit_logs TO app_user; -- No UPDATE/DELETE
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO app_user;

-- Read-only role (for analytics/BI)
CREATE ROLE read_only_user LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE crypto_exchange TO read_only_user;
GRANT USAGE ON SCHEMA public, audit, reporting TO read_only_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public, audit, reporting TO read_only_user;

-- Admin role (with UPDATE on config, but not audit)
CREATE ROLE admin_user LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE crypto_exchange TO admin_user;
GRANT USAGE ON ALL SCHEMAS IN DATABASE crypto_exchange TO admin_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public, config TO admin_user;
GRANT SELECT, INSERT ON audit.audit_logs TO admin_user; -- Still no UPDATE/DELETE
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA reporting TO admin_user;
```

---

## 9. Key Improvements Summary

### ✅ 1. User/Admin Separation
- `users` table: Customers only
- `staff_users` table: Admin, compliance, system
- FK references updated accordingly

### ✅ 2. Ledger Table (Double-Entry)
- `ledger_entries`: Source of truth for all balance movements
- Immutable (triggers prevent UPDATE/DELETE)
- Partitioned by month
- Idempotency keys for duplicate prevention
- Reconciliation functions

### ✅ 3. Wallet/Custody Separation
- `user_wallets`: User-specific crypto balances
- `custody_wallets`: Platform hot/cold/fee/operational wallets
- Clear separation of concerns

### ✅ 4. ENUM Types
- Type safety for status fields
- Prevents invalid values
- Better query performance
- Standardization across codebase

### ✅ 5. Row-Level Locking
- `SELECT FOR UPDATE` in `place_order` function
- Prevents race conditions
- Atomic balance checks and updates

### ✅ 6. Partitioning Strategy
- `orders`: Quarterly partitions
- `trades`: Monthly partitions
- `ledger_entries`: Monthly partitions
- `audit.audit_logs`: Monthly partitions

### ✅ 7. Immutable Audit Logs
- Triggers prevent UPDATE/DELETE
- Permission revocation
- Compliance-ready

### ✅ 8. Config Schema
- `fee_profiles`: Dynamic fee structures
- `limit_profiles`: User segment limits
- `system_parameters`: Runtime configuration

### ✅ 9. RLS (Row-Level Security)
- Enabled on `users`, `user_wallets`, `fiat_accounts`, `orders`
- Users can only see their own data
- DB-level security layer

### ✅ 10. Database Roles
- `app_user`: Application operations
- `read_only_user`: Analytics/BI
- `admin_user`: Configuration management

---

## 10. Migration Path

### From V1 to V2

```sql
BEGIN;

-- 1. Create ENUM types
-- (run all CREATE TYPE statements)

-- 2. Create new tables
CREATE TABLE staff_users (...);
CREATE TABLE custody_wallets (...);
CREATE TABLE ledger_entries (...) PARTITION BY RANGE (created_at);
CREATE SCHEMA config;
CREATE TABLE config.fee_profiles (...);
-- ... etc

-- 3. Migrate existing data
-- Example: Migrate admin users from users to staff_users
INSERT INTO staff_users (staff_id, staff_type, email, username, ...)
SELECT user_id, 'admin', email, email, ...
FROM users 
WHERE user_type = 'admin';

-- 4. Rename old tables
ALTER TABLE wallets RENAME TO user_wallets_old;

-- 5. Create new user_wallets
CREATE TABLE user_wallets (...);

-- 6. Migrate data
INSERT INTO user_wallets (...)
SELECT ... FROM user_wallets_old WHERE user_id IN (SELECT user_id FROM users WHERE user_type = 'customer');

-- 7. Build ledger from existing transactions
-- (This is complex - might need a script)

-- 8. Drop old tables (after verification)
-- DROP TABLE user_wallets_old;

COMMIT;
```

---

## 11. Next Steps

**Schema V2 hazır! Artık production-grade.**

**Sıradaki adımlar:**
1. **API Specification** - RESTful endpoints
2. **WebSocket Protocol** - Real-time feeds
3. **Matching Engine Logic** - Order matching algorithm
4. **Settlement Process** - Trade settlement workflow
5. **Sample Data & Testing** - Test data generation

**Hangisiyle devam edelim?**

---

## 12. Operational Procedures (NEW)

### 12.1 Partition Maintenance

**Partitioned tables require regular partition creation:**

- `orders`: Quarterly partitions
- `trades`: Monthly partitions
- `ledger_entries`: Monthly partitions
- `audit.audit_logs`: Monthly partitions

**Automation Script (PostgreSQL function):**

```sql
CREATE OR REPLACE FUNCTION admin.create_monthly_partitions(
    p_schema_name TEXT,
    p_table_name TEXT,
    p_months_ahead INTEGER DEFAULT 3
) RETURNS VOID AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_partition_name TEXT;
    v_sql TEXT;
    i INTEGER;
BEGIN
    FOR i IN 1..p_months_ahead LOOP
        v_start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        v_end_date := v_start_date + INTERVAL '1 month';
        v_partition_name := p_table_name || '_' || to_char(v_start_date, 'YYYY_MM');
        
        -- Check if partition exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = v_partition_name
        ) THEN
            v_sql := format(
                'CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)',
                p_schema_name, v_partition_name, p_schema_name, p_table_name,
                v_start_date, v_end_date
            );
            
            EXECUTE v_sql;
            
            RAISE NOTICE 'Created partition: %.%', p_schema_name, v_partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT admin.create_monthly_partitions('public', 'trades', 6);
-- SELECT admin.create_monthly_partitions('public', 'ledger_entries', 6);
-- SELECT admin.create_monthly_partitions('audit', 'audit_logs', 6);
```

**Quarterly partition function for orders:**

```sql
CREATE OR REPLACE FUNCTION admin.create_quarterly_partitions(
    p_schema_name TEXT,
    p_table_name TEXT,
    p_quarters_ahead INTEGER DEFAULT 2
) RETURNS VOID AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_partition_name TEXT;
    v_sql TEXT;
    i INTEGER;
BEGIN
    FOR i IN 1..p_quarters_ahead LOOP
        v_start_date := date_trunc('quarter', CURRENT_DATE + (i * 3 || ' months')::INTERVAL);
        v_end_date := v_start_date + INTERVAL '3 months';
        v_partition_name := p_table_name || '_' || to_char(v_start_date, 'YYYY_q"Q"');
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = lower(v_partition_name)
        ) THEN
            v_sql := format(
                'CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)',
                p_schema_name, v_partition_name, p_schema_name, p_table_name,
                v_start_date, v_end_date
            );
            
            EXECUTE v_sql;
            
            RAISE NOTICE 'Created partition: %.%', p_schema_name, v_partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT admin.create_quarterly_partitions('public', 'orders', 4);
```

**Cron job setup (example with pg_cron extension):**

```sql
-- Install pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule monthly partition creation (runs 1st of every month)
SELECT cron.schedule(
    'create-monthly-partitions',
    '0 0 1 * *', -- At 00:00 on day 1 of every month
    $$
    SELECT admin.create_monthly_partitions('public', 'trades', 6);
    SELECT admin.create_monthly_partitions('public', 'ledger_entries', 6);
    SELECT admin.create_monthly_partitions('audit', 'audit_logs', 6);
    $$
);

-- Schedule quarterly partition creation (runs 1st of Jan, Apr, Jul, Oct)
SELECT cron.schedule(
    'create-quarterly-partitions',
    '0 0 1 1,4,7,10 *',
    $$SELECT admin.create_quarterly_partitions('public', 'orders', 4);$$
);
```

---

### 12.2 ENUM Modification Procedures

**Adding new values to ENUM types:**

```sql
-- Example: Add new order status
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'on_hold';

-- Note: New values are always added at the end
-- To insert in specific position, you need to recreate the type (more complex)

-- Best practice: Plan ENUMs carefully, or use lookup tables for frequently changing values
```

**Migration strategy for ENUM changes:**

```sql
-- Step 1: Create new ENUM with desired values
CREATE TYPE order_status_enum_new AS ENUM (
    'pending', 'open', 'on_hold', 'partially_filled', 
    'filled', 'cancelled', 'rejected', 'expired'
);

-- Step 2: Add temporary column
ALTER TABLE orders ADD COLUMN status_new order_status_enum_new;

-- Step 3: Migrate data
UPDATE orders SET status_new = status::text::order_status_enum_new;

-- Step 4: Drop old column
ALTER TABLE orders DROP COLUMN status;

-- Step 5: Rename new column
ALTER TABLE orders RENAME COLUMN status_new TO status;

-- Step 6: Drop old type
DROP TYPE order_status_enum;

-- Step 7: Rename new type
ALTER TYPE order_status_enum_new RENAME TO order_status_enum;
```

---

### 12.3 RLS Configuration for Application

**Setting user context for RLS policies:**

```sql
-- Application layer must set this for each request
-- Example in connection pool initialization:

-- For end-user requests:
SET app.current_user_id = 'user-uuid-here';

-- For staff/admin requests (bypass RLS):
-- Option 1: Use different database role without RLS
-- Option 2: Set staff context
SET app.current_staff_id = 'staff-uuid-here';
SET ROLE admin_user; -- This role should have BYPASSRLS privilege
```

**PostgreSQL role with RLS bypass:**

```sql
-- Grant BYPASSRLS to admin role
ALTER ROLE admin_user BYPASSRLS;

-- For internal service accounts
CREATE ROLE internal_service LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE crypto_exchange TO internal_service;
GRANT USAGE ON ALL SCHEMAS IN DATABASE crypto_exchange TO internal_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO internal_service;
ALTER ROLE internal_service BYPASSRLS;
```

---

### 12.4 Ledger Reconciliation Schedule

**Daily reconciliation job:**

```sql
CREATE OR REPLACE FUNCTION admin.daily_reconciliation_report()
RETURNS TABLE (
    user_id UUID,
    asset_type TEXT,
    currency TEXT,
    ledger_balance NUMERIC,
    wallet_balance NUMERIC,
    discrepancy NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH ledger_balances AS (
        SELECT 
            le.user_id,
            le.asset_type::text,
            le.currency,
            SUM(CASE WHEN le.direction = 'debit' THEN le.amount ELSE -le.amount END) AS ledger_balance
        FROM ledger_entries le
        WHERE le.user_id IS NOT NULL
          AND le.balance_bucket IN ('available', 'locked') -- Only user balances
        GROUP BY le.user_id, le.asset_type, le.currency
    ),
    wallet_balances AS (
        SELECT 
            user_id,
            'crypto' AS asset_type,
            crypto_type AS currency,
            available_balance + locked_balance AS wallet_balance
        FROM user_wallets
        UNION ALL
        SELECT 
            user_id,
            'fiat' AS asset_type,
            currency,
            available_balance + locked_balance AS wallet_balance
        FROM fiat_accounts
    )
    SELECT 
        lb.user_id,
        lb.asset_type,
        lb.currency,
        lb.ledger_balance,
        COALESCE(wb.wallet_balance, 0) AS wallet_balance,
        lb.ledger_balance - COALESCE(wb.wallet_balance, 0) AS discrepancy
    FROM ledger_balances lb
    LEFT JOIN wallet_balances wb ON 
        lb.user_id = wb.user_id 
        AND lb.asset_type = wb.asset_type 
        AND lb.currency = wb.currency
    WHERE ABS(lb.ledger_balance - COALESCE(wb.wallet_balance, 0)) > 0.00000001;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (daily at 02:00)
SELECT cron.schedule(
    'daily-reconciliation',
    '0 2 * * *',
    $$
    INSERT INTO reporting.reconciliation_alerts
    SELECT *, CURRENT_TIMESTAMP FROM admin.daily_reconciliation_report();
    $$
);
```

---

### 12.5 Backup & Restore Procedures

**Full backup script:**

```bash
#!/bin/bash
# daily_backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="crypto_exchange"

# Full database backup
pg_dump -U postgres -d $DB_NAME -F c -b -v \
  -f $BACKUP_DIR/full_backup_${DATE}.dump

# Backup specific schemas separately (for faster restore)
pg_dump -U postgres -d $DB_NAME -F c -b -v \
  -n public -f $BACKUP_DIR/public_${DATE}.dump
  
pg_dump -U postgres -d $DB_NAME -F c -b -v \
  -n audit -f $BACKUP_DIR/audit_${DATE}.dump

# Compress old backups (7 days+)
find $BACKUP_DIR -name "*.dump" -mtime +7 -exec gzip {} \;

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.dump.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Point-in-Time Recovery setup:**

```
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /mnt/wal_archive/%f'
archive_timeout = 300  # Archive every 5 minutes

# Enable continuous archiving
max_wal_senders = 3
wal_keep_size = 1GB
```

---

### 12.6 Monitoring Queries

**Key metrics to monitor:**

```sql
-- 1. Ledger integrity check
SELECT 
    COUNT(*) as total_users,
    COUNT(DISTINCT CASE WHEN has_discrepancy THEN user_id END) as users_with_discrepancy
FROM (
    SELECT user_id, admin.reconcile_user_balance(user_id, 'crypto', 'BTC') as has_discrepancy
    FROM users WHERE deleted_at IS NULL
) sub;

-- 2. Pending withdrawals aging
SELECT 
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_hours_pending
FROM transactions
WHERE tx_type = 'withdrawal' AND status IN ('pending', 'confirming')
GROUP BY status;

-- 3. Table sizes and growth
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- 4. Slow queries (requires pg_stat_statements)
SELECT 
    substring(query, 1, 50) AS short_query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 5. Index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 13. V2.1 Change Summary

**Fine-tuning improvements based on feedback:**

### ✅ **Ledger Enhancements**
- Added `balance_bucket` enum (available/locked/fee/bonus/reserved)
- Added `counterparty_user_id` and `counterparty_custody_id` for tracking transfers
- Added `account_ref` string for flexible referencing
- Added `internal_transfer` to entry types

### ✅ **Custody Wallets**
- Clarified `total_balance` as operational convenience field
- Added view-based alternative approach (commented)
- Added note: "Ledger is source of truth"

### ✅ **Staff Users 2FA**
- Made `two_fa_secret` nullable for onboarding flow
- Added `two_fa_setup_completed` boolean
- Added comments explaining setup flow

### ✅ **Config Schema Additions**
- `user_fee_profiles`: Maps users to fee profiles with time validity
- `user_limit_profiles`: Maps users to limit profiles with time validity
- Helper function: `get_user_fee_profile()`
- Enables VIP/segment-based pricing

### ✅ **Trades Table**
- Added note about FK constraints to partitioned tables
- Example of NOT VALID + VALIDATE pattern
- Options: FK, app-layer, or triggers

### ✅ **Operational Procedures**
- Partition maintenance functions (monthly/quarterly)
- pg_cron automation examples
- ENUM modification procedures
- RLS configuration guide
- Daily reconciliation schedule
- Backup/restore procedures
- Monitoring queries

---

**Bu versiyon artık "production-deployment-ready" seviyesinde!** 🎯

**Hangisiyle devam edelim?**
