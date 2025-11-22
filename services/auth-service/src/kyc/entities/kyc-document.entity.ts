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
import { KycSubmission } from './kyc-submission.entity';

export enum DocumentType {
  ID_FRONT = 'ID_FRONT',
  ID_BACK = 'ID_BACK',
  SELFIE = 'SELFIE',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
}

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  SCANNING = 'SCANNING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

@Entity('kyc_documents')

export class KycDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  @Index()
  submissionId: string;

  @ManyToOne(() => KycSubmission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission: KycSubmission;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    name: 'document_type',
    type: 'varchar',
    length: 50,
  })
  @Index()
  documentType: DocumentType;

  @Column({
    type: 'varchar',
    length: 50,
    default: DocumentStatus.UPLOADED,
  })
  @Index()
  status: DocumentStatus;

  // File information
  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_hash', type: 'varchar', length: 64 })
  fileHash: string;

  // Storage information
  @Column({ name: 's3_bucket', type: 'varchar', length: 100 })
  s3Bucket: string;

  @Column({ name: 's3_key', type: 'varchar', length: 500 })
  s3Key: string;

  @Column({ name: 's3_url', type: 'varchar', length: 1000 })
  s3Url: string;

  @Column({ name: 'encrypted', type: 'boolean', default: true })
  encrypted: boolean;

  // Virus scanning
  @Column({ name: 'virus_scan_result', type: 'varchar', length: 50, nullable: true })
  virusScanResult: string;

  @Column({ name: 'virus_scanned_at', type: 'timestamp with time zone', nullable: true })
  virusScannedAt: Date;

  // Metadata
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
