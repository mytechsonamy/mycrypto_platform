# MVP Backlog - Kripto Varlık Borsası
## Epic → User Story → Acceptance Criteria

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Sprint Duration:** 2 weeks  
**Target MVP:** 12 weeks (6 sprints)

---

## 📊 MVP Scope Freeze

### ✅ IN SCOPE (MVP)
- **Pazarlar:** BTC/TRY, ETH/TRY, USDT/TRY (3 parite)
- **Emirler:** Market, Limit (2 tür)
- **KYC:** LEVEL_1 only (bireysel, 50K TRY/gün limit)
- **Fiat:** TL yatırma/çekme (havale/EFT only, no kredi kartı)
- **Kripto:** BTC, ETH, USDT deposit/withdrawal
- **Kullanıcı Tipleri:** Individual only (kurumsal sonra)
- **Platformlar:** Web + Mobile (iOS/Android)

### ❌ OUT OF SCOPE (Post-MVP)
- ⛔ Advanced orders (Stop-Loss, OCO, Trailing Stop)
- ⛔ Margin/Leverage trading
- ⛔ Staking/Earn products
- ⛔ OTC desk
- ⛔ Multiple KYC levels (LEVEL_2, LEVEL_3)
- ⛔ Credit card deposits
- ⛔ API trading keys
- ⛔ Sub-accounts
- ⛔ Referral program

---

## 🎯 EPIC 1: User Authentication & Onboarding
**Priority:** P0 (Critical)  
**Estimated Points:** 34  
**Sprint:** 1-2

### User Story 1.1: User Registration
**As a** new user  
**I want to** register with email and password  
**So that** I can access the platform

**Acceptance Criteria:**
- [ ] User can enter email, password (min 8 chars, 1 uppercase, 1 number, 1 special)
- [ ] Email verification link sent within 60 seconds
- [ ] Email verification expires in 24 hours
- [ ] User sees success message after email verification
- [ ] Duplicate email shows error: "Bu email zaten kayıtlı"
- [ ] Password strength indicator displayed (weak/medium/strong)
- [ ] Terms & Conditions checkbox required (v1.0 dated 2025-11-19)
- [ ] KVKK consent checkbox required
- [ ] reCAPTCHA v3 validation (score > 0.5)

**Technical Notes:**
- Auth Service API: `POST /api/v1/auth/register`
- Email template: `templates/email-verification.html`
- Rate limit: 5 attempts per IP per hour

**Story Points:** 5

---

### User Story 1.2: User Login (Email/Password)
**As a** registered user  
**I want to** login with email and password  
**So that** I can access my account

**Acceptance Criteria:**
- [ ] User can login with verified email + password
- [ ] JWT access token issued (15 min expiry)
- [ ] JWT refresh token issued (30 days expiry)
- [ ] Failed login shows: "Email veya şifre hatalı" (no enumeration)
- [ ] Account locked after 5 failed attempts for 30 minutes
- [ ] Lockout notification email sent
- [ ] Session logged with IP, device, timestamp
- [ ] User redirected to dashboard after login

**Technical Notes:**
- Auth Service API: `POST /api/v1/auth/login`
- Redis session store (30 day TTL)
- Argon2id password hashing

**Story Points:** 5

---

### User Story 1.3: Two-Factor Authentication (2FA)
**As a** user  
**I want to** enable 2FA with TOTP  
**So that** my account is more secure

**Acceptance Criteria:**
- [ ] User can enable 2FA in Settings
- [ ] QR code displayed for TOTP app (Google Auth, Authy)
- [ ] Backup codes generated (10 codes, single-use)
- [ ] User must verify first TOTP code to activate
- [ ] 2FA required on every login after activation
- [ ] Option to "Trust this device for 30 days"
- [ ] 2FA disable requires email confirmation + current TOTP
- [ ] Backup code used shows warning: "X codes remaining"

**Technical Notes:**
- Library: `speakeasy` (Node.js) or `pyotp` (Python)
- Secret encrypted in DB (AES-256)
- Rate limit: 3 TOTP attempts per 30 seconds

**Story Points:** 8

---

### User Story 1.4: Password Reset
**As a** user who forgot password  
**I want to** reset my password via email  
**So that** I can regain access

**Acceptance Criteria:**
- [ ] User enters email on "Forgot Password" page
- [ ] Reset link sent to email (expires in 1 hour)
- [ ] Reset link is single-use only
- [ ] User enters new password (same complexity rules)
- [ ] All existing sessions invalidated after reset
- [ ] Email confirmation sent after successful reset
- [ ] Rate limit: 3 reset requests per email per hour

**Technical Notes:**
- Token: JWT with `reset_password` scope
- Redis token blacklist after use

**Story Points:** 5

---

### User Story 1.5: KYC Submission (LEVEL_1)
**As a** verified email user  
**I want to** complete KYC Level 1  
**So that** I can deposit/withdraw up to 50K TRY/day

**Acceptance Criteria:**
- [ ] User fills form: Full Name, TC Kimlik No, Birth Date, Phone
- [ ] User uploads ID photo (front + back, max 5MB each, JPG/PNG)
- [ ] User uploads selfie with ID (max 5MB, JPG/PNG)
- [ ] Form validation: TC Kimlik checksum, phone format (+905XXXXXXXXX)
- [ ] Files stored in S3 (encrypted at rest)
- [ ] KYC status set to `PENDING` immediately
- [ ] User sees estimated review time: "24-48 saat"
- [ ] Auto-review with Merkezi Kimlik Sisteminde (MKS) API (if available)
- [ ] Manual review queue for admin if auto-review fails
- [ ] Email sent on approval/rejection

**LEVEL_1 Limits:**
- Deposit: 50,000 TRY/day
- Withdrawal: 50,000 TRY/day
- Trading: Unlimited

**Technical Notes:**
- Compliance Service API: `POST /api/v1/kyc/submit`
- MKS integration: `https://mks.nvi.gov.tr/api/...` (mocked in dev)
- Admin panel: `/admin/kyc-reviews`

**Story Points:** 13

---

### User Story 1.6: KYC Status Check
**As a** user  
**I want to** see my KYC status  
**So that** I know if I can trade

**Acceptance Criteria:**
- [ ] User sees KYC badge on dashboard: "Onaylı" (green), "Beklemede" (yellow), "Reddedildi" (red)
- [ ] Status page shows: Current level, limits, submission date
- [ ] If rejected, reason displayed: "Belge okunamıyor" / "Bilgiler eşleşmiyor"
- [ ] "Tekrar Dene" button for rejected KYC
- [ ] Real-time status via WebSocket: `kyc.status.updated`

**Technical Notes:**
- API: `GET /api/v1/kyc/status`
- WebSocket event: `kyc.status.updated`

**Story Points:** 3

---

## 🎯 EPIC 2: Wallet Management
**Priority:** P0 (Critical)  
**Estimated Points:** 55  
**Sprint:** 2-3

### User Story 2.1: View Wallet Balances
**As a** KYC-approved user  
**I want to** see my wallet balances  
**So that** I know how much I have

**Acceptance Criteria:**
- [ ] Dashboard shows all asset balances: BTC, ETH, USDT, TRY
- [ ] Each asset shows: Available, Locked (in orders), Total
- [ ] Balances update in real-time (WebSocket)
- [ ] TRY balance in₺ currency format (e.g., "1.234,56 ₺")
- [ ] Crypto balances in 8 decimal places (e.g., "0.12345678 BTC")
- [ ] USD equivalent shown for each asset (live pricing)
- [ ] Total portfolio value in TRY and USD

**Technical Notes:**
- API: `GET /api/v1/wallet/balances`
- WebSocket: `wallet.balance.updated`
- Cache: Redis (5 second TTL)

**Story Points:** 5

---

### User Story 2.2: TRY Deposit (Bank Transfer)
**As a** user  
**I want to** deposit TRY via bank transfer  
**So that** I can buy crypto

**Acceptance Criteria:**
- [ ] User clicks "TRY Yatır"
- [ ] System shows unique IBAN (per user, virtual IBAN)
- [ ] User sees instruction: "Transfer açıklamasına '{USER_ID}' yazınız"
- [ ] Minimum deposit: 100 TRY
- [ ] Maximum deposit: 50,000 TRY (LEVEL_1 daily limit)
- [ ] Bank transfer detected within 30 minutes (bank API polling)
- [ ] Balance credited after detection + admin approval
- [ ] Email + SMS notification on successful deposit
- [ ] Transaction history shows deposit with status: Pending → Approved

**Technical Notes:**
- Banking Integration: TEB Bank API (or Akbank)
- Virtual IBAN provider: `ibanPro` or bank's service
- Wallet Service API: `POST /api/v1/wallet/deposit/try`

**Story Points:** 13

---

### User Story 2.3: TRY Withdrawal (Bank Transfer)
**As a** user  
**I want to** withdraw TRY to my bank account  
**So that** I can access my funds

**Acceptance Criteria:**
- [ ] User enters: Amount, Bank Name, IBAN, Account Holder Name
- [ ] IBAN validation (TR format, 26 chars)
- [ ] Account holder name must match KYC name
- [ ] Minimum withdrawal: 100 TRY
- [ ] Maximum withdrawal: 50,000 TRY/day (LEVEL_1 limit)
- [ ] Fee: 5 TRY (flat fee)
- [ ] Withdrawal status: Pending → Processing → Completed / Failed
- [ ] Admin approval required for first withdrawal
- [ ] Auto-approval after first successful withdrawal
- [ ] Email + SMS notification on each status change
- [ ] 2FA code required to confirm withdrawal

**Technical Notes:**
- Wallet Service API: `POST /api/v1/wallet/withdraw/try`
- Bank payout: TEB API `POST /transfer`
- Processing time: 1-3 business hours

**Story Points:** 13

---

### User Story 2.4: Crypto Deposit (BTC/ETH/USDT)
**As a** user  
**I want to** deposit crypto to my wallet  
**So that** I can trade

**Acceptance Criteria:**
- [ ] User selects coin (BTC/ETH/USDT)
- [ ] System generates unique deposit address (per user)
- [ ] QR code displayed for mobile scanning
- [ ] Address copied with "Kopyalandı!" confirmation
- [ ] Warning shown: "Minimum 3 confirmation gereklidir"
- [ ] Network selection: Ethereum (ERC-20) or Tron (TRC-20) for USDT
- [ ] Deposit detected on blockchain within 10 minutes
- [ ] Balance credited after confirmations:
  - BTC: 3 confirmations
  - ETH: 12 confirmations
  - USDT: 12 confirmations (ERC-20)
- [ ] Email notification on detection + final credit
- [ ] Transaction hash (txid) shown in history

**Technical Notes:**
- Blockchain monitoring: `BlockCypher` API or own node
- Address generation: HD Wallet (BIP-44)
- Hot wallet threshold: 10% of total holdings

**Story Points:** 13

---

### User Story 2.5: Crypto Withdrawal (BTC/ETH/USDT)
**As a** user  
**I want to** withdraw crypto to external wallet  
**So that** I can move funds off-platform

**Acceptance Criteria:**
- [ ] User selects coin (BTC/ETH/USDT)
- [ ] User enters: Destination address, Amount
- [ ] Address validation (checksum, network compatibility)
- [ ] Minimum withdrawal:
  - BTC: 0.001 BTC
  - ETH: 0.01 ETH
  - USDT: 10 USDT
- [ ] Network fee displayed (dynamic, from blockchain)
- [ ] Platform fee: 0.0005 BTC / 0.005 ETH / 1 USDT
- [ ] Whitelist address feature: "Güvenli Adres Ekle"
- [ ] First-time address requires email confirmation
- [ ] 2FA code required to confirm withdrawal
- [ ] Withdrawal status: Pending → Broadcasting → Confirmed
- [ ] Admin approval for large withdrawals (> $10,000)
- [ ] Email notification on each status change

**Technical Notes:**
- Wallet Service API: `POST /api/v1/wallet/withdraw/crypto`
- Broadcast via blockchain node
- Multi-signature for cold wallet withdrawals (3-of-5)

**Story Points:** 13

---

### User Story 2.6: Transaction History
**As a** user  
**I want to** view my transaction history  
**So that** I can track all my deposits/withdrawals

**Acceptance Criteria:**
- [ ] History shows: Date, Type (Deposit/Withdrawal), Asset, Amount, Fee, Status, TxID
- [ ] Filters: Asset (All/BTC/ETH/USDT/TRY), Type, Date Range, Status
- [ ] Pagination: 20 transactions per page
- [ ] Export to CSV (last 90 days)
- [ ] Pending transactions highlighted with spinner
- [ ] Clickable TxID opens blockchain explorer (BTC: blockchain.info, ETH: etherscan.io)

**Technical Notes:**
- API: `GET /api/v1/wallet/transactions?page=1&limit=20`
- CSV export: `GET /api/v1/wallet/transactions/export`

**Story Points:** 5

---

## 🎯 EPIC 3: Trading Engine
**Priority:** P0 (Critical)  
**Estimated Points:** 89  
**Sprint:** 3-5

### User Story 3.1: View Order Book (Real-Time)
**As a** user  
**I want to** see the order book for a trading pair  
**So that** I understand current market depth

**Acceptance Criteria:**
- [ ] Order book shows:
  - Bids (buy orders): Price, Amount, Total (descending price)
  - Asks (sell orders): Price, Amount, Total (ascending price)
- [ ] Top 20 levels each side displayed
- [ ] Real-time updates via WebSocket
- [ ] Visual bar chart showing depth
- [ ] Current spread highlighted (best bid - best ask)
- [ ] User's own orders highlighted in different color
- [ ] Aggregate view option: Group by 0.1%, 0.5%, 1%

**Technical Notes:**
- WebSocket: `wss://api.exchange.com/orderbook?symbol=BTC_TRY`
- Snapshot API: `GET /api/v1/market/orderbook/BTC_TRY`
- Update frequency: 100ms

**Story Points:** 8

---

### User Story 3.2: View Market Data (Ticker)
**As a** user  
**I want to** see current market prices  
**So that** I can make trading decisions

**Acceptance Criteria:**
- [ ] Ticker shows (per pair):
  - Last Price
  - 24h Change (% and absolute)
  - 24h High/Low
  - 24h Volume (base + quote currency)
- [ ] Price updates in real-time (WebSocket)
- [ ] Color coding: Green (up), Red (down)
- [ ] All pairs listed on homepage
- [ ] Search/filter by symbol

**Technical Notes:**
- WebSocket: `wss://api.exchange.com/ticker`
- API: `GET /api/v1/market/ticker/BTC_TRY`

**Story Points:** 5

---

### User Story 3.3: View Trade History (Recent Trades)
**As a** user  
**I want to** see recent executed trades  
**So that** I can understand price action

**Acceptance Criteria:**
- [ ] Recent trades show: Time, Price, Amount, Side (Buy/Green or Sell/Red)
- [ ] Last 50 trades displayed
- [ ] Real-time updates (WebSocket)
- [ ] Scrollable list
- [ ] Auto-scroll on new trade (optional toggle)

**Technical Notes:**
- WebSocket: `wss://api.exchange.com/trades?symbol=BTC_TRY`
- API: `GET /api/v1/market/trades/BTC_TRY?limit=50`

**Story Points:** 3

---

### User Story 3.4: Place Market Order
**As a** user  
**I want to** place a market order  
**So that** I can execute immediately at best price

**Acceptance Criteria:**
- [ ] User selects: Pair (BTC/TRY), Side (Buy/Sell), Amount
- [ ] Amount input options:
  - Base currency (e.g., BTC amount)
  - Quote currency (e.g., TRY amount for Buy)
  - Percentage slider (25%, 50%, 75%, 100% of available balance)
- [ ] Estimated total shown (Amount × Last Price ± slippage)
- [ ] Fee displayed: 0.2% (maker/taker both)
- [ ] Minimum order: 100 TRY equivalent
- [ ] 2FA code required for orders > 10,000 TRY
- [ ] Confirmation modal: "X BTC satın alınacak, tahmini maliyet: Y TRY"
- [ ] Order submitted → "Sipariş alındı!" notification
- [ ] Order ID returned
- [ ] Order appears in "Open Orders" until executed
- [ ] Execution notification (WebSocket + Email if > 1,000 TRY)
- [ ] Partial fills allowed

**Technical Notes:**
- Trading Service API: `POST /api/v1/trading/order`
- Matching engine: Rust-based (low latency)
- Order TTL: 60 seconds for market orders

**Story Points:** 13

---

### User Story 3.5: Place Limit Order
**As a** user  
**I want to** place a limit order  
**So that** I can buy/sell at my desired price

**Acceptance Criteria:**
- [ ] User enters: Pair, Side, Price, Amount
- [ ] Price validation: Must be within ±10% of last price
- [ ] Amount options: Base currency or % slider
- [ ] Estimated total: Amount × Price
- [ ] Fee: 0.2%
- [ ] Minimum order: 100 TRY equivalent
- [ ] Post-only option (maker-only, no taker fee)
- [ ] Good-Till-Cancelled (GTC) default
- [ ] Time-in-Force options:
  - GTC (default)
  - IOC (Immediate or Cancel)
  - FOK (Fill or Kill)
- [ ] 2FA for orders > 10,000 TRY
- [ ] Confirmation modal
- [ ] Order appears in "Open Orders"
- [ ] Order can be cancelled anytime
- [ ] Partial fills displayed in real-time
- [ ] Email notification on full execution

**Technical Notes:**
- API: `POST /api/v1/trading/order`
- Order book persistence: PostgreSQL
- Matching priority: Price → Time

**Story Points:** 13

---

### User Story 3.6: View Open Orders
**As a** user  
**I want to** see my open orders  
**So that** I can track and manage them

**Acceptance Criteria:**
- [ ] List shows: Order ID, Date, Pair, Side, Type, Price, Amount, Filled, Status
- [ ] Statuses: Open, Partially Filled
- [ ] Real-time updates (WebSocket)
- [ ] "Cancel" button per order
- [ ] "Cancel All" button (with confirmation)
- [ ] Filters: Pair, Side, Type
- [ ] Pagination: 20 per page

**Technical Notes:**
- API: `GET /api/v1/trading/orders/open`
- WebSocket: `order.status.updated`

**Story Points:** 5

---

### User Story 3.7: Cancel Order
**As a** user  
**I want to** cancel an open order  
**So that** I can free up my locked balance

**Acceptance Criteria:**
- [ ] User clicks "Cancel" on open order
- [ ] Confirmation modal: "Emin misiniz?"
- [ ] Order cancelled within 200ms
- [ ] Locked balance released immediately
- [ ] Order removed from "Open Orders"
- [ ] Order moved to "Order History" with status "Cancelled"
- [ ] WebSocket notification: `order.cancelled`

**Technical Notes:**
- API: `DELETE /api/v1/trading/order/{orderId}`
- Latency SLA: < 200ms

**Story Points:** 5

---

### User Story 3.8: View Order History
**As a** user  
**I want to** see my past orders  
**So that** I can review my trading activity

**Acceptance Criteria:**
- [ ] History shows: All orders (Open, Filled, Cancelled)
- [ ] Columns: Order ID, Date, Pair, Side, Type, Price, Amount, Filled %, Status, Fee Paid
- [ ] Filters: Date range, Pair, Side, Status
- [ ] Export to CSV (last 90 days)
- [ ] Pagination: 50 per page
- [ ] Order details on click: Fill history (if partially filled)

**Technical Notes:**
- API: `GET /api/v1/trading/orders/history?page=1&limit=50`
- CSV export: `GET /api/v1/trading/orders/export`

**Story Points:** 8

---

### User Story 3.9: View Trade History (User's Trades)
**As a** user  
**I want to** see my executed trades  
**So that** I can track my P&L

**Acceptance Criteria:**
- [ ] List shows: Trade ID, Date, Pair, Side, Price, Amount, Fee, Total
- [ ] Filters: Date range, Pair, Side
- [ ] Export to CSV (last 90 days)
- [ ] Pagination: 50 per page
- [ ] P&L calculation (if possible, basic)

**Technical Notes:**
- API: `GET /api/v1/trading/trades?page=1&limit=50`

**Story Points:** 5

---

### User Story 3.10: Trading Fee Structure
**As a** user  
**I want to** understand the fee structure  
**So that** I can calculate my costs

**Acceptance Criteria:**
- [ ] Fee schedule page shows:
  - Maker: 0.2%
  - Taker: 0.2%
  - (No tiered structure in MVP)
- [ ] Example calculation shown
- [ ] Note: "Daha düşük ücretler için VIP programı yakında!"

**Technical Notes:**
- Static page (no API)

**Story Points:** 2

---

### User Story 3.11: Price Alerts (Optional, nice-to-have)
**As a** user  
**I want to** set price alerts  
**So that** I'm notified when price reaches my target

**Acceptance Criteria:**
- [ ] User sets alert: Pair, Condition (Above/Below), Target Price
- [ ] Alert triggered → Email + Push notification
- [ ] Alert auto-deleted after trigger
- [ ] Max 10 alerts per user
- [ ] Alerts listed in Settings

**Technical Notes:**
- API: `POST /api/v1/alerts`
- Evaluation frequency: Every 10 seconds

**Story Points:** 8 (Optional - can be de-scoped)

---

## 🎯 EPIC 4: Compliance & Reporting
**Priority:** P1 (High)  
**Estimated Points:** 21  
**Sprint:** 5-6

### User Story 4.1: Admin KYC Review
**As an** admin  
**I want to** review KYC submissions  
**So that** I can approve/reject users

**Acceptance Criteria:**
- [ ] Admin panel shows pending KYC queue
- [ ] Each submission shows: User info, ID photos, selfie
- [ ] Zoom/rotate image controls
- [ ] Approve/Reject buttons
- [ ] Rejection requires reason selection:
  - "Belge okunamıyor"
  - "Bilgiler eşleşmiyor"
  - "Fotoğraf kalitesi düşük"
  - "Diğer" (free text)
- [ ] Email sent to user on approval/rejection
- [ ] Audit log: Who approved/rejected, when

**Technical Notes:**
- Admin Panel: `/admin/kyc-reviews`
- API: `POST /api/v1/admin/kyc/{userId}/approve`
- API: `POST /api/v1/admin/kyc/{userId}/reject`

**Story Points:** 8

---

### User Story 4.2: Admin TRY Deposit Approval
**As an** admin  
**I want to** verify TRY deposits  
**So that** I can credit user accounts

**Acceptance Criteria:**
- [ ] Admin panel shows pending deposits
- [ ] Each deposit shows: User, Amount, Bank account, Timestamp, Reference
- [ ] "Approve" button → Credits user balance
- [ ] "Reject" button → Returns funds (if applicable)
- [ ] Audit log recorded

**Technical Notes:**
- Admin Panel: `/admin/deposits`
- API: `POST /api/v1/admin/deposit/{id}/approve`

**Story Points:** 5

---

### User Story 4.3: MASAK Suspicious Activity Logging
**As a** compliance officer  
**I want to** log suspicious activities  
**So that** I can report to MASAK

**Acceptance Criteria:**
- [ ] System auto-flags:
  - Large withdrawals (> 100K TRY in 24h)
  - High-frequency deposits (> 5 in 1h)
  - Round-number transactions
  - Rapid buy-sell cycles (wash trading)
- [ ] Manual flagging by admin
- [ ] Export to MASAK XML format (if format available)

**Technical Notes:**
- Compliance Service: `POST /api/v1/compliance/flag`
- XML schema: MASAK official format

**Story Points:** 8

---

## 🎯 EPIC 5: Admin Panel
**Priority:** P1 (High)  
**Estimated Points:** 34  
**Sprint:** 5-6

### User Story 5.1: Admin Dashboard
**As an** admin  
**I want to** see key metrics  
**So that** I can monitor platform health

**Acceptance Criteria:**
- [ ] Dashboard shows:
  - Total users (Registered, KYC approved)
  - 24h trading volume (TRY)
  - 24h new registrations
  - Pending KYC count
  - Pending deposit/withdrawal count
  - Platform balance (hot/cold wallets per coin)
  - System health (API latency, error rate)
- [ ] Auto-refresh every 30 seconds

**Technical Notes:**
- Admin Panel: `/admin/dashboard`
- API: `GET /api/v1/admin/stats`

**Story Points:** 8

---

### User Story 5.2: User Management
**As an** admin  
**I want to** search and manage users  
**So that** I can handle support issues

**Acceptance Criteria:**
- [ ] Search by: Email, User ID, Phone, KYC status
- [ ] User details page shows: Profile, KYC, Balances, Order history, Trade history
- [ ] Actions:
  - Reset password (send email)
  - Lock/unlock account
  - Adjust KYC status
  - Add notes (internal only)

**Technical Notes:**
- Admin Panel: `/admin/users`
- API: `GET /api/v1/admin/users/search?q=email`

**Story Points:** 13

---

### User Story 5.3: Transaction Monitoring
**As an** admin  
**I want to** monitor all deposits/withdrawals  
**So that** I can detect issues

**Acceptance Criteria:**
- [ ] List shows: All deposits/withdrawals (Crypto + Fiat)
- [ ] Filters: Asset, Status, Date range, Amount range
- [ ] Each transaction: User, Amount, Status, Timestamp, TxID/Bank ref
- [ ] Manual approve/reject buttons
- [ ] Export to CSV

**Technical Notes:**
- Admin Panel: `/admin/transactions`
- API: `GET /api/v1/admin/transactions`

**Story Points:** 8

---

### User Story 5.4: Trading Monitoring
**As an** admin  
**I want to** monitor trading activity  
**So that** I can detect manipulation

**Acceptance Criteria:**
- [ ] Real-time order book view (all pairs)
- [ ] Recent trades stream
- [ ] Alerts for:
  - Large orders (> 100K TRY)
  - Rapid cancellations
  - Self-trading
- [ ] Ability to cancel specific orders

**Technical Notes:**
- Admin Panel: `/admin/trading`

**Story Points:** 13

---

## 🎯 EPIC 6: Mobile App (iOS/Android)
**Priority:** P0 (Critical)  
**Estimated Points:** 55  
**Sprint:** 4-6 (Parallel with backend)

### User Story 6.1: Mobile App - Core Features
**As a** mobile user  
**I want** to access key features on mobile  
**So that** I can trade on-the-go

**MVP Features:**
- [ ] Login/Register (same as web)
- [ ] 2FA setup (TOTP)
- [ ] View balances
- [ ] TRY deposit (show IBAN)
- [ ] TRY withdrawal
- [ ] Crypto deposit (show address + QR)
- [ ] Crypto withdrawal (QR scanner)
- [ ] Place market order
- [ ] Place limit order
- [ ] View open orders
- [ ] Cancel orders
- [ ] View order history
- [ ] View trade history
- [ ] Transaction history
- [ ] Push notifications:
  - Order filled
  - Deposit credited
  - Withdrawal completed
  - KYC approved/rejected

**Technical Stack:**
- React Native (iOS + Android)
- Redux for state
- WebSocket support
- Biometric auth (Face ID / Fingerprint)

**Story Points:** 55

---

## 📊 Sprint Breakdown

| Sprint | Epics | Story Points | Key Deliverables |
|--------|-------|--------------|------------------|
| **Sprint 1** | Epic 1 (50%) | 21 | User Registration, Login, 2FA |
| **Sprint 2** | Epic 1 (50%) + Epic 2 (30%) | 30 | KYC Submit, TRY Deposit/Withdraw |
| **Sprint 3** | Epic 2 (40%) + Epic 3 (30%) | 34 | Crypto Deposit/Withdraw, Order Book, Market Orders |
| **Sprint 4** | Epic 3 (40%) + Epic 6 (30%) | 40 | Limit Orders, Open Orders, Mobile App Basics |
| **Sprint 5** | Epic 3 (30%) + Epic 4 + Epic 5 (50%) | 38 | Order History, Admin Panel, KYC Review |
| **Sprint 6** | Epic 5 (50%) + Epic 6 (70%) + Buffer | 35 | Complete Admin, Finalize Mobile, UAT |

**Total:** 198 story points (MVP)

---

## 🚧 Dependencies

### External Dependencies
- [ ] Bank API integration (TEB/Akbank) - Week 1
- [ ] Blockchain nodes (BTC/ETH) - Week 1
- [ ] MKS (Kimlik Doğrulama) API access - Week 2
- [ ] SMS provider (Netgsm/İleti Merkezi) - Week 1
- [ ] Email service (SendGrid/AWS SES) - Week 1
- [ ] S3 bucket for KYC documents - Week 1
- [ ] SSL certificate - Week 1

### Internal Dependencies
- [ ] Matching engine ready - Sprint 3
- [ ] Hot/cold wallet setup - Sprint 2
- [ ] Admin panel auth - Sprint 5

---

## 🎯 Definition of Done (DoD)

Per User Story:
- [ ] Code written and peer-reviewed
- [ ] Unit tests (min 80% coverage)
- [ ] Integration tests pass
- [ ] API documented (OpenAPI)
- [ ] Frontend UI matches Figma design
- [ ] Security review (OWASP checklist)
- [ ] Performance tested (if applicable)
- [ ] Deployed to dev environment
- [ ] QA tested and approved
- [ ] Product Owner acceptance

---

## 📝 Jira Import Format

```csv
Issue Type,Summary,Description,Story Points,Epic Link,Assignee,Priority
Epic,User Authentication & Onboarding,,34,,,P0
Story,User Registration,"AC: [paste from above]",5,User Authentication & Onboarding,,P0
Story,User Login,"AC: [paste from above]",5,User Authentication & Onboarding,,P0
...
```

---

**Next Steps:**
1. Import to Jira/Asana
2. Assign stories to sprints
3. Team capacity planning (velocity)
4. Daily standups start Sprint 1

**Document Owner:** Product Manager  
**Review:** Weekly (Sprint Planning)
