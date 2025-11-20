import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for bank account response
 */
export class BankAccountResponseDto {
  @ApiProperty({
    description: 'Bank account ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'Ahmet Yılmaz',
  })
  accountHolderName: string;

  @ApiProperty({
    description: 'Turkish IBAN',
    example: 'TR330006100519786457841326',
  })
  iban: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Türkiye İş Bankası',
  })
  bankName: string;

  @ApiProperty({
    description: 'Whether the account is verified',
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Date when the account was verified',
    example: '2025-11-20T10:30:45.123Z',
    nullable: true,
  })
  verifiedAt: Date | null;

  @ApiProperty({
    description: 'Date when the account was created',
    example: '2025-11-20T10:30:45.123Z',
  })
  createdAt: Date;
}
