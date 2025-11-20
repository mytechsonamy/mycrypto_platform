import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { UserWallet } from './entities/user-wallet.entity';
import { FiatAccount } from './entities/fiat-account.entity';
import { RedisModule } from '../common/redis/redis.module';
import { JwtStrategy } from '../common/strategies/jwt.strategy';

/**
 * WalletModule
 * Provides wallet balance functionality
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserWallet, FiatAccount]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    RedisModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, JwtStrategy],
  exports: [WalletService],
})
export class WalletModule {}
