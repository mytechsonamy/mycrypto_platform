import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * FiatAccount Entity
 * Maps to fiat_accounts table
 * Stores user bank accounts for TRY deposits and withdrawals
 */
@Entity('fiat_accounts')
@Index(['userId', 'iban'], { unique: true })
@Index(['userId'])
@Index(['iban'])
@Index(['isVerified'])
export class FiatAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'account_holder_name', type: 'varchar', length: 255 })
  accountHolderName: string;

  @Column({ type: 'varchar', length: 34 })
  @Index()
  iban: string; // TR format: 26 characters

  @Column({ name: 'bank_name', type: 'varchar', length: 100 })
  bankName: string;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  @Index()
  isVerified: boolean;

  @Column({ name: 'verified_at', type: 'timestamp with time zone', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
