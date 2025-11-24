import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TradeEngineClient } from '../services/trade-engine.client';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';

describe('TradeEngineClient', () => {
  let client: TradeEngineClient;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TRADE_ENGINE_API_URL') return 'http://localhost:8080/api/v1';
      if (key === 'TRADE_ENGINE_SERVICE_TOKEN') return 'test-token';
      return null;
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeEngineClient,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    client = module.get<TradeEngineClient>(TradeEngineClient);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('placeOrder', () => {
    it('should successfully place an order', async () => {
      const userId = 'user123';
      const orderRequest = {
        symbol: 'BTC-USDT',
        side: 'buy',
        type: 'limit',
        quantity: '1.0',
        price: '50000.00',
      };

      const mockResponse: AxiosResponse = {
        data: {
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
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await client.placeOrder(userId, orderRequest);

      expect(result.success).toBe(true);
      expect(result.data.order.id).toBe('order123');
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/orders',
        orderRequest,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-ID': userId,
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should handle 400 bad request error', async () => {
      const userId = 'user123';
      const orderRequest = {
        symbol: 'BTC-USDT',
        side: 'buy',
        type: 'limit',
        quantity: '1.0',
      };

      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Invalid order',
        isAxiosError: true,
        toJSON: () => ({}),
        response: {
          status: 400,
          data: { message: 'Invalid order parameters' },
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
        },
      } as any;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(client.placeOrder(userId, orderRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle connection refused error', async () => {
      const userId = 'user123';
      const orderRequest = {
        symbol: 'BTC-USDT',
        side: 'buy',
        type: 'market',
        quantity: '1.0',
      };

      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Connection refused',
        code: 'ECONNREFUSED',
        isAxiosError: true,
        toJSON: () => ({}),
      } as any;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(client.placeOrder(userId, orderRequest)).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getOrderBook', () => {
    it('should successfully fetch order book', async () => {
      const symbol = 'BTC-USDT';
      const depth = 20;

      const mockResponse: AxiosResponse = {
        data: {
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
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await client.getOrderBook(symbol, depth);

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('BTC-USDT');
      expect(result.data.bids).toHaveLength(2);
      expect(result.data.asks).toHaveLength(2);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/orderbook/BTC-USDT',
        expect.objectContaining({
          params: { depth },
        }),
      );
    });

    it('should handle 404 not found error', async () => {
      const symbol = 'INVALID-PAIR';

      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Not found',
        isAxiosError: true,
        toJSON: () => ({}),
        response: {
          status: 404,
          data: { message: 'Trading pair not found' },
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        },
      } as any;

      mockHttpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(client.getOrderBook(symbol)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMarketData', () => {
    it('should successfully fetch market data', async () => {
      const symbol = 'BTC-USDT';

      const mockResponse: AxiosResponse = {
        data: {
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
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await client.getMarketData(symbol);

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('BTC-USDT');
      expect(result.data.last_price).toBe('50000.00');
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/markets/BTC-USDT/ticker',
        expect.any(Object),
      );
    });
  });

  describe('getUserOrders', () => {
    it('should successfully fetch user orders', async () => {
      const userId = 'user123';
      const status = 'open';

      const mockResponse: AxiosResponse = {
        data: {
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
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await client.getUserOrders(userId, status);

      expect(result.success).toBe(true);
      expect(result.data.orders).toHaveLength(1);
      expect(result.data.total).toBe(1);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/orders',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-ID': userId,
          }),
          params: { status },
        }),
      );
    });

    it('should fetch all user orders without status filter', async () => {
      const userId = 'user123';

      const mockResponse: AxiosResponse = {
        data: {
          success: true,
          data: {
            orders: [],
            total: 0,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await client.getUserOrders(userId);

      expect(result.success).toBe(true);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/orders',
        expect.objectContaining({
          params: {},
        }),
      );
    });
  });

  describe('getOrder', () => {
    it('should successfully fetch a specific order', async () => {
      const userId = 'user123';
      const orderId = 'order123';

      const mockResponse: AxiosResponse = {
        data: {
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
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await client.getOrder(userId, orderId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(orderId);
      expect(result.data.status).toBe('filled');
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/orders/${orderId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-ID': userId,
          }),
        }),
      );
    });
  });

  describe('cancelOrder', () => {
    it('should successfully cancel an order', async () => {
      const userId = 'user123';
      const orderId = 'order123';

      const mockResponse: AxiosResponse = {
        data: {
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
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.delete.mockReturnValue(of(mockResponse));

      const result = await client.cancelOrder(userId, orderId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('cancelled');
      expect(mockHttpService.delete).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/orders/${orderId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-ID': userId,
          }),
        }),
      );
    });
  });

  describe('getTrades', () => {
    it('should successfully fetch trades with symbol filter', async () => {
      const symbol = 'BTC-USDT';
      const limit = 50;

      const mockResponse: AxiosResponse = {
        data: {
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
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await client.getTrades(symbol, limit);

      expect(result.success).toBe(true);
      expect(result.data.trades).toHaveLength(1);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/trades',
        expect.objectContaining({
          params: { symbol, limit },
        }),
      );
    });

    it('should fetch all trades without symbol filter', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          success: true,
          data: {
            trades: [],
            total: 0,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await client.getTrades();

      expect(result.success).toBe(true);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/trades',
        expect.objectContaining({
          params: { limit: 100 },
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle ETIMEDOUT error', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Timeout',
        code: 'ETIMEDOUT',
        isAxiosError: true,
        toJSON: () => ({}),
      } as any;

      mockHttpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(client.getOrderBook('BTC-USDT')).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle ENOTFOUND error', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Not found',
        code: 'ENOTFOUND',
        isAxiosError: true,
        toJSON: () => ({}),
      } as any;

      mockHttpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(client.getOrderBook('BTC-USDT')).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle 503 service unavailable error', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Service unavailable',
        isAxiosError: true,
        toJSON: () => ({}),
        response: {
          status: 503,
          data: { message: 'Service temporarily unavailable' },
          statusText: 'Service Unavailable',
          headers: {},
          config: {} as any,
        },
      } as any;

      mockHttpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(client.getOrderBook('BTC-USDT')).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle unknown errors', async () => {
      const axiosError: AxiosError = {
        name: 'AxiosError',
        message: 'Unknown error',
        isAxiosError: true,
        toJSON: () => ({}),
      } as any;

      mockHttpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(client.getOrderBook('BTC-USDT')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
