import { IsString, IsEnum, IsNotEmpty, IsNumber, Min, Max, IsUUID, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * CreateFiatWithdrawalDto
 * Request DTO for creating a fiat withdrawal request
 *
 * Story 2.6: Fiat Withdrawal - Phase 4
 * - Validates withdrawal amount against limits
 * - Requires 2FA code
 * - Validates bank account ownership
 */

export enum FiatWithdrawalCurrency {
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

export class CreateFiatWithdrawalDto {
  @ApiProperty({
    description: 'Currency to withdraw',
    enum: FiatWithdrawalCurrency,
    example: 'USD',
  })
  @IsEnum(FiatWithdrawalCurrency)
  @IsNotEmpty()
  currency: FiatWithdrawalCurrency;

  @ApiProperty({
    description: 'Amount to withdraw (excluding fees)',
    example: 1000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Bank account ID (must be owned by user and verified)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  bankAccountId: string;

  @ApiProperty({
    description: '2FA verification code (6 digits)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: '2FA code must be 6 digits',
  })
  twoFaCode: string;
}
