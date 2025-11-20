import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * UserWallet Entity
 * Maps to user_wallets table
 * Stores user wallet balances for each currency (BTC, ETH, USDT, TRY)
 */
@Entity('user_wallets')
@Index(['userId', 'currency'], { unique: true })
@Index(['userId'])
@Index(['currency'])
export class UserWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string; // 'TRY', 'BTC', 'ETH', 'USDT'

  @Column({
    name: 'available_balance',
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 0,
  })
  availableBalance: string;

  @Column({
    name: 'locked_balance',
    type: 'decimal',
    precision: 20,
    scale: 8,
    default: 0,
  })
  lockedBalance: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Computed property: Total balance = available + locked
   * This is calculated in-memory, not stored in database
   * Database has this as GENERATED column, but TypeORM doesn't sync it
   */
  get totalBalance(): string {
    const available = parseFloat(this.availableBalance) || 0;
    const locked = parseFloat(this.lockedBalance) || 0;
    return (available + locked).toFixed(8);
  }
}
