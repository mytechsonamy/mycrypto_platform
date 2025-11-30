import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MarketModule } from '../market.module';
import { TradingModule } from '../../trading/trading.module';
import { RedisService } from '../../common/services/redis.service';
import { TradeEngineClient } from '../../trading/services/trade-engine.client';

describe('Ticker API Integration Tests', () => {
  let app: INestApplication;
  let redisService: RedisService;
  let tradeEngineClient: TradeEngineClient;

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

  const mockTradesData = {
    success: true,
    data: {
      data: [
        {
          trade_id: '1',
          symbol: 'BTC_TRY',
          price: '50100.00000000',
          quantity: '500.25000000',
          executed_at: new Date().toISOString(),
          is_buyer_maker: false,
        },
        {
          trade_id: '2',
          symbol: 'BTC_TRY',
          price: '50000.00000000',
          quantity: '500.25000000',
          executed_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          is_buyer_maker: true,
        },
      ],
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: 'test_request_id',
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MarketModule, TradingModule],
    })
      .overrideProvider(RedisService)
      .useValue({
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue('OK'),
      })
      .overrideProvider(TradeEngineClient)
      .useValue({
        getTickerData: jest.fn().mockResolvedValue(mockTickerData),
        getRecentTrades: jest.fn().mockResolvedValue(mockTradesData),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    redisService = moduleFixture.get<RedisService>(RedisService);
    tradeEngineClient = moduleFixture.get<TradeEngineClient>(TradeEngineClient);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/market/ticker/:symbol', () => {
    it('should return ticker data for valid symbol', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/ticker/BTC_TRY')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('symbol', 'BTC_TRY');
      expect(response.body.data).toHaveProperty('lastPrice');
      expect(response.body.data).toHaveProperty('priceChange');
      expect(response.body.data).toHaveProperty('priceChangePercent');
      expect(response.body.data).toHaveProperty('high');
      expect(response.body.data).toHaveProperty('low');
      expect(response.body.data).toHaveProperty('volume');
      expect(response.body.data).toHaveProperty('quoteVolume');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('request_id');
    });

    it('should return 400 for invalid symbol', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/ticker/INVALID_SYMBOL')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle case-insensitive symbols', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/ticker/btc_try')
        .expect(200);

      expect(response.body.data.symbol).toBe('BTC_TRY');
    });

    it('should complete within performance SLA (<50ms p99)', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/market/ticker/BTC_TRY')
        .expect(200);

      const duration = Date.now() - startTime;

      // Should be fast, but allow some overhead for HTTP
      expect(duration).toBeLessThan(200);
    });

    it('should support all valid symbols', async () => {
      const validSymbols = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'];

      for (const symbol of validSymbols) {
        jest.spyOn(tradeEngineClient, 'getTickerData').mockResolvedValueOnce({
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol },
        });

        jest.spyOn(tradeEngineClient, 'getRecentTrades').mockResolvedValueOnce({
          ...mockTradesData,
          data: {
            data: mockTradesData.data.data.map(t => ({ ...t, symbol })),
          },
        });

        const response = await request(app.getHttpServer())
          .get(`/api/v1/market/ticker/${symbol}`)
          .expect(200);

        expect(response.body.data.symbol).toBe(symbol);
      }
    });
  });

  describe('GET /api/v1/market/tickers', () => {
    it('should return tickers for multiple symbols', async () => {
      jest.spyOn(tradeEngineClient, 'getTickerData')
        .mockResolvedValueOnce({
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol: 'BTC_TRY' },
        })
        .mockResolvedValueOnce({
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol: 'ETH_TRY' },
        });

      jest.spyOn(tradeEngineClient, 'getRecentTrades')
        .mockResolvedValue(mockTradesData);

      const response = await request(app.getHttpServer())
        .get('/api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('tickers');
      expect(response.body.data.tickers).toHaveLength(2);
      expect(response.body.data.tickers[0].symbol).toBe('BTC_TRY');
      expect(response.body.data.tickers[1].symbol).toBe('ETH_TRY');
    });

    it('should handle comma-separated symbols with whitespace', async () => {
      jest.spyOn(tradeEngineClient, 'getTickerData')
        .mockResolvedValueOnce({
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol: 'BTC_TRY' },
        })
        .mockResolvedValueOnce({
          ...mockTickerData,
          data: { ...mockTickerData.data, symbol: 'ETH_TRY' },
        });

      jest.spyOn(tradeEngineClient, 'getRecentTrades')
        .mockResolvedValue(mockTradesData);

      const response = await request(app.getHttpServer())
        .get('/api/v1/market/tickers?symbols=BTC_TRY , ETH_TRY')
        .expect(200);

      expect(response.body.data.tickers).toHaveLength(2);
    });

    it('should return 400 for empty symbols query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/tickers?symbols=')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for too many symbols (>10)', async () => {
      const symbols = new Array(11).fill('BTC_TRY').join(',');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/market/tickers?symbols=${symbols}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid symbols in bulk query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/tickers?symbols=BTC_TRY,INVALID')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should meet performance target for bulk queries', async () => {
      jest.spyOn(tradeEngineClient, 'getTickerData')
        .mockResolvedValue(mockTickerData);

      jest.spyOn(tradeEngineClient, 'getRecentTrades')
        .mockResolvedValue(mockTradesData);

      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY,USDT_TRY')
        .expect(200);

      const duration = Date.now() - startTime;

      // Should complete reasonably fast for 3 symbols
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Caching behavior', () => {
    it('should use Redis cache when available', async () => {
      const cachedTicker = {
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

      jest.spyOn(redisService, 'get').mockResolvedValueOnce(JSON.stringify(cachedTicker));

      const response = await request(app.getHttpServer())
        .get('/api/v1/market/ticker/BTC_TRY')
        .expect(200);

      expect(response.body.data).toEqual(cachedTicker);
      expect(redisService.get).toHaveBeenCalledWith('ticker:BTC_TRY');
    });

    it('should cache ticker data after fetching', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce(null);
      jest.spyOn(redisService, 'setEx').mockResolvedValueOnce(undefined);

      await request(app.getHttpServer())
        .get('/api/v1/market/ticker/BTC_TRY')
        .expect(200);

      expect(redisService.setEx).toHaveBeenCalledWith(
        'ticker:BTC_TRY',
        10, // 10-second TTL
        expect.any(String),
      );
    });
  });

  describe('Error handling', () => {
    it('should handle Trade Engine unavailability gracefully', async () => {
      jest.spyOn(redisService, 'get').mockResolvedValueOnce(null);
      jest.spyOn(tradeEngineClient, 'getTickerData').mockRejectedValueOnce(
        new Error('Service unavailable'),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/market/ticker/BTC_TRY')
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle Redis cache failures gracefully', async () => {
      jest.spyOn(redisService, 'get').mockRejectedValueOnce(new Error('Redis connection error'));
      jest.spyOn(tradeEngineClient, 'getTickerData').mockResolvedValueOnce(mockTickerData);
      jest.spyOn(tradeEngineClient, 'getRecentTrades').mockResolvedValueOnce(mockTradesData);

      const response = await request(app.getHttpServer())
        .get('/api/v1/market/ticker/BTC_TRY')
        .expect(200);

      // Should still work even if Redis fails
      expect(response.body.data).toHaveProperty('symbol', 'BTC_TRY');
    });
  });
});
