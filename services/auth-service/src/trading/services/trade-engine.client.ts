import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import {
  PlaceOrderRequest,
  TradeEngineResponse,
  PlaceOrderResponse,
  OrderBook,
  MarketTicker,
  ListOrdersResponse,
  ListTradesResponse,
  Order,
} from '../interfaces';

@Injectable()
export class TradeEngineClient {
  private readonly baseUrl: string;
  private readonly timeout: number = 10000; // 10 second timeout
  private readonly logger = new Logger(TradeEngineClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('TRADE_ENGINE_API_URL') || 'http://localhost:8080/api/v1';
    this.logger.log(`Trade Engine Client initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Place a new order
   */
  async placeOrder(userId: string, orderRequest: PlaceOrderRequest): Promise<TradeEngineResponse<PlaceOrderResponse>> {
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
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'placeOrder');
          }),
        ),
      );

      this.logger.log(`Order placed successfully for user ${userId}: ${response.data.data.order.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to place order for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string, depth: number = 20): Promise<TradeEngineResponse<OrderBook>> {
    try {
      this.logger.debug(`Fetching order book for ${symbol} with depth ${depth}`);

      const response = await firstValueFrom(
        this.httpService.get<TradeEngineResponse<OrderBook>>(
          `${this.baseUrl}/orderbook/${symbol}`,
          {
            params: { depth },
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getOrderBook');
          }),
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch order book for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get market ticker data for a symbol
   */
  async getMarketData(symbol: string): Promise<TradeEngineResponse<MarketTicker>> {
    try {
      this.logger.debug(`Fetching market data for ${symbol}`);

      const response = await firstValueFrom(
        this.httpService.get<TradeEngineResponse<MarketTicker>>(
          `${this.baseUrl}/markets/${symbol}/ticker`,
          { timeout: this.timeout },
        ).pipe(
          timeout(this.timeout),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getMarketData');
          }),
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch market data for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user orders with optional status filter
   */
  async getUserOrders(userId: string, status?: string): Promise<TradeEngineResponse<ListOrdersResponse>> {
    try {
      this.logger.debug(`Fetching orders for user ${userId}${status ? ` with status ${status}` : ''}`);

      const response = await firstValueFrom(
        this.httpService.get<TradeEngineResponse<ListOrdersResponse>>(
          `${this.baseUrl}/orders`,
          {
            headers: {
              'X-User-ID': userId,
            },
            params: status ? { status } : {},
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getUserOrders');
          }),
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch orders for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(userId: string, orderId: string): Promise<TradeEngineResponse<Order>> {
    try {
      this.logger.debug(`Fetching order ${orderId} for user ${userId}`);

      const response = await firstValueFrom(
        this.httpService.get<TradeEngineResponse<Order>>(
          `${this.baseUrl}/orders/${orderId}`,
          {
            headers: {
              'X-User-ID': userId,
            },
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getOrder');
          }),
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch order ${orderId} for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(userId: string, orderId: string): Promise<TradeEngineResponse<Order>> {
    try {
      this.logger.debug(`Cancelling order ${orderId} for user ${userId}`);

      const response = await firstValueFrom(
        this.httpService.delete<TradeEngineResponse<Order>>(
          `${this.baseUrl}/orders/${orderId}`,
          {
            headers: {
              'X-User-ID': userId,
            },
            timeout: this.timeout,
          },
        ).pipe(
          timeout(this.timeout),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'cancelOrder');
          }),
        ),
      );

      this.logger.log(`Order ${orderId} cancelled successfully for user ${userId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to cancel order ${orderId} for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent trades with optional symbol filter
   */
  async getTrades(symbol?: string, limit: number = 100): Promise<TradeEngineResponse<ListTradesResponse>> {
    try {
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
            timeout: this.timeout
          },
        ).pipe(
          timeout(this.timeout),
          catchError((error: AxiosError) => {
            throw this.handleError(error, 'getTrades');
          }),
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch trades: ${error.message}`);
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
