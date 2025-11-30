import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';
import { RedisService } from '../../common/services/redis.service';
import { Statistics, TradeData } from '../interfaces/statistics.interface';
import { PublicTrade } from '../../trading/interfaces';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);
  private readonly CACHE_TTL_SECONDS = 10; // 10-second TTL as per requirements
  private readonly VALID_SYMBOLS = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'];
  private readonly TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly tradeEngineClient: TradeEngineClient,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get 24-hour statistics for a symbol
   * Calculates: open, high, low, close, volume from last 24h trades
   * Performance target: <30ms response time
   *
   * @param symbol Trading symbol (BTC_TRY, ETH_TRY, USDT_TRY)
   * @returns Statistics object with 24h data
   */
  async get24hStats(symbol: string): Promise<Statistics> {
    const startTime = Date.now();

    try {
      // Validate symbol
      if (!this.VALID_SYMBOLS.includes(symbol)) {
        throw new BadRequestException(`Invalid symbol. Allowed symbols: ${this.VALID_SYMBOLS.join(', ')}`);
      }

      // Try to get from cache
      const cacheKey = `statistics:24h:${symbol}`;
      const cachedData = await this.getCachedStats(cacheKey);

      if (cachedData) {
        const duration = Date.now() - startTime;
        this.logger.debug(`Statistics cache hit for ${symbol} (${duration}ms)`);
        return cachedData;
      }

      // Cache miss - calculate from Trade Engine data
      this.logger.debug(`Statistics cache miss for ${symbol}, calculating from trades`);
      const stats = await this.calculate24hStats(symbol);

      // Cache the result
      await this.cacheStats(cacheKey, stats);

      const duration = Date.now() - startTime;

      // Log warning if exceeds performance target
      if (duration > 30) {
        this.logger.warn(`Statistics calculation exceeded 30ms target: ${duration}ms for ${symbol}`);
      } else {
        this.logger.debug(`Statistics calculated for ${symbol} (${duration}ms)`);
      }

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to get 24h stats for ${symbol} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate 24-hour statistics from trade data
   * Handles edge cases: no trades, new symbol
   */
  private async calculate24hStats(symbol: string): Promise<Statistics> {
    try {
      // Fetch recent trades from Trade Engine
      // Note: We request max limit (100) and filter client-side for 24h window
      const tradesResponse = await this.tradeEngineClient.getRecentTrades(symbol, 100);

      if (!tradesResponse.success || !tradesResponse.data || !tradesResponse.data.data) {
        // No trade data available - return zero stats for new symbol
        this.logger.warn(`No trade data available for ${symbol}, returning zero stats`);
        return this.getZeroStats(symbol);
      }

      const allTrades = tradesResponse.data.data;

      // Filter trades within last 24 hours
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - this.TWENTY_FOUR_HOURS_MS);

      const trades24h = allTrades.filter((trade: PublicTrade) => {
        const tradeDate = new Date(trade.executed_at);
        return tradeDate >= twentyFourHoursAgo;
      });

      // Handle case: no trades in last 24h
      if (trades24h.length === 0) {
        this.logger.warn(`No trades found in last 24h for ${symbol}, returning zero stats`);
        return this.getZeroStats(symbol);
      }

      // Calculate statistics
      const prices = trades24h.map((t: PublicTrade) => parseFloat(t.price));
      const quantities = trades24h.map((t: PublicTrade) => parseFloat(t.quantity));

      const open = parseFloat(trades24h[trades24h.length - 1].price); // Oldest trade
      const close = parseFloat(trades24h[0].price); // Newest trade
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const volume = quantities.reduce((sum, qty) => sum + qty, 0);

      return {
        symbol,
        open: open.toFixed(8),
        high: high.toFixed(8),
        low: low.toFixed(8),
        close: close.toFixed(8),
        volume: volume.toFixed(8),
        timestamp: new Date(),
      };
    } catch (error) {
      // Handle symbol not found or Trade Engine errors
      if (error.status === 404) {
        throw new NotFoundException(`Symbol ${symbol} not found`);
      }
      throw error;
    }
  }

  /**
   * Return zero statistics for symbols with no data
   * Used for new symbols or when no trades exist
   */
  private getZeroStats(symbol: string): Statistics {
    return {
      symbol,
      open: '0.00000000',
      high: '0.00000000',
      low: '0.00000000',
      close: '0.00000000',
      volume: '0.00000000',
      timestamp: new Date(),
    };
  }

  /**
   * Get cached statistics from Redis
   */
  private async getCachedStats(key: string): Promise<Statistics | null> {
    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Convert timestamp string back to Date object
        parsed.timestamp = new Date(parsed.timestamp);
        return parsed;
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached statistics: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache statistics in Redis with TTL
   */
  private async cacheStats(key: string, stats: Statistics): Promise<void> {
    try {
      await this.redisService.setEx(key, this.CACHE_TTL_SECONDS, JSON.stringify(stats));
    } catch (error) {
      this.logger.warn(`Failed to cache statistics: ${error.message}`);
      // Don't throw - caching failure shouldn't break the request
    }
  }
}
