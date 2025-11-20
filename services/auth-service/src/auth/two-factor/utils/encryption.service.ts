import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Service for encrypting and decrypting TOTP secrets using AES-256-GCM
 */
@Injectable()
export class EncryptionService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(keyBase64: string) {
    if (!keyBase64) {
      throw new Error('Encryption key is required');
    }
    this.encryptionKey = Buffer.from(keyBase64, 'base64');
  }

  /**
   * Encrypt TOTP secret using AES-256-GCM
   * @param plaintext - The plain text secret to encrypt
   * @returns Base64 encoded encrypted string
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine: iv (hex) + authTag (hex) + encrypted (hex)
      const combined = iv.toString('hex') + authTag.toString('hex') + encrypted;
      return Buffer.from(combined, 'hex').toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt TOTP secret using AES-256-GCM
   * @param ciphertext - The base64 encoded encrypted string
   * @returns Decrypted plain text secret
   */
  decrypt(ciphertext: string): string {
    try {
      const combined = Buffer.from(ciphertext, 'base64').toString('hex');

      // Extract: iv (32 chars = 16 bytes) + authTag (32 chars = 16 bytes) + encrypted
      const iv = Buffer.from(combined.substring(0, 32), 'hex');
      const authTag = Buffer.from(combined.substring(32, 64), 'hex');
      const encrypted = combined.substring(64);

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Constant-time comparison to prevent timing attacks
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    return crypto.timingSafeEqual(aBuffer, bBuffer);
  }
}