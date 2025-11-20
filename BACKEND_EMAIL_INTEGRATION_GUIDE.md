# Backend Email Service Integration Guide (BE-002)

## Overview

This guide provides instructions for integrating the email service into the backend authentication service. The email infrastructure is ready for use - you just need to connect it to your authentication flows.

## Prerequisites

Before starting integration:
- Email service is running and healthy
- MailHog is accessible at `http://localhost:8025`
- Docker containers are running: `docker-compose up -d`
- Read: `EMAIL_SERVICE_SETUP.md` for complete documentation

## Quick Integration Checklist

- [ ] Import EmailService in AuthModule
- [ ] Inject EmailService in AuthService
- [ ] Add sendVerificationEmail call in registration flow
- [ ] Add sendPasswordResetEmail call in password reset flow
- [ ] Add email verification endpoint
- [ ] Update AuthController with email endpoints
- [ ] Test with MailHog
- [ ] Update API documentation

## Step-by-Step Integration

### Step 1: Import Email Configuration in AuthModule

**File:** `services/auth-service/src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { emailConfig } from '../common/config/email.config';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    ConfigModule.forFeature(emailConfig),
    // ... other imports
  ],
  providers: [
    AuthService,
    EmailService,  // Add this
    RabbitMQService,
  ],
  exports: [AuthService, EmailService],  // Export EmailService
})
export class AuthModule {}
```

### Step 2: Inject EmailService in AuthService

**File:** `services/auth-service/src/auth/auth.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    private emailService: EmailService,
    // ... other dependencies
  ) {}

  // Implementation below...
}
```

### Step 3: Send Verification Email on Registration

**In AuthService.registerUser():**

```typescript
async registerUser(registerDto: RegisterDto) {
  // 1. Validate email doesn't exist
  const existingUser = await this.userRepository.findOne({
    where: { email: registerDto.email },
  });

  if (existingUser) {
    throw new BadRequestException('Email already registered');
  }

  // 2. Generate verification token (6-8 digits)
  const verificationCode = this.generateVerificationCode();
  const verificationToken = this.generateVerificationToken();

  // 3. Create user with verification token
  const user = this.userRepository.create({
    email: registerDto.email,
    firstName: registerDto.firstName,
    lastName: registerDto.lastName,
    passwordHash: await this.hashPassword(registerDto.password),
    verificationToken: verificationToken,
    verificationCode: verificationCode,
    verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    emailVerified: false,
  });

  await this.userRepository.save(user);

  // 4. Send verification email
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const emailResult = await this.emailService.sendVerificationEmail(
    user.email,
    user.firstName,
    verificationCode,
    verificationLink,
  );

  if (!emailResult.success) {
    this.logger.error(`Failed to send verification email to ${user.email}`);
    // Don't fail registration, but log for monitoring
  }

  // 5. Return response without password
  return this.formatUserResponse(user);
}
```

### Step 4: Add Email Verification Endpoint

**Add to AuthController:**

```typescript
import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Verify email address
   * POST /auth/verify-email
   * Body: { verificationCode: string } or { token: string }
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verifyEmailDto: { verificationCode?: string; token?: string },
  ) {
    return this.authService.verifyEmail(
      verifyEmailDto.verificationCode || verifyEmailDto.token,
    );
  }

  /**
   * Resend verification email
   * POST /auth/resend-verification
   * Body: { email: string }
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }
}
```

### Step 5: Add Email Verification Logic in AuthService

```typescript
/**
 * Verify user email
 */
async verifyEmail(verificationToken: string) {
  const user = await this.userRepository.findOne({
    where: [
      { verificationToken },
      // Also accept verification code as backup
      { verificationCode: verificationToken },
    ],
  });

  if (!user) {
    throw new BadRequestException('Invalid or expired verification code');
  }

  // Check token expiry
  if (new Date() > user.verificationTokenExpiry) {
    throw new BadRequestException('Verification token has expired');
  }

  // Mark email as verified
  user.emailVerified = true;
  user.verificationToken = null;
  user.verificationCode = null;
  user.verificationTokenExpiry = null;

  await this.userRepository.save(user);

  return {
    success: true,
    message: 'Email verified successfully',
    user: this.formatUserResponse(user),
  };
}

/**
 * Resend verification email
 */
async resendVerificationEmail(email: string) {
  const user = await this.userRepository.findOne({ where: { email } });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  if (user.emailVerified) {
    throw new BadRequestException('Email already verified');
  }

  // Check resend attempts (optional rate limiting)
  if (user.verificationResendCount >= 3) {
    throw new BadRequestException('Too many resend attempts, please try again later');
  }

  // Generate new verification code
  const verificationCode = this.generateVerificationCode();
  const verificationToken = this.generateVerificationToken();

  user.verificationToken = verificationToken;
  user.verificationCode = verificationCode;
  user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  user.verificationResendCount = (user.verificationResendCount || 0) + 1;

  await this.userRepository.save(user);

  // Send verification email
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  await this.emailService.sendVerificationEmail(
    user.email,
    user.firstName,
    verificationCode,
    verificationLink,
  );

  return {
    success: true,
    message: 'Verification email sent',
  };
}
```

### Step 6: Implement Password Reset with Email

**Add to AuthController:**

```typescript
/**
 * Request password reset
 * POST /auth/forgot-password
 * Body: { email: string }
 */
@Post('forgot-password')
@HttpCode(HttpStatus.OK)
async forgotPassword(@Body('email') email: string) {
  return this.authService.requestPasswordReset(email);
}

/**
 * Reset password with token
 * POST /auth/reset-password
 * Body: { token: string, newPassword: string }
 */
@Post('reset-password')
@HttpCode(HttpStatus.OK)
async resetPassword(@Body() resetDto: { token: string; newPassword: string }) {
  return this.authService.resetPassword(resetDto.token, resetDto.newPassword);
}
```

**Add to AuthService:**

```typescript
/**
 * Request password reset
 */
async requestPasswordReset(email: string) {
  const user = await this.userRepository.findOne({ where: { email } });

  if (!user) {
    // Don't reveal if user exists (security best practice)
    return {
      success: true,
      message: 'If the email exists, password reset instructions will be sent',
    };
  }

  // Generate reset token (expires in 1 hour)
  const resetToken = this.generateResetToken();
  user.passwordResetToken = resetToken;
  user.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await this.userRepository.save(user);

  // Send reset email
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const emailResult = await this.emailService.sendPasswordResetEmail(
    user.email,
    user.firstName,
    resetLink,
  );

  if (!emailResult.success) {
    this.logger.error(`Failed to send password reset email to ${user.email}`);
  }

  return {
    success: true,
    message: 'If the email exists, password reset instructions will be sent',
  };
}

/**
 * Reset password with valid token
 */
async resetPassword(resetToken: string, newPassword: string) {
  const user = await this.userRepository.findOne({
    where: { passwordResetToken: resetToken },
  });

  if (!user) {
    throw new BadRequestException('Invalid or expired reset token');
  }

  // Check token expiry
  if (new Date() > user.passwordResetTokenExpiry) {
    throw new BadRequestException('Reset token has expired');
  }

  // Validate new password
  if (newPassword.length < 12) {
    throw new BadRequestException('Password must be at least 12 characters');
  }

  // Update password
  user.passwordHash = await this.hashPassword(newPassword);
  user.passwordResetToken = null;
  user.passwordResetTokenExpiry = null;
  user.lastPasswordChangeAt = new Date();

  await this.userRepository.save(user);

  // Optional: Invalidate all existing sessions
  await this.invalidateUserSessions(user.id);

  return {
    success: true,
    message: 'Password reset successfully',
  };
}
```

### Step 7: Update User Entity

**Add email-related fields to User entity:**

```typescript
import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ... existing fields

  @Column({ unique: true })
  email: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true, length: 255 })
  verificationToken: string;

  @Column({ nullable: true, length: 10 })
  verificationCode: string;

  @Column({ nullable: true })
  verificationTokenExpiry: Date;

  @Column({ default: 0 })
  verificationResendCount: number;

  @Column({ nullable: true, length: 255 })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetTokenExpiry: Date;

  @Column({ nullable: true })
  lastPasswordChangeAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Step 8: Add Helper Methods in AuthService

```typescript
/**
 * Generate verification code (6 digits)
 */
private generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate verification token (secure random)
 */
private generateVerificationToken(): string {
  return require('crypto')
    .randomBytes(32)
    .toString('hex');
}

/**
 * Generate password reset token
 */
private generateResetToken(): string {
  return require('crypto')
    .randomBytes(32)
    .toString('hex');
}

/**
 * Hash password using argon2
 */
private async hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

/**
 * Format user response (exclude sensitive fields)
 */
private formatUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

/**
 * Invalidate all user sessions
 */
private async invalidateUserSessions(userId: string) {
  // Clear all session tokens from Redis
  const sessionKey = `user:${userId}:sessions:*`;
  // Implementation depends on your session management strategy
}
```

## Testing Integration

### Manual Testing with MailHog

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Register new user:**
   ```bash
   curl -X POST http://localhost:3001/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "firstName": "John",
       "lastName": "Doe",
       "password": "SecurePassword123!@#"
     }'
   ```

3. **Check MailHog:**
   - Navigate to: http://localhost:8025
   - Should see verification email
   - Copy verification code or link

4. **Verify email:**
   ```bash
   curl -X POST http://localhost:3001/auth/verify-email \
     -H "Content-Type: application/json" \
     -d '{"verificationCode": "123456"}'
   ```

5. **Test password reset:**
   ```bash
   # Request reset
   curl -X POST http://localhost:3001/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'

   # Check MailHog for reset email
   # Copy reset token from email

   # Reset password
   curl -X POST http://localhost:3001/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{
       "token": "your-reset-token",
       "newPassword": "NewSecurePassword456!@#"
     }'
   ```

### Unit Testing

```typescript
describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                'email.mockEmailService': true, // Use mock mode
                'email.templatesPath': './templates/emails',
              };
              return config[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should send verification email', async () => {
    const result = await service.sendVerificationEmail(
      'test@example.com',
      'John',
      '123456',
      'http://localhost:3000/verify?code=123456',
    );

    expect(result.success).toBe(true);
  });

  it('should handle invalid email addresses', async () => {
    const result = await service.sendVerificationEmail(
      'invalid-email',
      'John',
      '123456',
      'http://localhost:3000/verify?code=123456',
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## Environment Variables Required

Ensure these are set in your `.env`:

```env
# Email Configuration
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_FROM=noreply@exchange.local
MAIL_TEMPLATES_PATH=./templates/emails
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TOKEN_EXPIRY=24h

# Frontend URLs (for verification and reset links)
FRONTEND_URL=http://localhost:3000

# Security
PASSWORD_MIN_LENGTH=12
PASSWORD_RESET_TOKEN_EXPIRY=1h
VERIFICATION_CODE_LENGTH=6
VERIFICATION_TOKEN_LENGTH=32
```

## Database Migration

Create migration for email-related user fields:

```bash
npm run typeorm migration:create -- -n AddEmailFieldsToUser
```

Migration content:
```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailFieldsToUser1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'emailVerified',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'verificationToken',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'verificationCode',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'verificationTokenExpiry',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'verificationResendCount',
        type: 'int',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordResetToken',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordResetTokenExpiry',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lastPasswordChangeAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'emailVerified');
    await queryRunner.dropColumn('users', 'verificationToken');
    await queryRunner.dropColumn('users', 'verificationCode');
    await queryRunner.dropColumn('users', 'verificationTokenExpiry');
    await queryRunner.dropColumn('users', 'verificationResendCount');
    await queryRunner.dropColumn('users', 'passwordResetToken');
    await queryRunner.dropColumn('users', 'passwordResetTokenExpiry');
    await queryRunner.dropColumn('users', 'lastPasswordChangeAt');
  }
}
```

## Common Integration Issues

### Issue 1: Template Not Found

**Error:** `ENOENT: no such file or directory, open './templates/emails/verify-email.html'`

**Solution:**
- Check `MAIL_TEMPLATES_PATH` is correct
- Verify template files exist: `ls -la services/auth-service/templates/emails/`
- Ensure path is relative to auth-service root

### Issue 2: Email Not Sending in Tests

**Error:** `Mock email service enabled`

**Solution:**
- Check `MOCK_EMAIL_SERVICE` setting
- For actual testing, set `MOCK_EMAIL_SERVICE=false`
- Verify MailHog is running

### Issue 3: SMTP Connection Error

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:1025`

**Solution:**
- Ensure MailHog is running: `docker-compose up -d mailhog`
- Check MAIL_HOST is set to `mailhog` (not localhost)
- From within Docker, use service name, not localhost

## Next Steps for Backend Team

1. Read complete documentation: `EMAIL_SERVICE_SETUP.md`
2. Review this integration guide
3. Implement steps 1-8 above
4. Run integration tests
5. Test with MailHog manually
6. Update API documentation
7. Create pull request with integration
8. Deploy and verify in staging

## Support

For questions or issues:
1. Check `EMAIL_SERVICE_QUICK_REFERENCE.md`
2. Review logs: `docker logs exchange_auth_service`
3. Test with MailHog UI: http://localhost:8025
4. Verify configuration in `.env`

---

**Integration Status:** Ready for Backend Implementation
**Last Updated:** 2025-11-19
