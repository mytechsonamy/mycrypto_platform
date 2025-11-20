import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Entity for storing encrypted TOTP secrets for two-factor authentication
 *
 * Security considerations:
 * - The secret_encrypted field contains AES-256 encrypted TOTP secret
 * - Decryption should only occur in memory during validation
 * - Never log or expose the decrypted secret
 */
@Entity('two_factor_auth')
export class TwoFactorAuth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    unique: true,
    name: 'user_id',
  })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'secret_encrypted',
  })
  secretEncrypted: string;

  @Column({
    type: 'boolean',
    default: false,
    name: 'is_enabled',
  })
  isEnabled: boolean;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'verified_at',
  })
  verifiedAt: Date | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
  })
  updatedAt: Date;
}
