import { ApiProperty } from '@nestjs/swagger';
import { WalletBalanceDto } from './wallet-balance.dto';

/**
 * Wallet balances data wrapper
 */
export class WalletBalancesData {
  @ApiProperty({
    description: 'Array of wallet balances',
    type: [WalletBalanceDto],
  })
  wallets: WalletBalanceDto[];
}

/**
 * Response metadata
 */
export class ResponseMeta {
  @ApiProperty({
    description: 'Response timestamp',
    example: '2025-11-20T10:30:45.123Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request ID for tracing',
    example: 'req_abc123',
    required: false,
  })
  requestId?: string;
}

/**
 * Response DTO for GET /wallet/balances endpoint
 */
export class WalletBalanceResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Wallet balances data',
    type: WalletBalancesData,
  })
  data: WalletBalancesData;

  @ApiProperty({
    description: 'Response metadata',
    type: ResponseMeta,
    required: false,
  })
  meta?: ResponseMeta;
}
