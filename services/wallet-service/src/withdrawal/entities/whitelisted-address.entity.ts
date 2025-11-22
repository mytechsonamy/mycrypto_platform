import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * WhitelistedAddress Entity
 * Stores user-verified external wallet addresses for crypto withdrawals
 * Implements address whitelisting security feature
 *
 * Story 2.5: Crypto Withdrawal
 * - Users can add trusted wallet addresses with friendly labels
 * - First-time addresses require email verification
 * - Prevents typos and increases security
 * - Unique constraint: One user cannot add the same address twice for a currency
 */
@Entity('whitelisted_addresses')
@Unique(['userId', 'currency', 'address'])
@Index(['userId'])
@Index(['isVerified'])
@Index(['userId', 'currency'])
export class WhitelistedAddress {
  /**
   * Unique identifier (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the user who owns this whitelisted address
   * Foreign key to users.id in auth-service
   */
  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  /**
   * Cryptocurrency type
   * Enum: BTC, ETH, USDT
   */
  @Column({ type: 'enum', enum: ['BTC', 'ETH', 'USDT'] })
  currency: 'BTC' | 'ETH' | 'USDT';

  /**
   * External wallet address
   * Format validated based on currency (BTC/ETH address checksum)
   * Must be unique per user+currency combination
   */
  @Column({ type: 'varchar', length: 100 })
  address: string;

  /**
   * User-friendly label for the address
   * Examples: "My Ledger Wallet", "Binance BTC", "Hardware Wallet"
   * Max 100 characters
   */
  @Column({ type: 'varchar', length: 100 })
  label: string;

  /**
   * Verification status
   * False: Email verification pending
   * True: Address verified and can be used for withdrawals
   */
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  @Index()
  isVerified: boolean;

  /**
   * Email verification token
   * Generated on address creation
   * Single-use token sent to user's email
   * Null after verification
   */
  @Column({ name: 'verification_token', type: 'varchar', length: 100, nullable: true })
  verificationToken: string | null;

  /**
   * Timestamp when address was verified
   * Null if not yet verified
   */
  @Column({ name: 'verified_at', type: 'timestamp with time zone', nullable: true })
  verifiedAt: Date | null;

  /**
   * Network/chain for USDT addresses
   * ERC-20 (Ethereum) or TRC-20 (Tron)
   * Null for BTC/ETH
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  network: string | null;

  /**
   * Total amount withdrawn to this address
   * Tracked for analytics and risk management
   * Decimal(20,8) for 8 decimal places precision
   */
  @Column({
    name: 'total_withdrawn',
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: '0',
  })
  totalWithdrawn: string;

  /**
   * Number of withdrawals to this address
   * Tracked for analytics
   */
  @Column({ name: 'withdrawal_count', type: 'integer', default: 0 })
  withdrawalCount: number;

  /**
   * Last time this address was used for withdrawal
   * Null if never used
   */
  @Column({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true })
  lastUsedAt: Date | null;

  /**
   * Admin notes (internal use only)
   * Used for compliance, investigation, or flagging suspicious addresses
   */
  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  /**
   * Flag to disable address (without deleting)
   * Admin can disable suspicious addresses
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Timestamp when address was added
   * Auto-generated on insert
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  /**
   * Timestamp when address was last updated
   * Auto-updated on every change
   */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
