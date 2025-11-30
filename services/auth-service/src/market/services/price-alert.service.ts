import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceAlert, AlertType } from '../entities/price-alert.entity';
import { CreatePriceAlertDto } from '../dto/create-price-alert.dto';
import { UpdatePriceAlertDto } from '../dto/update-price-alert.dto';
import { TickerService } from './ticker.service';
import { MarketGateway } from '../gateways/market.gateway';

@Injectable()
export class PriceAlertService {
  private readonly logger = new Logger(PriceAlertService.name);

  constructor(
    @InjectRepository(PriceAlert)
    private readonly priceAlertRepository: Repository<PriceAlert>,
    private readonly tickerService: TickerService,
    private readonly marketGateway: MarketGateway,
  ) {}

  /**
   * Create a new price alert for a user
   */
  async create(userId: string, createPriceAlertDto: CreatePriceAlertDto): Promise<PriceAlert> {
    this.logger.log(`Creating price alert for user ${userId} on ${createPriceAlertDto.symbol}`);

    // Check for duplicate active alert
    const existingAlert = await this.priceAlertRepository.findOne({
      where: {
        userId,
        symbol: createPriceAlertDto.symbol,
        alertType: createPriceAlertDto.alertType,
        targetPrice: createPriceAlertDto.targetPrice,
        isActive: true,
      },
    });

    if (existingAlert) {
      throw new BadRequestException(
        `An active alert with the same parameters already exists for ${createPriceAlertDto.symbol}`,
      );
    }

    // Validate target price is positive
    const targetPrice = parseFloat(createPriceAlertDto.targetPrice);
    if (targetPrice <= 0) {
      throw new BadRequestException('Target price must be greater than 0');
    }

    // Create the alert
    const alert = this.priceAlertRepository.create({
      userId,
      symbol: createPriceAlertDto.symbol,
      alertType: createPriceAlertDto.alertType,
      targetPrice: createPriceAlertDto.targetPrice,
      isActive: true,
      notificationsSent: 0,
    });

    const savedAlert = await this.priceAlertRepository.save(alert);

    this.logger.log(
      `Price alert created: ${savedAlert.id} for ${userId} on ${savedAlert.symbol} ${savedAlert.alertType} ${savedAlert.targetPrice}`,
    );

    return savedAlert;
  }

  /**
   * Get all alerts for a user
   */
  async findAll(userId: string): Promise<PriceAlert[]> {
    return this.priceAlertRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a specific alert by ID
   */
  async findOne(id: string, userId: string): Promise<PriceAlert> {
    const alert = await this.priceAlertRepository.findOne({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException(`Price alert with ID ${id} not found`);
    }

    return alert;
  }

  /**
   * Update a price alert
   */
  async update(id: string, userId: string, updatePriceAlertDto: UpdatePriceAlertDto): Promise<PriceAlert> {
    const alert = await this.findOne(id, userId);

    // Validate target price if provided
    if (updatePriceAlertDto.targetPrice) {
      const targetPrice = parseFloat(updatePriceAlertDto.targetPrice);
      if (targetPrice <= 0) {
        throw new BadRequestException('Target price must be greater than 0');
      }
    }

    // Update the alert
    Object.assign(alert, updatePriceAlertDto);

    // Reset trigger data if reactivating
    if (updatePriceAlertDto.isActive === true && alert.triggeredAt) {
      alert.triggeredAt = null;
      alert.notificationsSent = 0;
      this.logger.log(`Alert ${id} reactivated by user ${userId}`);
    }

    const updatedAlert = await this.priceAlertRepository.save(alert);

    this.logger.log(`Price alert updated: ${id} by user ${userId}`);

    return updatedAlert;
  }

  /**
   * Delete a price alert
   */
  async remove(id: string, userId: string): Promise<void> {
    const alert = await this.findOne(id, userId);

    await this.priceAlertRepository.remove(alert);

    this.logger.log(`Price alert deleted: ${id} by user ${userId}`);
  }

  /**
   * Check all active alerts periodically (every 5 seconds)
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async checkActiveAlerts(): Promise<void> {
    try {
      const activeAlerts = await this.priceAlertRepository.find({
        where: { isActive: true },
      });

      if (activeAlerts.length === 0) {
        return;
      }

      this.logger.debug(`Checking ${activeAlerts.length} active price alerts`);

      // Group alerts by symbol for efficient price fetching
      const alertsBySymbol = new Map<string, PriceAlert[]>();
      for (const alert of activeAlerts) {
        const alerts = alertsBySymbol.get(alert.symbol) || [];
        alerts.push(alert);
        alertsBySymbol.set(alert.symbol, alerts);
      }

      // Check each symbol
      for (const [symbol, alerts] of alertsBySymbol.entries()) {
        await this.checkAlertsForSymbol(symbol, alerts);
      }
    } catch (error) {
      this.logger.error(`Error checking active alerts: ${error.message}`, error.stack);
    }
  }

  /**
   * Check alerts for a specific symbol
   */
  private async checkAlertsForSymbol(symbol: string, alerts: PriceAlert[]): Promise<void> {
    try {
      // Get current price from ticker service
      const ticker = await this.tickerService.getTicker(symbol);
      const currentPrice = parseFloat(ticker.lastPrice);

      this.logger.debug(`Checking ${alerts.length} alerts for ${symbol} at price ${currentPrice}`);

      for (const alert of alerts) {
        await this.checkAlert(alert, currentPrice);
      }
    } catch (error) {
      this.logger.error(`Error checking alerts for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Check a single alert against current price
   */
  private async checkAlert(alert: PriceAlert, currentPrice: number): Promise<void> {
    const targetPrice = parseFloat(alert.targetPrice);
    let triggered = false;

    if (alert.alertType === AlertType.ABOVE && currentPrice >= targetPrice) {
      triggered = true;
    } else if (alert.alertType === AlertType.BELOW && currentPrice <= targetPrice) {
      triggered = true;
    }

    // Update last checked timestamp
    alert.lastCheckedAt = new Date();

    if (triggered) {
      await this.triggerAlert(alert, currentPrice);
    } else {
      // Just update last checked timestamp
      await this.priceAlertRepository.save(alert);
    }
  }

  /**
   * Trigger an alert and send notification
   */
  private async triggerAlert(alert: PriceAlert, currentPrice: number): Promise<void> {
    this.logger.log(
      `Alert triggered: ${alert.id} for user ${alert.userId} - ${alert.symbol} ${alert.alertType} ${alert.targetPrice} (current: ${currentPrice})`,
    );

    // Update alert
    alert.triggeredAt = new Date();
    alert.notificationsSent += 1;
    alert.isActive = false; // Deactivate after trigger (user can reactivate)

    await this.priceAlertRepository.save(alert);

    // Send WebSocket notification
    await this.sendAlertNotification(alert, currentPrice);

    // TODO: Send email/SMS notification if configured
    // await this.sendEmailNotification(alert, currentPrice);
  }

  /**
   * Send WebSocket notification for triggered alert
   */
  private async sendAlertNotification(alert: PriceAlert, currentPrice: number): Promise<void> {
    try {
      const notification = {
        type: 'price_alert_triggered',
        alertId: alert.id,
        userId: alert.userId,
        symbol: alert.symbol,
        alertType: alert.alertType,
        targetPrice: alert.targetPrice,
        currentPrice: currentPrice.toString(),
        triggeredAt: alert.triggeredAt.toISOString(),
        message: this.getAlertMessage(alert, currentPrice),
        timestamp: new Date().toISOString(),
      };

      // Broadcast to specific user (assuming market gateway can target users)
      this.marketGateway.server.emit(`price_alert:${alert.userId}`, notification);

      this.logger.debug(`Sent WebSocket notification for alert ${alert.id} to user ${alert.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send alert notification: ${error.message}`);
    }
  }

  /**
   * Generate human-readable alert message
   */
  private getAlertMessage(alert: PriceAlert, currentPrice: number): string {
    const direction = alert.alertType === AlertType.ABOVE ? 'above' : 'below';
    return `${alert.symbol} price is now ${direction} your target of ${alert.targetPrice}. Current price: ${currentPrice}`;
  }

  /**
   * Get statistics about user's alerts
   */
  async getAlertStatistics(userId: string): Promise<{
    total: number;
    active: number;
    triggered: number;
  }> {
    const [total, active] = await Promise.all([
      this.priceAlertRepository.count({ where: { userId } }),
      this.priceAlertRepository.count({ where: { userId, isActive: true } }),
    ]);

    const triggered = await this.priceAlertRepository.count({
      where: { userId, triggeredAt: { $ne: null } as any },
    });

    return { total, active, triggered };
  }
}
