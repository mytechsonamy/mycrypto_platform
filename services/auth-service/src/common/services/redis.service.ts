import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = console; // Replace with proper Logger service

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'redis'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.client.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Sliding window rate limiter implementation
   * @param key The unique key for the rate limit (e.g., rate_limit:register:IP)
   * @param limit Maximum number of requests allowed
   * @param windowMs Time window in milliseconds
   * @returns Object with allowed status and retry-after seconds
   */
  async slidingWindowRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; count: number; retryAfter?: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const pipeline = this.client.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, '-inf', windowStart);

    // Add current request timestamp
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Count requests in the current window
    pipeline.zcard(key);

    // Set expiry for the key
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    // Get the count from the zcard result (3rd command in pipeline)
    const count = results[2][1] as number;

    if (count > limit) {
      // Remove the request we just added since it's over the limit
      await this.client.zrem(key, `${now}-${Math.random()}`);

      // Get the oldest entry to calculate retry-after
      const oldestEntry = await this.client.zrange(key, 0, 0, 'WITHSCORES');
      if (oldestEntry && oldestEntry.length >= 2) {
        const oldestTimestamp = parseInt(oldestEntry[1]);
        const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
        return { allowed: false, count: count - 1, retryAfter };
      }

      return { allowed: false, count: count - 1, retryAfter: Math.ceil(windowMs / 1000) };
    }

    return { allowed: true, count };
  }

  /**
   * Check if an IP is whitelisted
   * @param ip The IP address to check
   * @returns True if whitelisted
   */
  async isWhitelisted(ip: string): Promise<boolean> {
    const whitelistKey = 'rate_limit:whitelist';
    const result = await this.client.sismember(whitelistKey, ip);
    return result === 1;
  }

  /**
   * Add an IP to the whitelist
   * @param ip The IP address to whitelist
   */
  async addToWhitelist(ip: string): Promise<void> {
    const whitelistKey = 'rate_limit:whitelist';
    await this.client.sadd(whitelistKey, ip);
  }

  /**
   * Remove an IP from the whitelist
   * @param ip The IP address to remove from whitelist
   */
  async removeFromWhitelist(ip: string): Promise<void> {
    const whitelistKey = 'rate_limit:whitelist';
    await this.client.srem(whitelistKey, ip);
  }

  /**
   * Get all whitelisted IPs
   */
  async getWhitelistedIps(): Promise<string[]> {
    const whitelistKey = 'rate_limit:whitelist';
    return await this.client.smembers(whitelistKey);
  }

  // === Generic Redis Operations for 2FA ===

  /**
   * Set a key with expiration time
   */
  async setEx(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value);
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  /**
   * Increment a value
   */
  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }
}