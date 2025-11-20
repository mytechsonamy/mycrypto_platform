import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { UserWallet } from '../wallet/entities/user-wallet.entity';
import { FiatAccount } from '../wallet/entities/fiat-account.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';

/**
 * WithdrawalModule
 * Handles TRY withdrawal operations
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      WithdrawalRequest,
      UserWallet,
      FiatAccount,
      LedgerEntry,
    ]),
  ],
  controllers: [WithdrawalController],
  providers: [WithdrawalService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
