import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../guards/rate-limiter.guard';

/**
 * Custom rate limit decorator for endpoints
 * @param limit Maximum number of requests allowed
 * @param windowMs Time window in milliseconds
 * @param keyPrefix Redis key prefix for this rate limit
 */
export const RateLimit = (limit: number, windowMs: number, keyPrefix: string): MethodDecorator => {
  const options: RateLimitOptions = {
    limit,
    windowMs,
    keyPrefix,
  };
  return SetMetadata(RATE_LIMIT_KEY, options);
};