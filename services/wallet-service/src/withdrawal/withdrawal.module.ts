import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { CryptoWithdrawalRequest } from './entities/crypto-withdrawal-request.entity';
import { WhitelistedAddress } from './entities/whitelisted-address.entity';
import { UserWallet } from '../wallet/entities/user-wallet.entity';
import { FiatAccount } from '../wallet/entities/fiat-account.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { AddressValidationService } from './services/address-validation.service';
import { FeeCalculationService } from './services/fee-calculation.service';
import { TwoFactorVerificationService } from './services/two-factor-verification.service';
import { HttpModule } from '@nestjs/axios';

/**
 * WithdrawalModule
 * Handles TRY and crypto (BTC/ETH/USDT) withdrawal operations
 * Story 2.3: TRY Withdrawal
 * Story 2.5: Crypto Withdrawal
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([
      WithdrawalRequest,
      CryptoWithdrawalRequest,
      WhitelistedAddress,
      UserWallet,
      FiatAccount,
      LedgerEntry,
    ]),
  ],
  controllers: [WithdrawalController],
  providers: [
    WithdrawalService,
    AddressValidationService,
    FeeCalculationService,
    TwoFactorVerificationService,
  ],
  exports: [
    WithdrawalService,
    AddressValidationService,
    FeeCalculationService,
    TwoFactorVerificationService,
  ],
})
export class WithdrawalModule {}
