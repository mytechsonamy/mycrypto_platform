import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ethers } from 'ethers';

/**
 * BlockchainBroadcastingService
 * Handles broadcasting signed transactions to blockchain networks
 * and tracking confirmation status
 *
 * Story 2.5: Crypto Withdrawal - Day 3
 */

export interface BroadcastResult {
  success: boolean;
  txHash?: string;
  error?: string;
  confirmations?: number;
}

export interface TransactionStatus {
  txHash: string;
  confirmations: number;
  isConfirmed: boolean;
  blockNumber?: number;
  timestamp?: number;
}

@Injectable()
export class BlockchainBroadcastingService {
  private readonly logger = new Logger(BlockchainBroadcastingService.name);
  private ethProvider: ethers.JsonRpcProvider;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.maxRetries = this.configService.get<number>('WITHDRAWAL_MAX_RETRIES', 3);
    this.retryDelay = this.configService.get<number>('WITHDRAWAL_RETRY_DELAY', 5000);
    this.initializeProviders();
  }

  /**
   * Initialize blockchain providers
   * @private
   */
  private initializeProviders(): void {
    try {
      // Initialize Ethereum provider (Infura or Alchemy)
      const infuraId = this.configService.get<string>('INFURA_PROJECT_ID');
      const alchemyKey = this.configService.get<string>('ALCHEMY_API_KEY');
      const ethNetwork = this.configService.get<string>('ETHEREUM_NETWORK', 'sepolia');

      if (infuraId && infuraId !== 'your_infura_project_id_here') {
        const infuraUrl = `https://${ethNetwork}.infura.io/v3/${infuraId}`;
        this.ethProvider = new ethers.JsonRpcProvider(infuraUrl);
        this.logger.log('Ethereum provider initialized (Infura)');
      } else if (alchemyKey && alchemyKey !== 'your_alchemy_api_key_here') {
        const alchemyUrl = `https://eth-${ethNetwork}.g.alchemy.com/v2/${alchemyKey}`;
        this.ethProvider = new ethers.JsonRpcProvider(alchemyUrl);
        this.logger.log('Ethereum provider initialized (Alchemy)');
      } else {
        this.logger.warn('Ethereum provider not configured - using test mode');
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to initialize blockchain providers',
        error: error.message,
      });
    }
  }

  /**
   * Broadcast Bitcoin transaction
   */
  async broadcastBitcoinTransaction(txHex: string): Promise<BroadcastResult> {
    this.logger.log({
      message: 'Broadcasting Bitcoin transaction',
      txHexLength: txHex.length,
    });

    const blockcypherToken = this.configService.get<string>('BLOCKCYPHER_API_TOKEN');
    const network = this.configService.get<string>('BITCOIN_NETWORK', 'testnet');

    if (!blockcypherToken || blockcypherToken === 'your_blockcypher_api_token_here') {
      this.logger.warn('BlockCypher API token not configured - simulating broadcast');
      return {
        success: true,
        txHash: '0000000000000000000000000000000000000000000000000000000000000000',
      };
    }

    const baseUrl = network === 'mainnet'
      ? 'https://api.blockcypher.com/v1/btc/main'
      : 'https://api.blockcypher.com/v1/btc/test3';

    let attempt = 0;
    let lastError: any;

    while (attempt < this.maxRetries) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(
            `${baseUrl}/txs/push?token=${blockcypherToken}`,
            { tx: txHex },
            { timeout: 10000 },
          ),
        );

        const txHash = response.data.tx.hash;

        this.logger.log({
          message: 'Bitcoin transaction broadcasted successfully',
          txHash,
          attempt: attempt + 1,
        });

        return {
          success: true,
          txHash,
          confirmations: 0,
        };
      } catch (error) {
        lastError = error;
        attempt++;

        this.logger.warn({
          message: 'Bitcoin broadcast attempt failed',
          attempt,
          error: error.response?.data || error.message,
        });

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    this.logger.error({
      message: 'Bitcoin transaction broadcast failed after all retries',
      error: lastError.response?.data || lastError.message,
    });

    return {
      success: false,
      error: lastError.response?.data?.error || 'Failed to broadcast transaction',
    };
  }

  /**
   * Broadcast Ethereum transaction
   */
  async broadcastEthereumTransaction(signedTx: string): Promise<BroadcastResult> {
    this.logger.log({
      message: 'Broadcasting Ethereum transaction',
      signedTxLength: signedTx.length,
    });

    if (!this.ethProvider) {
      this.logger.warn('Ethereum provider not configured - simulating broadcast');
      return {
        success: true,
        txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
    }

    let attempt = 0;
    let lastError: any;

    while (attempt < this.maxRetries) {
      try {
        const tx = await this.ethProvider.broadcastTransaction(signedTx);

        this.logger.log({
          message: 'Ethereum transaction broadcasted successfully',
          txHash: tx.hash,
          attempt: attempt + 1,
        });

        return {
          success: true,
          txHash: tx.hash,
          confirmations: 0,
        };
      } catch (error) {
        lastError = error;
        attempt++;

        this.logger.warn({
          message: 'Ethereum broadcast attempt failed',
          attempt,
          error: error.message,
        });

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    this.logger.error({
      message: 'Ethereum transaction broadcast failed after all retries',
      error: lastError.message,
    });

    return {
      success: false,
      error: lastError.message || 'Failed to broadcast transaction',
    };
  }

  /**
   * Broadcast USDT transaction (ERC20 or TRC20)
   */
  async broadcastUSDTTransaction(
    signedTx: string,
    network: 'ERC20' | 'TRC20',
  ): Promise<BroadcastResult> {
    this.logger.log({
      message: 'Broadcasting USDT transaction',
      network,
    });

    if (network === 'ERC20') {
      // USDT ERC20 uses Ethereum network
      return this.broadcastEthereumTransaction(signedTx);
    } else {
      // TRC20 implementation (TRON network)
      throw new Error('TRC20 broadcasting not yet implemented');
    }
  }

  /**
   * Get Bitcoin transaction status
   */
  async getBitcoinTransactionStatus(txHash: string): Promise<TransactionStatus> {
    this.logger.debug({
      message: 'Checking Bitcoin transaction status',
      txHash,
    });

    const blockcypherToken = this.configService.get<string>('BLOCKCYPHER_API_TOKEN');
    const network = this.configService.get<string>('BITCOIN_NETWORK', 'testnet');

    if (!blockcypherToken || blockcypherToken === 'your_blockcypher_api_token_here') {
      this.logger.debug('BlockCypher not configured - returning mock status');
      return {
        txHash,
        confirmations: 0,
        isConfirmed: false,
      };
    }

    const baseUrl = network === 'mainnet'
      ? 'https://api.blockcypher.com/v1/btc/main'
      : 'https://api.blockcypher.com/v1/btc/test3';

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${baseUrl}/txs/${txHash}?token=${blockcypherToken}`,
          { timeout: 5000 },
        ),
      );

      const confirmations = response.data.confirmations || 0;
      const requiredConfirmations = this.configService.get<number>('BTC_CONFIRMATION_COUNT', 3);

      return {
        txHash,
        confirmations,
        isConfirmed: confirmations >= requiredConfirmations,
        blockNumber: response.data.block_height,
        timestamp: response.data.confirmed ? new Date(response.data.confirmed).getTime() : undefined,
      };
    } catch (error) {
      this.logger.error({
        message: 'Failed to get Bitcoin transaction status',
        txHash,
        error: error.message,
      });

      return {
        txHash,
        confirmations: 0,
        isConfirmed: false,
      };
    }
  }

  /**
   * Get Ethereum transaction status
   */
  async getEthereumTransactionStatus(txHash: string): Promise<TransactionStatus> {
    this.logger.debug({
      message: 'Checking Ethereum transaction status',
      txHash,
    });

    if (!this.ethProvider) {
      this.logger.debug('Ethereum provider not configured - returning mock status');
      return {
        txHash,
        confirmations: 0,
        isConfirmed: false,
      };
    }

    try {
      const tx = await this.ethProvider.getTransaction(txHash);

      if (!tx) {
        return {
          txHash,
          confirmations: 0,
          isConfirmed: false,
        };
      }

      const currentBlock = await this.ethProvider.getBlockNumber();
      const confirmations = tx.blockNumber ? currentBlock - tx.blockNumber : 0;
      const requiredConfirmations = this.configService.get<number>('ETH_CONFIRMATION_COUNT', 12);

      return {
        txHash,
        confirmations,
        isConfirmed: confirmations >= requiredConfirmations,
        blockNumber: tx.blockNumber || undefined,
      };
    } catch (error) {
      this.logger.error({
        message: 'Failed to get Ethereum transaction status',
        txHash,
        error: error.message,
      });

      return {
        txHash,
        confirmations: 0,
        isConfirmed: false,
      };
    }
  }

  /**
   * Get transaction status (auto-detect currency)
   */
  async getTransactionStatus(
    txHash: string,
    currency: 'BTC' | 'ETH' | 'USDT',
    network?: 'ERC20' | 'TRC20',
  ): Promise<TransactionStatus> {
    if (currency === 'BTC') {
      return this.getBitcoinTransactionStatus(txHash);
    } else if (currency === 'ETH' || (currency === 'USDT' && network === 'ERC20')) {
      return this.getEthereumTransactionStatus(txHash);
    } else {
      throw new Error(`Unsupported currency/network: ${currency} ${network}`);
    }
  }

  /**
   * Estimate confirmation time in minutes
   */
  estimateConfirmationTime(currency: 'BTC' | 'ETH' | 'USDT'): number {
    if (currency === 'BTC') {
      // Bitcoin: ~10 min per block, 3 confirmations = ~30 min
      const confirmations = this.configService.get<number>('BTC_CONFIRMATION_COUNT', 3);
      return confirmations * 10;
    } else if (currency === 'ETH') {
      // Ethereum: ~12 seconds per block, 12 confirmations = ~2.4 min
      const confirmations = this.configService.get<number>('ETH_CONFIRMATION_COUNT', 12);
      return Math.ceil((confirmations * 12) / 60);
    } else {
      // USDT follows underlying network
      return this.estimateConfirmationTime('ETH');
    }
  }

  /**
   * Sleep helper for retries
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
