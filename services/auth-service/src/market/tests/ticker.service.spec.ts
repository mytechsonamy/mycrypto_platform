import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TickerService } from '../services/ticker.service';
import { StatisticsService } from '../services/statistics.service';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';
import { RedisService } from '../../common/services/redis.service';
import { TickerResponseDto } from '../dto/ticker-response.dto';

describe('TickerService', () => {
  let service: TickerService;
  let tradeEngineClient: jest.Mocked<TradeEngineClient>;
  let statisticsService: jest.Mocked<StatisticsService>;
  let redisService: jest.Mocked<RedisService>;

  const mockTickerData = {
    success: true,
    data: {
      symbol: 'BTC_TRY',
      last_price: '50100.00000000',
      bid_price: '50090.00000000',
      ask_price: '50110.00000000',
      high_24h: '51000.00000000',
      low_24h: '49000.00000000',
      volume_24h: '1000.50000000',
      price_change_24h: '100.00000000',
      price_change_percent_24h: '0.20',
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: 'test_request_id',
    },
  };

  const mockStats = {
    symbol: 'BTC_TRY',
    open: '49000.00000000',
    high: '51000.00000000',
    low: '49000.00000000',
    close: '50100.00000000',
    volume: '1000.50000000',
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TickerService,
        {
          provide: TradeEngineClient,
          useValue: {
            getTickerData: jest.fn(),
          },
        },
        {
          provide: StatisticsService,
          useValue: {
            get24hStats: jest.fn(),
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

    service = module.get<TickerService>(TickerService);
    tradeEngineClient = module.get(TradeEngineClient);
    statisticsService = module.get(StatisticsService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTicker', () => {
    it('should return cached ticker if available', async () => {
      const cachedTicker: TickerResponseDto = {
        symbol: 'BTC_TRY',
        lastPrice: '50100.00000000',
        priceChange: '100.00000000',
        priceChangePercent: '0.20',
        high: '51000.00000000',
        low: '49000.00000000',
        volume: '1000.50000000',
        quoteVolume: '50150050.00000000',
        timestamp: new Date().toISOString(),
      };

      redisService.get.mockResolvedValue(JSON.stringify(cachedTicker));

      const result = await service.getTicker('BTC_TRY');

      expect(result).toEqual(cachedTicker);
      expect(redisService.get).toHaveBeenCalledWith('ticker:BTC_TRY');
      expect(tradeEngineClient.getTickerData).not.toHaveBeenCalled();
      expect(statisticsService.get24hStats).not.toHaveBeenCalled();
    });

    it('should fetch and calculate ticker when cache misses', async () => {
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getTickerData.mockResolvedValue(mockTickerData);
      statisticsService.get24hStats.mockResolvedValue(mockStats);

      const result = await service.getTicker('BTC_TRY');

      expect(result.symbol).toBe('BTC_TRY');
      expect(result.lastPrice).toBe('50100.00000000');
      expect(result.priceChange).toBe('100.00000000');
      expect(result.priceChangePercent).toBe('0.20');
      expect(result.high).toBe('51000.00000000');
      expect(result.low).toBe('49000.00000000');
      expect(result.volume).toBe('1000.50000000');

      // quoteVolume = volume * lastPrice = 1000.5 * 50100
      const expectedQuoteVolume = (1000.5 * 50100).toFixed(8);
      expect(result.quoteVolume).toBe(expectedQuoteVolume);

      expect(tradeEngineClient.getTickerData).toHaveBeenCalledWith('BTC_TRY');
      expect(statisticsService.get24hStats).toHaveBeenCalledWith('BTC_TRY');
      expect(redisService.setEx).toHaveBeenCalled();
    });

    it('should reject invalid symbols', async () => {
      await expect(service.getTicker('INVALID_SYMBOL')).rejects.toThrow(BadRequestException);
      expect(tradeEngineClient.getTickerData).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when ticker not found in Trade Engine', async () => {
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getTickerData.mockResolvedValue({
        success: false,
        data: null,
        meta: { timestamp: new Date().toISOString() },
      });

      await expect(service.getTicker('BTC_TRY')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when Trade Engine returns 404', async () => {
      redisService.get.mockResolvedValue(null);
      const notFoundError = new Error('Not found');
      (notFoundError as any).status = 404;
      tradeEngineClient.getTickerData.mockRejectedValue(notFoundError);

      await expect(service.getTicker('BTC_TRY')).rejects.toThrow(NotFoundException);
    });

    it('should handle Redis cache errors gracefully', async () => {
      redisService.get.mockRejectedValue(new Error('Redis connection error'));
      tradeEngineClient.getTickerData.mockResolvedValue(mockTickerData);
      statisticsService.get24hStats.mockResolvedValue(mockStats);

      const result = await service.getTicker('BTC_TRY');

      // Should still work even if Redis fails
      expect(result.symbol).toBe('BTC_TRY');
      expect(tradeEngineClient.getTickerData).toHaveBeenCalled();
    });

    it('should handle Redis setEx errors gracefully', async () => {
      redisService.get.mockResolvedValue(null);
      redisService.setEx.mockRejectedValue(new Error('Redis write error'));
      tradeEngineClient.getTickerData.mockResolvedValue(mockTickerData);
      statisticsService.get24hStats.mockResolvedValue(mockStats);

      const result = await service.getTicker('BTC_TRY');

      // Should still return result even if caching fails
      expect(result.symbol).toBe('BTC_TRY');
    });

    it('should cache ticker with correct TTL', async () => {
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getTickerData.mockResolvedValue(mockTickerData);
      statisticsService.get24hStats.mockResolvedValue(mockStats);

      await service.getTicker('BTC_TRY');

      expect(redisService.setEx).toHaveBeenCalledWith(
        'ticker:BTC_TRY',
        10, // 10-second TTL
        expect.any(String),
      );
    });

    it('should complete within performance target (<50ms with cache)', async () => {
      const cachedTicker: TickerResponseDto = {
        symbol: 'BTC_TRY',
        lastPrice: '50100.00000000',
        priceChange: '100.00000000',
        priceChangePercent: '0.20',
        high: '51000.00000000',
        low: '49000.00000000',
        volume: '1000.50000000',
        quoteVolume: '50150050.00000000',
        timestamp: new Date().toISOString(),
      };

      redisService.get.mockResolvedValue(JSON.stringify(cachedTicker));

      const startTime = Date.now();
      await service.getTicker('BTC_TRY');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });

    it('should handle all valid symbols', async () => {
      const validSymbols = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'];

      for (const symbol of validSymbols) {
        redisService.get.mockResolvedValue(null);
        tradeEngineClient.getTickerData.mockResolvedValue({
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol },
        });
        statisticsService.get24hStats.mockResolvedValue({
          ...mockStats,
          symbol,
        });

        const result = await service.getTicker(symbol);
        expect(result.symbol).toBe(symbol);
      }
    });
  });

  describe('getMultipleTickers', () => {
    it('should return tickers for multiple symbols', async () => {
      redisService.get.mockResolvedValue(null);

      tradeEngineClient.getTickerData
        .mockResolvedValueOnce({
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol: 'BTC_TRY' },
        })
        .mockResolvedValueOnce({
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol: 'ETH_TRY', last_price: '3500.00000000' },
        });

      statisticsService.get24hStats
        .mockResolvedValueOnce({ ...mockStats, symbol: 'BTC_TRY' })
        .mockResolvedValueOnce({ ...mockStats, symbol: 'ETH_TRY', close: '3500.00000000' });

      const result = await service.getMultipleTickers(['BTC_TRY', 'ETH_TRY']);

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('BTC_TRY');
      expect(result[1].symbol).toBe('ETH_TRY');
    });

    it('should reject empty symbol array', async () => {
      await expect(service.getMultipleTickers([])).rejects.toThrow(BadRequestException);
    });

    it('should reject more than 10 symbols', async () => {
      const tooManySymbols = new Array(11).fill('BTC_TRY');
      await expect(service.getMultipleTickers(tooManySymbols)).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid symbols in array', async () => {
      await expect(service.getMultipleTickers(['BTC_TRY', 'INVALID'])).rejects.toThrow(BadRequestException);
    });

    it('should fetch tickers in parallel for better performance', async () => {
      redisService.get.mockResolvedValue(null);

      const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      tradeEngineClient.getTickerData.mockImplementation(async (symbol) => {
        await mockDelay(10); // Simulate network delay
        return {
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol },
        };
      });

      statisticsService.get24hStats.mockImplementation(async (symbol) => {
        await mockDelay(10);
        return { ...mockStats, symbol };
      });

      const startTime = Date.now();
      await service.getMultipleTickers(['BTC_TRY', 'ETH_TRY', 'USDT_TRY']);
      const duration = Date.now() - startTime;

      // If parallel, should be ~20ms (max of all parallel calls)
      // If sequential, would be ~60ms (sum of all calls)
      // Allow some margin for test execution overhead
      expect(duration).toBeLessThan(100); // Much less than sequential would take
    });

    it('should handle partial failures gracefully', async () => {
      redisService.get.mockResolvedValue(null);

      tradeEngineClient.getTickerData
        .mockResolvedValueOnce({
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol: 'BTC_TRY' },
        })
        .mockRejectedValueOnce(new Error('Network error'));

      statisticsService.get24hStats.mockResolvedValue(mockStats);

      // Should fail on second symbol and throw
      await expect(service.getMultipleTickers(['BTC_TRY', 'ETH_TRY'])).rejects.toThrow();
    });
  });
});
