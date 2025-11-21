import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface BlockCypherTransaction {
  txHash: string;
  blockHeight: number;
  blockTime: string;
  confirmations: number;
  from: string[];
  to: string[];
  amounts: number[];
  total: number;
  fees: number;
}

export interface WebhookResponse {
  id: string;
  event: string;
  address: string;
  token: string;
  url: string;
}

/**
 * BlockCypherService
 * Integrates with BlockCypher API for blockchain monitoring
 * Supports BTC, ETH, and USDT (ERC-20) transaction tracking
 */
@Injectable()
export class BlockCypherService {
  private readonly logger = new Logger(BlockCypherService.name);
  private readonly apiToken: string;
  private readonly webhookUrl: string;
  private readonly btcClient: AxiosInstance;
  private readonly ethClient: AxiosInstance;

  // BlockCypher API base URLs
  private readonly BTC_BASE_URL = 'https://api.blockcypher.com/v1/btc/main';
  private readonly ETH_BASE_URL = 'https://api.blockcypher.com/v1/eth/main';

  // Confirmation requirements
  private readonly BTC_CONFIRMATIONS = 3;
  private readonly ETH_CONFIRMATIONS = 12;

  constructor(private configService: ConfigService) {
    this.apiToken = this.configService.get<string>('BLOCKCYPHER_API_TOKEN');
    this.webhookUrl = this.configService.get<string>(
      'BLOCKCYPHER_WEBHOOK_URL',
      'https://api.mycrypto-platform.com/wallet/deposit/crypto/webhook',
    );

    if (!this.apiToken) {
      this.logger.warn('BLOCKCYPHER_API_TOKEN not set. Using rate-limited API.');
    }

    // Create HTTP clients for BTC and ETH
    this.btcClient = axios.create({
      baseURL: this.BTC_BASE_URL,
      timeout: 10000,
      params: this.apiToken ? { token: this.apiToken } : {},
    });

    this.ethClient = axios.create({
      baseURL: this.ETH_BASE_URL,
      timeout: 10000,
      params: this.apiToken ? { token: this.apiToken } : {},
    });

    this.logger.log('BlockCypherService initialized');
  }

  /**
   * Register a webhook for address monitoring
   * @param currency - BTC, ETH, or USDT
   * @param address - Address to monitor
   * @returns Webhook registration details
   */
  async registerAddressWebhook(
    currency: string,
    address: string,
  ): Promise<WebhookResponse> {
    const client = this.getClient(currency);

    try {
      const response = await client.post('/hooks', {
        event: 'unconfirmed-tx',
        address,
        url: this.webhookUrl,
      });

      this.logger.log({
        message: 'Webhook registered successfully',
        currency,
        address: this.maskAddress(address),
        webhook_id: response.data.id,
      });

      return response.data;
    } catch (error) {
      this.logger.error({
        message: 'Failed to register webhook',
        currency,
        address: this.maskAddress(address),
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Delete a webhook
   * @param currency - BTC, ETH, or USDT
   * @param webhookId - Webhook ID to delete
   */
  async deleteWebhook(currency: string, webhookId: string): Promise<void> {
    const client = this.getClient(currency);

    try {
      await client.delete(`/hooks/${webhookId}`);

      this.logger.log({
        message: 'Webhook deleted successfully',
        currency,
        webhook_id: webhookId,
      });
    } catch (error) {
      this.logger.error({
        message: 'Failed to delete webhook',
        currency,
        webhook_id: webhookId,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Get address balance
   * @param currency - BTC, ETH, or USDT
   * @param address - Address to check
   * @returns Address balance in satoshis/wei
   */
  async getAddressBalance(currency: string, address: string): Promise<string> {
    const client = this.getClient(currency);

    try {
      const response = await client.get(`/addrs/${address}/balance`);

      this.logger.log({
        message: 'Retrieved address balance',
        currency,
        address: this.maskAddress(address),
        balance: response.data.balance,
      });

      return response.data.balance.toString();
    } catch (error) {
      this.logger.error({
        message: 'Failed to get address balance',
        currency,
        address: this.maskAddress(address),
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Get transaction details
   * @param currency - BTC, ETH, or USDT
   * @param txHash - Transaction hash
   * @returns Transaction details
   */
  async getTransaction(
    currency: string,
    txHash: string,
  ): Promise<BlockCypherTransaction> {
    const client = this.getClient(currency);

    try {
      const response = await client.get(`/txs/${txHash}`);

      const tx = response.data;

      this.logger.log({
        message: 'Retrieved transaction',
        currency,
        tx_hash: txHash.substring(0, 10) + '...',
        confirmations: tx.confirmations,
      });

      return {
        txHash: tx.hash,
        blockHeight: tx.block_height,
        blockTime: tx.confirmed,
        confirmations: tx.confirmations,
        from: tx.inputs?.map((input: any) => input.addresses?.[0]) || [],
        to: tx.outputs?.map((output: any) => output.addresses?.[0]) || [],
        amounts: tx.outputs?.map((output: any) => output.value) || [],
        total: tx.total,
        fees: tx.fees,
      };
    } catch (error) {
      this.logger.error({
        message: 'Failed to get transaction',
        currency,
        tx_hash: txHash.substring(0, 10) + '...',
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Get address transactions
   * @param currency - BTC, ETH, or USDT
   * @param address - Address to query
   * @param limit - Maximum number of transactions to return
   * @returns List of transactions
   */
  async getAddressTransactions(
    currency: string,
    address: string,
    limit = 50,
  ): Promise<BlockCypherTransaction[]> {
    const client = this.getClient(currency);

    try {
      const response = await client.get(`/addrs/${address}/full`, {
        params: { limit },
      });

      const txs = response.data.txs || [];

      this.logger.log({
        message: 'Retrieved address transactions',
        currency,
        address: this.maskAddress(address),
        count: txs.length,
      });

      return txs.map((tx: any) => ({
        txHash: tx.hash,
        blockHeight: tx.block_height,
        blockTime: tx.confirmed,
        confirmations: tx.confirmations,
        from: tx.inputs?.map((input: any) => input.addresses?.[0]) || [],
        to: tx.outputs?.map((output: any) => output.addresses?.[0]) || [],
        amounts: tx.outputs?.map((output: any) => output.value) || [],
        total: tx.total,
        fees: tx.fees,
      }));
    } catch (error) {
      this.logger.error({
        message: 'Failed to get address transactions',
        currency,
        address: this.maskAddress(address),
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Get USDT (ERC-20) token balance
   * USDT contract address: 0xdac17f958d2ee523a2206206994597c13d831ec7
   * @param address - Ethereum address
   * @returns USDT balance
   */
  async getUsdtBalance(address: string): Promise<string> {
    const USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';

    try {
      const response = await this.ethClient.get(
        `/addrs/${address}/tokens/${USDT_CONTRACT}/balance`,
      );

      this.logger.log({
        message: 'Retrieved USDT balance',
        address: this.maskAddress(address),
        balance: response.data.balance,
      });

      return response.data.balance.toString();
    } catch (error) {
      this.logger.error({
        message: 'Failed to get USDT balance',
        address: this.maskAddress(address),
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Get required confirmations for a currency
   * @param currency - BTC, ETH, or USDT
   * @returns Number of required confirmations
   */
  getRequiredConfirmations(currency: string): number {
    switch (currency) {
      case 'BTC':
        return this.BTC_CONFIRMATIONS;
      case 'ETH':
      case 'USDT':
        return this.ETH_CONFIRMATIONS;
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  /**
   * Get the appropriate HTTP client for the currency
   * @param currency - BTC, ETH, or USDT
   * @returns Axios client
   */
  private getClient(currency: string): AxiosInstance {
    switch (currency) {
      case 'BTC':
        return this.btcClient;
      case 'ETH':
      case 'USDT':
        return this.ethClient;
      default:
        throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  /**
   * Mask address for logging (show first 6 and last 4 characters)
   */
  private maskAddress(address: string): string {
    if (address.length <= 10) return address;
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    const masked = '*'.repeat(Math.min(address.length - 10, 20));
    return `${start}${masked}${end}`;
  }

  /**
   * Check if BlockCypher API is available
   * @returns true if API is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.btcClient.get('/');
      return true;
    } catch (error) {
      this.logger.error({
        message: 'BlockCypher API is not available',
        error: error.message,
      });
      return false;
    }
  }
}
