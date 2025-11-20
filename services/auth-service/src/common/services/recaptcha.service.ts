import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
  private readonly secretKey: string;
  private readonly scoreThreshold: number;
  private readonly isTestEnvironment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY', '');
    this.scoreThreshold = parseFloat(
      this.configService.get<string>('RECAPTCHA_SCORE_THRESHOLD', '0.5')
    );
    this.isTestEnvironment = this.configService.get<string>('NODE_ENV') === 'test';
  }

  /**
   * Verify reCAPTCHA token with Google API
   * @param token - The reCAPTCHA token from the client
   * @returns Promise with verification result
   */
  async verify(token: string): Promise<RecaptchaResponse> {
    // Skip verification in test environment
    if (this.isTestEnvironment) {
      this.logger.debug('Skipping reCAPTCHA verification in test environment');
      return {
        success: true,
        score: 1.0,
        action: 'test',
        hostname: 'localhost',
      };
    }

    if (!token) {
      this.logger.warn('reCAPTCHA verification failed: No token provided');
      return {
        success: false,
        'error-codes': ['missing-input-response'],
      };
    }

    if (!this.secretKey) {
      this.logger.error('reCAPTCHA verification failed: No secret key configured');
      return {
        success: false,
        'error-codes': ['missing-input-secret'],
      };
    }

    try {
      const response = await axios.post<RecaptchaResponse>(
        this.verifyUrl,
        null,
        {
          params: {
            secret: this.secretKey,
            response: token,
          },
          timeout: 5000, // 5 second timeout
        }
      );

      const result = response.data;

      // Log verification attempt for monitoring
      this.logger.log('reCAPTCHA verification attempt', {
        success: result.success,
        score: result.score,
        action: result.action,
        hostname: result.hostname,
        errorCodes: result['error-codes'],
      });

      return result;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error('reCAPTCHA API request failed', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      } else {
        this.logger.error('Unexpected error during reCAPTCHA verification', error);
      }

      return {
        success: false,
        'error-codes': ['api-request-failed'],
      };
    }
  }

  /**
   * Check if the reCAPTCHA score meets the threshold
   * @param score - The reCAPTCHA score
   * @returns true if score meets threshold, false otherwise
   */
  isScoreValid(score: number | undefined): boolean {
    if (score === undefined) {
      return false;
    }
    return score >= this.scoreThreshold;
  }

  /**
   * Get the configured score threshold
   * @returns The score threshold value
   */
  getScoreThreshold(): number {
    return this.scoreThreshold;
  }
}