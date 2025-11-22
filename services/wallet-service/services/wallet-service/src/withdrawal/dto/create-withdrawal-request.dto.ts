import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  Matches,
  IsNumberString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateWithdrawalRequestDto
 * Data Transfer Object for creating a cryptocurrency withdrawal request
 *
 * Story 2.5: Crypto Withdrawal
 */
export class CreateWithdrawalRequestDto {
  @ApiProperty({
    enum: ['BTC', 'ETH', 'USDT'],
    example: 'BTC',
    description: 'Cryptocurrency to withdraw',
  })
  @IsEnum(['BTC', 'ETH', 'USDT'])
  @IsNotEmpty()
  currency: 'BTC' | 'ETH' | 'USDT';

  @ApiProperty({
    example: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    description: 'External wallet address to send funds to',
  })
  @IsString()
  @IsNotEmpty()
  destinationAddress: string;

  @ApiProperty({
    example: '0.001',
    description: 'Amount to withdraw (as decimal string)',
  })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    enum: ['ERC20', 'TRC20'],
    required: false,
    example: 'ERC20',
    description: 'Network for USDT withdrawals (ERC20 or TRC20)',
  })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit 2FA code for withdrawal verification',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: '2FA code must be 6 digits' })
  twoFaCode: string;

  @ApiProperty({
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of whitelisted address (if using whitelist)',
  })
  @IsOptional()
  @IsUUID()
  whitelistedAddressId?: string;
}
