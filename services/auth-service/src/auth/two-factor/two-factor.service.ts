import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { TwoFactorAuth } from '../entities/two-factor-auth.entity';
import { TwoFactorBackupCode } from '../entities/two-factor-backup-code.entity';
import { TwoFactorAuditLog, TwoFactorAuditAction } from '../entities/two-factor-audit-log.entity';
import { EncryptionService } from './utils/encryption.service';
import { TOTPService } from './utils/totp.service';
import { BackupCodeService } from './utils/backup-codes.service';
import { Redis2FAService } from './utils/redis-2fa.service';
import * as bcrypt from 'bcryptjs';

/**
 * Service responsible for Two-Factor Authentication operations
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly encryptionService: EncryptionService;
  private readonly totpService: TOTPService;
  private readonly backupCodeService: BackupCodeService;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TwoFactorAuth)
    private readonly twoFactorAuthRepository: Repository<TwoFactorAuth>,
    @InjectRepository(TwoFactorBackupCode)
    private readonly backupCodeRepository: Repository<TwoFactorBackupCode>,
    @InjectRepository(TwoFactorAuditLog)
    private readonly auditLogRepository: Repository<TwoFactorAuditLog>,
    private readonly redis2FAService: Redis2FAService,
    private readonly configService: ConfigService,
  ) {
    const encryptionKey = this.configService.get<string>('TWO_FACTOR_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('TWO_FACTOR_ENCRYPTION_KEY is not configured');
    }

    // If the key is not already base64, encode it
    let base64Key = encryptionKey;
    try {
      // Try to decode to check if it's valid base64
      Buffer.from(encryptionKey, 'base64');
    } catch {
      // If not valid base64, encode it
      base64Key = Buffer.from(encryptionKey).toString('base64');
    }

    this.encryptionService = new EncryptionService(base64Key);
    this.totpService = new TOTPService();
    this.backupCodeService = new BackupCodeService();
  }

  /**
   * Generate TOTP secret and QR code for 2FA setup
   * @param userId - User ID
   * @returns Setup data including QR code and setup token
   */
  async setup(userId: string): Promise<{
    qrCode: string;
    manualEntryKey: string;
    setupToken: string;
  }> {
    this.logger.log(`Setting up 2FA for user ${userId}`);

    // Check if 2FA is already enabled
    const existingAuth = await this.twoFactorAuthRepository.findOne({
      where: { userId, isEnabled: true },
    });

    if (existingAuth) {
      throw new ConflictException('Two-factor authentication is already enabled');
    }

    // Get user for email
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate TOTP secret
    const issuer = this.configService.get<string>('TWO_FACTOR_ISSUER', 'MyCrypto Exchange');
    const { secret, qrCode, manualEntryKey } = await this.totpService.generateSecret(
      user.email,
      issuer,
    );

    // Store setup data in Redis temporarily
    const setupToken = await this.redis2FAService.storeSetupToken(userId, { secret });

    // Log setup initiation
    await this.logAuditEvent(userId, 'setup_initiated', 'success');

    return {
      qrCode,
      manualEntryKey,
      setupToken,
    };
  }

  /**
   * Verify setup code and enable 2FA
   * @param userId - User ID
   * @param setupToken - Setup token from initial setup
   * @param code - 6-digit TOTP code
   * @returns Backup codes
   */
  async verifySetup(
    userId: string,
    setupToken: string,
    code: string,
  ): Promise<{ backupCodes: string[] }> {
    this.logger.log(`Verifying 2FA setup for user ${userId}`);

    // Retrieve and validate setup data
    const setupData = await this.redis2FAService.getSetupData(userId, setupToken);
    if (!setupData) {
      await this.logAuditEvent(userId, 'setup_verify_failed', 'failed', { reason: 'Invalid setup token' });
      throw new BadRequestException('Invalid or expired setup token');
    }

    // Verify TOTP code
    const isValid = this.totpService.verifyToken(setupData.secret, code);
    if (!isValid) {
      await this.logAuditEvent(userId, 'setup_verify_failed', 'failed', { reason: 'Invalid code' });
      throw new BadRequestException('Invalid verification code');
    }

    // Encrypt the secret for storage
    const encryptedSecret = this.encryptionService.encrypt(setupData.secret);

    // Generate backup codes
    const backupCodes = this.backupCodeService.generateCodes();
    const hashedCodes = await this.backupCodeService.hashCodes(backupCodes);

    // Start transaction to save all data
    await this.userRepository.manager.transaction(async (manager) => {
      // Delete any existing incomplete 2FA setup
      await manager.delete(TwoFactorAuth, { userId });
      await manager.delete(TwoFactorBackupCode, { userId });

      // Save encrypted secret
      const twoFactorAuth = manager.create(TwoFactorAuth, {
        userId,
        secretEncrypted: encryptedSecret,
        isEnabled: true,
        verifiedAt: new Date(),
      });
      await manager.save(twoFactorAuth);

      // Save hashed backup codes
      const backupCodeEntities = hashedCodes.map((hash, index) =>
        manager.create(TwoFactorBackupCode, {
          userId,
          codeHash: hash,
          usedAt: null,
        }),
      );
      await manager.save(backupCodeEntities);
    });

    // Clear setup data from Redis
    await this.redis2FAService.clearSetupData(userId);

    // Log successful enablement
    await this.logAuditEvent(userId, 'enabled', 'success', {
      backupCodesGenerated: backupCodes.length,
    });

    return { backupCodes };
  }

  /**
   * Create a challenge token for 2FA login
   * @param userId - User ID
   * @returns Challenge token if 2FA is enabled
   */
  async createChallenge(userId: string): Promise<{ challengeToken: string; requires2FA: boolean }> {
    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactorAuth) {
      return { challengeToken: null, requires2FA: false };
    }

    const challengeToken = await this.redis2FAService.storeChallengeTokenWithLookup(userId);
    return { challengeToken, requires2FA: true };
  }

  /**
   * Verify 2FA challenge during login
   * @param challengeToken - Challenge token from login
   * @param code - TOTP or backup code
   * @returns User ID if successful
   */
  async verifyChallenge(challengeToken: string, code: string): Promise<{ userId: string }> {
    this.logger.log('Verifying 2FA challenge');

    // Get user ID from challenge token
    const userId = await this.redis2FAService.verifyChallengeToken(challengeToken);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired challenge token');
    }

    // Check if user is locked out
    if (await this.redis2FAService.isLockedOut(userId)) {
      await this.logAuditEvent(userId, 'verify_failed', 'failed', { reason: 'locked_out' });
      throw new UnauthorizedException('Too many failed attempts. Please try again later.');
    }

    // Get 2FA data
    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactorAuth) {
      throw new UnauthorizedException('Two-factor authentication is not enabled');
    }

    let verificationSuccessful = false;
    let verificationMethod: 'totp' | 'backup' = 'totp';

    // Check if it's a TOTP code (6 digits) or backup code (XXXX-XXXX)
    if (/^\d{6}$/.test(code)) {
      // Verify TOTP code
      const decryptedSecret = this.encryptionService.decrypt(twoFactorAuth.secretEncrypted);
      verificationSuccessful = this.totpService.verifyToken(decryptedSecret, code);
    } else if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      // Verify backup code
      verificationMethod = 'backup';
      const backupCodes = await this.backupCodeRepository.find({
        where: { userId, usedAt: null },
      });

      for (const backupCode of backupCodes) {
        if (await this.backupCodeService.verifyCode(code, backupCode.codeHash)) {
          // Mark backup code as used
          backupCode.usedAt = new Date();
          await this.backupCodeRepository.save(backupCode);
          verificationSuccessful = true;

          // Log backup code usage
          await this.logAuditEvent(userId, 'backup_used', 'success', {
            remainingCodes: backupCodes.filter((c) => !c.usedAt).length - 1,
          });
          break;
        }
      }
    }

    if (!verificationSuccessful) {
      // Increment failed attempts
      await this.redis2FAService.incrementFailedAttempts(userId);
      await this.logAuditEvent(userId, 'verify_failed', 'failed', {
        method: verificationMethod,
      });
      throw new UnauthorizedException('Invalid verification code');
    }

    // Clear failed attempts and challenge token on success
    await this.redis2FAService.clearFailedAttempts(userId);
    await this.redis2FAService.clearChallengeToken(userId, challengeToken);

    // Log successful verification
    await this.logAuditEvent(userId, 'verify_success', 'success', {
      method: verificationMethod,
    });

    return { userId };
  }

  /**
   * Regenerate backup codes
   * @param userId - User ID
   * @param password - Current password for verification
   * @returns New backup codes
   */
  async regenerateBackupCodes(userId: string, password: string): Promise<{ backupCodes: string[] }> {
    this.logger.log(`Regenerating backup codes for user ${userId}`);

    // Verify user password
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await this.logAuditEvent(userId, 'backup_regenerate_failed', 'failed', {
        reason: 'Invalid password',
      });
      throw new UnauthorizedException('Invalid password');
    }

    // Check if 2FA is enabled
    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Generate new backup codes
    const backupCodes = this.backupCodeService.generateCodes();
    const hashedCodes = await this.backupCodeService.hashCodes(backupCodes);

    // Replace old codes with new ones
    await this.backupCodeRepository.manager.transaction(async (manager) => {
      // Delete old backup codes
      await manager.delete(TwoFactorBackupCode, { userId });

      // Save new backup codes
      const backupCodeEntities = hashedCodes.map((hash) =>
        manager.create(TwoFactorBackupCode, {
          userId,
          codeHash: hash,
          usedAt: null,
        }),
      );
      await manager.save(backupCodeEntities);
    });

    // Log regeneration
    await this.logAuditEvent(userId, 'backup_regenerated', 'success', {
      codesGenerated: backupCodes.length,
    });

    return { backupCodes };
  }

  /**
   * Get 2FA status for a user
   * @param userId - User ID
   * @returns 2FA status information
   */
  async getStatus(userId: string): Promise<{
    isEnabled: boolean;
    enabledAt: string | null;
    backupCodesRemaining: number;
  }> {
    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return {
        isEnabled: false,
        enabledAt: null,
        backupCodesRemaining: 0,
      };
    }

    const unusedBackupCodes = await this.backupCodeRepository.count({
      where: { userId, usedAt: null },
    });

    return {
      isEnabled: true,
      enabledAt: twoFactorAuth.verifiedAt?.toISOString() || null,
      backupCodesRemaining: unusedBackupCodes,
    };
  }

  /**
   * Disable 2FA for a user
   * @param userId - User ID
   * @param password - Current password
   * @param code - TOTP or backup code for verification
   */
  async disable(userId: string, password: string, code: string): Promise<void> {
    this.logger.log(`Disabling 2FA for user ${userId}`);

    // Verify user password
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await this.logAuditEvent(userId, 'disable_failed', 'failed', { reason: 'Invalid password' });
      throw new UnauthorizedException('Invalid password');
    }

    // Get 2FA data
    const twoFactorAuth = await this.twoFactorAuthRepository.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify TOTP or backup code
    let verificationSuccessful = false;

    if (/^\d{6}$/.test(code)) {
      // Verify TOTP code
      const decryptedSecret = this.encryptionService.decrypt(twoFactorAuth.secretEncrypted);
      verificationSuccessful = this.totpService.verifyToken(decryptedSecret, code);
    } else if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      // Verify backup code
      const backupCodes = await this.backupCodeRepository.find({
        where: { userId, usedAt: null },
      });

      for (const backupCode of backupCodes) {
        if (await this.backupCodeService.verifyCode(code, backupCode.codeHash)) {
          verificationSuccessful = true;
          break;
        }
      }
    }

    if (!verificationSuccessful) {
      await this.logAuditEvent(userId, 'disable_failed', 'failed', { reason: 'Invalid code' });
      throw new UnauthorizedException('Invalid verification code');
    }

    // Delete 2FA data
    await this.twoFactorAuthRepository.manager.transaction(async (manager) => {
      await manager.delete(TwoFactorAuth, { userId });
      await manager.delete(TwoFactorBackupCode, { userId });
    });

    // Log successful disablement
    await this.logAuditEvent(userId, 'disabled', 'success');
  }

  /**
   * Log an audit event for 2FA operations
   * @param userId - User ID
   * @param action - Type of action
   * @param status - Status of the event
   * @param metadata - Additional metadata
   */
  private async logAuditEvent(
    userId: string,
    action: string,
    status: 'success' | 'failed',
    metadata?: any,
  ): Promise<void> {
    try {
      // Map string actions to enum values
      const actionMap: Record<string, TwoFactorAuditAction> = {
        'setup_initiated': TwoFactorAuditAction.SETUP,
        'setup_verify_failed': TwoFactorAuditAction.VERIFY_FAILED,
        'enabled': TwoFactorAuditAction.ENABLED,
        'disabled': TwoFactorAuditAction.DISABLED,
        'verify_success': TwoFactorAuditAction.VERIFY_SUCCESS,
        'verify_failed': TwoFactorAuditAction.VERIFY_FAILED,
        'backup_used': TwoFactorAuditAction.BACKUP_USED,
        'backup_regenerated': TwoFactorAuditAction.BACKUP_REGENERATED,
        'backup_regenerate_failed': TwoFactorAuditAction.VERIFY_FAILED,
        'disable_failed': TwoFactorAuditAction.VERIFY_FAILED,
      };

      const enumAction = actionMap[action] || TwoFactorAuditAction.VERIFY_FAILED;

      const auditLog = this.auditLogRepository.create({
        userId,
        action: enumAction,
        metadata,
      });
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to log audit event: ${error.message}`, error.stack);
    }
  }
}