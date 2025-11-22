import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * TwoFactorVerificationService
 * Verifies 2FA codes with auth-service for withdrawal requests
 *
 * Story 2.5: Crypto Withdrawal - Day 2
 * - Integrates with auth-service API
 * - Rate limiting on verification attempts
 * - Graceful degradation when auth-service unavailable
 */

export interface TwoFactorVerificationResult {
  isValid: boolean;
  error?: string;
}

@Injectable()
export class TwoFactorVerificationService {
  private readonly logger = new Logger(TwoFactorVerificationService.name);
  private readonly authServiceUrl: string;
  private readonly maxAttempts: number;
  private readonly attemptWindowMinutes: number;

  // In-memory rate limiting (production should use Redis)
  private attemptTracker = new Map<string, { count: number; resetAt: Date }>();

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.authServiceUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') ||
      'http://auth-service:3001';
    this.maxAttempts =
      parseInt(this.configService.get<string>('TWO_FA_MAX_ATTEMPTS')) || 5;
    this.attemptWindowMinutes =
      parseInt(
        this.configService.get<string>('TWO_FA_ATTEMPT_WINDOW_MINUTES'),
      ) || 5;
  }

  /**
   * Verify 2FA code with auth-service
   * Includes rate limiting to prevent brute force attacks
   *
   * @param userId - User ID
   * @param code - 6-digit 2FA code
   * @returns TwoFactorVerificationResult
   */
  async verify2FACode(
    userId: string,
    code: string,
  ): Promise<TwoFactorVerificationResult> {
    this.logger.log({
      message: '2FA verification requested',
      userId,
    });

    // Check rate limiting
    if (this.isRateLimited(userId)) {
      this.logger.warn({
        message: '2FA verification rate limited',
        userId,
      });
      return {
        isValid: false,
        error: 'Too many failed attempts. Please try again later.',
      };
    }

    // Validate code format
    if (!code || !/^\d{6}$/.test(code)) {
      this.trackAttempt(userId);
      return {
        isValid: false,
        error: '2FA code must be 6 digits',
      };
    }

    // Call auth-service
    try {
      const isValid = await this.callAuthService(userId, code);

      if (isValid) {
        // Clear rate limit tracker on success
        this.attemptTracker.delete(userId);

        this.logger.log({
          message: '2FA verification successful',
          userId,
        });

        return { isValid: true };
      } else {
        // Track failed attempt
        this.trackAttempt(userId);

        this.logger.warn({
          message: '2FA verification failed - invalid code',
          userId,
        });

        return {
          isValid: false,
          error: 'Invalid 2FA code',
        };
      }
    } catch (error) {
      this.logger.error({
        message: '2FA verification error',
        userId,
        error: error.message,
        stack: error.stack,
      });

      // Graceful degradation
      const allowOnFailure =
        this.configService.get<string>('TWO_FA_ALLOW_ON_SERVICE_FAILURE') ===
        'true';

      if (allowOnFailure && process.env.NODE_ENV === 'development') {
        this.logger.warn({
          message: '2FA service unavailable, allowing in development mode',
          userId,
        });
        return { isValid: true };
      }

      throw new HttpException(
        '2FA verification service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Call auth-service API to verify TOTP code
   * @private
   */
  private async callAuthService(
    userId: string,
    code: string,
  ): Promise<boolean> {
    // For development/testing when auth-service is not running
    if (process.env.NODE_ENV === 'test') {
      // Accept "123456" as valid code in tests
      return code === '123456';
    }

    const endpoint = `${this.authServiceUrl}/api/v1/auth/2fa/verify`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          endpoint,
          {
            userId,
            code,
          },
          {
            timeout: 5000, // 5 second timeout
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.valid === true;
    } catch (error) {
      // If auth service returns 401/400, code is invalid
      if (error.response?.status === 401 || error.response?.status === 400) {
        return false;
      }

      // For other errors (503, timeout, etc), throw to trigger graceful degradation
      throw error;
    }
  }

  /**
   * Check if user is rate limited
   * @private
   */
  private isRateLimited(userId: string): boolean {
    const tracker = this.attemptTracker.get(userId);

    if (!tracker) {
      return false;
    }

    // Check if rate limit window has expired
    if (new Date() > tracker.resetAt) {
      this.attemptTracker.delete(userId);
      return false;
    }

    // Check if max attempts exceeded
    return tracker.count >= this.maxAttempts;
  }

  /**
   * Track failed 2FA attempt
   * @private
   */
  private trackAttempt(userId: string): void {
    const tracker = this.attemptTracker.get(userId);
    const now = new Date();

    if (!tracker || now > tracker.resetAt) {
      // Start new tracking window
      const resetAt = new Date(
        now.getTime() + this.attemptWindowMinutes * 60 * 1000,
      );
      this.attemptTracker.set(userId, { count: 1, resetAt });
    } else {
      // Increment count in current window
      tracker.count++;
    }

    const currentTracker = this.attemptTracker.get(userId);
    this.logger.debug({
      message: '2FA attempt tracked',
      userId,
      attemptCount: currentTracker.count,
      resetAt: currentTracker.resetAt,
    });
  }

  /**
   * Clear rate limit for user (for testing or admin override)
   */
  clearRateLimit(userId: string): void {
    this.attemptTracker.delete(userId);
    this.logger.log({
      message: '2FA rate limit cleared',
      userId,
    });
  }

  /**
   * Get remaining attempts before rate limit
   */
  getRemainingAttempts(userId: string): number {
    const tracker = this.attemptTracker.get(userId);

    if (!tracker || new Date() > tracker.resetAt) {
      return this.maxAttempts;
    }

    return Math.max(0, this.maxAttempts - tracker.count);
  }
}
