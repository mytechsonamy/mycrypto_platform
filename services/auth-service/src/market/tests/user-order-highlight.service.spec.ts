import { Test, TestingModule } from '@nestjs/testing';
import { UserOrderHighlightService } from '../services/user-order-highlight.service';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';
import { RedisService } from '../../common/services/redis.service';
import { NotFoundException } from '@nestjs/common';

describe('UserOrderHighlightService', () => {
  let service: UserOrderHighlightService;
  let tradeEngineClient: jest.Mocked<TradeEngineClient>;
  let redisService: jest.Mocked<RedisService>;

  const mockUserId = 'user-uuid-123';
  const mockOrders = [
    {
      id: 'order-1',
      user_id: mockUserId,
      symbol: 'BTC_TRY',
      side: 'BUY',
      type: 'LIMIT',
      status: 'OPEN',
      price: '50000.00000000',
      quantity: '1.5',
      filled_quantity: '0',
      remaining_quantity: '1.5',
      time_in_force: 'GTC',
      post_only: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'order-2',
      user_id: mockUserId,
      symbol: 'BTC_TRY',
      side: 'SELL',
      type: 'LIMIT',
      status: 'OPEN',
      price: '51000.00000000',
      quantity: '2.0',
      filled_quantity: '0',
      remaining_quantity: '2.0',
      time_in_force: 'GTC',
      post_only: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'order-3',
      user_id: mockUserId,
      symbol: 'BTC_TRY',
      side: 'BUY',
      type: 'LIMIT',
      status: 'OPEN',
      price: '49000.00000000',
      quantity: '1.0',
      filled_quantity: '0',
      remaining_quantity: '1.0',
      time_in_force: 'GTC',
      post_only: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOrderHighlightService,
        {
          provide: TradeEngineClient,
          useValue: {
            getOpenOrders: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            setEx: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserOrderHighlightService>(UserOrderHighlightService);
    tradeEngineClient = module.get(TradeEngineClient) as jest.Mocked<TradeEngineClient>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHighlightedPrices', () => {
    it('should return array of unique price levels from user orders', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null); // Cache miss
      tradeEngineClient.getOpenOrders.mockResolvedValue({
        success: true,
        data: {
          orders: mockOrders,
          total: mockOrders.length,
        },
      });

      // Act
      const result = await service.getHighlightedPrices(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result).toContain('51000.00000000');
      expect(result).toContain('50000.00000000');
      expect(result).toContain('49000.00000000');

      // Verify cache was called
      expect(redisService.setEx).toHaveBeenCalledWith(
        `user:order:prices:${mockUserId}`,
        60,
        expect.any(String)
      );
    });

    it('should return prices sorted in descending order', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOpenOrders.mockResolvedValue({
        success: true,
        data: {
          orders: mockOrders,
          total: mockOrders.length,
        },
      });

      // Act
      const result = await service.getHighlightedPrices(mockUserId);

      // Assert
      expect(result[0]).toBe('51000.00000000');
      expect(result[1]).toBe('50000.00000000');
      expect(result[2]).toBe('49000.00000000');
    });

    it('should return cached prices if available', async () => {
      // Arrange
      const cachedPrices = ['50000.00000000', '49000.00000000'];
      redisService.get.mockResolvedValue(JSON.stringify(cachedPrices));

      // Act
      const result = await service.getHighlightedPrices(mockUserId);

      // Assert
      expect(result).toEqual(cachedPrices);
      expect(tradeEngineClient.getOpenOrders).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for empty user ID', async () => {
      // Act & Assert
      await expect(service.getHighlightedPrices('')).rejects.toThrow(NotFoundException);
      await expect(service.getHighlightedPrices('   ')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when user has no orders', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOpenOrders.mockResolvedValue({
        success: true,
        data: {
          orders: [],
          total: 0,
        },
      });

      // Act
      const result = await service.getHighlightedPrices(mockUserId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter out market orders (no price)', async () => {
      // Arrange
      const ordersWithMarket = [
        ...mockOrders,
        {
          id: 'order-4',
          user_id: mockUserId,
          symbol: 'BTC_TRY',
          side: 'BUY',
          type: 'MARKET',
          status: 'OPEN',
          price: undefined,
          quantity: '1.0',
          filled_quantity: '0',
          remaining_quantity: '1.0',
          time_in_force: 'IOC',
          post_only: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOpenOrders.mockResolvedValue({
        success: true,
        data: {
          orders: ordersWithMarket,
          total: ordersWithMarket.length,
        },
      });

      // Act
      const result = await service.getHighlightedPrices(mockUserId);

      // Assert
      expect(result).toHaveLength(3); // Only LIMIT orders with prices
    });

    it('should deduplicate prices', async () => {
      // Arrange
      const ordersWithDuplicates = [
        ...mockOrders,
        {
          id: 'order-4',
          user_id: mockUserId,
          symbol: 'BTC_TRY',
          side: 'BUY',
          type: 'LIMIT',
          status: 'OPEN',
          price: '50000.00000000', // Duplicate price
          quantity: '1.0',
          filled_quantity: '0',
          remaining_quantity: '1.0',
          time_in_force: 'GTC',
          post_only: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOpenOrders.mockResolvedValue({
        success: true,
        data: {
          orders: ordersWithDuplicates,
          total: ordersWithDuplicates.length,
        },
      });

      // Act
      const result = await service.getHighlightedPrices(mockUserId);

      // Assert
      expect(result).toHaveLength(3); // Deduplicated
    });

    it('should return empty array on error instead of throwing', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOpenOrders.mockRejectedValue(new Error('Trade Engine unavailable'));

      // Act
      const result = await service.getHighlightedPrices(mockUserId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should meet performance SLA (<20ms) for cached data', async () => {
      // Arrange
      const cachedPrices = ['50000.00000000'];
      redisService.get.mockResolvedValue(JSON.stringify(cachedPrices));

      // Act
      const startTime = Date.now();
      await service.getHighlightedPrices(mockUserId);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(20);
    });

    it('should handle Trade Engine NotFoundException', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOpenOrders.mockResolvedValue({
        success: false,
        data: null,
      });

      // Act & Assert
      await expect(service.getHighlightedPrices(mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('buildUserOrderPricesEvent', () => {
    it('should build WebSocket event with correct format', () => {
      // Arrange
      const prices = ['50000.00000000', '49000.00000000'];

      // Act
      const event = service.buildUserOrderPricesEvent(mockUserId, prices);

      // Assert
      expect(event).toMatchObject({
        type: 'user_order_prices',
        userId: mockUserId,
        prices,
      });
      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('invalidateUserCache', () => {
    it('should delete cache for user', async () => {
      // Act
      await service.invalidateUserCache(mockUserId);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith(`user:order:prices:${mockUserId}`);
    });

    it('should not throw on cache deletion error', async () => {
      // Arrange
      redisService.del.mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(service.invalidateUserCache(mockUserId)).resolves.not.toThrow();
    });
  });
});
