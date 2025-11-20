import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './common/health.controller';
import { RedisModule } from './common/redis/redis.module';
import { WalletModule } from './wallet/wallet.module';
import { DepositModule } from './deposit/deposit.module';
import { WithdrawalModule } from './withdrawal/withdrawal.module';
import { LedgerModule } from './ledger/ledger.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database - PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get('DATABASE_URL');

        // Parse DATABASE_URL if provided (format: postgresql://user:pass@host:port/db)
        if (databaseUrl) {
          const url = new URL(databaseUrl);
          return {
            type: 'postgres',
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.slice(1), // Remove leading slash
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: configService.get('NODE_ENV') === 'development',
            logging: configService.get('NODE_ENV') === 'development',
          };
        }

        // Fallback to individual environment variables
        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST', 'localhost'),
          port: configService.get('DATABASE_PORT', 5432),
          username: configService.get('DATABASE_USER', 'postgres'),
          password: configService.get('DATABASE_PASSWORD', 'postgres'),
          database: configService.get('DATABASE_NAME', 'exchange_dev'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('RATE_LIMIT_TTL', 60) * 1000,
          limit: configService.get('RATE_LIMIT_LIMIT', 100),
        },
      ],
      inject: [ConfigService],
    }),

    // Redis for caching and real-time updates
    RedisModule,

    // Feature modules
    WalletModule,
    DepositModule,
    WithdrawalModule,
    LedgerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
