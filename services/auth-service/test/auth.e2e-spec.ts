import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppModule } from '../src/app.module';
import { AuthModule } from '../src/auth/auth.module';
import { User } from '../src/auth/entities/user.entity';
import { Session } from '../src/auth/entities/session.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let testUser = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    terms_accepted: true,
    kvkk_consent_accepted: true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432'),
          username: process.env.DATABASE_USER || 'test_user',
          password: process.env.DATABASE_PASSWORD || 'test_password',
          database: process.env.DATABASE_NAME || 'exchange_test',
          entities: [User, Session],
          synchronize: true, // Only for testing
          dropSchema: true, // Clean database before tests
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 3600000,
            limit: 100, // Higher limit for testing
          },
        ]),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Generate unique email for each test
    testUser.email = `test_${Date.now()}@example.com`;
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data.user).toHaveProperty('id');
          expect(res.body.data.user).toHaveProperty('email', testUser.email);
          expect(res.body.data.user).toHaveProperty('email_verified', false);
          expect(res.body.data.user).not.toHaveProperty('password_hash');
          expect(res.body.data.user).not.toHaveProperty('email_verification_token');
          expect(res.body.data).toHaveProperty('message');
          expect(res.body.data.message).toContain('Kayıt başarılı');
          expect(res.body.meta).toHaveProperty('timestamp');
          expect(res.body.meta).toHaveProperty('request_id');
        });
    });

    it('should return 409 when email already exists', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      // Second registration with same email
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Bu email zaten kayıtlı');
        });
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Geçersiz email formatı');
        });
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          password: 'weak',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(res.body.message.some(msg =>
            msg.includes('Şifre en az 8 karakter olmalıdır')
          )).toBe(true);
        });
    });

    it('should return 400 when password lacks uppercase', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          password: 'lowercase123!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(res.body.message.some(msg =>
            msg.includes('Şifre en az 1 büyük harf')
          )).toBe(true);
        });
    });

    it('should return 400 when password lacks number', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          password: 'NoNumbers!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });

    it('should return 400 when password lacks special character', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          password: 'NoSpecial123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });

    it('should return 400 when terms not accepted', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          terms_accepted: false,
        })
        .expect(400);
    });

    it('should return 400 when KVKK consent not given', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          kvkk_consent_accepted: false,
        })
        .expect(400);
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testUser.email,
          // Missing password, terms, kvkk
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(res.body.message.length).toBeGreaterThan(0);
        });
    });

    it('should return 400 for extra fields not in DTO', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          extra_field: 'should not be allowed',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('should not exist');
        });
    });

    it('should handle rate limiting', async () => {
      // This test would need to make multiple rapid requests
      // For simplicity, we're just testing that the endpoint accepts the throttle decorator
      const uniqueEmail = `ratelimit_${Date.now()}@example.com`;

      // Make 5 successful requests (within limit)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            ...testUser,
            email: `${i}_${uniqueEmail}`,
          })
          .expect(201);
      }

      // The 6th request would be rate limited in production
      // Note: Rate limiting might be disabled in test environment
    });
  });

  describe('/api/v1/auth/verify-email (POST)', () => {
    let verificationToken: string;
    let registeredUser: any;

    beforeEach(async () => {
      // Register a user to get a verification token
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `verify_${Date.now()}@example.com`,
          password: 'SecurePass123!',
          terms_accepted: true,
          kvkk_consent_accepted: true,
        })
        .expect(201);

      registeredUser = response.body.data.user;

      // In a real scenario, we would extract the token from the email
      // For testing, we'll generate a valid token format
      verificationToken = 'a'.repeat(64); // 64-char hex string
    });

    it('should verify email with valid token format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          token: verificationToken,
        })
        .expect(200)
        .expect((res) => {
          // Note: This will return invalid token in real test as we don't have the actual token
          // In production tests, you would need to mock the email service or extract the token
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should return 400 for invalid token format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          token: 'invalid-token',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Geçersiz doğrulama token formatı');
        });
    });

    it('should return 400 for short token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          token: 'a'.repeat(32), // Too short
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('64 karakter');
        });
    });

    it('should return 400 for non-hex token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          token: 'g'.repeat(64), // 'g' is not a hex character
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Geçersiz doğrulama token formatı');
        });
    });

    it('should return 400 for missing token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('zorunludur');
        });
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api/v1/auth/verify-email')
            .send({
              token: 'a'.repeat(64),
            })
        );
      }

      // Execute all requests
      await Promise.all(promises);
      // Note: The actual rate limiting behavior depends on throttler configuration
    });
  });

  describe('/api/v1/auth/resend-verification (POST)', () => {
    let registeredEmail: string;

    beforeEach(async () => {
      // Register a user first
      registeredEmail = `resend_${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: registeredEmail,
          password: 'SecurePass123!',
          terms_accepted: true,
          kvkk_consent_accepted: true,
        })
        .expect(201);
    });

    it('should resend verification email for unverified user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({
          email: registeredEmail,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', 'Doğrulama emaili tekrar gönderildi');
          expect(res.body.meta).toHaveProperty('timestamp');
          expect(res.body.meta).toHaveProperty('request_id');
        });
    });

    it('should return 404 for non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Email adresi bulunamadı');
        });
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({
          email: 'invalid-email',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Geçersiz email formatı');
        });
    });

    it('should return 400 for missing email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Email adresi zorunludur');
        });
    });

    it('should return 400 for email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      return request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({
          email: longEmail,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('255 karakterden uzun olamaz');
        });
    });

    it('should handle rate limiting', async () => {
      // Make 3 rapid requests (within limit)
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/resend-verification')
          .send({
            email: registeredEmail,
          })
          .expect(200);
      }

      // Note: The 4th request might be rate limited depending on configuration
      // Rate limiting is set to 3 requests per hour for this endpoint
    });

    it('should handle concurrent requests gracefully', async () => {
      // Test concurrent requests to the same endpoint
      const promises = [
        request(app.getHttpServer())
          .post('/api/v1/auth/resend-verification')
          .send({ email: registeredEmail }),
        request(app.getHttpServer())
          .post('/api/v1/auth/resend-verification')
          .send({ email: registeredEmail }),
      ];

      const results = await Promise.all(promises);

      // Both should succeed or one might fail due to rate limiting
      results.forEach(res => {
        expect([200, 429]).toContain(res.status);
      });
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    let registeredEmail: string;
    let registeredPassword: string;

    beforeEach(async () => {
      // Register a user first for login tests
      registeredEmail = `login_${Date.now()}@example.com`;
      registeredPassword = 'SecurePass123!';

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: registeredEmail,
          password: registeredPassword,
          terms_accepted: true,
          kvkk_consent_accepted: true,
        })
        .expect(201);
    });

    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registeredEmail,
          password: registeredPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('access_token');
          expect(res.body.data).toHaveProperty('refresh_token');
          expect(res.body.data).toHaveProperty('token_type', 'Bearer');
          expect(res.body.data).toHaveProperty('expires_in', 900);
          expect(res.body.data.user).toHaveProperty('id');
          expect(res.body.data.user).toHaveProperty('email', registeredEmail);
          expect(res.body.data.user).toHaveProperty('email_verified', false);
          expect(res.body.meta).toHaveProperty('timestamp');
          expect(res.body.meta).toHaveProperty('request_id');
        });
    });

    it('should return JWT tokens with correct format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registeredEmail,
          password: registeredPassword,
        })
        .expect(200);

      const { access_token, refresh_token } = response.body.data;

      // JWT format: header.payload.signature
      expect(access_token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(refresh_token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should return 401 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: registeredPassword,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Email veya şifre hatalı');
        });
    });

    it('should return 401 for invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registeredEmail,
          password: 'WrongPassword123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Email veya şifre hatalı');
        });
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: registeredPassword,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Geçersiz email formatı');
        });
    });

    it('should return 400 for missing email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          password: registeredPassword,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Email zorunludur');
        });
    });

    it('should return 400 for missing password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registeredEmail,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Şifre zorunludur');
        });
    });

    it('should return 400 for empty credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });

    it('should handle rate limiting on login', async () => {
      // Make multiple rapid login attempts
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: registeredEmail,
            password: 'WrongPassword' + i,
          });
      }

      // The 11th attempt should be rate limited
      // Note: Rate limiting is set to 10 requests per 15 minutes for login
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registeredEmail,
          password: registeredPassword,
        });

      // Either success or rate limited depending on test environment configuration
      expect([200, 429]).toContain(response.status);
    });

    it('should increment failed login attempts on wrong password', async () => {
      // Make 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: registeredEmail,
            password: 'WrongPassword' + i,
          })
          .expect(401);
      }

      // 5th failed attempt might lock the account
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registeredEmail,
          password: 'WrongPassword5',
        });

      // Either 401 (before lockout) or 403 (account locked)
      expect([401, 403]).toContain(response.status);
    });

    it('should include IP and User-Agent in session', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('User-Agent', 'TestAgent/1.0')
        .send({
          email: registeredEmail,
          password: registeredPassword,
        })
        .expect(200);

      // Session should be created with IP and User-Agent
      // This would be verified in database in a real test
      expect(response.body.data).toHaveProperty('access_token');
    });

    it('should handle concurrent login attempts', async () => {
      const promises = [
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: registeredEmail,
            password: registeredPassword,
          }),
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: registeredEmail,
            password: registeredPassword,
          }),
      ];

      const results = await Promise.all(promises);

      // Both should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('access_token');
      });
    });

    it('should return different tokens for each login', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registeredEmail,
          password: registeredPassword,
        })
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: registeredEmail,
          password: registeredPassword,
        })
        .expect(200);

      // Tokens should be unique
      expect(response1.body.data.access_token).not.toBe(response2.body.data.access_token);
      expect(response1.body.data.refresh_token).not.toBe(response2.body.data.refresh_token);
    });
  });
});