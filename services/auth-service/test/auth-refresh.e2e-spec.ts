import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User, UserStatus } from '../src/auth/entities/user.entity';
import { Session } from '../src/auth/entities/session.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthController - Refresh Token (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await dataSource.getRepository(Session).delete({});
    await dataSource.getRepository(User).delete({});
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully with valid refresh token', async () => {
      // Create test user
      const userRepository = dataSource.getRepository(User);
      const user = userRepository.create({
        email: 'test@example.com',
        password_hash: await argon2.hash('SecurePass123!'),
        email_verified: true,
        status: UserStatus.ACTIVE,
        terms_accepted: true,
        kvkk_consent_accepted: true,
      });
      await userRepository.save(user);

      // Generate valid refresh token
      const refreshToken = jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          type: 'refresh',
          jti: crypto.randomUUID(),
          iat: Math.floor(Date.now() / 1000),
        },
        {
          algorithm: 'RS256',
          expiresIn: '30d',
        },
      );

      // Create session
      const sessionRepository = dataSource.getRepository(Session);
      const session = sessionRepository.create({
        user_id: user.id,
        refresh_token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        is_revoked: false,
      });
      await sessionRepository.save(session);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          access_token: expect.any(String),
          token_type: 'Bearer',
          expires_in: 900,
        },
        meta: {
          timestamp: expect.any(String),
          request_id: expect.stringMatching(/^req_[a-z0-9]{12}$/),
        },
      });

      // Verify the new access token
      const decoded = jwtService.verify(response.body.data.access_token);
      expect(decoded).toMatchObject({
        sub: user.id,
        email: user.email,
        type: 'access',
      });
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining(['Refresh token zorunludur']),
        error: 'Bad Request',
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'invalid.token.here',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Geçersiz refresh token',
        error: 'Unauthorized',
      });
    });

    it('should return 401 for revoked token', async () => {
      // Create test user
      const userRepository = dataSource.getRepository(User);
      const user = userRepository.create({
        email: 'test@example.com',
        password_hash: await argon2.hash('SecurePass123!'),
        email_verified: true,
        status: UserStatus.ACTIVE,
        terms_accepted: true,
        kvkk_consent_accepted: true,
      });
      await userRepository.save(user);

      // Generate valid refresh token
      const refreshToken = jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          type: 'refresh',
          jti: crypto.randomUUID(),
          iat: Math.floor(Date.now() / 1000),
        },
        {
          algorithm: 'RS256',
          expiresIn: '30d',
        },
      );

      // Create revoked session
      const sessionRepository = dataSource.getRepository(Session);
      const session = sessionRepository.create({
        user_id: user.id,
        refresh_token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        is_revoked: true, // Revoked
      });
      await sessionRepository.save(session);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Token iptal edilmiş',
        error: 'Unauthorized',
      });
    });

    it('should return 401 for expired session', async () => {
      // Create test user
      const userRepository = dataSource.getRepository(User);
      const user = userRepository.create({
        email: 'test@example.com',
        password_hash: await argon2.hash('SecurePass123!'),
        email_verified: true,
        status: UserStatus.ACTIVE,
        terms_accepted: true,
        kvkk_consent_accepted: true,
      });
      await userRepository.save(user);

      // Generate valid refresh token
      const refreshToken = jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          type: 'refresh',
          jti: crypto.randomUUID(),
          iat: Math.floor(Date.now() / 1000),
        },
        {
          algorithm: 'RS256',
          expiresIn: '30d',
        },
      );

      // Create expired session
      const sessionRepository = dataSource.getRepository(Session);
      const session = sessionRepository.create({
        user_id: user.id,
        refresh_token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        expires_at: new Date(Date.now() - 1000), // Expired
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        is_revoked: false,
      });
      await sessionRepository.save(session);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Token süresi dolmuş',
        error: 'Unauthorized',
      });
    });

    it('should return 403 for suspended account', async () => {
      // Create suspended user
      const userRepository = dataSource.getRepository(User);
      const user = userRepository.create({
        email: 'test@example.com',
        password_hash: await argon2.hash('SecurePass123!'),
        email_verified: true,
        status: UserStatus.SUSPENDED, // Suspended
        terms_accepted: true,
        kvkk_consent_accepted: true,
      });
      await userRepository.save(user);

      // Generate valid refresh token
      const refreshToken = jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          type: 'refresh',
          jti: crypto.randomUUID(),
          iat: Math.floor(Date.now() / 1000),
        },
        {
          algorithm: 'RS256',
          expiresIn: '30d',
        },
      );

      // Create session
      const sessionRepository = dataSource.getRepository(Session);
      const session = sessionRepository.create({
        user_id: user.id,
        refresh_token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        is_revoked: false,
      });
      await sessionRepository.save(session);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        message: 'Hesabınız askıya alınmış. Lütfen destek ekibi ile iletişime geçin.',
        error: 'Forbidden',
      });
    });

    it('should return 401 when using access token instead of refresh token', async () => {
      // Create test user
      const userRepository = dataSource.getRepository(User);
      const user = userRepository.create({
        email: 'test@example.com',
        password_hash: await argon2.hash('SecurePass123!'),
        email_verified: true,
        status: UserStatus.ACTIVE,
        terms_accepted: true,
        kvkk_consent_accepted: true,
      });
      await userRepository.save(user);

      // Generate access token (not refresh token)
      const accessToken = jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          type: 'access', // Access token, not refresh
          iat: Math.floor(Date.now() / 1000),
        },
        {
          algorithm: 'RS256',
          expiresIn: '15m',
        },
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: accessToken,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Geçersiz refresh token',
        error: 'Unauthorized',
      });
    });

    it('should return 401 when session does not exist', async () => {
      // Create test user
      const userRepository = dataSource.getRepository(User);
      const user = userRepository.create({
        email: 'test@example.com',
        password_hash: await argon2.hash('SecurePass123!'),
        email_verified: true,
        status: UserStatus.ACTIVE,
        terms_accepted: true,
        kvkk_consent_accepted: true,
      });
      await userRepository.save(user);

      // Generate valid refresh token
      const refreshToken = jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          type: 'refresh',
          jti: crypto.randomUUID(),
          iat: Math.floor(Date.now() / 1000),
        },
        {
          algorithm: 'RS256',
          expiresIn: '30d',
        },
      );

      // No session created

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Geçersiz refresh token',
        error: 'Unauthorized',
      });
    });

    it('should handle rate limiting', async () => {
      // Create test user and session for valid token
      const userRepository = dataSource.getRepository(User);
      const user = userRepository.create({
        email: 'test@example.com',
        password_hash: await argon2.hash('SecurePass123!'),
        email_verified: true,
        status: UserStatus.ACTIVE,
        terms_accepted: true,
        kvkk_consent_accepted: true,
      });
      await userRepository.save(user);

      // Generate valid refresh token
      const refreshToken = jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          type: 'refresh',
          jti: crypto.randomUUID(),
          iat: Math.floor(Date.now() / 1000),
        },
        {
          algorithm: 'RS256',
          expiresIn: '30d',
        },
      );

      // Create session
      const sessionRepository = dataSource.getRepository(Session);
      const session = sessionRepository.create({
        user_id: user.id,
        refresh_token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        is_revoked: false,
      });
      await sessionRepository.save(session);

      // Make requests up to the rate limit (10 per hour default)
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({
            refresh_token: refreshToken,
          })
          .expect(200);
      }

      // The 11th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(429);

      expect(response.body).toMatchObject({
        statusCode: 429,
        message: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.',
      });
    });
  });
});