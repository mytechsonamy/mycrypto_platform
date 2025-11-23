import { IsString, IsEnum, IsNotEmpty, ValidateIf, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * AddBankAccountDto
 * Request DTO for adding a new bank account
 *
 * Story 2.6: Fiat Withdrawal - Phase 3
 * - Validates currency-specific requirements
 * - IBAN + SWIFT for EUR/TRY/GBP/etc.
 * - Account Number + Routing Number for USD
 */

export enum BankAccountCurrency {
  USD = 'USD',
  EUR = 'EUR',
  TRY = 'TRY',
  GBP = 'GBP',
  CHF = 'CHF',
  PLN = 'PLN',
  SEK = 'SEK',
  NOK = 'NOK',
  DKK = 'DKK',
}

export class AddBankAccountDto {
  @ApiProperty({
    description: 'Currency for this bank account',
    enum: BankAccountCurrency,
    example: 'EUR',
  })
  @IsEnum(BankAccountCurrency)
  @IsNotEmpty()
  currency: BankAccountCurrency;

  @ApiProperty({
    description: 'Bank name',
    example: 'Deutsche Bank',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  bankName: string;

  @ApiProperty({
    description: 'Account holder full name (must match KYC verified name)',
    example: 'John Doe',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  accountHolderName: string;

  // IBAN (required for EUR, TRY, GBP, CHF, PLN, SEK, NOK, DKK)
  @ApiProperty({
    description: 'IBAN (International Bank Account Number) - Required for EUR, TRY, GBP, etc.',
    example: 'DE89370400440532013000',
    required: false,
    maxLength: 34,
  })
  @ValidateIf((o) =>
    ['EUR', 'TRY', 'GBP', 'CHF', 'PLN', 'SEK', 'NOK', 'DKK'].includes(o.currency),
  )
  @IsString()
  @IsNotEmpty()
  @Length(15, 34) // IBAN min 15, max 34 chars
  @Matches(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, {
    message: 'IBAN must start with 2-letter country code followed by 2 check digits',
  })
  iban?: string;

  // SWIFT/BIC (optional for IBAN accounts, recommended for international transfers)
  @ApiProperty({
    description: 'SWIFT/BIC code (8 or 11 characters) - Optional for IBAN accounts',
    example: 'DEUTDEFF',
    required: false,
    maxLength: 11,
  })
  @ValidateIf((o) => o.swiftCode)
  @IsString()
  @Length(8, 11)
  @Matches(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
    message: 'SWIFT/BIC must be 8 or 11 characters (AAAABBCCXXX)',
  })
  swiftCode?: string;

  // US Account Number (required for USD)
  @ApiProperty({
    description: 'US bank account number (6-17 digits) - Required for USD',
    example: '1234567890',
    required: false,
    maxLength: 17,
  })
  @ValidateIf((o) => o.currency === 'USD')
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6,17}$/, {
    message: 'Account number must be 6-17 digits',
  })
  accountNumber?: string;

  // US Routing Number (required for USD)
  @ApiProperty({
    description: 'US ABA routing number (9 digits) - Required for USD',
    example: '021000021',
    required: false,
    maxLength: 9,
  })
  @ValidateIf((o) => o.currency === 'USD')
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{9}$/, {
    message: 'Routing number must be exactly 9 digits',
  })
  routingNumber?: string;
}
