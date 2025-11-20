import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RecaptchaService } from '../services/recaptcha.service';

@Injectable()
export class RecaptchaGuard implements CanActivate {
  private readonly logger = new Logger(RecaptchaGuard.name);
  private readonly isTestEnvironment: boolean;

  constructor(
    private readonly recaptchaService: RecaptchaService,
    private readonly configService: ConfigService,
  ) {
    this.isTestEnvironment = this.configService.get<string>('NODE_ENV') === 'test';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip validation in test environment
    if (this.isTestEnvironment) {
      this.logger.debug('Skipping reCAPTCHA guard in test environment');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    // Get IP for logging purposes
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    if (!token) {
      this.logger.warn('reCAPTCHA token missing', {
        ip,
        userAgent,
        endpoint: request.path,
      });

      throw new ForbiddenException({
        success: false,
        error: {
          code: 'RECAPTCHA_FAILED',
          message: 'Bot algılandı. Lütfen tekrar deneyin.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: this.generateRequestId(),
        },
      });
    }

    try {
      const result = await this.recaptchaService.verify(token);

      // Check if verification was successful
      if (!result.success) {
        this.logger.warn('reCAPTCHA verification failed', {
          ip,
          userAgent,
          endpoint: request.path,
          errorCodes: result['error-codes'],
        });

        throw new ForbiddenException({
          success: false,
          error: {
            code: 'RECAPTCHA_FAILED',
            message: 'Bot algılandı. Lütfen tekrar deneyin.',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: this.generateRequestId(),
          },
        });
      }

      // Check score for v3 reCAPTCHA
      if (result.score !== undefined) {
        const isValidScore = this.recaptchaService.isScoreValid(result.score);

        if (!isValidScore) {
          this.logger.warn('reCAPTCHA score below threshold', {
            ip,
            userAgent,
            endpoint: request.path,
            score: result.score,
            threshold: this.recaptchaService.getScoreThreshold(),
            action: result.action,
            hostname: result.hostname,
          });

          throw new ForbiddenException({
            success: false,
            error: {
              code: 'RECAPTCHA_FAILED',
              message: 'Bot algılandı. Lütfen tekrar deneyin.',
            },
            meta: {
              timestamp: new Date().toISOString(),
              request_id: this.generateRequestId(),
            },
          });
        }

        // Log successful verification with score
        this.logger.log('reCAPTCHA verification successful', {
          ip,
          userAgent,
          endpoint: request.path,
          score: result.score,
          action: result.action,
          hostname: result.hostname,
        });
      } else {
        // Log successful verification for v2
        this.logger.log('reCAPTCHA v2 verification successful', {
          ip,
          userAgent,
          endpoint: request.path,
          hostname: result.hostname,
        });
      }

      // Store verification result in request for potential use in controller
      (request as any).recaptchaResult = result;

      return true;
    } catch (error) {
      // If it's already a ForbiddenException, rethrow it
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error('Unexpected error during reCAPTCHA verification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip,
        userAgent,
        endpoint: request.path,
      });

      // For unexpected errors, still throw ForbiddenException to prevent access
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'RECAPTCHA_FAILED',
          message: 'Bot algılandı. Lütfen tekrar deneyin.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: this.generateRequestId(),
        },
      });
    }
  }

  /**
   * Extract reCAPTCHA token from request headers
   * @param request - The HTTP request object
   * @returns The reCAPTCHA token or undefined
   */
  private extractToken(request: Request): string | undefined {
    // Check for token in header (X-Recaptcha-Token)
    const headerToken = request.headers['x-recaptcha-token'] as string;
    if (headerToken) {
      return headerToken;
    }

    // Fallback to check in body (for backwards compatibility)
    const bodyToken = (request.body as any)?.recaptchaToken;
    if (bodyToken) {
      return bodyToken;
    }

    return undefined;
  }

  /**
   * Generate a simple request ID for tracking
   * @returns A request ID string
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}