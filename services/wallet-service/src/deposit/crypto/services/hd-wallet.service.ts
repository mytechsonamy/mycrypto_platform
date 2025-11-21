import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bip39 from 'bip39';
import { BIP32Factory, BIP32Interface } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';

/**
 * HDWalletService
 * Implements BIP-44 (Hierarchical Deterministic Wallets) for generating
 * cryptocurrency deposit addresses for BTC, ETH, and USDT (ERC-20)
 *
 * BIP-44 Path: m / purpose' / coin_type' / account' / change / address_index
 * - BTC: m/44'/0'/0'/0/index
 * - ETH: m/44'/60'/0'/0/index
 * - USDT (ERC-20): Same as ETH (m/44'/60'/0'/0/index)
 */
@Injectable()
export class HDWalletService {
  private readonly logger = new Logger(HDWalletService.name);
  private readonly mnemonic: string;
  private readonly seed: Buffer;
  private readonly bip32 = BIP32Factory(ecc);

  // BIP-44 coin type constants
  private readonly BTC_COIN_TYPE = 0;
  private readonly ETH_COIN_TYPE = 60;

  constructor(private configService: ConfigService) {
    // Load or generate mnemonic from environment
    this.mnemonic = this.configService.get<string>('HD_WALLET_MNEMONIC');

    if (!this.mnemonic) {
      throw new Error(
        'HD_WALLET_MNEMONIC not found in environment. Please generate a 24-word mnemonic and add it to .env',
      );
    }

    // Validate mnemonic
    if (!bip39.validateMnemonic(this.mnemonic)) {
      throw new Error('Invalid HD_WALLET_MNEMONIC');
    }

    // Generate seed from mnemonic
    this.seed = bip39.mnemonicToSeedSync(this.mnemonic);

    this.logger.log('HDWalletService initialized successfully');
  }

  /**
   * Generate a Bitcoin deposit address
   * @param index - BIP-44 address index
   * @returns Bitcoin address and derivation path
   */
  generateBtcAddress(index: number): { address: string; derivationPath: string; publicKey: string } {
    const derivationPath = `m/44'/${this.BTC_COIN_TYPE}'/0'/0/${index}`;

    try {
      const root = this.bip32.fromSeed(this.seed);
      const child = root.derivePath(derivationPath);

      if (!child.publicKey) {
        throw new Error('Failed to derive public key');
      }

      // Generate P2WPKH (Native SegWit) address
      const payment = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.bitcoin,
      });

      const address = payment.address;

      if (!address) {
        throw new Error('Failed to generate Bitcoin address');
      }

      this.logger.log({
        message: 'Generated BTC address',
        index,
        derivation_path: derivationPath,
        address: this.maskAddress(address),
      });

      return {
        address,
        derivationPath,
        publicKey: Buffer.from(child.publicKey).toString('hex'),
      };
    } catch (error: any) {
      this.logger.error({
        message: 'Failed to generate BTC address',
        index,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate an Ethereum deposit address (also used for USDT ERC-20)
   * @param index - BIP-44 address index
   * @returns Ethereum address and derivation path
   */
  generateEthAddress(index: number): { address: string; derivationPath: string; publicKey: string } {
    const derivationPath = `m/44'/${this.ETH_COIN_TYPE}'/0'/0/${index}`;

    try {
      const root = this.bip32.fromSeed(this.seed);
      const child = root.derivePath(derivationPath);

      if (!child.privateKey) {
        throw new Error('Failed to derive private key');
      }

      // Create Ethereum wallet from private key (convert Buffer to hex string)
      const privateKeyHex = '0x' + Buffer.from(child.privateKey).toString('hex');
      const wallet = new ethers.Wallet(privateKeyHex);
      const address = wallet.address;

      this.logger.log({
        message: 'Generated ETH address',
        index,
        derivation_path: derivationPath,
        address: this.maskAddress(address),
      });

      return {
        address,
        derivationPath,
        publicKey: Buffer.from(child.publicKey).toString('hex'),
      };
    } catch (error: any) {
      this.logger.error({
        message: 'Failed to generate ETH address',
        index,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate a USDT (ERC-20) deposit address
   * USDT on Ethereum uses the same address format as ETH
   * @param index - BIP-44 address index
   * @returns USDT address (same as ETH address)
   */
  generateUsdtAddress(index: number): { address: string; derivationPath: string; publicKey: string } {
    // USDT (ERC-20) uses the same derivation as ETH
    const result = this.generateEthAddress(index);

    this.logger.log({
      message: 'Generated USDT (ERC-20) address',
      index,
      address: this.maskAddress(result.address),
    });

    return result;
  }

  /**
   * Get the next available address index for a currency
   * This should be called before generating a new address
   * @param currency - BTC, ETH, or USDT
   * @param currentMaxIndex - Current maximum index used for this currency
   * @returns Next available index
   */
  getNextAddressIndex(currency: string, currentMaxIndex: number): number {
    return currentMaxIndex + 1;
  }

  /**
   * Verify that an address was generated from this HD wallet
   * @param currency - BTC, ETH, or USDT
   * @param address - Address to verify
   * @param index - Expected address index
   * @returns true if address matches the HD wallet derivation
   */
  verifyAddress(currency: string, address: string, index: number): boolean {
    try {
      let generatedAddress: string;

      switch (currency) {
        case 'BTC':
          generatedAddress = this.generateBtcAddress(index).address;
          break;
        case 'ETH':
          generatedAddress = this.generateEthAddress(index).address;
          break;
        case 'USDT':
          generatedAddress = this.generateUsdtAddress(index).address;
          break;
        default:
          throw new Error(`Unsupported currency: ${currency}`);
      }

      return generatedAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      this.logger.error({
        message: 'Failed to verify address',
        currency,
        address: this.maskAddress(address),
        index,
        error: error.message,
      });
      return false;
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
   * Generate a new HD wallet mnemonic (for initial setup)
   * This should only be called once during deployment
   * @returns 24-word mnemonic phrase
   */
  static generateMnemonic(): string {
    return bip39.generateMnemonic(256); // 24 words
  }

  /**
   * Get wallet statistics (for monitoring)
   */
  getWalletInfo(): { coinTypes: Record<string, number> } {
    return {
      coinTypes: {
        BTC: this.BTC_COIN_TYPE,
        ETH: this.ETH_COIN_TYPE,
        USDT: this.ETH_COIN_TYPE, // Same as ETH
      },
    };
  }
}
