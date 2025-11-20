import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for withdrawal request
 */
export class WithdrawalResponseDto {
  @ApiProperty({
    description: 'Withdrawal request ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  withdrawalId: string;

  @ApiProperty({
    description: 'Withdrawal amount in TRY',
    example: '1000.00',
  })
  amount: string;

  @ApiProperty({
    description: 'Withdrawal fee (flat 5 TRY)',
    example: '5.00',
  })
  fee: string;

  @ApiProperty({
    description: 'Net amount (amount - fee) to be received',
    example: '995.00',
  })
  netAmount: string;

  @ApiProperty({
    description: 'Fiat account ID receiving the funds',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  fiatAccountId: string;

  @ApiProperty({
    description: 'Withdrawal status',
    example: 'PENDING',
    enum: ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED'],
  })
  status: string;

  @ApiProperty({
    description: 'Withdrawal request creation timestamp',
    example: '2025-11-20T10:30:45.123Z',
  })
  createdAt: Date;
}
