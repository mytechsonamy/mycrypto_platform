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

export class CreateCryptoWithdrawalDto {
  @ApiProperty({ enum: ['BTC', 'ETH', 'USDT'], example: 'BTC' })
  @IsEnum(['BTC', 'ETH', 'USDT'])
  @IsNotEmpty()
  currency: 'BTC' | 'ETH' | 'USDT';

  @ApiProperty({ example: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' })
  @IsString()
  @IsNotEmpty()
  destinationAddress: string;

  @ApiProperty({ example: '0.001' })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ enum: ['ERC20', 'TRC20'], required: false })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/)
  twoFaCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  whitelistedAddressId?: string;
}
