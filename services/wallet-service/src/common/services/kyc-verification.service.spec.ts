import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ForbiddenException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { KycVerificationService } from './kyc-verification.service';

describe('KycVerificationService', () => {
  let service: KycVerificationService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: string) => {
      if (key === 'AUTH_SERVICE_URL') {
        return 'http://auth-service:3001';
      }
      return defaultValue;
    }),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycVerificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<KycVerificationService>(KycVerificationService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyKycApproved', () => {
    it('should return KYC status when user has approved KYC', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: 'sub-456',
          level: 'LEVEL_1',
          status: 'APPROVED',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.verifyKycApproved(userId, authToken);

      expect(result).toEqual({
        hasKyc: true,
        level: 'LEVEL_1',
        status: 'APPROVED',
      });
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://auth-service:3001/auth/kyc/status',
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          timeout: 5000,
        },
      );
    });

    it('should return hasKyc false when user has no submission', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: null,
          level: null,
          status: 'NOT_SUBMITTED',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.verifyKycApproved(userId, authToken);

      expect(result).toEqual({
        hasKyc: false,
        level: 'NONE',
        status: 'NOT_SUBMITTED',
      });
    });

    it('should return hasKyc true but status PENDING when KYC is pending', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: 'sub-789',
          level: 'LEVEL_1',
          status: 'PENDING',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.verifyKycApproved(userId, authToken);

      expect(result).toEqual({
        hasKyc: true,
        level: 'LEVEL_1',
        status: 'PENDING',
      });
    });

    it('should handle auth service unavailable gracefully', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const error = new Error('Service unavailable');

      mockHttpService.get.mockReturnValue(throwError(() => error));

      const result = await service.verifyKycApproved(userId, authToken);

      expect(result).toEqual({
        hasKyc: false,
        level: 'NONE',
        status: 'UNKNOWN',
      });
    });

    it('should handle network timeout gracefully', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const error = { message: 'Timeout' };

      mockHttpService.get.mockReturnValue(throwError(() => error));

      const result = await service.verifyKycApproved(userId, authToken);

      expect(result).toEqual({
        hasKyc: false,
        level: 'NONE',
        status: 'UNKNOWN',
      });
    });
  });

  describe('requireKycLevel1', () => {
    it('should not throw when KYC is approved', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: 'sub-456',
          level: 'LEVEL_1',
          status: 'APPROVED',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await expect(
        service.requireKycLevel1(userId, authToken),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when KYC not submitted', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: null,
          level: null,
          status: 'NOT_SUBMITTED',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await expect(service.requireKycLevel1(userId, authToken)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when KYC is pending', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: 'sub-789',
          level: 'LEVEL_1',
          status: 'PENDING',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await expect(service.requireKycLevel1(userId, authToken)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when KYC is rejected', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: 'sub-789',
          level: 'LEVEL_1',
          status: 'REJECTED',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await expect(service.requireKycLevel1(userId, authToken)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should include proper error details in ForbiddenException', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: 'sub-789',
          level: 'LEVEL_1',
          status: 'PENDING',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      try {
        await service.requireKycLevel1(userId, authToken);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.getResponse()).toEqual({
          error: 'KYC_REQUIRED',
          message: 'KYC Level 1 approval required for crypto deposits',
          details: {
            hasKyc: true,
            status: 'PENDING',
            requiredLevel: 'LEVEL_1',
            requiredStatus: 'APPROVED',
          },
        });
      }
    });

    it('should throw when submission exists but no approval', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: 'sub-999',
          level: 'LEVEL_1',
          status: 'UNDER_REVIEW',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await expect(service.requireKycLevel1(userId, authToken)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Configuration', () => {
    it('should use configured AUTH_SERVICE_URL', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {
          submissionId: 'sub-456',
          level: 'LEVEL_1',
          status: 'APPROVED',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await service.verifyKycApproved(userId, authToken);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://auth-service:3001/auth/kyc/status',
        expect.any(Object),
      );
    });

    it('should use default AUTH_SERVICE_URL if not configured', async () => {
      const customConfig = {
        get: jest.fn().mockReturnValue('http://localhost:3001'),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KycVerificationService,
          {
            provide: ConfigService,
            useValue: customConfig,
          },
          {
            provide: HttpService,
            useValue: mockHttpService,
          },
        ],
      }).compile();

      const customService = module.get<KycVerificationService>(
        KycVerificationService,
      );

      expect(customService).toBeDefined();
      expect(customConfig.get).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response data', async () => {
      const userId = 'user-123';
      const authToken = 'valid-jwt-token';
      const mockResponse = {
        data: {},
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.verifyKycApproved(userId, authToken);

      expect(result).toEqual({
        hasKyc: false,
        level: 'NONE',
        status: 'NOT_SUBMITTED',
      });
    });

    it('should handle malformed auth token', async () => {
      const userId = 'user-123';
      const authToken = '';
      const mockResponse = {
        data: {
          submissionId: 'sub-456',
          level: 'LEVEL_1',
          status: 'APPROVED',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.verifyKycApproved(userId, authToken);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'http://auth-service:3001/auth/kyc/status',
        {
          headers: {
            Authorization: 'Bearer ',
          },
          timeout: 5000,
        },
      );
    });
  });
});
