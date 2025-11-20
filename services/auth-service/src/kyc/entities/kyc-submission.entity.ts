import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum KycLevel {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
}

export enum KycStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('kyc_submissions')
@Index(['userId'])
@Index(['status'])
@Index(['tcKimlikNo'])
@Index(['userId', 'status'])
@Index(['createdAt'])
export class KycSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: KycLevel.LEVEL_1,
  })
  level: KycLevel;

  @Column({
    type: 'varchar',
    length: 20,
    default: KycStatus.PENDING,
  })
  @Index()
  status: KycStatus;

  // Turkish ID fields
  @Column({ name: 'tc_kimlik_no', type: 'varchar', length: 11, nullable: true })
  @Index()
  tcKimlikNo: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  // Document storage URLs
  @Column({ name: 'id_front_url', type: 'varchar', length: 500, nullable: true })
  idFrontUrl: string;

  @Column({ name: 'id_back_url', type: 'varchar', length: 500, nullable: true })
  idBackUrl: string;

  @Column({ name: 'selfie_url', type: 'varchar', length: 500, nullable: true })
  selfieUrl: string;

  @Column({ name: 'address_proof_url', type: 'varchar', length: 500, nullable: true })
  addressProofUrl: string;

  // MKS verification
  @Column({ name: 'mks_verification_id', type: 'varchar', length: 100, nullable: true })
  mksVerificationId: string;

  @Column({ name: 'mks_response', type: 'jsonb', nullable: true })
  mksResponse: Record<string, any>;

  @Column({ name: 'mks_verified', type: 'boolean', default: false })
  mksVerified: boolean;

  // Audit fields
  @Column({ name: 'submitted_at', type: 'timestamp with time zone', nullable: true })
  submittedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamp with time zone', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
