import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * DepositRequest Entity
 * Maps to deposit_requests table
 * Tracks TRY deposit requests via bank transfer
 */
@Entity('deposit_requests')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['userId', 'status'])
export class DepositRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 10, default: 'TRY' })
  currency: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  @Index()
  status: string; // 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'

  @Column({ name: 'fiat_account_id', type: 'uuid', nullable: true })
  fiatAccountId: string | null;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 255, nullable: true })
  transactionReference: string | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ name: 'receipt_url', type: 'text', nullable: true })
  receiptUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;
}
