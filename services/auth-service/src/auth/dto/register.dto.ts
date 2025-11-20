import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
  IsNotEmpty,
  Equals,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Geçersiz email formatı' })
  @IsNotEmpty({ message: 'Email adresi zorunludur' })
  @MaxLength(255, { message: 'Email adresi 255 karakterden uzun olamaz' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password - min 8 chars, 1 uppercase, 1 number, 1 special char',
    minLength: 8,
  })
  @IsString({ message: 'Şifre metin formatında olmalıdır' })
  @IsNotEmpty({ message: 'Şifre zorunludur' })
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @MaxLength(128, { message: 'Şifre 128 karakterden uzun olamaz' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Şifre en az 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermelidir',
    },
  )
  password: string;

  @ApiProperty({
    example: true,
    description: 'Terms and conditions acceptance',
  })
  @IsBoolean({ message: 'Kullanım şartları kabul durumu boolean olmalıdır' })
  @IsNotEmpty({ message: 'Kullanım şartlarını kabul etmelisiniz' })
  terms_accepted: boolean;

  @ApiProperty({
    example: true,
    description: 'KVKK (GDPR) consent',
  })
  @IsBoolean({ message: 'KVKK onay durumu boolean olmalıdır' })
  @IsNotEmpty({ message: 'KVKK metnini onaylamalısınız' })
  @Equals(true, { message: 'KVKK onayı zorunludur' })
  kvkk_consent_accepted: boolean;
}