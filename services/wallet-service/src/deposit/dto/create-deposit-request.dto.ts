import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsUUID, Min, Max } from 'class-validator';

/**
 * DTO for creating a TRY deposit request
 */
export class CreateDepositRequestDto {
  @ApiProperty({
    description: 'Deposit amount in TRY',
    example: 1000,
    minimum: 100,
    maximum: 50000,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsNotEmpty({ message: 'Amount is required' })
  @Min(100, { message: 'Minimum deposit amount is 100 TRY' })
  @Max(50000, { message: 'Maximum deposit amount is 50,000 TRY' })
  amount: number;

  @ApiProperty({
    description: 'Bank account ID to use for this deposit',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'Fiat account ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Fiat account ID is required' })
  fiatAccountId: string;
}
