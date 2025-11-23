import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BankAccount } from './bank-account.entity';

/**
 * FiatWithdrawalRequest Entity
 * Tracks fiat withdrawal requests from users
 *
 * Story 2.6: Fiat Withdrawal - Phase 1
 * - Withdrawal workflow: PENDING → APPROVED → PROCESSING → COMPLETED
 * - Admin approval required for amounts > $10,000
 * - 2FA verification required
 * - Fee calculation and balance locking
 */

export enum FiatWithdrawalStatus {
  PENDING = 'PENDING', // Waiting for 2FA or admin approval
  APPROVED = 'APPROVED', // Approved, ready to process
  PROCESSING = 'PROCESSING', // Being processed by payment provider
  COMPLETED = 'COMPLETED', // Successfully completed
  REJECTED = 'REJECTED', // Rejected by admin
  CANCELLED = 'CANCELLED', // Cancelled by user
  FAILED = 'FAILED', // Processing failed
}

@Entity('fiat_withdrawal_requests')
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
export class FiatWithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['USD', 'EUR', 'TRY', 'GBP', 'CHF', 'PLN', 'SEK', 'NOK', 'DKK'],
  })
  currency: 'USD' | 'EUR' | 'TRY' | 'GBP' | 'CHF' | 'PLN' | 'SEK' | 'NOK' | 'DKK';

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  fee: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount: string; // amount + fee

  @ManyToOne(() => BankAccount)
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount: BankAccount;

  @Column({ name: 'bank_account_id' })
  @Index()
  bankAccountId: string;

  @Column({
    type: 'enum',
    enum: FiatWithdrawalStatus,
    default: FiatWithdrawalStatus.PENDING,
  })
  @Index()
  status: FiatWithdrawalStatus;

  @Column({ name: 'requires_admin_approval', default: false })
  requiresAdminApproval: boolean;

  @Column({ name: 'admin_approved_by', nullable: true })
  adminApprovedBy: string;

  @Column({
    name: 'admin_approved_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  adminApprovedAt: Date;

  @Column({
    name: 'two_fa_verified_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  twoFaVerifiedAt: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string;

  @Column({ name: 'reference_number', nullable: true, length: 100 })
  referenceNumber: string; // Bank transfer reference

  @Column({
    name: 'completed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
