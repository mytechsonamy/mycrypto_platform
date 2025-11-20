import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;
  let redisMock: any;

  beforeEach(async () => {
    // Create a mock Redis instance
    redisMock = {
      on: jest.fn(),
      quit: jest.fn(),
      pipeline: jest.fn(),
      zremrangebyscore: jest.fn(),
      zadd: jest.fn(),
      zcard: jest.fn(),
      expire: jest.fn(),
      zrem: jest.fn(),
      zrange: jest.fn(),
      sismember: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
    };

    // Make the Redis constructor return our mock
    (Redis as any).mockImplementation(() => redisMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: any = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: 'testpass',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis client with correct configuration', async () => {
      await service.onModuleInit();

      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: 'testpass',
        retryStrategy: expect.any(Function),
      });

      expect(redisMock.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(redisMock.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis connection', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(redisMock.quit).toHaveBeenCalled();
    });
  });

  describe('slidingWindowRateLimit', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should allow requests within the rate limit', async () => {
      const pipelineMock = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 1],
          [null, 3], // count
          [null, 1],
        ]),
      };

      redisMock.pipeline.mockReturnValue(pipelineMock);

      const result = await service.slidingWindowRateLimit(
        'rate_limit:test:127.0.0.1',
        5,
        3600000,
      );

      expect(result).toEqual({
        allowed: true,
        count: 3,
      });

      expect(pipelineMock.zremrangebyscore).toHaveBeenCalled();
      expect(pipelineMock.zadd).toHaveBeenCalled();
      expect(pipelineMock.zcard).toHaveBeenCalled();
      expect(pipelineMock.expire).toHaveBeenCalled();
    });

    it('should block requests exceeding the rate limit', async () => {
      const pipelineMock = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 1],
          [null, 6], // count exceeds limit
          [null, 1],
        ]),
      };

      redisMock.pipeline.mockReturnValue(pipelineMock);
      redisMock.zrem.mockResolvedValue(1);
      redisMock.zrange.mockResolvedValue(['entry1', '1234567890']);

      const result = await service.slidingWindowRateLimit(
        'rate_limit:test:127.0.0.1',
        5,
        3600000,
      );

      expect(result.allowed).toBe(false);
      expect(result.count).toBe(5);
      expect(result.retryAfter).toBeDefined();
      expect(redisMock.zrem).toHaveBeenCalled();
    });

    it('should handle Redis pipeline execution failure', async () => {
      const pipelineMock = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      redisMock.pipeline.mockReturnValue(pipelineMock);

      await expect(
        service.slidingWindowRateLimit('rate_limit:test:127.0.0.1', 5, 3600000),
      ).rejects.toThrow('Redis pipeline execution failed');
    });
  });

  describe('isWhitelisted', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return true for whitelisted IP', async () => {
      redisMock.sismember.mockResolvedValue(1);

      const result = await service.isWhitelisted('127.0.0.1');

      expect(result).toBe(true);
      expect(redisMock.sismember).toHaveBeenCalledWith('rate_limit:whitelist', '127.0.0.1');
    });

    it('should return false for non-whitelisted IP', async () => {
      redisMock.sismember.mockResolvedValue(0);

      const result = await service.isWhitelisted('192.168.1.1');

      expect(result).toBe(false);
      expect(redisMock.sismember).toHaveBeenCalledWith('rate_limit:whitelist', '192.168.1.1');
    });
  });

  describe('addToWhitelist', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should add IP to whitelist', async () => {
      redisMock.sadd.mockResolvedValue(1);

      await service.addToWhitelist('127.0.0.1');

      expect(redisMock.sadd).toHaveBeenCalledWith('rate_limit:whitelist', '127.0.0.1');
    });
  });

  describe('removeFromWhitelist', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should remove IP from whitelist', async () => {
      redisMock.srem.mockResolvedValue(1);

      await service.removeFromWhitelist('127.0.0.1');

      expect(redisMock.srem).toHaveBeenCalledWith('rate_limit:whitelist', '127.0.0.1');
    });
  });

  describe('getWhitelistedIps', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return all whitelisted IPs', async () => {
      const mockIps = ['127.0.0.1', '192.168.1.1'];
      redisMock.smembers.mockResolvedValue(mockIps);

      const result = await service.getWhitelistedIps();

      expect(result).toEqual(mockIps);
      expect(redisMock.smembers).toHaveBeenCalledWith('rate_limit:whitelist');
    });
  });
});