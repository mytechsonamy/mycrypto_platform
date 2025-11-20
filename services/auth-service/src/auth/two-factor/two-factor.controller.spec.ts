import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { AuthService } from '../auth.service';
import { HttpStatus } from '@nestjs/common';
import { VerifySetupDto, VerifyChallengeDto, RegenerateBackupCodesDto, Disable2FADto } from './dto';

describe('TwoFactorController', () => {
  let controller: TwoFactorController;
  let twoFactorService: TwoFactorService;
  let authService: AuthService;

  const mockRequest = {
    user: {
      sub: 'user-123',
      id: 'user-123',
      email: 'test@example.com',
    },
  };

  const mockTwoFactorService = {
    setup: jest.fn(),
    verifySetup: jest.fn(),
    createChallenge: jest.fn(),
    verifyChallenge: jest.fn(),
    regenerateBackupCodes: jest.fn(),
    getStatus: jest.fn(),
    disable: jest.fn(),
  };

  const mockAuthService = {
    generateTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwoFactorController],
      providers: [
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<TwoFactorController>(TwoFactorController);
    twoFactorService = module.get<TwoFactorService>(TwoFactorService);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/2fa/setup', () => {
    it('should initialize 2FA setup successfully', async () => {
      const setupData = {
        qrCode: 'data:image/png;base64,qrcode',
        manualEntryKey: 'ABCD1234EFGH5678',
        setupToken: 'setup-token-123',
      };

      mockTwoFactorService.setup.mockResolvedValue(setupData);

      const result = await controller.setup(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.qr_code).toBe(setupData.qrCode);
      expect(result.data.manual_entry_key).toBe(setupData.manualEntryKey);
      expect(result.data.setup_token).toBe(setupData.setupToken);
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('request_id');
      expect(mockTwoFactorService.setup).toHaveBeenCalledWith('user-123');
    });

    it('should handle errors from service', async () => {
      mockTwoFactorService.setup.mockRejectedValue(new Error('Setup failed'));

      await expect(controller.setup(mockRequest)).rejects.toThrow('Setup failed');
    });
  });

  describe('POST /api/v1/auth/2fa/verify-setup', () => {
    it('should verify setup and enable 2FA successfully', async () => {
      const dto: VerifySetupDto = {
        setupToken: 'setup-token-123',
        code: '123456',
      };

      const backupCodes = [
        'ABCD-1234',
        'EFGH-5678',
        'IJKL-9012',
        'MNOP-3456',
        'QRST-7890',
        'UVWX-1234',
        'YZAB-5678',
        'CDEF-9012',
        'GHIJ-3456',
        'KLMN-7890',
      ];

      mockTwoFactorService.verifySetup.mockResolvedValue({ backupCodes });

      const result = await controller.verifySetup(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Two-factor authentication has been enabled successfully');
      expect(result.data.backupCodes).toEqual(backupCodes);
      expect(mockTwoFactorService.verifySetup).toHaveBeenCalledWith(
        'user-123',
        dto.setupToken,
        dto.code,
      );
    });

    it('should handle invalid setup token', async () => {
      const dto: VerifySetupDto = {
        setupToken: 'invalid-token',
        code: '123456',
      };

      mockTwoFactorService.verifySetup.mockRejectedValue(
        new Error('Invalid or expired setup token'),
      );

      await expect(controller.verifySetup(dto, mockRequest)).rejects.toThrow(
        'Invalid or expired setup token',
      );
    });
  });

  describe('POST /api/v1/auth/2fa/verify', () => {
    it('should verify 2FA challenge and return tokens', async () => {
      const dto: VerifyChallengeDto = {
        challengeToken: 'challenge-token-123',
        code: '123456',
      };

      const tokens = {
        access_token: 'jwt-access-token',
        refresh_token: 'jwt-refresh-token',
      };

      mockTwoFactorService.verifyChallenge.mockResolvedValue({ userId: 'user-123' });
      mockAuthService.generateTokens.mockResolvedValue(tokens);

      const result = await controller.verifyChallenge(dto);

      expect(result.success).toBe(true);
      expect(result.data.access_token).toBe(tokens.access_token);
      expect(result.data.refresh_token).toBe(tokens.refresh_token);
      expect(result.data.token_type).toBe('Bearer');
      expect(result.data.expires_in).toBe(900);
      expect(mockTwoFactorService.verifyChallenge).toHaveBeenCalledWith(
        dto.challengeToken,
        dto.code,
      );
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith('user-123');
    });

    it('should handle invalid challenge token', async () => {
      const dto: VerifyChallengeDto = {
        challengeToken: 'invalid-token',
        code: '123456',
      };

      mockTwoFactorService.verifyChallenge.mockRejectedValue(
        new Error('Invalid or expired challenge token'),
      );

      await expect(controller.verifyChallenge(dto)).rejects.toThrow(
        'Invalid or expired challenge token',
      );
    });

    it('should handle backup code verification', async () => {
      const dto: VerifyChallengeDto = {
        challengeToken: 'challenge-token-123',
        code: 'ABCD-1234', // Backup code format
      };

      const tokens = {
        access_token: 'jwt-access-token',
        refresh_token: 'jwt-refresh-token',
      };

      mockTwoFactorService.verifyChallenge.mockResolvedValue({ userId: 'user-123' });
      mockAuthService.generateTokens.mockResolvedValue(tokens);

      const result = await controller.verifyChallenge(dto);

      expect(result.success).toBe(true);
      expect(result.data.access_token).toBe(tokens.access_token);
      expect(mockTwoFactorService.verifyChallenge).toHaveBeenCalledWith(
        dto.challengeToken,
        dto.code,
      );
    });
  });

  describe('POST /api/v1/auth/2fa/backup-codes/regenerate', () => {
    it('should regenerate backup codes successfully', async () => {
      const dto: RegenerateBackupCodesDto = {
        password: 'current-password',
      };

      const backupCodes = [
        'NEW1-1234',
        'NEW2-5678',
        'NEW3-9012',
        'NEW4-3456',
        'NEW5-7890',
        'NEW6-1234',
        'NEW7-5678',
        'NEW8-9012',
        'NEW9-3456',
        'NEW0-7890',
      ];

      mockTwoFactorService.regenerateBackupCodes.mockResolvedValue({ backupCodes });

      const result = await controller.regenerateBackupCodes(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.backup_codes).toEqual(backupCodes);
      expect(mockTwoFactorService.regenerateBackupCodes).toHaveBeenCalledWith(
        'user-123',
        dto.password,
      );
    });

    it('should handle invalid password', async () => {
      const dto: RegenerateBackupCodesDto = {
        password: 'wrong-password',
      };

      mockTwoFactorService.regenerateBackupCodes.mockRejectedValue(
        new Error('Invalid password'),
      );

      await expect(controller.regenerateBackupCodes(dto, mockRequest)).rejects.toThrow(
        'Invalid password',
      );
    });
  });

  describe('GET /api/v1/auth/2fa/status', () => {
    it('should return 2FA enabled status', async () => {
      const status = {
        isEnabled: true,
        enabledAt: '2025-11-19T10:00:00.000Z',
        backupCodesRemaining: 8,
      };

      mockTwoFactorService.getStatus.mockResolvedValue(status);

      const result = await controller.getStatus(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(status);
      expect(mockTwoFactorService.getStatus).toHaveBeenCalledWith('user-123');
    });

    it('should return 2FA disabled status', async () => {
      const status = {
        isEnabled: false,
        enabledAt: null,
        backupCodesRemaining: 0,
      };

      mockTwoFactorService.getStatus.mockResolvedValue(status);

      const result = await controller.getStatus(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.isEnabled).toBe(false);
      expect(result.data.enabledAt).toBeNull();
      expect(result.data.backupCodesRemaining).toBe(0);
    });
  });

  describe('POST /api/v1/auth/2fa/disable', () => {
    it('should disable 2FA successfully with TOTP code', async () => {
      const dto: Disable2FADto = {
        password: 'current-password',
        code: '123456',
      };

      mockTwoFactorService.disable.mockResolvedValue(undefined);

      const result = await controller.disable(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Two-factor authentication has been disabled');
      expect(mockTwoFactorService.disable).toHaveBeenCalledWith(
        'user-123',
        dto.password,
        dto.code,
      );
    });

    it('should disable 2FA successfully with backup code', async () => {
      const dto: Disable2FADto = {
        password: 'current-password',
        code: 'ABCD-1234', // Backup code format
      };

      mockTwoFactorService.disable.mockResolvedValue(undefined);

      const result = await controller.disable(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Two-factor authentication has been disabled');
      expect(mockTwoFactorService.disable).toHaveBeenCalledWith(
        'user-123',
        dto.password,
        dto.code,
      );
    });

    it('should handle invalid password', async () => {
      const dto: Disable2FADto = {
        password: 'wrong-password',
        code: '123456',
      };

      mockTwoFactorService.disable.mockRejectedValue(new Error('Invalid password'));

      await expect(controller.disable(dto, mockRequest)).rejects.toThrow('Invalid password');
    });

    it('should handle 2FA not enabled error', async () => {
      const dto: Disable2FADto = {
        password: 'current-password',
        code: '123456',
      };

      mockTwoFactorService.disable.mockRejectedValue(
        new Error('Two-factor authentication is not enabled'),
      );

      await expect(controller.disable(dto, mockRequest)).rejects.toThrow(
        'Two-factor authentication is not enabled',
      );
    });
  });
});