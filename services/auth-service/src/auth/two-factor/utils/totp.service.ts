import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

/**
 * Service for generating and verifying TOTP codes
 */
@Injectable()
export class TOTPService {
  /**
   * Generate new TOTP secret and QR code
   * @param email - User's email address
   * @param issuer - Application issuer name
   * @returns Object containing secret, QR code data URL, and manual entry key
   */
  async generateSecret(
    email: string,
    issuer: string,
  ): Promise<{
    secret: string;
    qrCode: string;
    manualEntryKey: string;
    provisioningUri: string;
  }> {
    const secret = speakeasy.generateSecret({
      name: `${issuer} (${email})`,
      issuer: issuer,
      length: 32, // 256-bit secret
    });

    // Generate QR code as data URL
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32, // Base32 encoded secret
      qrCode: qrCode,
      manualEntryKey: secret.base32, // For manual entry
      provisioningUri: secret.otpauth_url,
    };
  }

  /**
   * Verify TOTP code with ±1 time window tolerance
   * @param secret - Base32 encoded secret
   * @param token - 6-digit TOTP code
   * @returns True if token is valid
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1, // Allow ±1 time window (±30 seconds)
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate current TOTP code (for testing)
   * @param secret - Base32 encoded secret
   * @returns Current 6-digit TOTP code
   */
  generateToken(secret: string): string {
    return speakeasy.totp({
      secret: secret,
      encoding: 'base32',
    });
  }

  /**
   * Get provisioning URI for manual entry
   * @param email - User's email address
   * @param secret - Base32 encoded secret
   * @param issuer - Application issuer name
   * @returns Provisioning URI string
   */
  getProvisioningUri(email: string, secret: string, issuer: string): string {
    return speakeasy.otpauthURL({
      secret: secret,
      label: email,
      issuer: issuer,
      encoding: 'base32',
    });
  }
}