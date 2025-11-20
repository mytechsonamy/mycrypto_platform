import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DepositService } from './deposit.service';
import { DepositController } from './deposit.controller';
import { FiatAccount } from '../wallet/entities/fiat-account.entity';
import { DepositRequest } from './entities/deposit-request.entity';

/**
 * DepositModule
 * Manages TRY deposit operations including bank account management
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([FiatAccount, DepositRequest]),
  ],
  controllers: [DepositController],
  providers: [DepositService],
  exports: [DepositService],
})
export class DepositModule {}
