import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * WithdrawalRequest Entity
 * Maps to withdrawal_requests table
 * Tracks TRY withdrawal requests to bank accounts
 */
@Entity('withdrawal_requests')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['userId', 'status'])
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 10, default: 'TRY' })
  currency: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 5 })
  fee: string; // Flat 5 TRY fee

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  @Index()
  status: string; // 'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'

  @Column({ name: 'fiat_account_id', type: 'uuid' })
  fiatAccountId: string;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 255, nullable: true })
  transactionReference: string | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ name: 'two_fa_verified', type: 'boolean', default: false })
  twoFaVerified: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  /**
   * Computed property: Net amount = amount - fee
   * This is calculated in-memory, not stored in database
   * Database has this as GENERATED column, but TypeORM doesn't sync it
   */
  get netAmount(): string {
    const amountNum = parseFloat(this.amount) || 0;
    const feeNum = parseFloat(this.fee) || 0;
    return (amountNum - feeNum).toFixed(2);
  }
}
