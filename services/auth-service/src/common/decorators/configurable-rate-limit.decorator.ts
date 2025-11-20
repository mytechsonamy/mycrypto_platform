import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY } from '../guards/rate-limiter.guard';

/**
 * Configurable rate limit decorator that uses environment variables
 * @param configKeys Object with config keys for limit and window
 * @param keyPrefix Redis key prefix for this rate limit
 */
export interface ConfigurableRateLimitOptions {
  limitConfigKey: string;
  windowConfigKey: string;
  keyPrefix: string;
  defaultLimit?: number;
  defaultWindowMs?: number;
}

export const CONFIGURABLE_RATE_LIMIT_KEY = 'configurableRateLimit';

export const ConfigurableRateLimit = (options: ConfigurableRateLimitOptions): MethodDecorator => {
  return SetMetadata(CONFIGURABLE_RATE_LIMIT_KEY, options);
};