import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

/**
 * DTO for adding a bank account
 */
export class AddBankAccountDto {
  @ApiProperty({
    description: 'Account holder name (must match KYC name)',
    example: 'Ahmet Yılmaz',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Account holder name is required' })
  @MaxLength(255, { message: 'Account holder name must not exceed 255 characters' })
  accountHolderName: string;

  @ApiProperty({
    description: 'Turkish IBAN (TR followed by 24 digits)',
    example: 'TR330006100519786457841326',
    pattern: '^TR[0-9]{24}$',
  })
  @IsString()
  @IsNotEmpty({ message: 'IBAN is required' })
  @Matches(/^TR[0-9]{24}$/, {
    message: 'IBAN must be in Turkish format (TR followed by 24 digits)',
  })
  iban: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Türkiye İş Bankası',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Bank name is required' })
  @MaxLength(100, { message: 'Bank name must not exceed 100 characters' })
  bankName: string;
}
