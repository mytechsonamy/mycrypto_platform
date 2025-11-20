import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private readonly BALANCE_CACHE_TTL = 5; // 5 seconds as per requirements

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get('REDIS_PORT', 6379);
    const redisPassword = this.configService.get('REDIS_PASSWORD');

    this.client = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis client disconnected');
  }

  /**
   * Get cached balance
   */
  async getBalance(userId: string, asset: string): Promise<string | null> {
    const key = `balance:${userId}:${asset}`;
    return await this.client.get(key);
  }

  /**
   * Cache balance with TTL
   */
  async setBalance(userId: string, asset: string, balance: string): Promise<void> {
    const key = `balance:${userId}:${asset}`;
    await this.client.setex(key, this.BALANCE_CACHE_TTL, balance);
  }

  /**
   * Invalidate balance cache
   */
  async invalidateBalance(userId: string, asset: string): Promise<void> {
    const key = `balance:${userId}:${asset}`;
    await this.client.del(key);
  }

  /**
   * Invalidate all balances for a user
   */
  async invalidateAllBalances(userId: string): Promise<void> {
    const pattern = `balance:${userId}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  /**
   * Acquire withdrawal lock
   */
  async acquireWithdrawalLock(
    userId: string,
    withdrawalId: string,
    ttl: number = 300,
  ): Promise<boolean> {
    const key = `withdrawal:lock:${userId}:${withdrawalId}`;
    const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * Release withdrawal lock
   */
  async releaseWithdrawalLock(userId: string, withdrawalId: string): Promise<void> {
    const key = `withdrawal:lock:${userId}:${withdrawalId}`;
    await this.client.del(key);
  }

  /**
   * Publish balance update event for real-time updates
   */
  async publishBalanceUpdate(userId: string, asset: string, data: any): Promise<void> {
    const channel = `wallet:balance:${userId}`;
    await this.client.publish(channel, JSON.stringify({ asset, ...data }));
  }

  /**
   * Generic get operation
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Generic set operation with TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Generic delete operation
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Get Redis client instance for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }
}
