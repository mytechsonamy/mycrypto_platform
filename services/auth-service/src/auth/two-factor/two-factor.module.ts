import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { Redis2FAService } from './utils/redis-2fa.service';
import { User } from '../entities/user.entity';
import { TwoFactorAuth } from '../entities/two-factor-auth.entity';
import { TwoFactorBackupCode } from '../entities/two-factor-backup-code.entity';
import { TwoFactorAuditLog } from '../entities/two-factor-audit-log.entity';
import { RedisService } from '../../common/services/redis.service';
import { AuthModule } from '../auth.module';

/**
 * Module for Two-Factor Authentication functionality
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      TwoFactorAuth,
      TwoFactorBackupCode,
      TwoFactorAuditLog,
    ]),
    ConfigModule,
    forwardRef(() => AuthModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [TwoFactorController],
  providers: [
    TwoFactorService,
    Redis2FAService,
    RedisService,
  ],
  exports: [TwoFactorService], // Export for use in AuthModule
})
export class TwoFactorModule {}