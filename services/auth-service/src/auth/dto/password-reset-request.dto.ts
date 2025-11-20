import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PasswordResetRequestDto {
  @ApiProperty({
    description: 'Email address to send password reset link',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  email: string;

  @ApiPropertyOptional({
    description: 'reCAPTCHA token for bot protection',
    example: '03AGdBq24PBCcvp...',
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}

export class PasswordResetRequestResponseDto {
  success: boolean;
  message: string;
}