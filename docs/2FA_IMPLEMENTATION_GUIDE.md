# Two-Factor Authentication Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing 2FA in the Auth Service (BE-010 task). It covers the infrastructure that has been configured and what the backend team needs to implement.

## Pre-requisites
The following infrastructure has been configured for you:
- Redis 7 with 15-min and 5-min TTL configurations
- Encryption key: `sMF1I3Ol5Z2ZAybh9gnIIZMLb/VyZ2an+IzY7Y3y+ec=` (AES-256)
- Prometheus alert rules for 2FA monitoring
- Grafana dashboard for 2FA visualization
- Environment variables in docker-compose.yml

## Required NPM Packages

```json
{
  "dependencies": {
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "bcrypt": "^5.1.0",
    "crypto": "builtin"
  }
}
```

Install with:
```bash
npm install speakeasy qrcode bcrypt
```

## Implementation Steps

### Step 1: Encryption Utilities

Create `/src/auth/two-factor/utils/encryption.ts`:

```typescript
import crypto from 'crypto';

export class EncryptionService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly keyBase64: string) {
    this.encryptionKey = Buffer.from(keyBase64, 'base64');
  }

  /**
   * Encrypt TOTP secret
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
   * Decrypt TOTP secret
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
}
```

### Step 2: TOTP Utilities

Create `/src/auth/two-factor/utils/totp.ts`:

```typescript
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

export class TOTPService {
  /**
   * Generate new TOTP secret and QR code
   */
  async generateSecret(
    email: string,
    issuer: string
  ): Promise<{ secret: string; qrCode: string; manualEntryKey: string }> {
    const secret = speakeasy.generateSecret({
      name: `${issuer} (${email})`,
      issuer: issuer,
      length: 32, // Standard 256-bit secret
    });

    // Generate QR code as data URL
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32, // Base32 encoded secret
      qrCode: qrCode,
      manualEntryKey: secret.base32, // For manual entry
    };
  }

  /**
   * Verify TOTP code (with ±1 time window tolerance)
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1, // Allow ±1 time window (±30 seconds)
    });
  }

  /**
   * Get provisioning URI for manual entry
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
```

### Step 3: Backup Code Generation

Create `/src/auth/two-factor/utils/backup-codes.ts`:

```typescript
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export class BackupCodeService {
  /**
   * Generate 8 backup codes in XXXX-XXXX format
   */
  generateCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const bytes = crypto.randomBytes(4);
      const hex = bytes.toString('hex').toUpperCase();
      const code = `${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash a backup code for storage
   */
  async hashCode(code: string): Promise<string> {
    return bcrypt.hash(code, 10);
  }

  /**
   * Verify a backup code against hash
   */
  async verifyCode(code: string, hash: string): Promise<boolean> {
    return bcrypt.compare(code, hash);
  }

  /**
   * Generate hashes for storage
   */
  async hashCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map(code => this.hashCode(code)));
  }
}
```

### Step 4: Redis 2FA Operations

Create `/src/auth/two-factor/utils/redis-2fa.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@/common/services/redis.service';

@Injectable()
export class Redis2FAService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Store temporary setup token
   */
  async storeSetupToken(
    userId: string,
    data: { secret: string; backupCodes: string[] }
  ): Promise<string> {
    const setupToken = Math.random().toString(36).substring(2, 15);
    const key = `2fa:setup:${userId}`;
    const value = JSON.stringify({
      ...data,
      setupToken,
      createdAt: new Date().toISOString(),
    });

    await this.redisService.setEx(key, 900, value); // 15-minute TTL
    return setupToken;
  }

  /**
   * Retrieve setup data
   */
  async getSetupData(userId: string): Promise<any | null> {
    const key = `2fa:setup:${userId}`;
    const data = await this.redisService.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Clear setup data after successful verification
   */
  async clearSetupData(userId: string): Promise<void> {
    const key = `2fa:setup:${userId}`;
    await this.redisService.del(key);
  }

  /**
   * Store challenge token for login
   */
  async storeChallengeToken(userId: string): Promise<string> {
    const challengeToken = Math.random().toString(36).substring(2, 15);
    const key = `2fa:challenge:${userId}`;
    const value = JSON.stringify({
      challengeToken,
      createdAt: new Date().toISOString(),
    });

    await this.redisService.setEx(key, 300, value); // 5-minute TTL
    return challengeToken;
  }

  /**
   * Verify challenge token exists
   */
  async verifyChallengeToken(userId: string, token: string): Promise<boolean> {
    const key = `2fa:challenge:${userId}`;
    const data = await this.redisService.get(key);
    if (!data) return false;
    const parsed = JSON.parse(data);
    return parsed.challengeToken === token;
  }

  /**
   * Get failed attempt count
   */
  async getFailedAttempts(userId: string): Promise<number> {
    const key = `2fa:attempts:${userId}`;
    const count = await this.redisService.get(key);
    return count ? parseInt(count) : 0;
  }

  /**
   * Increment failed attempts
   */
  async incrementFailedAttempts(userId: string): Promise<number> {
    const key = `2fa:attempts:${userId}`;
    const count = await this.redisService.incr(key);

    // Set TTL on first increment
    if (count === 1) {
      await this.redisService.expire(key, 900); // 15-minute TTL
    }

    return count;
  }

  /**
   * Check if user is locked out
   */
  async isLockedOut(userId: string): Promise<boolean> {
    const attempts = await this.getFailedAttempts(userId);
    return attempts >= 5;
  }

  /**
   * Clear failed attempts (on success)
   */
  async clearFailedAttempts(userId: string): Promise<void> {
    const key = `2fa:attempts:${userId}`;
    await this.redisService.del(key);
  }

  /**
   * Check IP-based rate limiting
   */
  async checkIPRateLimit(ipAddress: string): Promise<{ count: number; isLimited: boolean }> {
    const key = `2fa:attempts:ip:${ipAddress}`;
    const count = await this.redisService.incr(key);

    if (count === 1) {
      await this.redisService.expire(key, 3600); // 1-hour TTL
    }

    return {
      count,
      isLimited: count > 50,
    };
  }
}
```

### Step 5: Prometheus Metrics Integration

Create `/src/auth/two-factor/utils/2fa-metrics.ts`:

```typescript
import { Counter, Histogram } from 'prom-client';

export class TwoFactorMetrics {
  // Setup metrics
  static setupTotal = new Counter({
    name: 'auth_2fa_setup_total',
    help: 'Total 2FA setup attempts',
    labelNames: ['status'],
  });

  static setupDuration = new Histogram({
    name: 'auth_2fa_setup_duration_seconds',
    help: 'Time to setup 2FA',
    buckets: [0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
  });

  // Verification during setup
  static verifyTotal = new Counter({
    name: 'auth_2fa_verify_total',
    help: 'TOTP code verification attempts',
    labelNames: ['status'],
  });

  // Validation during login
  static validateTotal = new Counter({
    name: 'auth_2fa_validate_total',
    help: 'Total 2FA validations during login',
    labelNames: ['status', 'method'],
  });

  static validateDuration = new Histogram({
    name: 'auth_2fa_validate_duration_seconds',
    help: 'Time to validate 2FA code',
    buckets: [0.01, 0.05, 0.1, 0.5, 1.0],
  });

  // Failed attempts
  static failedTotal = new Counter({
    name: 'auth_2fa_failed_total',
    help: 'Total failed 2FA attempts',
    labelNames: ['reason'],
  });

  static lockoutTotal = new Counter({
    name: 'auth_2fa_lockout_total',
    help: 'Total 2FA lockout events',
  });

  // Backup codes
  static backupUsedTotal = new Counter({
    name: 'auth_2fa_backup_used_total',
    help: 'Total backup codes used',
  });

  static backupExhaustedTotal = new Counter({
    name: 'auth_2fa_backup_exhausted_total',
    help: 'Total users who exhausted backup codes',
  });

  // Disable/Management
  static disabledTotal = new Counter({
    name: 'auth_2fa_disabled_total',
    help: 'Total 2FA disablements',
    labelNames: ['reason'],
  });

  // Errors
  static encryptionErrors = new Counter({
    name: 'auth_2fa_encryption_key_errors_total',
    help: 'Encryption/decryption errors',
    labelNames: ['operation', 'error'],
  });

  static redisErrors = new Counter({
    name: 'auth_2fa_redis_errors_total',
    help: 'Redis operation errors',
    labelNames: ['operation'],
  });

  static databaseErrors = new Counter({
    name: 'auth_2fa_database_errors_total',
    help: 'Database operation errors',
    labelNames: ['operation'],
  });
}
```

### Step 6: Implement TwoFactorService Methods

Update `/src/auth/two-factor/two-factor.service.ts` with actual implementations using the utilities above.

## Database Migrations

### Migration File
Create `/src/migrations/UpdateUsersTable2FA.ts`:

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateUsersTable2FA1699920000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'two_fa_enabled',
        type: 'boolean',
        default: false,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'two_fa_secret_encrypted',
        type: 'text',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'two_fa_enabled_at',
        type: 'timestamp',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'two_fa_disabled_at',
        type: 'timestamp',
        isNullable: true,
      })
    );

    // Create backup codes table
    await queryRunner.query(`
      CREATE TABLE two_fa_backup_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash VARCHAR(255) NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, code_hash)
      );

      CREATE INDEX idx_two_fa_backup_codes_user_id ON two_fa_backup_codes(user_id);
    `);

    // Create audit log table
    await queryRunner.query(`
      CREATE TABLE two_fa_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        status VARCHAR(50),
        error_code VARCHAR(50),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_two_fa_audit_user_id_created ON two_fa_audit_log(user_id, created_at);
      CREATE INDEX idx_two_fa_audit_event_type_created ON two_fa_audit_log(event_type, created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE two_fa_audit_log');
    await queryRunner.query('DROP TABLE two_fa_backup_codes');
    await queryRunner.dropColumn('users', 'two_fa_disabled_at');
    await queryRunner.dropColumn('users', 'two_fa_enabled_at');
    await queryRunner.dropColumn('users', 'two_fa_secret_encrypted');
    await queryRunner.dropColumn('users', 'two_fa_enabled');
  }
}
```

## Environment Variables Configured

These are already set in docker-compose.yml:
```bash
TWO_FACTOR_ENCRYPTION_KEY=sMF1I3Ol5Z2ZAybh9gnIIZMLb/VyZ2an+IzY7Y3y+ec=
TWO_FACTOR_ISSUER=MyCrypto Exchange
TWO_FACTOR_SETUP_EXPIRY=15m
TWO_FACTOR_CHALLENGE_EXPIRY=5m
TWO_FACTOR_MAX_ATTEMPTS=5
TWO_FACTOR_LOCKOUT_DURATION=15m
```

Load in your service:
```typescript
constructor(private configService: ConfigService) {
  this.encryptionService = new EncryptionService(
    configService.get('TWO_FACTOR_ENCRYPTION_KEY')
  );
}
```

## Testing Checklist

- [ ] TOTP secret generation works
- [ ] QR code generation is correct
- [ ] Backup code generation produces correct format
- [ ] Encryption/decryption roundtrip works
- [ ] Redis storage and retrieval works
- [ ] Rate limiting blocks after 5 attempts
- [ ] Challenge token TTL expires correctly
- [ ] Metrics are collected correctly
- [ ] Setup process works end-to-end
- [ ] Login validation works with TOTP codes
- [ ] Login validation works with backup codes
- [ ] Backup codes can only be used once
- [ ] Failed attempt counter resets on success
- [ ] Disabling 2FA requires valid TOTP code
- [ ] Audit log records all events

## Security Checklist

- [ ] Encryption key is never logged
- [ ] TOTP secrets are stored encrypted
- [ ] Backup codes are hashed before storage
- [ ] Rate limiting prevents brute force
- [ ] Time window is set to ±1 (±30 seconds)
- [ ] Setup tokens have 15-minute TTL
- [ ] Challenge tokens have 5-minute TTL
- [ ] All events are audit logged
- [ ] IP-based rate limiting is enforced
- [ ] Database queries use parameterized statements

## References
- Speakeasy: https://github.com/speakeasyjs/speakeasy
- qrcode: https://github.com/davidshimjs/qrcode
- bcrypt: https://github.com/kelektiv/node.bcrypt.js
- TOTP RFC 6238: https://tools.ietf.org/html/rfc6238
