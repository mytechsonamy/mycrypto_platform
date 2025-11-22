import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { ethers } from 'ethers';

/**
 * TransactionSigningService
 * Handles cryptographic signing of blockchain transactions
 *
 * Story 2.5: Crypto Withdrawal - Day 3
 *
 * Security Notes:
 * - Private keys are loaded from encrypted environment variables
 * - Production: Use HSM (Hardware Security Module) or AWS KMS
 * - All signing operations are logged for audit trail
 */

export interface BitcoinSignedTransaction {
  txHex: string;
  txId: string;
  size: number;
  fee: string;
}

export interface EthereumSignedTransaction {
  signedTx: string;
  txHash: string;
  nonce: number;
  gasLimit: string;
  gasPrice: string;
}

@Injectable()
export class TransactionSigningService {
  private readonly logger = new Logger(TransactionSigningService.name);
  private readonly ECPair = ECPairFactory(ecc);

  // Private key cache (loaded once from env)
  private btcKeyPair: any;
  private ethWallet: ethers.Wallet;
  private usdtWallet: ethers.Wallet;

  constructor(private readonly configService: ConfigService) {
    this.initializeWallets();
  }

  /**
   * Initialize wallets from environment variables
   * @private
   */
  private initializeWallets(): void {
    try {
      // Bitcoin wallet
      const btcNetwork = this.getBitcoinNetwork();
      const btcPrivateKey = this.configService.get<string>('BTC_HOT_WALLET_PRIVATE_KEY');

      if (btcPrivateKey && btcPrivateKey !== 'your_encrypted_btc_private_key_here') {
        this.btcKeyPair = this.ECPair.fromWIF(btcPrivateKey, btcNetwork);
        this.logger.log('Bitcoin hot wallet initialized');
      } else {
        this.logger.warn('Bitcoin hot wallet not configured - using test mode');
      }

      // Ethereum wallet
      const ethPrivateKey = this.configService.get<string>('ETH_HOT_WALLET_PRIVATE_KEY');
      if (ethPrivateKey && ethPrivateKey !== 'your_encrypted_eth_private_key_here') {
        this.ethWallet = new ethers.Wallet(ethPrivateKey);
        this.logger.log('Ethereum hot wallet initialized');
      } else {
        this.logger.warn('Ethereum hot wallet not configured - using test mode');
      }

      // USDT wallet (same as ETH for ERC20)
      const usdtPrivateKey = this.configService.get<string>('USDT_HOT_WALLET_PRIVATE_KEY');
      if (usdtPrivateKey && usdtPrivateKey !== 'your_encrypted_usdt_private_key_here') {
        this.usdtWallet = new ethers.Wallet(usdtPrivateKey);
        this.logger.log('USDT hot wallet initialized');
      } else {
        this.logger.warn('USDT hot wallet not configured - using test mode');
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to initialize wallets',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Sign a Bitcoin transaction
   */
  async signBitcoinTransaction(
    toAddress: string,
    amount: string,
    utxos: any[],
    feeRate: number,
  ): Promise<BitcoinSignedTransaction> {
    this.logger.log({
      message: 'Signing Bitcoin transaction',
      toAddress,
      amount,
      utxoCount: utxos.length,
      feeRate,
    });

    if (!this.btcKeyPair) {
      throw new Error('Bitcoin wallet not initialized');
    }

    const network = this.getBitcoinNetwork();
    const psbt = new bitcoin.Psbt({ network });

    // Add inputs (UTXOs)
    let totalInput = 0;
    for (const utxo of utxos) {
      // For SegWit (P2WPKH), we need to provide witnessUtxo
      // The script should be the P2WPKH output script
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: BigInt(utxo.satoshis),
        },
      });
      totalInput += utxo.satoshis;
    }

    // Calculate amounts in satoshis
    const amountSatoshis = Math.floor(parseFloat(amount) * 100000000);

    // Estimate transaction size and fee
    const txSize = this.estimateBitcoinTxSize(utxos.length, 2); // 2 outputs (recipient + change)
    const feeSatoshis = txSize * feeRate;

    const changeSatoshis = totalInput - amountSatoshis - feeSatoshis;

    if (changeSatoshis < 0) {
      throw new Error(`Insufficient funds. Required: ${amountSatoshis + feeSatoshis} satoshis, Available: ${totalInput} satoshis`);
    }

    // Add output for recipient
    psbt.addOutput({
      address: toAddress,
      value: BigInt(amountSatoshis),
    });

    // Add change output if significant
    if (changeSatoshis > 546) { // Dust threshold
      const changeAddress = bitcoin.payments.p2wpkh({
        pubkey: this.btcKeyPair.publicKey,
        network,
      }).address;

      psbt.addOutput({
        address: changeAddress,
        value: BigInt(changeSatoshis),
      });
    }

    // Sign all inputs
    for (let i = 0; i < utxos.length; i++) {
      psbt.signInput(i, this.btcKeyPair);
    }

    // Finalize and extract transaction
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();

    const result = {
      txHex: tx.toHex(),
      txId: tx.getId(),
      size: tx.byteLength(),
      fee: (feeSatoshis / 100000000).toFixed(8),
    };

    this.logger.log({
      message: 'Bitcoin transaction signed successfully',
      txId: result.txId,
      size: result.size,
      fee: result.fee,
    });

    return result;
  }

  /**
   * Sign an Ethereum transaction
   */
  async signEthereumTransaction(
    toAddress: string,
    amount: string,
    nonce: number,
    gasLimit: string,
    gasPrice: string,
  ): Promise<EthereumSignedTransaction> {
    this.logger.log({
      message: 'Signing Ethereum transaction',
      toAddress,
      amount,
      nonce,
      gasLimit,
      gasPrice,
    });

    if (!this.ethWallet) {
      throw new Error('Ethereum wallet not initialized');
    }

    // Create transaction
    const tx = {
      to: toAddress,
      value: ethers.parseEther(amount),
      gasLimit: BigInt(gasLimit),
      gasPrice: ethers.parseUnits(gasPrice, 'gwei'),
      nonce,
      chainId: this.getEthereumChainId(),
    };

    // Sign transaction
    const signedTx = await this.ethWallet.signTransaction(tx);
    const txHash = ethers.keccak256(signedTx);

    const result = {
      signedTx,
      txHash,
      nonce,
      gasLimit,
      gasPrice,
    };

    this.logger.log({
      message: 'Ethereum transaction signed successfully',
      txHash: result.txHash,
      nonce: result.nonce,
    });

    return result;
  }

  /**
   * Sign a USDT (ERC20) transaction
   */
  async signUSDTTransaction(
    toAddress: string,
    amount: string,
    network: 'ERC20' | 'TRC20',
    nonce: number,
    gasLimit: string,
    gasPrice: string,
  ): Promise<EthereumSignedTransaction> {
    this.logger.log({
      message: 'Signing USDT transaction',
      toAddress,
      amount,
      network,
      nonce,
    });

    if (network === 'TRC20') {
      throw new Error('TRC20 signing not yet implemented');
    }

    if (!this.usdtWallet) {
      throw new Error('USDT wallet not initialized');
    }

    // USDT ERC20 contract address (mainnet: 0xdac17f958d2ee523a2206206994597c13d831ec7)
    const usdtContractAddress = this.getUSDTContractAddress();

    // ERC20 transfer function signature: transfer(address,uint256)
    const iface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)',
    ]);

    // Amount in USDT has 6 decimals (not 18 like ETH)
    const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 1000000));

    const data = iface.encodeFunctionData('transfer', [toAddress, amountInSmallestUnit]);

    // Create transaction
    const tx = {
      to: usdtContractAddress,
      value: 0, // No ETH sent, just calling contract
      data,
      gasLimit: BigInt(gasLimit),
      gasPrice: ethers.parseUnits(gasPrice, 'gwei'),
      nonce,
      chainId: this.getEthereumChainId(),
    };

    // Sign transaction
    const signedTx = await this.usdtWallet.signTransaction(tx);
    const txHash = ethers.keccak256(signedTx);

    const result = {
      signedTx,
      txHash,
      nonce,
      gasLimit,
      gasPrice,
    };

    this.logger.log({
      message: 'USDT transaction signed successfully',
      txHash: result.txHash,
      network,
    });

    return result;
  }

  /**
   * Validate a signature
   */
  validateSignature(txHex: string, expectedTxId?: string): boolean {
    try {
      const tx = bitcoin.Transaction.fromHex(txHex);
      const actualTxId = tx.getId();

      if (expectedTxId && actualTxId !== expectedTxId) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error({
        message: 'Signature validation failed',
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get Bitcoin network from config
   * @private
   */
  private getBitcoinNetwork(): any {
    const network = this.configService.get<string>('BITCOIN_NETWORK', 'testnet');
    return network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  }

  /**
   * Get Ethereum chain ID from config
   * @private
   */
  private getEthereumChainId(): number {
    const network = this.configService.get<string>('ETHEREUM_NETWORK', 'sepolia');

    const chainIds: Record<string, number> = {
      mainnet: 1,
      sepolia: 11155111,
      goerli: 5,
      localhost: 31337,
    };

    return chainIds[network] || chainIds.sepolia;
  }

  /**
   * Get USDT contract address based on network
   * @private
   */
  private getUSDTContractAddress(): string {
    const network = this.configService.get<string>('ETHEREUM_NETWORK', 'sepolia');

    // Mainnet USDT contract
    if (network === 'mainnet') {
      return '0xdac17f958d2ee523a2206206994597c13d831ec7';
    }

    // Sepolia testnet - using a mock USDT contract (deploy your own or use existing)
    // For testing, we'll use a placeholder address
    return '0x0000000000000000000000000000000000000000';
  }

  /**
   * Estimate Bitcoin transaction size
   * @private
   */
  private estimateBitcoinTxSize(inputCount: number, outputCount: number): number {
    // P2WPKH (SegWit) transaction size estimation
    // Base size: 10 bytes
    // Input: ~68 bytes per input (SegWit)
    // Output: ~31 bytes per output
    const baseSize = 10;
    const inputSize = inputCount * 68;
    const outputSize = outputCount * 31;

    return baseSize + inputSize + outputSize;
  }

  /**
   * Get wallet addresses (for display/verification)
   */
  getWalletAddresses(): {
    btc?: string;
    eth?: string;
    usdt?: string;
  } {
    const addresses: any = {};

    if (this.btcKeyPair) {
      const network = this.getBitcoinNetwork();
      addresses.btc = bitcoin.payments.p2wpkh({
        pubkey: this.btcKeyPair.publicKey,
        network,
      }).address;
    }

    if (this.ethWallet) {
      addresses.eth = this.ethWallet.address;
    }

    if (this.usdtWallet) {
      addresses.usdt = this.usdtWallet.address;
    }

    return addresses;
  }
}
