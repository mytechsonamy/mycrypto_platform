import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError, retry, timer } from 'rxjs';
import { AxiosError } from 'axios';
import { CircuitBreaker } from '../../common/utils/circuit-breaker';
import {
  PlaceOrderRequest,
  TradeEngineResponse,
  PlaceOrderResponse,
  OrderBook,
  MarketTicker,
  ListOrdersResponse,
  ListTradesResponse,
  Order,
  PublicTrade,
} from '../interfaces';

@Injectable()
export class TradeEngineClient {
  private readonly baseUrl: string;
  private readonly timeout: number = 5000; // 5 second timeout (as per requirements)
  private readonly maxRetries: number = 3;
  private readonly logger = new Logger(TradeEngineClient.name);
  private readonly circuitBreaker: CircuitBreaker;

  // Cache for fallback data
  private orderbookCache: Map<string, { data: OrderBook; timestamp: number }> = new Map();
  private readonly CACHE_STALE_TIME = 300000; // 5 minutes

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('TRADE_ENGINE_API_URL') || 'http://localhost:8080/api/v1';
    this.logger.log(`Trade Engine Client initialized with base URL: ${this.baseUrl}`);

    // Initialize circuit breaker with 3 failures threshold
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 60000,
      name: 'TradeEngineClient',
    });
  }

  /**
   * Retry logic with exponential backoff
   * Retries on network errors and 5xx server errors
   */
  private retryWithBackoff(attempt: number, error: any) {
    // Only retry on network errors and 5xx errors
    const shouldRetry =
      !error.response ||
      (error.response?.status >= 500 && error.response?.status < 600) ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.name === 'TimeoutError';

    if (!shouldRetry || attempt >= this.maxRetries) {
      throw error;
    }

    // Exponential backoff: 1s, 2s, 4s
    const delayMs = Math.pow(2, attempt) * 1000;
    this.logger.warn(`Retry attempt ${attempt + 1}/${this.maxRetries} after ${delayMs}ms delay`);
    return timer(delayMs);
  }

  /**
   * Place a new order
   */
  async placeOrder(userId: string, orderRequest: PlaceOrderRequest): Promise<TradeEngineResponse<PlaceOrderResponse>> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Placing order for user ${userId}: ${JSON.stringify(orderRequest)}`);

      const response = await firstValueFrom(
        this.httpService.post<TradeEngineResponse<PlaceOrderResponse>>(
          `${this.baseUrl}/orders`,
          orderRequest,
          {
            headers: {
              'Authorization': `Bearer ${await this.getServiceToken()}`,
              'X-User-ID': userId,
              'Content-Type': 'application/json',
            },
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          retry({
            count: this.maxRetries,
            delay: (error, retryCount) => this.retryWithBackoff(retryCount - 1, error),
          }),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'placeOrder');
          }),
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.log(`Order placed successfully for user ${userId}: ${response.data.data.order.id} (${duration}ms)`);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to place order for user ${userId} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate correlation ID for request tracing
   */
  private generateCorrelationId(): string {
    return `te_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get order book for a symbol with circuit breaker and fallback
   * Aligns with GET /market-data/orderbook/{symbol} from OpenAPI spec
   */
  async getOrderBook(symbol: string, depth: number = 20): Promise<TradeEngineResponse<OrderBook>> {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId();
    const cacheKey = `${symbol}:${depth}`;

    try {
      // Validate depth parameter
      if (depth < 1 || depth > 100) {
        throw new BadRequestException('Depth must be between 1 and 100');
      }

      this.logger.debug(`Fetching order book for ${symbol} with depth ${depth} [correlation_id: ${correlationId}]`);

      // Execute with circuit breaker protection
      const result = await this.circuitBreaker.execute(
        async () => {
          const response = await firstValueFrom(
            this.httpService.get<TradeEngineResponse<OrderBook>>(
              `${this.baseUrl}/market-data/orderbook/${symbol}`,
              {
                params: { depth },
                headers: {
                  'X-Correlation-ID': correlationId,
                  'X-Request-Source': 'auth-service',
                },
                timeout: this.timeout,
              },
            ).pipe(
              timeout(this.timeout),
              retry({
                count: this.maxRetries,
                delay: (error, retryCount) => this.retryWithBackoff(retryCount - 1, error),
              }),
              catchError((error: AxiosError) => {
                throw this.handleError(error, 'getOrderBook');
              }),
            ),
          );

          // Cache successful response for fallback
          this.orderbookCache.set(cacheKey, {
            data: response.data.data,
            timestamp: Date.now(),
          });

          const duration = Date.now() - startTime;
          this.logger.debug(`Order book fetched for ${symbol} (${duration}ms) [correlation_id: ${correlationId}]`);
          return response.data;
        },
        // Fallback function - return cached data
        async () => {
          this.logger.warn(`Trade Engine unavailable, using cached data for ${symbol} [correlation_id: ${correlationId}]`);
          return this.getFallbackOrderbook(symbol, cacheKey);
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to fetch order book for ${symbol} after ${duration}ms [correlation_id: ${correlationId}]: ${error.message}`);

      // Try fallback as last resort
      try {
        return this.getFallbackOrderbook(symbol, cacheKey);
      } catch (fallbackError) {
        throw error; // Throw original error if fallback also fails
      }
    }
  }

  /**
   * Get fallback orderbook from cache
   */
  private getFallbackOrderbook(symbol: string, cacheKey: string): TradeEngineResponse<OrderBook> {
    const cached = this.orderbookCache.get(cacheKey);

    if (!cached) {
      // No cached data available, return empty orderbook
      this.logger.warn(`No cached orderbook available for ${symbol}, returning empty orderbook`);
      return {
        success: true,
        data: {
          symbol,
          bids: [],
          asks: [],
          timestamp: new Date().toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: this.generateCorrelationId(),
        },
      };
    }

    const cacheAge = Date.now() - cached.timestamp;
    const isCacheStale = cacheAge > this.CACHE_STALE_TIME;

    if (isCacheStale) {
      this.logger.warn(`Cached orderbook for ${symbol} is stale (${Math.round(cacheAge / 1000)}s old)`);
    }

    return {
      success: true,
      data: cached.data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: this.generateCorrelationId(),
      },
    };
  }

  /**
   * Get market ticker data for a symbol
   * Aligns with GET /market-data/ticker/{symbol} from OpenAPI spec
   */
  async getTickerData(symbol: string): Promise<TradeEngineResponse<MarketTicker>> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Fetching ticker data for ${symbol}`);

      const response = await firstValueFrom(
        this.httpService.get<TradeEngineResponse<MarketTicker>>(
          `${this.baseUrl}/market-data/ticker/${symbol}`,
          { timeout: this.timeout },
        ).pipe(
          timeout(this.timeout),
          retry({
            count: this.maxRetries,
            delay: (error, retryCount) => this.retryWithBackoff(retryCount - 1, error),
          }),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getTickerData');
          }),
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`Ticker data fetched for ${symbol} (${duration}ms)`);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to fetch ticker data for ${symbol} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get market ticker data for a symbol (legacy method name for backward compatibility)
   * @deprecated Use getTickerData instead
   */
  async getMarketData(symbol: string): Promise<TradeEngineResponse<MarketTicker>> {
    return this.getTickerData(symbol);
  }

  /**
   * Get user orders with optional status filter
   * Aligns with GET /orders from OpenAPI spec
   */
  async getUserOrders(userId: string, status?: string): Promise<TradeEngineResponse<ListOrdersResponse>> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Fetching orders for user ${userId}${status ? ` with status ${status}` : ''}`);

      const response = await firstValueFrom(
        this.httpService.get<TradeEngineResponse<ListOrdersResponse>>(
          `${this.baseUrl}/orders`,
          {
            headers: {
              'Authorization': `Bearer ${await this.getServiceToken()}`,
              'X-User-ID': userId,
            },
            params: status ? { status } : {},
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          retry({
            count: this.maxRetries,
            delay: (error, retryCount) => this.retryWithBackoff(retryCount - 1, error),
          }),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getUserOrders');
          }),
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`Fetched ${response.data.data.total} orders for user ${userId} (${duration}ms)`);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to fetch orders for user ${userId} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get open orders for a user (convenience method)
   * Alias for getUserOrders with status='OPEN' or status='PARTIALLY_FILLED'
   */
  async getOpenOrders(userId: string): Promise<TradeEngineResponse<ListOrdersResponse>> {
    return this.getUserOrders(userId, 'OPEN');
  }

  /**
   * Get a specific order by ID
   * Aligns with GET /orders/{order_id} from OpenAPI spec
   */
  async getOrder(userId: string, orderId: string): Promise<TradeEngineResponse<Order>> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Fetching order ${orderId} for user ${userId}`);

      const response = await firstValueFrom(
        this.httpService.get<TradeEngineResponse<Order>>(
          `${this.baseUrl}/orders/${orderId}`,
          {
            headers: {
              'Authorization': `Bearer ${await this.getServiceToken()}`,
              'X-User-ID': userId,
            },
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          retry({
            count: this.maxRetries,
            delay: (error, retryCount) => this.retryWithBackoff(retryCount - 1, error),
          }),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getOrder');
          }),
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`Fetched order ${orderId} for user ${userId} (${duration}ms)`);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to fetch order ${orderId} for user ${userId} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel an order
   * Aligns with DELETE /orders/{order_id} from OpenAPI spec
   */
  async cancelOrder(userId: string, orderId: string): Promise<TradeEngineResponse<Order>> {
    const startTime = Date.now();
    try {
      this.logger.debug(`Cancelling order ${orderId} for user ${userId}`);

      const response = await firstValueFrom(
        this.httpService.delete<TradeEngineResponse<Order>>(
          `${this.baseUrl}/orders/${orderId}`,
          {
            headers: {
              'Authorization': `Bearer ${await this.getServiceToken()}`,
              'X-User-ID': userId,
            },
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          retry({
            count: this.maxRetries,
            delay: (error, retryCount) => this.retryWithBackoff(retryCount - 1, error),
          }),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'cancelOrder');
          }),
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.log(`Order ${orderId} cancelled successfully for user ${userId} (${duration}ms)`);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to cancel order ${orderId} for user ${userId} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent public trades for a symbol
   * Aligns with GET /market-data/trades/{symbol} from OpenAPI spec
   */
  async getRecentTrades(symbol: string, limit: number = 50): Promise<TradeEngineResponse<{ data: PublicTrade[] }>> {
    const startTime = Date.now();
    try {
      // Validate limit parameter
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      this.logger.debug(`Fetching recent trades for ${symbol} with limit ${limit}`);

      const response = await firstValueFrom(
        this.httpService.get<TradeEngineResponse<{ data: PublicTrade[] }>>(
          `${this.baseUrl}/market-data/trades/${symbol}`,
          {
            params: { limit },
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          retry({
            count: this.maxRetries,
            delay: (error, retryCount) => this.retryWithBackoff(retryCount - 1, error),
          }),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getRecentTrades');
          }),
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`Fetched recent trades for ${symbol} (${duration}ms)`);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to fetch recent trades for ${symbol} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user trades with optional symbol filter
   * Aligns with GET /trades from OpenAPI spec
   */
  async getTrades(symbol?: string, limit: number = 100): Promise<TradeEngineResponse<ListTradesResponse>> {
    const startTime = Date.now();
    try {
      // Validate limit parameter
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      this.logger.debug(`Fetching trades${symbol ? ` for ${symbol}` : ''} with limit ${limit}`);

      const params: any = { limit };
      if (symbol) {
        params.symbol = symbol;
      }

      const response = await firstValueFrom(
        this.httpService.get<TradeEngineResponse<ListTradesResponse>>(
          `${this.baseUrl}/trades`,
          {
            params,
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          retry({
            count: this.maxRetries,
            delay: (error, retryCount) => this.retryWithBackoff(retryCount - 1, error),
          }),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getTrades');
          }),
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`Fetched trades (${duration}ms)`);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to fetch trades after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get service-to-service authentication token
   */
  private async getServiceToken(): Promise<string> {
    const token = this.configService.get<string>('TRADE_ENGINE_SERVICE_TOKEN');
    if (!token) {
      this.logger.warn('TRADE_ENGINE_SERVICE_TOKEN not configured, using empty token');
      return '';
    }
    return token;
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(): boolean {
    return this.circuitBreaker.isOpen();
  }

  /**
   * Manually reset circuit breaker (for admin/testing purposes)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    this.logger.log('Circuit breaker manually reset');
  }

  /**
   * Handle HTTP errors and convert to NestJS exceptions
   */
  private handleError(error: AxiosError, method: string): never {
    const errorMessage = error.message || 'Unknown error';
    const errorCode = error.code;
    const responseData = error.response?.data;

    this.logger.error(
      `TradeEngineClient.${method} error: ${errorMessage}`,
      {
        code: errorCode,
        status: error.response?.status,
        data: responseData,
      },
    );

    // Handle network errors
    if (errorCode === 'ECONNREFUSED') {
      throw new ServiceUnavailableException('Trade Engine service unavailable - connection refused');
    }
    if (errorCode === 'ENOTFOUND') {
      throw new ServiceUnavailableException('Trade Engine hostname not found');
    }
    if (errorCode === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      throw new ServiceUnavailableException('Trade Engine request timeout');
    }

    // Handle HTTP status codes
    if (error.response) {
      const status = error.response.status;
      const message = typeof responseData === 'object' && responseData && 'message' in responseData
        ? (responseData as any).message
        : errorMessage;

      switch (status) {
        case 400:
          throw new BadRequestException(message || 'Invalid request to Trade Engine');
        case 404:
          throw new NotFoundException(message || 'Resource not found in Trade Engine');
        case 503:
          throw new ServiceUnavailableException('Trade Engine service unavailable');
        default:
          throw new InternalServerErrorException(`Trade Engine error: ${message}`);
      }
    }

    // Default error
    throw new InternalServerErrorException(`Trade Engine client error: ${errorMessage}`);
  }
}
