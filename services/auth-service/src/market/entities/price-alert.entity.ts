import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AlertType {
  ABOVE = 'above',
  BELOW = 'below',
}

@Entity('price_alerts')
@Index('idx_price_alerts_user_id', ['userId'])
@Index('idx_price_alerts_symbol', ['symbol'])
@Index('idx_price_alerts_active', ['isActive'])
@Index('idx_price_alerts_user_symbol', ['userId', 'symbol'])
export class PriceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    name: 'user_id',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  symbol: string;

  @Column({
    type: 'enum',
    enum: AlertType,
    name: 'alert_type',
  })
  alertType: AlertType;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
    name: 'target_price',
  })
  targetPrice: string;

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_active',
  })
  isActive: boolean;

  @Column({
    type: 'integer',
    default: 0,
    name: 'notifications_sent',
  })
  notificationsSent: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'triggered_at',
  })
  triggeredAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'last_checked_at',
  })
  lastCheckedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
