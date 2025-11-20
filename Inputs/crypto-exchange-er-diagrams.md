# Kurumsal Kripto Borsa Platformu - ER Diagram
## Entity Relationship Diagrams (Mermaid)

**Version:** 2.1 Final  
**Database:** PostgreSQL 14+

---

## 1. High-Level Overview (Core Entities)

```mermaid
erDiagram
    USERS ||--o{ USER_WALLETS : "has"
    USERS ||--o{ FIAT_ACCOUNTS : "has"
    USERS ||--o{ BANK_ACCOUNTS : "owns"
    USERS ||--o{ KYC_DOCUMENTS : "submits"
    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ LEDGER_ENTRIES : "has"
    USERS ||--o{ COMPLIANCE_CASES : "subject of"
    
    STAFF_USERS ||--o{ KYC_DOCUMENTS : "verifies"
    STAFF_USERS ||--o{ COMPLIANCE_CASES : "investigates"
    
    TRADING_PAIRS ||--o{ ORDERS : "for"
    TRADING_PAIRS ||--o{ TRADES : "executed on"
    
    ORDERS ||--o{ TRADES : "matched in"
    USERS ||--o{ TRADES : "buyer"
    USERS ||--o{ TRADES : "seller"
    
    USERS ||--o{ TRANSACTIONS : "initiates"
    USERS ||--o{ FIAT_TRANSACTIONS : "initiates"
    
    CUSTODY_WALLETS ||--o{ LEDGER_ENTRIES : "counterparty"
    
    USERS {
        uuid user_id PK
        varchar email UK
        varchar phone UK
        kyc_status_enum kyc_status
        risk_level_enum risk_level
        user_status_enum status
    }
    
    USER_WALLETS {
        uuid wallet_id PK
        uuid user_id FK
        varchar crypto_type
        numeric available_balance
        numeric locked_balance
    }
    
    FIAT_ACCOUNTS {
        uuid account_id PK
        uuid user_id FK
        varchar currency
        numeric available_balance
        numeric locked_balance
    }
    
    ORDERS {
        uuid order_id PK
        uuid user_id FK
        int trading_pair_id FK
        order_type_enum order_type
        order_side_enum side
        order_status_enum status
    }
    
    TRADES {
        uuid trade_id PK
        uuid buy_order_id FK
        uuid sell_order_id FK
        uuid buyer_id FK
        uuid seller_id FK
        numeric price
        numeric quantity
    }
    
    LEDGER_ENTRIES {
        bigserial entry_id PK
        uuid user_id FK
        asset_type_enum asset_type
        varchar currency
        numeric amount
        ledger_direction_enum direction
        balance_bucket_enum balance_bucket
    }
```

---

## 2. Detailed ER Diagram - User & Authentication Domain

```mermaid
erDiagram
    USERS ||--o{ USER_WALLETS : "has"
    USERS ||--o{ FIAT_ACCOUNTS : "has"
    USERS ||--o{ BANK_ACCOUNTS : "owns"
    USERS ||--o{ KYC_DOCUMENTS : "submits"
    USERS ||--o{ LEDGER_ENTRIES : "balance movements"
    
    STAFF_USERS ||--o{ KYC_DOCUMENTS : "verifies (verified_by)"
    STAFF_USERS ||--o{ USERS : "creates (created_by)"
    
    USERS {
        uuid user_id PK "Primary Key"
        user_type_enum user_type "Always customer"
        varchar email UK "Unique"
        varchar phone UK "Unique"
        varchar password_hash "Hashed"
        varchar first_name
        varchar last_name
        date date_of_birth
        varchar nationality "ISO 3166-1"
        kyc_status_enum kyc_status "KYC state"
        smallint kyc_level "0-3"
        integer risk_score "0-100"
        risk_level_enum risk_level "low/medium/high/critical"
        boolean is_pep "Politically Exposed"
        boolean is_sanctioned
        aml_status_enum aml_status
        boolean two_fa_enabled
        varchar two_fa_secret
        user_status_enum status "active/suspended/banned"
        timestamptz created_at
        timestamptz updated_at
        timestamptz last_login_at
        inet last_login_ip
        timestamptz deleted_at "Soft delete"
    }
    
    STAFF_USERS {
        uuid staff_id PK
        user_type_enum staff_type "admin/compliance/system"
        varchar email UK
        varchar username UK
        varchar password_hash
        varchar first_name
        varchar last_name
        varchar role "super_admin/admin/compliance_officer"
        jsonb permissions "Granular permissions"
        boolean two_fa_enabled "Mandatory TRUE"
        varchar two_fa_secret
        boolean two_fa_setup_completed
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
        timestamptz last_login_at
        uuid created_by FK "Self-reference"
    }
    
    KYC_DOCUMENTS {
        uuid document_id PK
        uuid user_id FK
        document_type_enum document_type
        varchar file_url "S3/MinIO"
        varchar file_hash "SHA-256"
        integer file_size_bytes
        varchar mime_type
        verification_status_enum verification_status
        uuid verified_by FK "Staff"
        timestamptz verified_at
        text rejection_reason
        varchar external_verification_id "Veriff/Onfido"
        jsonb extracted_data "Parsed info"
        date expiry_date
        timestamptz created_at
        timestamptz updated_at
    }
    
    USER_WALLETS {
        uuid wallet_id PK
        uuid user_id FK
        varchar crypto_type "BTC/ETH/USDT"
        numeric available_balance "18 decimals"
        numeric locked_balance "18 decimals"
        varchar deposit_address UK
        varchar deposit_address_tag "XRP/XLM"
        timestamptz created_at
        timestamptz updated_at
    }
    
    FIAT_ACCOUNTS {
        uuid account_id PK
        uuid user_id FK
        varchar currency "TRY (ISO 4217)"
        numeric available_balance "2 decimals"
        numeric locked_balance "2 decimals"
        varchar virtual_iban UK "User-specific"
        varchar iban_provider "Papara/Moka"
        timestamptz created_at
        timestamptz updated_at
    }
    
    BANK_ACCOUNTS {
        uuid bank_account_id PK
        uuid user_id FK
        varchar iban "Turkish format"
        varchar bank_name
        varchar bank_code
        varchar branch_name
        varchar account_holder_name
        boolean is_verified
        timestamptz verified_at
        varchar verification_method
        boolean is_default
        varchar status "active/suspended/deleted"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }
```

---

## 3. Detailed ER Diagram - Trading Domain

```mermaid
erDiagram
    TRADING_PAIRS ||--o{ ORDERS : "market for"
    TRADING_PAIRS ||--o{ TRADES : "executed on"
    
    USERS ||--o{ ORDERS : "places"
    ORDERS ||--o{ TRADES : "buy side"
    ORDERS ||--o{ TRADES : "sell side"
    
    USERS ||--o{ TRADES : "buyer"
    USERS ||--o{ TRADES : "seller"
    
    STAFF_USERS ||--o{ ORDERS : "cancels (cancelled_by)"
    
    TRADING_PAIRS {
        serial trading_pair_id PK
        varchar symbol UK "BTC_TRY"
        varchar base_currency "BTC/ETH/USDT"
        varchar quote_currency "TRY"
        boolean is_active
        boolean is_trading_enabled
        boolean is_deposit_enabled
        boolean is_withdrawal_enabled
        numeric min_order_amount
        numeric max_order_amount
        integer price_precision "Decimal places"
        integer amount_precision "Decimal places"
        numeric maker_fee_percent "0.1%"
        numeric taker_fee_percent "0.2%"
        numeric daily_withdrawal_limit
        numeric monthly_withdrawal_limit
        timestamptz created_at
        timestamptz updated_at
    }
    
    ORDERS {
        uuid order_id PK
        uuid user_id FK
        integer trading_pair_id FK
        order_type_enum order_type "market/limit"
        order_side_enum side "buy/sell"
        numeric price "NULL for market"
        numeric quantity
        numeric filled_quantity
        numeric total_value "price * quantity"
        numeric average_filled_price "Weighted avg"
        numeric fee_amount
        varchar fee_currency
        order_status_enum status "open/filled/cancelled"
        timestamptz created_at
        timestamptz updated_at
        timestamptz filled_at
        timestamptz cancelled_at
        text cancellation_reason
        uuid cancelled_by FK "Staff (optional)"
    }
    
    TRADES {
        uuid trade_id PK
        integer trading_pair_id FK
        uuid buy_order_id FK
        uuid sell_order_id FK
        uuid buyer_id FK
        uuid seller_id FK
        numeric price
        numeric quantity
        numeric total_value "price * quantity"
        numeric buyer_fee
        numeric seller_fee
        timestamptz executed_at
        timestamptz settled_at
        boolean is_settled
    }
```

---

## 4. Detailed ER Diagram - Ledger & Balance Domain

```mermaid
erDiagram
    USERS ||--o{ LEDGER_ENTRIES : "balance movements"
    CUSTODY_WALLETS ||--o{ LEDGER_ENTRIES : "counterparty (custody)"
    USERS ||--o{ LEDGER_ENTRIES : "counterparty (user)"
    
    ORDERS ||--o{ LEDGER_ENTRIES : "references"
    TRADES ||--o{ LEDGER_ENTRIES : "references"
    TRANSACTIONS ||--o{ LEDGER_ENTRIES : "references"
    FIAT_TRANSACTIONS ||--o{ LEDGER_ENTRIES : "references"
    
    LEDGER_ENTRIES {
        bigserial entry_id PK "Auto-increment"
        uuid user_id FK "NULL for platform"
        asset_type_enum asset_type "crypto/fiat"
        varchar currency "BTC/ETH/TRY"
        numeric amount "18 decimals"
        ledger_direction_enum direction "debit/credit"
        balance_bucket_enum balance_bucket "available/locked/fee/bonus"
        numeric balance_after "Running balance"
        uuid counterparty_user_id FK "Internal transfer"
        uuid counterparty_custody_id FK "Platform transfer"
        varchar account_ref "Flexible reference"
        ledger_entry_type_enum entry_type "order/trade/deposit..."
        uuid reference_id "FK to various tables"
        text description
        jsonb metadata
        timestamptz created_at
        varchar idempotency_key UK "Prevent duplicates"
    }
    
    CUSTODY_WALLETS {
        uuid custody_wallet_id PK
        varchar wallet_type "hot/cold/fee/operational"
        varchar crypto_type "BTC/ETH/USDT"
        numeric total_balance "Aggregated (snapshot)"
        varchar address UK
        varchar address_tag
        boolean is_multisig
        jsonb multisig_config "3-of-5 config"
        varchar hsm_key_id "HSM reference"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
        timestamptz last_rebalanced_at
    }
```

---

## 5. Detailed ER Diagram - Transactions Domain

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : "initiates"
    USER_WALLETS ||--o{ TRANSACTIONS : "affects"
    STAFF_USERS ||--o{ TRANSACTIONS : "approves (approved_by)"
    
    USERS ||--o{ FIAT_TRANSACTIONS : "initiates"
    FIAT_ACCOUNTS ||--o{ FIAT_TRANSACTIONS : "affects"
    BANK_ACCOUNTS ||--o{ FIAT_TRANSACTIONS : "destination (withdrawal)"
    STAFF_USERS ||--o{ FIAT_TRANSACTIONS : "approves (approved_by)"
    
    TRANSACTIONS {
        uuid transaction_id PK
        uuid user_id FK
        uuid wallet_id FK
        transaction_type_enum tx_type "deposit/withdrawal"
        varchar crypto_type "BTC/ETH/USDT"
        numeric amount
        numeric fee
        numeric net_amount "amount - fee"
        varchar from_address
        varchar to_address
        varchar blockchain_tx_hash UK "Blockchain ref"
        varchar blockchain "bitcoin/ethereum/tron"
        integer confirmations "Current count"
        integer required_confirmations "Target"
        bigint block_number
        transaction_status_enum status "pending/confirmed/completed"
        boolean requires_approval
        uuid approved_by FK "Staff"
        timestamptz approved_at
        text rejection_reason
        timestamptz created_at
        timestamptz updated_at
        timestamptz completed_at
    }
    
    FIAT_TRANSACTIONS {
        uuid fiat_tx_id PK
        uuid user_id FK
        uuid fiat_account_id FK
        uuid bank_account_id FK "For withdrawals"
        transaction_type_enum tx_type "deposit/withdrawal"
        numeric amount
        numeric fee
        numeric net_amount
        varchar currency "TRY"
        varchar bank_reference_number
        varchar bank_name
        varchar sender_iban "For deposits"
        varchar sender_name "For deposits"
        transaction_status_enum status "pending/completed"
        boolean requires_approval
        uuid approved_by FK "Staff"
        timestamptz approved_at
        text rejection_reason
        timestamptz created_at
        timestamptz updated_at
        timestamptz completed_at
    }
```

---

## 6. Detailed ER Diagram - Compliance Domain

```mermaid
erDiagram
    USERS ||--o{ COMPLIANCE_CASES : "subject of"
    STAFF_USERS ||--o{ COMPLIANCE_CASES : "assigned to"
    STAFF_USERS ||--o{ COMPLIANCE_CASES : "resolves (resolved_by)"
    
    ORDERS ||--o{ COMPLIANCE_CASES : "related (optional)"
    TRANSACTIONS ||--o{ COMPLIANCE_CASES : "related (optional)"
    FIAT_TRANSACTIONS ||--o{ COMPLIANCE_CASES : "related (optional)"
    
    COMPLIANCE_CASES {
        uuid case_id PK
        uuid user_id FK
        compliance_case_type_enum case_type "suspicious_transaction/velocity_breach..."
        risk_level_enum severity "low/medium/high/critical"
        varchar title
        text description
        uuid related_order_id FK "Optional"
        uuid related_transaction_id FK "Optional"
        uuid related_fiat_tx_id FK "Optional"
        compliance_case_status_enum status "open/investigating/resolved"
        uuid assigned_to FK "Staff"
        timestamptz assigned_at
        text resolution
        uuid resolved_by FK "Staff"
        timestamptz resolved_at
        boolean requires_masak_report
        varchar masak_report_id
        timestamptz masak_reported_at
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 7. Detailed ER Diagram - Config & Settings Domain

```mermaid
erDiagram
    CONFIG_FEE_PROFILES ||--o{ CONFIG_USER_FEE_PROFILES : "assigned via"
    CONFIG_LIMIT_PROFILES ||--o{ CONFIG_USER_LIMIT_PROFILES : "assigned via"
    
    USERS ||--o{ CONFIG_USER_FEE_PROFILES : "has"
    USERS ||--o{ CONFIG_USER_LIMIT_PROFILES : "has"
    
    TRADING_PAIRS ||--o{ CONFIG_FEE_PROFILES : "default for"
    
    STAFF_USERS ||--o{ CONFIG_USER_FEE_PROFILES : "assigns (assigned_by)"
    STAFF_USERS ||--o{ CONFIG_USER_LIMIT_PROFILES : "assigns (assigned_by)"
    STAFF_USERS ||--o{ CONFIG_SYSTEM_PARAMETERS : "updates (updated_by)"
    
    CONFIG_FEE_PROFILES {
        serial profile_id PK
        varchar profile_name UK
        integer trading_pair_id FK "NULL = applies to all"
        numeric maker_fee_percent
        numeric taker_fee_percent
        numeric min_30day_volume "Tier qualification"
        boolean is_active
        timestamptz created_at
    }
    
    CONFIG_LIMIT_PROFILES {
        serial profile_id PK
        varchar profile_name UK
        smallint kyc_level_required
        numeric daily_withdrawal_limit_crypto
        numeric daily_withdrawal_limit_fiat
        numeric daily_deposit_limit_fiat
        numeric monthly_withdrawal_limit_crypto
        numeric monthly_withdrawal_limit_fiat
        boolean is_active
        timestamptz created_at
    }
    
    CONFIG_USER_FEE_PROFILES {
        uuid mapping_id PK
        uuid user_id FK
        integer profile_id FK
        timestamptz valid_from
        timestamptz valid_to "NULL = indefinite"
        uuid assigned_by FK "Staff"
        text assignment_reason
        timestamptz created_at
    }
    
    CONFIG_USER_LIMIT_PROFILES {
        uuid mapping_id PK
        uuid user_id FK
        integer profile_id FK
        timestamptz valid_from
        timestamptz valid_to "NULL = indefinite"
        uuid assigned_by FK "Staff"
        text assignment_reason
        timestamptz created_at
    }
    
    CONFIG_SYSTEM_PARAMETERS {
        varchar param_key PK
        text param_value
        varchar param_type "string/number/boolean/json"
        text description
        timestamptz updated_at
        uuid updated_by FK "Staff"
    }
```

---

## 8. Detailed ER Diagram - Audit Domain

```mermaid
erDiagram
    USERS ||--o{ AUDIT_LOGS : "actor (users)"
    STAFF_USERS ||--o{ AUDIT_LOGS : "actor (staff)"
    
    USERS ||--o{ AUDIT_LOGS : "resource (subject)"
    ORDERS ||--o{ AUDIT_LOGS : "resource (subject)"
    TRANSACTIONS ||--o{ AUDIT_LOGS : "resource (subject)"
    
    AUDIT_LOGS {
        bigserial log_id PK
        uuid actor_id FK "User or Staff"
        user_type_enum actor_type "customer/admin/compliance/system"
        inet actor_ip
        varchar action "user.login/order.create..."
        varchar resource_type "user/order/transaction/wallet"
        uuid resource_id "FK to various tables"
        text description
        jsonb before_state "Pre-change state"
        jsonb after_state "Post-change state"
        varchar status "success/failure"
        text error_message
        text user_agent
        uuid request_id "For tracing"
        timestamptz created_at
    }
```

---

## 9. Schema Relationships Summary

### Cardinality Legend:
- `||--o{` : One-to-Many (1:N)
- `||--||` : One-to-One (1:1)
- `}o--o{` : Many-to-Many (N:M)
- `||--o|` : One-to-Zero-or-One (1:0..1)

### Key Relationships:

**Users Domain:**
- 1 User → N Wallets (crypto)
- 1 User → N Fiat Accounts
- 1 User → N Bank Accounts
- 1 User → N KYC Documents
- 1 Staff → N KYC Documents (verified_by)

**Trading Domain:**
- 1 User → N Orders
- 1 Trading Pair → N Orders
- 1 Order → N Trades (as buyer or seller)
- 1 Trade → 2 Orders (buy & sell)
- 1 Trade → 2 Users (buyer & seller)

**Ledger Domain:**
- 1 User → N Ledger Entries
- 1 Custody Wallet → N Ledger Entries (counterparty)
- 1 Order/Trade/Transaction → N Ledger Entries (reference)

**Transactions Domain:**
- 1 User → N Crypto Transactions
- 1 User → N Fiat Transactions
- 1 Bank Account → N Fiat Transactions (withdrawals)
- 1 Staff → N Transactions (approvals)

**Compliance Domain:**
- 1 User → N Compliance Cases
- 1 Staff → N Compliance Cases (assigned/resolved)
- 1 Compliance Case → 0..1 Order/Transaction (related)

**Config Domain:**
- 1 Fee Profile → N User Mappings (N:M through mapping table)
- 1 Limit Profile → N User Mappings (N:M through mapping table)
- 1 Staff → N Config Updates

**Audit Domain:**
- 1 User/Staff → N Audit Logs (actor)
- 1 Entity → N Audit Logs (resource)

---

## 10. Partitioning Strategy Visualization

```mermaid
graph TB
    subgraph "ORDERS Table - Quarterly Partitions"
        ORDERS[orders - parent]
        ORDERS --> ORDERS_2025_Q1[orders_2025_q1<br/>2025-01-01 to 2025-04-01]
        ORDERS --> ORDERS_2025_Q2[orders_2025_q2<br/>2025-04-01 to 2025-07-01]
        ORDERS --> ORDERS_2025_Q3[orders_2025_q3<br/>2025-07-01 to 2025-10-01]
        ORDERS --> ORDERS_2025_Q4[orders_2025_q4<br/>2025-10-01 to 2026-01-01]
    end
    
    subgraph "TRADES Table - Monthly Partitions"
        TRADES[trades - parent]
        TRADES --> TRADES_2025_01[trades_2025_01]
        TRADES --> TRADES_2025_02[trades_2025_02]
        TRADES --> TRADES_2025_03[trades_2025_03]
        TRADES --> TRADES_DOTS[...]
        TRADES --> TRADES_2025_12[trades_2025_12]
    end
    
    subgraph "LEDGER_ENTRIES Table - Monthly Partitions"
        LEDGER[ledger_entries - parent]
        LEDGER --> LEDGER_2025_01[ledger_entries_2025_01]
        LEDGER --> LEDGER_2025_02[ledger_entries_2025_02]
        LEDGER --> LEDGER_DOTS[...]
        LEDGER --> LEDGER_2025_12[ledger_entries_2025_12]
    end
    
    subgraph "AUDIT_LOGS Table - Monthly Partitions"
        AUDIT[audit.audit_logs - parent]
        AUDIT --> AUDIT_2025_01[audit_logs_2025_01]
        AUDIT --> AUDIT_2025_02[audit_logs_2025_02]
        AUDIT --> AUDIT_DOTS[...]
        AUDIT --> AUDIT_2025_12[audit_logs_2025_12]
    end
    
    style ORDERS fill:#e1f5ff
    style TRADES fill:#fff4e1
    style LEDGER fill:#e8f5e9
    style AUDIT fill:#fce4ec
```

---

## 11. Data Flow Diagram - Order Placement & Settlement

```mermaid
sequenceDiagram
    participant User
    participant API
    participant OrderService
    participant MatchingEngine
    participant LedgerService
    participant WalletService
    
    User->>API: Place Limit Order (BUY BTC @ 50000 TRY)
    API->>OrderService: Validate & Create Order
    
    OrderService->>WalletService: Check Balance (SELECT FOR UPDATE)
    WalletService-->>OrderService: Balance OK
    
    OrderService->>WalletService: Lock Balance (available → locked)
    OrderService->>LedgerService: Create Ledger Entry (credit, locked)
    LedgerService-->>OrderService: Entry Created
    
    OrderService->>MatchingEngine: Submit Order
    MatchingEngine-->>OrderService: Order Accepted
    OrderService-->>API: Order Created (order_id)
    API-->>User: Success
    
    Note over MatchingEngine: Order Book Matching...
    
    MatchingEngine->>OrderService: Match Found!
    OrderService->>LedgerService: Create Trade Entries (buyer & seller)
    OrderService->>WalletService: Update Balances (unlock & transfer)
    
    LedgerService-->>OrderService: Settlement Complete
    OrderService-->>MatchingEngine: Trade Confirmed
    
    Note over User: User sees filled order & updated balance
```

---

## 12. Balance Reconciliation Flow

```mermaid
graph TB
    subgraph "Source of Truth"
        LEDGER[Ledger Entries<br/>Double-Entry Bookkeeping]
    end
    
    subgraph "Snapshots"
        USER_WALLETS[user_wallets<br/>available + locked]
        FIAT_ACCOUNTS[fiat_accounts<br/>available + locked]
        CUSTODY[custody_wallets<br/>total_balance]
    end
    
    subgraph "Reconciliation"
        DAILY[Daily Job<br/>02:00 UTC]
        COMPARE[Compare Ledger Sum vs Wallet Balance]
        ALERT[Generate Alerts<br/>if discrepancy > 0.00000001]
    end
    
    LEDGER -->|SUM(debit - credit)| COMPARE
    USER_WALLETS -->|available + locked| COMPARE
    FIAT_ACCOUNTS -->|available + locked| COMPARE
    CUSTODY -->|total_balance| COMPARE
    
    DAILY --> COMPARE
    COMPARE --> ALERT
    
    ALERT -->|Log| AUDIT[Audit Logs]
    ALERT -->|Notify| COMPLIANCE[Compliance Team]
    
    style LEDGER fill:#4caf50,color:#fff
    style USER_WALLETS fill:#ff9800
    style FIAT_ACCOUNTS fill:#ff9800
    style CUSTODY fill:#ff9800
    style ALERT fill:#f44336,color:#fff
```

---

## 13. Indexes Strategy Visualization

```mermaid
graph TB
    subgraph "users table"
        U1[Primary: user_id]
        U2[Index: email WHERE deleted_at IS NULL]
        U3[Index: phone WHERE deleted_at IS NULL]
        U4[Index: kyc_status]
        U5[Index: risk_level]
        U6[Index: created_at DESC]
    end
    
    subgraph "orders table"
        O1[Primary: order_id]
        O2[Index: user_id, created_at DESC]
        O3[Index: trading_pair_id]
        O4[Composite: trading_pair, side, status, price, created_at<br/>WHERE status IN open, partially_filled]
    end
    
    subgraph "ledger_entries table"
        L1[Primary: entry_id]
        L2[Index: user_id, created_at DESC]
        L3[Index: currency, created_at DESC]
        L4[Index: reference_id]
        L5[Unique: idempotency_key]
    end
    
    subgraph "trades table"
        T1[Primary: trade_id]
        T2[Index: trading_pair_id, executed_at DESC]
        T3[Index: buyer_id, executed_at DESC]
        T4[Index: seller_id, executed_at DESC]
        T5[Index: buy_order_id]
        T6[Index: sell_order_id]
    end
    
    style O4 fill:#4caf50,color:#fff
    style L2 fill:#4caf50,color:#fff
    style T2 fill:#4caf50,color:#fff
```

---

## 14. ENUM Types Hierarchy

```mermaid
graph TB
    subgraph "User & Auth ENUMs"
        E1[user_type_enum<br/>customer, admin, compliance, system, api_user]
        E2[kyc_status_enum<br/>pending, submitted, in_review, approved, rejected, resubmit_required]
        E3[risk_level_enum<br/>low, medium, high, critical]
        E4[aml_status_enum<br/>clear, flagged, under_review, blocked]
        E5[user_status_enum<br/>active, suspended, banned, deleted]
    end
    
    subgraph "Document ENUMs"
        D1[document_type_enum<br/>national_id_front, national_id_back, passport, drivers_license, selfie, address_proof, tax_document]
        D2[verification_status_enum<br/>pending, submitted, verified, rejected, expired]
    end
    
    subgraph "Trading ENUMs"
        T1[order_type_enum<br/>market, limit, stop_loss, stop_limit, oco]
        T2[order_side_enum<br/>buy, sell]
        T3[order_status_enum<br/>pending, open, partially_filled, filled, cancelled, rejected, expired]
    end
    
    subgraph "Transaction ENUMs"
        TX1[transaction_type_enum<br/>deposit, withdrawal, fee, rebate, internal_transfer]
        TX2[transaction_status_enum<br/>pending, confirming, confirmed, completed, failed, cancelled]
    end
    
    subgraph "Ledger ENUMs"
        L1[ledger_entry_type_enum<br/>order, trade, deposit, withdrawal, fee, rebate, adjustment, settlement, internal_transfer]
        L2[ledger_direction_enum<br/>debit, credit]
        L3[balance_bucket_enum<br/>available, locked, fee, bonus, reserved]
        L4[asset_type_enum<br/>crypto, fiat]
    end
    
    subgraph "Compliance ENUMs"
        C1[compliance_case_type_enum<br/>suspicious_transaction, velocity_breach, large_transaction, pep_detected, sanctions_match, unusual_pattern, manual_review]
        C2[compliance_case_status_enum<br/>open, investigating, escalated, resolved, false_positive]
    end
```

---

## 15. Complete Schema Visualization (All Tables)

```mermaid
graph TB
    subgraph "Core Domain"
        USERS[users<br/>15 columns<br/>Partitioned: No]
        STAFF[staff_users<br/>13 columns<br/>Partitioned: No]
        USER_WALLETS[user_wallets<br/>8 columns<br/>Partitioned: No]
        CUSTODY_WALLETS[custody_wallets<br/>13 columns<br/>Partitioned: No]
        FIAT_ACCOUNTS[fiat_accounts<br/>8 columns<br/>Partitioned: No]
        BANK_ACCOUNTS[bank_accounts<br/>12 columns<br/>Partitioned: No]
        KYC_DOCS[kyc_documents<br/>14 columns<br/>Partitioned: No]
    end
    
    subgraph "Trading Domain"
        TRADING_PAIRS[trading_pairs<br/>16 columns<br/>Partitioned: No]
        ORDERS[orders<br/>16 columns<br/>Partitioned: Yes Quarterly]
        TRADES[trades<br/>11 columns<br/>Partitioned: Yes Monthly]
    end
    
    subgraph "Ledger Domain"
        LEDGER[ledger_entries<br/>17 columns<br/>Partitioned: Yes Monthly<br/>IMMUTABLE]
    end
    
    subgraph "Transaction Domain"
        TRANSACTIONS[transactions<br/>21 columns<br/>Partitioned: No]
        FIAT_TXS[fiat_transactions<br/>17 columns<br/>Partitioned: No]
    end
    
    subgraph "Compliance Domain"
        COMPLIANCE[compliance_cases<br/>15 columns<br/>Partitioned: No]
    end
    
    subgraph "Config Domain"
        FEE_PROF[fee_profiles<br/>8 columns]
        LIMIT_PROF[limit_profiles<br/>9 columns]
        USER_FEE[user_fee_profiles<br/>7 columns]
        USER_LIMIT[user_limit_profiles<br/>7 columns]
        SYS_PARAMS[system_parameters<br/>5 columns]
    end
    
    subgraph "Audit Domain"
        AUDIT[audit.audit_logs<br/>14 columns<br/>Partitioned: Yes Monthly<br/>IMMUTABLE]
    end
    
    USERS --> USER_WALLETS
    USERS --> FIAT_ACCOUNTS
    USERS --> BANK_ACCOUNTS
    USERS --> KYC_DOCS
    USERS --> ORDERS
    USERS --> TRADES
    USERS --> LEDGER
    USERS --> TRANSACTIONS
    USERS --> FIAT_TXS
    USERS --> COMPLIANCE
    USERS --> USER_FEE
    USERS --> USER_LIMIT
    
    STAFF --> KYC_DOCS
    STAFF --> ORDERS
    STAFF --> TRANSACTIONS
    STAFF --> FIAT_TXS
    STAFF --> COMPLIANCE
    STAFF --> SYS_PARAMS
    
    TRADING_PAIRS --> ORDERS
    TRADING_PAIRS --> TRADES
    TRADING_PAIRS --> FEE_PROF
    
    ORDERS --> TRADES
    ORDERS --> LEDGER
    
    TRADES --> LEDGER
    
    TRANSACTIONS --> LEDGER
    FIAT_TXS --> LEDGER
    
    CUSTODY_WALLETS --> LEDGER
    
    FEE_PROF --> USER_FEE
    LIMIT_PROF --> USER_LIMIT
    
    style LEDGER fill:#4caf50,color:#fff
    style AUDIT fill:#4caf50,color:#fff
    style ORDERS fill:#2196f3,color:#fff
    style TRADES fill:#2196f3,color:#fff
```

---

## 16. Table Statistics & Size Estimates

| Table | Estimated Rows (Year 1) | Partition Strategy | Index Count | Notes |
|-------|-------------------------|-------------------|-------------|-------|
| **users** | 100,000 | No | 6 | Customer accounts |
| **staff_users** | 50 | No | 4 | Internal staff |
| **user_wallets** | 300,000 | No | 3 | 3 cryptos per user avg |
| **custody_wallets** | 20 | No | 3 | Platform wallets |
| **fiat_accounts** | 100,000 | No | 2 | 1 per user (TRY) |
| **bank_accounts** | 150,000 | No | 3 | 1.5 per user avg |
| **kyc_documents** | 400,000 | No | 4 | 4 docs per user avg |
| **trading_pairs** | 10 | No | 2 | BTC/ETH/USDT pairs |
| **orders** | 50M | Quarterly | 4 | High volume |
| **trades** | 10M | Monthly | 6 | Matched orders |
| **ledger_entries** | 100M | Monthly | 5 | **Source of truth** |
| **transactions** | 5M | No | 6 | Crypto dep/with |
| **fiat_transactions** | 10M | No | 6 | TRY dep/with |
| **compliance_cases** | 10,000 | No | 5 | Flagged cases |
| **audit.audit_logs** | 500M | Monthly | 4 | All actions logged |

**Total estimated DB size after 1 year:** ~500GB - 1TB

---

## Next Steps

✅ **ER Diagrams hazır!**

**Bunları kullanarak:**
1. **Database documentation** - Confluence/Wiki için export
2. **Developer onboarding** - Yeni geliştiriciler için referans
3. **Architecture review** - Banka/kurum ile review toplantıları
4. **API design** - ER'dan hareketle endpoint'leri tasarla

**Sırada ne var?**
- API Specification
- WebSocket Protocol
- Matching Engine Logic
- Sample Data & Testing

**Hangisiyle devam edelim?**
