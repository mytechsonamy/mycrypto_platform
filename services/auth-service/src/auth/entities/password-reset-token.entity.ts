import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('password_reset_tokens')
@Index('idx_password_reset_tokens_user_id', ['user_id'])
@Index('idx_password_reset_tokens_token_hash', ['token_hash'], { unique: true })
@Index('idx_password_reset_tokens_expires_at', ['expires_at'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    name: 'user_id',
  })
  user_id: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 64,
    comment: 'SHA-256 hash of the reset token (64 chars hex)',
  })
  token_hash: string;

  @Column({
    type: 'timestamp with time zone',
    comment: 'Token expiration timestamp (1 hour from creation)',
  })
  expires_at: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp when token was consumed (NULL if unused)',
  })
  used_at: Date | null;

  @Column({
    type: 'inet',
    nullable: true,
    comment: 'IP address that requested the password reset',
  })
  ip_address: string | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Browser/client user agent from reset request',
  })
  user_agent: string | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Timestamp when the reset token was created',
  })
  created_at: Date;

  /**
   * Check if the token is valid (not expired and not used)
   */
  isValid(): boolean {
    return !this.used_at && new Date() < this.expires_at;
  }

  /**
   * Check if the token has been used
   */
  isUsed(): boolean {
    return this.used_at !== null;
  }

  /**
   * Check if the token has expired
   */
  isExpired(): boolean {
    return new Date() >= this.expires_at;
  }
}
