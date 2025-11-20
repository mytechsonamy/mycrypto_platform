import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RecaptchaService, RecaptchaResponse } from './recaptcha.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RecaptchaService', () => {
  let service: RecaptchaService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecaptchaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RecaptchaService>(RecaptchaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration values', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'RECAPTCHA_SECRET_KEY':
            return 'test-secret-key';
          case 'RECAPTCHA_SCORE_THRESHOLD':
            return '0.7';
          case 'NODE_ENV':
            return 'development';
          default:
            return undefined;
        }
      });

      const testService = new RecaptchaService(configService);
      expect(testService.getScoreThreshold()).toBe(0.7);
    });

    it('should use default threshold if not configured', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'RECAPTCHA_SECRET_KEY':
            return 'test-secret-key';
          case 'RECAPTCHA_SCORE_THRESHOLD':
            return defaultValue || undefined;
          case 'NODE_ENV':
            return 'development';
          default:
            return undefined;
        }
      });

      const testService = new RecaptchaService(configService);
      expect(testService.getScoreThreshold()).toBe(0.5);
    });
  });

  describe('verify', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'RECAPTCHA_SECRET_KEY':
            return 'test-secret-key';
          case 'RECAPTCHA_SCORE_THRESHOLD':
            return '0.5';
          case 'NODE_ENV':
            return 'development';
          default:
            return undefined;
        }
      });
      // Re-create the service with fresh mocks
      service = new RecaptchaService(configService);
    });

    it('should skip verification in test environment', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'RECAPTCHA_SECRET_KEY') return 'test-secret-key';
        if (key === 'RECAPTCHA_SCORE_THRESHOLD') return '0.5';
        return undefined;
      });

      // Re-create service with test environment
      service = new RecaptchaService(configService);

      const result = await service.verify('test-token');

      expect(result).toEqual({
        success: true,
        score: 1.0,
        action: 'test',
        hostname: 'localhost',
      });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return error if no token provided', async () => {
      const result = await service.verify('');

      expect(result).toEqual({
        success: false,
        'error-codes': ['missing-input-response'],
      });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should return error if no secret key configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'RECAPTCHA_SECRET_KEY') return '';
        if (key === 'RECAPTCHA_SCORE_THRESHOLD') return '0.5';
        return undefined;
      });

      // Re-create service with empty secret key
      service = new RecaptchaService(configService);

      const result = await service.verify('test-token');

      expect(result).toEqual({
        success: false,
        'error-codes': ['missing-input-secret'],
      });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should successfully verify valid token with high score', async () => {
      const mockResponse: RecaptchaResponse = {
        success: true,
        score: 0.9,
        action: 'register',
        challenge_ts: '2025-11-19T10:00:00Z',
        hostname: 'example.com',
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await service.verify('valid-token');

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: 'test-secret-key',
            response: 'valid-token',
          },
          timeout: 5000,
        }
      );
    });

    it('should return unsuccessful result for invalid token', async () => {
      const mockResponse: RecaptchaResponse = {
        success: false,
        'error-codes': ['invalid-input-response'],
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await service.verify('invalid-token');

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
    });

    it('should return error when API request fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.verify('test-token');

      expect(result).toEqual({
        success: false,
        'error-codes': ['api-request-failed'],
      });
    });

    it('should handle axios timeout error', async () => {
      const axiosError = new Error('timeout of 5000ms exceeded');
      axiosError.name = 'AxiosError';
      (axiosError as any).code = 'ECONNABORTED';

      mockedAxios.post.mockRejectedValue(axiosError);

      const result = await service.verify('test-token');

      expect(result).toEqual({
        success: false,
        'error-codes': ['api-request-failed'],
      });
    });
  });

  describe('isScoreValid', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'RECAPTCHA_SECRET_KEY':
            return 'test-secret-key';
          case 'RECAPTCHA_SCORE_THRESHOLD':
            return '0.5';
          case 'NODE_ENV':
            return 'development';
          default:
            return undefined;
        }
      });
    });

    it('should return true for score above threshold', () => {
      expect(service.isScoreValid(0.8)).toBe(true);
      expect(service.isScoreValid(0.5)).toBe(true);
    });

    it('should return false for score below threshold', () => {
      expect(service.isScoreValid(0.4)).toBe(false);
      expect(service.isScoreValid(0.1)).toBe(false);
    });

    it('should return false for undefined score', () => {
      expect(service.isScoreValid(undefined)).toBe(false);
    });

    it('should handle custom threshold', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'RECAPTCHA_SECRET_KEY':
            return 'test-secret-key';
          case 'RECAPTCHA_SCORE_THRESHOLD':
            return '0.8';
          case 'NODE_ENV':
            return 'development';
          default:
            return undefined;
        }
      });

      const customService = new RecaptchaService(configService);
      expect(customService.isScoreValid(0.9)).toBe(true);
      expect(customService.isScoreValid(0.7)).toBe(false);
    });
  });

  describe('getScoreThreshold', () => {
    it('should return configured threshold', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'RECAPTCHA_SECRET_KEY':
            return 'test-secret-key';
          case 'RECAPTCHA_SCORE_THRESHOLD':
            return '0.7';
          case 'NODE_ENV':
            return 'development';
          default:
            return undefined;
        }
      });

      const testService = new RecaptchaService(configService);
      expect(testService.getScoreThreshold()).toBe(0.7);
    });
  });

  describe('logging', () => {
    it('should log successful verification with score', async () => {
      const mockResponse: RecaptchaResponse = {
        success: true,
        score: 0.9,
        action: 'register',
        hostname: 'example.com',
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.verify('valid-token');

      expect(logSpy).toHaveBeenCalledWith('reCAPTCHA verification attempt', {
        success: true,
        score: 0.9,
        action: 'register',
        hostname: 'example.com',
        errorCodes: undefined,
      });
    });

    it('should log failed verification with error codes', async () => {
      const mockResponse: RecaptchaResponse = {
        success: false,
        'error-codes': ['invalid-input-response'],
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.verify('invalid-token');

      expect(logSpy).toHaveBeenCalledWith('reCAPTCHA verification attempt', {
        success: false,
        score: undefined,
        action: undefined,
        hostname: undefined,
        errorCodes: ['invalid-input-response'],
      });
    });

    it('should log warning when no token provided', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      await service.verify('');

      expect(warnSpy).toHaveBeenCalledWith(
        'reCAPTCHA verification failed: No token provided'
      );
    });

    it('should log error when no secret key configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'RECAPTCHA_SECRET_KEY') return '';
        if (key === 'RECAPTCHA_SCORE_THRESHOLD') return '0.5';
        return undefined;
      });

      // Re-create service with empty secret key
      const testService = new RecaptchaService(configService);
      const errorSpy = jest.spyOn(testService['logger'], 'error');

      await testService.verify('test-token');

      expect(errorSpy).toHaveBeenCalledWith(
        'reCAPTCHA verification failed: No secret key configured'
      );
    });

    it('should log API request error', async () => {
      const error = new Error('Network error');
      mockedAxios.post.mockRejectedValue(error);

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.verify('test-token');

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error'),
        expect.anything()
      );
    });
  });
});