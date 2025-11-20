import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for deposit request response
 */
export class DepositResponseDto {
  @ApiProperty({
    description: 'Deposit request ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  depositId: string;

  @ApiProperty({
    description: 'Deposit amount in TRY',
    example: '1000.00',
  })
  amount: string;

  @ApiProperty({
    description: 'Exchange virtual IBAN to transfer money to',
    example: 'TR330006100519786457841326',
  })
  virtualIban: string;

  @ApiProperty({
    description: 'Unique reference code for the transfer',
    example: 'DEP-20251120-ABC123',
  })
  reference: string;

  @ApiProperty({
    description: 'Current status of the deposit',
    example: 'PENDING',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
  })
  status: string;

  @ApiProperty({
    description: 'When the deposit request expires',
    example: '2025-11-21T10:30:45.123Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'When the deposit request was created',
    example: '2025-11-20T10:30:45.123Z',
  })
  createdAt: Date;
}

/**
 * DTO for deposit status response
 */
export class DepositStatusResponseDto {
  @ApiProperty({
    description: 'Deposit request ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  depositId: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;

  @ApiProperty({
    description: 'Deposit amount in TRY',
    example: '1000.00',
  })
  amount: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'TRY',
  })
  currency: string;

  @ApiProperty({
    description: 'Current status of the deposit',
    example: 'PENDING',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
  })
  status: string;

  @ApiProperty({
    description: 'Transaction reference code',
    example: 'DEP-20251120-ABC123',
    nullable: true,
  })
  transactionReference: string | null;

  @ApiProperty({
    description: 'Admin notes',
    example: 'Verified and approved',
    nullable: true,
  })
  adminNotes: string | null;

  @ApiProperty({
    description: 'When the deposit request was created',
    example: '2025-11-20T10:30:45.123Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the deposit request was last updated',
    example: '2025-11-20T10:30:45.123Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'When the deposit was completed',
    example: '2025-11-20T10:35:45.123Z',
    nullable: true,
  })
  completedAt: Date | null;
}
