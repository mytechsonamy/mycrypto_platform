import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * Request DTO for verifying 2FA during login challenge
 */
export class VerifyChallengeDto {
  @ApiProperty({
    description: 'Challenge token received from login response',
    example: 'challenge_abc123def456',
  })
  @IsNotEmpty()
  @IsString()
  challengeToken: string;

  @ApiProperty({
    description: '6-digit TOTP code or 8-character backup code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\d{6}|[A-Z0-9]{4}-[A-Z0-9]{4})$/, {
    message: 'Code must be a 6-digit TOTP code or backup code in format XXXX-XXXX',
  })
  code: string;
}

/**
 * Response DTO for successful 2FA verification
 */
export class VerifyChallengeResponseDto {
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
    description: 'Token type',
    example: 'Bearer',
  })
  token_type: string;

  @ApiProperty({
    description: 'Access token expiry time in seconds',
    example: 900,
  })
  expires_in: number;
}