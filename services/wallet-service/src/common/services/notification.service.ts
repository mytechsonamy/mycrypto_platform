import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * NotificationService
 * Handles sending notifications for wallet events
 * Currently logs notifications for future RabbitMQ/email integration
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notificationsEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.notificationsEnabled = this.configService.get<boolean>(
      'NOTIFICATIONS_ENABLED',
      false,
    );
  }

  /**
   * Send crypto deposit detected notification
   * @param userId - User ID
   * @param currency - Currency (BTC, ETH, USDT)
   * @param amount - Deposit amount
   * @param txHash - Transaction hash
   * @param confirmations - Current confirmations
   * @param requiredConfirmations - Required confirmations
   */
  async sendDepositDetected(
    userId: string,
    currency: string,
    amount: string,
    txHash: string,
    confirmations: number,
    requiredConfirmations: number,
  ): Promise<void> {
    const notification = {
      type: 'CRYPTO_DEPOSIT_DETECTED',
      userId,
      data: {
        currency,
        amount,
        txHash,
        confirmations,
        requiredConfirmations,
        estimatedTime: this.getEstimatedTime(currency, confirmations, requiredConfirmations),
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.log({
      message: 'Crypto deposit detected notification',
      ...notification,
    });

    if (this.notificationsEnabled) {
      // TODO: Publish to RabbitMQ queue for email service consumption
      // await this.rabbitmqService.publish('wallet_notifications', notification);
      this.logger.debug('Notification would be sent to RabbitMQ (not implemented)');
    }
  }

  /**
   * Send crypto deposit credited notification
   * @param userId - User ID
   * @param currency - Currency (BTC, ETH, USDT)
   * @param amount - Deposit amount
   * @param txHash - Transaction hash
   * @param newBalance - New wallet balance
   */
  async sendDepositCredited(
    userId: string,
    currency: string,
    amount: string,
    txHash: string,
    newBalance: string,
  ): Promise<void> {
    const notification = {
      type: 'CRYPTO_DEPOSIT_CREDITED',
      userId,
      data: {
        currency,
        amount,
        txHash,
        newBalance,
        shortTxHash: this.shortenTxHash(txHash),
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.log({
      message: 'Crypto deposit credited notification',
      ...notification,
    });

    if (this.notificationsEnabled) {
      // TODO: Publish to RabbitMQ queue for email service consumption
      // await this.rabbitmqService.publish('wallet_notifications', notification);
      this.logger.debug('Notification would be sent to RabbitMQ (not implemented)');
    }
  }

  /**
   * Send TRY deposit credited notification
   * @param userId - User ID
   * @param amount - Deposit amount
   * @param reference - Deposit reference code
   * @param newBalance - New wallet balance
   */
  async sendTryDepositCredited(
    userId: string,
    amount: string,
    reference: string,
    newBalance: string,
  ): Promise<void> {
    const notification = {
      type: 'TRY_DEPOSIT_CREDITED',
      userId,
      data: {
        currency: 'TRY',
        amount,
        reference,
        newBalance,
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.log({
      message: 'TRY deposit credited notification',
      ...notification,
    });

    if (this.notificationsEnabled) {
      // TODO: Publish to RabbitMQ queue for email service consumption
      // await this.rabbitmqService.publish('wallet_notifications', notification);
      this.logger.debug('Notification would be sent to RabbitMQ (not implemented)');
    }
  }

  /**
   * Get estimated time remaining for confirmations
   * @param currency - Currency
   * @param current - Current confirmations
   * @param required - Required confirmations
   * @returns Estimated time string
   */
  private getEstimatedTime(
    currency: string,
    current: number,
    required: number,
  ): string {
    const remaining = required - current;
    if (remaining <= 0) return '0 minutes';

    const timePerConfirmation = {
      BTC: 10, // ~10 minutes per block
      ETH: 0.25, // ~15 seconds per block
      USDT: 0.25, // ERC-20, same as ETH
    };

    const minutes = Math.ceil(remaining * (timePerConfirmation[currency] || 10));

    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
    }
  }

  /**
   * Shorten transaction hash for display
   * @param txHash - Full transaction hash
   * @returns Shortened hash (first 8 + ... + last 8)
   */
  private shortenTxHash(txHash: string): string {
    if (!txHash || txHash.length < 16) return txHash;
    return `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`;
  }
}
