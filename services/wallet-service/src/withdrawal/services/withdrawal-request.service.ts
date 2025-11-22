import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CryptoWithdrawalRequest } from '../entities/crypto-withdrawal-request.entity';
import { UserWallet } from '../../wallet/entities/user-wallet.entity';
import { LedgerEntry } from '../../ledger/entities/ledger-entry.entity';
import { CreateCryptoWithdrawalDto } from '../dto/create-crypto-withdrawal.dto';
import { AddressValidationService } from './address-validation.service';
import { FeeCalculationService } from './fee-calculation.service';
import { TwoFactorVerificationService } from './two-factor-verification.service';
import { RedisService } from '../../common/redis/redis.service';

/**
 * WithdrawalRequestService
 * Handles cryptocurrency withdrawal request creation and management
 *
 * Story 2.5: Crypto Withdrawal - Day 2
 */
@Injectable()
export class WithdrawalRequestService {
  private readonly logger = new Logger(WithdrawalRequestService.name);

  constructor(
    @InjectRepository(CryptoWithdrawalRequest)
    private readonly withdrawalRepository: Repository<CryptoWithdrawalRequest>,
    @InjectRepository(UserWallet)
    private readonly walletRepository: Repository<UserWallet>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
    private readonly addressValidationService: AddressValidationService,
    private readonly feeCalculationService: FeeCalculationService,
    private readonly twoFactorService: TwoFactorVerificationService,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new withdrawal request
   * Full workflow with validation, 2FA, balance check, fund locking
   */
  async createWithdrawalRequest(
    userId: string,
    dto: CreateCryptoWithdrawalDto,
  ): Promise<CryptoWithdrawalRequest> {
    this.logger.log({
      message: 'Creating withdrawal request',
      userId,
      currency: dto.currency,
      amount: dto.amount,
    });

    // Step 1: Validate address
    const addressValidation = await this.addressValidationService.validateAddress(
      dto.currency,
      dto.destinationAddress,
      dto.network,
    );

    if (!addressValidation.isValid) {
      throw new BadRequestException(
        `Invalid ${dto.currency} address: ${addressValidation.errors?.join(', ')}`,
      );
    }

    // Step 2: Verify 2FA code
    const twoFaVerification = await this.twoFactorService.verify2FACode(
      userId,
      dto.twoFaCode,
    );

    if (!twoFaVerification.isValid) {
      throw new ForbiddenException(
        twoFaVerification.error || 'Invalid 2FA code',
      );
    }

    // Step 3: Calculate fees
    const fees = await this.feeCalculationService.calculateWithdrawalFees(
      dto.currency,
      dto.amount,
      dto.network,
    );

    // Step 4: Check if admin approval required
    const requiresAdminApproval = this.feeCalculationService.requiresAdminApproval(
      dto.currency,
      dto.amount,
    );

    // Step 5: Use database transaction for fund locking and request creation
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check and lock funds
      const wallet = await this.findOrCreateWallet(
        queryRunner,
        userId,
        dto.currency,
      );

      const totalAmount = parseFloat(fees.totalAmount);
      const availableBalance = parseFloat(wallet.availableBalance);

      if (availableBalance < totalAmount) {
        throw new BadRequestException(
          `Insufficient balance. Required: ${fees.totalAmount} ${dto.currency}, Available: ${wallet.availableBalance} ${dto.currency}`,
        );
      }

      // Create withdrawal request
      const withdrawal = queryRunner.manager.create(CryptoWithdrawalRequest, {
        userId,
        currency: dto.currency,
        destinationAddress: addressValidation.normalizedAddress || dto.destinationAddress,
        amount: dto.amount,
        networkFee: fees.networkFee,
        platformFee: fees.platformFee,
        totalAmount: fees.totalAmount,
        status: requiresAdminApproval ? 'PENDING' : 'PENDING',
        requiresAdminApproval,
        twoFaVerifiedAt: new Date(),
      });

      const savedWithdrawal = await queryRunner.manager.save(withdrawal);

      // Lock funds in wallet
      wallet.availableBalance = (availableBalance - totalAmount).toFixed(8);
      wallet.lockedBalance = (
        parseFloat(wallet.lockedBalance) + totalAmount
      ).toFixed(8);

      await queryRunner.manager.save(wallet);

      // Create ledger entry
      const ledgerEntry = queryRunner.manager.create(LedgerEntry, {
        userId,
        currency: dto.currency,
        type: 'WITHDRAWAL_LOCK',
        amount: `-${fees.totalAmount}`,
        balanceBefore: availableBalance.toFixed(8),
        balanceAfter: wallet.availableBalance,
        referenceType: 'CRYPTO_WITHDRAWAL',
        referenceId: savedWithdrawal.id,
        description: `Withdrawal request created - ${dto.currency} to ${dto.destinationAddress.substring(0, 10)}...`,
      });

      await queryRunner.manager.save(ledgerEntry);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.invalidateUserCache(userId);

      this.logger.log({
        message: 'Withdrawal request created successfully',
        withdrawalId: savedWithdrawal.id,
        userId,
        currency: dto.currency,
        amount: dto.amount,
        requiresAdminApproval,
      });

      return savedWithdrawal;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error({
        message: 'Failed to create withdrawal request',
        userId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cancel a pending withdrawal request
   */
  async cancelWithdrawal(
    userId: string,
    withdrawalId: string,
  ): Promise<CryptoWithdrawalRequest> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId, userId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot cancel withdrawal with status ${withdrawal.status}. Only PENDING withdrawals can be cancelled.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Unlock funds
      const wallet = await queryRunner.manager.findOne(UserWallet, {
        where: { userId, currency: withdrawal.currency },
      });

      if (wallet) {
        const totalAmount = parseFloat(withdrawal.totalAmount);
        wallet.availableBalance = (
          parseFloat(wallet.availableBalance) + totalAmount
        ).toFixed(8);
        wallet.lockedBalance = (
          parseFloat(wallet.lockedBalance) - totalAmount
        ).toFixed(8);

        await queryRunner.manager.save(wallet);

        // Create ledger entry
        const ledgerEntry = queryRunner.manager.create(LedgerEntry, {
          userId,
          currency: withdrawal.currency,
          type: 'WITHDRAWAL_UNLOCK',
          amount: withdrawal.totalAmount,
          balanceBefore: (parseFloat(wallet.availableBalance) - totalAmount).toFixed(8),
          balanceAfter: wallet.availableBalance,
          referenceType: 'CRYPTO_WITHDRAWAL',
          referenceId: withdrawal.id,
          description: `Withdrawal cancelled - funds unlocked`,
        });

        await queryRunner.manager.save(ledgerEntry);
      }

      // Update withdrawal status
      withdrawal.status = 'CANCELLED';
      const updatedWithdrawal = await queryRunner.manager.save(withdrawal);

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.invalidateUserCache(userId);

      this.logger.log({
        message: 'Withdrawal cancelled',
        withdrawalId: withdrawal.id,
        userId,
      });

      return updatedWithdrawal;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error({
        message: 'Failed to cancel withdrawal',
        withdrawalId,
        error: error.message,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get withdrawal request by ID
   */
  async getWithdrawal(
    userId: string,
    withdrawalId: string,
  ): Promise<CryptoWithdrawalRequest> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId, userId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    return withdrawal;
  }

  /**
   * Get withdrawal history for user with pagination
   */
  async getWithdrawalHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ withdrawals: CryptoWithdrawalRequest[]; total: number }> {
    const [withdrawals, total] = await this.withdrawalRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { withdrawals, total };
  }

  /**
   * Find or create wallet for user and currency
   * @private
   */
  private async findOrCreateWallet(
    queryRunner: any,
    userId: string,
    currency: string,
  ): Promise<UserWallet> {
    let wallet = await queryRunner.manager.findOne(UserWallet, {
      where: { userId, currency },
      lock: { mode: 'pessimistic_write' }, // Lock for update
    });

    if (!wallet) {
      wallet = queryRunner.manager.create(UserWallet, {
        userId,
        currency,
        availableBalance: '0.00000000',
        lockedBalance: '0.00000000',
        totalBalance: '0.00000000',
      });
      wallet = await queryRunner.manager.save(wallet);
    }

    return wallet;
  }

  /**
   * Invalidate user balance cache
   * @private
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    const cacheKey = `user:balances:${userId}`;
    await this.redisService.del(cacheKey);
    this.logger.debug(`Invalidated cache for user: ${userId}`);
  }
}
