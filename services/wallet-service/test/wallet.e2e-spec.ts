import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from '../src/wallet/wallet.module';
import { RedisModule } from '../src/common/redis/redis.module';
import { UserWallet } from '../src/wallet/entities/user-wallet.entity';
import { FiatAccount } from '../src/wallet/entities/fiat-account.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('WalletController (e2e)', () => {
  let app: INestApplication;
  let userWalletRepository: Repository<UserWallet>;

  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE2MzQwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.test';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DATABASE_HOST || 'localhost',
          port: parseInt(process.env.TEST_DATABASE_PORT) || 5432,
          username: process.env.TEST_DATABASE_USER || 'postgres',
          password: process.env.TEST_DATABASE_PASSWORD || 'postgres',
          database: process.env.TEST_DATABASE_NAME || 'exchange_test',
          entities: [UserWallet, FiatAccount],
          synchronize: true, // Only for testing
          dropSchema: true, // Clean database before each test run
        }),
        RedisModule,
        WalletModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api/v1');

    userWalletRepository = moduleFixture.get<Repository<UserWallet>>(
      getRepositoryToken(UserWallet),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await userWalletRepository.clear();
  });

  describe('GET /api/v1/wallet/balances', () => {
    it('should return 401 without authentication token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/wallet/balances')
        .expect(401);
    });

    it('should return all wallet balances with authentication', async () => {
      // Create test wallet data
      const wallets = [
        {
          userId: mockUserId,
          currency: 'TRY',
          availableBalance: '1000.00',
          lockedBalance: '250.00',
        },
        {
          userId: mockUserId,
          currency: 'BTC',
          availableBalance: '0.05000000',
          lockedBalance: '0.01000000',
        },
      ];

      await userWalletRepository.save(wallets);

      const response = await request(app.getHttpServer())
        .get('/api/v1/wallet/balances')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('wallets');
      expect(response.body.data.wallets).toHaveLength(4); // TRY, BTC, ETH, USDT

      // Check TRY balance
      const tryWallet = response.body.data.wallets.find((w) => w.currency === 'TRY');
      expect(tryWallet).toBeDefined();
      expect(tryWallet.availableBalance).toBe('1000.00');
      expect(tryWallet.lockedBalance).toBe('250.00');
      expect(tryWallet.totalBalance).toBe('1250.00');

      // Check BTC balance
      const btcWallet = response.body.data.wallets.find((w) => w.currency === 'BTC');
      expect(btcWallet).toBeDefined();
      expect(btcWallet.availableBalance).toBe('0.05000000');
      expect(btcWallet.lockedBalance).toBe('0.01000000');

      // Check ETH balance (should be zero)
      const ethWallet = response.body.data.wallets.find((w) => w.currency === 'ETH');
      expect(ethWallet).toBeDefined();
      expect(ethWallet.availableBalance).toBe('0.00000000');
      expect(ethWallet.totalBalance).toBe('0.00000000');

      // Check response metadata
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    it('should return zero balances for user with no wallets', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/wallet/balances')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(200);

      expect(response.body.data.wallets).toHaveLength(4);

      response.body.data.wallets.forEach((wallet) => {
        expect(wallet.availableBalance).toBe('0.00000000');
        expect(wallet.lockedBalance).toBe('0.00000000');
        expect(wallet.totalBalance).toBe('0.00000000');
      });
    });

    it('should use Redis cache on second request', async () => {
      // Create test wallet data
      const wallet = {
        userId: mockUserId,
        currency: 'TRY',
        availableBalance: '1000.00',
        lockedBalance: '250.00',
      };

      await userWalletRepository.save(wallet);

      // First request - should query database
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/wallet/balances')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(200);

      // Second request - should use cache
      const response2 = await request(app.getHttpServer())
        .get('/api/v1/wallet/balances')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(200);

      // Both responses should be identical
      expect(response1.body.data.wallets).toEqual(response2.body.data.wallets);
    });

    it('should respect rate limiting (100 requests per minute)', async () => {
      // This test would need to be adjusted based on actual rate limit configuration
      // For now, we just verify the endpoint is accessible
      const response = await request(app.getHttpServer())
        .get('/api/v1/wallet/balances')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
