import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * BlockchainTransaction Entity
 * Tracks cryptocurrency deposit transactions (BTC, ETH, USDT)
 * Monitors confirmations and credits user wallets when confirmed
 */
@Entity('blockchain_transactions')
@Index(['txHash'])
@Index(['userId', 'status'])
@Index(['currency', 'status'])
@Index(['blockchainAddressId'])
export class BlockchainTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'blockchain_address_id', type: 'uuid' })
  blockchainAddressId: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string; // BTC, ETH, USDT

  @Column({ name: 'tx_hash', type: 'varchar', length: 100 })
  @Index()
  txHash: string; // Blockchain transaction hash

  @Column({ name: 'from_address', type: 'varchar', length: 100 })
  fromAddress: string;

  @Column({ name: 'to_address', type: 'varchar', length: 100 })
  toAddress: string; // User's deposit address

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: string; // Amount received (in BTC/ETH/USDT)

  @Column({ name: 'amount_usd', type: 'decimal', precision: 15, scale: 2, nullable: true })
  amountUsd: string; // USD equivalent at time of deposit

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string; // PENDING, CONFIRMED, CREDITED, FAILED

  @Column({ type: 'integer', default: 0 })
  confirmations: number;

  @Column({ name: 'required_confirmations', type: 'integer' })
  requiredConfirmations: number; // BTC: 3, ETH/USDT: 12

  @Column({ name: 'block_height', type: 'bigint', nullable: true })
  blockHeight: string;

  @Column({ name: 'block_time', type: 'timestamp with time zone', nullable: true })
  blockTime: Date;

  @Column({ name: 'blockcypher_webhook_id', type: 'varchar', length: 100, nullable: true })
  blockcypherWebhookId: string;

  @Column({ name: 'blockchain_response', type: 'jsonb', nullable: true })
  blockchainResponse: Record<string, any>; // Full BlockCypher API response

  @Column({ name: 'credited_at', type: 'timestamp with time zone', nullable: true })
  creditedAt: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
