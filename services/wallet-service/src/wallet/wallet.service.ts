import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserWallet } from './entities/user-wallet.entity';
import { RedisService } from '../common/redis/redis.service';
import { WalletBalanceDto } from './dto/wallet-balance.dto';

/**
 * WalletService
 * Handles wallet balance operations with Redis caching
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly SUPPORTED_CURRENCIES = ['TRY', 'BTC', 'ETH', 'USDT'];
  private readonly CACHE_TTL = 5; // 5 seconds as per requirements

  constructor(
    @InjectRepository(UserWallet)
    private readonly userWalletRepository: Repository<UserWallet>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get all wallet balances for a user
   * Uses Redis caching with 5-second TTL
   * @param userId - User ID
   * @returns Array of wallet balances
   */
  async getUserBalances(userId: string): Promise<WalletBalanceDto[]> {
    this.logger.log(`Getting balances for user: ${userId}`);

    // Try cache first
    const cacheKey = `user:balances:${userId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for user balances: ${userId}`);
      return JSON.parse(cached);
    }

    this.logger.debug(`Cache miss for user balances: ${userId}`);

    // Query database
    const wallets = await this.userWalletRepository.find({
      where: { userId },
    });

    // Create balance DTOs for all supported currencies
    // If wallet doesn't exist for a currency, show zero balance
    const balances: WalletBalanceDto[] = this.SUPPORTED_CURRENCIES.map((currency) => {
      const wallet = wallets.find((w) => w.currency === currency);

      if (wallet) {
        return {
          currency: wallet.currency,
          availableBalance: wallet.availableBalance,
          lockedBalance: wallet.lockedBalance,
          totalBalance: wallet.totalBalance,
        };
      } else {
        // Return zero balance for currencies without a wallet
        return {
          currency,
          availableBalance: '0.00000000',
          lockedBalance: '0.00000000',
          totalBalance: '0.00000000',
        };
      }
    });

    // Cache the result
    await this.redisService.set(cacheKey, JSON.stringify(balances), this.CACHE_TTL);
    this.logger.debug(`Cached balances for user: ${userId}`);

    return balances;
  }

  /**
   * Get balance for a specific currency
   * @param userId - User ID
   * @param currency - Currency code (TRY, BTC, ETH, USDT)
   * @returns Wallet balance
   */
  async getUserBalance(userId: string, currency: string): Promise<WalletBalanceDto> {
    this.logger.log(`Getting ${currency} balance for user: ${userId}`);

    // Validate currency
    if (!this.SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
      throw new NotFoundException(`Currency ${currency} is not supported`);
    }

    // Try cache first
    const cached = await this.redisService.getBalance(userId, currency);

    if (cached) {
      this.logger.debug(`Cache hit for ${currency} balance: ${userId}`);
      return JSON.parse(cached);
    }

    this.logger.debug(`Cache miss for ${currency} balance: ${userId}`);

    // Query database
    const wallet = await this.userWalletRepository.findOne({
      where: { userId, currency: currency.toUpperCase() },
    });

    const balance: WalletBalanceDto = wallet
      ? {
          currency: wallet.currency,
          availableBalance: wallet.availableBalance,
          lockedBalance: wallet.lockedBalance,
          totalBalance: wallet.totalBalance,
        }
      : {
          currency: currency.toUpperCase(),
          availableBalance: '0.00000000',
          lockedBalance: '0.00000000',
          totalBalance: '0.00000000',
        };

    // Cache the result
    await this.redisService.setBalance(userId, currency, JSON.stringify(balance));
    this.logger.debug(`Cached ${currency} balance for user: ${userId}`);

    return balance;
  }

  /**
   * Invalidate cache for user balances
   * Called when balance changes (deposit, withdrawal, trade)
   * @param userId - User ID
   */
  async invalidateUserBalanceCache(userId: string): Promise<void> {
    this.logger.log(`Invalidating balance cache for user: ${userId}`);

    // Invalidate all balances cache
    const cacheKey = `user:balances:${userId}`;
    await this.redisService.del(cacheKey);

    // Invalidate individual currency caches
    await this.redisService.invalidateAllBalances(userId);

    this.logger.debug(`Cache invalidated for user: ${userId}`);
  }
}
