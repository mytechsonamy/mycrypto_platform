import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/services/redis.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly keyPrefix = 'token:blacklist:';

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Blacklist a JWT token
   * @param jti JWT ID from token
   * @param expiresIn Time in seconds until token expires
   * @param reason Optional reason for blacklisting
   */
  async blacklist(
    jti: string,
    expiresIn: number,
    reason: string = 'manual',
  ): Promise<void> {
    const key = `${this.keyPrefix}${jti}`;
    const value = JSON.stringify({
      revoked_at: new Date().toISOString(),
      reason,
    });

    try {
      const client = this.redisService.getClient();
      await client.setex(key, expiresIn, value);

      this.logger.log('Token blacklisted successfully', {
        jti,
        expires_in: expiresIn,
        reason,
      });
    } catch (error) {
      this.logger.error('Failed to blacklist token', {
        jti,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if a JWT token is blacklisted
   * @param jti JWT ID from token
   * @returns True if token is blacklisted
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    if (!jti) {
      return false;
    }

    const key = `${this.keyPrefix}${jti}`;

    try {
      const client = this.redisService.getClient();
      const exists = await client.exists(key);

      if (exists === 1) {
        this.logger.debug('Token found in blacklist', { jti });
      }

      return exists === 1;
    } catch (error) {
      this.logger.error('Failed to check token blacklist', {
        jti,
        error: error.message,
      });

      // In case of Redis failure, we should fail open (allow access)
      // to avoid blocking all users, but log this security event
      this.logger.warn('Redis unavailable - failing open for token check', {
        jti,
      });

      return false;
    }
  }

  /**
   * Blacklist all tokens for a specific user
   * @param userId User ID to blacklist all tokens for
   */
  async blacklistAllUserTokens(userId: string): Promise<void> {
    // Since we cannot enumerate all JWTs for a user (they're stateless),
    // we need to maintain a separate user-level blacklist
    // This will be checked in addition to individual token blacklists

    const userBlacklistKey = `${this.keyPrefix}user:${userId}`;
    const blacklistUntil = new Date();
    blacklistUntil.setDate(blacklistUntil.getDate() + 30); // 30 days max

    try {
      const client = this.redisService.getClient();

      // Store the timestamp after which tokens are invalid
      await client.setex(
        userBlacklistKey,
        30 * 24 * 60 * 60, // 30 days in seconds
        blacklistUntil.toISOString(),
      );

      this.logger.log('All user tokens blacklisted', {
        user_id: userId,
        blacklisted_until: blacklistUntil.toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to blacklist user tokens', {
        user_id: userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if a user's tokens issued before a certain time are blacklisted
   * @param userId User ID to check
   * @param tokenIssuedAt Token issued at timestamp
   * @returns True if user's old tokens are blacklisted
   */
  async isUserTokenBlacklisted(
    userId: string,
    tokenIssuedAt: Date,
  ): Promise<boolean> {
    const userBlacklistKey = `${this.keyPrefix}user:${userId}`;

    try {
      const client = this.redisService.getClient();
      const blacklistedAfter = await client.get(userBlacklistKey);

      if (!blacklistedAfter) {
        return false;
      }

      // If token was issued before the blacklist timestamp, it's invalid
      const blacklistDate = new Date(blacklistedAfter);
      return tokenIssuedAt < blacklistDate;
    } catch (error) {
      this.logger.error('Failed to check user token blacklist', {
        user_id: userId,
        error: error.message,
      });

      // Fail open for availability
      return false;
    }
  }

  /**
   * Blacklist a token by extracting JTI and calculating expiry
   * @param token JWT token string
   * @param reason Reason for blacklisting
   */
  async blacklistToken(token: string, reason: string = 'logout'): Promise<void> {
    try {
      // Decode token without verification (we just need the claims)
      const decoded = this.jwtService.decode(token) as any;

      if (!decoded || !decoded.jti) {
        this.logger.warn('Token does not contain JTI claim', {
          reason,
        });
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;

      if (expiresIn <= 0) {
        // Token already expired, no need to blacklist
        this.logger.debug('Token already expired, skipping blacklist', {
          jti: decoded.jti,
        });
        return;
      }

      await this.blacklist(decoded.jti, expiresIn, reason);
    } catch (error) {
      this.logger.error('Failed to blacklist token', {
        error: error.message,
        reason,
      });
      throw error;
    }
  }

  /**
   * Remove all blacklist entries for a user (for testing or admin purposes)
   * @param userId User ID to clear blacklist for
   */
  async clearUserBlacklist(userId: string): Promise<void> {
    const userBlacklistKey = `${this.keyPrefix}user:${userId}`;

    try {
      const client = this.redisService.getClient();
      await client.del(userBlacklistKey);

      this.logger.log('User blacklist cleared', {
        user_id: userId,
      });
    } catch (error) {
      this.logger.error('Failed to clear user blacklist', {
        user_id: userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get blacklist statistics (for monitoring)
   */
  async getBlacklistStats(): Promise<{
    totalBlacklistedTokens: number;
    totalBlacklistedUsers: number;
  }> {
    try {
      const client = this.redisService.getClient();

      // Count individual blacklisted tokens
      const tokenKeys = await client.keys(`${this.keyPrefix}[!user:]*`);
      const userKeys = await client.keys(`${this.keyPrefix}user:*`);

      return {
        totalBlacklistedTokens: tokenKeys.length,
        totalBlacklistedUsers: userKeys.length,
      };
    } catch (error) {
      this.logger.error('Failed to get blacklist stats', {
        error: error.message,
      });

      return {
        totalBlacklistedTokens: 0,
        totalBlacklistedUsers: 0,
      };
    }
  }
}