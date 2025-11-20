import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface MksVerificationRequest {
  tcKimlikNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD format
}

export interface MksVerificationResponse {
  success: boolean;
  verified: boolean;
  verificationId?: string;
  message?: string;
  details?: any;
}

/**
 * MKS (Merkezi Kayıt Kuruluşu) API Service
 *
 * Integrates with Turkish government's Central Registration System (NVI)
 * to verify Turkish ID numbers (TC Kimlik No) against citizen records.
 *
 * In development: Returns mock responses
 * In production: Calls real MKS/NVI API
 */
@Injectable()
export class MksService {
  private readonly logger = new Logger(MksService.name);
  private readonly mksApiUrl: string;
  private readonly mksApiKey: string;
  private readonly mockMode: boolean;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.mksApiUrl = this.configService.get<string>(
      'MKS_API_URL',
      'https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx',
    );
    this.mksApiKey = this.configService.get<string>('MKS_API_KEY', '');
    this.mockMode = this.configService.get<boolean>('MKS_MOCK_MODE', true);

    if (this.mockMode) {
      this.logger.warn('MKS service running in MOCK MODE - using simulated responses');
    } else {
      this.logger.log(`MKS service initialized with API: ${this.mksApiUrl}`);
    }
  }

  /**
   * Verify Turkish ID against government records
   * @param request - TC Kimlik verification request
   * @returns Verification result
   */
  async verify(request: MksVerificationRequest): Promise<MksVerificationResponse> {
    this.logger.log(
      `Verifying TC Kimlik: ${request.tcKimlikNo} for ${request.firstName} ${request.lastName}`,
    );

    // Mock mode for development
    if (this.mockMode) {
      return this.mockVerify(request);
    }

    // Real MKS API call (production)
    try {
      const response = await this.callMksApi(request);
      return response;
    } catch (error) {
      this.logger.error(`MKS API verification failed: ${error.message}`, error.stack);

      return {
        success: false,
        verified: false,
        message: 'Kimlik doğrulama servisi geçici olarak kullanılamıyor',
        details: { error: error.message },
      };
    }
  }

  /**
   * Mock verification for development/testing
   * @param request - Verification request
   * @returns Mock response
   */
  private mockVerify(request: MksVerificationRequest): Promise<MksVerificationResponse> {
    this.logger.log(`[MOCK] Verifying TC Kimlik: ${request.tcKimlikNo}`);

    // Test TC Kimlik numbers that should pass (only valid checksums)
    const validTestIds = [
      '10000000146',
      '11111111110',
    ];

    const isValidTestId = validTestIds.includes(request.tcKimlikNo);

    // Simulate API delay
    const randomDelay = Math.random() * 1000 + 500; // 500-1500ms

    return new Promise<MksVerificationResponse>((resolve) => {
      setTimeout(() => {
        if (isValidTestId) {
          // Successful verification
          resolve({
            success: true,
            verified: true,
            verificationId: `MKS-MOCK-${Date.now()}-${request.tcKimlikNo.slice(0, 5)}`,
            message: 'Kimlik bilgileri doğrulandı',
            details: {
              tcKimlikNo: request.tcKimlikNo,
              firstName: request.firstName,
              lastName: request.lastName,
              dateOfBirth: request.dateOfBirth,
              verifiedAt: new Date().toISOString(),
              mock: true,
            },
          });
        } else {
          // Failed verification (name/DOB mismatch or invalid ID)
          resolve({
            success: true,
            verified: false,
            message: 'Kimlik bilgileri eşleşmiyor veya kayıt bulunamadı',
            details: {
              tcKimlikNo: request.tcKimlikNo,
              reason: 'Name or date of birth mismatch',
              mock: true,
            },
          });
        }
      }, randomDelay);
    });
  }

  /**
   * Call real MKS/NVI API (production)
   * @param request - Verification request
   * @returns API response
   */
  private async callMksApi(request: MksVerificationRequest): Promise<MksVerificationResponse> {
    try {
      // MKS/NVI API uses SOAP protocol
      // This is a simplified implementation - actual API requires XML SOAP requests

      const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>${request.tcKimlikNo}</TCKimlikNo>
      <Ad>${request.firstName.toUpperCase()}</Ad>
      <Soyad>${request.lastName.toUpperCase()}</Soyad>
      <DogumYili>${new Date(request.dateOfBirth).getFullYear()}</DogumYili>
    </TCKimlikNoDogrula>
  </soap:Body>
</soap:Envelope>`;

      const response = await firstValueFrom(
        this.httpService.post(this.mksApiUrl, soapRequest, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula',
          },
          timeout: 10000, // 10 seconds
        }),
      );

      // Parse SOAP response (simplified)
      const isVerified = response.data.includes('<TCKimlikNoDogrulaResult>true</TCKimlikNoDogrulaResult>');

      if (isVerified) {
        return {
          success: true,
          verified: true,
          verificationId: `MKS-${Date.now()}-${request.tcKimlikNo.slice(0, 5)}`,
          message: 'Kimlik bilgileri doğrulandı',
        };
      } else {
        return {
          success: true,
          verified: false,
          message: 'Kimlik bilgileri eşleşmiyor',
        };
      }
    } catch (error) {
      this.logger.error(`MKS API call failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if MKS service is available
   * @returns true if available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    if (this.mockMode) {
      return true; // Mock mode is always available
    }

    try {
      // Try to ping the MKS API
      const response = await firstValueFrom(
        this.httpService.get(this.mksApiUrl, { timeout: 5000 }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(`MKS service is not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Get test TC Kimlik numbers for development
   * @returns Array of valid test IDs
   */
  getTestIds(): string[] {
    return [
      '10000000146',
      '11111111110',
    ];
  }
}
