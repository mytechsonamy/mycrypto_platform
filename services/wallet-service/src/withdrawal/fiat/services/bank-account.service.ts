import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { AddBankAccountDto } from '../dto/add-bank-account.dto';
import { BankAccountResponseDto } from '../dto/bank-account-response.dto';
import { IBANValidationService } from './iban-validation.service';

/**
 * BankAccountService
 * Manages user bank accounts for fiat withdrawals
 *
 * Story 2.6: Fiat Withdrawal - Phase 3
 * - Add/remove bank accounts
 * - Validate IBAN/SWIFT/US account details
 * - Account verification workflow
 * - One verified account per currency per user
 */

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    private readonly ibanValidationService: IBANValidationService,
  ) {}

  /**
   * Add a new bank account for a user
   * - Validates IBAN/SWIFT/US account details
   * - Checks for duplicates
   * - Limits to 3 accounts per currency
   */
  async addBankAccount(
    userId: string,
    dto: AddBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    this.logger.log({
      message: 'Adding new bank account',
      userId,
      currency: dto.currency,
    });

    // Validate based on currency
    const accountType = this.ibanValidationService.getAccountType(dto.currency);

    if (accountType === 'IBAN') {
      // Validate IBAN
      if (!dto.iban) {
        throw new BadRequestException(
          `IBAN is required for ${dto.currency} accounts`,
        );
      }

      const ibanValidation = this.ibanValidationService.validateIBAN(dto.iban);
      if (!ibanValidation.isValid) {
        throw new BadRequestException(
          ibanValidation.error || 'Invalid IBAN',
        );
      }

      // Validate SWIFT if provided
      if (dto.swiftCode) {
        const swiftValidation = this.ibanValidationService.validateSWIFT(
          dto.swiftCode,
        );
        if (!swiftValidation.isValid) {
          throw new BadRequestException(
            swiftValidation.error || 'Invalid SWIFT/BIC code',
          );
        }
      }

      // Check for duplicate IBAN
      const existingIban = await this.bankAccountRepository.findOne({
        where: { userId, iban: ibanValidation.iban },
      });

      if (existingIban) {
        throw new BadRequestException(
          'This IBAN is already registered to your account',
        );
      }
    } else if (accountType === 'US_ACCOUNT') {
      // Validate US account
      if (!dto.accountNumber || !dto.routingNumber) {
        throw new BadRequestException(
          'Account number and routing number are required for USD accounts',
        );
      }

      const usAccountValidation = this.ibanValidationService.validateUSAccount(
        dto.accountNumber,
        dto.routingNumber,
      );

      if (!usAccountValidation.isValid) {
        throw new BadRequestException(
          usAccountValidation.error || 'Invalid US account details',
        );
      }

      // Check for duplicate account number
      const existingAccount = await this.bankAccountRepository.findOne({
        where: { userId, accountNumber: dto.accountNumber },
      });

      if (existingAccount) {
        throw new BadRequestException(
          'This account number is already registered to your account',
        );
      }
    } else {
      throw new BadRequestException(
        `Currency ${dto.currency} is not supported`,
      );
    }

    // Check account limit (max 3 per currency)
    const accountCount = await this.bankAccountRepository.count({
      where: { userId, currency: dto.currency },
    });

    if (accountCount >= 3) {
      throw new BadRequestException(
        `Maximum 3 bank accounts allowed per currency. Please remove an existing account first.`,
      );
    }

    // Create bank account
    const bankAccount = this.bankAccountRepository.create({
      userId,
      currency: dto.currency,
      bankName: dto.bankName,
      accountHolderName: dto.accountHolderName,
      iban: dto.iban?.toUpperCase(),
      swiftCode: dto.swiftCode?.toUpperCase(),
      accountNumber: dto.accountNumber,
      routingNumber: dto.routingNumber,
      isVerified: false, // Requires manual verification
    });

    const savedAccount = await this.bankAccountRepository.save(bankAccount);

    this.logger.log({
      message: 'Bank account added successfully',
      userId,
      accountId: savedAccount.id,
      currency: savedAccount.currency,
    });

    return BankAccountResponseDto.fromEntity(savedAccount);
  }

  /**
   * Get all bank accounts for a user
   * - Optional currency filter
   * - Returns masked account details
   */
  async getBankAccounts(
    userId: string,
    currency?: string,
  ): Promise<BankAccountResponseDto[]> {
    const where: any = { userId };
    if (currency) {
      where.currency = currency;
    }

    const accounts = await this.bankAccountRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return accounts.map((account) =>
      BankAccountResponseDto.fromEntity(account),
    );
  }

  /**
   * Get a specific bank account by ID
   * - Verifies ownership
   */
  async getBankAccountById(
    userId: string,
    accountId: string,
  ): Promise<BankAccountResponseDto> {
    const account = await this.bankAccountRepository.findOne({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    return BankAccountResponseDto.fromEntity(account);
  }

  /**
   * Delete a bank account
   * - Verifies ownership
   * - Cannot delete if used in pending withdrawals
   */
  async deleteBankAccount(userId: string, accountId: string): Promise<void> {
    const account = await this.bankAccountRepository.findOne({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    // TODO: Check for pending withdrawals when withdrawal service is implemented
    // For now, allow deletion

    await this.bankAccountRepository.remove(account);

    this.logger.log({
      message: 'Bank account deleted',
      userId,
      accountId,
    });
  }

  /**
   * Verify a bank account (admin operation)
   * - Marks account as verified
   * - Only one verified account per currency per user
   */
  async verifyBankAccount(
    accountId: string,
    adminUserId: string,
  ): Promise<BankAccountResponseDto> {
    const account = await this.bankAccountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    if (account.isVerified) {
      throw new BadRequestException('Bank account is already verified');
    }

    // Unverify other accounts for same currency
    await this.bankAccountRepository.update(
      { userId: account.userId, currency: account.currency },
      { isVerified: false, verifiedAt: null },
    );

    // Verify this account
    account.isVerified = true;
    account.verifiedAt = new Date();

    const savedAccount = await this.bankAccountRepository.save(account);

    this.logger.log({
      message: 'Bank account verified',
      accountId,
      userId: account.userId,
      adminUserId,
    });

    return BankAccountResponseDto.fromEntity(savedAccount);
  }

  /**
   * Get verified bank account for a currency
   * - Returns null if no verified account exists
   */
  async getVerifiedBankAccount(
    userId: string,
    currency: string,
  ): Promise<BankAccount | null> {
    return this.bankAccountRepository.findOne({
      where: { userId, currency: currency as any, isVerified: true },
    });
  }

  /**
   * Internal: Get bank account entity (for withdrawal service)
   */
  async getBankAccountEntity(
    userId: string,
    accountId: string,
  ): Promise<BankAccount> {
    const account = await this.bankAccountRepository.findOne({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    if (!account.isVerified) {
      throw new ForbiddenException(
        'Bank account must be verified before use. Please contact support.',
      );
    }

    return account;
  }
}
