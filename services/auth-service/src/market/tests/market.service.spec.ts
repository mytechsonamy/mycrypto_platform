import { Test, TestingModule } from '@nestjs/testing';
import { MarketService } from '../services/market.service';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';
import { RedisService } from '../../common/services/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MarketService', () => {
  let service: MarketService;
  let tradeEngineClient: TradeEngineClient;
  let redisService: RedisService;

  const mockTradeEngineClient = {
    getOrderBook: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    setEx: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketService,
        {
          provide: TradeEngineClient,
          useValue: mockTradeEngineClient,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<MarketService>(MarketService);
    tradeEngineClient = module.get<TradeEngineClient>(TradeEngineClient);
    redisService = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  describe('getOrderbook', () => {
    it('should return orderbook from cache if available', async () => {
      const symbol = 'BTC_TRY';
      const depth = 20;
      const cachedData = {
        symbol,
        bids: [{ price: '50000', quantity: '1.0' }],
        asks: [{ price: '50001', quantity: '1.0' }],
        lastUpdateId: 12345,
        spread: '1.00000000',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getOrderbook(symbol, depth);

      expect(result).toEqual(cachedData);
      expect(mockRedisService.get).toHaveBeenCalledWith(`orderbook:${symbol}:${depth}`);
      expect(mockTradeEngineClient.getOrderBook).not.toHaveBeenCalled();
    });

    it('should fetch orderbook from Trade Engine on cache miss', async () => {
      const symbol = 'BTC_TRY';
      const depth = 20;
      const tradeEngineResponse = {
        success: true,
        data: {
          symbol: 'BTC/TRY',
          bids: [['50000', '1.0']],
          asks: [['50001', '1.0']],
          timestamp: '2025-11-24T00:00:00.000Z',
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getOrderBook.mockResolvedValue(tradeEngineResponse);

      const result = await service.getOrderbook(symbol, depth);

      expect(result.symbol).toBe(symbol);
      expect(result.bids).toHaveLength(1);
      expect(result.asks).toHaveLength(1);
      expect(mockTradeEngineClient.getOrderBook).toHaveBeenCalledWith('BTC/TRY', depth);
      expect(mockRedisService.setEx).toHaveBeenCalled();
    });

    it('should validate symbol and throw BadRequestException for invalid symbol', async () => {
      const symbol = 'INVALID_SYMBOL';
      const depth = 20;

      await expect(service.getOrderbook(symbol, depth)).rejects.toThrow(BadRequestException);
      expect(mockTradeEngineClient.getOrderBook).not.toHaveBeenCalled();
    });

    it('should validate depth and throw BadRequestException if depth < 1', async () => {
      const symbol = 'BTC_TRY';
      const depth = 0;

      await expect(service.getOrderbook(symbol, depth)).rejects.toThrow(BadRequestException);
      expect(mockTradeEngineClient.getOrderBook).not.toHaveBeenCalled();
    });

    it('should validate depth and throw BadRequestException if depth > 100', async () => {
      const symbol = 'BTC_TRY';
      const depth = 101;

      await expect(service.getOrderbook(symbol, depth)).rejects.toThrow(BadRequestException);
      expect(mockTradeEngineClient.getOrderBook).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if orderbook not found', async () => {
      const symbol = 'BTC_TRY';
      const depth = 20;

      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getOrderBook.mockResolvedValue({
        success: false,
        data: null,
      });

      await expect(service.getOrderbook(symbol, depth)).rejects.toThrow(NotFoundException);
    });

    it('should calculate spread correctly', async () => {
      const symbol = 'BTC_TRY';
      const depth = 20;
      const tradeEngineResponse = {
        success: true,
        data: {
          symbol: 'BTC/TRY',
          bids: [['50000.00', '1.0']],
          asks: [['50005.00', '1.0']],
          timestamp: '2025-11-24T00:00:00.000Z',
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getOrderBook.mockResolvedValue(tradeEngineResponse);

      const result = await service.getOrderbook(symbol, depth);

      expect(result.spread).toBe('5.00000000'); // 50005 - 50000 = 5
    });

    it('should handle cache failure gracefully and continue', async () => {
      const symbol = 'BTC_TRY';
      const depth = 20;
      const tradeEngineResponse = {
        success: true,
        data: {
          symbol: 'BTC/TRY',
          bids: [['50000', '1.0']],
          asks: [['50001', '1.0']],
          timestamp: '2025-11-24T00:00:00.000Z',
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setEx.mockRejectedValue(new Error('Redis connection error'));
      mockTradeEngineClient.getOrderBook.mockResolvedValue(tradeEngineResponse);

      // Should not throw even if caching fails
      const result = await service.getOrderbook(symbol, depth);

      expect(result.symbol).toBe(symbol);
      expect(mockTradeEngineClient.getOrderBook).toHaveBeenCalled();
    });

    it('should use default depth of 20 if not provided', async () => {
      const symbol = 'BTC_TRY';
      const tradeEngineResponse = {
        success: true,
        data: {
          symbol: 'BTC/TRY',
          bids: [['50000', '1.0']],
          asks: [['50001', '1.0']],
          timestamp: '2025-11-24T00:00:00.000Z',
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getOrderBook.mockResolvedValue(tradeEngineResponse);

      await service.getOrderbook(symbol);

      expect(mockTradeEngineClient.getOrderBook).toHaveBeenCalledWith('BTC/TRY', 20);
    });

    it('should limit bids and asks to requested depth', async () => {
      const symbol = 'BTC_TRY';
      const depth = 2;
      const tradeEngineResponse = {
        success: true,
        data: {
          symbol: 'BTC/TRY',
          bids: [
            ['50000', '1.0'],
            ['49999', '1.0'],
            ['49998', '1.0'],
          ],
          asks: [
            ['50001', '1.0'],
            ['50002', '1.0'],
            ['50003', '1.0'],
          ],
          timestamp: '2025-11-24T00:00:00.000Z',
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getOrderBook.mockResolvedValue(tradeEngineResponse);

      const result = await service.getOrderbook(symbol, depth);

      expect(result.bids).toHaveLength(2);
      expect(result.asks).toHaveLength(2);
    });
  });
});
