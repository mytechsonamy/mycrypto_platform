import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import { AuthService } from './auth.service';
import { User, UserStatus } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { RabbitMQService } from '../common/services/rabbitmq.service';
import { EmailService } from '../common/services/email.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as crypto from 'crypto';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-value'),
}));

// Mock argon2
jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let sessionRepository: Repository<Session>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let rabbitMQService: RabbitMQService;
  let emailService: EmailService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSessionRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockRabbitMQService = {
    publishEmailVerification: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    sessionRepository = module.get<Repository<Session>>(getRepositoryToken(Session));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
    emailService = module.get<EmailService>(EmailService);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const configMap = {
        'ARGON2_TIME_COST': 12,
        'ARGON2_MEMORY_COST': 65536,
        'ARGON2_PARALLELISM': 1,
        'JWT_EMAIL_VERIFICATION_EXPIRY': '24h',
        'FRONTEND_URL': 'http://localhost:3000',
      };
      return configMap[key] || defaultValue;
    });
  });

  describe('register', () => {
    const mockRegisterDto: RegisterDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      terms_accepted: true,
      kvkk_consent_accepted: true,
    };

    it('should successfully register a new user', async () => {
      const mockHashedPassword = 'hashed_password';
      const mockToken = crypto.randomBytes(32).toString('hex');
      const mockTokenHash = crypto.createHash('sha256').update(mockToken).digest('hex');
      const mockSavedUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: mockRegisterDto.email,
        password_hash: mockHashedPassword,
        email_verified: false,
        email_verification_token_hash: mockTokenHash,
        email_verification_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        terms_accepted: true,
        kvkk_consent_accepted: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      mockUserRepository.create.mockReturnValue(mockSavedUser);
      mockUserRepository.save.mockResolvedValue(mockSavedUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      const result = await service.register(mockRegisterDto);

      expect(result).toHaveProperty('success', true);
      expect(result.data.user).toHaveProperty('id', mockSavedUser.id);
      expect(result.data.user).toHaveProperty('email', mockSavedUser.email);
      expect(result.data.user).not.toHaveProperty('password_hash');
      expect(result.data.user).not.toHaveProperty('email_verification_token_hash');
      expect(result.data.message).toContain('Kayıt başarılı');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(argon2.hash).toHaveBeenCalledWith(
        mockRegisterDto.password,
        expect.objectContaining({
          type: argon2.argon2id,
          timeCost: 12,
          memoryCost: 65536,
          parallelism: 1,
        }),
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const existingUser = {
        id: '123',
        email: mockRegisterDto.email,
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        'Bu email zaten kayıtlı',
      );

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockRegisterDto.email },
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockJwtService.sign.mockReturnValue('token');
      mockUserRepository.create.mockReturnValue({});
      mockUserRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        'Kayıt işlemi sırasında bir hata oluştu',
      );
    });

    it('should continue even if email service fails', async () => {
      const mockHashedPassword = 'hashed_password';
      const mockToken = crypto.randomBytes(32).toString('hex');
      const mockTokenHash = crypto.createHash('sha256').update(mockToken).digest('hex');
      const mockSavedUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: mockRegisterDto.email,
        password_hash: mockHashedPassword,
        email_verified: false,
        email_verification_token_hash: mockTokenHash,
        email_verification_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        terms_accepted: true,
        kvkk_consent_accepted: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      mockUserRepository.create.mockReturnValue(mockSavedUser);
      mockUserRepository.save.mockResolvedValue(mockSavedUser);
      // Email service fails
      mockEmailService.sendVerificationEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      const result = await service.register(mockRegisterDto);

      expect(result).toHaveProperty('success', true);
      expect(result.data.user).toHaveProperty('id', mockSavedUser.id);
    });

    it('should generate email verification token with correct expiry', async () => {
      const mockToken = crypto.randomBytes(32).toString('hex');
      const mockTokenHash = crypto.createHash('sha256').update(mockToken).digest('hex');
      const mockSavedUser = {
        id: '123',
        email: mockRegisterDto.email,
        password_hash: 'hashed',
        email_verified: false,
        email_verification_token_hash: mockTokenHash,
        email_verification_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        terms_accepted: true,
        kvkk_consent_accepted: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');
      mockUserRepository.create.mockReturnValue(mockSavedUser);
      mockUserRepository.save.mockResolvedValue(mockSavedUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      await service.register(mockRegisterDto);

      // Verify that a secure token was generated
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email_verification_token_hash: expect.any(String),
          email_verification_token_expires_at: expect.any(Date),
        }),
      );

      // Check that email service was called
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      const plainPassword = 'SecurePass123!';
      const hashedPassword = 'hashed_password';

      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyPassword(plainPassword, hashedPassword);

      expect(result).toBe(true);
      expect(argon2.verify).toHaveBeenCalledWith(hashedPassword, plainPassword);
    });

    it('should return false for non-matching password', async () => {
      const plainPassword = 'WrongPassword';
      const hashedPassword = 'hashed_password';

      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyPassword(plainPassword, hashedPassword);

      expect(result).toBe(false);
      expect(argon2.verify).toHaveBeenCalledWith(hashedPassword, plainPassword);
    });
  });

  describe('Email Verification with Secure Token', () => {
    const mockRegisterDto: RegisterDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      terms_accepted: true,
      kvkk_consent_accepted: true,
    };

    it('should generate secure verification token and send email', async () => {
      const mockSavedUser = {
        id: '123',
        email: mockRegisterDto.email,
        password_hash: 'hashed',
        email_verified: false,
        email_verification_token_hash: 'somehash',
        email_verification_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        terms_accepted: true,
        kvkk_consent_accepted: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');
      mockUserRepository.create.mockImplementation((data) => ({ ...mockSavedUser, ...data }));
      mockUserRepository.save.mockResolvedValue(mockSavedUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      await service.register(mockRegisterDto);

      // Verify email was sent with correct parameters
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        mockRegisterDto.email,
        expect.any(String), // name derived from email
        expect.any(String), // 6-char code
        expect.stringContaining('http://localhost:3000/verify-email?token='),
      );

      // Verify token hash is stored, not plain token
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email_verification_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA256 hash
          email_verification_token_expires_at: expect.any(Date),
        })
      );
    });

    it('should continue registration even if email sending fails', async () => {
      const mockSavedUser = {
        id: '123',
        email: mockRegisterDto.email,
        password_hash: 'hashed',
        email_verified: false,
        email_verification_token_hash: 'hash',
        email_verification_token_expires_at: new Date(),
        terms_accepted: true,
        kvkk_consent_accepted: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');
      mockUserRepository.create.mockReturnValue(mockSavedUser);
      mockUserRepository.save.mockResolvedValue(mockSavedUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      const result = await service.register(mockRegisterDto);

      // Registration should still succeed
      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(mockRegisterDto.email);

      // Verify email was attempted
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('Token Generation Helpers', () => {
    it('should generate unique tokens', () => {
      const token1 = service['generateVerificationToken']();
      const token2 = service['generateVerificationToken']();

      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes in hex
      expect(token2).toHaveLength(64);
    });

    it('should hash tokens consistently', () => {
      const token = 'test_token_123';
      const hash1 = service['hashVerificationToken'](token);
      const hash2 = service['hashVerificationToken'](token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = service['hashVerificationToken']('token1');
      const hash2 = service['hashVerificationToken']('token2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully with valid token', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: 'a'.repeat(64),
      };

      const tokenHash = crypto.createHash('sha256').update(verifyEmailDto.token).digest('hex');
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_verified: false,
        email_verification_token_hash: tokenHash,
        email_verification_token_expires_at: new Date(Date.now() + 86400000), // 24 hours from now
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        email_verified: true,
        email_verification_token_hash: null,
        email_verification_token_expires_at: null,
      });

      const result = await service.verifyEmail(verifyEmailDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email_verification_token_hash: tokenHash },
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        email_verified: true,
        email_verification_token_hash: null,
        email_verification_token_expires_at: null,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Email adresi başarıyla doğrulandı');
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.emailVerified).toBe(true);
    });

    it('should throw BadRequestException for invalid token', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: 'a'.repeat(64),
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(
        new BadRequestException('Geçersiz doğrulama kodu'),
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: 'a'.repeat(64),
      };

      const tokenHash = crypto.createHash('sha256').update(verifyEmailDto.token).digest('hex');
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_verified: false,
        email_verification_token_hash: tokenHash,
        email_verification_token_expires_at: new Date(Date.now() - 86400000), // 24 hours ago
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(
        new BadRequestException('Doğrulama kodunun süresi dolmuş'),
      );
    });

    it('should return success for already verified email', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: 'a'.repeat(64),
      };

      const tokenHash = crypto.createHash('sha256').update(verifyEmailDto.token).digest('hex');
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_verified: true,
        email_verification_token_hash: tokenHash,
        email_verification_token_expires_at: new Date(Date.now() + 86400000),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.verifyEmail(verifyEmailDto);

      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Email adresi başarıyla doğrulandı');
      expect(result.data.emailVerified).toBe(true);
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email successfully', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'test@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_verified: false,
        email_verification_token_hash: 'old-hash',
        email_verification_token_expires_at: new Date(Date.now() - 86400000),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        email_verification_token_hash: 'new-hash',
        email_verification_token_expires_at: new Date(Date.now() + 86400000),
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      const result = await service.resendVerification(resendDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: resendDto.email },
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Doğrulama emaili tekrar gönderildi');
    });

    it('should throw NotFoundException for non-existent email', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'nonexistent@example.com',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.resendVerification(resendDto)).rejects.toThrow(
        new NotFoundException('Email adresi bulunamadı'),
      );
    });

    it('should throw BadRequestException for already verified email', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'test@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_verified: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.resendVerification(resendDto)).rejects.toThrow(
        new BadRequestException('Email adresi zaten doğrulanmış'),
      );
    });

    it('should throw InternalServerErrorException when email sending fails', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'test@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_verified: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      await expect(service.resendVerification(resendDto)).rejects.toThrow(
        new InternalServerErrorException('Email gönderimi başarısız oldu'),
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };
    const ip = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        email_verified: true,
        failed_login_attempts: 0,
        locked_until: null,
        status: UserStatus.ACTIVE,
        last_login_at: null,
        last_login_ip: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      mockJwtService.sign.mockImplementation((payload) => {
        if (payload.type === 'access') {
          return 'access.token.here';
        }
        return 'refresh.token.here';
      });

      mockConfigService.get.mockImplementation((key) => {
        if (key === 'jwt.algorithm') return 'RS256';
        if (key === 'jwt.accessTokenExpiry') return '15m';
        if (key === 'jwt.refreshTokenExpiry') return '30d';
        return null;
      });

      mockSessionRepository.delete.mockResolvedValue({});
      mockSessionRepository.create.mockImplementation((data) => data);
      mockSessionRepository.save.mockImplementation((data) => Promise.resolve({ ...data, id: 'session-123' }));
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.login(loginDto, ip, userAgent);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(argon2.verify).toHaveBeenCalledWith(mockUser.password_hash, loginDto.password);
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockSessionRepository.delete).toHaveBeenCalledWith({ user_id: mockUser.id });
      expect(mockSessionRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: {
          access_token: 'access.token.here',
          refresh_token: 'refresh.token.here',
          token_type: 'Bearer',
          expires_in: 900,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            email_verified: mockUser.email_verified,
          },
        },
        meta: {
          timestamp: expect.any(String),
          request_id: expect.stringMatching(/^req_[a-z0-9]{12}$/),
        },
      });
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        new UnauthorizedException('Email veya şifre hatalı'),
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        failed_login_attempts: 0,
        locked_until: null,
        status: UserStatus.ACTIVE,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        new UnauthorizedException('Email veya şifre hatalı'),
      );

      expect(argon2.verify).toHaveBeenCalledWith(mockUser.password_hash, loginDto.password);
    });

    it('should increment failed login attempts on invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        failed_login_attempts: 2,
        locked_until: null,
        status: UserStatus.ACTIVE,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
      mockConfigService.get.mockImplementation((key) => {
        if (key === 'MAX_LOGIN_ATTEMPTS') return 5;
        if (key === 'LOCKOUT_DURATION_MINUTES') return 30;
        return null;
      });

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        new UnauthorizedException('Email veya şifre hatalı'),
      );

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failed_login_attempts: 3,
        }),
      );
    });

    it('should lock account after max failed attempts', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        failed_login_attempts: 4,
        locked_until: null,
        status: UserStatus.ACTIVE,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
      mockConfigService.get.mockImplementation((key) => {
        if (key === 'MAX_LOGIN_ATTEMPTS') return 5;
        if (key === 'LOCKOUT_DURATION_MINUTES') return 30;
        return 5;
      });

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        new UnauthorizedException('Email veya şifre hatalı'),
      );

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failed_login_attempts: 5,
          locked_until: expect.any(Date),
        }),
      );
    });

    it('should throw ForbiddenException for locked account', async () => {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        failed_login_attempts: 5,
        locked_until: lockUntil,
        status: UserStatus.ACTIVE,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(ForbiddenException);
      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringMatching(/Hesap kilitli/),
        }),
      );
    });

    it('should throw ForbiddenException for suspended account', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        failed_login_attempts: 0,
        locked_until: null,
        status: UserStatus.SUSPENDED,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        new ForbiddenException('Hesabınız askıya alınmış. Lütfen destek ekibi ile iletişime geçin.'),
      );
    });

    it('should reset failed attempts on successful login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        email_verified: true,
        failed_login_attempts: 3,
        locked_until: null,
        status: UserStatus.ACTIVE,
        last_login_at: null,
        last_login_ip: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');
      mockConfigService.get.mockReturnValue('RS256');
      mockSessionRepository.delete.mockResolvedValue({});
      mockSessionRepository.create.mockImplementation((data) => data);
      mockSessionRepository.save.mockImplementation((data) => Promise.resolve({ ...data, id: 'session-123' }));

      let savedUser = null;
      mockUserRepository.save.mockImplementation((user) => {
        savedUser = user;
        return Promise.resolve(user);
      });

      await service.login(loginDto, ip, userAgent);

      // Check that failed attempts were reset
      expect(savedUser).toMatchObject({
        failed_login_attempts: 0,
        locked_until: null,
      });
    });

    it('should update last login info', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        email_verified: true,
        failed_login_attempts: 0,
        locked_until: null,
        status: UserStatus.ACTIVE,
        last_login_at: null,
        last_login_ip: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');
      mockConfigService.get.mockReturnValue('RS256');
      mockSessionRepository.delete.mockResolvedValue({});
      mockSessionRepository.create.mockImplementation((data) => data);
      mockSessionRepository.save.mockImplementation((data) => Promise.resolve({ ...data, id: 'session-123' }));

      let savedUser = null;
      mockUserRepository.save.mockImplementation((user) => {
        savedUser = user;
        return Promise.resolve(user);
      });

      await service.login(loginDto, ip, userAgent);

      // Check that last login info was updated
      expect(savedUser).toMatchObject({
        last_login_at: expect.any(Date),
        last_login_ip: ip,
      });
    });

    it('should create a session with hashed refresh token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        email_verified: true,
        failed_login_attempts: 0,
        locked_until: null,
        status: UserStatus.ACTIVE,
        last_login_at: null,
        last_login_ip: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('refresh.token.here');
      mockConfigService.get.mockReturnValue('RS256');
      mockSessionRepository.delete.mockResolvedValue({});

      let createdSession = null;
      mockSessionRepository.create.mockImplementation((data) => {
        createdSession = data;
        return data;
      });
      mockSessionRepository.save.mockImplementation((data) => Promise.resolve({ ...data, id: 'session-123' }));
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.login(loginDto, ip, userAgent);

      expect(mockSessionRepository.delete).toHaveBeenCalledWith({ user_id: mockUser.id });
      expect(createdSession).toMatchObject({
        user_id: mockUser.id,
        refresh_token_hash: expect.any(String),
        expires_at: expect.any(Date),
        ip_address: ip,
        user_agent: userAgent,
        is_revoked: false,
      });
      expect(mockSessionRepository.save).toHaveBeenCalledWith(createdSession);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid.refresh.token',
    };

    it('should refresh token successfully with valid refresh token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_verified: true,
        status: UserStatus.ACTIVE,
      };

      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        user: mockUser,
        refresh_token_hash: crypto.createHash('sha256').update(refreshTokenDto.refresh_token).digest('hex'),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        is_revoked: false,
      };

      mockJwtService.verify.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        type: 'refresh',
        jti: 'token-id',
        iat: Math.floor(Date.now() / 1000),
      });

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockJwtService.sign.mockReturnValue('new.access.token');
      mockConfigService.get.mockReturnValue('RS256');

      const result = await service.refreshToken(refreshTokenDto);

      expect(mockJwtService.verify).toHaveBeenCalledWith(
        refreshTokenDto.refresh_token,
        { algorithms: ['RS256'] }
      );
      expect(mockSessionRepository.findOne).toHaveBeenCalledWith({
        where: { refresh_token_hash: mockSession.refresh_token_hash },
        relations: ['user'],
      });
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: {
          access_token: 'new.access.token',
          token_type: 'Bearer',
          expires_in: 900,
        },
        meta: {
          timestamp: expect.any(String),
          request_id: expect.stringMatching(/^req_[a-z0-9]{12}$/),
        },
      });
    });

    it('should throw UnauthorizedException for invalid JWT token', async () => {
      mockJwtService.verify.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Geçersiz refresh token'),
      );
    });

    it('should throw UnauthorizedException for non-refresh token type', async () => {
      mockJwtService.verify.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        type: 'access', // Wrong type
        iat: Math.floor(Date.now() / 1000),
      });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Geçersiz refresh token'),
      );
    });

    it('should throw UnauthorizedException when session not found', async () => {
      mockJwtService.verify.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        type: 'refresh',
        jti: 'token-id',
        iat: Math.floor(Date.now() / 1000),
      });

      mockSessionRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Geçersiz refresh token'),
      );
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        refresh_token_hash: crypto.createHash('sha256').update(refreshTokenDto.refresh_token).digest('hex'),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_revoked: true, // Revoked
      };

      mockJwtService.verify.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        type: 'refresh',
        jti: 'token-id',
        iat: Math.floor(Date.now() / 1000),
      });

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Token iptal edilmiş'),
      );
    });

    it('should throw UnauthorizedException for expired session', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        refresh_token_hash: crypto.createHash('sha256').update(refreshTokenDto.refresh_token).digest('hex'),
        expires_at: new Date(Date.now() - 1000), // Expired
        is_revoked: false,
      };

      mockJwtService.verify.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        type: 'refresh',
        jti: 'token-id',
        iat: Math.floor(Date.now() / 1000),
      });

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Token süresi dolmuş'),
      );
    });

    it('should throw ForbiddenException for suspended user account', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        status: UserStatus.SUSPENDED, // Suspended
      };

      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        user: mockUser,
        refresh_token_hash: crypto.createHash('sha256').update(refreshTokenDto.refresh_token).digest('hex'),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_revoked: false,
      };

      mockJwtService.verify.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        type: 'refresh',
        jti: 'token-id',
        iat: Math.floor(Date.now() / 1000),
      });

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new ForbiddenException('Hesabınız askıya alınmış. Lütfen destek ekibi ile iletişime geçin.'),
      );
    });

    it('should throw ForbiddenException for locked user account', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        status: UserStatus.LOCKED, // Locked
      };

      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        user: mockUser,
        refresh_token_hash: crypto.createHash('sha256').update(refreshTokenDto.refresh_token).digest('hex'),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_revoked: false,
      };

      mockJwtService.verify.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        type: 'refresh',
        jti: 'token-id',
        iat: Math.floor(Date.now() / 1000),
      });

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new ForbiddenException('Hesabınız askıya alınmış. Lütfen destek ekibi ile iletişime geçin.'),
      );
    });

    it('should throw ForbiddenException when user is not found in session', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        user: null, // User not found
        refresh_token_hash: crypto.createHash('sha256').update(refreshTokenDto.refresh_token).digest('hex'),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_revoked: false,
      };

      mockJwtService.verify.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        type: 'refresh',
        jti: 'token-id',
        iat: Math.floor(Date.now() / 1000),
      });

      mockSessionRepository.findOne.mockResolvedValue(mockSession);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new ForbiddenException('Hesabınız askıya alınmış. Lütfen destek ekibi ile iletişime geçin.'),
      );
    });

    it('should handle unexpected errors', async () => {
      // Mock JWT verify to throw a non-standard error to trigger the catch block
      mockJwtService.verify.mockRejectedValue(new Error('Invalid token'));

      // Since the JWT verification fails, it will throw UnauthorizedException
      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Geçersiz refresh token'),
      );
    });
  });
});