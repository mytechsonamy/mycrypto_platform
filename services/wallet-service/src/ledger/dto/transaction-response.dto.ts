import { ApiProperty } from '@nestjs/swagger';

/**
 * Transaction item DTO
 * Represents a single transaction in the ledger
 */
export class TransactionItemDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'TRY',
  })
  currency: string;

  @ApiProperty({
    description: 'Transaction type',
    example: 'DEPOSIT',
    enum: ['DEPOSIT', 'WITHDRAWAL', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'REFUND', 'ADMIN_ADJUSTMENT'],
  })
  type: string;

  @ApiProperty({
    description: 'Transaction amount (positive for credit, negative for debit)',
    example: '1000.00',
  })
  amount: string;

  @ApiProperty({
    description: 'Balance before transaction',
    example: '5000.00',
  })
  balanceBefore: string;

  @ApiProperty({
    description: 'Balance after transaction',
    example: '6000.00',
  })
  balanceAfter: string;

  @ApiProperty({
    description: 'Reference ID (e.g., deposit_request_id, withdrawal_request_id)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  referenceId: string | null;

  @ApiProperty({
    description: 'Reference type',
    example: 'DEPOSIT_REQUEST',
    nullable: true,
  })
  referenceType: string | null;

  @ApiProperty({
    description: 'Transaction description',
    example: 'TRY deposit via bank transfer',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Additional metadata',
    example: { bankName: 'Ziraat Bank', iban: 'TR330006100519786457841326' },
    nullable: true,
  })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Transaction creation timestamp',
    example: '2025-11-20T10:30:45.123Z',
  })
  createdAt: Date;
}

/**
 * Pagination metadata
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;
}

/**
 * Transaction history response DTO
 */
export class TransactionResponseDto {
  @ApiProperty({
    description: 'List of transactions',
    type: [TransactionItemDto],
  })
  transactions: TransactionItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
