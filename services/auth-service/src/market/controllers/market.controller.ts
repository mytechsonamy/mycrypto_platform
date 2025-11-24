import { Controller, Get, Param, Query, HttpStatus, Logger } from '@nestjs/common';
import { MarketService } from '../services/market.service';
import { OrderbookQueryDto } from '../dto/orderbook-query.dto';
import { OrderbookResponseDto } from '../dto/orderbook-response.dto';
import { DepthChartResponseDto } from '../dto/depth-chart-response.dto';

@Controller('api/v1/market')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);

  constructor(private readonly marketService: MarketService) {}

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
}
