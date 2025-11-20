import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

/**
 * Request DTO for validating 2FA code during login
 */
export class Validate2FADto {
  @ApiProperty({
    description: '6-digit TOTP code or 8-character backup code',
    example: '123456',
    minLength: 6,
    maxLength: 9, // 8 chars + 1 hyphen for backup codes
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\d{6}|[A-Z0-9]{4}-[A-Z0-9]{4})$/, {
    message: 'Code must be a 6-digit TOTP code or backup code in format XXXX-XXXX',
  })
  code: string;

  @ApiProperty({
    description: 'Partial JWT token received from initial login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  @IsString()
  partial_token: string;

  @ApiPropertyOptional({
    description: 'Whether to trust this device for 30 days',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  trust_device?: boolean = false;
}

/**
 * Response DTO for successful 2FA validation during login
 */
export class Validate2FAResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Access token expiry time in seconds',
    example: 900,
  })
  expires_in: number;

  @ApiPropertyOptional({
    description: 'Device trust token if trust_device was true',
    example: 'device_trust_abc123',
    required: false,
  })
  device_token?: string;
}