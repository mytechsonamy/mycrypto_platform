import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RabbitMQService } from '../common/services/rabbitmq.service';
import { EmailService } from '../common/services/email.service';
import { RedisService } from '../common/services/redis.service';
import { WhitelistService } from '../common/services/whitelist.service';
import { RecaptchaService } from '../common/services/recaptcha.service';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard';
import { RecaptchaGuard } from '../common/guards/recaptcha.guard';
import { emailConfig } from '../common/config/email.config';
import { jwtConfig } from '../common/config/jwt.config';
import { TwoFactorModule } from './two-factor/two-factor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, PasswordResetToken]),
    ConfigModule.forFeature(emailConfig),
    ConfigModule.forFeature(jwtConfig),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    forwardRef(() => TwoFactorModule), // Import TwoFactorModule with forwardRef
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const algorithm = configService.get<string>('jwt.algorithm', 'RS256');
        const signOptions = configService.get('jwt.signOptions');

        // Load keys based on algorithm
        if (algorithm === 'RS256') {
          // RSA keys for asymmetric signing
          return {
            privateKey: configService.get<string>('jwt.privateKey'),
            publicKey: configService.get<string>('jwt.publicKey'),
            signOptions,
          };
        } else {
          // Fallback to symmetric signing for backwards compatibility
          return {
            secret: configService.get<string>('jwt.privateKey'),
            signOptions: {
              ...signOptions,
              algorithm: 'HS256',
            },
          };
        }
      },
      inject: [ConfigService],
    }),
    ThrottlerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenBlacklistService,
    JwtStrategy,
    EmailService,
    RabbitMQService,
    RedisService,
    WhitelistService,
    RecaptchaService,
    RateLimiterGuard,
    RecaptchaGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [AuthService, TokenBlacklistService, EmailService, RedisService, RecaptchaService],
})
export class AuthModule {}