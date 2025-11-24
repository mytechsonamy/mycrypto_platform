import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';
import { RedisService } from '../../common/services/redis.service';
import { OrderbookResponseDto, OrderbookLevel } from '../dto/orderbook-response.dto';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private readonly CACHE_TTL_SECONDS = 5; // 5-second TTL for orderbook cache
  private readonly VALID_SYMBOLS = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'];

  constructor(
    private readonly tradeEngineClient: TradeEngineClient,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get orderbook for a symbol with Redis caching
   * @param symbol Trading symbol (BTC_TRY, ETH_TRY, USDT_TRY)
   * @param depth Number of price levels (default 20, max 100)
   * @returns Orderbook data with bids, asks, spread, and metadata
   */
  async getOrderbook(symbol: string, depth: number = 20): Promise<OrderbookResponseDto> {
    const startTime = Date.now();

    try {
      // Validate symbol
      if (!this.VALID_SYMBOLS.includes(symbol)) {
        throw new BadRequestException(`Invalid symbol. Allowed symbols: ${this.VALID_SYMBOLS.join(', ')}`);
      }

      // Validate depth
      if (depth < 1 || depth > 100) {
        throw new BadRequestException('Depth must be between 1 and 100');
      }

      // Try to get from cache
      const cacheKey = `orderbook:${symbol}:${depth}`;
      const cachedData = await this.getCachedOrderbook(cacheKey);

      if (cachedData) {
        const duration = Date.now() - startTime;
        this.logger.debug(`Orderbook cache hit for ${symbol} (${duration}ms)`);
        return cachedData;
      }

      // Cache miss - fetch from Trade Engine
      this.logger.debug(`Orderbook cache miss for ${symbol}, fetching from Trade Engine`);
      const response = await this.tradeEngineClient.getOrderBook(
        symbol.replace('_', '/'), // Convert BTC_TRY to BTC/USDT format if needed
        depth
      );

      if (!response.success || !response.data) {
        throw new NotFoundException('Orderbook not found');
      }

      const orderbook = response.data;

      // Transform and calculate spread
      const transformedOrderbook: OrderbookResponseDto = {
        symbol,
        bids: this.transformOrderbookLevels(orderbook.bids, depth),
        asks: this.transformOrderbookLevels(orderbook.asks, depth),
        lastUpdateId: Math.floor(Date.now() / 1000), // Sequence number for sync
        spread: this.calculateSpread(orderbook.bids, orderbook.asks),
        timestamp: new Date().toISOString(),
      };

      // Cache the result
      await this.cacheOrderbook(cacheKey, transformedOrderbook);

      const duration = Date.now() - startTime;
      this.logger.log(`Orderbook fetched for ${symbol} with depth ${depth} (${duration}ms)`);

      return transformedOrderbook;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to fetch orderbook for ${symbol} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cached orderbook from Redis
   */
  private async getCachedOrderbook(key: string): Promise<OrderbookResponseDto | null> {
    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached orderbook: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache orderbook in Redis with TTL
   */
  private async cacheOrderbook(key: string, orderbook: OrderbookResponseDto): Promise<void> {
    try {
      await this.redisService.setEx(key, this.CACHE_TTL_SECONDS, JSON.stringify(orderbook));
    } catch (error) {
      this.logger.warn(`Failed to cache orderbook: ${error.message}`);
      // Don't throw - caching failure shouldn't break the request
    }
  }

  /**
   * Transform orderbook levels from Trade Engine format
   */
  private transformOrderbookLevels(levels: any[], maxDepth: number): OrderbookLevel[] {
    if (!Array.isArray(levels)) {
      return [];
    }

    return levels.slice(0, maxDepth).map((level) => {
      // Handle different formats: [price, quantity] or {price, quantity}
      if (Array.isArray(level)) {
        return {
          price: level[0],
          quantity: level[1],
        };
      } else if (typeof level === 'object') {
        return {
          price: level.price,
          quantity: level.quantity,
        };
      }
      return { price: '0', quantity: '0' };
    });
  }

  /**
   * Calculate bid-ask spread
   */
  private calculateSpread(bids: any[], asks: any[]): string {
    if (!bids || !asks || bids.length === 0 || asks.length === 0) {
      return '0';
    }

    const bestBid = this.getPrice(bids[0]);
    const bestAsk = this.getPrice(asks[0]);

    if (bestBid === 0 || bestAsk === 0) {
      return '0';
    }

    const spread = bestAsk - bestBid;
    return spread.toFixed(8);
  }

  /**
   * Extract price from orderbook level (handles different formats)
   */
  private getPrice(level: any): number {
    if (Array.isArray(level)) {
      return parseFloat(level[0]) || 0;
    } else if (typeof level === 'object' && level.price) {
      return parseFloat(level.price) || 0;
    }
    return 0;
  }
}
