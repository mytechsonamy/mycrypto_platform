import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RedisService } from '../src/common/services/redis.service';

describe('Rate Limiting E2E', () => {
  let app: INestApplication;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    redisService = moduleFixture.get<RedisService>(RedisService);

    await app.init();

    // Clear any existing rate limit data
    const redisClient = redisService.getClient();
    const keys = await redisClient.keys('rate_limit:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  });

  afterAll(async () => {
    // Clean up Redis data
    const redisClient = redisService.getClient();
    const keys = await redisClient.keys('rate_limit:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    await app.close();
  });

  beforeEach(async () => {
    // Clear rate limit data before each test
    const redisClient = redisService.getClient();
    const keys = await redisClient.keys('rate_limit:register:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  });

  describe('POST /auth/register - Rate Limiting', () => {
    const validRegistrationData = {
      email: 'testuser@example.com',
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+905551234567',
    };

    it('should allow 5 registration attempts within an hour', async () => {
      const responses = [];

      // Make 5 requests - all should succeed (or fail for other reasons, not rate limiting)
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...validRegistrationData,
            email: `testuser${i}@example.com`,
          });

        responses.push(response);

        // Check rate limit headers
        expect(response.headers['x-ratelimit-limit']).toBe('5');
        expect(response.headers['x-ratelimit-remaining']).toBe(String(4 - i));
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      }

      // All requests should not be rate limited (status should not be 429)
      responses.forEach(response => {
        expect(response.status).not.toBe(429);
      });
    });

    it('should block the 6th registration attempt', async () => {
      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...validRegistrationData,
            email: `testuser${i}@example.com`,
          });
      }

      // The 6th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...validRegistrationData,
          email: 'testuser6@example.com',
        });

      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.',
          retry_after: expect.any(Number),
        },
        meta: {
          timestamp: expect.any(String),
          request_id: expect.stringMatching(/^req_/),
        },
      });

      // Check Retry-After header
      expect(response.headers['retry-after']).toBeDefined();
      expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('should track rate limits per IP address', async () => {
      // Simulate requests from different IPs by using different X-Forwarded-For headers
      const ips = ['192.168.1.100', '192.168.1.101'];

      // Make 5 requests from first IP
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .set('X-Forwarded-For', ips[0])
          .send({
            ...validRegistrationData,
            email: `testuser_ip1_${i}@example.com`,
          });
      }

      // 6th request from first IP should be blocked
      const blockedResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', ips[0])
        .send({
          ...validRegistrationData,
          email: 'testuser_ip1_blocked@example.com',
        });

      expect(blockedResponse.status).toBe(429);

      // Request from second IP should still work
      const allowedResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', ips[1])
        .send({
          ...validRegistrationData,
          email: 'testuser_ip2_allowed@example.com',
        });

      expect(allowedResponse.status).not.toBe(429);
    });

    it('should use sliding window algorithm', async () => {
      // This test demonstrates that the sliding window algorithm
      // counts requests within the last hour, not within fixed hour blocks

      const redisClient = redisService.getClient();
      const testIP = '192.168.1.102';
      const key = `rate_limit:register:${testIP}`;

      // Add 3 requests from 50 minutes ago (should still count)
      const fiftyMinutesAgo = Date.now() - 50 * 60 * 1000;
      for (let i = 0; i < 3; i++) {
        await redisClient.zadd(key, fiftyMinutesAgo + i, `${fiftyMinutesAgo + i}-test`);
      }

      // Now make 2 more requests (total should be 5)
      for (let i = 0; i < 2; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .set('X-Forwarded-For', testIP)
          .send({
            ...validRegistrationData,
            email: `slidingwindow${i}@example.com`,
          });

        expect(response.status).not.toBe(429);
      }

      // The 6th request should be blocked
      const blockedResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', testIP)
        .send({
          ...validRegistrationData,
          email: 'slidingwindow_blocked@example.com',
        });

      expect(blockedResponse.status).toBe(429);
    });

    it('should allow whitelisted IPs to bypass rate limiting', async () => {
      const whitelistedIP = '10.0.0.100';

      // Add IP to whitelist
      await redisService.addToWhitelist(whitelistedIP);

      // Make more than 5 requests from whitelisted IP
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .set('X-Forwarded-For', whitelistedIP)
          .send({
            ...validRegistrationData,
            email: `whitelisted${i}@example.com`,
          });

        // Should not be rate limited
        expect(response.status).not.toBe(429);
      }

      // Clean up
      await redisService.removeFromWhitelist(whitelistedIP);
    });

    it('should properly set rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegistrationData);

      // Check for rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(Number(response.headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
      expect(response.headers['x-ratelimit-reset']).toBeDefined();

      // Verify reset time is in the future
      const resetTime = new Date(response.headers['x-ratelimit-reset']).getTime();
      expect(resetTime).toBeGreaterThan(Date.now());
    });

    it('should reset rate limit after the time window expires', async () => {
      // This is a conceptual test - in real scenario, we'd need to wait an hour
      // Instead, we'll manually clear old entries to simulate time passing

      const testIP = '192.168.1.103';
      const key = `rate_limit:register:${testIP}`;
      const redisClient = redisService.getClient();

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .set('X-Forwarded-For', testIP)
          .send({
            ...validRegistrationData,
            email: `reset_test${i}@example.com`,
          });
      }

      // 6th request should be blocked
      const blockedResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', testIP)
        .send({
          ...validRegistrationData,
          email: 'reset_blocked@example.com',
        });

      expect(blockedResponse.status).toBe(429);

      // Simulate time passing by clearing the rate limit data
      await redisClient.del(key);

      // Now request should work again
      const allowedResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', testIP)
        .send({
          ...validRegistrationData,
          email: 'reset_allowed@example.com',
        });

      expect(allowedResponse.status).not.toBe(429);
    });
  });
});