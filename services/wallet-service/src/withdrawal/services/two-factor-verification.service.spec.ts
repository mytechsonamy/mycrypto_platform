import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TwoFactorVerificationService } from './two-factor-verification.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

describe('TwoFactorVerificationService', () => {
  let service: TwoFactorVerificationService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        AUTH_SERVICE_URL: 'http://auth-service:3001',
        TWO_FA_MAX_ATTEMPTS: '5',
        TWO_FA_ATTEMPT_WINDOW_MINUTES: '5',
        TWO_FA_ALLOW_ON_SERVICE_FAILURE: 'false',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorVerificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TwoFactorVerificationService>(TwoFactorVerificationService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    process.env.NODE_ENV = 'test';

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verify2FACode', () => {
    it('should verify valid code (test mode)', async () => {
      const result = await service.verify2FACode('user-123', '123456');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid code', async () => {
      const result = await service.verify2FACode('user-123', '654321');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid 2FA code');
    });

    it('should reject non-numeric code', async () => {
      const result = await service.verify2FACode('user-123', 'abcdef');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('2FA code must be 6 digits');
    });

    it('should reject code with wrong length', async () => {
      const result = await service.verify2FACode('user-123', '12345');
      expect(result.isValid).toBe(false);
    });

    it('should rate limit after max attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await service.verify2FACode('user-123', '000000');
      }
      const result = await service.verify2FACode('user-123', '123456');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Too many failed attempts');
    });

    it('should clear rate limit on successful verification', async () => {
      await service.verify2FACode('user-123', '000000');
      const result = await service.verify2FACode('user-123', '123456');
      expect(result.isValid).toBe(true);
      
      const remaining = service.getRemainingAttempts('user-123');
      expect(remaining).toBe(5);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return max attempts initially', () => {
      const remaining = service.getRemainingAttempts('user-new');
      expect(remaining).toBe(5);
    });

    it('should decrease after failed attempt', async () => {
      await service.verify2FACode('user-123', '000000');
      const remaining = service.getRemainingAttempts('user-123');
      expect(remaining).toBe(4);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit for user', async () => {
      await service.verify2FACode('user-123', '000000');
      service.clearRateLimit('user-123');
      const remaining = service.getRemainingAttempts('user-123');
      expect(remaining).toBe(5);
    });
  });

  describe('Auth Service Integration (non-test mode)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should call auth service with correct parameters', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: { valid: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as AxiosResponse));

      const result = await service.verify2FACode('user-123', '123456');

      expect(httpService.post).toHaveBeenCalledWith(
        'http://auth-service:3001/api/v1/auth/2fa/verify',
        { userId: 'user-123', code: '123456' },
        expect.objectContaining({
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result.isValid).toBe(true);
    });

    it('should handle 401 response as invalid code', async () => {
      const error: any = {
        response: {
          status: 401,
          data: { message: 'Invalid code' },
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      const result = await service.verify2FACode('user-123', '654321');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid 2FA code');
    });

    it('should handle 400 response as invalid code', async () => {
      const error: any = {
        response: {
          status: 400,
          data: { message: 'Bad request' },
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      const result = await service.verify2FACode('user-123', '654321');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid 2FA code');
    });

    it('should throw HttpException for service errors (503)', async () => {
      const error: any = {
        response: {
          status: 503,
          data: { message: 'Service unavailable' },
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      await expect(service.verify2FACode('user-123', '123456')).rejects.toThrow(
        HttpException,
      );
      await expect(service.verify2FACode('user-123', '123456')).rejects.toThrow(
        '2FA verification service temporarily unavailable',
      );
    });

    it('should throw HttpException for network timeout', async () => {
      const error: any = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      };

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      await expect(service.verify2FACode('user-123', '123456')).rejects.toThrow(
        HttpException,
      );
    });

    it('should allow verification on service failure in development mode when configured', async () => {
      process.env.NODE_ENV = 'development';
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'TWO_FA_ALLOW_ON_SERVICE_FAILURE') return 'true';
        if (key === 'AUTH_SERVICE_URL') return 'http://auth-service:3001';
        if (key === 'TWO_FA_MAX_ATTEMPTS') return '5';
        if (key === 'TWO_FA_ATTEMPT_WINDOW_MINUTES') return '5';
        return undefined;
      });

      const error: any = {
        response: {
          status: 503,
          data: { message: 'Service unavailable' },
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      const result = await service.verify2FACode('user-123', '123456');

      expect(result.isValid).toBe(true);

      process.env.NODE_ENV = 'test';
    });

    it('should handle auth service response with valid=false', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: { valid: false },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as AxiosResponse));

      const result = await service.verify2FACode('user-123', '654321');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid 2FA code');
    });
  });

  describe('Rate Limiting Window Expiry', () => {
    it('should reset rate limit after time window expires', async () => {
      // Mock Date to control time
      const realDate = Date;
      const baseTime = new Date('2025-01-15T10:00:00Z').getTime();
      let currentTime = baseTime;

      global.Date = class extends Date {
        constructor() {
          super();
          return new realDate(currentTime);
        }
        static now() {
          return currentTime;
        }
      } as any;

      // Make 3 failed attempts
      await service.verify2FACode('user-123', '000000');
      await service.verify2FACode('user-123', '000000');
      await service.verify2FACode('user-123', '000000');

      expect(service.getRemainingAttempts('user-123')).toBe(2);

      // Advance time by 6 minutes (past the 5-minute window)
      currentTime = baseTime + 6 * 60 * 1000;

      // Should have reset
      expect(service.getRemainingAttempts('user-123')).toBe(5);

      // Restore real Date
      global.Date = realDate;
    });

    it('should not reset rate limit within time window', async () => {
      await service.verify2FACode('user-123', '000000');
      expect(service.getRemainingAttempts('user-123')).toBe(4);

      // Try again immediately
      await service.verify2FACode('user-123', '000000');
      expect(service.getRemainingAttempts('user-123')).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty code', async () => {
      const result = await service.verify2FACode('user-123', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('2FA code must be 6 digits');
    });

    it('should handle null code', async () => {
      const result = await service.verify2FACode('user-123', null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('2FA code must be 6 digits');
    });

    it('should handle undefined code', async () => {
      const result = await service.verify2FACode('user-123', undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('2FA code must be 6 digits');
    });

    it('should handle code with spaces', async () => {
      const result = await service.verify2FACode('user-123', '123 456');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('2FA code must be 6 digits');
    });

    it('should handle very long code', async () => {
      const result = await service.verify2FACode('user-123', '1234567890');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('2FA code must be 6 digits');
    });

    it('should track multiple users independently', async () => {
      await service.verify2FACode('user-1', '000000');
      await service.verify2FACode('user-2', '000000');

      expect(service.getRemainingAttempts('user-1')).toBe(4);
      expect(service.getRemainingAttempts('user-2')).toBe(4);
    });

    it('should not interfere between different users', async () => {
      // User 1 gets rate limited
      for (let i = 0; i < 5; i++) {
        await service.verify2FACode('user-1', '000000');
      }

      // User 2 should still be able to verify
      const result = await service.verify2FACode('user-2', '123456');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should use default values when config is missing', async () => {
      const moduleWithDefaults = await Test.createTestingModule({
        providers: [
          TwoFactorVerificationService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
          {
            provide: HttpService,
            useValue: {
              post: jest.fn(),
            },
          },
        ],
      }).compile();

      const serviceWithDefaults = moduleWithDefaults.get<TwoFactorVerificationService>(
        TwoFactorVerificationService,
      );

      // Should still work with default values
      expect(serviceWithDefaults).toBeDefined();
      expect(serviceWithDefaults.getRemainingAttempts('user-123')).toBe(5);
    });
  });
});
