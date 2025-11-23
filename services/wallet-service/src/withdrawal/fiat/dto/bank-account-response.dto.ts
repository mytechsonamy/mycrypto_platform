import { ApiProperty } from '@nestjs/swagger';
import { BankAccount } from '../entities/bank-account.entity';

/**
 * BankAccountResponseDto
 * Response DTO for bank account information
 *
 * Story 2.6: Fiat Withdrawal - Phase 3
 * - Masks sensitive information (partial IBAN, partial account number)
 * - Includes verification status
 */

export class BankAccountResponseDto {
  @ApiProperty({
    description: 'Bank account ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Currency',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Deutsche Bank',
  })
  bankName: string;

  @ApiProperty({
    description: 'Masked IBAN (last 4 digits visible)',
    example: 'DE89 **** **** **** 3000',
    nullable: true,
  })
  maskedIban?: string;

  @ApiProperty({
    description: 'Masked account number (last 4 digits visible)',
    example: '****7890',
    nullable: true,
  })
  maskedAccountNumber?: string;

  @ApiProperty({
    description: 'SWIFT/BIC code',
    example: 'DEUTDEFF',
    nullable: true,
  })
  swiftCode?: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'John Doe',
  })
  accountHolderName: string;

  @ApiProperty({
    description: 'Account verification status',
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Account verification timestamp',
    example: '2025-01-15T10:30:00Z',
    nullable: true,
  })
  verifiedAt?: Date;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: Date;

  static fromEntity(entity: BankAccount): BankAccountResponseDto {
    const dto = new BankAccountResponseDto();
    dto.id = entity.id;
    dto.currency = entity.currency;
    dto.bankName = entity.bankName;
    dto.accountHolderName = entity.accountHolderName;
    dto.isVerified = entity.isVerified;
    dto.verifiedAt = entity.verifiedAt;
    dto.createdAt = entity.createdAt;

    // Mask IBAN (show only last 4 digits)
    if (entity.iban) {
      const last4 = entity.iban.slice(-4);
      const country = entity.iban.substring(0, 2);
      dto.maskedIban = `${country}** **** **** **** ${last4}`;
    }

    // Mask US account number (show only last 4 digits)
    if (entity.accountNumber) {
      const last4 = entity.accountNumber.slice(-4);
      dto.maskedAccountNumber = `****${last4}`;
    }

    // SWIFT code is not sensitive, show fully
    dto.swiftCode = entity.swiftCode;

    return dto;
  }
}
