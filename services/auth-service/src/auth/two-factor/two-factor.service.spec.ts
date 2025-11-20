import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwoFactorService } from './two-factor.service';
import { User } from '../entities/user.entity';
import { TwoFactorAuth } from '../entities/two-factor-auth.entity';
import { TwoFactorBackupCode } from '../entities/two-factor-backup-code.entity';
import { TwoFactorAuditLog } from '../entities/two-factor-audit-log.entity';
import { Redis2FAService } from './utils/redis-2fa.service';
import { ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let userRepository: Repository<User>;
  let twoFactorAuthRepository: Repository<TwoFactorAuth>;
  let backupCodeRepository: Repository<TwoFactorBackupCode>;
  let auditLogRepository: Repository<TwoFactorAuditLog>;
  let redis2FAService: Redis2FAService;
  let configService: ConfigService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashedPassword123',
  };

  const mockRepositoryFactory = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    manager: {
      transaction: jest.fn((callback) => callback({
        create: jest.fn((Entity, data) => data),
        save: jest.fn(),
        delete: jest.fn(),
      })),
    },
  });

  const mockRedis2FAService = {
    storeSetupToken: jest.fn(),
    getSetupData: jest.fn(),
    clearSetupData: jest.fn(),
    storeChallengeTokenWithLookup: jest.fn(),
    verifyChallengeToken: jest.fn(),
    clearChallengeToken: jest.fn(),
    isLockedOut: jest.fn(),
    incrementFailedAttempts: jest.fn(),
    clearFailedAttempts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepositoryFactory(),
        },
        {
          provide: getRepositoryToken(TwoFactorAuth),
          useValue: mockRepositoryFactory(),
        },
        {
          provide: getRepositoryToken(TwoFactorBackupCode),
          useValue: mockRepositoryFactory(),
        },
        {
          provide: getRepositoryToken(TwoFactorAuditLog),
          useValue: mockRepositoryFactory(),
        },
        {
          provide: Redis2FAService,
          useValue: mockRedis2FAService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'TWO_FACTOR_ENCRYPTION_KEY') {
                return 'test-encryption-key-32-bytes-long!!';
              }
              if (key === 'TWO_FACTOR_ISSUER') {
                return defaultValue || 'MyCrypto Exchange';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    twoFactorAuthRepository = module.get<Repository<TwoFactorAuth>>(getRepositoryToken(TwoFactorAuth));
    backupCodeRepository = module.get<Repository<TwoFactorBackupCode>>(getRepositoryToken(TwoFactorBackupCode));
    auditLogRepository = module.get<Repository<TwoFactorAuditLog>>(getRepositoryToken(TwoFactorAuditLog));
    redis2FAService = module.get<Redis2FAService>(Redis2FAService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('should generate 2FA setup data successfully', async () => {
      const setupToken = 'setup-token-123';
      const qrCode = 'data:image/png;base64,qrcode';
      const manualEntryKey = 'ABCD1234';

      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      mockRedis2FAService.storeSetupToken.mockResolvedValue(setupToken);

      const result = await service.setup(mockUser.id);

      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('manualEntryKey');
      expect(result.setupToken).toBe(setupToken);
      expect(twoFactorAuthRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isEnabled: true },
      });
      expect(mockRedis2FAService.storeSetupToken).toHaveBeenCalled();
    });

    it('should throw ConflictException if 2FA already enabled', async () => {
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue({
        userId: mockUser.id,
        isEnabled: true,
      } as any);

      await expect(service.setup(mockUser.id)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.setup(mockUser.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifySetup', () => {
    const setupToken = 'setup-token-123';
    const code = '123456';
    const secret = 'test-secret';

    it('should verify and enable 2FA successfully', async () => {
      const backupCodes = ['CODE1-CODE1', 'CODE2-CODE2'];
      mockRedis2FAService.getSetupData.mockResolvedValue({ secret });
      mockRedis2FAService.clearSetupData.mockResolvedValue(true);

      const result = await service.verifySetup(mockUser.id, setupToken, code);

      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(mockRedis2FAService.getSetupData).toHaveBeenCalledWith(mockUser.id, setupToken);
      expect(mockRedis2FAService.clearSetupData).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw BadRequestException for invalid setup token', async () => {
      mockRedis2FAService.getSetupData.mockResolvedValue(null);

      await expect(service.verifySetup(mockUser.id, setupToken, code)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createChallenge', () => {
    it('should create challenge token when 2FA is enabled', async () => {
      const challengeToken = 'challenge-token-123';
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue({
        userId: mockUser.id,
        isEnabled: true,
      } as any);
      mockRedis2FAService.storeChallengeTokenWithLookup.mockResolvedValue(challengeToken);

      const result = await service.createChallenge(mockUser.id);

      expect(result.requires2FA).toBe(true);
      expect(result.challengeToken).toBe(challengeToken);
      expect(mockRedis2FAService.storeChallengeTokenWithLookup).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return no challenge when 2FA is not enabled', async () => {
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue(null);

      const result = await service.createChallenge(mockUser.id);

      expect(result.requires2FA).toBe(false);
      expect(result.challengeToken).toBeNull();
    });
  });

  describe('verifyChallenge', () => {
    const challengeToken = 'challenge-token-123';
    const totpCode = '123456';

    it('should verify TOTP code successfully', async () => {
      mockRedis2FAService.verifyChallengeToken.mockResolvedValue(mockUser.id);
      mockRedis2FAService.isLockedOut.mockResolvedValue(false);
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue({
        userId: mockUser.id,
        isEnabled: true,
        secretEncrypted: 'encrypted-secret',
      } as any);

      const result = await service.verifyChallenge(challengeToken, totpCode);

      expect(result.userId).toBe(mockUser.id);
      expect(mockRedis2FAService.clearFailedAttempts).toHaveBeenCalledWith(mockUser.id);
      expect(mockRedis2FAService.clearChallengeToken).toHaveBeenCalledWith(mockUser.id, challengeToken);
    });

    it('should verify backup code successfully', async () => {
      const backupCode = 'ABCD-1234';
      mockRedis2FAService.verifyChallengeToken.mockResolvedValue(mockUser.id);
      mockRedis2FAService.isLockedOut.mockResolvedValue(false);
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue({
        userId: mockUser.id,
        isEnabled: true,
        secretEncrypted: 'encrypted-secret',
      } as any);
      jest.spyOn(backupCodeRepository, 'find').mockResolvedValue([
        {
          userId: mockUser.id,
          codeHash: 'hashed-backup-code',
          usedAt: null,
        },
      ] as any);
      jest.spyOn(backupCodeRepository, 'save').mockResolvedValue({} as any);

      const result = await service.verifyChallenge(challengeToken, backupCode);

      expect(result.userId).toBe(mockUser.id);
      expect(backupCodeRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid challenge token', async () => {
      mockRedis2FAService.verifyChallengeToken.mockResolvedValue(null);

      await expect(service.verifyChallenge(challengeToken, totpCode)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is locked out', async () => {
      mockRedis2FAService.verifyChallengeToken.mockResolvedValue(mockUser.id);
      mockRedis2FAService.isLockedOut.mockResolvedValue(true);

      await expect(service.verifyChallenge(challengeToken, totpCode)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('regenerateBackupCodes', () => {
    const password = 'password123';

    it('should regenerate backup codes successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue({
        userId: mockUser.id,
        isEnabled: true,
      } as any);

      const result = await service.regenerateBackupCodes(mockUser.id, password);

      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(backupCodeRepository.manager.transaction).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.regenerateBackupCodes(mockUser.id, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue(null);

      await expect(service.regenerateBackupCodes(mockUser.id, password)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatus', () => {
    it('should return enabled status with backup codes count', async () => {
      const enabledAt = new Date();
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue({
        userId: mockUser.id,
        isEnabled: true,
        verifiedAt: enabledAt,
      } as any);
      jest.spyOn(backupCodeRepository, 'count').mockResolvedValue(5);

      const result = await service.getStatus(mockUser.id);

      expect(result.isEnabled).toBe(true);
      expect(result.enabledAt).toBe(enabledAt.toISOString());
      expect(result.backupCodesRemaining).toBe(5);
    });

    it('should return disabled status', async () => {
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getStatus(mockUser.id);

      expect(result.isEnabled).toBe(false);
      expect(result.enabledAt).toBeNull();
      expect(result.backupCodesRemaining).toBe(0);
    });
  });

  describe('disable', () => {
    const password = 'password123';
    const code = '123456';

    it('should disable 2FA successfully with TOTP code', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue({
        userId: mockUser.id,
        isEnabled: true,
        secretEncrypted: 'encrypted-secret',
      } as any);

      await service.disable(mockUser.id, password, code);

      expect(twoFactorAuthRepository.manager.transaction).toHaveBeenCalled();
    });

    it('should disable 2FA successfully with backup code', async () => {
      const backupCode = 'ABCD-1234';
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue({
        userId: mockUser.id,
        isEnabled: true,
        secretEncrypted: 'encrypted-secret',
      } as any);
      jest.spyOn(backupCodeRepository, 'find').mockResolvedValue([
        {
          userId: mockUser.id,
          codeHash: 'hashed-backup-code',
          usedAt: null,
        },
      ] as any);

      await service.disable(mockUser.id, password, backupCode);

      expect(twoFactorAuthRepository.manager.transaction).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.disable(mockUser.id, password, code)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(twoFactorAuthRepository, 'findOne').mockResolvedValue(null);

      await expect(service.disable(mockUser.id, password, code)).rejects.toThrow(BadRequestException);
    });
  });
});