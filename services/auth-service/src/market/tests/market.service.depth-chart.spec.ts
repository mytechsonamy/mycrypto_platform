import { Test, TestingModule } from '@nestjs/testing';
import { MarketService } from '../services/market.service';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';
import { RedisService } from '../../common/services/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MarketService - Depth Chart', () => {
  let service: MarketService;
  let tradeEngineClient: jest.Mocked<TradeEngineClient>;
  let redisService: jest.Mocked<RedisService>;

  const mockOrderbookData = {
    symbol: 'BTC/TRY',
    bids: [
      { price: '50000', quantity: '1.5', order_count: 3 },
      { price: '49990', quantity: '2.0', order_count: 2 },
      { price: '49980', quantity: '1.0', order_count: 1 },
    ],
    asks: [
      { price: '50100', quantity: '1.0', order_count: 1 },
      { price: '50110', quantity: '2.5', order_count: 2 },
      { price: '50120', quantity: '1.5', order_count: 3 },
    ],
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketService,
        {
          provide: TradeEngineClient,
          useValue: {
            getOrderBook: jest.fn(),
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

    service = module.get<MarketService>(MarketService);
    tradeEngineClient = module.get(TradeEngineClient) as jest.Mocked<TradeEngineClient>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDepthChart', () => {
    it('should return depth chart with cumulative volumes and percentages', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null); // Cache miss
      tradeEngineClient.getOrderBook.mockResolvedValue({
        success: true,
        data: mockOrderbookData,
      });

      // Act
      const result = await service.getDepthChart('BTC_TRY');

      // Assert
      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTC_TRY');
      expect(result.bids).toHaveLength(3);
      expect(result.asks).toHaveLength(3);

      // Check bid cumulative volumes
      expect(result.bids[0].cumulative).toBe('1.50000000');
      expect(result.bids[1].cumulative).toBe('3.50000000');
      expect(result.bids[2].cumulative).toBe('4.50000000');

      // Check ask cumulative volumes
      expect(result.asks[0].cumulative).toBe('1.00000000');
      expect(result.asks[1].cumulative).toBe('3.50000000');
      expect(result.asks[2].cumulative).toBe('5.00000000');

      // Check percentages
      expect(parseFloat(result.bids[2].percentage)).toBeCloseTo(100, 0);
      expect(parseFloat(result.asks[2].percentage)).toBeCloseTo(100, 0);

      // Check spread
      expect(result.spread).toBeDefined();
      expect(result.spread.value).toBe('100.00000000');
      expect(result.spread.percentage).toMatch(/%$/);

      // Check max volumes
      expect(result.maxBidVolume).toBe('4.50000000');
      expect(result.maxAskVolume).toBe('5.00000000');

      // Verify cache was called
      expect(redisService.setEx).toHaveBeenCalledWith(
        'orderbook:depth-chart:BTC_TRY',
        5,
        expect.any(String)
      );
    });

    it('should return cached depth chart if available', async () => {
      // Arrange
      const cachedDepthChart = {
        symbol: 'BTC_TRY',
        bids: [{ price: '50000', volume: '1.5', cumulative: '1.5', percentage: '100.00' }],
        asks: [{ price: '50100', volume: '1.0', cumulative: '1.0', percentage: '100.00' }],
        spread: { value: '100', percentage: '0.20%' },
        maxBidVolume: '1.5',
        maxAskVolume: '1.0',
        timestamp: new Date().toISOString(),
      };
      redisService.get.mockResolvedValue(JSON.stringify(cachedDepthChart));

      // Act
      const result = await service.getDepthChart('BTC_TRY');

      // Assert
      expect(result).toEqual(cachedDepthChart);
      expect(tradeEngineClient.getOrderBook).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid symbol', async () => {
      // Act & Assert
      await expect(service.getDepthChart('INVALID_SYMBOL')).rejects.toThrow(BadRequestException);
      await expect(service.getDepthChart('INVALID_SYMBOL')).rejects.toThrow(
        'Invalid symbol. Allowed symbols: BTC_TRY, ETH_TRY, USDT_TRY'
      );
    });

    it('should throw NotFoundException when orderbook not found', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOrderBook.mockResolvedValue({
        success: false,
        data: null,
      });

      // Act & Assert
      await expect(service.getDepthChart('BTC_TRY')).rejects.toThrow(NotFoundException);
    });

    it('should handle empty orderbook gracefully', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOrderBook.mockResolvedValue({
        success: true,
        data: {
          symbol: 'BTC/TRY',
          bids: [],
          asks: [],
          timestamp: new Date().toISOString(),
        },
      });

      // Act
      const result = await service.getDepthChart('BTC_TRY');

      // Assert
      expect(result.bids).toHaveLength(0);
      expect(result.asks).toHaveLength(0);
      expect(result.maxBidVolume).toBe('0.00000000');
      expect(result.maxAskVolume).toBe('0.00000000');
      expect(result.spread.value).toBe('0');
      expect(result.spread.percentage).toBe('0.00%');
    });

    it('should limit depth chart to 50 levels per side', async () => {
      // Arrange
      const largeBids = Array.from({ length: 100 }, (_, i) => ({
        price: (50000 - i).toString(),
        quantity: '1.0',
        order_count: 1,
      }));
      const largeAsks = Array.from({ length: 100 }, (_, i) => ({
        price: (50100 + i).toString(),
        quantity: '1.0',
        order_count: 1,
      }));

      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOrderBook.mockResolvedValue({
        success: true,
        data: {
          symbol: 'BTC/TRY',
          bids: largeBids,
          asks: largeAsks,
          timestamp: new Date().toISOString(),
        },
      });

      // Act
      const result = await service.getDepthChart('BTC_TRY');

      // Assert
      expect(result.bids.length).toBeLessThanOrEqual(50);
      expect(result.asks.length).toBeLessThanOrEqual(50);
    });

    it('should calculate spread percentage correctly', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null);
      tradeEngineClient.getOrderBook.mockResolvedValue({
        success: true,
        data: {
          symbol: 'BTC/TRY',
          bids: [{ price: '50000', quantity: '1.0', order_count: 1 }],
          asks: [{ price: '50100', quantity: '1.0', order_count: 1 }],
          timestamp: new Date().toISOString(),
        },
      });

      // Act
      const result = await service.getDepthChart('BTC_TRY');

      // Assert
      expect(result.spread.value).toBe('100.00000000');
      // Spread percentage = (50100 - 50000) / 50000 * 100 = 0.20%
      expect(result.spread.percentage).toBe('0.20%');
    });

    it('should meet performance SLA (<50ms) for cached data', async () => {
      // Arrange
      const cachedDepthChart = {
        symbol: 'BTC_TRY',
        bids: [],
        asks: [],
        spread: { value: '0', percentage: '0.00%' },
        maxBidVolume: '0',
        maxAskVolume: '0',
        timestamp: new Date().toISOString(),
      };
      redisService.get.mockResolvedValue(JSON.stringify(cachedDepthChart));

      // Act
      const startTime = Date.now();
      await service.getDepthChart('BTC_TRY');
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(50);
    });
  });
});
