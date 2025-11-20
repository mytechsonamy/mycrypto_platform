import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum KycStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  LOCKED = 'LOCKED',
}

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
@Index('idx_users_status', ['status'])
@Index('idx_users_kyc_status', ['kyc_status'])
@Index('idx_users_verification_token', ['email_verification_token_hash'])
@Index('idx_users_two_fa_enabled', ['two_fa_enabled'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  password_hash: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  email_verified: boolean;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  email_verification_token_hash: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  email_verification_token_expires_at: Date;

  @Column({
    type: 'boolean',
    default: false,
  })
  two_fa_enabled: boolean;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  two_fa_secret: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  backup_codes: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  two_fa_enabled_at: Date;

  @Column({
    type: 'boolean',
    default: false,
  })
  terms_accepted: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  kvkk_consent_accepted: boolean;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.NONE,
  })
  kyc_status: KycStatus;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({
    type: 'integer',
    default: 0,
  })
  failed_login_attempts: number;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  locked_until: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  last_login_at: Date;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  last_login_ip: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}