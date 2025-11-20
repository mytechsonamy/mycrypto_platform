# Sprint 2-6 Roadmap: Complete MVP
## 6-Sprint Journey to Launch (60 days)

**Version:** 1.0  
**Created:** 2025-11-19  
**Total Duration:** 60 working days (12 weeks)  
**Team:** 6 AI Agents

---

## 🎯 MVP Vision

Build a fully functional cryptocurrency exchange white-label platform enabling:
- User onboarding with KYC
- Fiat and crypto deposits/withdrawals
- Spot trading (limit & market orders)
- Wallet management
- Admin dashboard

**Target:** Production-ready MVP in 60 days

---

## 📊 Sprint-by-Sprint Overview

| Sprint | Duration | Theme | Story Points | Key Deliverables |
|--------|----------|-------|--------------|------------------|
| **Sprint 1** | Days 1-10 | Auth & Onboarding | 21 | Registration, Login, 2FA |
| **Sprint 2** | Days 11-20 | Profile & Wallets | 19 | Profile, Wallet creation, Fiat deposit |
| **Sprint 3** | Days 21-30 | Crypto Onboarding | 18 | Crypto deposit, Blockchain integration |
| **Sprint 4** | Days 31-40 | Trading Core | 22 | Order book, Limit/Market orders |
| **Sprint 5** | Days 41-50 | Trading UX | 20 | Charts, Portfolio, Order history |
| **Sprint 6** | Days 51-60 | Withdrawals & Admin | 19 | Fiat/Crypto withdrawal, Admin panel |

**Total:** 119 story points across 6 sprints

---

## 🗓️ Sprint 2: Profile & Wallets (Days 11-20)

### Theme
Enable users to complete their profile, verify KYC, and make fiat deposits.

### Story Points: 19

### User Stories

#### Story 2.1: User Profile Management (5 points)
**Goal:** Users can view and edit their profile information.

**Features:**
- View profile page (name, email, phone, address)
- Edit profile (with re-verification if email/phone changes)
- Upload profile photo (avatar)
- Delete account (with confirmation)

**Technical Tasks:**
- Backend: CRUD endpoints for profile (`/api/v1/users/me`)
- Database: Extend users table (first_name, last_name, phone, address, avatar_url)
- Frontend: Profile page with edit form
- File upload: S3/MinIO for avatars
- Tests: Profile CRUD, file upload

**Estimated Time:** 3 days

---

#### Story 2.2: KYC Verification (Tier 1) (8 points)
**Goal:** Users can submit identity documents for Tier 1 verification.

**Features:**
- KYC form (ID type: passport/driver's license, ID number, date of birth, nationality)
- Document upload (front + back of ID, selfie)
- KYC status tracking (pending → under review → verified/rejected)
- Email notifications on status change

**Technical Tasks:**
- Backend: KYC submission endpoint, status update endpoint
- Database: KYC submissions table, documents table
- Frontend: KYC form, document upload, status page
- Integration: Identity verification API (Sumsub/Onfido mock)
- Admin: Manual review UI (basic)
- Tests: KYC submission, status updates

**Estimated Time:** 5 days

---

#### Story 3.1: Wallet Creation (3 points)
**Goal:** System automatically creates TRY (fiat) and USDT wallets for new users.

**Features:**
- Auto-create TRY wallet on registration
- Auto-create USDT wallet on registration
- View wallet balances on dashboard
- Wallet transaction history (empty initially)

**Technical Tasks:**
- Backend: Wallet service (create, get balances, list transactions)
- Database: Wallets table, wallet_transactions table
- Frontend: Wallet dashboard (list wallets, show balances)
- Tests: Wallet creation, balance queries

**Estimated Time:** 2 days

---

#### Story 4.1: Deposit (Fiat - TRY) (3 points)
**Goal:** Users can deposit Turkish Lira (TRY) via bank transfer.

**Features:**
- Display bank account details (IBAN, recipient name, reference code)
- User transfers money manually to provided IBAN
- User submits deposit request (amount, transaction ID, receipt upload)
- Admin manually confirms deposit → balance updated

**Technical Tasks:**
- Backend: Deposit request endpoint, admin confirmation endpoint
- Database: Deposit requests table
- Frontend: Deposit page (show IBAN, upload receipt form), pending deposits list
- Admin: Deposit confirmation UI
- Tests: Deposit request, balance update

**Estimated Time:** 2 days

---

### Sprint 2 Daily Breakdown (High-Level)

**Days 11-13:** Story 2.1 (Profile Management)
- Database migration for profile fields
- Backend CRUD endpoints
- Frontend profile page
- File upload (S3/MinIO integration)
- Testing

**Days 14-18:** Story 2.2 (KYC Verification)
- KYC form design
- Document upload (front, back, selfie)
- Backend submission endpoint
- KYC status tracking
- Email notifications
- Basic admin review UI
- Testing

**Days 19-20:** Story 3.1 & 4.1 (Wallets & Fiat Deposit)
- Wallet service (create, read)
- Wallet dashboard UI
- Fiat deposit flow (IBAN display, receipt upload)
- Admin deposit confirmation
- Testing

**Sprint 2 End:**
- ✅ User profiles editable
- ✅ KYC Tier 1 working
- ✅ Fiat wallets created
- ✅ TRY deposits functional (manual confirmation)

---

## 🗓️ Sprint 3: Crypto Onboarding (Days 21-30)

### Theme
Enable users to deposit cryptocurrency (USDT) and integrate with blockchain.

### Story Points: 18

### User Stories

#### Story 4.2: Deposit (Crypto - USDT) (8 points)
**Goal:** Users can deposit USDT (TRC-20) to their exchange wallet.

**Features:**
- Generate unique TRON wallet address for each user
- Display deposit address (QR code + copy button)
- Monitor blockchain for incoming USDT transactions
- Credit user wallet after 6 confirmations
- Transaction history (status: pending → confirmed)

**Technical Tasks:**
- Blockchain: TRON integration (TronGrid API or node)
- Backend: Generate TRON addresses, monitor deposits (webhook/polling)
- Database: Crypto addresses table, deposit_transactions table
- Frontend: Deposit page (show address, QR code, pending deposits)
- Worker: Blockchain monitoring service (cron job every 1 min)
- Tests: Address generation, deposit detection, balance update

**Estimated Time:** 5 days

---

#### Story 3.2: Wallet Transaction History (5 points)
**Goal:** Users can view all wallet transactions (deposits, withdrawals, trades).

**Features:**
- Transaction list (paginated, filterable by type/status/date)
- Transaction details page (amount, fee, timestamp, status, tx hash)
- Export to CSV
- Real-time updates (WebSocket for new transactions)

**Technical Tasks:**
- Backend: Transaction history endpoint (pagination, filters)
- Frontend: Transaction list page, detail modal, CSV export
- WebSocket: Real-time transaction notifications
- Tests: Transaction queries, filters, exports

**Estimated Time:** 3 days

---

#### Story 1.4: Password Reset (5 points)
**Goal:** Users can reset their password if forgotten.

**Features:**
- "Forgot Password" link on login page
- Email with reset link (token expires in 1 hour)
- Reset password form (new password + confirm)
- Email notification on successful reset

**Technical Tasks:**
- Backend: Forgot password endpoint, reset password endpoint
- Database: Password reset tokens table
- Frontend: Forgot password page, reset password page
- Email template for reset link
- Tests: Token generation, expiry, password update

**Estimated Time:** 2 days

---

### Sprint 3 Daily Breakdown (High-Level)

**Days 21-25:** Story 4.2 (Crypto Deposit)
- TRON integration (address generation)
- Blockchain monitoring worker
- Deposit detection + confirmation
- Frontend deposit page (QR code)
- Testing

**Days 26-28:** Story 3.2 (Transaction History)
- Backend transaction history API
- Frontend transaction list + filters
- CSV export
- WebSocket for real-time updates
- Testing

**Days 29-30:** Story 1.4 (Password Reset)
- Forgot password flow
- Email with reset link
- Reset password form
- Testing

**Sprint 3 End:**
- ✅ USDT deposits working
- ✅ Blockchain integration operational
- ✅ Transaction history complete
- ✅ Password reset functional

---

## 🗓️ Sprint 4: Trading Core (Days 31-40)

### Theme
Build the core trading engine: order book, matching engine, limit/market orders.

### Story Points: 22

### User Stories

#### Story 5.1: Order Book (Real-time) (8 points)
**Goal:** Display real-time order book (bids/asks) for USDT/TRY pair.

**Features:**
- Order book visualization (best 20 bids/asks)
- Real-time updates via WebSocket
- Price aggregation (group by price level)
- Depth chart (optional)

**Technical Tasks:**
- Backend: Order book service (in-memory data structure, Redis)
- WebSocket: Order book updates (on new order, match, cancel)
- Frontend: Order book component (table + depth chart)
- Tests: Order book updates, WebSocket connection

**Estimated Time:** 5 days

---

#### Story 5.2: Place Order (Limit) (7 points)
**Goal:** Users can place limit buy/sell orders.

**Features:**
- Order form (type: limit, side: buy/sell, price, amount)
- Order validation (sufficient balance, price limits)
- Order placement → appears in order book
- Order status tracking (open → filled/cancelled)

**Technical Tasks:**
- Backend: Place order endpoint, order validation, order service
- Database: Orders table
- Matching Engine: Basic matching (price-time priority)
- Frontend: Order form, order validation
- Tests: Order placement, balance lock, matching

**Estimated Time:** 4 days

---

#### Story 5.3: Place Order (Market) (4 points)
**Goal:** Users can place market buy/sell orders (instant execution).

**Features:**
- Order form (type: market, side: buy/sell, amount)
- Instant matching with best available price
- Slippage protection (max 1% price deviation)

**Technical Tasks:**
- Backend: Market order logic, slippage check
- Matching Engine: Market order matching
- Frontend: Market order form
- Tests: Market order execution, slippage

**Estimated Time:** 2 days

---

#### Story 5.4: Cancel Order (3 points)
**Goal:** Users can cancel open limit orders.

**Features:**
- Cancel button on open orders
- Release locked balance on cancellation
- Real-time order book update

**Technical Tasks:**
- Backend: Cancel order endpoint, balance unlock
- Frontend: Cancel button, confirmation
- Tests: Order cancellation, balance unlock

**Estimated Time:** 1 day

---

### Sprint 4 Daily Breakdown (High-Level)

**Days 31-35:** Story 5.1 (Order Book)
- In-memory order book (Redis)
- WebSocket infrastructure
- Frontend order book component
- Real-time updates
- Testing

**Days 36-39:** Story 5.2 & 5.3 (Limit & Market Orders)
- Order placement API
- Matching engine (price-time priority)
- Market order logic
- Balance locking/unlocking
- Frontend order forms
- Testing

**Day 40:** Story 5.4 (Cancel Order)
- Cancel order endpoint
- Balance unlock
- Frontend cancel button
- Testing

**Sprint 4 End:**
- ✅ Order book live
- ✅ Limit & market orders working
- ✅ Matching engine operational
- ✅ Order cancellation functional

---

## 🗓️ Sprint 5: Trading UX (Days 41-50)

### Theme
Enhance trading experience with charts, portfolio tracking, and order history.

### Story Points: 20

### User Stories

#### Story 5.5: Price Chart (Real-time) (7 points)
**Goal:** Display real-time candlestick chart for USDT/TRY pair.

**Features:**
- Candlestick chart (TradingView Lightweight Charts)
- Timeframes: 1m, 5m, 15m, 1h, 4h, 1d
- Real-time price updates
- Volume bars

**Technical Tasks:**
- Backend: OHLCV (Open, High, Low, Close, Volume) data service
- Database: OHLCV data table (partitioned by timeframe)
- Data aggregation: Cron job to compute OHLCV (every 1 min)
- Frontend: Chart component (TradingView integration)
- WebSocket: Real-time price updates
- Tests: OHLCV computation, chart rendering

**Estimated Time:** 4 days

---

#### Story 5.6: Order History (5 points)
**Goal:** Users can view all their past orders (filled, cancelled).

**Features:**
- Order list (paginated, filterable by status/side/date)
- Order details (fills, fees, timestamps)
- Export to CSV

**Technical Tasks:**
- Backend: Order history endpoint (pagination, filters)
- Frontend: Order history page
- CSV export
- Tests: Order queries, filters

**Estimated Time:** 2 days

---

#### Story 5.7: Trade History (5 points)
**Goal:** Users can view all executed trades.

**Features:**
- Trade list (paginated, filterable)
- Trade details (order ID, price, amount, fee, timestamp)
- P&L (profit/loss) calculation

**Technical Tasks:**
- Backend: Trade history endpoint
- Frontend: Trade history page
- P&L calculation
- Tests: Trade queries, P&L

**Estimated Time:** 2 days

---

#### Story 5.8: Portfolio Dashboard (3 points)
**Goal:** Users can see their total portfolio value and allocation.

**Features:**
- Total portfolio value (in TRY)
- Asset allocation pie chart (TRY, USDT)
- 24h change (% and amount)
- Historical portfolio value chart (7 days)

**Technical Tasks:**
- Backend: Portfolio value calculation (sum of all wallets in TRY equivalent)
- Frontend: Portfolio dashboard (pie chart, line chart)
- Tests: Portfolio value calculation

**Estimated Time:** 2 days

---

### Sprint 5 Daily Breakdown (High-Level)

**Days 41-44:** Story 5.5 (Price Chart)
- OHLCV data service
- TradingView chart integration
- Real-time price updates
- Testing

**Days 45-46:** Story 5.6 (Order History)
- Order history API
- Frontend order history page
- CSV export
- Testing

**Days 47-48:** Story 5.7 (Trade History)
- Trade history API
- P&L calculation
- Frontend trade history page
- Testing

**Days 49-50:** Story 5.8 (Portfolio Dashboard)
- Portfolio value calculation
- Dashboard UI (charts)
- Testing

**Sprint 5 End:**
- ✅ Price charts live
- ✅ Order & trade history complete
- ✅ Portfolio dashboard functional

---

## 🗓️ Sprint 6: Withdrawals & Admin (Days 51-60)

### Theme
Enable withdrawals (fiat + crypto) and build admin panel for operations.

### Story Points: 19

### User Stories

#### Story 6.1: Withdrawal (Fiat - TRY) (5 points)
**Goal:** Users can withdraw TRY to their bank account.

**Features:**
- Withdrawal form (amount, bank IBAN)
- Withdrawal request (pending → approved → completed)
- Admin approval (manual verification)
- Email notification on status change
- Fees: 0.5% or min 10 TRY

**Technical Tasks:**
- Backend: Withdrawal request endpoint, admin approval endpoint
- Database: Withdrawal requests table
- Frontend: Withdrawal form, pending withdrawals list
- Admin: Withdrawal approval UI
- Tests: Withdrawal request, balance deduction, fees

**Estimated Time:** 3 days

---

#### Story 6.2: Withdrawal (Crypto - USDT) (6 points)
**Goal:** Users can withdraw USDT to external TRON address.

**Features:**
- Withdrawal form (amount, TRON address)
- Address validation (TRC-20 format)
- Withdrawal request → pending → blockchain submission → completed
- Blockchain transaction (send USDT via TronGrid)
- Fees: Network fee (5 TRX) + 1% withdrawal fee
- 2FA required for withdrawal

**Technical Tasks:**
- Backend: Crypto withdrawal endpoint, blockchain submission service
- TRON: Send USDT transaction
- Database: Crypto withdrawal requests table
- Frontend: Withdrawal form, address validation, 2FA prompt
- Worker: Blockchain withdrawal processor (cron job)
- Tests: Address validation, TRON transaction, 2FA

**Estimated Time:** 3 days

---

#### Story 7.1: Admin Dashboard (5 points)
**Goal:** Admin can monitor platform metrics and user activity.

**Features:**
- Dashboard: Total users, active users (24h), trading volume (24h), revenue
- Charts: User signups (30 days), trading volume (30 days)
- Recent activity log (registrations, deposits, withdrawals, trades)

**Technical Tasks:**
- Backend: Admin metrics endpoints
- Frontend: Admin dashboard page (charts, tables)
- Authorization: Admin role check
- Tests: Metrics calculation

**Estimated Time:** 2 days

---

#### Story 7.2: Admin User Management (3 points)
**Goal:** Admin can view and manage users.

**Features:**
- User list (paginated, searchable)
- User details page (profile, KYC status, wallets, orders)
- Actions: Ban user, verify KYC, reset password

**Technical Tasks:**
- Backend: Admin user endpoints (list, details, actions)
- Frontend: Admin user management pages
- Tests: User actions (ban, verify, reset)

**Estimated Time:** 2 days

---

### Sprint 6 Daily Breakdown (High-Level)

**Days 51-53:** Story 6.1 (Fiat Withdrawal)
- Withdrawal request API
- Admin approval UI
- Email notifications
- Testing

**Days 54-56:** Story 6.2 (Crypto Withdrawal)
- TRON withdrawal integration
- Address validation
- 2FA requirement
- Blockchain worker
- Testing

**Days 57-58:** Story 7.1 (Admin Dashboard)
- Metrics calculation
- Dashboard UI (charts)
- Testing

**Days 59-60:** Story 7.2 (Admin User Management)
- User list + search
- User details page
- Admin actions (ban, verify)
- Testing

**Sprint 6 End:**
- ✅ Fiat & crypto withdrawals working
- ✅ Admin panel operational
- ✅ **MVP COMPLETE!** 🎉

---

## 📈 Overall MVP Metrics

### Total Development Time
- **6 Sprints:** 60 working days (12 weeks)
- **Story Points:** 119 points
- **Average Velocity:** ~20 points/sprint

### Features Delivered
- ✅ User authentication (email, 2FA)
- ✅ KYC verification (Tier 1)
- ✅ Fiat deposits/withdrawals (TRY)
- ✅ Crypto deposits/withdrawals (USDT)
- ✅ Spot trading (USDT/TRY pair)
- ✅ Order book (real-time)
- ✅ Price charts (real-time)
- ✅ Portfolio tracking
- ✅ Admin panel

### Technical Stack
- **Backend:** NestJS, Go (matching engine)
- **Frontend:** React, Redux, Material-UI
- **Database:** PostgreSQL
- **Blockchain:** TRON (TRC-20)
- **Infra:** Kubernetes, Redis, RabbitMQ
- **Monitoring:** Prometheus, Grafana

### Test Coverage
- Backend: ≥80%
- Frontend: ≥75%
- E2E: Critical flows covered

### Performance Targets
- Order placement: <50ms ✅
- Order matching: <10ms ✅
- API response time: <200ms ✅
- WebSocket latency: <100ms ✅

---

## 🎯 Post-MVP Roadmap (Sprint 7+)

### Sprint 7: Advanced Trading (Days 61-70)
- Stop-loss orders
- Take-profit orders
- OCO (One-Cancels-Other) orders
- Trailing stop

### Sprint 8: More Trading Pairs (Days 71-80)
- BTC/TRY pair
- ETH/TRY pair
- BTC/USDT pair
- Multi-pair order book

### Sprint 9: Mobile App (Days 81-90)
- React Native app (iOS + Android)
- Push notifications
- Biometric authentication

### Sprint 10: KYC Tier 2 (Days 91-100)
- Enhanced KYC (proof of address)
- Higher deposit/withdrawal limits
- Corporate accounts

### Sprint 11: Margin Trading (Days 101-110)
- Leverage (2x, 5x, 10x)
- Liquidation engine
- Margin calls

### Sprint 12: API for Algorithmic Trading (Days 111-120)
- REST API for traders
- WebSocket for real-time data
- API key management
- Rate limiting

---

## 🚀 Launch Checklist (After Sprint 6)

### Technical
- ✅ Security audit (penetration testing)
- ✅ Load testing (1000 concurrent users)
- ✅ Disaster recovery plan
- ✅ Backup strategy (daily automated backups)
- ✅ Production monitoring (alerts, dashboards)

### Legal & Compliance
- ✅ SPK (Capital Markets Board) registration
- ✅ MASAK (Anti-Money Laundering) compliance
- ✅ Terms of Service, Privacy Policy
- ✅ Cookie consent

### Operations
- ✅ Customer support system (Zendesk/Intercom)
- ✅ Liquidity provider partnerships
- ✅ Banking relationships (fiat on/off ramp)

### Marketing
- ✅ Landing page
- ✅ Social media (Twitter, LinkedIn)
- ✅ PR launch (TechCrunch, Coindesk)

---

## 💡 Success Metrics (First 3 Months Post-Launch)

| Metric | Target | Stretch Goal |
|--------|--------|--------------|
| Registered Users | 1,000 | 5,000 |
| KYC Verified Users | 500 | 2,500 |
| Daily Active Users | 100 | 500 |
| Trading Volume (daily) | $50,000 | $250,000 |
| Deposits (total) | $500,000 | $2,000,000 |

---

## 📞 Contact & Support

**Product Owner:** Mustafa Yıldırım  
**Tech Lead:** Tech Lead Agent  
**Project Repository:** [GitHub Link]  
**Documentation:** [Confluence/Notion Link]

---

**Let's build the future of crypto banking in Turkey! 🇹🇷🚀**
