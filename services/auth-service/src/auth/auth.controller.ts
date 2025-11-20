import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Ip,
  Headers,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './dto/refresh-token.dto';
import { LogoutDto, LogoutResponseDto } from './dto/logout.dto';
import { PasswordResetRequestDto, PasswordResetRequestResponseDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto, PasswordResetConfirmResponseDto } from './dto/password-reset-confirm.dto';
import { ConfigurableRateLimit } from '../common/decorators/configurable-rate-limit.decorator';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard';
import { RecaptchaGuard } from '../common/guards/recaptcha.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RecaptchaGuard, RateLimiterGuard)
  @ConfigurableRateLimit({
    limitConfigKey: 'RATE_LIMIT_REGISTER_LIMIT',
    windowConfigKey: 'RATE_LIMIT_REGISTER_WINDOW_MS',
    keyPrefix: 'rate_limit:register',
    defaultLimit: 5,
    defaultWindowMs: 3600000, // 1 hour
  })
  @ApiOperation({
    summary: 'User Registration',
    description: 'Register a new user with email and password. Requires reCAPTCHA v3 token in X-Recaptcha-Token header.',
  })
  @ApiHeader({
    name: 'X-Recaptcha-Token',
    description: 'Google reCAPTCHA v3 token obtained from client-side reCAPTCHA execution',
    required: true,
    schema: { type: 'string' },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6' },
                email: { type: 'string', example: 'user@example.com' },
                email_verified: { type: 'boolean', example: false },
                created_at: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
              },
            },
            message: {
              type: 'string',
              example: 'Kayıt başarılı. Lütfen email adresinize gönderilen doğrulama linkine tıklayınız.',
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'password' },
                  message: {
                    type: 'string',
                    example: 'Şifre en az 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermelidir',
                  },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'reCAPTCHA verification failed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'RECAPTCHA_FAILED' },
            message: { type: 'string', example: 'Bot algılandı. Lütfen tekrar deneyin.' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email already registered',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'EMAIL_ALREADY_EXISTS' },
            message: { type: 'string', example: 'Bu email zaten kayıtlı' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
            message: { type: 'string', example: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ip: string,
  ) {
    return await this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 attempts per hour
  @ApiOperation({
    summary: 'Verify Email Address',
    description: 'Verify user email address using the token sent via email',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Email adresi başarıyla doğrulandı' },
        data: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'user@example.com' },
            emailVerified: { type: 'boolean', example: true },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'INVALID_TOKEN' },
            message: { type: 'string', example: 'Geçersiz doğrulama kodu' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
            message: { type: 'string', example: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return await this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 attempts per hour per IP
  @ApiOperation({
    summary: 'Resend Verification Email',
    description: 'Send a new verification email to the specified email address',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Doğrulama emaili tekrar gönderildi' },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Email already verified',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'ALREADY_VERIFIED' },
            message: { type: 'string', example: 'Email adresi zaten doğrulanmış' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'EMAIL_NOT_FOUND' },
            message: { type: 'string', example: 'Email adresi bulunamadı' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
            message: { type: 'string', example: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return await this.authService.resendVerification(resendVerificationDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @ConfigurableRateLimit({
    limitConfigKey: 'RATE_LIMIT_LOGIN_LIMIT',
    windowConfigKey: 'RATE_LIMIT_LOGIN_WINDOW_MS',
    keyPrefix: 'rate_limit:login',
    defaultLimit: 10,
    defaultWindowMs: 900000, // 15 minutes
  })
  @ApiOperation({
    summary: 'User Login',
    description: 'Authenticate user and get JWT tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'JWT access token (15 min expiry, RS256)',
              example: 'eyJhbGciOiJSUzI1NiIs...',
            },
            refresh_token: {
              type: 'string',
              description: 'JWT refresh token (30 days expiry)',
              example: 'eyJhbGciOiJSUzI1NiIs...',
            },
            token_type: { type: 'string', example: 'Bearer' },
            expires_in: { type: 'number', example: 900, description: 'Access token expiry in seconds' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6' },
                email: { type: 'string', example: 'user@example.com' },
                email_verified: { type: 'boolean', example: true },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Geçersiz email formatı' },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'INVALID_CREDENTIALS' },
            message: { type: 'string', example: 'Email veya şifre hatalı' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Account locked or suspended',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'ACCOUNT_LOCKED' },
            message: {
              type: 'string',
              example: 'Hesap kilitli. Lütfen 30 dakika sonra tekrar deneyin.',
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
            message: {
              type: 'string',
              example: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.',
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return await this.authService.login(loginDto, ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @ConfigurableRateLimit({
    limitConfigKey: 'RATE_LIMIT_REFRESH_LIMIT',
    windowConfigKey: 'RATE_LIMIT_REFRESH_WINDOW_MS',
    keyPrefix: 'rate_limit:refresh',
    defaultLimit: 10,
    defaultWindowMs: 3600000, // 1 hour
  })
  @ApiOperation({
    summary: 'Refresh Access Token',
    description: 'Get a new access token using a valid refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: RefreshTokenResponseDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'New JWT access token (15 min expiry, RS256)',
              example: 'eyJhbGciOiJSUzI1NiIs...',
            },
            token_type: { type: 'string', example: 'Bearer' },
            expires_in: { type: 'number', example: 900, description: 'Access token expiry in seconds' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Missing refresh token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'refresh_token' },
                  message: { type: 'string', example: 'Refresh token zorunludur' },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'INVALID_TOKEN' },
            message: {
              type: 'string',
              example: 'Geçersiz refresh token',
              description: 'Can also be: "Token iptal edilmiş" or "Token süresi dolmuş"',
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Account suspended or locked',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'ACCOUNT_SUSPENDED' },
            message: {
              type: 'string',
              example: 'Hesabınız askıya alınmış. Lütfen destek ekibi ile iletişime geçin.',
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
            message: {
              type: 'string',
              example: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.',
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User Logout',
    description: 'Logout user and invalidate current access token',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Başarıyla çıkış yapıldı' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
  })
  async logout(
    @Request() req,
    @Body() logoutDto: LogoutDto,
  ): Promise<{
    success: boolean;
    data: LogoutResponseDto;
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    const userId = req.user.userId;
    const accessToken = req.accessToken;

    return this.authService.logout(userId, accessToken, logoutDto);
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @ConfigurableRateLimit({
    limitConfigKey: 'RATE_LIMIT_PASSWORD_RESET_LIMIT',
    windowConfigKey: 'RATE_LIMIT_PASSWORD_RESET_WINDOW_MS',
    keyPrefix: 'rate_limit:password_reset',
    defaultLimit: 3,
    defaultWindowMs: 3600000, // 1 hour
  })
  @ApiOperation({
    summary: 'Request Password Reset',
    description: 'Send password reset email to user. Always returns success to prevent user enumeration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Şifre sıfırlama linki email adresinize gönderildi' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
  })
  async requestPasswordReset(
    @Body() passwordResetRequestDto: PasswordResetRequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<{
    success: boolean;
    data: PasswordResetRequestResponseDto;
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    return this.authService.requestPasswordReset(
      passwordResetRequestDto,
      ip,
      userAgent || 'Unknown',
    );
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm Password Reset',
    description: 'Reset password using the token from email',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Şifreniz başarıyla sıfırlandı. Lütfen yeni şifrenizle giriş yapın.' },
          },
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time', example: '2025-11-19T10:30:45.123Z' },
            request_id: { type: 'string', example: 'req_abc123def456' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token, or password validation failed',
  })
  async confirmPasswordReset(
    @Body() passwordResetConfirmDto: PasswordResetConfirmDto,
  ): Promise<{
    success: boolean;
    data: PasswordResetConfirmResponseDto;
    meta: {
      timestamp: string;
      request_id: string;
    };
  }> {
    return this.authService.confirmPasswordReset(passwordResetConfirmDto);
  }
}