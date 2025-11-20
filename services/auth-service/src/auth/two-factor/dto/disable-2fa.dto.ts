import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';

/**
 * Request DTO for disabling 2FA
 */
export class Disable2FADto {
  @ApiProperty({
    description: 'Current 6-digit TOTP code for verification',
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
    description: 'Current account password for additional security',
    example: 'MySecurePassword123!',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

/**
 * Response DTO for 2FA disable request
 */
export class Disable2FAResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Confirmation email sent. Please check your email to complete disabling 2FA.',
  })
  message: string;
}

/**
 * Request DTO for confirming 2FA disable via email link
 */
export class ConfirmDisable2FADto {
  @ApiProperty({
    description: 'Confirmation token from email',
    example: 'disable_2fa_confirm_abc123',
  })
  @IsNotEmpty()
  @IsString()
  confirmation_token: string;
}

/**
 * Response DTO for successful 2FA disable confirmation
 */
export class ConfirmDisable2FAResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Two-factor authentication has been disabled successfully.',
  })
  message: string;
}