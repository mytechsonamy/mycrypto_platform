import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to resend verification to',
  })
  @IsEmail({}, { message: 'Geçersiz email formatı' })
  @IsNotEmpty({ message: 'Email adresi zorunludur' })
  @MaxLength(255, { message: 'Email adresi 255 karakterden uzun olamaz' })
  email: string;
}