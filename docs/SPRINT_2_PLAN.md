# Sprint 2 Plan - Wallet Management
## MyCrypto Platform - Cryptocurrency Exchange MVP

**Version:** 1.0
**Created:** 2025-11-20
**Sprint Duration:** 10 days (2 weeks)
**Story Points:** 36
**Tech Lead:** Orchestrator Agent

---

## Executive Summary

Sprint 2 focuses on **Epic 2: Wallet Management** which enables users to view balances, deposit/withdraw TRY (fiat), and deposit/withdraw crypto (BTC/ETH/USDT). This is the foundation for the trading functionality in Sprint 3.

---

## 1. Sprint Overview

### Sprint Goal
"Enable KYC-approved users to view wallet balances, deposit/withdraw TRY via bank transfer, and deposit/withdraw cryptocurrency (BTC/ETH/USDT)"

### Sprint Scope

| Story ID | Story Name | Story Points | Priority |
|----------|------------|--------------|----------|
| 2.1 | View Wallet Balances | 5 | P0 |
| 2.2 | TRY Deposit (Bank Transfer) | 13 | P0 |
| 2.3 | TRY Withdrawal (Bank Transfer) | 13 | P0 |
| 2.6 | Transaction History | 5 | P1 |

**Total Story Points:** 36

### Sprint Duration
- **Start Date:** Day 1
- **End Date:** Day 10
- **Working Days:** 10 days

### Team Capacity
- Backend Agent: 100% (8h/day)
- Frontend Agent: 100% (8h/day)
- DevOps Agent: 100% (8h/day)
- Database Agent: 100% (8h/day)
- QA Agent: 100% (8h/day)

---

## 2. User Stories Breakdown

### Story 2.1: View Wallet Balances (5 points)

**As a** KYC-approved user
**I want to** see my wallet balances
**So that** I know how much I have

#### Acceptance Criteria
- [ ] Dashboard shows all asset balances: BTC, ETH, USDT, TRY
- [ ] Each asset shows: Available, Locked (in orders), Total
- [ ] Balances update in real-time (WebSocket)
- [ ] TRY balance in currency format (e.g., "1.234,56 TL")
- [ ] Crypto balances in 8 decimal places (e.g., "0.12345678 BTC")
- [ ] USD equivalent shown for each asset (live pricing)
- [ ] Total portfolio value in TRY and USD

#### Technical Notes
- API: `GET /api/v1/wallet/balances`
- WebSocket: `wallet.balance.updated`
- Cache: Redis (5 second TTL)

---

### Story 2.2: TRY Deposit (Bank Transfer) (13 points)

**As a** user
**I want to** deposit TRY via bank transfer
**So that** I can buy crypto

#### Acceptance Criteria
- [ ] User clicks "TRY Yatir"
- [ ] System shows unique IBAN (per user, virtual IBAN)
- [ ] User sees instruction: "Transfer aciklamasina '{USER_ID}' yaziniz"
- [ ] Minimum deposit: 100 TRY
- [ ] Maximum deposit: 50,000 TRY (LEVEL_1 daily limit)
- [ ] Bank transfer detected within 30 minutes (bank API polling)
- [ ] Balance credited after detection + admin approval
- [ ] Email + SMS notification on successful deposit
- [ ] Transaction history shows deposit with status: Pending -> Approved

#### Technical Notes
- Banking Integration: TEB Bank API (or Akbank)
- Virtual IBAN provider: ibanPro or bank's service
- Wallet Service API: `POST /api/v1/wallet/deposit/try`

---

### Story 2.3: TRY Withdrawal (Bank Transfer) (13 points)

**As a** user
**I want to** withdraw TRY to my bank account
**So that** I can access my funds

#### Acceptance Criteria
- [ ] User enters: Amount, Bank Name, IBAN, Account Holder Name
- [ ] IBAN validation (TR format, 26 chars)
- [ ] Account holder name must match KYC name
- [ ] Minimum withdrawal: 100 TRY
- [ ] Maximum withdrawal: 50,000 TRY/day (LEVEL_1 limit)
- [ ] Fee: 5 TRY (flat fee)
- [ ] Withdrawal status: Pending -> Processing -> Completed / Failed
- [ ] Admin approval required for first withdrawal
- [ ] Auto-approval after first successful withdrawal
- [ ] Email + SMS notification on each status change
- [ ] 2FA code required to confirm withdrawal

#### Technical Notes
- Wallet Service API: `POST /api/v1/wallet/withdraw/try`
- Bank payout: TEB API `POST /transfer`
- Processing time: 1-3 business hours

---

### Story 2.6: Transaction History (5 points)

**As a** user
**I want to** view my transaction history
**So that** I can track all my deposits/withdrawals

#### Acceptance Criteria
- [ ] History shows: Date, Type (Deposit/Withdrawal), Asset, Amount, Fee, Status, TxID
- [ ] Filters: Asset (All/BTC/ETH/USDT/TRY), Type, Date Range, Status
- [ ] Pagination: 20 transactions per page
- [ ] Export to CSV (last 90 days)
- [ ] Pending transactions highlighted with spinner
- [ ] Clickable TxID opens blockchain explorer (BTC: blockchain.info, ETH: etherscan.io)

#### Technical Notes
- API: `GET /api/v1/wallet/transactions?page=1&limit=20`
- CSV export: `GET /api/v1/wallet/transactions/export`

---

## 3. Daily Task Allocation

### Day 1: Infrastructure & Schema Setup

| Agent | Task ID | Task Name | Hours | Priority |
|-------|---------|-----------|-------|----------|
| Database | DB-020 | Create wallet schema and tables | 4h | P0 |
| Database | DB-021 | Create fiat_accounts table | 2h | P0 |
| Database | DB-022 | Create transactions table | 2h | P0 |
| DevOps | DO-020 | Setup Wallet Service infrastructure | 6h | P0 |
| DevOps | DO-021 | Configure bank API mock service | 2h | P0 |
| Frontend | FE-020 | Research wallet UI patterns | 2h | P2 |
| Backend | BE-020 | Research bank API integration | 2h | P2 |
| QA | QA-020 | Create wallet test plan | 2h | P1 |

### Day 2: Core Wallet Service

| Agent | Task ID | Task Name | Hours | Priority | Depends On |
|-------|---------|-----------|-------|----------|------------|
| Backend | BE-021 | Implement Wallet Service base | 4h | P0 | DO-020, DB-020 |
| Backend | BE-022 | Create wallet balance endpoint | 4h | P0 | BE-021 |
| Frontend | FE-021 | Create wallet dashboard layout | 4h | P0 | - |
| Frontend | FE-022 | Implement balance display component | 4h | P0 | FE-021 |
| Database | DB-023 | Create ledger_entries table | 4h | P0 | DB-020 |
| DevOps | DO-022 | Setup WebSocket infrastructure | 4h | P0 | DO-020 |

### Day 3: Balance Display & Real-time Updates

| Agent | Task ID | Task Name | Hours | Priority | Depends On |
|-------|---------|-----------|-------|----------|------------|
| Backend | BE-023 | Implement WebSocket for balance updates | 4h | P0 | BE-022, DO-022 |
| Backend | BE-024 | Add Redis caching for balances | 2h | P1 | BE-022 |
| Frontend | FE-023 | Integrate WebSocket for live updates | 4h | P0 | FE-022, BE-023 |
| Frontend | FE-024 | Add portfolio value calculation | 2h | P1 | FE-022 |
| QA | QA-021 | Test balance display functionality | 4h | P0 | BE-022, FE-022 |
| DevOps | DO-023 | Setup price feed service | 4h | P1 | - |

### Day 4: TRY Deposit - Backend

| Agent | Task ID | Task Name | Hours | Priority | Depends On |
|-------|---------|-----------|-------|----------|------------|
| Backend | BE-025 | Create TRY deposit endpoint | 6h | P0 | BE-021 |
| Backend | BE-026 | Implement virtual IBAN generation | 2h | P0 | BE-025 |
| Database | DB-024 | Create bank_accounts table | 2h | P0 | - |
| Database | DB-025 | Create deposit_requests table | 2h | P0 | - |
| DevOps | DO-024 | Configure bank API integration | 4h | P0 | DO-021 |
| Frontend | FE-025 | Create deposit modal UI | 4h | P0 | - |

### Day 5: TRY Deposit - Frontend & Integration

| Agent | Task ID | Task Name | Hours | Priority | Depends On |
|-------|---------|-----------|-------|----------|------------|
| Frontend | FE-026 | Implement deposit flow UI | 4h | P0 | FE-025, BE-025 |
| Frontend | FE-027 | Add IBAN copy functionality | 2h | P1 | FE-026 |
| Backend | BE-027 | Implement bank callback handler | 4h | P0 | BE-025, DO-024 |
| Backend | BE-028 | Create admin deposit approval endpoint | 4h | P0 | BE-027 |
| QA | QA-022 | Test TRY deposit flow | 4h | P0 | BE-025, FE-026 |
| DevOps | DO-025 | Setup notification service for deposits | 4h | P1 | - |

### Day 6: TRY Withdrawal - Backend

| Agent | Task ID | Task Name | Hours | Priority | Depends On |
|-------|---------|-----------|-------|----------|------------|
| Backend | BE-029 | Create TRY withdrawal endpoint | 6h | P0 | BE-021 |
| Backend | BE-030 | Implement IBAN validation | 2h | P0 | BE-029 |
| Backend | BE-031 | Add 2FA verification for withdrawal | 2h | P0 | BE-029 |
| Database | DB-026 | Create withdrawal_requests table | 2h | P0 | - |
| Frontend | FE-028 | Create withdrawal modal UI | 4h | P0 | - |
| QA | QA-023 | Create withdrawal test cases | 2h | P1 | - |

### Day 7: TRY Withdrawal - Frontend & Integration

| Agent | Task ID | Task Name | Hours | Priority | Depends On |
|-------|---------|-----------|-------|----------|------------|
| Frontend | FE-029 | Implement withdrawal form | 4h | P0 | FE-028, BE-029 |
| Frontend | FE-030 | Add bank account management | 4h | P1 | FE-029 |
| Backend | BE-032 | Create bank payout service | 4h | P0 | BE-029 |
| Backend | BE-033 | Implement admin withdrawal approval | 4h | P0 | BE-032 |
| QA | QA-024 | Test TRY withdrawal flow | 4h | P0 | BE-029, FE-029 |
| DevOps | DO-026 | Configure withdrawal notifications | 2h | P1 | DO-025 |

### Day 8: Transaction History

| Agent | Task ID | Task Name | Hours | Priority | Depends On |
|-------|---------|-----------|-------|----------|------------|
| Backend | BE-034 | Create transaction history endpoint | 4h | P0 | BE-021 |
| Backend | BE-035 | Implement CSV export | 2h | P1 | BE-034 |
| Backend | BE-036 | Add transaction filtering | 2h | P1 | BE-034 |
| Frontend | FE-031 | Create transaction history page | 4h | P0 | BE-034 |
| Frontend | FE-032 | Implement filters and pagination | 4h | P1 | FE-031 |
| QA | QA-025 | Test transaction history | 4h | P0 | BE-034, FE-031 |

### Day 9: Integration Testing & Bug Fixes

| Agent | Task ID | Task Name | Hours | Priority | Depends On |
|-------|---------|-----------|-------|----------|------------|
| QA | QA-026 | E2E testing - complete wallet flow | 6h | P0 | All |
| QA | QA-027 | Security testing - wallet operations | 4h | P0 | All |
| Backend | BE-037 | Bug fixes and optimizations | 8h | P0 | QA-026 |
| Frontend | FE-033 | Bug fixes and UI polish | 8h | P0 | QA-026 |
| DevOps | DO-027 | Performance testing setup | 4h | P1 | All |
| Database | DB-027 | Query optimization | 4h | P1 | QA-026 |

### Day 10: Final Testing & Sprint Demo

| Agent | Task ID | Task Name | Hours | Priority | Depends On |
|-------|---------|-----------|-------|----------|------------|
| QA | QA-028 | Final regression testing | 4h | P0 | All |
| QA | QA-029 | UAT sign-off preparation | 2h | P0 | QA-028 |
| Backend | BE-038 | Documentation and API specs | 4h | P1 | All |
| Frontend | FE-034 | Documentation and storybook | 4h | P1 | All |
| DevOps | DO-028 | Staging deployment | 4h | P0 | All |
| DevOps | DO-029 | Monitoring dashboards setup | 4h | P1 | DO-028 |

---

## 4. Detailed Task Specifications

### Task Assignment: DB-020
**Agent:** Database
**Priority:** P0 (Blocking)
**Story:** 2.1 - View Wallet Balances
**Description:** Create the wallet schema and core tables for user wallets

**Acceptance Criteria:**
- [ ] user_wallets table created with fields: wallet_id (UUID), user_id, crypto_type, available_balance, locked_balance, deposit_address, created_at, updated_at
- [ ] Unique constraint on (user_id, crypto_type)
- [ ] Index on user_id for fast lookups
- [ ] Index on deposit_address for incoming transactions
- [ ] Migration script in /migrations/020_create_user_wallets.sql
- [ ] Rollback script tested
- [ ] Support for BTC, ETH, USDT, TRY asset types

**Dependencies:** None
**Estimated Hours:** 4 hours
**Deadline:** Day 1 EOD
**Handoff Notes:** Backend Agent will use this schema for BE-021

---

### Task Assignment: DB-021
**Agent:** Database
**Priority:** P0
**Story:** 2.2, 2.3 - TRY Deposit/Withdrawal
**Description:** Create fiat accounts table for TRY balances

**Acceptance Criteria:**
- [ ] fiat_accounts table created with fields: account_id (UUID), user_id, currency (TRY), available_balance, locked_balance, virtual_iban, created_at, updated_at
- [ ] Unique constraint on (user_id, currency)
- [ ] Unique constraint on virtual_iban
- [ ] Default currency = 'TRY'
- [ ] Check constraint: balances >= 0
- [ ] Migration script and rollback tested

**Dependencies:** DB-020
**Estimated Hours:** 2 hours
**Deadline:** Day 1 EOD
**Handoff Notes:** Used by BE-025 for deposit flow

---

### Task Assignment: DO-020
**Agent:** DevOps
**Priority:** P0 (Blocking)
**Story:** All Wallet Stories
**Description:** Setup Wallet Service infrastructure in Kubernetes

**Acceptance Criteria:**
- [ ] Wallet Service deployment.yaml created
- [ ] Service and ingress configured
- [ ] Environment variables configured (DB, Redis, RabbitMQ)
- [ ] Health check endpoints working
- [ ] CI/CD pipeline for wallet-service
- [ ] Horizontal Pod Autoscaler configured
- [ ] Resource limits defined (CPU, memory)

**Dependencies:** None
**Estimated Hours:** 6 hours
**Deadline:** Day 1 EOD
**Handoff Notes:** Backend Agent can deploy wallet-service after this

---

### Task Assignment: BE-021
**Agent:** Backend
**Priority:** P0
**Story:** All Wallet Stories
**Description:** Implement Wallet Service base with NestJS

**Acceptance Criteria:**
- [ ] NestJS project structure created in /services/wallet-service
- [ ] Database connection configured (TypeORM)
- [ ] Redis connection configured
- [ ] RabbitMQ connection configured
- [ ] Health check endpoint: GET /health
- [ ] User authentication middleware (JWT validation)
- [ ] Base error handling and logging
- [ ] OpenAPI documentation configured

**Dependencies:** DO-020, DB-020
**Estimated Hours:** 4 hours
**Deadline:** Day 2 PM
**Handoff Notes:** Foundation for all wallet endpoints

---

### Task Assignment: BE-022
**Agent:** Backend
**Priority:** P0
**Story:** 2.1 - View Wallet Balances
**Description:** Create wallet balance endpoint

**Acceptance Criteria:**
- [ ] GET /api/v1/wallet/balances endpoint
- [ ] Returns all user wallets (BTC, ETH, USDT, TRY)
- [ ] Each wallet includes: available, locked, total
- [ ] Calculates USD equivalent using price service
- [ ] Calculates total portfolio value in TRY
- [ ] Unit tests with 80% coverage
- [ ] OpenAPI spec updated
- [ ] Response format matches API design doc

**Dependencies:** BE-021
**Estimated Hours:** 4 hours
**Deadline:** Day 2 EOD
**Handoff Notes:** Frontend will integrate in FE-022

---

### Task Assignment: BE-025
**Agent:** Backend
**Priority:** P0
**Story:** 2.2 - TRY Deposit
**Description:** Create TRY deposit endpoint

**Acceptance Criteria:**
- [ ] POST /api/v1/wallet/deposit/try endpoint
- [ ] Returns user's virtual IBAN
- [ ] Validates minimum deposit (100 TRY)
- [ ] Validates daily limit (50,000 TRY)
- [ ] Creates deposit request record
- [ ] Generates unique reference code
- [ ] Unit tests with 80% coverage
- [ ] Integration test with mock bank API
- [ ] OpenAPI spec updated

**Dependencies:** BE-021, DB-021, DB-025
**Estimated Hours:** 6 hours
**Deadline:** Day 4 EOD
**Handoff Notes:** Frontend will call this in FE-026

---

### Task Assignment: BE-029
**Agent:** Backend
**Priority:** P0
**Story:** 2.3 - TRY Withdrawal
**Description:** Create TRY withdrawal endpoint

**Acceptance Criteria:**
- [ ] POST /api/v1/wallet/withdraw/try endpoint
- [ ] Request body: amount, bank_name, iban, account_holder_name, two_fa_code
- [ ] Validates IBAN format (TR26 digits)
- [ ] Validates account holder matches KYC name
- [ ] Validates minimum (100 TRY) and maximum (50,000 TRY/day)
- [ ] Validates 2FA code
- [ ] Deducts fee (5 TRY)
- [ ] Locks balance during processing
- [ ] Creates withdrawal request record
- [ ] Sends to admin approval queue
- [ ] Unit tests with 80% coverage
- [ ] OpenAPI spec updated

**Dependencies:** BE-021, DB-021, DB-026
**Estimated Hours:** 6 hours
**Deadline:** Day 6 EOD
**Handoff Notes:** Frontend will call this in FE-029

---

### Task Assignment: FE-021
**Agent:** Frontend
**Priority:** P0
**Story:** 2.1 - View Wallet Balances
**Description:** Create wallet dashboard layout

**Acceptance Criteria:**
- [ ] Wallet dashboard page created at /wallet
- [ ] Layout with balance cards for each asset
- [ ] Total portfolio value display
- [ ] Action buttons: Deposit, Withdraw for each asset
- [ ] Responsive design (mobile + desktop)
- [ ] Loading skeleton states
- [ ] Redux slice for wallet state
- [ ] Component tests

**Dependencies:** None
**Estimated Hours:** 4 hours
**Deadline:** Day 2 PM
**Handoff Notes:** Will be integrated with BE-022

---

### Task Assignment: FE-026
**Agent:** Frontend
**Priority:** P0
**Story:** 2.2 - TRY Deposit
**Description:** Implement deposit flow UI

**Acceptance Criteria:**
- [ ] Deposit modal with IBAN display
- [ ] Copy IBAN button with success feedback
- [ ] Reference code display with copy
- [ ] Bank transfer instructions in Turkish
- [ ] Minimum/maximum amount display
- [ ] Transaction history link
- [ ] Loading and error states
- [ ] Integration with BE-025

**Dependencies:** FE-025, BE-025
**Estimated Hours:** 4 hours
**Deadline:** Day 5 PM
**Handoff Notes:** QA will test in QA-022

---

### Task Assignment: FE-029
**Agent:** Frontend
**Priority:** P0
**Story:** 2.3 - TRY Withdrawal
**Description:** Implement withdrawal form

**Acceptance Criteria:**
- [ ] Withdrawal modal with form fields
- [ ] IBAN input with validation
- [ ] Bank name dropdown
- [ ] Account holder name (pre-filled from KYC)
- [ ] Amount input with available balance display
- [ ] Fee display (5 TRY)
- [ ] 2FA code input
- [ ] Confirmation modal before submission
- [ ] Success/error states
- [ ] Integration with BE-029

**Dependencies:** FE-028, BE-029
**Estimated Hours:** 4 hours
**Deadline:** Day 7 PM
**Handoff Notes:** QA will test in QA-024

---

### Task Assignment: QA-026
**Agent:** QA
**Priority:** P0
**Story:** All Wallet Stories
**Description:** E2E testing - complete wallet flow

**Acceptance Criteria:**
- [ ] Test complete deposit flow: request -> bank callback -> approval -> balance update
- [ ] Test complete withdrawal flow: request -> 2FA -> approval -> bank payout -> balance update
- [ ] Test balance display accuracy
- [ ] Test transaction history filtering and pagination
- [ ] Test edge cases: limits, insufficient balance, invalid IBAN
- [ ] Test concurrent transactions
- [ ] Test real-time balance updates via WebSocket
- [ ] Cypress E2E test suite
- [ ] Performance benchmarks recorded
- [ ] Bug reports created for all issues

**Dependencies:** All Day 1-8 tasks
**Estimated Hours:** 6 hours
**Deadline:** Day 9 EOD
**Handoff Notes:** Backend and Frontend will fix reported bugs

---

## 5. New Services & Infrastructure Required

### New Microservice: Wallet Service

**Technology Stack:**
- Runtime: Node.js 20 LTS
- Framework: NestJS 10
- Database: PostgreSQL 16
- Cache: Redis 7
- Message Queue: RabbitMQ

**Key Components:**
- Balance management module
- Deposit processing module
- Withdrawal processing module
- Transaction history module
- WebSocket gateway for real-time updates

### New Database Tables

| Table Name | Purpose | Key Fields |
|------------|---------|------------|
| user_wallets | Crypto balances per user | wallet_id, user_id, crypto_type, available_balance, locked_balance |
| fiat_accounts | TRY balances per user | account_id, user_id, currency, available_balance, virtual_iban |
| ledger_entries | Immutable transaction log | entry_id, user_id, currency, amount, direction, type |
| deposit_requests | Track deposit flow | request_id, user_id, amount, status, reference_code |
| withdrawal_requests | Track withdrawal flow | request_id, user_id, amount, iban, status, 2fa_verified |
| bank_accounts | User's saved bank accounts | account_id, user_id, iban, bank_name, account_holder |

### External Integrations

| Integration | Purpose | Provider |
|-------------|---------|----------|
| Bank API | TRY deposits/withdrawals | TEB Bank or Akbank |
| Virtual IBAN | Unique IBAN per user | ibanPro or bank service |
| SMS Gateway | Withdrawal notifications | Netgsm or Ileti Merkezi |
| Price Feed | USD/TRY conversion | CoinGecko API |

### Infrastructure Components

| Component | Purpose | Configuration |
|-----------|---------|---------------|
| WebSocket Gateway | Real-time balance updates | Kong WebSocket upgrade |
| Redis Cluster | Balance caching (5s TTL) | 3-node cluster |
| RabbitMQ Queue | Bank callback processing | wallet.deposit.callback |
| Prometheus Metrics | Wallet service monitoring | Custom metrics |
| Grafana Dashboard | Wallet operations dashboard | Deposit/withdrawal rates |

---

## 6. Risk Assessment

### High Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Bank API integration delays | Medium | High | Start with mock service; use virtual IBAN fallback |
| Virtual IBAN provider issues | Medium | High | Have backup provider; manual IBAN assignment fallback |
| Balance consistency issues | Low | Critical | Use ledger-based double-entry; regular reconciliation |
| 2FA integration problems | Low | Medium | Reuse Sprint 1 2FA code; thorough testing |

### Medium Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WebSocket performance | Medium | Medium | Load test early; implement connection pooling |
| Admin approval bottleneck | Medium | Medium | Auto-approval after first withdrawal; batch processing |
| CSV export performance | Low | Medium | Limit export to 90 days; async generation |

### Dependencies on External Teams

| Dependency | Owner | Deadline | Status |
|------------|-------|----------|--------|
| Bank API access credentials | Finance Team | Day 1 | Pending |
| Virtual IBAN contract | Legal Team | Day 1 | Pending |
| SMS provider setup | Operations | Day 5 | In Progress |
| Price feed API key | DevOps | Day 3 | Ready |

---

## 7. Definition of Done - Sprint 2

### Per Story

- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests >= 80% coverage
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] OpenAPI spec updated
- [ ] Security review passed (for financial operations)
- [ ] Performance tested (response < 500ms)
- [ ] Deployed to staging
- [ ] QA sign-off received

### Sprint Completion

- [ ] All 4 stories completed (36 points)
- [ ] Zero P0/P1 bugs
- [ ] Documentation updated
- [ ] Monitoring dashboards configured
- [ ] Alerting rules defined
- [ ] Sprint demo conducted
- [ ] Retrospective completed

---

## 8. Sprint Success Metrics

### Delivery Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Story Points Completed | 36 | Sum of completed stories |
| Sprint Velocity | >= 90% | Completed / Planned |
| Blocker Resolution Time | < 4 hours | Average time to unblock |
| Code Review Turnaround | < 24 hours | PR open to approval |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | >= 80% | Jest/Go coverage report |
| Bug Escape Rate | 0 P0 bugs | Bugs found after QA sign-off |
| API Response Time | < 500ms | P95 latency |
| Uptime | >= 99.9% | Monitoring alerts |

### Agent Utilization

| Agent | Expected Hours | Target Utilization |
|-------|---------------|-------------------|
| Backend | 80h | >= 85% |
| Frontend | 80h | >= 85% |
| DevOps | 80h | >= 80% |
| Database | 40h | >= 75% |
| QA | 60h | >= 80% |

---

## 9. Communication Plan

### Daily Standup (9:00 AM)

- Previous day completions
- Today's plan
- Blockers

### Evening Report (6:00 PM)

- Tasks completed
- Sprint burndown
- Risk updates

### Escalation Path

1. **Level 1:** Agent-to-Agent coordination (15 min)
2. **Level 2:** Tech Lead intervention (30 min)
3. **Level 3:** External team escalation (4 hours)

---

## 10. Technical Decisions

### Architecture Decisions

1. **Ledger-based Balances:** Use immutable ledger entries as source of truth for all balance calculations to ensure audit trail and consistency

2. **WebSocket for Real-time:** Use WebSocket gateway (Kong) for live balance updates instead of polling

3. **Redis Caching:** Cache balance calculations in Redis with 5-second TTL to reduce database load

4. **Virtual IBAN per User:** Each user gets unique IBAN for deposit tracking instead of shared account with reference codes

5. **Admin Approval Flow:** First withdrawal requires manual admin approval; subsequent withdrawals auto-approve if amount < threshold

### Security Decisions

1. **2FA for Withdrawals:** All TRY withdrawals require 2FA verification
2. **KYC Name Match:** Withdrawal account holder name must match KYC verified name
3. **Daily Limits:** Enforce 50,000 TRY daily limit at database level with triggers
4. **Audit Logging:** All balance changes logged to immutable audit table

---

## 11. Appendix

### API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/wallet/balances | Get all balances | JWT |
| GET | /api/v1/wallet/{asset}/balance | Get specific asset balance | JWT |
| POST | /api/v1/wallet/deposit/try | Initiate TRY deposit | JWT |
| POST | /api/v1/wallet/withdraw/try | Initiate TRY withdrawal | JWT + 2FA |
| GET | /api/v1/wallet/transactions | Get transaction history | JWT |
| GET | /api/v1/wallet/transactions/export | Export CSV | JWT |

### WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| wallet.balance.updated | Server -> Client | { asset, available, locked, total } |
| transaction.status.updated | Server -> Client | { tx_id, status, timestamp } |

### Environment Variables (Wallet Service)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/wallet

# Redis
REDIS_URL=redis://host:6379

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@host:5672

# Bank API
BANK_API_URL=https://api.bank.com
BANK_API_KEY=xxx
BANK_API_SECRET=xxx

# Virtual IBAN
IBAN_PROVIDER_URL=https://api.ibanpro.com
IBAN_PROVIDER_KEY=xxx

# JWT (shared with auth-service)
JWT_SECRET=xxx

# SMS
SMS_API_URL=https://api.netgsm.com
SMS_API_KEY=xxx
```

---

**Document Version:** 1.0
**Created By:** Tech Lead Agent
**Review Status:** Ready for Approval
**Next Update:** End of Sprint 2

---

## Sprint 2 Kickoff Checklist

- [ ] All agents have read this plan
- [ ] Dependencies confirmed (Bank API, Virtual IBAN)
- [ ] Dev environment ready from Sprint 1
- [ ] Sprint backlog imported to project management tool
- [ ] Day 1 tasks assigned
- [ ] Communication channels established
- [ ] Monitoring dashboards accessible

**Sprint 2 is ready to begin!**
