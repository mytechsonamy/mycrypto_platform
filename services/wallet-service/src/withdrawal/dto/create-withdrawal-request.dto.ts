import { IsNotEmpty, IsNumber, IsString, IsUUID, Min, Max, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a TRY withdrawal request
 * Requires 2FA verification
 */
export class CreateWithdrawalRequestDto {
  @ApiProperty({
    description: 'Withdrawal amount in TRY',
    example: 1000,
    minimum: 100,
    maximum: 50000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(100, { message: 'Minimum withdrawal amount is 100 TRY' })
  @Max(50000, { message: 'Maximum withdrawal amount is 50,000 TRY' })
  amount: number;

  @ApiProperty({
    description: 'Fiat account ID to receive funds',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Invalid fiat account ID format' })
  fiatAccountId: string;

  @ApiProperty({
    description: '6-digit 2FA code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: '2FA code must be exactly 6 digits' })
  twoFaCode: string;
}
