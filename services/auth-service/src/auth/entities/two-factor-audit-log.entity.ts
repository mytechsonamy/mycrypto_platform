import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Valid action types for 2FA audit log
 */
export enum TwoFactorAuditAction {
  SETUP = 'setup',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  VERIFY_SUCCESS = 'verify_success',
  VERIFY_FAILED = 'verify_failed',
  BACKUP_USED = 'backup_used',
  BACKUP_REGENERATED = 'backup_regenerated',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

/**
 * Entity for auditing all 2FA related security events
 *
 * This table is essential for:
 * - Security monitoring and alerting
 * - Compliance and audit trails
 * - Detecting suspicious activity
 * - User support for 2FA issues
 */
@Entity('two_factor_audit_log')
@Index('idx_2fa_audit_user_id', ['userId'])
@Index('idx_2fa_audit_created_at', ['createdAt'])
@Index('idx_2fa_audit_action', ['action'])
export class TwoFactorAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    name: 'user_id',
  })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 50,
  })
  action: TwoFactorAuditAction;

  @Column({
    type: 'inet',
    nullable: true,
    name: 'ip_address',
  })
  ipAddress: string | null;

  @Column({
    type: 'text',
    nullable: true,
    name: 'user_agent',
  })
  userAgent: string | null;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata: Record<string, any> | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
  })
  createdAt: Date;
}
