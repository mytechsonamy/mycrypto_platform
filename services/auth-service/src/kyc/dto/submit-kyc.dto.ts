import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  Matches,
  Length,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { KycLevel } from '../entities/kyc-submission.entity';

export class SubmitKycDto {
  @ApiProperty({
    description: 'KYC level to apply for',
    enum: KycLevel,
    example: KycLevel.LEVEL_1,
    default: KycLevel.LEVEL_1,
  })
  @IsEnum(KycLevel)
  @IsOptional()
  level?: KycLevel = KycLevel.LEVEL_1;

  @ApiProperty({
    description: 'Turkish ID number (TC Kimlik No)',
    example: '12345678901',
    minLength: 11,
    maxLength: 11,
  })
  @IsString()
  @IsNotEmpty({ message: 'TC Kimlik No zorunludur' })
  @Length(11, 11, { message: 'TC Kimlik No 11 haneli olmalıdır' })
  @Matches(/^[1-9][0-9]{10}$/, {
    message: 'Geçerli bir TC Kimlik No giriniz',
  })
  @Transform(({ value }) => value?.trim())
  tcKimlikNo: string;

  @ApiProperty({
    description: 'First name (as on ID)',
    example: 'Ahmet',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Ad zorunludur' })
  @Length(2, 100, { message: 'Ad 2-100 karakter arası olmalıdır' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    description: 'Last name (as on ID)',
    example: 'Yılmaz',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Soyad zorunludur' })
  @Length(2, 100, { message: 'Soyad 2-100 karakter arası olmalıdır' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({
    description: 'Date of birth (YYYY-MM-DD)',
    example: '1990-01-15',
    format: 'date',
  })
  @IsDateString({}, { message: 'Geçerli bir doğum tarihi giriniz (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Doğum tarihi zorunludur' })
  dateOfBirth: string;

  @ApiProperty({
    description: 'Phone number (Turkish format)',
    example: '+905551234567',
    pattern: '^\\+905[0-9]{9}$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Telefon numarası zorunludur' })
  @Matches(/^\+905[0-9]{9}$/, {
    message: 'Geçerli bir Türkiye telefon numarası giriniz (+905XXXXXXXXX)',
  })
  @Transform(({ value }) => value?.trim())
  phone: string;

  @ApiProperty({
    description: 'ID card front photo (multipart/form-data)',
    type: 'string',
    format: 'binary',
    required: true,
  })
  idFront: any; // Will be handled by multer

  @ApiProperty({
    description: 'ID card back photo (multipart/form-data)',
    type: 'string',
    format: 'binary',
    required: true,
  })
  idBack: any; // Will be handled by multer

  @ApiProperty({
    description: 'Selfie with ID card (multipart/form-data)',
    type: 'string',
    format: 'binary',
    required: true,
  })
  selfie: any; // Will be handled by multer

  @ApiProperty({
    description: 'Address proof document (optional, multipart/form-data)',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  addressProof?: any; // Will be handled by multer
}
