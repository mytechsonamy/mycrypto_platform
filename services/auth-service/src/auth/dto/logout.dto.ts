import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Optional device information for audit logging',
    example: 'iPhone 12 - Safari',
  })
  @IsOptional()
  @IsString()
  device_info?: string;
}

export class LogoutResponseDto {
  success: boolean;
  message: string;
}