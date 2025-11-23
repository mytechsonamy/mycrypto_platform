import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FiatWithdrawalRequest, FiatWithdrawalStatus } from '../entities/fiat-withdrawal-request.entity';
import { CreateFiatWithdrawalDto } from '../dto/create-fiat-withdrawal.dto';
import { FiatWithdrawalResponseDto } from '../dto/fiat-withdrawal-response.dto';
import { BankAccountService } from './bank-account.service';
import { TwoFactorVerificationService } from '../../services/two-factor-verification.service';
import { UserWallet } from '../../../wallet/entities/user-wallet.entity';
import { LedgerEntry } from '../../../ledger/entities/ledger-entry.entity';

/**
 * FiatWithdrawalService
 * Manages fiat withdrawal requests with 2FA, fee calculation, and admin approval
 *
 * Story 2.6: Fiat Withdrawal - Phase 4
 * - Create withdrawal requests with 2FA verification
 * - Fee calculation based on currency
 * - Balance locking during processing
 * - Admin approval for large amounts (>$10,000)
 * - Withdrawal history with pagination
 */

@Injectable()
export class FiatWithdrawalService {
  private readonly logger = new Logger(FiatWithdrawalService.name);

  // Fee configuration (flat fees per currency)
  private readonly FEES = {
    USD: 5.0,
    EUR: 5.0,
    TRY: 25.0,
    GBP: 5.0,
    CHF: 5.0,
    PLN: 20.0,
    SEK: 50.0,
    NOK: 50.0,
    DKK: 35.0,
  };

  // Minimum withdrawal amounts
  private readonly MIN_AMOUNTS = {
    USD: 10.0,
    EUR: 10.0,
    TRY: 100.0,
    GBP: 10.0,
    CHF: 10.0,
    PLN: 40.0,
    SEK: 100.0,
    NOK: 100.0,
    DKK: 75.0,
  };

  // Maximum daily withdrawal limit (in USD equivalent)
  private readonly MAX_DAILY_WITHDRAWAL_USD = 50000;

  // Admin approval threshold (in USD equivalent)
  private readonly ADMIN_APPROVAL_THRESHOLD_USD = 10000;

  constructor(
    @InjectRepository(FiatWithdrawalRequest)
    private readonly withdrawalRepository: Repository<FiatWithdrawalRequest>,
    @InjectRepository(UserWallet)
    private readonly walletRepository: Repository<UserWallet>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly bankAccountService: BankAccountService,
    private readonly twoFactorService: TwoFactorVerificationService,
  ) {}

  /**
   * Create a new fiat withdrawal request
   * - Verifies 2FA code
   * - Validates bank account ownership and verification
   * - Checks balance and limits
   * - Locks funds in wallet
   * - Creates ledger entry
   */
  async createWithdrawalRequest(
    userId: string,
    dto: CreateFiatWithdrawalDto,
  ): Promise<FiatWithdrawalResponseDto> {
    this.logger.log({
      message: 'Creating fiat withdrawal request',
      userId,
      currency: dto.currency,
      amount: dto.amount,
    });

    // 1. Verify 2FA code
    const twoFaResult = await this.twoFactorService.verify2FACode(
      userId,
      dto.twoFaCode,
    );

    if (!twoFaResult.isValid) {
      throw new BadRequestException(
        twoFaResult.error || 'Invalid 2FA code',
      );
    }

    // 2. Validate bank account (must be verified and owned by user)
    const bankAccount = await this.bankAccountService.getBankAccountEntity(
      userId,
      dto.bankAccountId,
    );

    // 3. Validate currency match
    if (bankAccount.currency !== dto.currency) {
      throw new BadRequestException(
        `Bank account currency (${bankAccount.currency}) does not match withdrawal currency (${dto.currency})`,
      );
    }

    // 4. Validate amount limits
    const minAmount = this.MIN_AMOUNTS[dto.currency];
    if (dto.amount < minAmount) {
      throw new BadRequestException(
        `Minimum withdrawal amount for ${dto.currency} is ${minAmount}`,
      );
    }

    // 5. Calculate fees
    const fee = this.FEES[dto.currency];
    const totalAmount = dto.amount + fee;

    // 6. Check if admin approval required
    const requiresAdminApproval = this.requiresAdminApproval(
      dto.currency,
      dto.amount,
    );

    // 7. Create withdrawal with transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 8. Lock user wallet and check balance
      const wallet = await queryRunner.manager.findOne(UserWallet, {
        where: { userId, currency: dto.currency as any },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new BadRequestException(
          `No wallet found for currency ${dto.currency}`,
        );
      }

      const availableBalance = parseFloat(wallet.availableBalance);
      if (availableBalance < totalAmount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${availableBalance} ${dto.currency}, Required: ${totalAmount} ${dto.currency} (including ${fee} ${dto.currency} fee)`,
        );
      }

      // 9. Check daily withdrawal limit
      await this.checkDailyWithdrawalLimit(
        userId,
        dto.currency,
        dto.amount,
        queryRunner.manager,
      );

      // 10. Lock funds in wallet
      wallet.availableBalance = (availableBalance - totalAmount).toFixed(2);
      wallet.lockedBalance = (
        parseFloat(wallet.lockedBalance) + totalAmount
      ).toFixed(2);
      await queryRunner.manager.save(wallet);

      // 11. Create withdrawal request
      const withdrawal = queryRunner.manager.create(FiatWithdrawalRequest, {
        userId,
        currency: dto.currency,
        amount: dto.amount.toFixed(2),
        fee: fee.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        bankAccountId: dto.bankAccountId,
        status: requiresAdminApproval
          ? FiatWithdrawalStatus.PENDING
          : FiatWithdrawalStatus.APPROVED,
        requiresAdminApproval,
        twoFaVerifiedAt: new Date(),
      });

      const savedWithdrawal = await queryRunner.manager.save(withdrawal);

      // 12. Create ledger entry
      const ledgerEntry = queryRunner.manager.create(LedgerEntry, {
        userId,
        currency: dto.currency,
        amount: `-${totalAmount.toFixed(2)}`,
        type: 'WITHDRAWAL',
        description: `Fiat withdrawal request - ${dto.currency} ${dto.amount.toFixed(2)} (Fee: ${fee.toFixed(2)})`,
        referenceId: savedWithdrawal.id,
        referenceType: 'FIAT_WITHDRAWAL',
        balanceAfter: wallet.availableBalance,
        metadata: {
          withdrawalId: savedWithdrawal.id,
          bankAccountId: dto.bankAccountId,
          fee: fee.toFixed(2),
          requiresAdminApproval,
        },
      });

      await queryRunner.manager.save(ledgerEntry);

      await queryRunner.commitTransaction();

      this.logger.log({
        message: 'Fiat withdrawal request created successfully',
        userId,
        withdrawalId: savedWithdrawal.id,
        amount: dto.amount,
        currency: dto.currency,
        requiresAdminApproval,
      });

      // Load bank account for response
      const withdrawalWithBankAccount = await this.withdrawalRepository.findOne(
        {
          where: { id: savedWithdrawal.id },
          relations: ['bankAccount'],
        },
      );

      return FiatWithdrawalResponseDto.fromEntity(withdrawalWithBankAccount);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error({
        message: 'Failed to create fiat withdrawal request',
        userId,
        error: error.message,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get withdrawal history for a user
   * - Paginated results
   * - Optional status filter
   */
  async getWithdrawalHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: FiatWithdrawalStatus,
  ): Promise<{
    withdrawals: FiatWithdrawalResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [withdrawals, total] = await this.withdrawalRepository.findAndCount({
      where,
      relations: ['bankAccount'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      withdrawals: withdrawals.map((w) =>
        FiatWithdrawalResponseDto.fromEntity(w),
      ),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a specific withdrawal by ID
   * - Verifies ownership
   */
  async getWithdrawalById(
    userId: string,
    withdrawalId: string,
  ): Promise<FiatWithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId, userId },
      relations: ['bankAccount'],
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    return FiatWithdrawalResponseDto.fromEntity(withdrawal);
  }

  /**
   * Cancel a withdrawal request
   * - Only pending/approved withdrawals can be cancelled
   * - Unlocks funds
   */
  async cancelWithdrawal(
    userId: string,
    withdrawalId: string,
  ): Promise<FiatWithdrawalResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawal = await queryRunner.manager.findOne(
        FiatWithdrawalRequest,
        {
          where: { id: withdrawalId, userId },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request not found');
      }

      if (
        withdrawal.status !== FiatWithdrawalStatus.PENDING &&
        withdrawal.status !== FiatWithdrawalStatus.APPROVED
      ) {
        throw new BadRequestException(
          `Cannot cancel withdrawal with status ${withdrawal.status}`,
        );
      }

      // Unlock funds
      const wallet = await queryRunner.manager.findOne(UserWallet, {
        where: { userId, currency: withdrawal.currency as any },
        lock: { mode: 'pessimistic_write' },
      });

      if (wallet) {
        const totalAmount = parseFloat(withdrawal.totalAmount);
        wallet.availableBalance = (
          parseFloat(wallet.availableBalance) + totalAmount
        ).toFixed(2);
        wallet.lockedBalance = (
          parseFloat(wallet.lockedBalance) - totalAmount
        ).toFixed(2);
        await queryRunner.manager.save(wallet);
      }

      // Update withdrawal status
      withdrawal.status = FiatWithdrawalStatus.CANCELLED;
      const savedWithdrawal = await queryRunner.manager.save(withdrawal);

      // Create ledger entry for cancellation
      const ledgerEntry = queryRunner.manager.create(LedgerEntry, {
        userId,
        currency: withdrawal.currency,
        amount: withdrawal.totalAmount,
        type: 'WITHDRAWAL_REFUND',
        description: `Fiat withdrawal cancelled - Funds unlocked`,
        referenceId: withdrawalId,
        referenceType: 'FIAT_WITHDRAWAL',
        balanceAfter: wallet.availableBalance,
        metadata: {
          withdrawalId,
          originalAmount: withdrawal.amount,
          fee: withdrawal.fee,
        },
      });

      await queryRunner.manager.save(ledgerEntry);

      await queryRunner.commitTransaction();

      this.logger.log({
        message: 'Fiat withdrawal cancelled',
        userId,
        withdrawalId,
      });

      const withdrawalWithBankAccount = await this.withdrawalRepository.findOne(
        {
          where: { id: savedWithdrawal.id },
          relations: ['bankAccount'],
        },
      );

      return FiatWithdrawalResponseDto.fromEntity(withdrawalWithBankAccount);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get withdrawal fees for a currency
   */
  getFees(currency: string): { currency: string; fee: number; minAmount: number } {
    const fee = this.FEES[currency];
    const minAmount = this.MIN_AMOUNTS[currency];

    if (fee === undefined || minAmount === undefined) {
      throw new BadRequestException(`Unsupported currency: ${currency}`);
    }

    return { currency, fee, minAmount };
  }

  /**
   * Check if withdrawal requires admin approval
   * - Amounts > $10,000 USD equivalent require approval
   */
  private requiresAdminApproval(currency: string, amount: number): boolean {
    // For simplicity, treat all currencies as 1:1 with USD
    // In production, use real-time exchange rates
    return amount > this.ADMIN_APPROVAL_THRESHOLD_USD;
  }

  /**
   * Check daily withdrawal limit
   * - Maximum $50,000 USD equivalent per day
   */
  private async checkDailyWithdrawalLimit(
    userId: string,
    currency: string,
    amount: number,
    manager: any,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyWithdrawals = await manager
      .createQueryBuilder(FiatWithdrawalRequest, 'withdrawal')
      .where('withdrawal.userId = :userId', { userId })
      .andWhere('withdrawal.createdAt >= :today', { today })
      .andWhere('withdrawal.status != :cancelled', {
        cancelled: FiatWithdrawalStatus.CANCELLED,
      })
      .andWhere('withdrawal.status != :rejected', {
        rejected: FiatWithdrawalStatus.REJECTED,
      })
      .getMany();

    // Calculate total (treat all currencies as 1:1 for simplicity)
    const totalToday = dailyWithdrawals.reduce(
      (sum, w) => sum + parseFloat(w.amount),
      0,
    );

    if (totalToday + amount > this.MAX_DAILY_WITHDRAWAL_USD) {
      throw new BadRequestException(
        `Daily withdrawal limit exceeded. Limit: $${this.MAX_DAILY_WITHDRAWAL_USD}, Today: $${totalToday.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
      );
    }
  }

  /**
   * Admin: Approve a withdrawal request
   * - Only for PENDING withdrawals
   * - Updates status to APPROVED
   */
  async approveWithdrawal(
    adminUserId: string,
    withdrawalId: string,
    notes?: string,
  ): Promise<FiatWithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['bankAccount'],
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== FiatWithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve withdrawal with status ${withdrawal.status}`,
      );
    }

    withdrawal.status = FiatWithdrawalStatus.APPROVED;
    withdrawal.adminApprovedBy = adminUserId;
    withdrawal.adminApprovedAt = new Date();
    withdrawal.adminNotes = notes;

    const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    this.logger.log({
      message: 'Fiat withdrawal approved by admin',
      withdrawalId,
      adminUserId,
    });

    return FiatWithdrawalResponseDto.fromEntity(savedWithdrawal);
  }

  /**
   * Admin: Reject a withdrawal request
   * - Only for PENDING withdrawals
   * - Unlocks funds
   */
  async rejectWithdrawal(
    adminUserId: string,
    withdrawalId: string,
    reason: string,
  ): Promise<FiatWithdrawalResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawal = await queryRunner.manager.findOne(
        FiatWithdrawalRequest,
        {
          where: { id: withdrawalId },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request not found');
      }

      if (withdrawal.status !== FiatWithdrawalStatus.PENDING) {
        throw new BadRequestException(
          `Cannot reject withdrawal with status ${withdrawal.status}`,
        );
      }

      // Unlock funds
      const wallet = await queryRunner.manager.findOne(UserWallet, {
        where: { userId: withdrawal.userId, currency: withdrawal.currency as any },
        lock: { mode: 'pessimistic_write' },
      });

      if (wallet) {
        const totalAmount = parseFloat(withdrawal.totalAmount);
        wallet.availableBalance = (
          parseFloat(wallet.availableBalance) + totalAmount
        ).toFixed(2);
        wallet.lockedBalance = (
          parseFloat(wallet.lockedBalance) - totalAmount
        ).toFixed(2);
        await queryRunner.manager.save(wallet);
      }

      // Update withdrawal status
      withdrawal.status = FiatWithdrawalStatus.REJECTED;
      withdrawal.adminApprovedBy = adminUserId;
      withdrawal.adminApprovedAt = new Date();
      withdrawal.adminNotes = reason;
      withdrawal.errorMessage = reason;

      const savedWithdrawal = await queryRunner.manager.save(withdrawal);

      // Create ledger entry
      const ledgerEntry = queryRunner.manager.create(LedgerEntry, {
        userId: withdrawal.userId,
        currency: withdrawal.currency,
        amount: withdrawal.totalAmount,
        type: 'WITHDRAWAL_REFUND',
        description: `Fiat withdrawal rejected by admin - Funds unlocked`,
        referenceId: withdrawalId,
        referenceType: 'FIAT_WITHDRAWAL',
        balanceAfter: wallet.availableBalance,
        metadata: {
          withdrawalId,
          rejectedBy: adminUserId,
          reason,
        },
      });

      await queryRunner.manager.save(ledgerEntry);

      await queryRunner.commitTransaction();

      this.logger.log({
        message: 'Fiat withdrawal rejected by admin',
        withdrawalId,
        adminUserId,
        reason,
      });

      const withdrawalWithBankAccount = await this.withdrawalRepository.findOne(
        {
          where: { id: savedWithdrawal.id },
          relations: ['bankAccount'],
        },
      );

      return FiatWithdrawalResponseDto.fromEntity(withdrawalWithBankAccount);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
