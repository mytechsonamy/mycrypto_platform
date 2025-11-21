import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CryptoDepositController } from './crypto-deposit.controller';
import { CryptoDepositService } from './services/crypto-deposit.service';
import { HDWalletService } from './services/hd-wallet.service';
import { BlockCypherService } from './services/blockcypher.service';
import { QRCodeService } from './services/qrcode.service';
import { KycVerificationService } from '../../common/services/kyc-verification.service';
import { NotificationService } from '../../common/services/notification.service';
import { WalletModule } from '../../wallet/wallet.module';
import { BlockchainAddress } from './entities/blockchain-address.entity';
import { BlockchainTransaction } from './entities/blockchain-transaction.entity';

/**
 * CryptoDepositModule
 * Handles cryptocurrency deposits (BTC, ETH, USDT)
 * - HD Wallet (BIP-44) address generation
 * - BlockCypher API integration for blockchain monitoring
 * - Automatic deposit detection and wallet crediting
 * - KYC Level 1 verification required
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    WalletModule,
    TypeOrmModule.forFeature([BlockchainAddress, BlockchainTransaction]),
  ],
  controllers: [CryptoDepositController],
  providers: [
    CryptoDepositService,
    HDWalletService,
    BlockCypherService,
    QRCodeService,
    KycVerificationService,
    NotificationService,
  ],
  exports: [CryptoDepositService],
})
export class CryptoDepositModule {}
