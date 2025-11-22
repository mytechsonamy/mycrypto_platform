import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { TwoFactorVerificationService } from './two-factor-verification.service';
import { of, throwError } from 'rxjs';

describe('TwoFactorVerificationService', () => {
  let service: TwoFactorVerificationService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorVerificationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                AUTH_SERVICE_URL: 'http://auth-service:3001',
                TWO_FA_MAX_ATTEMPTS: '5',
                TWO_FA_ATTEMPT_WINDOW_MINUTES: '5',
              };
              return config[key];
            }),
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

    service = module.get<TwoFactorVerificationService>(TwoFactorVerificationService);
    httpService = module.get<HttpService>(HttpService);
    process.env.NODE_ENV = 'test';
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
});
