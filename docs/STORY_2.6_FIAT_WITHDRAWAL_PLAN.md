# Story 2.6: Fiat Withdrawal - Implementation Plan

## Overview
Implement fiat currency withdrawal functionality allowing users to withdraw USD/EUR/TRY to their bank accounts via wire transfer/SEPA/EFT.

## User Story
**As a** verified user with fiat balance
**I want to** withdraw fiat currency to my bank account
**So that** I can transfer my funds to my traditional bank

## Acceptance Criteria
1. ✅ User can add and verify bank account details (IBAN, SWIFT, account number)
2. ✅ System validates IBAN format and SWIFT codes
3. ✅ User can request fiat withdrawal with 2FA verification
4. ✅ Minimum withdrawal limits: USD 10, EUR 10, TRY 100
5. ✅ Maximum daily withdrawal limits: USD 50,000
6. ✅ Withdrawal fees: USD 5, EUR 5, TRY 25 (flat rate)
7. ✅ Admin approval required for withdrawals > $10,000
8. ✅ Withdrawal status tracking (PENDING → APPROVED → PROCESSING → COMPLETED)
9. ✅ Email notifications for status changes
10. ✅ Withdrawal history with filters

## Technical Architecture

### Database Schema

#### BankAccount Entity
```typescript
@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ enum: ['USD', 'EUR', 'TRY'] })
  currency: 'USD' | 'EUR' | 'TRY';

  @Column()
  bankName: string;

  @Column({ nullable: true })
  iban: string; // For EUR/TRY

  @Column({ nullable: true })
  swiftCode: string; // For international transfers

  @Column({ nullable: true })
  accountNumber: string; // For USD

  @Column({ nullable: true })
  routingNumber: string; // For USD (ACH)

  @Column()
  accountHolderName: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### FiatWithdrawalRequest Entity
```typescript
@Entity('fiat_withdrawal_requests')
export class FiatWithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ enum: ['USD', 'EUR', 'TRY'] })
  currency: 'USD' | 'EUR' | 'TRY';

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  fee: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: string; // amount + fee

  @ManyToOne(() => BankAccount)
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount: BankAccount;

  @Column()
  bankAccountId: string;

  @Column({
    enum: ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED']
  })
  status: string;

  @Column({ default: false })
  requiresAdminApproval: boolean;

  @Column({ nullable: true })
  adminApprovedBy: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  adminApprovedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  twoFaVerifiedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ nullable: true })
  referenceNumber: string; // Bank transfer reference

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Services Architecture

#### 1. IBANValidationService
```typescript
interface IBANValidationResult {
  isValid: boolean;
  country?: string;
  bankCode?: string;
  accountNumber?: string;
  error?: string;
}

class IBANValidationService {
  validateIBAN(iban: string): IBANValidationResult;
  validateSWIFT(swift: string): boolean;
  validateUSAccountNumber(accountNumber: string, routingNumber: string): boolean;
}
```

#### 2. BankAccountService
```typescript
class BankAccountService {
  async addBankAccount(userId: string, dto: AddBankAccountDto): Promise<BankAccount>;
  async verifyBankAccount(userId: string, accountId: string): Promise<BankAccount>;
  async getBankAccounts(userId: string, currency?: string): Promise<BankAccount[]>;
  async deleteBankAccount(userId: string, accountId: string): Promise<void>;
}
```

#### 3. FiatWithdrawalService
```typescript
class FiatWithdrawalService {
  async createWithdrawalRequest(userId: string, dto: CreateFiatWithdrawalDto): Promise<FiatWithdrawalRequest>;
  async approveWithdrawal(adminId: string, withdrawalId: string, notes?: string): Promise<FiatWithdrawalRequest>;
  async processWithdrawal(withdrawalId: string): Promise<FiatWithdrawalRequest>;
  async completeWithdrawal(withdrawalId: string, referenceNumber: string): Promise<FiatWithdrawalRequest>;
  async cancelWithdrawal(userId: string, withdrawalId: string): Promise<FiatWithdrawalRequest>;
  async getWithdrawalHistory(userId: string, page: number, limit: number): Promise<PaginatedResult>;
}
```

### API Endpoints

```
POST   /api/v1/wallet/bank-account          - Add bank account
GET    /api/v1/wallet/bank-account          - List bank accounts
DELETE /api/v1/wallet/bank-account/:id      - Remove bank account
POST   /api/v1/wallet/bank-account/:id/verify - Verify bank account

POST   /api/v1/wallet/withdraw/fiat/request - Create withdrawal
GET    /api/v1/wallet/withdraw/fiat/history - Get history
POST   /api/v1/wallet/withdraw/fiat/:id/cancel - Cancel withdrawal
GET    /api/v1/wallet/withdraw/fiat/:id    - Get withdrawal details
GET    /api/v1/wallet/withdraw/fiat/fees/:currency - Get fees
```

### Workflow

#### Withdrawal Creation Flow
```
1. User requests withdrawal
2. Validate 2FA code
3. Validate bank account ownership
4. Check minimum/maximum limits
5. Calculate fees
6. Check user balance (amount + fee)
7. Lock funds in wallet
8. Create withdrawal request
9. Check if admin approval needed (amount > $10,000)
   - If yes: Status = PENDING, wait for admin
   - If no: Status = APPROVED, process immediately
10. Create ledger entry
11. Send email notification
```

#### Processing Flow
```
1. Admin approves (if needed) OR auto-approved
2. Status = PROCESSING
3. Integrate with payment provider API (Stripe Connect, Wise, TransferWise)
4. Initiate bank transfer
5. Status = COMPLETED (when confirmed)
6. Deduct from locked balance
7. Create completion ledger entry
8. Send completion email
```

## Implementation Tasks

### Phase 1: Database & Entities (Day 1)
- [ ] Create migration for bank_accounts table
- [ ] Create migration for fiat_withdrawal_requests table
- [ ] Create BankAccount entity
- [ ] Create FiatWithdrawalRequest entity
- [ ] Add indexes for performance

### Phase 2: Validation Services (Day 1)
- [ ] Implement IBAN validation (with checksum)
- [ ] Implement SWIFT code validation
- [ ] Implement US account number validation
- [ ] Add unit tests for validation logic

### Phase 3: Bank Account Management (Day 2)
- [ ] Implement BankAccountService
- [ ] Implement BankAccountController
- [ ] Add DTOs (AddBankAccountDto, BankAccountResponseDto)
- [ ] Add validation rules
- [ ] Write unit tests (80%+ coverage)

### Phase 4: Fiat Withdrawal Service (Day 3)
- [ ] Implement FiatWithdrawalService
- [ ] Implement FiatWithdrawalController
- [ ] Add DTOs (CreateFiatWithdrawalDto, FiatWithdrawalResponseDto)
- [ ] Implement fee calculation
- [ ] Implement balance locking/unlocking
- [ ] Integrate with TwoFactorVerificationService
- [ ] Write unit tests (80%+ coverage)

### Phase 5: Admin Approval Workflow (Day 4)
- [ ] Create AdminFiatWithdrawalController
- [ ] Implement approval/rejection logic
- [ ] Add admin audit logging
- [ ] Write tests

### Phase 6: Integration & Testing (Day 5)
- [ ] Integration tests
- [ ] E2E tests with Cypress
- [ ] Performance testing
- [ ] Security audit

## Configuration

```env
# Fiat Withdrawal Settings
FIAT_WITHDRAWAL_MIN_USD=10
FIAT_WITHDRAWAL_MIN_EUR=10
FIAT_WITHDRAWAL_MIN_TRY=100

FIAT_WITHDRAWAL_MAX_DAILY_USD=50000
FIAT_WITHDRAWAL_MAX_DAILY_EUR=50000
FIAT_WITHDRAWAL_MAX_DAILY_TRY=2000000

FIAT_WITHDRAWAL_FEE_USD=5
FIAT_WITHDRAWAL_FEE_EUR=5
FIAT_WITHDRAWAL_FEE_TRY=25

FIAT_WITHDRAWAL_ADMIN_APPROVAL_THRESHOLD=10000

# Payment Provider (Future integration)
STRIPE_CONNECT_API_KEY=
WISE_API_KEY=
```

## Testing Strategy

### Unit Tests
- IBANValidationService: 30+ test cases
- BankAccountService: 25+ test cases
- FiatWithdrawalService: 35+ test cases

### Integration Tests
- Bank account CRUD operations
- Withdrawal creation with balance checks
- Admin approval workflow
- Email notifications

### E2E Tests
- Complete withdrawal flow
- Error handling scenarios
- Rate limiting

## Success Metrics
- 80%+ test coverage
- All acceptance criteria met
- < 200ms average API response time
- Zero SQL injection vulnerabilities
- Proper error handling and logging

## Dependencies
- Story 1.1: User Registration ✅
- Story 1.2: Email Verification ✅
- Story 1.3: 2FA Setup ✅
- Story 2.1: Fiat Deposit ✅
- Story 2.2: Wallet Balance ✅

## Risk Mitigation
1. **IBAN Validation Complexity**: Use battle-tested library (ibantools)
2. **Payment Provider Integration**: Start with mock, add real integration later
3. **Fraud Prevention**: Implement velocity checks and anomaly detection
4. **Regulatory Compliance**: Add KYC verification checks

## Next Steps After Story 2.6
- Story 2.7: Transaction History & Reporting
- Story 3.1: Trading Engine Integration
- Story 4.1: Admin Dashboard

---
**Status**: Planning Complete ✅
**Start Date**: 2025-01-23
**Target Completion**: 2025-01-27 (5 days)
