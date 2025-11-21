import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainAddress } from '../entities/blockchain-address.entity';
import { BlockchainTransaction } from '../entities/blockchain-transaction.entity';
import { HDWalletService } from './hd-wallet.service';
import { BlockCypherService } from './blockcypher.service';
import { QRCodeService } from './qrcode.service';
import { WalletService } from '../../../wallet/wallet.service';
import { NotificationService } from '../../../common/services/notification.service';
import {
  GenerateAddressDto,
  DepositAddressResponseDto,
  CryptoCurrency,
} from '../dto/generate-address.dto';
import {
  TransactionStatusDto,
  DepositHistoryDto,
} from '../dto/transaction-status.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * CryptoDepositService
 * Handles cryptocurrency deposit operations for BTC, ETH, and USDT
 * - Generates unique deposit addresses using HD Wallet (BIP-44)
 * - Monitors blockchain for incoming transactions via BlockCypher
 * - Credits user wallets when transactions are confirmed
 */
@Injectable()
export class CryptoDepositService {
  private readonly logger = new Logger(CryptoDepositService.name);

  constructor(
    @InjectRepository(BlockchainAddress)
    private readonly addressRepository: Repository<BlockchainAddress>,
    @InjectRepository(BlockchainTransaction)
    private readonly transactionRepository: Repository<BlockchainTransaction>,
    private readonly hdWalletService: HDWalletService,
    private readonly blockCypherService: BlockCypherService,
    private readonly qrCodeService: QRCodeService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Generate a new deposit address for a user
   * @param userId - User ID from JWT
   * @param dto - Currency to generate address for
   * @returns Deposit address details with QR code
   */
  async generateDepositAddress(
    userId: string,
    dto: GenerateAddressDto,
  ): Promise<DepositAddressResponseDto> {
    const traceId = uuidv4();

    this.logger.log({
      message: 'Generating deposit address',
      trace_id: traceId,
      user_id: userId,
      currency: dto.currency,
    });

    try {
      // Check if user already has an active address for this currency
      const existingAddress = await this.addressRepository.findOne({
        where: {
          userId,
          currency: dto.currency,
          isActive: true,
        },
      });

      if (existingAddress) {
        this.logger.log({
          message: 'Returning existing active address',
          trace_id: traceId,
          user_id: userId,
          currency: dto.currency,
          address_id: existingAddress.id,
        });

        return this.mapToAddressResponse(existingAddress);
      }

      // Get the next available address index for this currency
      const maxIndex = await this.getMaxAddressIndex(dto.currency);
      const nextIndex = this.hdWalletService.getNextAddressIndex(dto.currency, maxIndex);

      // Generate address based on currency
      let addressData: { address: string; derivationPath: string; publicKey: string };

      switch (dto.currency) {
        case CryptoCurrency.BTC:
          addressData = this.hdWalletService.generateBtcAddress(nextIndex);
          break;
        case CryptoCurrency.ETH:
          addressData = this.hdWalletService.generateEthAddress(nextIndex);
          break;
        case CryptoCurrency.USDT:
          addressData = this.hdWalletService.generateUsdtAddress(nextIndex);
          break;
        default:
          throw new BadRequestException(`Unsupported currency: ${dto.currency}`);
      }

      // Generate QR code for the address
      const qrCodeUrl = await this.qrCodeService.generateQRCode(addressData.address);

      // Save address to database
      const blockchainAddress = this.addressRepository.create({
        userId,
        currency: dto.currency,
        address: addressData.address,
        addressIndex: nextIndex,
        derivationPath: addressData.derivationPath,
        publicKey: addressData.publicKey,
        qrCodeUrl,
        isActive: true,
      });

      const saved = await this.addressRepository.save(blockchainAddress);

      // Register webhook with BlockCypher for transaction monitoring
      try {
        const webhook = await this.blockCypherService.registerAddressWebhook(
          dto.currency,
          addressData.address,
        );

        this.logger.log({
          message: 'Webhook registered for address monitoring',
          trace_id: traceId,
          address_id: saved.id,
          webhook_id: webhook.id,
        });
      } catch (webhookError) {
        this.logger.warn({
          message: 'Failed to register webhook, will use polling',
          trace_id: traceId,
          address_id: saved.id,
          error: webhookError.message,
        });
      }

      this.logger.log({
        message: 'Deposit address generated successfully',
        trace_id: traceId,
        user_id: userId,
        currency: dto.currency,
        address_id: saved.id,
      });

      return this.mapToAddressResponse(saved);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.logger.error({
        message: 'Failed to generate deposit address',
        trace_id: traceId,
        user_id: userId,
        currency: dto.currency,
        error: error.message,
      });

      throw new BadRequestException({
        error: 'GENERATE_ADDRESS_FAILED',
        message: 'Failed to generate deposit address',
      });
    }
  }

  /**
   * Get user's deposit address for a currency
   * @param userId - User ID
   * @param currency - BTC, ETH, or USDT
   * @returns Active deposit address
   */
  async getUserDepositAddress(
    userId: string,
    currency: string,
  ): Promise<DepositAddressResponseDto> {
    const address = await this.addressRepository.findOne({
      where: {
        userId,
        currency,
        isActive: true,
      },
    });

    if (!address) {
      throw new NotFoundException({
        error: 'ADDRESS_NOT_FOUND',
        message: `No active ${currency} deposit address found`,
      });
    }

    return this.mapToAddressResponse(address);
  }

  /**
   * Get deposit transaction history for a user
   * @param userId - User ID
   * @param currency - Optional currency filter
   * @param page - Page number
   * @param pageSize - Page size
   * @returns Deposit history
   */
  async getDepositHistory(
    userId: string,
    currency?: string,
    page = 1,
    pageSize = 20,
  ): Promise<DepositHistoryDto> {
    const whereClause: any = { userId };
    if (currency) {
      whereClause.currency = currency;
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: whereClause,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      transactions: transactions.map((tx) => this.mapToTransactionResponse(tx)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get transaction status by transaction hash
   * @param userId - User ID
   * @param txHash - Transaction hash
   * @returns Transaction details
   */
  async getTransactionStatus(
    userId: string,
    txHash: string,
  ): Promise<TransactionStatusDto> {
    const transaction = await this.transactionRepository.findOne({
      where: {
        userId,
        txHash,
      },
    });

    if (!transaction) {
      throw new NotFoundException({
        error: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
      });
    }

    return this.mapToTransactionResponse(transaction);
  }

  /**
   * Process incoming transaction from webhook
   * Called by BlockCypher webhook endpoint
   * @param txHash - Transaction hash
   * @param currency - Currency type
   * @param toAddress - Destination address
   */
  async processIncomingTransaction(
    txHash: string,
    currency: string,
    toAddress: string,
  ): Promise<void> {
    const traceId = uuidv4();

    this.logger.log({
      message: 'Processing incoming transaction',
      trace_id: traceId,
      tx_hash: txHash.substring(0, 10) + '...',
      currency,
      to_address: toAddress.substring(0, 10) + '...',
    });

    try {
      // Check if transaction already exists
      const existing = await this.transactionRepository.findOne({
        where: { txHash },
      });

      if (existing) {
        this.logger.log({
          message: 'Transaction already processed, updating confirmations',
          trace_id: traceId,
          tx_id: existing.id,
        });
        await this.updateTransactionConfirmations(existing.id);
        return;
      }

      // Find the blockchain address
      const blockchainAddress = await this.addressRepository.findOne({
        where: {
          address: toAddress,
          currency,
        },
      });

      if (!blockchainAddress) {
        this.logger.warn({
          message: 'Address not found in database',
          trace_id: traceId,
          address: toAddress,
        });
        return;
      }

      // Get transaction details from BlockCypher
      const txDetails = await this.blockCypherService.getTransaction(currency, txHash);

      // Find the amount sent to our address
      const outputIndex = txDetails.to.findIndex(
        (addr) => addr.toLowerCase() === toAddress.toLowerCase(),
      );
      const amount = txDetails.amounts[outputIndex] || 0;

      // Convert from satoshis/wei to BTC/ETH/USDT
      const convertedAmount = this.convertFromSmallestUnit(amount, currency);

      // Create transaction record
      const transaction = this.transactionRepository.create({
        userId: blockchainAddress.userId,
        blockchainAddressId: blockchainAddress.id,
        currency,
        txHash,
        fromAddress: txDetails.from[0] || 'unknown',
        toAddress,
        amount: convertedAmount,
        status: 'PENDING',
        confirmations: txDetails.confirmations,
        requiredConfirmations: this.blockCypherService.getRequiredConfirmations(currency),
        blockHeight: txDetails.blockHeight?.toString(),
        blockTime: txDetails.blockTime ? new Date(txDetails.blockTime) : null,
        blockchainResponse: txDetails,
      });

      const saved = await this.transactionRepository.save(transaction);

      // Update address statistics
      await this.updateAddressStatistics(blockchainAddress.id, convertedAmount);

      this.logger.log({
        message: 'Transaction recorded successfully',
        trace_id: traceId,
        tx_id: saved.id,
        amount: convertedAmount,
        confirmations: txDetails.confirmations,
      });

      // Send deposit detected notification
      await this.notificationService.sendDepositDetected(
        blockchainAddress.userId,
        currency,
        convertedAmount,
        txHash,
        txDetails.confirmations,
        transaction.requiredConfirmations,
      );

      // Check if transaction is already confirmed
      if (txDetails.confirmations >= transaction.requiredConfirmations) {
        await this.creditUserWallet(saved.id);
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to process incoming transaction',
        trace_id: traceId,
        tx_hash: txHash.substring(0, 10) + '...',
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Update transaction confirmations and credit if threshold met
   * @param transactionId - Transaction ID
   */
  async updateTransactionConfirmations(transactionId: string): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction || transaction.status === 'CREDITED') {
      return;
    }

    try {
      // Get latest transaction details
      const txDetails = await this.blockCypherService.getTransaction(
        transaction.currency,
        transaction.txHash,
      );

      // Update confirmations
      transaction.confirmations = txDetails.confirmations;
      transaction.blockHeight = txDetails.blockHeight?.toString();
      transaction.blockTime = txDetails.blockTime ? new Date(txDetails.blockTime) : null;

      if (txDetails.confirmations >= transaction.requiredConfirmations) {
        transaction.status = 'CONFIRMED';
      }

      await this.transactionRepository.save(transaction);

      // Credit wallet if confirmed
      if (transaction.status === 'CONFIRMED') {
        await this.creditUserWallet(transaction.id);
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to update transaction confirmations',
        tx_id: transactionId,
        error: error.message,
      });
    }
  }

  /**
   * Credit user wallet when transaction is confirmed
   * @param transactionId - Transaction ID
   */
  private async creditUserWallet(transactionId: string): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction || transaction.status === 'CREDITED') {
      return;
    }

    const traceId = uuidv4();

    this.logger.log({
      message: 'Crediting user wallet',
      trace_id: traceId,
      tx_id: transactionId,
      user_id: transaction.userId,
      amount: transaction.amount,
      currency: transaction.currency,
    });

    try {
      // Credit wallet and create ledger entry
      await this.walletService.creditUserWallet(
        transaction.userId,
        transaction.currency,
        transaction.amount,
        transaction.id,
        'CRYPTO_DEPOSIT',
        `Crypto deposit: ${transaction.currency} from ${transaction.fromAddress || 'unknown'}`,
        {
          transactionHash: transaction.txHash,
          fromAddress: transaction.fromAddress,
          toAddress: transaction.toAddress,
          confirmations: transaction.confirmations,
          blockHeight: transaction.blockHeight,
        },
      );

      transaction.status = 'CREDITED';
      transaction.creditedAt = new Date();
      await this.transactionRepository.save(transaction);

      // Get updated balance
      const updatedBalance = await this.walletService.getUserBalance(
        transaction.userId,
        transaction.currency,
      );

      this.logger.log({
        message: 'User wallet credited successfully',
        trace_id: traceId,
        tx_id: transactionId,
        user_id: transaction.userId,
        new_balance: updatedBalance.availableBalance,
      });

      // Send deposit credited notification
      await this.notificationService.sendDepositCredited(
        transaction.userId,
        transaction.currency,
        transaction.amount,
        transaction.txHash,
        updatedBalance.availableBalance,
      );
    } catch (error) {
      this.logger.error({
        message: 'Failed to credit user wallet',
        trace_id: traceId,
        tx_id: transactionId,
        error: error.message,
      });

      transaction.status = 'FAILED';
      transaction.errorMessage = error.message;
      await this.transactionRepository.save(transaction);
    }
  }

  /**
   * Get max address index for a currency
   */
  private async getMaxAddressIndex(currency: string): Promise<number> {
    const result = await this.addressRepository
      .createQueryBuilder('address')
      .select('MAX(address.addressIndex)', 'max')
      .where('address.currency = :currency', { currency })
      .getRawOne();

    return result?.max || -1;
  }

  /**
   * Update address statistics
   */
  private async updateAddressStatistics(
    addressId: string,
    amount: string,
  ): Promise<void> {
    await this.addressRepository.increment(
      { id: addressId },
      'transactionCount',
      1,
    );

    const address = await this.addressRepository.findOne({
      where: { id: addressId },
    });

    if (address) {
      address.totalReceived = (
        parseFloat(address.totalReceived) + parseFloat(amount)
      ).toFixed(8);
      address.lastUsedAt = new Date();
      await this.addressRepository.save(address);
    }
  }

  /**
   * Convert from smallest unit (satoshis/wei) to main unit (BTC/ETH/USDT)
   */
  private convertFromSmallestUnit(amount: number, currency: string): string {
    switch (currency) {
      case 'BTC':
        return (amount / 100000000).toFixed(8); // satoshis to BTC
      case 'ETH':
        return (amount / 1000000000000000000).toFixed(18); // wei to ETH
      case 'USDT':
        return (amount / 1000000).toFixed(6); // USDT has 6 decimals
      default:
        return amount.toString();
    }
  }

  /**
   * Map entity to response DTO
   */
  private mapToAddressResponse(
    address: BlockchainAddress,
  ): DepositAddressResponseDto {
    const requiredConfirmations = this.blockCypherService.getRequiredConfirmations(
      address.currency,
    );

    const estimatedTime =
      address.currency === 'BTC' ? '30-60 minutes' : '3-5 minutes';

    return {
      id: address.id,
      userId: address.userId,
      currency: address.currency,
      address: address.address,
      qrCodeUrl: address.qrCodeUrl,
      requiredConfirmations,
      estimatedConfirmationTime: estimatedTime,
      createdAt: address.createdAt,
    };
  }

  /**
   * Map transaction entity to response DTO
   */
  private mapToTransactionResponse(
    tx: BlockchainTransaction,
  ): TransactionStatusDto {
    return {
      id: tx.id,
      txHash: tx.txHash,
      currency: tx.currency,
      amount: tx.amount,
      amountUsd: tx.amountUsd,
      status: tx.status,
      confirmations: tx.confirmations,
      requiredConfirmations: tx.requiredConfirmations,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      blockHeight: tx.blockHeight,
      blockTime: tx.blockTime,
      creditedAt: tx.creditedAt,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    };
  }
}
