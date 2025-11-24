import { Injectable, Logger } from '@nestjs/common';
import { TradeEngineClient } from './trade-engine.client';
import { CreateOrderDTO } from '../dto';
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
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(private readonly tradeEngineClient: TradeEngineClient) {}

  /**
   * Place a new order
   */
  async placeOrder(userId: string, orderRequest: CreateOrderDTO): Promise<TradeEngineResponse<PlaceOrderResponse>> {
    this.logger.debug(`User ${userId} placing order: ${JSON.stringify(orderRequest)}`);

    try {
      // Convert DTO to Trade Engine API request format
      const engineRequest: PlaceOrderRequest = {
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        type: orderRequest.type,
        quantity: orderRequest.quantity,
        price: orderRequest.price,
        time_in_force: orderRequest.timeInForce,
        trigger_price: orderRequest.triggerPrice,
        post_only: orderRequest.postOnly,
      };

      const result = await this.tradeEngineClient.placeOrder(userId, engineRequest);

      this.logger.log(
        `Order placed successfully for user ${userId}: ${result.data.order.id}`,
        {
          orderId: result.data.order.id,
          symbol: result.data.order.symbol,
          side: result.data.order.side,
          type: result.data.order.type,
          tradesExecuted: result.data.trades?.length || 0,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Order placement failed for user ${userId}: ${error.message}`,
        {
          userId,
          orderRequest,
          error: error.stack,
        },
      );
      throw error;
    }
  }

  /**
   * Get order book for a trading pair
   */
  async getOrderBook(symbol: string, depth: number = 20): Promise<TradeEngineResponse<OrderBook>> {
    this.logger.debug(`Fetching order book for ${symbol} with depth ${depth}`);

    try {
      const result = await this.tradeEngineClient.getOrderBook(symbol, depth);

      this.logger.debug(
        `Order book fetched for ${symbol}`,
        {
          bidsCount: result.data.bids.length,
          asksCount: result.data.asks.length,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch order book for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get market ticker data
   */
  async getMarketTicker(symbol: string): Promise<TradeEngineResponse<MarketTicker>> {
    this.logger.debug(`Fetching market ticker for ${symbol}`);

    try {
      const result = await this.tradeEngineClient.getMarketData(symbol);

      this.logger.debug(
        `Market ticker fetched for ${symbol}`,
        {
          lastPrice: result.data.last_price,
          volume24h: result.data.volume_24h,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch market ticker for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's orders with optional status filter
   */
  async getUserOrders(userId: string, status?: string): Promise<TradeEngineResponse<ListOrdersResponse>> {
    this.logger.debug(`Fetching orders for user ${userId}${status ? ` with status ${status}` : ''}`);

    try {
      const result = await this.tradeEngineClient.getUserOrders(userId, status);

      this.logger.debug(
        `Orders fetched for user ${userId}`,
        {
          count: result.data.orders.length,
          total: result.data.total,
          status,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch orders for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(userId: string, orderId: string): Promise<TradeEngineResponse<Order>> {
    this.logger.debug(`Fetching order ${orderId} for user ${userId}`);

    try {
      const result = await this.tradeEngineClient.getOrder(userId, orderId);

      this.logger.debug(
        `Order ${orderId} fetched for user ${userId}`,
        {
          status: result.data.status,
          symbol: result.data.symbol,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch order ${orderId} for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(userId: string, orderId: string): Promise<TradeEngineResponse<Order>> {
    this.logger.debug(`Cancelling order ${orderId} for user ${userId}`);

    try {
      const result = await this.tradeEngineClient.cancelOrder(userId, orderId);

      this.logger.log(
        `Order ${orderId} cancelled successfully for user ${userId}`,
        {
          orderId,
          symbol: result.data.symbol,
          previousStatus: result.data.status,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to cancel order ${orderId} for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent trades with optional symbol filter
   */
  async getRecentTrades(symbol?: string, limit: number = 100): Promise<TradeEngineResponse<ListTradesResponse>> {
    this.logger.debug(`Fetching recent trades${symbol ? ` for ${symbol}` : ''} with limit ${limit}`);

    try {
      const result = await this.tradeEngineClient.getTrades(symbol, limit);

      this.logger.debug(
        `Recent trades fetched${symbol ? ` for ${symbol}` : ''}`,
        {
          count: result.data.trades.length,
          total: result.data.total,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch recent trades: ${error.message}`);
      throw error;
    }
  }
}
