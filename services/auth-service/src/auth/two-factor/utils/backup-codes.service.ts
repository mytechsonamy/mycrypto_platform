import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

/**
 * Service for generating and verifying backup codes
 */
@Injectable()
export class BackupCodeService {
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly BCRYPT_ROUNDS = 10;

  /**
   * Generate backup codes in XXXX-XXXX format
   * @returns Array of 10 backup codes
   */
  generateCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const bytes = crypto.randomBytes(4);
      const hex = bytes.toString('hex').toUpperCase();
      const code = `${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash a backup code for storage
   * @param code - Plain text backup code
   * @returns Hashed backup code
   */
  async hashCode(code: string): Promise<string> {
    return bcrypt.hash(code, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify a backup code against hash
   * @param code - Plain text backup code
   * @param hash - Hashed backup code
   * @returns True if code matches hash
   */
  async verifyCode(code: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(code, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate hashes for storage
   * @param codes - Array of plain text backup codes
   * @returns Array of hashed backup codes
   */
  async hashCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((code) => this.hashCode(code)));
  }
}