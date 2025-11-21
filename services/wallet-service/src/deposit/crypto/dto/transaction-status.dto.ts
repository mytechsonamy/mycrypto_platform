import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for blockchain transaction status response
 */
export class TransactionStatusDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Transaction hash',
    example: '0x742d35cc6634c0532925a3b844bc9e7fe6b1f9f8a9c1f9f8a9c1f9f8a9c1f9f8',
  })
  txHash: string;

  @ApiProperty({
    description: 'Cryptocurrency type',
    example: 'BTC',
  })
  currency: string;

  @ApiProperty({
    description: 'Deposit amount',
    example: '0.05000000',
  })
  amount: string;

  @ApiProperty({
    description: 'USD equivalent',
    example: '1500.00',
    nullable: true,
  })
  amountUsd: string;

  @ApiProperty({
    description: 'Transaction status',
    example: 'CONFIRMED',
    enum: ['PENDING', 'CONFIRMED', 'CREDITED', 'FAILED'],
  })
  status: string;

  @ApiProperty({
    description: 'Number of confirmations',
    example: 3,
  })
  confirmations: number;

  @ApiProperty({
    description: 'Required confirmations',
    example: 3,
  })
  requiredConfirmations: number;

  @ApiProperty({
    description: 'From address',
    example: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  })
  fromAddress: string;

  @ApiProperty({
    description: 'To address (user deposit address)',
    example: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  })
  toAddress: string;

  @ApiProperty({
    description: 'Block height',
    example: '800000',
    nullable: true,
  })
  blockHeight: string;

  @ApiProperty({
    description: 'Block time',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  blockTime: Date;

  @ApiProperty({
    description: 'When the transaction was credited to wallet',
    example: '2024-01-01T00:30:00.000Z',
    nullable: true,
  })
  creditedAt: Date;

  @ApiProperty({
    description: 'Transaction creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * DTO for deposit history response
 */
export class DepositHistoryDto {
  @ApiProperty({
    description: 'Array of deposit transactions',
    type: [TransactionStatusDto],
  })
  transactions: TransactionStatusDto[];

  @ApiProperty({
    description: 'Total number of deposits',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Page size',
    example: 20,
  })
  pageSize: number;
}
