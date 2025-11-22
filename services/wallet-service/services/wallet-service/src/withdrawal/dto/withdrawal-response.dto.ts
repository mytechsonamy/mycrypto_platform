import { ApiProperty } from '@nestjs/swagger';

/**
 * WithdrawalResponseDto
 * Response format for a single withdrawal request
 *
 * Story 2.5: Crypto Withdrawal
 */
export class WithdrawalResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'BTC' })
  currency: string;

  @ApiProperty({ example: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' })
  destinationAddress: string;

  @ApiProperty({ example: '0.001' })
  amount: string;

  @ApiProperty({ example: '0.00001' })
  networkFee: string;

  @ApiProperty({ example: '0.0005' })
  platformFee: string;

  @ApiProperty({ example: '0.00151' })
  totalAmount: string;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'APPROVED', 'BROADCASTING', 'CONFIRMED', 'FAILED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ example: null, nullable: true })
  transactionHash: string | null;

  @ApiProperty({ example: 0 })
  confirmations: number;

  @ApiProperty({ example: false })
  requiresAdminApproval: boolean;

  @ApiProperty({ example: '2024-11-22T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-11-22T10:30:00Z' })
  updatedAt: Date;
}

/**
 * WithdrawalHistoryResponseDto
 * Paginated list of withdrawal requests
 */
export class WithdrawalHistoryResponseDto {
  @ApiProperty({ type: [WithdrawalResponseDto] })
  withdrawals: WithdrawalResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

/**
 * WithdrawalFeeResponseDto
 * Current withdrawal fees for a currency
 */
export class WithdrawalFeeResponseDto {
  @ApiProperty({ example: 'BTC' })
  currency: string;

  @ApiProperty({ example: '0.0005' })
  platformFee: string;

  @ApiProperty({ example: '0.00001', description: 'Current network fee (dynamic)' })
  networkFee: string;

  @ApiProperty({ example: '0.00051' })
  totalFee: string;

  @ApiProperty({ example: '0.001' })
  minimumWithdrawal: string;

  @ApiProperty({ example: '10.0' })
  maximumWithdrawal: string;
}
