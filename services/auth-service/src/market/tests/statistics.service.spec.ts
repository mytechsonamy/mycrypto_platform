import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatisticsService } from '../services/statistics.service';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';
import { RedisService } from '../../common/services/redis.service';
import { Statistics } from '../interfaces/statistics.interface';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let tradeEngineClient: jest.Mocked<TradeEngineClient>;
  let redisService: jest.Mocked<RedisService>;

  const mockTradesResponse = {
    success: true,
    data: {
      data: [
        {
          trade_id: '1',
          symbol: 'BTC_TRY',
          price: '50100.00000000',
          quantity: '0.50000000',
          executed_at: new Date().toISOString(),
          is_buyer_maker: false,
        },
        {
          trade_id: '2',
          symbol: 'BTC_TRY',
          price: '50000.00000000',
          quantity: '0.30000000',
          executed_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          is_buyer_maker: true,
        },
        {
          trade_id: '3',
          symbol: 'BTC_TRY',
          price: '51000.00000000',
          quantity: '0.20000000',
          executed_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
          is_buyer_maker: false,
        },
        {
          trade_id: '4',
          symbol: 'BTC_TRY',
          price: '49000.00000000',
          quantity: '0.10000000',
          executed_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
          is_buyer_maker: true,
        },
      ],
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: 'test_request_id',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: TradeEngineClient,
          useValue: {
            getRecentTrades: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            setEx: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    tradeEngineClient = module.get(TradeEngineClient);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get24hStats', () => {
    it('should return cached statistics if available', async () => {
      const cachedStats: Statistics = {
        symbol: 'BTC_TRY',
        open: '49000.00000000',
        high: '51000.00000000',
        low: '49000.00000000',
        close: '50100.00000000',
        volume: '1.10000000',
        timestamp: new Date(),
      };

      redisService.get.mockResolvedValue(JSON.stringify(cachedStats));

      const result = await service.get24hStats('BTC_TRY');

      expect(result).toMatchObject({
        symbol: cachedStats.symbol,
        open: cachedStats.open,
        high: cachedStats.high,
        low: cachedStats.low,
        close: cachedStats.close,
        volume: cachedStats.volume,
      });
      expect(redisService.get).toHaveBeenCalledWith('statistics:24h:BTC_TRY');
      expect(tradeEngineClient.getRecentTrades).not.toHaveBeenCalled();
    });

    it('should calculate statistics from trades when cache misses', async () => {
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getRecentTrades.mockResolvedValue(mockTradesResponse);

      const result = await service.get24hStats('BTC_TRY');

      expect(result.symbol).toBe('BTC_TRY');
      expect(parseFloat(result.open)).toBe(49000); // Oldest trade
      expect(parseFloat(result.close)).toBe(50100); // Newest trade
      expect(parseFloat(result.high)).toBe(51000); // Highest price
      expect(parseFloat(result.low)).toBe(49000); // Lowest price
      expect(parseFloat(result.volume)).toBe(1.1); // Total quantity

      expect(tradeEngineClient.getRecentTrades).toHaveBeenCalledWith('BTC_TRY', 100);
      expect(redisService.setEx).toHaveBeenCalled();
    });

    it('should reject invalid symbols', async () => {
      await expect(service.get24hStats('INVALID_SYMBOL')).rejects.toThrow(BadRequestException);
      expect(tradeEngineClient.getRecentTrades).not.toHaveBeenCalled();
    });

    it('should return zero stats when no trades are available', async () => {
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getRecentTrades.mockResolvedValue({
        success: true,
        data: { data: [] },
        meta: { timestamp: new Date().toISOString() },
      });

      const result = await service.get24hStats('BTC_TRY');

      expect(result.symbol).toBe('BTC_TRY');
      expect(result.open).toBe('0.00000000');
      expect(result.high).toBe('0.00000000');
      expect(result.low).toBe('0.00000000');
      expect(result.close).toBe('0.00000000');
      expect(result.volume).toBe('0.00000000');
    });

    it('should return zero stats when Trade Engine returns no data', async () => {
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getRecentTrades.mockResolvedValue({
        success: false,
        data: null,
        meta: { timestamp: new Date().toISOString() },
      });

      const result = await service.get24hStats('ETH_TRY');

      expect(result.symbol).toBe('ETH_TRY');
      expect(result.open).toBe('0.00000000');
      expect(result.high).toBe('0.00000000');
      expect(result.low).toBe('0.00000000');
      expect(result.close).toBe('0.00000000');
      expect(result.volume).toBe('0.00000000');
    });

    it('should filter trades to last 24 hours only', async () => {
      redisService.get.mockResolvedValue(null);

      const now = new Date();
      const tradesWithOldData = {
        success: true,
        data: {
          data: [
            {
              trade_id: '1',
              symbol: 'BTC_TRY',
              price: '50000.00000000',
              quantity: '1.00000000',
              executed_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString(), // 1 hour ago
              is_buyer_maker: false,
            },
            {
              trade_id: '2',
              symbol: 'BTC_TRY',
              price: '48000.00000000',
              quantity: '1.00000000',
              executed_at: new Date(now.getTime() - 1000 * 60 * 60 * 25).toISOString(), // 25 hours ago (should be filtered out)
              is_buyer_maker: true,
            },
          ],
        },
        meta: { timestamp: new Date().toISOString() },
      };

      tradeEngineClient.getRecentTrades.mockResolvedValue(tradesWithOldData);

      const result = await service.get24hStats('BTC_TRY');

      // Should only include the 1-hour-old trade, not the 25-hour-old one
      expect(parseFloat(result.volume)).toBe(1.0); // Only first trade
      expect(parseFloat(result.open)).toBe(50000);
      expect(parseFloat(result.close)).toBe(50000);
    });

    it('should throw NotFoundException when symbol not found in Trade Engine', async () => {
      redisService.get.mockResolvedValue(null);
      const notFoundError = new Error('Not found');
      (notFoundError as any).status = 404;
      tradeEngineClient.getRecentTrades.mockRejectedValue(notFoundError);

      await expect(service.get24hStats('BTC_TRY')).rejects.toThrow(NotFoundException);
    });

    it('should handle Redis cache errors gracefully', async () => {
      redisService.get.mockRejectedValue(new Error('Redis connection error'));
      tradeEngineClient.getRecentTrades.mockResolvedValue(mockTradesResponse);

      const result = await service.get24hStats('BTC_TRY');

      // Should still work even if Redis fails
      expect(result.symbol).toBe('BTC_TRY');
      expect(tradeEngineClient.getRecentTrades).toHaveBeenCalled();
    });

    it('should handle Redis setEx errors gracefully', async () => {
      redisService.get.mockResolvedValue(null);
      redisService.setEx.mockRejectedValue(new Error('Redis write error'));
      tradeEngineClient.getRecentTrades.mockResolvedValue(mockTradesResponse);

      const result = await service.get24hStats('BTC_TRY');

      // Should still return result even if caching fails
      expect(result.symbol).toBe('BTC_TRY');
    });

    it('should complete within performance target (<30ms with cache)', async () => {
      const cachedStats: Statistics = {
        symbol: 'BTC_TRY',
        open: '49000.00000000',
        high: '51000.00000000',
        low: '49000.00000000',
        close: '50100.00000000',
        volume: '1.10000000',
        timestamp: new Date(),
      };

      redisService.get.mockResolvedValue(JSON.stringify(cachedStats));

      const startTime = Date.now();
      await service.get24hStats('BTC_TRY');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30);
    });

    it('should cache statistics with correct TTL', async () => {
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getRecentTrades.mockResolvedValue(mockTradesResponse);

      await service.get24hStats('BTC_TRY');

      expect(redisService.setEx).toHaveBeenCalledWith(
        'statistics:24h:BTC_TRY',
        10, // 10-second TTL
        expect.any(String),
      );
    });

    it('should handle all valid symbols', async () => {
      const validSymbols = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'];

      for (const symbol of validSymbols) {
        redisService.get.mockResolvedValue(null);
        tradeEngineClient.getRecentTrades.mockResolvedValue({
          success: true,
          data: { data: [] },
          meta: { timestamp: new Date().toISOString() },
        });

        const result = await service.get24hStats(symbol);
        expect(result.symbol).toBe(symbol);
      }
    });
  });
});
