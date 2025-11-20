import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

/**
 * Request DTO for verifying and enabling 2FA during setup
 */
export class Verify2FADto {
  @ApiProperty({
    description: 'The 6-digit TOTP code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must contain only digits' })
  code: string;

  @ApiProperty({
    description: 'Temporary setup token received from setup endpoint',
    example: 'tmp_2fa_setup_abc123',
  })
  @IsNotEmpty()
  @IsString()
  setup_token: string;
}

/**
 * Response DTO for successful 2FA verification during setup
 */
export class Verify2FAResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Two-factor authentication enabled successfully',
  })
  message: string;
}