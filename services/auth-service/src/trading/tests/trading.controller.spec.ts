import { Test, TestingModule } from '@nestjs/testing';
import { TradingController } from '../controllers/trading.controller';
import { TradingService } from '../services/trading.service';
import { CreateOrderDTO, OrderSide, OrderType, TimeInForce } from '../dto';

describe('TradingController', () => {
  let controller: TradingController;
  let service: TradingService;

  const mockTradingService = {
    placeOrder: jest.fn(),
    getOrderBook: jest.fn(),
    getMarketTicker: jest.fn(),
    getUserOrders: jest.fn(),
    getOrder: jest.fn(),
    cancelOrder: jest.fn(),
    getRecentTrades: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradingController],
      providers: [
        {
          provide: TradingService,
          useValue: mockTradingService,
        },
      ],
    }).compile();

    controller = module.get<TradingController>(TradingController);
    service = module.get<TradingService>(TradingService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('placeOrder', () => {
    it('should place a limit order', async () => {
      const userId = 'user123';
      const req = { user: { id: userId } };
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

      mockTradingService.placeOrder.mockResolvedValue(mockResponse);

      const result = await controller.placeOrder(req, orderDto);

      expect(result.success).toBe(true);
      expect(result.data.order.id).toBe('order123');
      expect(mockTradingService.placeOrder).toHaveBeenCalledWith(userId, orderDto);
    });

    it('should place a market order', async () => {
      const userId = 'user456';
      const req = { user: { sub: userId } }; // Test with 'sub' instead of 'id'
      const orderDto: CreateOrderDTO = {
        symbol: 'ETH-USDT',
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        quantity: '2.0',
      };

      const mockResponse = {
        success: true,
        data: {
          order: {
            id: 'order456',
            user_id: userId,
            symbol: 'ETH-USDT',
            side: 'sell',
            type: 'market',
            status: 'filled',
            quantity: '2.0',
            filled_quantity: '2.0',
            remaining_quantity: '0',
            average_fill_price: '3000.00',
            time_in_force: 'IOC',
            post_only: false,
            created_at: '2025-11-23T00:00:00Z',
            updated_at: '2025-11-23T00:00:00Z',
          },
          trades: [
            {
              id: 'trade1',
              symbol: 'ETH-USDT',
              price: '3000.00',
              quantity: '2.0',
              buyer_order_id: 'order789',
              seller_order_id: 'order456',
              taker_side: 'sell',
              executed_at: '2025-11-23T00:00:00Z',
            },
          ],
        },
      };

      mockTradingService.placeOrder.mockResolvedValue(mockResponse);

      const result = await controller.placeOrder(req, orderDto);

      expect(result.success).toBe(true);
      expect(result.data.order.status).toBe('filled');
      expect(result.data.trades).toHaveLength(1);
      expect(mockTradingService.placeOrder).toHaveBeenCalledWith(userId, orderDto);
    });
  });

  describe('getOrderBook', () => {
    it('should get order book with default depth', async () => {
      const symbol = 'BTC-USDT';

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

      mockTradingService.getOrderBook.mockResolvedValue(mockResponse);

      const result = await controller.getOrderBook(symbol);

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('BTC-USDT');
      expect(mockTradingService.getOrderBook).toHaveBeenCalledWith(symbol, 20);
    });

    it('should get order book with custom depth', async () => {
      const symbol = 'ETH-USDT';
      const depth = 50;

      const mockResponse = {
        success: true,
        data: {
          symbol: 'ETH-USDT',
          bids: [],
          asks: [],
          timestamp: '2025-11-23T00:00:00Z',
        },
      };

      mockTradingService.getOrderBook.mockResolvedValue(mockResponse);

      const result = await controller.getOrderBook(symbol, depth);

      expect(result.success).toBe(true);
      expect(mockTradingService.getOrderBook).toHaveBeenCalledWith(symbol, depth);
    });
  });

  describe('getMarketTicker', () => {
    it('should get market ticker data', async () => {
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

      mockTradingService.getMarketTicker.mockResolvedValue(mockResponse);

      const result = await controller.getMarketTicker(symbol);

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('BTC-USDT');
      expect(result.data.last_price).toBe('50000.00');
      expect(mockTradingService.getMarketTicker).toHaveBeenCalledWith(symbol);
    });
  });

  describe('getUserOrders', () => {
    it('should get user orders with status filter', async () => {
      const userId = 'user123';
      const req = { user: { id: userId } };
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

      mockTradingService.getUserOrders.mockResolvedValue(mockResponse);

      const result = await controller.getUserOrders(req, status);

      expect(result.success).toBe(true);
      expect(result.data.orders).toHaveLength(1);
      expect(mockTradingService.getUserOrders).toHaveBeenCalledWith(userId, status);
    });

    it('should get all user orders without status filter', async () => {
      const userId = 'user123';
      const req = { user: { id: userId } };

      const mockResponse = {
        success: true,
        data: {
          orders: [],
          total: 0,
        },
      };

      mockTradingService.getUserOrders.mockResolvedValue(mockResponse);

      const result = await controller.getUserOrders(req);

      expect(result.success).toBe(true);
      expect(mockTradingService.getUserOrders).toHaveBeenCalledWith(userId, undefined);
    });
  });

  describe('getOrder', () => {
    it('should get a specific order', async () => {
      const userId = 'user123';
      const orderId = 'order123';
      const req = { user: { id: userId } };

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

      mockTradingService.getOrder.mockResolvedValue(mockResponse);

      const result = await controller.getOrder(req, orderId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(orderId);
      expect(mockTradingService.getOrder).toHaveBeenCalledWith(userId, orderId);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      const userId = 'user123';
      const orderId = 'order123';
      const req = { user: { id: userId } };

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

      mockTradingService.cancelOrder.mockResolvedValue(mockResponse);

      const result = await controller.cancelOrder(req, orderId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('cancelled');
      expect(mockTradingService.cancelOrder).toHaveBeenCalledWith(userId, orderId);
    });
  });

  describe('getTrades', () => {
    it('should get trades with symbol filter', async () => {
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

      mockTradingService.getRecentTrades.mockResolvedValue(mockResponse);

      const result = await controller.getTrades(symbol, limit);

      expect(result.success).toBe(true);
      expect(result.data.trades).toHaveLength(1);
      expect(mockTradingService.getRecentTrades).toHaveBeenCalledWith(symbol, limit);
    });

    it('should get all trades with default limit', async () => {
      const mockResponse = {
        success: true,
        data: {
          trades: [],
          total: 0,
        },
      };

      mockTradingService.getRecentTrades.mockResolvedValue(mockResponse);

      const result = await controller.getTrades();

      expect(result.success).toBe(true);
      expect(mockTradingService.getRecentTrades).toHaveBeenCalledWith(undefined, 100);
    });
  });
});
