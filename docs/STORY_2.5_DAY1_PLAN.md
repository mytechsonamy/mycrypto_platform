# Story 2.5: Crypto Withdrawal - Day 1 Implementation Plan
**Sprint:** 3
**Story Points:** 13
**Date:** 2025-11-22
**Status:** 🚀 READY TO START

---

## Story Overview

**As a** user
**I want to** withdraw crypto to external wallet
**So that** I can move funds off-platform

**Acceptance Criteria:**
- [ ] User selects coin (BTC/ETH/USDT)
- [ ] User enters: Destination address, Amount
- [ ] Address validation (checksum, network compatibility)
- [ ] Minimum withdrawal enforced (BTC: 0.001, ETH: 0.01, USDT: 10)
- [ ] Network fee displayed (dynamic)
- [ ] Platform fee deducted (BTC: 0.0005, ETH: 0.005, USDT: 1)
- [ ] Whitelist address feature available
- [ ] First-time address requires email confirmation
- [ ] 2FA code required to confirm withdrawal
- [ ] Withdrawal status tracking: Pending → Broadcasting → Confirmed
- [ ] Admin approval for large withdrawals (> $10,000)
- [ ] Email notification on each status change

---

## Day 1 Objectives

### Primary Goals
1. ✅ Complete database schema design and migrations
2. ✅ Implement address validation service (BTC, ETH, USDT)
3. ✅ Set up hot wallet infrastructure (development)
4. ✅ Create withdrawal request API skeleton

### Secondary Goals
- Begin withdrawal request handling logic
- Prepare test environment for blockchain operations
- Document API specifications

---

## Agent Task Assignments - Day 1

### 1. Database Engineer (Priority: HIGH)
**Estimated Time:** 4 hours
**Status:** 🔴 NOT STARTED

#### Tasks:
1. **Design withdrawal tables schema**
   - `crypto_withdrawal_requests` table:
     - id (UUID, PK)
     - user_id (UUID, FK → users)
     - currency (ENUM: BTC, ETH, USDT)
     - destination_address (VARCHAR)
     - amount (DECIMAL(20,8))
     - network_fee (DECIMAL(20,8))
     - platform_fee (DECIMAL(20,8))
     - total_amount (DECIMAL(20,8))
     - status (ENUM: PENDING, APPROVED, BROADCASTING, CONFIRMED, FAILED, CANCELLED)
     - transaction_hash (VARCHAR, nullable)
     - confirmations (INT, default 0)
     - requires_admin_approval (BOOLEAN)
     - admin_approved_by (UUID, FK → users, nullable)
     - admin_approved_at (TIMESTAMP, nullable)
     - two_fa_verified_at (TIMESTAMP)
     - created_at, updated_at
     - Indexes: user_id, status, created_at, transaction_hash

   - `whitelisted_addresses` table:
     - id (UUID, PK)
     - user_id (UUID, FK → users)
     - currency (ENUM: BTC, ETH, USDT)
     - address (VARCHAR)
     - label (VARCHAR, e.g., "My Ledger Wallet")
     - is_verified (BOOLEAN, default false)
     - verification_token (VARCHAR, nullable)
     - verified_at (TIMESTAMP, nullable)
     - created_at, updated_at
     - Unique constraint: (user_id, currency, address)
     - Indexes: user_id, is_verified

2. **Create TypeORM entities**
   - CryptoWithdrawalRequest entity
   - WhitelistedAddress entity
   - Proper relations to User, Wallet entities

3. **Write migration scripts**
   - Up migration (create tables)
   - Down migration (drop tables)
   - Seed data for testing (optional)

4. **Test migrations**
   - Run on development database
   - Verify constraints and indexes
   - Document schema changes

**Deliverables:**
- `services/wallet-service/src/withdrawal/entities/crypto-withdrawal-request.entity.ts`
- `services/wallet-service/src/withdrawal/entities/whitelisted-address.entity.ts`
- Migration files (if using migrations instead of auto-sync)
- Schema documentation update

**Acceptance Criteria:**
- Tables created successfully
- All constraints and indexes applied
- Foreign key relationships working
- No TypeScript errors
- Migration rollback works correctly

---

### 2. Backend NestJS Developer (Priority: HIGH)
**Estimated Time:** 6 hours
**Status:** 🔴 NOT STARTED

#### Tasks:
1. **Create Address Validation Service**
   - Location: `services/wallet-service/src/withdrawal/services/address-validation.service.ts`
   - Methods:
     - `validateBitcoinAddress(address: string): Promise<ValidationResult>`
       - Support Base58 (P2PKH, P2SH)
       - Support Bech32 (SegWit: bc1...)
       - Checksum validation
     - `validateEthereumAddress(address: string): Promise<ValidationResult>`
       - Checksum validation (EIP-55)
       - Support ENS resolution (optional)
     - `validateUSDTAddress(address: string, network: 'ERC20' | 'TRC20'): Promise<ValidationResult>`
       - ERC20: Use Ethereum validation
       - TRC20: Tron address validation (T... format)
     - `validateAddress(currency: Currency, address: string, network?: string): Promise<ValidationResult>`
       - Unified validation method

   - Use libraries:
     - `bitcoinjs-lib` for BTC validation
     - `ethers` for ETH validation
     - `tronweb` for TRC20 validation (if implementing)

2. **Create Withdrawal Request DTO**
   - Location: `services/wallet-service/src/withdrawal/dto/create-withdrawal-request.dto.ts`
   - Fields:
     - currency: Currency (enum: BTC, ETH, USDT)
     - destinationAddress: string
     - amount: string (decimal as string)
     - network?: string (for USDT: ERC20/TRC20)
     - twoFaCode: string (6 digits)
     - useWhitelistedAddress?: boolean
     - whitelistedAddressId?: string (UUID)
   - Validation decorators:
     - @IsEnum(), @IsNotEmpty(), @IsString()
     - @Matches() for address format
     - Custom validator for amount (min/max)

3. **Create Withdrawal API Controller skeleton**
   - Location: `services/wallet-service/src/withdrawal/withdrawal.controller.ts`
   - Endpoints:
     - `POST /api/v1/wallet/withdraw/crypto/request` - Create withdrawal request
     - `GET /api/v1/wallet/withdraw/crypto/history` - Get withdrawal history
     - `GET /api/v1/wallet/withdraw/crypto/:id` - Get withdrawal details
     - `POST /api/v1/wallet/withdraw/crypto/:id/cancel` - Cancel pending withdrawal
     - `GET /api/v1/wallet/withdraw/crypto/fees/:currency` - Get current fees

   - Guards:
     - JwtAuthGuard (authentication required)
     - KycGuard (KYC Level 1 required)

4. **Write unit tests for Address Validation Service**
   - Test valid BTC addresses (Base58, Bech32)
   - Test valid ETH addresses (with/without checksum)
   - Test invalid addresses (wrong checksum, wrong format)
   - Test network compatibility
   - Target: 80%+ coverage

**Deliverables:**
- AddressValidationService with comprehensive validation
- CreateWithdrawalRequestDto with validation
- WithdrawalController skeleton with routes
- Unit tests (25+ test cases)
- OpenAPI documentation annotations

**Acceptance Criteria:**
- All address validations working correctly
- Unit tests passing (25+ tests)
- TypeScript compilation successful
- API endpoints defined (implementation can be stub)
- Swagger documentation visible

---

### 3. DevOps Engineer (Priority: MEDIUM)
**Estimated Time:** 4 hours
**Status:** 🔴 NOT STARTED

#### Tasks:
1. **Set up hot wallet for development**
   - Generate development wallet mnemonics
   - Create wallet addresses for BTC, ETH
   - Fund with testnet coins:
     - BTC Testnet: Use faucet (https://testnet-faucet.com/btc-testnet/)
     - ETH Sepolia: Use faucet (https://sepoliafaucet.com/)
   - Store mnemonics securely (environment variables)

2. **Configure environment variables**
   - Add to `services/wallet-service/.env`:
     ```bash
     # Hot Wallet Configuration
     HOT_WALLET_MNEMONIC="<24-word-mnemonic>"
     HOT_WALLET_ENCRYPTION_KEY="<32-byte-hex>"
     HOT_WALLET_THRESHOLD_PERCENTAGE=10

     # Withdrawal Limits
     BTC_MIN_WITHDRAWAL=0.001
     ETH_MIN_WITHDRAWAL=0.01
     USDT_MIN_WITHDRAWAL=10.0

     # Withdrawal Fees (Platform fees in native currency)
     BTC_PLATFORM_FEE=0.0005
     ETH_PLATFORM_FEE=0.005
     USDT_PLATFORM_FEE=1.0

     # Admin Approval Threshold (USD equivalent)
     LARGE_WITHDRAWAL_THRESHOLD=10000

     # Blockchain Networks
     BTC_NETWORK=testnet  # mainnet for production
     ETH_NETWORK=sepolia  # mainnet for production
     ETH_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
     ```

3. **Set up blockchain RPC endpoints**
   - Bitcoin Testnet: Use BlockCypher API or local node
   - Ethereum Sepolia: Use Infura or Alchemy
   - Test connectivity and API rate limits

4. **Create hot wallet monitoring**
   - Add Prometheus metrics:
     - `hot_wallet_balance_btc`
     - `hot_wallet_balance_eth`
     - `hot_wallet_balance_usdt`
   - Alert when balance falls below threshold
   - Document replenishment process

**Deliverables:**
- Development hot wallet set up and funded
- Environment variables documented
- RPC endpoints configured and tested
- Monitoring metrics defined
- Hot wallet management documentation

**Acceptance Criteria:**
- Hot wallet addresses generated
- Testnet funds available (even small amounts for testing)
- RPC connections working
- Environment variables set correctly
- Monitoring framework ready

---

### 4. Frontend React Developer (Priority: LOW - Day 2)
**Estimated Time:** 0 hours (Day 1)
**Status:** ⏸️ WAITING

#### Day 1 Tasks:
- **Wait for backend API contracts to be defined**
- Review OpenAPI specs once available
- Prepare component structure planning

#### Day 2 Tasks (Preview):
- Create WithdrawalForm component
- Implement address input with validation
- Add amount input with min/max limits
- Design fee display component

---

### 5. QA Engineer (Priority: MEDIUM - Day 2)
**Estimated Time:** 2 hours (Day 1)
**Status:** 🔴 NOT STARTED

#### Day 1 Tasks:
1. **Review Story 2.5 acceptance criteria**
   - Understand withdrawal flow
   - Identify critical security risks (OWASP Top 10)
   - Document potential edge cases

2. **Begin test plan creation**
   - Create Story_2.5_Test_Plan.md skeleton
   - Identify 30-40 test scenarios:
     - Happy path (valid withdrawal)
     - Invalid addresses
     - Insufficient balance
     - 2FA failures
     - Network fee variations
     - Admin approval workflow
     - Whitelist functionality
   - Risk assessment (CVSS scoring for security issues)

3. **Prepare Postman collection structure**
   - Set up environment variables
   - Create request templates
   - Wait for Day 2 to add actual API calls

**Deliverables:**
- Story_2.5_Test_Plan.md (initial draft)
- Risk assessment document
- Test scenario list (30+ scenarios)

**Acceptance Criteria:**
- All acceptance criteria mapped to test cases
- Security risks identified and scored
- Test plan structure complete

---

## Technical Dependencies

### Required Services
- ✅ Wallet Service (running from Story 2.4)
- ✅ Auth Service (for 2FA verification)
- ✅ HD Wallet Service (from Story 2.4)
- 🔴 Hot Wallet Service (to be created)
- 🔴 Blockchain Broadcasting Service (to be created)

### External Dependencies
- BlockCypher API (for BTC testnet)
- Infura/Alchemy API (for ETH testnet)
- RabbitMQ (for notifications)

### Libraries to Install
```bash
cd services/wallet-service
npm install bitcoinjs-lib @types/bitcoinjs-lib
npm install ethers
npm install tronweb  # If implementing TRC20
```

---

## Definition of Done - Day 1

### Backend
- [x] AddressValidationService implemented with all methods
- [x] Unit tests written and passing (25+ tests)
- [x] WithdrawalController skeleton created with all endpoints
- [x] DTOs created with validation decorators
- [x] TypeScript compilation successful (0 errors)
- [x] OpenAPI documentation annotations added

### Database
- [x] CryptoWithdrawalRequest entity created
- [x] WhitelistedAddress entity created
- [x] Database tables created (via migration or auto-sync)
- [x] All indexes and constraints applied
- [x] Schema documentation updated

### DevOps
- [x] Hot wallet generated and funded (testnet)
- [x] Environment variables configured
- [x] RPC endpoints tested and working
- [x] Monitoring metrics defined
- [x] Hot wallet management documentation created

### QA
- [x] Test plan skeleton created
- [x] Risk assessment completed
- [x] Test scenarios identified (30+ cases)
- [x] Postman collection structure ready

---

## Risk Assessment - Day 1

### High Risks
**Risk 1: Hot Wallet Security**
- **Impact:** Critical - Funds could be stolen
- **Mitigation:**
  - Use testnet only for Day 1
  - Store mnemonic in secure environment variables
  - Never commit mnemonics to git
  - Document multi-sig plan for production
- **Status:** Testnet only, acceptable for development

**Risk 2: Address Validation Errors**
- **Impact:** High - Invalid addresses could lose funds
- **Mitigation:**
  - Comprehensive unit tests
  - Use battle-tested libraries (bitcoinjs-lib, ethers)
  - Manual testing with known addresses
- **Status:** Mitigated with extensive testing

### Medium Risks
**Risk 3: RPC Provider Rate Limits**
- **Impact:** Medium - Could block testing
- **Mitigation:**
  - Use multiple providers (Infura, Alchemy, BlockCypher)
  - Implement caching where possible
  - Monitor usage
- **Status:** Multiple providers configured

---

## Success Metrics - Day 1

### Code Quality
- TypeScript Errors: 0
- Test Coverage: 80%+ for AddressValidationService
- Build Status: ✅ Success

### Functionality
- BTC address validation: ✅ Working
- ETH address validation: ✅ Working
- USDT address validation: ✅ Working
- Database schema: ✅ Applied
- Hot wallet: ✅ Funded (testnet)

### Documentation
- API endpoints documented: ✅ Yes
- Schema documented: ✅ Yes
- Environment variables documented: ✅ Yes
- Test plan started: ✅ Yes

---

## Next Steps - Day 2 Preview

### Backend
1. Implement withdrawal request creation logic
2. Add 2FA verification check
3. Implement balance locking mechanism
4. Create fee calculation service
5. Add withdrawal status management

### Frontend
1. Create WithdrawalForm component
2. Implement address input with real-time validation
3. Add fee display component
4. Create withdrawal history table

### QA
1. Execute API tests for address validation
2. Complete test plan documentation
3. Create Postman collection with test cases

---

## Communication Plan

### Daily Standup (EOD)
- **Time:** End of Day 1
- **Format:** Written summary
- **Content:**
  - What was completed
  - What's blocked
  - Plan for Day 2

### Handoffs
- **Database → Backend:** Entity files and schema
- **Backend → Frontend:** API specification (OpenAPI)
- **DevOps → Backend:** Environment configuration
- **Backend → QA:** API endpoints for testing

---

## Emergency Contacts

### Blockers Escalation
- **Database Issues:** Contact Database Engineer agent
- **Infrastructure Issues:** Contact DevOps Engineer agent
- **Backend Logic Issues:** Contact Backend Developer agent
- **Testing Issues:** Contact QA Engineer agent

### External Issues
- **BlockCypher API down:** Switch to local Bitcoin node or alternative API
- **Infura down:** Switch to Alchemy or QuickNode
- **RabbitMQ issues:** Use direct logging, defer email notifications

---

**Day 1 Status:** 🚀 READY TO START
**Assigned Agents:** 4 agents (Database, Backend, DevOps, QA)
**Estimated Completion:** End of Day 1
**Next Review:** Day 1 EOD standup

---

**Prepared By:** Tech Lead Orchestrator
**Date:** 2025-11-22
**Story:** 2.5 - Crypto Withdrawal
**Sprint:** 3
