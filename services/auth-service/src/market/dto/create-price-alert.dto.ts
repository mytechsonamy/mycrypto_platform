import { IsEnum, IsNotEmpty, IsString, IsNumberString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AlertType } from '../entities/price-alert.entity';

export class CreatePriceAlertDto {
  @ApiProperty({
    description: 'Trading pair symbol (e.g., BTC/USD, ETH/USD)',
    example: 'BTC/USD',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{3,10}\/[A-Z]{3,10}$/, {
    message: 'Symbol must be in format XXX/YYY (e.g., BTC/USD)',
  })
  symbol: string;

  @ApiProperty({
    description: 'Alert type: above or below target price',
    enum: AlertType,
    example: 'above',
  })
  @IsNotEmpty()
  @IsEnum(AlertType)
  alertType: AlertType;

  @ApiProperty({
    description: 'Target price to trigger alert',
    example: '50000.00',
  })
  @IsNotEmpty()
  @IsNumberString()
  targetPrice: string;
}
