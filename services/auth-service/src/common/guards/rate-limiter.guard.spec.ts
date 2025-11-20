import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RateLimiterGuard } from './rate-limiter.guard';
import { RedisService } from '../services/redis.service';

describe('RateLimiterGuard', () => {
  let guard: RateLimiterGuard;
  let redisService: RedisService;
  let configService: ConfigService;
  let reflector: Reflector;

  const mockRequest = {
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    ip: '127.0.0.1',
  };

  const mockResponse = {
    setHeader: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn(() => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    })),
    getHandler: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterGuard,
        {
          provide: RedisService,
          useValue: {
            isWhitelisted: jest.fn(),
            slidingWindowRateLimit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: any = {
                RATE_LIMIT_REGISTER_LIMIT: 5,
                RATE_LIMIT_REGISTER_WINDOW_MS: 3600000,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RateLimiterGuard>(RateLimiterGuard);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no rate limit is configured', async () => {
      (reflector.get as jest.Mock).mockReturnValue(null);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(redisService.isWhitelisted).not.toHaveBeenCalled();
    });

    it('should allow access for whitelisted IPs', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        limit: 5,
        windowMs: 3600000,
        keyPrefix: 'rate_limit:test',
      });
      (redisService.isWhitelisted as jest.Mock).mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(redisService.isWhitelisted).toHaveBeenCalledWith('127.0.0.1');
      expect(redisService.slidingWindowRateLimit).not.toHaveBeenCalled();
    });

    it('should allow access when within rate limit', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        limit: 5,
        windowMs: 3600000,
        keyPrefix: 'rate_limit:test',
      });
      (redisService.isWhitelisted as jest.Mock).mockResolvedValue(false);
      (redisService.slidingWindowRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        count: 3,
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String),
      );
    });

    it('should block access when rate limit exceeded', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        limit: 5,
        windowMs: 3600000,
        keyPrefix: 'rate_limit:test',
      });
      (redisService.isWhitelisted as jest.Mock).mockResolvedValue(false);
      (redisService.slidingWindowRateLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        count: 5,
        retryAfter: 1800,
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(HttpException);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', 1800);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
    });

    it('should use configurable rate limit options', async () => {
      (reflector.get as jest.Mock)
        .mockReturnValueOnce(null) // No static rate limit
        .mockReturnValueOnce({
          // Configurable rate limit
          limitConfigKey: 'RATE_LIMIT_REGISTER_LIMIT',
          windowConfigKey: 'RATE_LIMIT_REGISTER_WINDOW_MS',
          keyPrefix: 'rate_limit:register',
        });
      (redisService.isWhitelisted as jest.Mock).mockResolvedValue(false);
      (redisService.slidingWindowRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        count: 2,
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(redisService.slidingWindowRateLimit).toHaveBeenCalledWith(
        'rate_limit:register:127.0.0.1',
        5,
        3600000,
      );
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const mockRequestWithForwardedIP = {
        headers: {
          'x-forwarded-for': '192.168.1.100, 10.0.0.1',
        },
        socket: { remoteAddress: '127.0.0.1' },
        ip: '127.0.0.1',
      };

      const contextWithForwardedIP = {
        switchToHttp: jest.fn(() => ({
          getRequest: () => mockRequestWithForwardedIP,
          getResponse: () => mockResponse,
        })),
        getHandler: jest.fn(),
      } as unknown as ExecutionContext;

      (reflector.get as jest.Mock).mockReturnValueOnce({
        limit: 5,
        windowMs: 3600000,
        keyPrefix: 'rate_limit:test',
      });
      (redisService.isWhitelisted as jest.Mock).mockResolvedValue(false);
      (redisService.slidingWindowRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        count: 1,
      });

      await guard.canActivate(contextWithForwardedIP);

      expect(redisService.isWhitelisted).toHaveBeenCalledWith('192.168.1.100');
      expect(redisService.slidingWindowRateLimit).toHaveBeenCalledWith(
        'rate_limit:test:192.168.1.100',
        5,
        3600000,
      );
    });

    it('should extract IP from x-real-ip header', async () => {
      const mockRequestWithRealIP = {
        headers: {
          'x-real-ip': '192.168.1.200',
        },
        socket: { remoteAddress: '127.0.0.1' },
        ip: '127.0.0.1',
      };

      const contextWithRealIP = {
        switchToHttp: jest.fn(() => ({
          getRequest: () => mockRequestWithRealIP,
          getResponse: () => mockResponse,
        })),
        getHandler: jest.fn(),
      } as unknown as ExecutionContext;

      (reflector.get as jest.Mock).mockReturnValueOnce({
        limit: 5,
        windowMs: 3600000,
        keyPrefix: 'rate_limit:test',
      });
      (redisService.isWhitelisted as jest.Mock).mockResolvedValue(false);
      (redisService.slidingWindowRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        count: 1,
      });

      await guard.canActivate(contextWithRealIP);

      expect(redisService.isWhitelisted).toHaveBeenCalledWith('192.168.1.200');
    });

    it('should throw HttpException with proper format when rate limited', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        limit: 5,
        windowMs: 3600000,
        keyPrefix: 'rate_limit:test',
      });
      (redisService.isWhitelisted as jest.Mock).mockResolvedValue(false);
      (redisService.slidingWindowRateLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        count: 5,
        retryAfter: 1800,
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error: any) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);

        const response = error.getResponse();
        expect(response).toMatchObject({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.',
            retry_after: 1800,
          },
          meta: {
            timestamp: expect.any(String),
            request_id: expect.stringMatching(/^req_/),
          },
        });
      }
    });
  });
});