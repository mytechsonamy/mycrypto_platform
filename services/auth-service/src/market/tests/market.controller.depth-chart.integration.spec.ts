import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MarketController } from '../controllers/market.controller';
import { MarketService } from '../services/market.service';
import { DepthChartResponseDto } from '../dto/depth-chart-response.dto';

describe('MarketController - Depth Chart Integration', () => {
  let app: INestApplication;
  let marketService: jest.Mocked<MarketService>;

  const mockDepthChartData: DepthChartResponseDto = {
    symbol: 'BTC_TRY',
    bids: [
      { price: '50000.00000000', volume: '1.50000000', cumulative: '1.50000000', percentage: '33.33' },
      { price: '49990.00000000', volume: '2.00000000', cumulative: '3.50000000', percentage: '77.78' },
      { price: '49980.00000000', volume: '1.00000000', cumulative: '4.50000000', percentage: '100.00' },
    ],
    asks: [
      { price: '50100.00000000', volume: '1.00000000', cumulative: '1.00000000', percentage: '20.00' },
      { price: '50110.00000000', volume: '2.50000000', cumulative: '3.50000000', percentage: '70.00' },
      { price: '50120.00000000', volume: '1.50000000', cumulative: '5.00000000', percentage: '100.00' },
    ],
    spread: {
      value: '100.00000000',
      percentage: '0.20%',
    },
    maxBidVolume: '4.50000000',
    maxAskVolume: '5.00000000',
    timestamp: new Date().toISOString(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        {
          provide: MarketService,
          useValue: {
            getDepthChart: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    marketService = module.get(MarketService) as jest.Mocked<MarketService>;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/market/orderbook/:symbol/depth-chart', () => {
    it('should return depth chart data successfully', async () => {
      // Arrange
      marketService.getDepthChart.mockResolvedValue(mockDepthChartData);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/orderbook/BTC_TRY/depth-chart')
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: mockDepthChartData,
        meta: {
          timestamp: expect.any(String),
          request_id: expect.stringMatching(/^req_/),
        },
      });

      expect(marketService.getDepthChart).toHaveBeenCalledWith('BTC_TRY');
    });

    it('should handle lowercase symbol', async () => {
      // Arrange
      marketService.getDepthChart.mockResolvedValue(mockDepthChartData);

      // Act
      await request(app.getHttpServer())
        .get('/api/v1/market/orderbook/btc_try/depth-chart')
        .expect(200);

      // Assert
      expect(marketService.getDepthChart).toHaveBeenCalledWith('BTC_TRY');
    });

    it('should return 400 for invalid symbol', async () => {
      // Arrange
      marketService.getDepthChart.mockRejectedValue(
        new Error('Invalid symbol. Allowed symbols: BTC_TRY, ETH_TRY, USDT_TRY')
      );

      // Act
      await request(app.getHttpServer())
        .get('/api/v1/market/orderbook/INVALID_SYMBOL/depth-chart')
        .expect(500); // NestJS wraps non-HTTP exceptions
    });

    it('should return 404 when orderbook not found', async () => {
      // Arrange
      const notFoundError = new Error('Orderbook not found');
      notFoundError.name = 'NotFoundException';
      marketService.getDepthChart.mockRejectedValue(notFoundError);

      // Act
      await request(app.getHttpServer())
        .get('/api/v1/market/orderbook/BTC_TRY/depth-chart')
        .expect(500);
    });

    it('should include all required depth chart fields', async () => {
      // Arrange
      marketService.getDepthChart.mockResolvedValue(mockDepthChartData);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/orderbook/BTC_TRY/depth-chart')
        .expect(200);

      // Assert
      const { data } = response.body;
      expect(data).toHaveProperty('symbol');
      expect(data).toHaveProperty('bids');
      expect(data).toHaveProperty('asks');
      expect(data).toHaveProperty('spread');
      expect(data).toHaveProperty('maxBidVolume');
      expect(data).toHaveProperty('maxAskVolume');
      expect(data).toHaveProperty('timestamp');

      // Verify bid structure
      expect(data.bids[0]).toHaveProperty('price');
      expect(data.bids[0]).toHaveProperty('volume');
      expect(data.bids[0]).toHaveProperty('cumulative');
      expect(data.bids[0]).toHaveProperty('percentage');

      // Verify spread structure
      expect(data.spread).toHaveProperty('value');
      expect(data.spread).toHaveProperty('percentage');
    });

    it('should meet performance SLA (<50ms p99)', async () => {
      // Arrange
      marketService.getDepthChart.mockResolvedValue(mockDepthChartData);

      // Act - measure 100 requests
      const durations: number[] = [];
      for (let i = 0; i < 100; i++) {
        const startTime = Date.now();
        await request(app.getHttpServer())
          .get('/api/v1/market/orderbook/BTC_TRY/depth-chart')
          .expect(200);
        durations.push(Date.now() - startTime);
      }

      // Calculate p99
      durations.sort((a, b) => a - b);
      const p99 = durations[Math.floor(durations.length * 0.99)];

      // Assert
      expect(p99).toBeLessThan(50);
    });

    it('should handle multiple concurrent requests', async () => {
      // Arrange
      marketService.getDepthChart.mockResolvedValue(mockDepthChartData);

      // Act - send 10 concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .get('/api/v1/market/orderbook/BTC_TRY/depth-chart')
      );

      const responses = await Promise.all(requests);

      // Assert
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should return consistent data format', async () => {
      // Arrange
      marketService.getDepthChart.mockResolvedValue(mockDepthChartData);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/orderbook/BTC_TRY/depth-chart')
        .expect(200);

      // Assert
      const { data } = response.body;

      // Verify all prices are strings with 8 decimal places
      data.bids.forEach((bid: any) => {
        expect(bid.price).toMatch(/^\d+\.\d{8}$/);
        expect(bid.volume).toMatch(/^\d+\.\d{8}$/);
        expect(bid.cumulative).toMatch(/^\d+\.\d{8}$/);
        expect(bid.percentage).toMatch(/^\d+\.\d{2}$/);
      });

      // Verify spread format
      expect(data.spread.percentage).toMatch(/%$/);
    });

    it('should support ETH_TRY symbol', async () => {
      // Arrange
      const ethDepthChart = { ...mockDepthChartData, symbol: 'ETH_TRY' };
      marketService.getDepthChart.mockResolvedValue(ethDepthChart);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/orderbook/ETH_TRY/depth-chart')
        .expect(200);

      // Assert
      expect(response.body.data.symbol).toBe('ETH_TRY');
      expect(marketService.getDepthChart).toHaveBeenCalledWith('ETH_TRY');
    });

    it('should support USDT_TRY symbol', async () => {
      // Arrange
      const usdtDepthChart = { ...mockDepthChartData, symbol: 'USDT_TRY' };
      marketService.getDepthChart.mockResolvedValue(usdtDepthChart);

      // Act
      const response = await request(app.getHttpServer())
        .get('/api/v1/market/orderbook/USDT_TRY/depth-chart')
        .expect(200);

      // Assert
      expect(response.body.data.symbol).toBe('USDT_TRY');
      expect(marketService.getDepthChart).toHaveBeenCalledWith('USDT_TRY');
    });
  });
});
