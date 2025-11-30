import { IsEnum, IsOptional, IsNumberString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AlertType } from '../entities/price-alert.entity';

export class UpdatePriceAlertDto {
  @ApiProperty({
    description: 'Alert type: above or below target price',
    enum: AlertType,
    example: 'above',
    required: false,
  })
  @IsOptional()
  @IsEnum(AlertType)
  alertType?: AlertType;

  @ApiProperty({
    description: 'Target price to trigger alert',
    example: '50000.00',
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  targetPrice?: string;

  @ApiProperty({
    description: 'Whether the alert is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
