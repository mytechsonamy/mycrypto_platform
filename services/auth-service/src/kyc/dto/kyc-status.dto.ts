import { ApiProperty } from '@nestjs/swagger';
import { KycLevel, KycStatus } from '../entities/kyc-submission.entity';

export class KycStatusDto {
  @ApiProperty({
    description: 'KYC submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'KYC level',
    enum: KycLevel,
    example: KycLevel.LEVEL_1,
  })
  level: KycLevel;

  @ApiProperty({
    description: 'KYC status',
    enum: KycStatus,
    example: KycStatus.PENDING,
  })
  status: KycStatus;

  @ApiProperty({
    description: 'Submission date',
    example: '2025-01-15T10:30:00Z',
  })
  submittedAt: Date;

  @ApiProperty({
    description: 'Review date (if reviewed)',
    example: '2025-01-16T14:20:00Z',
    required: false,
  })
  reviewedAt?: Date;

  @ApiProperty({
    description: 'Rejection reason (if rejected)',
    example: 'Belge okunamıyor',
    required: false,
  })
  rejectionReason?: string;

  @ApiProperty({
    description: 'Estimated review time in hours',
    example: 24,
  })
  estimatedReviewTime: number;

  @ApiProperty({
    description: 'Document verification status',
    example: {
      idFront: 'verified',
      idBack: 'verified',
      selfie: 'pending',
    },
  })
  documentStatus?: Record<string, string>;
}

export class KycLimitsDto {
  @ApiProperty({
    description: 'Current KYC level',
    enum: KycLevel,
    example: KycLevel.LEVEL_1,
  })
  level: KycLevel;

  @ApiProperty({
    description: 'Daily TRY deposit limit',
    example: 50000,
  })
  dailyDepositLimit: number;

  @ApiProperty({
    description: 'Daily TRY withdrawal limit',
    example: 50000,
  })
  dailyWithdrawalLimit: number;

  @ApiProperty({
    description: 'Trading limit (unlimited = -1)',
    example: -1,
  })
  tradingLimit: number;

  @ApiProperty({
    description: 'Is KYC approved',
    example: true,
  })
  isApproved: boolean;
}

export class KycSubmissionResponseDto {
  @ApiProperty({
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Submission status',
    enum: KycStatus,
    example: KycStatus.PENDING,
  })
  status: KycStatus;

  @ApiProperty({
    description: 'Estimated review time message',
    example: '24-48 saat',
  })
  estimatedReviewTime: string;

  @ApiProperty({
    description: 'MKS verification status',
    example: false,
  })
  mksVerified: boolean;

  @ApiProperty({
    description: 'Submission timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  submittedAt: Date;
}
