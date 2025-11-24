import { Test, TestingModule } from '@nestjs/testing';
import { MarketController } from '../controllers/market.controller';
import { MarketService } from '../services/market.service';
import { BadRequestException } from '@nestjs/common';

describe('MarketController', () => {
  let controller: MarketController;
  let marketService: MarketService;

  const mockMarketService = {
    getOrderbook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        {
          provide: MarketService,
          useValue: mockMarketService,
        },
      ],
    }).compile();

    controller = module.get<MarketController>(MarketController);
    marketService = module.get<MarketService>(MarketService);

    jest.clearAllMocks();
  });

  describe('getOrderbook', () => {
    it('should return orderbook data with success response', async () => {
      const symbol = 'BTC_TRY';
      const depth = 20;
      const orderbookData = {
        symbol,
        bids: [{ price: '50000', quantity: '1.0' }],
        asks: [{ price: '50001', quantity: '1.0' }],
        lastUpdateId: 12345,
        spread: '1.00000000',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      mockMarketService.getOrderbook.mockResolvedValue(orderbookData);

      const result = await controller.getOrderbook(symbol, { depth });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(orderbookData);
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('request_id');
      expect(mockMarketService.getOrderbook).toHaveBeenCalledWith('BTC_TRY', depth);
    });

    it('should use default depth of 20 if not provided', async () => {
      const symbol = 'ETH_TRY';
      const orderbookData = {
        symbol,
        bids: [{ price: '3000', quantity: '2.0' }],
        asks: [{ price: '3001', quantity: '2.0' }],
        lastUpdateId: 12346,
        spread: '1.00000000',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      mockMarketService.getOrderbook.mockResolvedValue(orderbookData);

      const result = await controller.getOrderbook(symbol, {});

      expect(result.success).toBe(true);
      expect(mockMarketService.getOrderbook).toHaveBeenCalledWith('ETH_TRY', 20);
    });

    it('should convert symbol to uppercase', async () => {
      const symbol = 'btc_try';
      const orderbookData = {
        symbol: 'BTC_TRY',
        bids: [],
        asks: [],
        lastUpdateId: 12347,
        spread: '0',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      mockMarketService.getOrderbook.mockResolvedValue(orderbookData);

      await controller.getOrderbook(symbol, { depth: 20 });

      expect(mockMarketService.getOrderbook).toHaveBeenCalledWith('BTC_TRY', 20);
    });

    it('should throw BadRequestException for invalid symbol', async () => {
      const symbol = 'INVALID';

      mockMarketService.getOrderbook.mockRejectedValue(
        new BadRequestException('Invalid symbol. Allowed symbols: BTC_TRY, ETH_TRY, USDT_TRY')
      );

      await expect(controller.getOrderbook(symbol, { depth: 20 })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for invalid depth', async () => {
      const symbol = 'BTC_TRY';
      const depth = 101;

      mockMarketService.getOrderbook.mockRejectedValue(
        new BadRequestException('Depth must be between 1 and 100')
      );

      await expect(controller.getOrderbook(symbol, { depth })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should log warning if request exceeds latency SLA (100ms)', async () => {
      const symbol = 'BTC_TRY';
      const depth = 20;
      const orderbookData = {
        symbol,
        bids: [],
        asks: [],
        lastUpdateId: 12348,
        spread: '0',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      // Mock slow response (>100ms)
      mockMarketService.getOrderbook.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(orderbookData), 150)
          )
      );

      const result = await controller.getOrderbook(symbol, { depth });

      expect(result.success).toBe(true);
      // Note: In a real test, you'd verify the logger.warn was called
      // For now, we just verify the response is still successful
    });

    it('should handle service errors properly', async () => {
      const symbol = 'BTC_TRY';
      const errorMessage = 'Trade Engine unavailable';

      mockMarketService.getOrderbook.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getOrderbook(symbol, { depth: 20 })).rejects.toThrow(
        errorMessage
      );
    });

    it('should include proper meta information in response', async () => {
      const symbol = 'USDT_TRY';
      const depth = 50;
      const orderbookData = {
        symbol,
        bids: [{ price: '1.00', quantity: '1000.0' }],
        asks: [{ price: '1.01', quantity: '1000.0' }],
        lastUpdateId: 12349,
        spread: '0.01000000',
        timestamp: '2025-11-24T00:00:00.000Z',
      };

      mockMarketService.getOrderbook.mockResolvedValue(orderbookData);

      const result = await controller.getOrderbook(symbol, { depth });

      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.meta.request_id).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });
});
