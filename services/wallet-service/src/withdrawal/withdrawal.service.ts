import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { UserWallet } from '../wallet/entities/user-wallet.entity';
import { FiatAccount } from '../wallet/entities/fiat-account.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { CreateWithdrawalRequestDto, WithdrawalResponseDto } from './dto';
import axios from 'axios';

/**
 * WithdrawalService
 * Handles TRY withdrawal operations with balance locking and 2FA verification
 */
@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);
  private readonly withdrawalFee: number;
  private readonly minWithdrawal: number;
  private readonly maxWithdrawal: number;
  private readonly dailyLimit: number;
  private readonly authServiceUrl: string;

  constructor(
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRepository: Repository<WithdrawalRequest>,
    @InjectRepository(UserWallet)
    private readonly walletRepository: Repository<UserWallet>,
    @InjectRepository(FiatAccount)
    private readonly fiatAccountRepository: Repository<FiatAccount>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.withdrawalFee = this.configService.get<number>('TRY_WITHDRAWAL_FEE', 5);
    this.minWithdrawal = this.configService.get<number>('TRY_MIN_WITHDRAWAL', 100);
    this.maxWithdrawal = this.configService.get<number>('TRY_MAX_WITHDRAWAL', 50000);
    this.dailyLimit = this.configService.get<number>('WITHDRAWAL_DAILY_LIMIT', 5);
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL', 'http://auth-service:3000');
  }

  /**
   * Create a TRY withdrawal request
   * Validates 2FA, checks balance, locks funds
   * @param userId - User ID
   * @param dto - Withdrawal request data
   * @returns Withdrawal response
   */
  async createWithdrawalRequest(
    userId: string,
    dto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalResponseDto> {
    const traceId = this.generateTraceId();
    this.logger.log({
      message: 'Creating withdrawal request',
      userId,
      amount: dto.amount,
      fiatAccountId: dto.fiatAccountId,
      trace_id: traceId,
    });

    // 1. Validate amount
    this.validateAmount(dto.amount);

    // 2. Check daily withdrawal limit
    await this.checkDailyLimit(userId);

    // 3. Verify 2FA code
    await this.verify2FA(userId, dto.twoFaCode);

    // 4. Verify fiat account belongs to user
    const fiatAccount = await this.verifyFiatAccount(userId, dto.fiatAccountId);

    // Calculate total amount needed (amount + fee)
    const totalAmount = dto.amount + this.withdrawalFee;

    // 5. Start transaction to lock balance and create withdrawal request
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 6. Get user's TRY wallet with lock
      const wallet = await queryRunner.manager.findOne(UserWallet, {
        where: { userId, currency: 'TRY' },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('TRY wallet not found');
      }

      // 7. Check sufficient available balance
      const availableBalance = parseFloat(wallet.availableBalance);
      if (availableBalance < totalAmount) {
        throw new BadRequestException(
          `Insufficient balance. Required: ${totalAmount} TRY, Available: ${availableBalance} TRY`,
        );
      }

      // 8. Lock balance (move from available to locked)
      wallet.availableBalance = (availableBalance - totalAmount).toFixed(2);
      wallet.lockedBalance = (parseFloat(wallet.lockedBalance) + totalAmount).toFixed(2);
      await queryRunner.manager.save(wallet);

      this.logger.debug({
        message: 'Balance locked',
        userId,
        amount: totalAmount,
        newAvailable: wallet.availableBalance,
        newLocked: wallet.lockedBalance,
        trace_id: traceId,
      });

      // 9. Create withdrawal request
      const withdrawalRequest = queryRunner.manager.create(WithdrawalRequest, {
        userId,
        currency: 'TRY',
        amount: dto.amount.toFixed(2),
        fee: this.withdrawalFee.toFixed(2),
        status: 'PENDING',
        fiatAccountId: dto.fiatAccountId,
        twoFaVerified: true,
      });

      const savedRequest = await queryRunner.manager.save(withdrawalRequest);

      // 10. Create ledger entry for balance lock
      const ledgerEntry = queryRunner.manager.create(LedgerEntry, {
        userId,
        currency: 'TRY',
        type: 'WITHDRAWAL',
        amount: (-totalAmount).toFixed(2), // Negative for debit
        balanceBefore: (availableBalance + parseFloat(wallet.lockedBalance) - totalAmount).toFixed(2),
        balanceAfter: wallet.totalBalance,
        referenceId: savedRequest.id,
        referenceType: 'WITHDRAWAL_REQUEST',
        description: `TRY withdrawal to ${fiatAccount.bankName} - ${fiatAccount.iban}`,
        metadata: {
          bankName: fiatAccount.bankName,
          iban: fiatAccount.iban,
          accountHolderName: fiatAccount.accountHolderName,
          fee: this.withdrawalFee,
        },
      });

      await queryRunner.manager.save(ledgerEntry);

      await queryRunner.commitTransaction();

      this.logger.log({
        message: 'Withdrawal request created successfully',
        withdrawalId: savedRequest.id,
        userId,
        amount: dto.amount,
        trace_id: traceId,
      });

      return this.toResponseDto(savedRequest);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error({
        message: 'Failed to create withdrawal request',
        error: error.message,
        userId,
        trace_id: traceId,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get withdrawal request by ID
   * @param userId - User ID
   * @param withdrawalId - Withdrawal request ID
   * @returns Withdrawal response
   */
  async getWithdrawalRequest(userId: string, withdrawalId: string): Promise<WithdrawalResponseDto> {
    this.logger.log({
      message: 'Getting withdrawal request',
      userId,
      withdrawalId,
    });

    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId, userId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    return this.toResponseDto(withdrawal);
  }

  /**
   * Cancel pending withdrawal request
   * Unlocks the balance
   * @param userId - User ID
   * @param withdrawalId - Withdrawal request ID
   * @returns Updated withdrawal response
   */
  async cancelWithdrawalRequest(userId: string, withdrawalId: string): Promise<WithdrawalResponseDto> {
    const traceId = this.generateTraceId();
    this.logger.log({
      message: 'Canceling withdrawal request',
      userId,
      withdrawalId,
      trace_id: traceId,
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get withdrawal request with lock
      const withdrawal = await queryRunner.manager.findOne(WithdrawalRequest, {
        where: { id: withdrawalId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request not found');
      }

      // 2. Check if withdrawal can be cancelled
      if (withdrawal.status !== 'PENDING') {
        throw new ConflictException(
          `Cannot cancel withdrawal with status ${withdrawal.status}. Only PENDING withdrawals can be cancelled.`,
        );
      }

      // 3. Get user's TRY wallet with lock
      const wallet = await queryRunner.manager.findOne(UserWallet, {
        where: { userId, currency: 'TRY' },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('TRY wallet not found');
      }

      // 4. Unlock balance (move from locked back to available)
      const totalAmount = parseFloat(withdrawal.amount) + parseFloat(withdrawal.fee);
      wallet.availableBalance = (parseFloat(wallet.availableBalance) + totalAmount).toFixed(2);
      wallet.lockedBalance = (parseFloat(wallet.lockedBalance) - totalAmount).toFixed(2);
      await queryRunner.manager.save(wallet);

      // 5. Update withdrawal status
      withdrawal.status = 'CANCELLED';
      const updatedWithdrawal = await queryRunner.manager.save(withdrawal);

      // 6. Create refund ledger entry
      const ledgerEntry = queryRunner.manager.create(LedgerEntry, {
        userId,
        currency: 'TRY',
        type: 'REFUND',
        amount: totalAmount.toFixed(2), // Positive for credit
        balanceBefore: wallet.totalBalance,
        balanceAfter: (parseFloat(wallet.totalBalance) + totalAmount).toFixed(2),
        referenceId: withdrawal.id,
        referenceType: 'WITHDRAWAL_REQUEST',
        description: 'Withdrawal cancelled - balance unlocked',
        metadata: {
          originalAmount: withdrawal.amount,
          fee: withdrawal.fee,
        },
      });

      await queryRunner.manager.save(ledgerEntry);

      await queryRunner.commitTransaction();

      this.logger.log({
        message: 'Withdrawal request cancelled successfully',
        withdrawalId,
        userId,
        trace_id: traceId,
      });

      return this.toResponseDto(updatedWithdrawal);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error({
        message: 'Failed to cancel withdrawal request',
        error: error.message,
        userId,
        withdrawalId,
        trace_id: traceId,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Approve withdrawal request (Admin only - placeholder for future implementation)
   * @param withdrawalId - Withdrawal request ID
   * @param adminId - Admin user ID
   */
  async approveWithdrawal(withdrawalId: string, adminId: string): Promise<void> {
    this.logger.log({
      message: 'Approving withdrawal request',
      withdrawalId,
      adminId,
    });

    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new ConflictException(`Cannot approve withdrawal with status ${withdrawal.status}`);
    }

    withdrawal.status = 'APPROVED';
    await this.withdrawalRepository.save(withdrawal);

    this.logger.log({
      message: 'Withdrawal request approved',
      withdrawalId,
      adminId,
    });
  }

  /**
   * Verify 2FA code with auth service
   * @param userId - User ID
   * @param twoFaCode - 6-digit 2FA code
   * @throws UnauthorizedException if 2FA verification fails
   */
  private async verify2FA(userId: string, twoFaCode: string): Promise<void> {
    try {
      this.logger.debug({
        message: 'Verifying 2FA code',
        userId,
      });

      const response = await axios.post(
        `${this.authServiceUrl}/api/v1/auth/2fa/verify`,
        {
          userId,
          code: twoFaCode,
        },
        {
          timeout: 5000,
        },
      );

      if (!response.data?.success || !response.data?.data?.valid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }

      this.logger.debug({
        message: '2FA verification successful',
        userId,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error({
        message: '2FA verification failed',
        error: error.message,
        userId,
      });

      if (error.response?.status === 401 || error.response?.status === 400) {
        throw new UnauthorizedException('Invalid 2FA code');
      }

      throw new InternalServerErrorException('2FA verification service unavailable');
    }
  }

  /**
   * Verify fiat account belongs to user
   * @param userId - User ID
   * @param fiatAccountId - Fiat account ID
   * @returns Fiat account
   */
  private async verifyFiatAccount(userId: string, fiatAccountId: string): Promise<FiatAccount> {
    const fiatAccount = await this.fiatAccountRepository.findOne({
      where: { id: fiatAccountId, userId },
    });

    if (!fiatAccount) {
      throw new NotFoundException('Fiat account not found or does not belong to you');
    }

    if (!fiatAccount.isVerified) {
      throw new BadRequestException('Fiat account is not verified');
    }

    return fiatAccount;
  }

  /**
   * Validate withdrawal amount
   * @param amount - Withdrawal amount
   */
  private validateAmount(amount: number): void {
    if (amount < this.minWithdrawal) {
      throw new BadRequestException(`Minimum withdrawal amount is ${this.minWithdrawal} TRY`);
    }

    if (amount > this.maxWithdrawal) {
      throw new BadRequestException(`Maximum withdrawal amount is ${this.maxWithdrawal} TRY`);
    }
  }

  /**
   * Check daily withdrawal limit
   * @param userId - User ID
   */
  private async checkDailyLimit(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .where('withdrawal.userId = :userId', { userId })
      .andWhere('withdrawal.createdAt >= :today', { today })
      .andWhere('withdrawal.status != :cancelledStatus', { cancelledStatus: 'CANCELLED' })
      .getCount();

    if (count >= this.dailyLimit) {
      throw new BadRequestException(
        `Daily withdrawal limit reached. Maximum ${this.dailyLimit} withdrawals per day.`,
      );
    }
  }

  /**
   * Convert entity to response DTO
   * @param withdrawal - Withdrawal request entity
   * @returns Withdrawal response DTO
   */
  private toResponseDto(withdrawal: WithdrawalRequest): WithdrawalResponseDto {
    return {
      withdrawalId: withdrawal.id,
      amount: withdrawal.amount,
      fee: withdrawal.fee,
      netAmount: withdrawal.netAmount,
      fiatAccountId: withdrawal.fiatAccountId,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
    };
  }

  /**
   * Generate unique trace ID for logging
   * @returns Trace ID
   */
  private generateTraceId(): string {
    return `wdl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
