import { Test, TestingModule } from '@nestjs/testing';
import { TradingService } from '../services/trading.service';
import { TradeEngineClient } from '../services/trade-engine.client';
import { CreateOrderDTO, OrderSide, OrderType, TimeInForce } from '../dto';

describe('TradingService', () => {
  let service: TradingService;
  let client: TradeEngineClient;

  const mockTradeEngineClient = {
    placeOrder: jest.fn(),
    getOrderBook: jest.fn(),
    getMarketData: jest.fn(),
    getUserOrders: jest.fn(),
    getOrder: jest.fn(),
    cancelOrder: jest.fn(),
    getTrades: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradingService,
        {
          provide: TradeEngineClient,
          useValue: mockTradeEngineClient,
        },
      ],
    }).compile();

    service = module.get<TradingService>(TradingService);
    client = module.get<TradeEngineClient>(TradeEngineClient);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('placeOrder', () => {
    it('should successfully place a limit order', async () => {
      const userId = 'user123';
      const orderDto: CreateOrderDTO = {
        symbol: 'BTC-USDT',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: '1.0',
        price: '50000.00',
        timeInForce: TimeInForce.GTC,
      };

      const mockResponse = {
        success: true,
        data: {
          order: {
            id: 'order123',
            user_id: userId,
            symbol: 'BTC-USDT',
            side: 'buy',
            type: 'limit',
            status: 'open',
            quantity: '1.0',
            filled_quantity: '0',
            remaining_quantity: '1.0',
            price: '50000.00',
            time_in_force: 'GTC',
            post_only: false,
            created_at: '2025-11-23T00:00:00Z',
            updated_at: '2025-11-23T00:00:00Z',
          },
          trades: [],
        },
      };

      mockTradeEngineClient.placeOrder.mockResolvedValue(mockResponse);

      const result = await service.placeOrder(userId, orderDto);

      expect(result.success).toBe(true);
      expect(result.data.order.id).toBe('order123');
      expect(mockTradeEngineClient.placeOrder).toHaveBeenCalledWith(userId, {
        symbol: orderDto.symbol,
        side: orderDto.side,
        type: orderDto.type,
        quantity: orderDto.quantity,
        price: orderDto.price,
        time_in_force: orderDto.timeInForce,
        trigger_price: undefined,
        post_only: undefined,
      });
    });

    it('should successfully place a market order', async () => {
      const userId = 'user123';
      const orderDto: CreateOrderDTO = {
        symbol: 'BTC-USDT',
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        quantity: '0.5',
      };

      const mockResponse = {
        success: true,
        data: {
          order: {
            id: 'order456',
            user_id: userId,
            symbol: 'BTC-USDT',
            side: 'sell',
            type: 'market',
            status: 'filled',
            quantity: '0.5',
            filled_quantity: '0.5',
            remaining_quantity: '0',
            average_fill_price: '50100.00',
            time_in_force: 'IOC',
            post_only: false,
            created_at: '2025-11-23T00:00:00Z',
            updated_at: '2025-11-23T00:00:00Z',
          },
          trades: [
            {
              id: 'trade1',
              symbol: 'BTC-USDT',
              price: '50100.00',
              quantity: '0.5',
              buyer_order_id: 'order789',
              seller_order_id: 'order456',
              taker_side: 'sell',
              executed_at: '2025-11-23T00:00:00Z',
            },
          ],
        },
      };

      mockTradeEngineClient.placeOrder.mockResolvedValue(mockResponse);

      const result = await service.placeOrder(userId, orderDto);

      expect(result.success).toBe(true);
      expect(result.data.order.status).toBe('filled');
      expect(result.data.trades).toHaveLength(1);
      expect(mockTradeEngineClient.placeOrder).toHaveBeenCalledWith(userId, {
        symbol: orderDto.symbol,
        side: orderDto.side,
        type: orderDto.type,
        quantity: orderDto.quantity,
        price: undefined,
        time_in_force: undefined,
        trigger_price: undefined,
        post_only: undefined,
      });
    });

    it('should handle order placement error', async () => {
      const userId = 'user123';
      const orderDto: CreateOrderDTO = {
        symbol: 'BTC-USDT',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: '1.0',
        price: '50000.00',
      };

      const error = new Error('Insufficient balance');
      mockTradeEngineClient.placeOrder.mockRejectedValue(error);

      await expect(service.placeOrder(userId, orderDto)).rejects.toThrow('Insufficient balance');
      expect(mockTradeEngineClient.placeOrder).toHaveBeenCalled();
    });
  });

  describe('getOrderBook', () => {
    it('should successfully fetch order book', async () => {
      const symbol = 'BTC-USDT';
      const depth = 20;

      const mockResponse = {
        success: true,
        data: {
          symbol: 'BTC-USDT',
          bids: [
            { price: '50000.00', quantity: '1.0', order_count: 5 },
            { price: '49999.00', quantity: '2.0', order_count: 3 },
          ],
          asks: [
            { price: '50001.00', quantity: '1.5', order_count: 4 },
            { price: '50002.00', quantity: '2.5', order_count: 6 },
          ],
          timestamp: '2025-11-23T00:00:00Z',
        },
      };

      mockTradeEngineClient.getOrderBook.mockResolvedValue(mockResponse);

      const result = await service.getOrderBook(symbol, depth);

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('BTC-USDT');
      expect(result.data.bids).toHaveLength(2);
      expect(result.data.asks).toHaveLength(2);
      expect(mockTradeEngineClient.getOrderBook).toHaveBeenCalledWith(symbol, depth);
    });

    it('should use default depth if not provided', async () => {
      const symbol = 'ETH-USDT';

      const mockResponse = {
        success: true,
        data: {
          symbol: 'ETH-USDT',
          bids: [],
          asks: [],
          timestamp: '2025-11-23T00:00:00Z',
        },
      };

      mockTradeEngineClient.getOrderBook.mockResolvedValue(mockResponse);

      const result = await service.getOrderBook(symbol);

      expect(mockTradeEngineClient.getOrderBook).toHaveBeenCalledWith(symbol, 20);
    });
  });

  describe('getMarketTicker', () => {
    it('should successfully fetch market ticker', async () => {
      const symbol = 'BTC-USDT';

      const mockResponse = {
        success: true,
        data: {
          symbol: 'BTC-USDT',
          last_price: '50000.00',
          bid_price: '49999.00',
          ask_price: '50001.00',
          high_24h: '51000.00',
          low_24h: '49000.00',
          volume_24h: '1000.00',
          price_change_24h: '1000.00',
          price_change_percent_24h: '2.04',
          timestamp: '2025-11-23T00:00:00Z',
        },
      };

      mockTradeEngineClient.getMarketData.mockResolvedValue(mockResponse);

      const result = await service.getMarketTicker(symbol);

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('BTC-USDT');
      expect(result.data.last_price).toBe('50000.00');
      expect(mockTradeEngineClient.getMarketData).toHaveBeenCalledWith(symbol);
    });
  });

  describe('getUserOrders', () => {
    it('should successfully fetch user orders with status filter', async () => {
      const userId = 'user123';
      const status = 'open';

      const mockResponse = {
        success: true,
        data: {
          orders: [
            {
              id: 'order1',
              user_id: userId,
              symbol: 'BTC-USDT',
              side: 'buy',
              type: 'limit',
              status: 'open',
              quantity: '1.0',
              filled_quantity: '0',
              remaining_quantity: '1.0',
              price: '50000.00',
              time_in_force: 'GTC',
              post_only: false,
              created_at: '2025-11-23T00:00:00Z',
              updated_at: '2025-11-23T00:00:00Z',
            },
          ],
          total: 1,
        },
      };

      mockTradeEngineClient.getUserOrders.mockResolvedValue(mockResponse);

      const result = await service.getUserOrders(userId, status);

      expect(result.success).toBe(true);
      expect(result.data.orders).toHaveLength(1);
      expect(result.data.total).toBe(1);
      expect(mockTradeEngineClient.getUserOrders).toHaveBeenCalledWith(userId, status);
    });

    it('should fetch all user orders without status filter', async () => {
      const userId = 'user123';

      const mockResponse = {
        success: true,
        data: {
          orders: [],
          total: 0,
        },
      };

      mockTradeEngineClient.getUserOrders.mockResolvedValue(mockResponse);

      const result = await service.getUserOrders(userId);

      expect(result.success).toBe(true);
      expect(mockTradeEngineClient.getUserOrders).toHaveBeenCalledWith(userId, undefined);
    });
  });

  describe('getOrder', () => {
    it('should successfully fetch a specific order', async () => {
      const userId = 'user123';
      const orderId = 'order123';

      const mockResponse = {
        success: true,
        data: {
          id: orderId,
          user_id: userId,
          symbol: 'BTC-USDT',
          side: 'buy',
          type: 'limit',
          status: 'filled',
          quantity: '1.0',
          filled_quantity: '1.0',
          remaining_quantity: '0',
          price: '50000.00',
          average_fill_price: '50000.00',
          time_in_force: 'GTC',
          post_only: false,
          created_at: '2025-11-23T00:00:00Z',
          updated_at: '2025-11-23T00:00:00Z',
        },
      };

      mockTradeEngineClient.getOrder.mockResolvedValue(mockResponse);

      const result = await service.getOrder(userId, orderId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(orderId);
      expect(result.data.status).toBe('filled');
      expect(mockTradeEngineClient.getOrder).toHaveBeenCalledWith(userId, orderId);
    });
  });

  describe('cancelOrder', () => {
    it('should successfully cancel an order', async () => {
      const userId = 'user123';
      const orderId = 'order123';

      const mockResponse = {
        success: true,
        data: {
          id: orderId,
          user_id: userId,
          symbol: 'BTC-USDT',
          side: 'buy',
          type: 'limit',
          status: 'cancelled',
          quantity: '1.0',
          filled_quantity: '0',
          remaining_quantity: '0',
          price: '50000.00',
          time_in_force: 'GTC',
          post_only: false,
          created_at: '2025-11-23T00:00:00Z',
          updated_at: '2025-11-23T00:00:00Z',
        },
      };

      mockTradeEngineClient.cancelOrder.mockResolvedValue(mockResponse);

      const result = await service.cancelOrder(userId, orderId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('cancelled');
      expect(mockTradeEngineClient.cancelOrder).toHaveBeenCalledWith(userId, orderId);
    });

    it('should handle cancel order error', async () => {
      const userId = 'user123';
      const orderId = 'order123';

      const error = new Error('Order already filled');
      mockTradeEngineClient.cancelOrder.mockRejectedValue(error);

      await expect(service.cancelOrder(userId, orderId)).rejects.toThrow('Order already filled');
      expect(mockTradeEngineClient.cancelOrder).toHaveBeenCalled();
    });
  });

  describe('getRecentTrades', () => {
    it('should successfully fetch trades with symbol filter', async () => {
      const symbol = 'BTC-USDT';
      const limit = 50;

      const mockResponse = {
        success: true,
        data: {
          trades: [
            {
              id: 'trade1',
              symbol: 'BTC-USDT',
              price: '50000.00',
              quantity: '1.0',
              buyer_order_id: 'order1',
              seller_order_id: 'order2',
              taker_side: 'buy',
              executed_at: '2025-11-23T00:00:00Z',
            },
          ],
          total: 1,
        },
      };

      mockTradeEngineClient.getTrades.mockResolvedValue(mockResponse);

      const result = await service.getRecentTrades(symbol, limit);

      expect(result.success).toBe(true);
      expect(result.data.trades).toHaveLength(1);
      expect(mockTradeEngineClient.getTrades).toHaveBeenCalledWith(symbol, limit);
    });

    it('should fetch all trades without symbol filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          trades: [],
          total: 0,
        },
      };

      mockTradeEngineClient.getTrades.mockResolvedValue(mockResponse);

      const result = await service.getRecentTrades();

      expect(mockTradeEngineClient.getTrades).toHaveBeenCalledWith(undefined, 100);
    });
  });
});
