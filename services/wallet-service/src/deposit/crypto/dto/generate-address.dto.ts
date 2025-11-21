import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum CryptoCurrency {
  BTC = 'BTC',
  ETH = 'ETH',
  USDT = 'USDT',
}

/**
 * DTO for generating a new deposit address
 */
export class GenerateAddressDto {
  @ApiProperty({
    description: 'Cryptocurrency type',
    enum: CryptoCurrency,
    example: 'BTC',
  })
  @IsEnum(CryptoCurrency)
  @IsNotEmpty()
  currency: CryptoCurrency;
}

/**
 * DTO for deposit address response
 */
export class DepositAddressResponseDto {
  @ApiProperty({
    description: 'Address ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;

  @ApiProperty({
    description: 'Cryptocurrency type',
    enum: CryptoCurrency,
    example: 'BTC',
  })
  currency: string;

  @ApiProperty({
    description: 'Blockchain deposit address',
    example: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  })
  address: string;

  @ApiProperty({
    description: 'QR code URL for the address',
    example: 'https://api.qrserver.com/v1/create-qr-code/?data=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  })
  qrCodeUrl: string;

  @ApiProperty({
    description: 'Number of confirmations required',
    example: 3,
  })
  requiredConfirmations: number;

  @ApiProperty({
    description: 'Estimated confirmation time',
    example: '30-60 minutes',
  })
  estimatedConfirmationTime: string;

  @ApiProperty({
    description: 'Address creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
