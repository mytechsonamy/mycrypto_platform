import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecaptchaGuard } from './recaptcha.guard';
import { RecaptchaService } from '../services/recaptcha.service';

describe('RecaptchaGuard', () => {
  let guard: RecaptchaGuard;
  let recaptchaService: RecaptchaService;
  let configService: ConfigService;

  const mockRecaptchaService = {
    verify: jest.fn(),
    isScoreValid: jest.fn(),
    getScoreThreshold: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const createMockExecutionContext = (
    headers: Record<string, string> = {},
    body: any = {},
    ip?: string
  ): ExecutionContext => {
    const mockRequest = {
      headers,
      body,
      ip: ip || '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      path: '/api/v1/auth/register',
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecaptchaGuard,
        {
          provide: RecaptchaService,
          useValue: mockRecaptchaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<RecaptchaGuard>(RecaptchaGuard);
    recaptchaService = module.get<RecaptchaService>(RecaptchaService);
    configService = module.get<ConfigService>(ConfigService);

    // Default configuration
    mockConfigService.get.mockReturnValue('development');
    mockRecaptchaService.getScoreThreshold.mockReturnValue(0.5);
  });

  describe('canActivate', () => {
    describe('Test Environment', () => {
      it('should skip validation in test environment', async () => {
        mockConfigService.get.mockReturnValue('test');

        // Re-create guard with test environment configuration
        const testGuard = new RecaptchaGuard(mockRecaptchaService as any, mockConfigService as any);

        const context = createMockExecutionContext();
        const result = await testGuard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRecaptchaService.verify).not.toHaveBeenCalled();
      });
    });

    describe('Token Extraction', () => {
      it('should extract token from X-Recaptcha-Token header', async () => {
        const token = 'valid-token-from-header';
        const context = createMockExecutionContext({
          'x-recaptcha-token': token,
        });

        // Ensure the guard is created with development environment
        mockConfigService.get.mockReturnValue('development');

        mockRecaptchaService.verify.mockResolvedValue({
          success: true,
          score: 0.9,
          action: 'register',
          hostname: 'example.com',
        });
        mockRecaptchaService.isScoreValid.mockReturnValue(true);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRecaptchaService.verify).toHaveBeenCalledWith(token);
      });

      it('should extract token from body as fallback', async () => {
        const token = 'valid-token-from-body';
        const context = createMockExecutionContext(
          {},
          { recaptchaToken: token }
        );

        mockRecaptchaService.verify.mockResolvedValue({
          success: true,
          score: 0.9,
          action: 'register',
          hostname: 'example.com',
        });
        mockRecaptchaService.isScoreValid.mockReturnValue(true);

        await guard.canActivate(context);

        expect(mockRecaptchaService.verify).toHaveBeenCalledWith(token);
      });

      it('should throw ForbiddenException when no token provided', async () => {
        const context = createMockExecutionContext();

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException
        );

        await expect(guard.canActivate(context)).rejects.toThrow(
          expect.objectContaining({
            response: expect.objectContaining({
              success: false,
              error: {
                code: 'RECAPTCHA_FAILED',
                message: 'Bot algılandı. Lütfen tekrar deneyin.',
              },
            }),
          })
        );
      });
    });

    describe('Verification Success', () => {
      it('should allow access when verification is successful with valid score', async () => {
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'valid-token',
        });

        mockRecaptchaService.verify.mockResolvedValue({
          success: true,
          score: 0.9,
          action: 'register',
          hostname: 'example.com',
        });
        mockRecaptchaService.isScoreValid.mockReturnValue(true);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRecaptchaService.verify).toHaveBeenCalledWith('valid-token');
        expect(mockRecaptchaService.isScoreValid).toHaveBeenCalledWith(0.9);
      });

      it('should store verification result in request', async () => {
        const mockRequest: any = {
          headers: { 'x-recaptcha-token': 'valid-token' },
          body: {},
          ip: '127.0.0.1',
          connection: { remoteAddress: '127.0.0.1' },
          path: '/api/v1/auth/register',
        };

        const context = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue(mockRequest),
          }),
        } as unknown as ExecutionContext;

        const verificationResult = {
          success: true,
          score: 0.9,
          action: 'register',
          hostname: 'example.com',
        };

        mockRecaptchaService.verify.mockResolvedValue(verificationResult);
        mockRecaptchaService.isScoreValid.mockReturnValue(true);

        await guard.canActivate(context);

        expect(mockRequest.recaptchaResult).toEqual(verificationResult);
      });

      it('should handle reCAPTCHA v2 without score', async () => {
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'valid-v2-token',
        });

        mockRecaptchaService.verify.mockResolvedValue({
          success: true,
          hostname: 'example.com',
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRecaptchaService.isScoreValid).not.toHaveBeenCalled();
      });
    });

    describe('Verification Failure', () => {
      it('should throw ForbiddenException when verification fails', async () => {
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'invalid-token',
        });

        mockRecaptchaService.verify.mockResolvedValue({
          success: false,
          'error-codes': ['invalid-input-response'],
        });

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException
        );
      });

      it('should throw ForbiddenException when score is below threshold', async () => {
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'low-score-token',
        });

        mockRecaptchaService.verify.mockResolvedValue({
          success: true,
          score: 0.3,
          action: 'register',
          hostname: 'example.com',
        });
        mockRecaptchaService.isScoreValid.mockReturnValue(false);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException
        );

        expect(mockRecaptchaService.isScoreValid).toHaveBeenCalledWith(0.3);
      });

      it('should handle unexpected errors gracefully', async () => {
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'error-token',
        });

        mockRecaptchaService.verify.mockRejectedValue(
          new Error('Unexpected error')
        );

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException
        );
      });

      it('should rethrow ForbiddenException from service', async () => {
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'token',
        });

        const forbiddenError = new ForbiddenException('Service error');
        mockRecaptchaService.verify.mockRejectedValue(forbiddenError);

        await expect(guard.canActivate(context)).rejects.toThrow(
          forbiddenError
        );
      });
    });

    describe('Logging', () => {
      it('should log successful verification with score', async () => {
        const logSpy = jest.spyOn(guard['logger'], 'log');
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'valid-token',
          'user-agent': 'Mozilla/5.0',
        });

        mockRecaptchaService.verify.mockResolvedValue({
          success: true,
          score: 0.9,
          action: 'register',
          hostname: 'example.com',
        });
        mockRecaptchaService.isScoreValid.mockReturnValue(true);

        await guard.canActivate(context);

        expect(logSpy).toHaveBeenCalledWith(
          'reCAPTCHA verification successful',
          {
            ip: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
            endpoint: '/api/v1/auth/register',
            score: 0.9,
            action: 'register',
            hostname: 'example.com',
          }
        );
      });

      it('should log when token is missing', async () => {
        const warnSpy = jest.spyOn(guard['logger'], 'warn');
        const context = createMockExecutionContext({
          'user-agent': 'Mozilla/5.0',
        });

        try {
          await guard.canActivate(context);
        } catch (error) {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith('reCAPTCHA token missing', {
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          endpoint: '/api/v1/auth/register',
        });
      });

      it('should log when verification fails', async () => {
        const warnSpy = jest.spyOn(guard['logger'], 'warn');
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'invalid-token',
        });

        mockRecaptchaService.verify.mockResolvedValue({
          success: false,
          'error-codes': ['invalid-input-response'],
        });

        try {
          await guard.canActivate(context);
        } catch (error) {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith(
          'reCAPTCHA verification failed',
          expect.objectContaining({
            errorCodes: ['invalid-input-response'],
          })
        );
      });

      it('should log when score is below threshold', async () => {
        const warnSpy = jest.spyOn(guard['logger'], 'warn');
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'low-score-token',
        });

        mockRecaptchaService.verify.mockResolvedValue({
          success: true,
          score: 0.3,
          action: 'register',
          hostname: 'example.com',
        });
        mockRecaptchaService.isScoreValid.mockReturnValue(false);
        mockRecaptchaService.getScoreThreshold.mockReturnValue(0.5);

        try {
          await guard.canActivate(context);
        } catch (error) {
          // Expected to throw
        }

        expect(warnSpy).toHaveBeenCalledWith(
          'reCAPTCHA score below threshold',
          expect.objectContaining({
            score: 0.3,
            threshold: 0.5,
          })
        );
      });

      it('should log unexpected errors', async () => {
        const errorSpy = jest.spyOn(guard['logger'], 'error');
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'error-token',
        });

        mockRecaptchaService.verify.mockRejectedValue(
          new Error('Network error')
        );

        try {
          await guard.canActivate(context);
        } catch (error) {
          // Expected to throw
        }

        expect(errorSpy).toHaveBeenCalledWith(
          'Unexpected error during reCAPTCHA verification',
          expect.objectContaining({
            error: 'Network error',
          })
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle missing IP address', async () => {
        const mockRequest = {
          headers: { 'x-recaptcha-token': 'valid-token' },
          body: {},
          path: '/api/v1/auth/register',
          ip: undefined,
          connection: { remoteAddress: undefined },
        };

        const context = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue(mockRequest),
          }),
        } as unknown as ExecutionContext;

        mockRecaptchaService.verify.mockResolvedValue({
          success: true,
          score: 0.9,
        });
        mockRecaptchaService.isScoreValid.mockReturnValue(true);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should handle missing user-agent', async () => {
        const context = createMockExecutionContext({
          'x-recaptcha-token': 'valid-token',
        });

        mockRecaptchaService.verify.mockResolvedValue({
          success: true,
          score: 0.9,
        });
        mockRecaptchaService.isScoreValid.mockReturnValue(true);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should generate unique request IDs', async () => {
        const context = createMockExecutionContext();

        const errors: ForbiddenException[] = [];
        for (let i = 0; i < 3; i++) {
          try {
            await guard.canActivate(context);
          } catch (error) {
            if (error instanceof ForbiddenException) {
              errors.push(error);
            }
          }
        }

        const requestIds = errors.map(
          (e) => e.getResponse()['meta'].request_id
        );
        const uniqueIds = new Set(requestIds);

        expect(uniqueIds.size).toBe(requestIds.length);
        requestIds.forEach((id) => {
          expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
        });
      });
    });
  });
});