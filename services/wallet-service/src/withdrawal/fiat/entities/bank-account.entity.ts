import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * BankAccount Entity
 * Stores user bank account details for fiat withdrawals
 *
 * Story 2.6: Fiat Withdrawal - Phase 1
 * - Supports USD (account number + routing number)
 * - Supports EUR/TRY/GBP (IBAN + SWIFT)
 * - Account verification workflow
 */

@Entity('bank_accounts')
@Index(['userId', 'currency'])
export class BankAccount {
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

  @Column({ name: 'bank_name', length: 255 })
  bankName: string;

  @Column({ nullable: true, length: 34 })
  iban: string; // For EUR/TRY/GBP (max 34 chars per IBAN standard)

  @Column({ name: 'swift_code', nullable: true, length: 11 })
  swiftCode: string; // For international transfers (8 or 11 chars)

  @Column({ name: 'account_number', nullable: true, length: 17 })
  accountNumber: string; // For USD (6-17 digits)

  @Column({ name: 'routing_number', nullable: true, length: 9 })
  routingNumber: string; // For USD (9 digits - ABA routing number)

  @Column({ name: 'account_holder_name', length: 255 })
  accountHolderName: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({
    name: 'verified_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  verifiedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
