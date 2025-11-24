import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';
import { RedisService } from '../../common/services/redis.service';

export interface UserOrderPricesEvent {
  type: 'user_order_prices';
  userId: string;
  prices: string[];
  timestamp: string;
}

@Injectable()
export class UserOrderHighlightService {
  private readonly logger = new Logger(UserOrderHighlightService.name);
  private readonly CACHE_TTL_SECONDS = 60; // 60-second TTL for user order prices

  constructor(
    private readonly tradeEngineClient: TradeEngineClient,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get price levels where user has open orders
   * Performance target: <20ms response time
   *
   * @param userId User ID
   * @returns Array of price levels where user has open orders
   */
  async getHighlightedPrices(userId: string): Promise<string[]> {
    const startTime = Date.now();

    try {
      if (!userId || userId.trim() === '') {
        throw new NotFoundException('User ID is required');
      }

      // Try to get from cache
      const cacheKey = `user:order:prices:${userId}`;
      const cachedPrices = await this.getCachedPrices(cacheKey);

      if (cachedPrices) {
        const duration = Date.now() - startTime;
        this.logger.debug(`User order prices cache hit for ${userId} (${duration}ms)`);
        return cachedPrices;
      }

      // Cache miss - fetch from Trade Engine
      this.logger.debug(`User order prices cache miss for ${userId}, fetching from Trade Engine`);
      const response = await this.tradeEngineClient.getOpenOrders(userId);

      if (!response.success || !response.data) {
        throw new NotFoundException('Failed to fetch user orders');
      }

      const orders = response.data.orders;

      // Extract unique price levels from open orders
      const prices = this.extractUniquePrices(orders);

      // Cache the result
      await this.cachePrices(cacheKey, prices);

      const duration = Date.now() - startTime;

      // Check performance SLA (<20ms)
      if (duration > 20) {
        this.logger.warn(`getHighlightedPrices exceeded performance target: ${duration}ms for user ${userId}`);
      } else {
        this.logger.log(`Highlighted prices fetched for user ${userId} (${duration}ms, ${prices.length} price levels)`);
      }

      return prices;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to fetch highlighted prices for user ${userId} after ${duration}ms: ${error.message}`);

      // Return empty array instead of throwing to prevent UI breaking
      if (error instanceof NotFoundException) {
        throw error;
      }

      return [];
    }
  }

  /**
   * Extract unique price levels from orders
   */
  private extractUniquePrices(orders: any[]): string[] {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }

    const priceSet = new Set<string>();

    for (const order of orders) {
      // Only include limit orders with defined prices
      if (order.price && order.type === 'LIMIT') {
        // Normalize price to 8 decimal places
        const normalizedPrice = parseFloat(order.price).toFixed(8);
        priceSet.add(normalizedPrice);
      }
    }

    // Sort prices in descending order (highest first)
    return Array.from(priceSet).sort((a, b) => parseFloat(b) - parseFloat(a));
  }

  /**
   * Build WebSocket event for user order prices
   */
  buildUserOrderPricesEvent(userId: string, prices: string[]): UserOrderPricesEvent {
    return {
      type: 'user_order_prices',
      userId,
      prices,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get cached prices from Redis
   */
  private async getCachedPrices(key: string): Promise<string[] | null> {
    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached prices: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache prices in Redis with TTL
   */
  private async cachePrices(key: string, prices: string[]): Promise<void> {
    try {
      await this.redisService.setEx(key, this.CACHE_TTL_SECONDS, JSON.stringify(prices));
    } catch (error) {
      this.logger.warn(`Failed to cache prices: ${error.message}`);
      // Don't throw - caching failure shouldn't break the request
    }
  }

  /**
   * Invalidate cache for user (call when order is placed/cancelled)
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const cacheKey = `user:order:prices:${userId}`;
      await this.redisService.del(cacheKey);
      this.logger.debug(`Cache invalidated for user ${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache for user ${userId}: ${error.message}`);
    }
  }
}
