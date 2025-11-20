import { ApiProperty } from '@nestjs/swagger';

/**
 * Single wallet balance DTO
 */
export class WalletBalanceDto {
  @ApiProperty({
    description: 'Currency code',
    example: 'TRY',
    enum: ['TRY', 'BTC', 'ETH', 'USDT'],
  })
  currency: string;

  @ApiProperty({
    description: 'Available balance for trading and withdrawals',
    example: '1000.00',
  })
  availableBalance: string;

  @ApiProperty({
    description: 'Balance locked in pending orders or withdrawals',
    example: '250.00',
  })
  lockedBalance: string;

  @ApiProperty({
    description: 'Total balance (available + locked)',
    example: '1250.00',
  })
  totalBalance: string;
}
