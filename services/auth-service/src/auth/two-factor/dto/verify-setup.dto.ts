import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

/**
 * Request DTO for verifying setup and enabling 2FA
 */
export class VerifySetupDto {
  @ApiProperty({
    description: 'Setup token received from /2fa/setup endpoint',
    example: 'setup_token_abc123',
  })
  @IsNotEmpty()
  @IsString()
  setupToken: string;

  @ApiProperty({
    description: '6-digit TOTP code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must contain only digits' })
  code: string;
}

/**
 * Response DTO for successful 2FA setup verification
 */
export class VerifySetupResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Two-factor authentication has been enabled successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of backup codes (show once only)',
    example: ['A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0', 'U1V2-W3X4', 'Y5Z6-A7B8', 'C9D0-E1F2', 'G3H4-I5J6', 'K7L8-M9N0'],
    type: [String],
  })
  backupCodes: string[];
}