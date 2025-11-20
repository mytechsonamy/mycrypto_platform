import { IsOptional, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for transaction history query parameters
 * Supports filtering by currency, type, date range, and pagination
 */
export class TransactionQueryDto {
  @ApiProperty({
    description: 'Filter by currency',
    example: 'TRY',
    required: false,
    enum: ['TRY', 'BTC', 'ETH', 'USDT'],
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Filter by transaction type',
    example: 'DEPOSIT',
    required: false,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'REFUND', 'ADMIN_ADJUSTMENT'],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Start date (ISO 8601 format)',
    example: '2025-11-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date (ISO 8601 format)',
    example: '2025-11-30T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Page number (1-indexed)',
    example: 1,
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
