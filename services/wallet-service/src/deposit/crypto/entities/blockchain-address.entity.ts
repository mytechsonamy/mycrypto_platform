import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * BlockchainAddress Entity
 * Stores HD Wallet generated addresses for BTC, ETH, and USDT (ERC-20) deposits
 * Each user gets unique deposit addresses for each cryptocurrency
 */
@Entity('blockchain_addresses')
@Index(['userId', 'currency'])
@Index(['address'])
@Index(['currency', 'addressIndex'])
export class BlockchainAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string; // BTC, ETH, USDT

  @Column({ type: 'varchar', length: 100, unique: true })
  address: string;

  @Column({ name: 'address_index', type: 'integer' })
  addressIndex: number; // BIP-44 address index

  @Column({ name: 'derivation_path', type: 'varchar', length: 100 })
  derivationPath: string; // e.g., m/44'/0'/0'/0/0

  @Column({ name: 'public_key', type: 'varchar', length: 200, nullable: true })
  publicKey: string;

  @Column({ name: 'qr_code_url', type: 'varchar', length: 500, nullable: true })
  qrCodeUrl: string; // QR code for deposit address

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true })
  lastUsedAt: Date;

  @Column({ name: 'total_received', type: 'decimal', precision: 20, scale: 8, default: '0' })
  totalReceived: string; // Total amount received at this address

  @Column({ name: 'transaction_count', type: 'integer', default: 0 })
  transactionCount: number; // Number of transactions received

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
