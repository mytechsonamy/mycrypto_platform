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
import { WithdrawalRequestService } from './services/withdrawal-request.service';
import { TransactionSigningService } from './services/transaction-signing.service';
import { BlockchainBroadcastingService } from './services/blockchain-broadcasting.service';
import { WithdrawalProcessingService } from './services/withdrawal-processing.service';
import { HttpModule } from '@nestjs/axios';
import { CryptoWithdrawalController } from './crypto/crypto-withdrawal.controller';
import { RedisService } from '../common/redis/redis.service';

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
  controllers: [WithdrawalController, CryptoWithdrawalController],
  providers: [
    WithdrawalService,
    AddressValidationService,
    FeeCalculationService,
    TwoFactorVerificationService,
    WithdrawalRequestService,
    TransactionSigningService,
    BlockchainBroadcastingService,
    WithdrawalProcessingService,
    RedisService,
  ],
  exports: [
    WithdrawalService,
    AddressValidationService,
    FeeCalculationService,
    TwoFactorVerificationService,
    WithdrawalRequestService,
    TransactionSigningService,
    BlockchainBroadcastingService,
    WithdrawalProcessingService,
  ],
})
export class WithdrawalModule {}
