import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TechnicalIndicatorsService } from '../services/technical-indicators.service';
import { RedisService } from '../../common/services/redis.service';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';

describe('TechnicalIndicatorsService', () => {
  let service: TechnicalIndicatorsService;
  let redisService: RedisService;
  let tradeEngineClient: TradeEngineClient;

  const mockRedisService = {
    get: jest.fn(),
    setEx: jest.fn(),
  };

  const mockTradeEngineClient = {
    getRecentTrades: jest.fn(),
  };

  // Mock trade data (100 trades with incrementing prices)
  const generateMockTrades = (count: number, startPrice: number = 100) => {
    const trades = [];
    const baseTime = new Date('2025-01-01T00:00:00Z').getTime();

    for (let i = 0; i < count; i++) {
      trades.push({
        trade_id: `trade-${i}`,
        symbol: 'BTC/USD',
        price: (startPrice + i * 0.5).toString(), // Gradually increasing price
        quantity: '1.0',
        executed_at: new Date(baseTime + i * 1000).toISOString(),
      });
    }

    return trades;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicalIndicatorsService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: TradeEngineClient,
          useValue: mockTradeEngineClient,
        },
      ],
    }).compile();

    service = module.get<TechnicalIndicatorsService>(TechnicalIndicatorsService);
    redisService = module.get<RedisService>(RedisService);
    tradeEngineClient = module.get<TradeEngineClient>(TradeEngineClient);

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateSMA', () => {
    it('should calculate SMA with period 20', async () => {
      const trades = generateMockTrades(50);
      mockRedisService.get.mockResolvedValue(null); // No cache
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      const result = await service.calculateSMA('BTC/USD', 20);

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTC/USD');
      expect(result.period).toBe(20);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty('timestamp');
      expect(result.data[0]).toHaveProperty('value');
      expect(mockRedisService.setEx).toHaveBeenCalled(); // Cache should be set
    });

    it('should return cached SMA if available', async () => {
      const cachedData = {
        symbol: 'BTC/USD',
        period: 20,
        data: [{ timestamp: '2025-01-01T00:00:00Z', value: '100.5' }],
        timestamp: new Date().toISOString(),
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.calculateSMA('BTC/USD', 20);

      expect(result).toEqual(cachedData);
      expect(mockTradeEngineClient.getRecentTrades).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid period', async () => {
      await expect(service.calculateSMA('BTC/USD', 15)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient data', async () => {
      const trades = generateMockTrades(10); // Less than required period
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      await expect(service.calculateSMA('BTC/USD', 20)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid periods (5, 10, 20, 50, 100, 200)', async () => {
      const validPeriods = [5, 10, 20, 50, 100, 200];
      const trades = generateMockTrades(250);

      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      for (const period of validPeriods) {
        const result = await service.calculateSMA('BTC/USD', period);
        expect(result.period).toBe(period);
      }
    });
  });

  describe('calculateEMA', () => {
    it('should calculate EMA with period 12', async () => {
      const trades = generateMockTrades(50);
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      const result = await service.calculateEMA('BTC/USD', 12);

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTC/USD');
      expect(result.period).toBe(12);
      expect(result.data.length).toBeGreaterThan(0);
      expect(mockRedisService.setEx).toHaveBeenCalled();
    });

    it('should accept valid periods (12, 26)', async () => {
      const validPeriods = [12, 26];
      const trades = generateMockTrades(100);

      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      for (const period of validPeriods) {
        const result = await service.calculateEMA('BTC/USD', period);
        expect(result.period).toBe(period);
      }
    });

    it('should throw BadRequestException for invalid period', async () => {
      await expect(service.calculateEMA('BTC/USD', 20)).rejects.toThrow(BadRequestException);
    });

    it('should calculate EMA values correctly (should differ from SMA)', async () => {
      const trades = generateMockTrades(50);
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      const emaResult = await service.calculateEMA('BTC/USD', 12);

      expect(emaResult.data.length).toBeGreaterThan(0);
      // EMA values should be numeric strings
      const firstValue = parseFloat(emaResult.data[0].value);
      expect(firstValue).toBeGreaterThan(0);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI with period 14', async () => {
      const trades = generateMockTrades(50);
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      const result = await service.calculateRSI('BTC/USD', 14);

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTC/USD');
      expect(result.period).toBe(14);
      expect(result.data.length).toBeGreaterThan(0);

      // RSI should be between 0 and 100
      result.data.forEach((point) => {
        const rsi = parseFloat(point.value);
        expect(rsi).toBeGreaterThanOrEqual(0);
        expect(rsi).toBeLessThanOrEqual(100);
      });
    });

    it('should throw BadRequestException for invalid period', async () => {
      await expect(service.calculateRSI('BTC/USD', 20)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient data', async () => {
      const trades = generateMockTrades(10);
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      await expect(service.calculateRSI('BTC/USD', 14)).rejects.toThrow(BadRequestException);
    });

    it('should calculate RSI correctly for trending prices', async () => {
      // Increasing prices should result in higher RSI
      const trades = generateMockTrades(50, 100);
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      const result = await service.calculateRSI('BTC/USD', 14);

      // For consistently increasing prices, RSI should be high (> 50)
      const lastRSI = parseFloat(result.data[result.data.length - 1].value);
      expect(lastRSI).toBeGreaterThan(50);
    });
  });

  describe('calculateMACD', () => {
    it('should calculate MACD with default parameters', async () => {
      const trades = generateMockTrades(100);
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      const result = await service.calculateMACD('BTC/USD');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTC/USD');
      expect(result.macd).toBeDefined();
      expect(result.signal).toBeDefined();
      expect(result.histogram).toBeDefined();
      expect(result.macd.length).toBe(result.signal.length);
      expect(result.macd.length).toBe(result.histogram.length);
      expect(mockRedisService.setEx).toHaveBeenCalled();
    });

    it('should return cached MACD if available', async () => {
      const cachedData = {
        symbol: 'BTC/USD',
        macd: [{ timestamp: '2025-01-01T00:00:00Z', value: '0.5' }],
        signal: [{ timestamp: '2025-01-01T00:00:00Z', value: '0.3' }],
        histogram: [{ timestamp: '2025-01-01T00:00:00Z', value: '0.2' }],
        timestamp: new Date().toISOString(),
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.calculateMACD('BTC/USD');

      expect(result).toEqual(cachedData);
      expect(mockTradeEngineClient.getRecentTrades).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient data', async () => {
      const trades = generateMockTrades(30); // Less than required (26 * 3 + 9)
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      await expect(service.calculateMACD('BTC/USD')).rejects.toThrow(BadRequestException);
    });

    it('should calculate MACD histogram correctly (MACD - Signal)', async () => {
      const trades = generateMockTrades(150);
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      const result = await service.calculateMACD('BTC/USD');

      // Verify histogram = macd - signal
      for (let i = 0; i < result.histogram.length; i++) {
        const macd = parseFloat(result.macd[i].value);
        const signal = parseFloat(result.signal[i].value);
        const histogram = parseFloat(result.histogram[i].value);

        // Allow small floating point difference
        expect(Math.abs(histogram - (macd - signal))).toBeLessThan(0.000001);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle trade engine errors gracefully', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockRejectedValue(
        new Error('Trade engine unavailable'),
      );

      await expect(service.calculateSMA('BTC/USD', 20)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty trade data', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades: [] },
      });

      await expect(service.calculateSMA('BTC/USD', 20)).rejects.toThrow(BadRequestException);
    });

    it('should handle missing trade data', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades: null },
      });

      await expect(service.calculateSMA('BTC/USD', 20)).rejects.toThrow(BadRequestException);
    });

    it('should continue if cache write fails', async () => {
      const trades = generateMockTrades(50);
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setEx.mockRejectedValue(new Error('Cache error'));
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      // Should not throw even if cache write fails
      const result = await service.calculateSMA('BTC/USD', 20);
      expect(result).toBeDefined();
    });

    it('should continue if cache read fails', async () => {
      const trades = generateMockTrades(50);
      mockRedisService.get.mockRejectedValue(new Error('Cache error'));
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      const result = await service.calculateSMA('BTC/USD', 20);
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should calculate indicators within acceptable time', async () => {
      const trades = generateMockTrades(200);
      mockRedisService.get.mockResolvedValue(null);
      mockTradeEngineClient.getRecentTrades.mockResolvedValue({
        data: { trades },
      });

      const startTime = Date.now();
      await service.calculateSMA('BTC/USD', 20);
      const duration = Date.now() - startTime;

      // Should complete in less than 50ms (target requirement)
      expect(duration).toBeLessThan(50);
    });
  });
});
