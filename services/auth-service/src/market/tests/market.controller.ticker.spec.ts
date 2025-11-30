import { Test, TestingModule } from '@nestjs/testing';
import { MarketController } from '../controllers/market.controller';
import { MarketService } from '../services/market.service';
import { TickerService } from '../services/ticker.service';
import { TickerResponseDto } from '../dto/ticker-response.dto';

describe('MarketController - Ticker Endpoints', () => {
  let controller: MarketController;
  let tickerService: jest.Mocked<TickerService>;
  let marketService: jest.Mocked<MarketService>;

  const mockTicker: TickerResponseDto = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        {
          provide: MarketService,
          useValue: {
            getOrderbook: jest.fn(),
            getDepthChart: jest.fn(),
          },
        },
        {
          provide: TickerService,
          useValue: {
            getTicker: jest.fn(),
            getMultipleTickers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MarketController>(MarketController);
    tickerService = module.get(TickerService);
    marketService = module.get(MarketService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/v1/market/ticker/:symbol', () => {
    it('should return ticker data for a symbol', async () => {
      tickerService.getTicker.mockResolvedValue(mockTicker);

      const result = await controller.getTicker('BTC_TRY');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTicker);
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('request_id');
      expect(tickerService.getTicker).toHaveBeenCalledWith('BTC_TRY');
    });

    it('should convert symbol to uppercase', async () => {
      tickerService.getTicker.mockResolvedValue(mockTicker);

      await controller.getTicker('btc_try');

      expect(tickerService.getTicker).toHaveBeenCalledWith('BTC_TRY');
    });

    it('should handle errors and propagate them', async () => {
      const error = new Error('Service error');
      tickerService.getTicker.mockRejectedValue(error);

      await expect(controller.getTicker('BTC_TRY')).rejects.toThrow('Service error');
    });

    it('should complete within performance target (<50ms)', async () => {
      tickerService.getTicker.mockResolvedValue(mockTicker);

      const startTime = Date.now();
      await controller.getTicker('BTC_TRY');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('GET /api/v1/market/tickers', () => {
    it('should return tickers for multiple symbols', async () => {
      const mockTickers = [
        { ...mockTicker, symbol: 'BTC_TRY' },
        { ...mockTicker, symbol: 'ETH_TRY', lastPrice: '3500.00000000' },
      ];

      tickerService.getMultipleTickers.mockResolvedValue(mockTickers);

      const result = await controller.getMultipleTickers({ symbols: 'BTC_TRY,ETH_TRY' });

      expect(result.success).toBe(true);
      expect(result.data.tickers).toEqual(mockTickers);
      expect(result.data.tickers).toHaveLength(2);
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('request_id');
      expect(tickerService.getMultipleTickers).toHaveBeenCalledWith(['BTC_TRY', 'ETH_TRY']);
    });

    it('should parse comma-separated symbols and trim whitespace', async () => {
      tickerService.getMultipleTickers.mockResolvedValue([mockTicker]);

      await controller.getMultipleTickers({ symbols: ' BTC_TRY , ETH_TRY , USDT_TRY ' });

      expect(tickerService.getMultipleTickers).toHaveBeenCalledWith(['BTC_TRY', 'ETH_TRY', 'USDT_TRY']);
    });

    it('should convert symbols to uppercase', async () => {
      tickerService.getMultipleTickers.mockResolvedValue([mockTicker]);

      await controller.getMultipleTickers({ symbols: 'btc_try,eth_try' });

      expect(tickerService.getMultipleTickers).toHaveBeenCalledWith(['BTC_TRY', 'ETH_TRY']);
    });

    it('should handle empty symbols query', async () => {
      tickerService.getMultipleTickers.mockResolvedValue([]);

      await controller.getMultipleTickers({ symbols: '' });

      expect(tickerService.getMultipleTickers).toHaveBeenCalledWith([]);
    });

    it('should handle missing symbols query parameter', async () => {
      tickerService.getMultipleTickers.mockResolvedValue([]);

      await controller.getMultipleTickers({});

      expect(tickerService.getMultipleTickers).toHaveBeenCalledWith([]);
    });

    it('should handle errors and propagate them', async () => {
      const error = new Error('Service error');
      tickerService.getMultipleTickers.mockRejectedValue(error);

      await expect(controller.getMultipleTickers({ symbols: 'BTC_TRY' })).rejects.toThrow('Service error');
    });

    it('should meet performance target for bulk queries', async () => {
      const mockTickers = [
        { ...mockTicker, symbol: 'BTC_TRY' },
        { ...mockTicker, symbol: 'ETH_TRY' },
        { ...mockTicker, symbol: 'USDT_TRY' },
      ];

      tickerService.getMultipleTickers.mockResolvedValue(mockTickers);

      const startTime = Date.now();
      await controller.getMultipleTickers({ symbols: 'BTC_TRY,ETH_TRY,USDT_TRY' });
      const duration = Date.now() - startTime;

      // Average should be <50ms per symbol
      const avgDuration = duration / 3;
      expect(avgDuration).toBeLessThan(50);
    });
  });

  describe('Response format', () => {
    it('should return standardized response format for single ticker', async () => {
      tickerService.getTicker.mockResolvedValue(mockTicker);

      const result = await controller.getTicker('BTC_TRY');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('request_id');
      expect(result.success).toBe(true);
    });

    it('should return standardized response format for multiple tickers', async () => {
      tickerService.getMultipleTickers.mockResolvedValue([mockTicker]);

      const result = await controller.getMultipleTickers({ symbols: 'BTC_TRY' });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveProperty('tickers');
      expect(result.data).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('request_id');
      expect(result.success).toBe(true);
    });

    it('should include all required ticker fields', async () => {
      tickerService.getTicker.mockResolvedValue(mockTicker);

      const result = await controller.getTicker('BTC_TRY');

      expect(result.data).toHaveProperty('symbol');
      expect(result.data).toHaveProperty('lastPrice');
      expect(result.data).toHaveProperty('priceChange');
      expect(result.data).toHaveProperty('priceChangePercent');
      expect(result.data).toHaveProperty('high');
      expect(result.data).toHaveProperty('low');
      expect(result.data).toHaveProperty('volume');
      expect(result.data).toHaveProperty('quoteVolume');
      expect(result.data).toHaveProperty('timestamp');
    });
  });
});
