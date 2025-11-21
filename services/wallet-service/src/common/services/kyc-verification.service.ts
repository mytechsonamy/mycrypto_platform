import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface KycStatus {
  hasKyc: boolean;
  level: string;
  status: string;
}

/**
 * KYC Verification Service
 * Communicates with auth-service to verify user KYC status
 */
@Injectable()
export class KycVerificationService {
  private readonly logger = new Logger(KycVerificationService.name);
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>(
      'AUTH_SERVICE_URL',
      'http://auth-service:3001',
    );
  }

  /**
   * Check if user has approved KYC (Level 1 or higher)
   * @param userId - User ID
   * @param authToken - JWT token for auth-service API call
   * @returns KYC status
   */
  async verifyKycApproved(userId: string, authToken: string): Promise<KycStatus> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/auth/kyc/status`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          timeout: 5000,
        }),
      );

      const data = response.data;

      this.logger.log({
        message: 'KYC status retrieved',
        user_id: userId,
        has_kyc: !!data.submissionId,
        status: data.status,
      });

      return {
        hasKyc: !!data.submissionId,
        level: data.level || 'NONE',
        status: data.status || 'NOT_SUBMITTED',
      };
    } catch (error: any) {
      this.logger.warn({
        message: 'Failed to verify KYC status',
        user_id: userId,
        error: error.message,
      });

      // If auth-service is unavailable, allow operation but log warning
      // In production, this should be more strict
      return {
        hasKyc: false,
        level: 'NONE',
        status: 'UNKNOWN',
      };
    }
  }

  /**
   * Require KYC Level 1 approval before allowing crypto operations
   * @param userId - User ID
   * @param authToken - JWT token
   * @throws ForbiddenException if KYC not approved
   */
  async requireKycLevel1(userId: string, authToken: string): Promise<void> {
    const kycStatus = await this.verifyKycApproved(userId, authToken);

    if (!kycStatus.hasKyc || kycStatus.status !== 'APPROVED') {
      this.logger.warn({
        message: 'KYC verification failed - crypto deposit not allowed',
        user_id: userId,
        kyc_status: kycStatus.status,
      });

      throw new ForbiddenException({
        error: 'KYC_REQUIRED',
        message: 'KYC Level 1 approval required for crypto deposits',
        details: {
          hasKyc: kycStatus.hasKyc,
          status: kycStatus.status,
          requiredLevel: 'LEVEL_1',
          requiredStatus: 'APPROVED',
        },
      });
    }

    this.logger.log({
      message: 'KYC verification passed',
      user_id: userId,
      level: kycStatus.level,
    });
  }
}
