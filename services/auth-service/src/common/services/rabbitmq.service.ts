import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Import amqplib directly as a namespace
const amqplib = require('amqplib');

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: any = null;
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      const url = this.configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');

      this.connection = await amqplib.connect(url);
      this.channel = await this.connection.createChannel();

      // Declare the email verification queue
      const queueName = this.configService.get<string>('RABBITMQ_EMAIL_QUEUE', 'email.verification');
      await this.channel.assertQueue(queueName, {
        durable: true,
      });

      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('RabbitMQ connection error:', error);
      // Don't throw error to allow service to start without RabbitMQ in test/dev
    }
  }

  private async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  async publishToQueue(queueName: string, message: any): Promise<boolean> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      if (!this.channel) {
        this.logger.warn('RabbitMQ channel not available - message not sent');
        return false;
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));

      return this.channel.sendToQueue(queueName, messageBuffer, {
        persistent: true,
      });
    } catch (error) {
      this.logger.error(`Failed to publish message to queue ${queueName}:`, error);
      return false;
    }
  }

  async publishEmailVerification(data: {
    email: string;
    token: string;
    userId: string;
  }): Promise<boolean> {
    const queueName = this.configService.get<string>('RABBITMQ_EMAIL_QUEUE', 'email.verification');

    const message = {
      type: 'EMAIL_VERIFICATION',
      timestamp: new Date().toISOString(),
      data,
    };

    this.logger.log(`Publishing email verification for user: ${data.userId}`);
    return this.publishToQueue(queueName, message);
  }
}