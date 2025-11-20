import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * LedgerEntry Entity
 * Maps to ledger_entries table
 * Immutable audit trail for all balance changes (double-entry bookkeeping)
 */
@Entity('ledger_entries')
@Index(['userId'])
@Index(['createdAt'])
@Index(['referenceId', 'referenceType'])
@Index(['userId', 'currency'])
@Index(['type'])
@Index(['userId', 'createdAt'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string; // 'TRY', 'BTC', 'ETH', 'USDT'

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'DEPOSIT', 'WITHDRAWAL', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'REFUND', 'ADMIN_ADJUSTMENT'

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: string; // Positive for credit, negative for debit

  @Column({ name: 'balance_before', type: 'decimal', precision: 20, scale: 8 })
  balanceBefore: string;

  @Column({ name: 'balance_after', type: 'decimal', precision: 20, scale: 8 })
  balanceAfter: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null; // 'DEPOSIT_REQUEST', 'WITHDRAWAL_REQUEST', 'TRADE', 'ADMIN_ADJUSTMENT'

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @Index()
  createdAt: Date;
}
