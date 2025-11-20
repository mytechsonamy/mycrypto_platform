import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { User, UserStatus } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { TwoFactorService } from './two-factor/two-factor.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './dto/refresh-token.dto';
import { LogoutDto, LogoutResponseDto } from './dto/logout.dto';
import { PasswordResetRequestDto, PasswordResetRequestResponseDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto, PasswordResetConfirmResponseDto } from './dto/password-reset-confirm.dto';
import { RabbitMQService } from '../common/services/rabbitmq.service';
import { EmailService } from '../common/services/email.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { RedisService } from '../common/services/redis.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly emailService: EmailService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly redisService: RedisService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{
    success: boolean;
    data: {
      user: Partial<User>;
      message: string;
    };
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    const { email, password, terms_accepted, kvkk_consent_accepted } = registerDto;
    const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    this.logger.log('Registration attempt', {
      email,
      trace_id: requestId,
    });

    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        this.logger.warn('Registration attempt with existing email', {
          email,
          trace_id: requestId,
        });
        throw new ConflictException('Bu email zaten kayıtlı');
      }

      // Hash the password with Argon2id
      const passwordHash = await this.hashPassword(password);

      // Generate secure verification token (32 bytes, hex encoded)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create new user with hashed token
      const newUser = this.userRepository.create({
        email,
        password_hash: passwordHash,
        email_verified: false,
        email_verification_token_hash: verificationTokenHash,
        email_verification_token_expires_at: verificationTokenExpiresAt,
        terms_accepted,
        kvkk_consent_accepted,
      });

      const savedUser = await this.userRepository.save(newUser);

      // Send verification email using EmailService
      const verificationLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${verificationToken}`;

      const emailResult = await this.emailService.sendVerificationEmail(
        savedUser.email,
        savedUser.email.split('@')[0], // Use email prefix as name if no first name is available
        verificationToken.substring(0, 6).toUpperCase(), // Generate 6-character code from token
        verificationLink,
      );

      if (!emailResult.success) {
        this.logger.error(`Failed to send verification email to ${savedUser.email}`, {
          error: emailResult.error,
          trace_id: requestId,
        });
        // Don't fail registration, but log for monitoring
      }

      this.logger.log('User registered successfully', {
        user_id: savedUser.id,
        email: savedUser.email,
        trace_id: requestId,
      });

      // Return response without sensitive data
      const { password_hash, email_verification_token_hash, ...userWithoutSensitive } = savedUser;

      return {
        success: true,
        data: {
          user: {
            id: userWithoutSensitive.id,
            email: userWithoutSensitive.email,
            email_verified: userWithoutSensitive.email_verified,
            created_at: userWithoutSensitive.created_at,
          },
          message: 'Kayıt başarılı. Lütfen email adresinize gönderilen doğrulama linkine tıklayınız.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Registration failed', {
        error: error.message,
        trace_id: requestId,
      });

      throw new InternalServerErrorException('Kayıt işlemi sırasında bir hata oluştu');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const timeCost = this.configService.get<number>('ARGON2_TIME_COST', 12);
    const memoryCost = this.configService.get<number>('ARGON2_MEMORY_COST', 65536);
    const parallelism = this.configService.get<number>('ARGON2_PARALLELISM', 1);

    return argon2.hash(password, {
      type: argon2.argon2id,
      timeCost,
      memoryCost,
      parallelism,
    });
  }

  /**
   * Generate secure random verification token
   * @returns Random hex string token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a verification token for secure storage
   * @param token Plain text token
   * @returns SHA256 hash of the token
   */
  private hashVerificationToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return argon2.verify(hashedPassword, plainPassword);
  }

  /**
   * Verify user email with verification token
   * @param verifyEmailDto Contains the verification token
   * @returns Success response with verified email
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{
    success: boolean;
    message: string;
    data: {
      email: string;
      emailVerified: boolean;
    };
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    const { token } = verifyEmailDto;
    const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    this.logger.log('Email verification attempt', {
      trace_id: requestId,
    });

    try {
      // Hash the incoming token to match against stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find user by token hash
      const user = await this.userRepository.findOne({
        where: { email_verification_token_hash: tokenHash },
      });

      if (!user) {
        this.logger.warn('Invalid verification token attempted', {
          trace_id: requestId,
        });
        throw new BadRequestException('Geçersiz doğrulama kodu');
      }

      // Check if token has expired
      if (user.email_verification_token_expires_at < new Date()) {
        this.logger.warn('Expired verification token attempted', {
          user_id: user.id,
          trace_id: requestId,
        });
        throw new BadRequestException('Doğrulama kodunun süresi dolmuş');
      }

      // Check if already verified
      if (user.email_verified) {
        this.logger.log('Already verified email attempted verification', {
          user_id: user.id,
          trace_id: requestId,
        });
        // Return success anyway to avoid information leakage
        return {
          success: true,
          message: 'Email adresi başarıyla doğrulandı',
          data: {
            email: user.email,
            emailVerified: true,
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        };
      }

      // Update user verification status
      user.email_verified = true;
      user.email_verification_token_hash = null;
      user.email_verification_token_expires_at = null;

      await this.userRepository.save(user);

      this.logger.log('Email verified successfully', {
        user_id: user.id,
        email: user.email,
        trace_id: requestId,
      });

      return {
        success: true,
        message: 'Email adresi başarıyla doğrulandı',
        data: {
          email: user.email,
          emailVerified: true,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Email verification failed', {
        error: error.message,
        trace_id: requestId,
      });

      throw new InternalServerErrorException('Doğrulama işlemi sırasında bir hata oluştu');
    }
  }

  /**
   * Resend email verification to user
   * @param resendVerificationDto Contains the email address
   * @returns Success response indicating email sent
   */
  async resendVerification(resendVerificationDto: ResendVerificationDto): Promise<{
    success: boolean;
    message: string;
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    const { email } = resendVerificationDto;
    const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    this.logger.log('Resend verification attempt', {
      email,
      trace_id: requestId,
    });

    try {
      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        this.logger.warn('Resend verification for non-existent email', {
          email,
          trace_id: requestId,
        });
        throw new NotFoundException('Email adresi bulunamadı');
      }

      // Check if already verified
      if (user.email_verified) {
        this.logger.warn('Resend verification for already verified email', {
          user_id: user.id,
          email,
          trace_id: requestId,
        });
        throw new BadRequestException('Email adresi zaten doğrulanmış');
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      user.email_verification_token_hash = verificationTokenHash;
      user.email_verification_token_expires_at = verificationTokenExpiresAt;

      await this.userRepository.save(user);

      // Send new verification email
      const verificationLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${verificationToken}`;

      const emailResult = await this.emailService.sendVerificationEmail(
        user.email,
        user.email.split('@')[0], // Use email prefix as name
        verificationToken.substring(0, 6).toUpperCase(), // Generate 6-character code
        verificationLink,
      );

      if (!emailResult.success) {
        this.logger.error(`Failed to resend verification email to ${user.email}`, {
          error: emailResult.error,
          trace_id: requestId,
        });
        throw new InternalServerErrorException('Email gönderimi başarısız oldu');
      }

      this.logger.log('Verification email resent successfully', {
        user_id: user.id,
        email: user.email,
        trace_id: requestId,
      });

      return {
        success: true,
        message: 'Doğrulama emaili tekrar gönderildi',
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException ||
          error instanceof NotFoundException ||
          error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error('Resend verification failed', {
        error: error.message,
        trace_id: requestId,
      });

      throw new InternalServerErrorException('Email gönderimi sırasında bir hata oluştu');
    }
  }

  /**
   * User login with email and password
   * @param loginDto Login credentials
   * @param ip Client IP address
   * @param userAgent Client user agent
   * @returns JWT tokens and user info
   */
  async login(
    loginDto: LoginDto,
    ip: string,
    userAgent: string,
  ): Promise<{
    success: boolean;
    data: LoginResponseDto;
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    const { email, password } = loginDto;
    const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    this.logger.log('Login attempt', {
      email,
      ip,
      trace_id: requestId,
    });

    try {
      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email },
      });

      // Check credentials with generic error message
      if (!user || !(await this.verifyPassword(password, user.password_hash))) {
        // Increment failed attempts if user exists
        if (user) {
          await this.incrementFailedAttempts(user);
        }

        this.logger.warn('Invalid login credentials', {
          email,
          ip,
          trace_id: requestId,
        });

        throw new UnauthorizedException('Email veya şifre hatalı');
      }

      // Check if account is locked
      if (user.locked_until && user.locked_until > new Date()) {
        const remainingMinutes = Math.ceil(
          (user.locked_until.getTime() - Date.now()) / 60000,
        );

        this.logger.warn('Login attempt on locked account', {
          user_id: user.id,
          email,
          locked_until: user.locked_until,
          ip,
          trace_id: requestId,
        });

        throw new ForbiddenException(
          `Hesap kilitli. Lütfen ${remainingMinutes} dakika sonra tekrar deneyin.`,
        );
      }

      // Check if account is suspended or locked
      if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.LOCKED) {
        this.logger.warn('Login attempt on suspended/locked account', {
          user_id: user.id,
          email,
          status: user.status,
          ip,
          trace_id: requestId,
        });

        throw new ForbiddenException('Hesabınız askıya alınmış. Lütfen destek ekibi ile iletişime geçin.');
      }

      // Check if 2FA is enabled (BE-032: 2FA Login Challenge)
      const { challengeToken, requires2FA } = await this.twoFactorService.createChallenge(user.id);

      if (requires2FA) {
        // Reset failed attempts (password was correct)
        await this.resetFailedAttempts(user);

        this.logger.log('2FA required for login', {
          user_id: user.id,
          email,
          ip,
          trace_id: requestId,
        });

        // Return partial response with challenge token
        return {
          success: true,
          data: {
            requires_2fa: true,
            challenge_token: challengeToken,
            message: 'Please provide your 2FA code to complete login',
          } as any, // Type cast to handle different response format
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        };
      }

      // Generate tokens (no 2FA required)
      const accessToken = await this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user);

      // Create session
      await this.createSession(user.id, refreshToken, ip, userAgent);

      // Reset failed attempts
      await this.resetFailedAttempts(user);

      // Update last login
      await this.updateLastLogin(user, ip);

      this.logger.log('User logged in successfully', {
        user_id: user.id,
        email,
        ip,
        trace_id: requestId,
      });

      return {
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 900, // 15 minutes in seconds
          user: {
            id: user.id,
            email: user.email,
            email_verified: user.email_verified,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Login failed', {
        error: error.message,
        email,
        ip,
        trace_id: requestId,
      });

      throw new InternalServerErrorException('Giriş işlemi sırasında bir hata oluştu');
    }
  }

  /**
   * Generate access and refresh tokens for a user (used by 2FA)
   * @param userId User ID
   * @returns Object with access and refresh tokens
   */
  async generateTokens(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Create session for the new tokens
    await this.createSession(user.id, refreshToken, 'system', 'Two-Factor Authentication');

    // Update last login
    await this.updateLastLogin(user, 'system');

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Generate JWT access token
   * @param user User entity
   * @returns Signed JWT access token
   */
  private async generateAccessToken(user: User): Promise<string> {
    const jti = uuidv4();
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'access',
      jti,
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      algorithm: this.configService.get('jwt.algorithm', 'RS256'),
      expiresIn: this.configService.get('jwt.accessTokenExpiry', '15m'),
    });
  }

  /**
   * Generate JWT refresh token
   * @param user User entity
   * @returns Signed JWT refresh token
   */
  private async generateRefreshToken(user: User): Promise<string> {
    const jti = uuidv4();
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
      jti,
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      algorithm: this.configService.get('jwt.algorithm', 'RS256'),
      expiresIn: this.configService.get('jwt.refreshTokenExpiry', '30d'),
    });
  }

  /**
   * Create a new session in the database
   * @param userId User ID
   * @param refreshToken Refresh token to store
   * @param ip Client IP address
   * @param userAgent Client user agent
   */
  private async createSession(
    userId: string,
    refreshToken: string,
    ip: string,
    userAgent: string,
  ): Promise<Session> {
    // Hash the refresh token for storage
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Set expiry to match refresh token expiry (30 days)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Delete any existing sessions for this user to prevent session accumulation
    // In production, you might want to keep multiple sessions per user
    await this.sessionRepository.delete({ user_id: userId });

    const session = this.sessionRepository.create({
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: userAgent,
      is_revoked: false,
    });

    return await this.sessionRepository.save(session);
  }

  /**
   * Increment failed login attempts for a user
   * @param user User entity
   */
  private async incrementFailedAttempts(user: User): Promise<void> {
    const maxAttempts = this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5);
    const lockoutDuration = this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 30);

    user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;

    // Lock account after max attempts
    if (user.failed_login_attempts >= maxAttempts) {
      user.locked_until = new Date(Date.now() + lockoutDuration * 60 * 1000);

      this.logger.warn('Account locked due to failed login attempts', {
        user_id: user.id,
        email: user.email,
        attempts: user.failed_login_attempts,
        locked_until: user.locked_until,
      });
    }

    await this.userRepository.save(user);
  }

  /**
   * Reset failed login attempts for a user
   * @param user User entity
   */
  private async resetFailedAttempts(user: User): Promise<void> {
    if (user.failed_login_attempts > 0 || user.locked_until) {
      user.failed_login_attempts = 0;
      user.locked_until = null;
      await this.userRepository.save(user);
    }
  }

  /**
   * Update user's last login timestamp and IP
   * @param user User entity
   * @param ip Client IP address
   */
  private async updateLastLogin(user: User, ip: string): Promise<void> {
    user.last_login_at = new Date();
    user.last_login_ip = ip;
    await this.userRepository.save(user);
  }

  /**
   * Refresh access token using refresh token
   * @param refreshTokenDto Contains the refresh token
   * @returns New access token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
    success: boolean;
    data: RefreshTokenResponseDto;
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    const { refresh_token } = refreshTokenDto;
    const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    this.logger.log('Token refresh attempt', {
      trace_id: requestId,
    });

    try {
      // First, verify the JWT token is valid
      let tokenPayload: JwtPayload;
      try {
        tokenPayload = await this.jwtService.verify(refresh_token, {
          algorithms: [this.configService.get('jwt.algorithm', 'RS256')],
        });
      } catch (error) {
        this.logger.warn('Invalid JWT refresh token', {
          error: error.message,
          trace_id: requestId,
        });
        throw new UnauthorizedException('Geçersiz refresh token');
      }

      // Check if it's a refresh token
      if (tokenPayload.type !== 'refresh') {
        this.logger.warn('Token is not a refresh token', {
          type: tokenPayload.type,
          trace_id: requestId,
        });
        throw new UnauthorizedException('Geçersiz refresh token');
      }

      // Hash the refresh token to find the session
      const tokenHash = crypto
        .createHash('sha256')
        .update(refresh_token)
        .digest('hex');

      // Find session by token hash
      const session = await this.sessionRepository.findOne({
        where: { refresh_token_hash: tokenHash },
        relations: ['user'],
      });

      if (!session) {
        this.logger.warn('Session not found for refresh token', {
          trace_id: requestId,
        });
        throw new UnauthorizedException('Geçersiz refresh token');
      }

      // Check if session is revoked
      if (session.is_revoked) {
        this.logger.warn('Attempt to use revoked refresh token', {
          session_id: session.id,
          user_id: session.user_id,
          trace_id: requestId,
        });
        throw new UnauthorizedException('Token iptal edilmiş');
      }

      // Check if session has expired
      if (session.expires_at < new Date()) {
        this.logger.warn('Refresh token expired', {
          session_id: session.id,
          user_id: session.user_id,
          expires_at: session.expires_at,
          trace_id: requestId,
        });
        throw new UnauthorizedException('Token süresi dolmuş');
      }

      // Check if user account is still active
      if (!session.user ||
          session.user.status === UserStatus.SUSPENDED ||
          session.user.status === UserStatus.LOCKED) {
        this.logger.warn('Refresh attempt for inactive account', {
          user_id: session.user_id,
          status: session.user?.status,
          trace_id: requestId,
        });
        throw new ForbiddenException('Hesabınız askıya alınmış. Lütfen destek ekibi ile iletişime geçin.');
      }

      // Generate new access token
      const accessToken = await this.generateAccessToken(session.user);

      this.logger.log('Access token refreshed successfully', {
        user_id: session.user_id,
        session_id: session.id,
        trace_id: requestId,
      });

      return {
        success: true,
        data: {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 900, // 15 minutes in seconds
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Token refresh failed', {
        error: error.message,
        trace_id: requestId,
      });

      throw new InternalServerErrorException('Token yenileme sırasında bir hata oluştu');
    }
  }

  /**
   * Logout user and blacklist tokens
   * @param userId User ID from JWT
   * @param accessToken Current access token
   * @param logoutDto Optional logout data
   * @returns Success response
   */
  async logout(
    userId: string,
    accessToken: string,
    logoutDto?: LogoutDto,
  ): Promise<{
    success: boolean;
    data: LogoutResponseDto;
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    this.logger.log('Logout attempt', {
      user_id: userId,
      device_info: logoutDto?.device_info,
      trace_id: requestId,
    });

    try {
      // Blacklist current access token
      await this.tokenBlacklistService.blacklistToken(accessToken, 'logout');

      // Revoke all sessions for this user
      const sessions = await this.sessionRepository.find({
        where: { user_id: userId, is_revoked: false },
      });

      for (const session of sessions) {
        session.is_revoked = true;
        session.revoked_at = new Date();
        await this.sessionRepository.save(session);
      }

      this.logger.log('User logged out successfully', {
        user_id: userId,
        sessions_revoked: sessions.length,
        trace_id: requestId,
      });

      return {
        success: true,
        data: {
          success: true,
          message: 'Başarıyla çıkış yapıldı',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      };
    } catch (error) {
      this.logger.error('Logout failed', {
        user_id: userId,
        error: error.message,
        trace_id: requestId,
      });

      throw new InternalServerErrorException('Çıkış işlemi sırasında bir hata oluştu');
    }
  }

  /**
   * Request password reset
   * @param passwordResetRequestDto Contains email address
   * @param ip Client IP address
   * @param userAgent Client user agent
   * @returns Success response (always returns success to prevent enumeration)
   */
  async requestPasswordReset(
    passwordResetRequestDto: PasswordResetRequestDto,
    ip: string,
    userAgent: string,
  ): Promise<{
    success: boolean;
    data: PasswordResetRequestResponseDto;
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    const { email } = passwordResetRequestDto;
    const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    this.logger.log('Password reset request', {
      email,
      ip,
      trace_id: requestId,
    });

    try {
      // Rate limit check: 3 requests per email per hour
      const rateLimitKey = `password_reset:${email}`;
      const rateLimit = await this.redisService.slidingWindowRateLimit(
        rateLimitKey,
        3,
        60 * 60 * 1000, // 1 hour
      );

      if (!rateLimit.allowed) {
        this.logger.warn('Password reset rate limit exceeded', {
          email,
          ip,
          count: rateLimit.count,
          trace_id: requestId,
        });

        // Return success anyway to prevent enumeration
        return {
          success: true,
          data: {
            success: true,
            message: 'Şifre sıfırlama linki email adresinize gönderildi',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        };
      }

      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (user) {
        // Generate secure random token (32 bytes)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Delete any existing unused tokens for this user
        await this.passwordResetTokenRepository.delete({
          user_id: user.id,
          used_at: null,
        });

        // Create new password reset token
        const passwordResetToken = this.passwordResetTokenRepository.create({
          user_id: user.id,
          token_hash: resetTokenHash,
          expires_at: expiresAt,
          ip_address: ip,
          user_agent: userAgent,
        });

        await this.passwordResetTokenRepository.save(passwordResetToken);

        // Send password reset email
        const resetLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;

        const emailResult = await this.emailService.sendPasswordResetEmail(
          user.email,
          user.email.split('@')[0], // Use email prefix as name
          resetLink,
        );

        if (!emailResult.success) {
          this.logger.error(`Failed to send password reset email to ${user.email}`, {
            error: emailResult.error,
            trace_id: requestId,
          });
        }

        this.logger.log('Password reset token created', {
          user_id: user.id,
          email: user.email,
          trace_id: requestId,
        });
      } else {
        this.logger.warn('Password reset requested for non-existent email', {
          email,
          ip,
          trace_id: requestId,
        });
      }

      // Always return success to prevent user enumeration
      return {
        success: true,
        data: {
          success: true,
          message: 'Şifre sıfırlama linki email adresinize gönderildi',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      };
    } catch (error) {
      this.logger.error('Password reset request failed', {
        email,
        error: error.message,
        trace_id: requestId,
      });

      // Still return success to prevent enumeration on errors
      return {
        success: true,
        data: {
          success: true,
          message: 'Şifre sıfırlama linki email adresinize gönderildi',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      };
    }
  }

  /**
   * Confirm password reset with token
   * @param passwordResetConfirmDto Contains token and new password
   * @returns Success response
   */
  async confirmPasswordReset(
    passwordResetConfirmDto: PasswordResetConfirmDto,
  ): Promise<{
    success: boolean;
    data: PasswordResetConfirmResponseDto;
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    const { token, newPassword } = passwordResetConfirmDto;
    const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    this.logger.log('Password reset confirmation attempt', {
      trace_id: requestId,
    });

    try {
      // Hash the incoming token to match against stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find password reset token
      const resetToken = await this.passwordResetTokenRepository.findOne({
        where: { token_hash: tokenHash },
        relations: ['user'],
      });

      if (!resetToken) {
        this.logger.warn('Invalid password reset token', {
          trace_id: requestId,
        });
        throw new BadRequestException('Geçersiz veya süresi dolmuş şifre sıfırlama kodu');
      }

      // Check if token is valid
      if (!resetToken.isValid()) {
        if (resetToken.isUsed()) {
          this.logger.warn('Attempted to use already used password reset token', {
            token_id: resetToken.id,
            user_id: resetToken.user_id,
            trace_id: requestId,
          });
        } else if (resetToken.isExpired()) {
          this.logger.warn('Attempted to use expired password reset token', {
            token_id: resetToken.id,
            user_id: resetToken.user_id,
            trace_id: requestId,
          });
        }
        throw new BadRequestException('Geçersiz veya süresi dolmuş şifre sıfırlama kodu');
      }

      // Hash the new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update user's password
      const user = resetToken.user;
      user.password_hash = passwordHash;

      // Reset failed login attempts
      user.failed_login_attempts = 0;
      user.locked_until = null;

      await this.userRepository.save(user);

      // Mark token as used
      resetToken.used_at = new Date();
      await this.passwordResetTokenRepository.save(resetToken);

      // Invalidate all user sessions
      await this.sessionRepository.update(
        { user_id: user.id, is_revoked: false },
        { is_revoked: true, revoked_at: new Date() },
      );

      // Blacklist all active tokens for this user
      await this.tokenBlacklistService.blacklistAllUserTokens(user.id);

      // Send password reset success email
      const emailResult = await this.emailService.sendPasswordResetSuccessEmail(
        user.email,
        user.email.split('@')[0], // Use email prefix as name
      );

      if (!emailResult.success) {
        this.logger.error(`Failed to send password reset success email to ${user.email}`, {
          error: emailResult.error,
          trace_id: requestId,
        });
      }

      this.logger.log('Password reset successful', {
        user_id: user.id,
        email: user.email,
        trace_id: requestId,
      });

      return {
        success: true,
        data: {
          success: true,
          message: 'Şifreniz başarıyla sıfırlandı. Lütfen yeni şifrenizle giriş yapın.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Password reset confirmation failed', {
        error: error.message,
        trace_id: requestId,
      });

      throw new InternalServerErrorException('Şifre sıfırlama işlemi sırasında bir hata oluştu');
    }
  }
}