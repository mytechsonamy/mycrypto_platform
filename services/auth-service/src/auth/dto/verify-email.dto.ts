import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
} from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
    description: 'Email verification token (64-character hex string)',
    minLength: 64,
    maxLength: 64,
  })
  @IsString({ message: 'Token metin formatında olmalıdır' })
  @IsNotEmpty({ message: 'Doğrulama token\'ı zorunludur' })
  @Length(64, 64, { message: 'Doğrulama token\'ı 64 karakter olmalıdır' })
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'Geçersiz doğrulama token formatı',
  })
  token: string;
}