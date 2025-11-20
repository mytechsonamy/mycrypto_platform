/**
 * Two-Factor Authentication Interfaces
 * Defines contracts for 2FA operations
 */

/**
 * Response structure for 2FA setup initialization
 */
export interface TwoFactorSetupResponse {
  /**
   * QR code as data URL for scanning with authenticator apps
   */
  qrCode: string;

  /**
   * Manual entry key for authenticator apps
   */
  manualEntryKey: string;

  /**
   * Array of single-use backup codes
   */
  backupCodes: string[];

  /**
   * Temporary token to validate setup completion
   */
  setupToken: string;
}

/**
 * Response structure for 2FA validation during login
 */
export interface TwoFactorValidationResponse {
  /**
   * JWT access token
   */
  accessToken: string;

  /**
   * JWT refresh token
   */
  refreshToken: string;

  /**
   * Token expiry time in seconds
   */
  expiresIn: number;
}

/**
 * Partial authentication response when 2FA is required
 */
export interface PartialAuthResponse {
  /**
   * Indicates that 2FA is required
   */
  requires2FA: true;

  /**
   * Partial JWT token for 2FA validation
   */
  partialToken: string;

  /**
   * Message for the user
   */
  message: string;
}

/**
 * Structure for storing backup codes
 */
export interface BackupCode {
  /**
   * The hashed backup code
   */
  code: string;

  /**
   * Whether the code has been used
   */
  used: boolean;

  /**
   * When the code was used (null if unused)
   */
  usedAt: Date | null;
}

/**
 * 2FA event for audit logging
 */
export interface TwoFactorEvent {
  /**
   * Type of 2FA event
   */
  eventType: TwoFactorEventType;

  /**
   * User ID associated with the event
   */
  userId: string;

  /**
   * IP address of the request
   */
  ipAddress: string;

  /**
   * User agent string
   */
  userAgent: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;

  /**
   * Timestamp of the event
   */
  timestamp: Date;
}

/**
 * Types of 2FA events for logging
 */
export enum TwoFactorEventType {
  SETUP_INITIATED = '2fa.setup.initiated',
  SETUP_COMPLETED = '2fa.setup.completed',
  VERIFICATION_SUCCESS = '2fa.verification.success',
  VERIFICATION_FAILED = '2fa.verification.failed',
  DISABLED = '2fa.disabled',
  BACKUP_CODE_USED = '2fa.backup_code.used',
  BACKUP_CODES_REGENERATED = '2fa.backup_codes.regenerated',
  RATE_LIMIT_EXCEEDED = '2fa.rate_limit.exceeded',
}

/**
 * Configuration options for TOTP generation
 */
export interface TOTPConfig {
  /**
   * Issuer name displayed in authenticator apps
   */
  issuer: string;

  /**
   * Algorithm for TOTP (SHA1, SHA256, SHA512)
   */
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';

  /**
   * Number of digits in the OTP
   */
  digits: number;

  /**
   * Time period in seconds
   */
  period: number;

  /**
   * Time window for validation (number of periods)
   */
  window: number;
}

/**
 * Service interface for Two-Factor Authentication operations
 */
export interface ITwoFactorService {
  /**
   * Generate a new TOTP secret and setup data for a user
   * @param userId - The user's ID
   * @param email - The user's email for labeling
   * @returns Setup response with QR code and backup codes
   */
  generateSecret(userId: string, email: string): Promise<TwoFactorSetupResponse>;

  /**
   * Verify a TOTP code and enable 2FA for a user
   * @param userId - The user's ID
   * @param code - The TOTP code to verify
   * @param setupToken - The temporary setup token
   * @throws Error if verification fails
   */
  verifyAndEnable(userId: string, code: string, setupToken: string): Promise<void>;

  /**
   * Validate a TOTP or backup code during login
   * @param userId - The user's ID
   * @param code - The TOTP or backup code
   * @returns true if valid, false otherwise
   */
  validateCode(userId: string, code: string): Promise<boolean>;

  /**
   * Generate new backup codes for a user
   * @param userId - The user's ID
   * @returns Array of new backup codes
   */
  generateBackupCodes(userId: string): Promise<string[]>;

  /**
   * Disable 2FA for a user
   * @param userId - The user's ID
   * @param code - Current TOTP code for verification
   * @throws Error if code is invalid
   */
  disableTwoFactor(userId: string, code: string): Promise<void>;

  /**
   * Get the remaining number of unused backup codes
   * @param userId - The user's ID
   * @returns Number of unused backup codes
   */
  getRemainingBackupCodes(userId: string): Promise<number>;

  /**
   * Check if a user has 2FA enabled
   * @param userId - The user's ID
   * @returns true if 2FA is enabled
   */
  isEnabled(userId: string): Promise<boolean>;

  /**
   * Log a 2FA event for audit purposes
   * @param event - The event to log
   */
  logEvent(event: TwoFactorEvent): Promise<void>;
}

/**
 * Error codes specific to 2FA operations
 */
export enum TwoFactorErrorCode {
  ALREADY_ENABLED = '2FA_ALREADY_ENABLED',
  NOT_ENABLED = '2FA_NOT_ENABLED',
  INVALID_CODE = 'INVALID_2FA_CODE',
  CODE_EXPIRED = '2FA_CODE_EXPIRED',
  INVALID_SETUP_TOKEN = 'INVALID_SETUP_TOKEN',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  BACKUP_CODE_USED = 'BACKUP_CODE_USED',
  NO_BACKUP_CODES_LEFT = 'NO_BACKUP_CODES_LEFT',
}

/**
 * Custom error class for 2FA operations
 */
export class TwoFactorError extends Error {
  constructor(
    public readonly code: TwoFactorErrorCode,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'TwoFactorError';
  }
}