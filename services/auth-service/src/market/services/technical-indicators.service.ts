import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';

export interface IndicatorDataPoint {
  timestamp: string;
  value: string;
}

export interface TechnicalIndicators {
  symbol: string;
  period: number;
  data: IndicatorDataPoint[];
  timestamp: string;
}

export interface MACDResult {
  symbol: string;
  macd: IndicatorDataPoint[];
  signal: IndicatorDataPoint[];
  histogram: IndicatorDataPoint[];
  timestamp: string;
}

@Injectable()
export class TechnicalIndicatorsService {
  private readonly logger = new Logger(TechnicalIndicatorsService.name);
  private readonly CACHE_TTL = 60; // 1 minute cache TTL

  constructor(
    private readonly redisService: RedisService,
    private readonly tradeEngineClient: TradeEngineClient,
  ) {}

  /**
   * Calculate Simple Moving Average (SMA)
   * @param symbol Trading pair symbol
   * @param period Number of periods (5, 10, 20, 50, 100, 200)
   */
  async calculateSMA(symbol: string, period: number): Promise<TechnicalIndicators> {
    this.validatePeriod(period, [5, 10, 20, 50, 100, 200]);

    const cacheKey = `indicators:sma:${symbol}:${period}`;
    const cached = await this.getCachedIndicator(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.debug(`Calculating SMA for ${symbol} with period ${period}`);

    const trades = await this.getRecentTrades(symbol, period + 50); // Get extra data for accuracy
    if (trades.length < period) {
      throw new BadRequestException(`Insufficient data for SMA calculation. Need at least ${period} trades.`);
    }

    const prices = trades.map((t) => parseFloat(t.price));
    const smaData: IndicatorDataPoint[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const sma = this.calculateAverage(slice);
      smaData.push({
        timestamp: trades[i].executed_at,
        value: sma.toFixed(8),
      });
    }

    const result: TechnicalIndicators = {
      symbol,
      period,
      data: smaData,
      timestamp: new Date().toISOString(),
    };

    await this.cacheIndicator(cacheKey, result);
    return result;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param symbol Trading pair symbol
   * @param period Number of periods (12, 26)
   */
  async calculateEMA(symbol: string, period: number): Promise<TechnicalIndicators> {
    this.validatePeriod(period, [12, 26]);

    const cacheKey = `indicators:ema:${symbol}:${period}`;
    const cached = await this.getCachedIndicator(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.debug(`Calculating EMA for ${symbol} with period ${period}`);

    const trades = await this.getRecentTrades(symbol, period * 3); // Get 3x period for initialization
    if (trades.length < period) {
      throw new BadRequestException(`Insufficient data for EMA calculation. Need at least ${period} trades.`);
    }

    const prices = trades.map((t) => parseFloat(t.price));
    const multiplier = 2 / (period + 1);
    const emaData: IndicatorDataPoint[] = [];

    // Initialize with SMA for first period
    const initialSMA = this.calculateAverage(prices.slice(0, period));
    let ema = initialSMA;

    emaData.push({
      timestamp: trades[period - 1].executed_at,
      value: ema.toFixed(8),
    });

    // Calculate EMA for remaining periods
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
      emaData.push({
        timestamp: trades[i].executed_at,
        value: ema.toFixed(8),
      });
    }

    const result: TechnicalIndicators = {
      symbol,
      period,
      data: emaData,
      timestamp: new Date().toISOString(),
    };

    await this.cacheIndicator(cacheKey, result);
    return result;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   * @param symbol Trading pair symbol
   * @param period Number of periods (typically 14)
   */
  async calculateRSI(symbol: string, period: number = 14): Promise<TechnicalIndicators> {
    this.validatePeriod(period, [14]);

    const cacheKey = `indicators:rsi:${symbol}:${period}`;
    const cached = await this.getCachedIndicator(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.debug(`Calculating RSI for ${symbol} with period ${period}`);

    const trades = await this.getRecentTrades(symbol, period * 2 + 50);
    if (trades.length < period + 1) {
      throw new BadRequestException(`Insufficient data for RSI calculation. Need at least ${period + 1} trades.`);
    }

    const prices = trades.map((t) => parseFloat(t.price));
    const rsiData: IndicatorDataPoint[] = [];

    // Calculate price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    // Separate gains and losses
    const gains = changes.map((c) => (c > 0 ? c : 0));
    const losses = changes.map((c) => (c < 0 ? Math.abs(c) : 0));

    // Calculate initial average gain and loss
    let avgGain = this.calculateAverage(gains.slice(0, period));
    let avgLoss = this.calculateAverage(losses.slice(0, period));

    // Calculate RSI for each period
    for (let i = period; i < changes.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      rsiData.push({
        timestamp: trades[i + 1].executed_at,
        value: rsi.toFixed(2),
      });
    }

    const result: TechnicalIndicators = {
      symbol,
      period,
      data: rsiData,
      timestamp: new Date().toISOString(),
    };

    await this.cacheIndicator(cacheKey, result);
    return result;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param symbol Trading pair symbol
   * @param fastPeriod Fast EMA period (default: 12)
   * @param slowPeriod Slow EMA period (default: 26)
   * @param signalPeriod Signal line period (default: 9)
   */
  async calculateMACD(
    symbol: string,
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
  ): Promise<MACDResult> {
    const cacheKey = `indicators:macd:${symbol}:${fastPeriod}:${slowPeriod}:${signalPeriod}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    this.logger.debug(`Calculating MACD for ${symbol} (${fastPeriod}, ${slowPeriod}, ${signalPeriod})`);

    const requiredTrades = slowPeriod * 3 + signalPeriod;
    const trades = await this.getRecentTrades(symbol, requiredTrades);

    if (trades.length < requiredTrades) {
      throw new BadRequestException(
        `Insufficient data for MACD calculation. Need at least ${requiredTrades} trades.`,
      );
    }

    const prices = trades.map((t) => parseFloat(t.price));

    // Calculate fast and slow EMAs
    const fastEMA = this.calculateEMAArray(prices, fastPeriod);
    const slowEMA = this.calculateEMAArray(prices, slowPeriod);

    // Calculate MACD line (fast EMA - slow EMA)
    const macdLine = [];
    const startIndex = Math.max(fastEMA.startIndex, slowEMA.startIndex);

    for (let i = startIndex; i < prices.length; i++) {
      const fastValue = fastEMA.values[i - fastEMA.startIndex];
      const slowValue = slowEMA.values[i - slowEMA.startIndex];
      macdLine.push(fastValue - slowValue);
    }

    // Calculate signal line (EMA of MACD line)
    const signalEMA = this.calculateEMAArray(macdLine, signalPeriod);
    const signalLine = signalEMA.values;

    // Calculate histogram (MACD - Signal)
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + signalEMA.startIndex] - signalLine[i]);
    }

    // Format results
    const finalStartIndex = startIndex + signalEMA.startIndex;
    const macdData: IndicatorDataPoint[] = [];
    const signalData: IndicatorDataPoint[] = [];
    const histogramData: IndicatorDataPoint[] = [];

    for (let i = 0; i < histogram.length; i++) {
      const tradeIndex = finalStartIndex + i;
      macdData.push({
        timestamp: trades[tradeIndex].executed_at,
        value: macdLine[signalEMA.startIndex + i].toFixed(8),
      });
      signalData.push({
        timestamp: trades[tradeIndex].executed_at,
        value: signalLine[i].toFixed(8),
      });
      histogramData.push({
        timestamp: trades[tradeIndex].executed_at,
        value: histogram[i].toFixed(8),
      });
    }

    const result: MACDResult = {
      symbol,
      macd: macdData,
      signal: signalData,
      histogram: histogramData,
      timestamp: new Date().toISOString(),
    };

    await this.redisService.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));
    return result;
  }

  /**
   * Helper: Calculate EMA array for internal use
   */
  private calculateEMAArray(prices: number[], period: number): { values: number[]; startIndex: number } {
    if (prices.length < period) {
      throw new Error(`Insufficient data for EMA calculation`);
    }

    const multiplier = 2 / (period + 1);
    const emaValues: number[] = [];

    // Initialize with SMA
    const initialSMA = this.calculateAverage(prices.slice(0, period));
    let ema = initialSMA;
    emaValues.push(ema);

    // Calculate EMA for remaining periods
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
      emaValues.push(ema);
    }

    return {
      values: emaValues,
      startIndex: period - 1,
    };
  }

  /**
   * Helper: Calculate average of an array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Helper: Validate period parameter
   */
  private validatePeriod(period: number, allowedPeriods: number[]): void {
    if (!allowedPeriods.includes(period)) {
      throw new BadRequestException(
        `Invalid period ${period}. Allowed periods: ${allowedPeriods.join(', ')}`,
      );
    }
  }

  /**
   * Helper: Get recent trades from trade engine
   */
  private async getRecentTrades(symbol: string, limit: number): Promise<any[]> {
    try {
      // Call trade engine to get recent trades (limit max is 100, so fetch multiple times if needed)
      const maxLimit = 100;
      const fetchLimit = Math.min(limit, maxLimit);

      const response = await this.tradeEngineClient.getRecentTrades(symbol, fetchLimit);

      if (!response.data || !response.data.data || response.data.data.length === 0) {
        throw new BadRequestException(`No trade data available for ${symbol}`);
      }

      // Sort by timestamp ascending (oldest first)
      return response.data.data.sort((a, b) =>
        new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
      );
    } catch (error) {
      this.logger.error(`Failed to fetch recent trades for ${symbol}: ${error.message}`);
      throw new BadRequestException(`Unable to fetch trade data for ${symbol}`);
    }
  }

  /**
   * Helper: Get cached indicator from Redis
   */
  private async getCachedIndicator(cacheKey: string): Promise<TechnicalIndicators | null> {
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn(`Cache read error for ${cacheKey}: ${error.message}`);
      return null;
    }
  }

  /**
   * Helper: Cache indicator in Redis
   */
  private async cacheIndicator(cacheKey: string, data: TechnicalIndicators): Promise<void> {
    try {
      await this.redisService.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      this.logger.debug(`Cached indicator: ${cacheKey}`);
    } catch (error) {
      this.logger.warn(`Cache write error for ${cacheKey}: ${error.message}`);
    }
  }
}
