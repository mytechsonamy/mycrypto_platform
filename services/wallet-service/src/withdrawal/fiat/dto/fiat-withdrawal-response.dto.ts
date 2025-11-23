import { ApiProperty } from '@nestjs/swagger';
import { FiatWithdrawalRequest, FiatWithdrawalStatus } from '../entities/fiat-withdrawal-request.entity';
import { BankAccountResponseDto } from './bank-account-response.dto';

/**
 * FiatWithdrawalResponseDto
 * Response DTO for fiat withdrawal request information
 *
 * Story 2.6: Fiat Withdrawal - Phase 4
 * - Includes withdrawal status and timeline
 * - Shows fee breakdown
 * - Includes masked bank account details
 */

export class FiatWithdrawalResponseDto {
  @ApiProperty({
    description: 'Withdrawal request ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Currency',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Withdrawal amount (excluding fees)',
    example: '1000.00',
  })
  amount: string;

  @ApiProperty({
    description: 'Withdrawal fee',
    example: '5.00',
  })
  fee: string;

  @ApiProperty({
    description: 'Total amount (amount + fee)',
    example: '1005.00',
  })
  totalAmount: string;

  @ApiProperty({
    description: 'Bank account details (masked)',
    type: BankAccountResponseDto,
  })
  bankAccount: BankAccountResponseDto;

  @ApiProperty({
    description: 'Withdrawal status',
    enum: FiatWithdrawalStatus,
    example: FiatWithdrawalStatus.PENDING,
  })
  status: FiatWithdrawalStatus;

  @ApiProperty({
    description: 'Whether admin approval is required',
    example: false,
  })
  requiresAdminApproval: boolean;

  @ApiProperty({
    description: 'Admin who approved (if applicable)',
    example: 'admin-user-id',
    nullable: true,
  })
  adminApprovedBy?: string;

  @ApiProperty({
    description: 'Admin approval timestamp',
    example: '2025-01-15T10:35:00Z',
    nullable: true,
  })
  adminApprovedAt?: Date;

  @ApiProperty({
    description: '2FA verification timestamp',
    example: '2025-01-15T10:30:00Z',
    nullable: true,
  })
  twoFaVerifiedAt?: Date;

  @ApiProperty({
    description: 'Error message (if failed)',
    example: null,
    nullable: true,
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Admin notes',
    example: null,
    nullable: true,
  })
  adminNotes?: string;

  @ApiProperty({
    description: 'Bank transfer reference number',
    example: 'WIRE-2025-001234',
    nullable: true,
  })
  referenceNumber?: string;

  @ApiProperty({
    description: 'Completion timestamp',
    example: '2025-01-15T12:00:00Z',
    nullable: true,
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Request creation timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  updatedAt: Date;

  static fromEntity(
    entity: FiatWithdrawalRequest,
    includeBankAccount = true,
  ): FiatWithdrawalResponseDto {
    const dto = new FiatWithdrawalResponseDto();
    dto.id = entity.id;
    dto.currency = entity.currency;
    dto.amount = entity.amount;
    dto.fee = entity.fee;
    dto.totalAmount = entity.totalAmount;
    dto.status = entity.status;
    dto.requiresAdminApproval = entity.requiresAdminApproval;
    dto.adminApprovedBy = entity.adminApprovedBy;
    dto.adminApprovedAt = entity.adminApprovedAt;
    dto.twoFaVerifiedAt = entity.twoFaVerifiedAt;
    dto.errorMessage = entity.errorMessage;
    dto.adminNotes = entity.adminNotes;
    dto.referenceNumber = entity.referenceNumber;
    dto.completedAt = entity.completedAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    if (includeBankAccount && entity.bankAccount) {
      dto.bankAccount = BankAccountResponseDto.fromEntity(entity.bankAccount);
    }

    return dto;
  }
}
