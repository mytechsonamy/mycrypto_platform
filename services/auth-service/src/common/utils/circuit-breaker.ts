import { Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening (default: 3)
  resetTimeout?: number; // Time in ms before attempting half-open (default: 60000 = 1 minute)
  monitoringPeriod?: number; // Time window for counting failures (default: 60000 = 1 minute)
  name?: string; // Name for logging
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private readonly logger: Logger;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly monitoringPeriod: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 1 minute
    this.name = options.name || 'CircuitBreaker';
    this.logger = new Logger(this.name);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now < this.nextAttemptTime) {
        this.logger.warn(`Circuit ${this.name} is OPEN. Skipping execution.`);
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      } else {
        // Attempt to transition to HALF_OPEN
        this.state = CircuitState.HALF_OPEN;
        this.logger.log(`Circuit ${this.name} transitioning to HALF_OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Record successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.logger.log(`Circuit ${this.name} closed after successful execution`);
    }
  }

  /**
   * Record failed execution
   */
  private onFailure(): void {
    const now = Date.now();

    // Reset failure count if monitoring period has passed
    if (this.lastFailureTime && (now - this.lastFailureTime) > this.monitoringPeriod) {
      this.failureCount = 0;
    }

    this.failureCount++;
    this.lastFailureTime = now;

    this.logger.warn(`Circuit ${this.name} failure count: ${this.failureCount}/${this.failureThreshold}`);

    // Open circuit if threshold reached
    if (this.failureCount >= this.failureThreshold || this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.resetTimeout;
      this.logger.error(
        `Circuit ${this.name} OPENED. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`
      );
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN && Date.now() < this.nextAttemptTime;
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.logger.log(`Circuit ${this.name} manually reset`);
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null,
    };
  }
}
