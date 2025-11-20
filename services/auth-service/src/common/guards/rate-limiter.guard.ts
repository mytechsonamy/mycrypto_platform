import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisService } from '../services/redis.service';
import { ConfigurableRateLimitOptions, CONFIGURABLE_RATE_LIMIT_KEY } from '../decorators/configurable-rate-limit.decorator';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  keyPrefix: string;
}

export const RATE_LIMIT_KEY = 'rateLimit';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Get rate limit options from decorator or use defaults
    let rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // Check for configurable rate limit options
    if (!rateLimitOptions) {
      const configurableOptions = this.reflector.get<ConfigurableRateLimitOptions>(
        CONFIGURABLE_RATE_LIMIT_KEY,
        context.getHandler(),
      );

      if (configurableOptions) {
        // Build rate limit options from environment variables
        const limit = this.configService.get<number>(
          configurableOptions.limitConfigKey,
          configurableOptions.defaultLimit || 5,
        );
        const windowMs = this.configService.get<number>(
          configurableOptions.windowConfigKey,
          configurableOptions.defaultWindowMs || 3600000,
        );

        rateLimitOptions = {
          limit,
          windowMs,
          keyPrefix: configurableOptions.keyPrefix,
        };
      }
    }

    if (!rateLimitOptions) {
      // No rate limiting configured for this endpoint
      return true;
    }

    // Extract client IP
    const ip = this.getClientIp(request);

    // Check if IP is whitelisted
    const isWhitelisted = await this.redisService.isWhitelisted(ip);
    if (isWhitelisted) {
      return true;
    }

    // Create rate limit key
    const key = `${rateLimitOptions.keyPrefix}:${ip}`;

    // Check rate limit using sliding window
    const result = await this.redisService.slidingWindowRateLimit(
      key,
      rateLimitOptions.limit,
      rateLimitOptions.windowMs,
    );

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitOptions.limit - result.count));

    // Safely calculate reset time
    const resetTime = Date.now() + (rateLimitOptions.windowMs || 3600000);
    response.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());

    if (!result.allowed) {
      // Set Retry-After header
      response.setHeader('Retry-After', result.retryAfter || Math.ceil(rateLimitOptions.windowMs / 1000));

      // Throw rate limit exceeded error
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.',
            retry_after: result.retryAfter || Math.ceil(rateLimitOptions.windowMs / 1000),
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: `req_${this.generateRequestId()}`,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Extract client IP from request
   */
  private getClientIp(request: Request): string {
    // Check for forwarded IPs (when behind proxy/load balancer)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    // Check for real IP header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to socket remote address
    return request.socket.remoteAddress || request.ip || 'unknown';
  }

  /**
   * Generate a random request ID
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}