import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../common/services/redis.service';
import * as crypto from 'crypto';

/**
 * Service for managing 2FA data in Redis
 */
@Injectable()
export class Redis2FAService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Store temporary setup token with encrypted secret
   * @param userId - User ID
   * @param data - Setup data containing secret
   * @returns Setup token
   */
  async storeSetupToken(
    userId: string,
    data: { secret: string },
  ): Promise<string> {
    const setupToken = this.generateSecureToken();
    const key = `2fa:setup:${userId}`;
    const value = JSON.stringify({
      ...data,
      setupToken,
      createdAt: new Date().toISOString(),
    });

    await this.redisService.setEx(key, 900, value); // 15-minute TTL
    return setupToken;
  }

  /**
   * Retrieve setup data by user ID and validate token
   * @param userId - User ID
   * @param setupToken - Setup token to validate
   * @returns Setup data if valid, null otherwise
   */
  async getSetupData(
    userId: string,
    setupToken: string,
  ): Promise<{ secret: string; setupToken: string; createdAt: string } | null> {
    const key = `2fa:setup:${userId}`;
    const data = await this.redisService.get(key);

    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data);

    // Validate token matches
    if (parsed.setupToken !== setupToken) {
      return null;
    }

    return parsed;
  }

  /**
   * Clear setup data after successful verification
   * @param userId - User ID
   */
  async clearSetupData(userId: string): Promise<void> {
    const key = `2fa:setup:${userId}`;
    await this.redisService.del(key);
  }

  /**
   * Store challenge token for login
   * @param userId - User ID
   * @returns Challenge token
   */
  async storeChallengeToken(userId: string): Promise<string> {
    const challengeToken = this.generateSecureToken();
    const key = `2fa:challenge:${userId}`;
    const value = JSON.stringify({
      challengeToken,
      userId,
      createdAt: new Date().toISOString(),
    });

    await this.redisService.setEx(key, 300, value); // 5-minute TTL
    return challengeToken;
  }

  /**
   * Verify challenge token and get user ID
   * @param challengeToken - Challenge token to verify
   * @returns User ID if valid, null otherwise
   */
  async verifyChallengeToken(challengeToken: string): Promise<string | null> {
    // We need to search for the token, but for performance, we'll use a reverse lookup
    const key = `2fa:challenge:token:${challengeToken}`;
    const userId = await this.redisService.get(key);

    if (!userId) {
      return null;
    }

    // Verify the actual challenge data
    const challengeKey = `2fa:challenge:${userId}`;
    const data = await this.redisService.get(challengeKey);

    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data);
    if (parsed.challengeToken !== challengeToken) {
      return null;
    }

    return userId;
  }

  /**
   * Store challenge token with reverse lookup for better performance
   * @param userId - User ID
   * @returns Challenge token
   */
  async storeChallengeTokenWithLookup(userId: string): Promise<string> {
    const challengeToken = this.generateSecureToken();
    const key = `2fa:challenge:${userId}`;
    const reverseKey = `2fa:challenge:token:${challengeToken}`;

    const value = JSON.stringify({
      challengeToken,
      userId,
      createdAt: new Date().toISOString(),
    });

    // Store both the challenge and reverse lookup
    await this.redisService.setEx(key, 300, value); // 5-minute TTL
    await this.redisService.setEx(reverseKey, 300, userId); // 5-minute TTL for reverse lookup

    return challengeToken;
  }

  /**
   * Clear challenge token after successful verification
   * @param userId - User ID
   * @param challengeToken - Challenge token to clear
   */
  async clearChallengeToken(userId: string, challengeToken: string): Promise<void> {
    const key = `2fa:challenge:${userId}`;
    const reverseKey = `2fa:challenge:token:${challengeToken}`;
    await this.redisService.del(key);
    await this.redisService.del(reverseKey);
  }

  /**
   * Get failed attempt count
   * @param userId - User ID
   * @returns Number of failed attempts
   */
  async getFailedAttempts(userId: string): Promise<number> {
    const key = `2fa:attempts:${userId}`;
    const count = await this.redisService.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Increment failed attempts
   * @param userId - User ID
   * @returns New count of failed attempts
   */
  async incrementFailedAttempts(userId: string): Promise<number> {
    const key = `2fa:attempts:${userId}`;
    const count = await this.redisService.incr(key);

    // Set TTL on first increment
    if (count === 1) {
      await this.redisService.expire(key, 900); // 15-minute TTL
    }

    return count;
  }

  /**
   * Check if user is locked out (5 attempts)
   * @param userId - User ID
   * @returns True if locked out
   */
  async isLockedOut(userId: string): Promise<boolean> {
    const attempts = await this.getFailedAttempts(userId);
    return attempts >= 5;
  }

  /**
   * Clear failed attempts on successful verification
   * @param userId - User ID
   */
  async clearFailedAttempts(userId: string): Promise<void> {
    const key = `2fa:attempts:${userId}`;
    await this.redisService.del(key);
  }

  /**
   * Check IP-based rate limiting
   * @param ipAddress - IP address
   * @returns Count and whether IP is rate limited
   */
  async checkIPRateLimit(
    ipAddress: string,
  ): Promise<{ count: number; isLimited: boolean }> {
    const key = `2fa:attempts:ip:${ipAddress}`;
    const count = await this.redisService.incr(key);

    if (count === 1) {
      await this.redisService.expire(key, 3600); // 1-hour TTL
    }

    return {
      count,
      isLimited: count > 50, // 50 attempts per hour per IP
    };
  }

  /**
   * Generate a cryptographically secure token
   * @returns Secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}