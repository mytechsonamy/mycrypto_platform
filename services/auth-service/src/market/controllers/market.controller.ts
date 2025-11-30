import { Controller, Get, Param, Query, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MarketService } from '../services/market.service';
import { TickerService } from '../services/ticker.service';
import { TechnicalIndicatorsService } from '../services/technical-indicators.service';
import { OrderbookQueryDto } from '../dto/orderbook-query.dto';
import { TickerQueryDto } from '../dto/ticker-query.dto';
import { OrderbookResponseDto } from '../dto/orderbook-response.dto';
import { DepthChartResponseDto } from '../dto/depth-chart-response.dto';
import { TickerResponseDto, BulkTickersResponseDto } from '../dto/ticker-response.dto';

@ApiTags('Market Data')
@Controller('api/v1/market')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);

  constructor(
    private readonly marketService: MarketService,
    private readonly tickerService: TickerService,
    private readonly technicalIndicatorsService: TechnicalIndicatorsService,
  ) {}

  /**
   * GET /api/v1/market/orderbook/:symbol
   * Get orderbook data for a symbol with optional depth parameter
   *
   * @param symbol Trading symbol (BTC_TRY, ETH_TRY, USDT_TRY)
   * @param query Query parameters (depth: 1-100, default 20)
   * @returns Orderbook with bids, asks, spread, and metadata
   */
  @Get('orderbook/:symbol')
  async getOrderbook(
    @Param('symbol') symbol: string,
    @Query() query: OrderbookQueryDto,
  ): Promise<{
    success: boolean;
    data: OrderbookResponseDto;
    meta: {
      timestamp: string;
      request_id?: string;
    };
  }> {
    const startTime = Date.now();

    try {
      const orderbook = await this.marketService.getOrderbook(
        symbol.toUpperCase(),
        query.depth || 20
      );

      const duration = Date.now() - startTime;

      // Check latency SLA (<100ms p99)
      if (duration > 100) {
        this.logger.warn(`Orderbook request exceeded latency SLA: ${duration}ms for ${symbol}`);
      }

      return {
        success: true,
        data: orderbook,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Orderbook request failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/v1/market/orderbook/:symbol/depth-chart
   * Get depth chart data optimized for chart rendering with cumulative volumes
   *
   * @param symbol Trading symbol (BTC_TRY, ETH_TRY, USDT_TRY)
   * @returns Depth chart with cumulative volumes, spread percentage, and metadata
   */
  @Get('orderbook/:symbol/depth-chart')
  async getDepthChart(
    @Param('symbol') symbol: string,
  ): Promise<{
    success: boolean;
    data: DepthChartResponseDto;
    meta: {
      timestamp: string;
      request_id?: string;
    };
  }> {
    const startTime = Date.now();

    try {
      const depthChart = await this.marketService.getDepthChart(
        symbol.toUpperCase()
      );

      const duration = Date.now() - startTime;

      // Check latency SLA (<50ms p99)
      if (duration > 50) {
        this.logger.warn(`Depth chart request exceeded latency SLA: ${duration}ms for ${symbol}`);
      }

      return {
        success: true,
        data: depthChart,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Depth chart request failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/v1/market/ticker/:symbol
   * Get real-time ticker data for a single symbol
   *
   * @param symbol Trading symbol (BTC_TRY, ETH_TRY, USDT_TRY)
   * @returns Ticker with lastPrice, priceChange, priceChangePercent, high, low, volume, quoteVolume
   */
  @Get('ticker/:symbol')
  async getTicker(
    @Param('symbol') symbol: string,
  ): Promise<{
    success: boolean;
    data: TickerResponseDto;
    meta: {
      timestamp: string;
      request_id?: string;
    };
  }> {
    const startTime = Date.now();

    try {
      const ticker = await this.tickerService.getTicker(symbol.toUpperCase());

      const duration = Date.now() - startTime;

      // Check latency SLA (<50ms p99)
      if (duration > 50) {
        this.logger.warn(`Ticker request exceeded latency SLA: ${duration}ms for ${symbol}`);
      }

      return {
        success: true,
        data: ticker,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Ticker request failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY
   * Get real-time ticker data for multiple symbols (bulk query)
   *
   * @param query Query parameters (symbols: comma-separated list)
   * @returns Array of tickers with market data
   */
  @Get('tickers')
  async getMultipleTickers(
    @Query() query: TickerQueryDto,
  ): Promise<{
    success: boolean;
    data: BulkTickersResponseDto;
    meta: {
      timestamp: string;
      request_id?: string;
    };
  }> {
    const startTime = Date.now();

    try {
      // Parse comma-separated symbols
      const symbolsArray = query.symbols
        ? query.symbols.split(',').map(s => s.trim().toUpperCase())
        : [];

      const tickers = await this.tickerService.getMultipleTickers(symbolsArray);

      const duration = Date.now() - startTime;

      // Check latency SLA (<50ms p99 per symbol)
      const avgDuration = symbolsArray.length > 0 ? duration / symbolsArray.length : duration;
      if (avgDuration > 50) {
        this.logger.warn(`Tickers request exceeded latency SLA: ${duration}ms for ${symbolsArray.length} symbols (${avgDuration.toFixed(1)}ms avg)`);
      }

      return {
        success: true,
        data: {
          tickers,
          timestamp: new Date().toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Tickers request failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/v1/market/indicators/:symbol
   * Get technical indicators for a symbol (SMA, EMA, RSI, MACD)
   *
   * @param symbol Trading symbol (BTC/USD, ETH/USD, etc.)
   * @param type Indicator type (sma, ema, rsi, macd)
   * @param period Period for calculation (5, 10, 20, 50, 100, 200 for SMA; 12, 26 for EMA; 14 for RSI)
   * @returns Technical indicator data with timestamp array
   */
  @Get('indicators/:symbol')
  @ApiOperation({ summary: 'Get technical indicators for a symbol' })
  @ApiParam({
    name: 'symbol',
    description: 'Trading pair symbol (e.g., BTC/USD, ETH/USD)',
    example: 'BTC/USD',
  })
  @ApiQuery({
    name: 'type',
    description: 'Indicator type',
    enum: ['sma', 'ema', 'rsi', 'macd'],
    required: true,
  })
  @ApiQuery({
    name: 'period',
    description: 'Period for calculation (depends on indicator type)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Technical indicator data returned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or insufficient data',
  })
  async getTechnicalIndicators(
    @Param('symbol') symbol: string,
    @Query('type') type: string,
    @Query('period') period?: string,
  ): Promise<{
    success: boolean;
    data: any;
    meta: {
      timestamp: string;
      request_id?: string;
      responseTime?: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Validate indicator type
      const validTypes = ['sma', 'ema', 'rsi', 'macd'];
      if (!type || !validTypes.includes(type.toLowerCase())) {
        throw new BadRequestException(
          `Invalid indicator type. Allowed types: ${validTypes.join(', ')}`,
        );
      }

      const indicatorType = type.toLowerCase();
      let result;

      switch (indicatorType) {
        case 'sma': {
          const periodNum = period ? parseInt(period) : 20;
          result = await this.technicalIndicatorsService.calculateSMA(symbol, periodNum);
          break;
        }
        case 'ema': {
          const periodNum = period ? parseInt(period) : 12;
          result = await this.technicalIndicatorsService.calculateEMA(symbol, periodNum);
          break;
        }
        case 'rsi': {
          const periodNum = period ? parseInt(period) : 14;
          result = await this.technicalIndicatorsService.calculateRSI(symbol, periodNum);
          break;
        }
        case 'macd': {
          // MACD uses default parameters (12, 26, 9) or custom if provided
          result = await this.technicalIndicatorsService.calculateMACD(symbol);
          break;
        }
      }

      const duration = Date.now() - startTime;

      // Check latency SLA (<50ms)
      if (duration > 50) {
        this.logger.warn(
          `Technical indicators request exceeded latency SLA: ${duration}ms for ${symbol} ${indicatorType}`,
        );
      }

      return {
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          responseTime: duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Technical indicators request failed after ${duration}ms: ${error.message}`,
      );
      throw error;
    }
  }
}
