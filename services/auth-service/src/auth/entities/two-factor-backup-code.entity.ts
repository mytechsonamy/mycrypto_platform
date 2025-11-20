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
 * Entity for storing hashed backup codes for 2FA recovery
 *
 * Security considerations:
 * - Backup codes are hashed with bcrypt before storage
 * - Each code is single-use (marked with used_at timestamp)
 * - Old codes should be deleted when regenerating
 * - Maximum 10 backup codes per user
 *
 * Code format: XXXX-XXXX (8 characters with hyphen)
 */
@Entity('two_factor_backup_codes')
@Index('idx_backup_codes_user_id', ['userId'])
@Index('idx_backup_codes_code_hash', ['codeHash'])
export class TwoFactorBackupCode {
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
    length: 255,
    name: 'code_hash',
  })
  codeHash: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'used_at',
  })
  usedAt: Date | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
  })
  createdAt: Date;

  /**
   * Check if this backup code has been used
   */
  isUsed(): boolean {
    return this.usedAt !== null;
  }
}
