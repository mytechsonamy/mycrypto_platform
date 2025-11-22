import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CryptoWithdrawalRequest } from '../entities/crypto-withdrawal-request.entity';
import { UserWallet } from '../../wallet/entities/user-wallet.entity';
import { LedgerEntry } from '../../ledger/entities/ledger-entry.entity';
import { TransactionSigningService } from './transaction-signing.service';
import { BlockchainBroadcastingService } from './blockchain-broadcasting.service';
import { RedisService } from '../../common/redis/redis.service';

/**
 * WithdrawalProcessingService
 * Orchestrates the complete withdrawal flow from PENDING to COMPLETED
 *
 * Story 2.5: Crypto Withdrawal - Day 3
 *
 * Workflow States:
 * PENDING → APPROVED → SIGNING → BROADCASTING → BROADCASTED → COMPLETED
 *     ↓                    ↓            ↓
 * REJECTED            FAILED       FAILED
 */

@Injectable()
export class WithdrawalProcessingService {
  private readonly logger = new Logger(WithdrawalProcessingService.name);

  constructor(
    @InjectRepository(CryptoWithdrawalRequest)
    private readonly withdrawalRepository: Repository<CryptoWithdrawalRequest>,
    @InjectRepository(UserWallet)
    private readonly walletRepository: Repository<UserWallet>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
    private readonly signingService: TransactionSigningService,
    private readonly broadcastingService: BlockchainBroadcastingService,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Process a withdrawal request (auto-approved or admin-approved)
   */
  async processWithdrawal(withdrawalId: string): Promise<CryptoWithdrawalRequest> {
    this.logger.log({
      message: 'Processing withdrawal request',
      withdrawalId,
    });

    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new BadRequestException('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot process withdrawal with status ${withdrawal.status}. Only PENDING withdrawals can be processed.`,
      );
    }

    // Check if requires admin approval
    if (withdrawal.requiresAdminApproval) {
      this.logger.log({
        message: 'Withdrawal requires admin approval',
        withdrawalId,
      });
      // Admin will manually approve via AdminWithdrawalController
      return withdrawal;
    }

    // Auto-approve and process
    return this.processAutomaticWithdrawal(withdrawal);
  }

  /**
   * Process automatic withdrawal (< $10K, no admin approval needed)
   */
  async processAutomaticWithdrawal(
    withdrawal: CryptoWithdrawalRequest,
  ): Promise<CryptoWithdrawalRequest> {
    this.logger.log({
      message: 'Processing automatic withdrawal',
      withdrawalId: withdrawal.id,
      currency: withdrawal.currency,
      amount: withdrawal.amount,
    });

    try {
      // Step 1: Mark as APPROVED
      withdrawal.status = 'APPROVED';
      await this.withdrawalRepository.save(withdrawal);

      // Step 2: Sign transaction
      withdrawal.status = 'SIGNING';
      await this.withdrawalRepository.save(withdrawal);

      const signedTransaction = await this.signTransaction(withdrawal);

      // Step 3: Broadcast transaction
      withdrawal.status = 'BROADCASTING';
      await this.withdrawalRepository.save(withdrawal);

      const broadcastResult = await this.broadcastTransaction(
        withdrawal,
        signedTransaction,
      );

      if (!broadcastResult.success) {
        return this.handleBroadcastFailure(withdrawal, broadcastResult.error);
      }

      // Step 4: Mark as BROADCASTED
      withdrawal.status = 'BROADCASTED';
      withdrawal.transactionHash = broadcastResult.txHash;
      withdrawal.confirmations = 0;
      await this.withdrawalRepository.save(withdrawal);

      this.logger.log({
        message: 'Withdrawal broadcasted successfully',
        withdrawalId: withdrawal.id,
        txHash: broadcastResult.txHash,
      });

      return withdrawal;
    } catch (error) {
      this.logger.error({
        message: 'Withdrawal processing failed',
        withdrawalId: withdrawal.id,
        error: error.message,
        stack: error.stack,
      });

      return this.handleBroadcastFailure(withdrawal, error.message);
    }
  }

  /**
   * Process admin-approved withdrawal
   */
  async processAdminApprovedWithdrawal(
    withdrawal: CryptoWithdrawalRequest,
  ): Promise<CryptoWithdrawalRequest> {
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(
        'Withdrawal must be in PENDING status to be approved',
      );
    }

    if (!withdrawal.requiresAdminApproval) {
      throw new BadRequestException(
        'Withdrawal does not require admin approval',
      );
    }

    this.logger.log({
      message: 'Processing admin-approved withdrawal',
      withdrawalId: withdrawal.id,
    });

    return this.processAutomaticWithdrawal(withdrawal);
  }

  /**
   * Finalize withdrawal (mark as COMPLETED)
   */
  async finalizeWithdrawal(withdrawalId: string): Promise<CryptoWithdrawalRequest> {
    this.logger.log({
      message: 'Finalizing withdrawal',
      withdrawalId,
    });

    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new BadRequestException('Withdrawal request not found');
    }

    if (withdrawal.status !== 'BROADCASTED') {
      throw new BadRequestException(
        `Cannot finalize withdrawal with status ${withdrawal.status}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update withdrawal status
      withdrawal.status = 'COMPLETED';
      const updatedWithdrawal = await queryRunner.manager.save(withdrawal);

      // Update wallet balances (unlock and deduct from total)
      const wallet = await queryRunner.manager.findOne(UserWallet, {
        where: { userId: withdrawal.userId, currency: withdrawal.currency },
      });

      if (wallet) {
        const totalAmount = parseFloat(withdrawal.totalAmount);

        // Deduct from locked balance (was locked during request creation)
        wallet.lockedBalance = (
          parseFloat(wallet.lockedBalance) - totalAmount
        ).toFixed(8);

        // Update total balance
        wallet.totalBalance = (
          parseFloat(wallet.availableBalance) + parseFloat(wallet.lockedBalance)
        ).toFixed(8);

        await queryRunner.manager.save(wallet);

        // Create ledger entry for completion
        const ledgerEntry = queryRunner.manager.create(LedgerEntry, {
          userId: withdrawal.userId,
          currency: withdrawal.currency,
          type: 'WITHDRAWAL_COMPLETE',
          amount: `-${withdrawal.totalAmount}`,
          balanceBefore: (parseFloat(wallet.totalBalance) + totalAmount).toFixed(8),
          balanceAfter: wallet.totalBalance,
          referenceType: 'CRYPTO_WITHDRAWAL',
          referenceId: withdrawal.id,
          description: `Withdrawal completed - ${withdrawal.currency} to blockchain`,
        });

        await queryRunner.manager.save(ledgerEntry);
      }

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.invalidateUserCache(withdrawal.userId);

      this.logger.log({
        message: 'Withdrawal finalized successfully',
        withdrawalId: withdrawal.id,
        txHash: withdrawal.transactionHash,
      });

      return updatedWithdrawal;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error({
        message: 'Failed to finalize withdrawal',
        withdrawalId,
        error: error.message,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handle broadcast failure (rollback and unlock funds)
   */
  async handleBroadcastFailure(
    withdrawal: CryptoWithdrawalRequest,
    errorMessage: string,
  ): Promise<CryptoWithdrawalRequest> {
    this.logger.error({
      message: 'Handling broadcast failure',
      withdrawalId: withdrawal.id,
      error: errorMessage,
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Mark withdrawal as FAILED
      withdrawal.status = 'FAILED';
      withdrawal.failureReason = errorMessage;
      const updatedWithdrawal = await queryRunner.manager.save(withdrawal);

      // Unlock funds
      const wallet = await queryRunner.manager.findOne(UserWallet, {
        where: { userId: withdrawal.userId, currency: withdrawal.currency },
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

        // Create ledger entry for failure
        const ledgerEntry = queryRunner.manager.create(LedgerEntry, {
          userId: withdrawal.userId,
          currency: withdrawal.currency,
          type: 'WITHDRAWAL_FAILED',
          amount: withdrawal.totalAmount,
          balanceBefore: (parseFloat(wallet.availableBalance) - totalAmount).toFixed(8),
          balanceAfter: wallet.availableBalance,
          referenceType: 'CRYPTO_WITHDRAWAL',
          referenceId: withdrawal.id,
          description: `Withdrawal failed - funds unlocked: ${errorMessage}`,
        });

        await queryRunner.manager.save(ledgerEntry);
      }

      await queryRunner.commitTransaction();

      // Invalidate cache
      await this.invalidateUserCache(withdrawal.userId);

      return updatedWithdrawal;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error({
        message: 'Failed to handle broadcast failure',
        withdrawalId: withdrawal.id,
        error: error.message,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Sign transaction based on currency
   * @private
   */
  private async signTransaction(
    withdrawal: CryptoWithdrawalRequest,
  ): Promise<any> {
    this.logger.log({
      message: 'Signing transaction',
      withdrawalId: withdrawal.id,
      currency: withdrawal.currency,
    });

    try {
      if (withdrawal.currency === 'BTC') {
        // For Bitcoin, we need UTXOs - this is simplified for MVP
        // In production, fetch UTXOs from BlockCypher or Bitcoin node
        const mockUtxos = []; // TODO: Fetch real UTXOs
        return await this.signingService.signBitcoinTransaction(
          withdrawal.destinationAddress,
          withdrawal.amount,
          mockUtxos,
          10, // Fee rate in sat/byte
        );
      } else if (withdrawal.currency === 'ETH') {
        return await this.signingService.signEthereumTransaction(
          withdrawal.destinationAddress,
          withdrawal.amount,
          0, // TODO: Get correct nonce from blockchain
          '21000', // Gas limit
          '50', // Gas price in Gwei
        );
      } else if (withdrawal.currency === 'USDT') {
        return await this.signingService.signUSDTTransaction(
          withdrawal.destinationAddress,
          withdrawal.amount,
          'ERC20', // Default to ERC20
          0, // TODO: Get correct nonce
          '65000', // Gas limit for ERC20
          '50', // Gas price
        );
      } else {
        throw new Error(`Unsupported currency: ${withdrawal.currency}`);
      }
    } catch (error) {
      this.logger.error({
        message: 'Transaction signing failed',
        withdrawalId: withdrawal.id,
        error: error.message,
      });
      throw new InternalServerErrorException(
        `Failed to sign transaction: ${error.message}`,
      );
    }
  }

  /**
   * Broadcast signed transaction to blockchain
   * @private
   */
  private async broadcastTransaction(
    withdrawal: CryptoWithdrawalRequest,
    signedTransaction: any,
  ): Promise<any> {
    this.logger.log({
      message: 'Broadcasting transaction',
      withdrawalId: withdrawal.id,
      currency: withdrawal.currency,
    });

    try {
      if (withdrawal.currency === 'BTC') {
        return await this.broadcastingService.broadcastBitcoinTransaction(
          signedTransaction.txHex,
        );
      } else if (withdrawal.currency === 'ETH') {
        return await this.broadcastingService.broadcastEthereumTransaction(
          signedTransaction.signedTx,
        );
      } else if (withdrawal.currency === 'USDT') {
        return await this.broadcastingService.broadcastUSDTTransaction(
          signedTransaction.signedTx,
          'ERC20',
        );
      } else {
        throw new Error(`Unsupported currency: ${withdrawal.currency}`);
      }
    } catch (error) {
      this.logger.error({
        message: 'Transaction broadcasting failed',
        withdrawalId: withdrawal.id,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Invalidate user cache
   * @private
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    const cacheKey = `user:balances:${userId}`;
    await this.redisService.del(cacheKey);
    this.logger.debug(`Invalidated cache for user: ${userId}`);
  }
}
