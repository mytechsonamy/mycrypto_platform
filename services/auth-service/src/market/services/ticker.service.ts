import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';
import { RedisService } from '../../common/services/redis.service';
import { StatisticsService } from './statistics.service';
import { TickerResponseDto } from '../dto/ticker-response.dto';
import { MarketTicker } from '../../trading/interfaces';

@Injectable()
export class TickerService {
  private readonly logger = new Logger(TickerService.name);
  private readonly CACHE_TTL_SECONDS = 10; // 10-second TTL as per requirements
  private readonly VALID_SYMBOLS = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'];

  constructor(
    private readonly tradeEngineClient: TradeEngineClient,
    private readonly statisticsService: StatisticsService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get ticker data for a single symbol
   * Response includes: lastPrice, priceChange, priceChangePercent, high, low, volume, quoteVolume
   * Performance target: <50ms p99
   *
   * @param symbol Trading symbol (BTC_TRY, ETH_TRY, USDT_TRY)
   * @returns TickerResponseDto with market data
   */
  async getTicker(symbol: string): Promise<TickerResponseDto> {
    const startTime = Date.now();

    try {
      // Validate symbol
      if (!this.VALID_SYMBOLS.includes(symbol)) {
        throw new BadRequestException(`Invalid symbol. Allowed symbols: ${this.VALID_SYMBOLS.join(', ')}`);
      }

      // Try to get from cache
      const cacheKey = `ticker:${symbol}`;
      const cachedData = await this.getCachedTicker(cacheKey);

      if (cachedData) {
        const duration = Date.now() - startTime;
        this.logger.debug(`Ticker cache hit for ${symbol} (${duration}ms)`);
        return cachedData;
      }

      // Cache miss - fetch and calculate
      this.logger.debug(`Ticker cache miss for ${symbol}, fetching from Trade Engine`);
      const ticker = await this.fetchAndCalculateTicker(symbol);

      // Cache the result
      await this.cacheTicker(cacheKey, ticker);

      const duration = Date.now() - startTime;

      // Log warning if exceeds performance target (p99 < 50ms)
      if (duration > 50) {
        this.logger.warn(`Ticker request exceeded 50ms target: ${duration}ms for ${symbol}`);
      } else {
        this.logger.debug(`Ticker fetched for ${symbol} (${duration}ms)`);
      }

      return ticker;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to get ticker for ${symbol} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get ticker data for multiple symbols
   * Bulk query endpoint: GET /api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY
   * Performance target: <50ms p99 per symbol
   *
   * @param symbols Array of trading symbols
   * @returns Array of TickerResponseDto
   */
  async getMultipleTickers(symbols: string[]): Promise<TickerResponseDto[]> {
    const startTime = Date.now();

    try {
      // Validate symbols
      if (!symbols || symbols.length === 0) {
        throw new BadRequestException('At least one symbol is required');
      }

      // Validate each symbol
      for (const symbol of symbols) {
        if (!this.VALID_SYMBOLS.includes(symbol)) {
          throw new BadRequestException(`Invalid symbol: ${symbol}. Allowed symbols: ${this.VALID_SYMBOLS.join(', ')}`);
        }
      }

      // Limit to reasonable number to prevent abuse
      if (symbols.length > 10) {
        throw new BadRequestException('Maximum 10 symbols allowed per request');
      }

      this.logger.debug(`Fetching tickers for ${symbols.length} symbols: ${symbols.join(', ')}`);

      // Fetch all tickers in parallel for better performance
      const tickerPromises = symbols.map(symbol => this.getTicker(symbol));
      const tickers = await Promise.all(tickerPromises);

      const duration = Date.now() - startTime;
      this.logger.debug(`Fetched ${tickers.length} tickers (${duration}ms, ~${(duration / symbols.length).toFixed(1)}ms per symbol)`);

      return tickers;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to get multiple tickers after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch ticker data from Trade Engine and calculate additional fields
   */
  private async fetchAndCalculateTicker(symbol: string): Promise<TickerResponseDto> {
    try {
      // Fetch ticker data from Trade Engine (has most fields)
      const tickerResponse = await this.tradeEngineClient.getTickerData(symbol);

      if (!tickerResponse.success || !tickerResponse.data) {
        throw new NotFoundException(`Ticker data not found for ${symbol}`);
      }

      const marketTicker: MarketTicker = tickerResponse.data;

      // Get 24h statistics for volume (Trade Engine ticker may not have it)
      const stats = await this.statisticsService.get24hStats(symbol);

      // Calculate quoteVolume (volume * price)
      const volume = parseFloat(stats.volume);
      const lastPrice = parseFloat(marketTicker.last_price);
      const quoteVolume = (volume * lastPrice).toFixed(8);

      // Transform to our DTO format
      const ticker: TickerResponseDto = {
        symbol,
        lastPrice: marketTicker.last_price,
        priceChange: marketTicker.price_change_24h,
        priceChangePercent: marketTicker.price_change_percent_24h,
        high: marketTicker.high_24h,
        low: marketTicker.low_24h,
        volume: stats.volume,
        quoteVolume,
        timestamp: new Date().toISOString(),
      };

      return ticker;
    } catch (error) {
      // Handle symbol not found or Trade Engine errors
      if (error.status === 404) {
        throw new NotFoundException(`Symbol ${symbol} not found`);
      }
      throw error;
    }
  }

  /**
   * Get cached ticker from Redis
   */
  private async getCachedTicker(key: string): Promise<TickerResponseDto | null> {
    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached ticker: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache ticker in Redis with TTL
   */
  private async cacheTicker(key: string, ticker: TickerResponseDto): Promise<void> {
    try {
      await this.redisService.setEx(key, this.CACHE_TTL_SECONDS, JSON.stringify(ticker));
    } catch (error) {
      this.logger.warn(`Failed to cache ticker: ${error.message}`);
      // Don't throw - caching failure shouldn't break the request
    }
  }
}
