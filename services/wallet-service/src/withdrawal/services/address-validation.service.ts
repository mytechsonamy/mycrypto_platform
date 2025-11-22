import { Injectable, Logger } from '@nestjs/common';
import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';

/**
 * AddressValidationService
 * Validates cryptocurrency addresses for BTC, ETH, and USDT
 * Ensures addresses are correctly formatted before withdrawal processing
 *
 * Story 2.5: Crypto Withdrawal
 * - Prevents loss of funds due to invalid addresses
 * - Supports multiple address formats (Base58, Bech32, EIP-55)
 * - Network-aware validation (mainnet vs testnet)
 */

export interface ValidationResult {
  isValid: boolean;
  address: string;
  normalizedAddress?: string; // Checksummed or canonical version
  format?: string; // e.g., "P2WPKH", "P2PKH", "EIP-55"
  network?: string; // "mainnet", "testnet"
  errors?: string[];
}

@Injectable()
export class AddressValidationService {
  private readonly logger = new Logger(AddressValidationService.name);

  /**
   * Validates a Bitcoin address (Base58 and Bech32 formats)
   * Supports: P2PKH (1...), P2SH (3...), P2WPKH (bc1...)
   *
   * @param address - Bitcoin address to validate
   * @param network - 'mainnet' or 'testnet' (default: 'mainnet')
   * @returns ValidationResult
   */
  async validateBitcoinAddress(
    address: string,
    network: 'mainnet' | 'testnet' = 'mainnet',
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      address,
      errors: [],
    };

    if (!address || typeof address !== 'string') {
      result.errors.push('Address is required and must be a string');
      return result;
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      result.errors.push('Address cannot be empty');
      return result;
    }

    try {
      const btcNetwork =
        network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

      // Try to decode the address
      const decoded = bitcoin.address.toOutputScript(trimmedAddress, btcNetwork);

      if (decoded) {
        result.isValid = true;
        result.normalizedAddress = trimmedAddress;
        result.network = network;

        // Determine address type
        if (trimmedAddress.startsWith('1')) {
          result.format = 'P2PKH';
        } else if (trimmedAddress.startsWith('3')) {
          result.format = 'P2SH';
        } else if (trimmedAddress.startsWith('bc1') || trimmedAddress.startsWith('tb1')) {
          result.format = 'P2WPKH';
        }

        this.logger.log({
          message: 'Bitcoin address validated',
          address: trimmedAddress,
          format: result.format,
          network,
        });
      }
    } catch (error) {
      result.errors.push(`Invalid Bitcoin address: ${error.message}`);
      this.logger.warn({
        message: 'Bitcoin address validation failed',
        address: trimmedAddress,
        error: error.message,
      });
    }

    return result;
  }

  /**
   * Validates an Ethereum address with EIP-55 checksum
   *
   * @param address - Ethereum address to validate (with or without 0x prefix)
   * @returns ValidationResult with checksummed address
   */
  async validateEthereumAddress(address: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      address,
      errors: [],
    };

    if (!address || typeof address !== 'string') {
      result.errors.push('Address is required and must be a string');
      return result;
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      result.errors.push('Address cannot be empty');
      return result;
    }

    try {
      // Check if it's a valid Ethereum address
      if (!ethers.isAddress(trimmedAddress)) {
        result.errors.push('Invalid Ethereum address format');
        return result;
      }

      // Get the checksummed version (EIP-55)
      const checksummedAddress = ethers.getAddress(trimmedAddress);

      result.isValid = true;
      result.normalizedAddress = checksummedAddress;
      result.format = 'EIP-55';
      result.network = 'mainnet'; // Ethereum addresses are network-agnostic

      this.logger.log({
        message: 'Ethereum address validated',
        original: trimmedAddress,
        checksummed: checksummedAddress,
      });
    } catch (error) {
      result.errors.push(`Invalid Ethereum address: ${error.message}`);
      this.logger.warn({
        message: 'Ethereum address validation failed',
        address: trimmedAddress,
        error: error.message,
      });
    }

    return result;
  }

  /**
   * Validates USDT address based on network
   * - ERC20: Uses Ethereum validation
   * - TRC20: Tron address validation (basic implementation)
   *
   * @param address - USDT address to validate
   * @param network - 'ERC20' or 'TRC20'
   * @returns ValidationResult
   */
  async validateUSDTAddress(
    address: string,
    network: 'ERC20' | 'TRC20' = 'ERC20',
  ): Promise<ValidationResult> {
    if (network === 'ERC20') {
      // ERC-20 USDT uses Ethereum addresses
      const result = await this.validateEthereumAddress(address);
      if (result.isValid) {
        result.format = 'USDT-ERC20';
      }
      return result;
    } else if (network === 'TRC20') {
      // TRC-20 USDT uses Tron addresses
      return this.validateTronAddress(address);
    }

    return {
      isValid: false,
      address,
      errors: [`Unsupported USDT network: ${network}`],
    };
  }

  /**
   * Validates a Tron address (T... format)
   * Basic validation for TRC-20 USDT
   *
   * @param address - Tron address to validate
   * @returns ValidationResult
   */
  private async validateTronAddress(address: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      address,
      errors: [],
    };

    if (!address || typeof address !== 'string') {
      result.errors.push('Address is required and must be a string');
      return result;
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      result.errors.push('Address cannot be empty');
      return result;
    }

    // Tron addresses start with 'T' and are 34 characters long (Base58)
    if (!trimmedAddress.startsWith('T')) {
      result.errors.push('Tron address must start with T');
      return result;
    }

    if (trimmedAddress.length !== 34) {
      result.errors.push('Tron address must be 34 characters long');
      return result;
    }

    // Basic Base58 character check
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(trimmedAddress)) {
      result.errors.push('Tron address contains invalid characters');
      return result;
    }

    // For MVP, we accept basic format validation
    // Production should use tronweb library for checksum validation
    result.isValid = true;
    result.normalizedAddress = trimmedAddress;
    result.format = 'USDT-TRC20';
    result.network = 'tron';

    this.logger.log({
      message: 'Tron address validated (basic)',
      address: trimmedAddress,
    });

    return result;
  }

  /**
   * Unified validation method - validates any supported currency
   * Routes to the appropriate validation method based on currency
   *
   * @param currency - Currency type ('BTC', 'ETH', 'USDT')
   * @param address - Address to validate
   * @param network - Optional network specification (for BTC: mainnet/testnet, for USDT: ERC20/TRC20)
   * @returns ValidationResult
   */
  async validateAddress(
    currency: 'BTC' | 'ETH' | 'USDT',
    address: string,
    network?: string,
  ): Promise<ValidationResult> {
    switch (currency) {
      case 'BTC':
        return this.validateBitcoinAddress(
          address,
          (network as 'mainnet' | 'testnet') || 'mainnet',
        );

      case 'ETH':
        return this.validateEthereumAddress(address);

      case 'USDT':
        return this.validateUSDTAddress(
          address,
          (network as 'ERC20' | 'TRC20') || 'ERC20',
        );

      default:
        return {
          isValid: false,
          address,
          errors: [`Unsupported currency: ${currency}`],
        };
    }
  }

  /**
   * Batch validation for multiple addresses
   * Useful for validating whitelisted addresses
   *
   * @param addresses - Array of {currency, address, network?} objects
   * @returns Array of ValidationResult
   */
  async validateMultipleAddresses(
    addresses: Array<{
      currency: 'BTC' | 'ETH' | 'USDT';
      address: string;
      network?: string;
    }>,
  ): Promise<ValidationResult[]> {
    return Promise.all(
      addresses.map((item) =>
        this.validateAddress(item.currency, item.address, item.network),
      ),
    );
  }
}
