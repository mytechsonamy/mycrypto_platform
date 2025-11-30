import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { KycModule } from './kyc/kyc.module';
import { TradingModule } from './trading/trading.module';
import { MarketModule } from './market/market.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development', // Auto-sync in dev only
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Rate limiting - configured per controller
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get('NODE_ENV', 'development');
        // In development/testing, use much higher limits to allow QA testing
        if (nodeEnv !== 'production') {
          return [
            {
              ttl: 60000, // 1 minute window
              limit: 1000, // 1000 requests per minute (essentially unlimited for testing)
            },
          ];
        }
        // In production, use stricter limits
        return [
          {
            ttl: configService.get('RATE_LIMIT_WINDOW_MS', 60000),
            limit: configService.get('RATE_LIMIT_MAX_REQUESTS', 100),
          },
        ];
      },
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    KycModule,
    TradingModule,
    MarketModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}