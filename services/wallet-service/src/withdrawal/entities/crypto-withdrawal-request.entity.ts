import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * CryptoWithdrawalRequest Entity
 * Tracks cryptocurrency withdrawal requests (BTC, ETH, USDT)
 * Manages approval workflow, 2FA verification, and blockchain broadcasting
 *
 * Story 2.5: Crypto Withdrawal
 * - Supports BTC, ETH, USDT withdrawals to external wallets
 * - Requires 2FA verification
 * - Admin approval for withdrawals > $10,000
 * - Tracks network fees and platform fees separately
 * - Monitors blockchain confirmations
 */
@Entity('crypto_withdrawal_requests')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['transactionHash'])
@Index(['userId', 'status'])
export class CryptoWithdrawalRequest {
  /**
   * Unique identifier (UUID v4)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the user making the withdrawal
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
   * External wallet address where crypto will be sent
   * Format validated based on currency (BTC/ETH address checksum)
   */
  @Column({ name: 'destination_address', type: 'varchar', length: 100 })
  destinationAddress: string;

  /**
   * Amount to withdraw (in BTC/ETH/USDT)
   * Decimal(20,8) for 8 decimal places precision
   * Minimum: BTC=0.001, ETH=0.01, USDT=10
   */
  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: string;

  /**
   * Blockchain network fee (dynamic, fetched from blockchain)
   * Paid to miners/validators
   * Decimal(20,8) for 8 decimal places precision
   */
  @Column({ name: 'network_fee', type: 'decimal', precision: 20, scale: 8 })
  networkFee: string;

  /**
   * Platform fee charged by the exchange
   * Fixed: BTC=0.0005, ETH=0.005, USDT=1
   * Decimal(20,8) for 8 decimal places precision
   */
  @Column({ name: 'platform_fee', type: 'decimal', precision: 20, scale: 8 })
  platformFee: string;

  /**
   * Total amount deducted from user's wallet
   * Calculated: amount + network_fee + platform_fee
   * Decimal(20,8) for 8 decimal places precision
   */
  @Column({ name: 'total_amount', type: 'decimal', precision: 20, scale: 8 })
  totalAmount: string;

  /**
   * Withdrawal status
   * PENDING: Waiting for 2FA verification
   * APPROVED: Admin approved (if required), ready to broadcast
   * BROADCASTING: Transaction being sent to blockchain
   * CONFIRMED: Transaction confirmed on blockchain
   * FAILED: Transaction failed (network error, insufficient balance, etc.)
   * CANCELLED: User or admin cancelled the request
   */
  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'BROADCASTING', 'CONFIRMED', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
  })
  @Index()
  status: 'PENDING' | 'APPROVED' | 'BROADCASTING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

  /**
   * Blockchain transaction hash (txid)
   * Null until transaction is broadcasted
   */
  @Column({ name: 'transaction_hash', type: 'varchar', length: 100, nullable: true })
  @Index()
  transactionHash: string | null;

  /**
   * Number of confirmations received
   * Updated by blockchain monitoring service
   * Required confirmations: BTC=3, ETH/USDT=12
   */
  @Column({ type: 'integer', default: 0 })
  confirmations: number;

  /**
   * Flag indicating if admin approval is required
   * True if withdrawal amount > $10,000 USD equivalent
   */
  @Column({ name: 'requires_admin_approval', type: 'boolean', default: false })
  requiresAdminApproval: boolean;

  /**
   * Admin who approved the withdrawal
   * Foreign key to users.id (admin user)
   * Null if no admin approval required or not yet approved
   */
  @Column({ name: 'admin_approved_by', type: 'uuid', nullable: true })
  adminApprovedBy: string | null;

  /**
   * Timestamp when admin approved the withdrawal
   * Null if not yet approved or no approval required
   */
  @Column({ name: 'admin_approved_at', type: 'timestamp with time zone', nullable: true })
  adminApprovedAt: Date | null;

  /**
   * Timestamp when 2FA was successfully verified
   * Required for all withdrawals before processing
   */
  @Column({ name: 'two_fa_verified_at', type: 'timestamp with time zone', nullable: true })
  twoFaVerifiedAt: Date | null;

  /**
   * Error message if withdrawal failed
   * Contains blockchain error or system error details
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  /**
   * Admin notes (internal use only)
   * Used for compliance, investigation, or manual approval reasons
   */
  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  /**
   * USD equivalent amount at time of withdrawal request
   * Used for admin approval threshold calculation
   */
  @Column({ name: 'amount_usd', type: 'decimal', precision: 15, scale: 2, nullable: true })
  amountUsd: string | null;

  /**
   * Full blockchain API response
   * Stores complete response from blockchain node/API
   * JSONB for efficient querying if needed
   */
  @Column({ name: 'blockchain_response', type: 'jsonb', nullable: true })
  blockchainResponse: Record<string, any> | null;

  /**
   * Network/chain for USDT withdrawals
   * ERC-20 (Ethereum) or TRC-20 (Tron)
   * Null for BTC/ETH
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  network: string | null;

  /**
   * Timestamp when withdrawal was created
   * Auto-generated on insert
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @Index()
  createdAt: Date;

  /**
   * Timestamp when withdrawal was last updated
   * Auto-updated on every change
   */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Timestamp when withdrawal was completed (confirmed on blockchain)
   * Null if not yet completed
   */
  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  /**
   * Computed property: Net amount sent to user
   * This is calculated in-memory, not stored in database
   * amount (user receives this amount)
   */
  get netAmount(): string {
    return this.amount;
  }
}
