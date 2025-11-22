import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * FeeCalculationService
 * Calculates withdrawal fees for cryptocurrency transactions
 *
 * Story 2.5: Crypto Withdrawal - Day 2
 * - Network fees (dynamic from blockchain)
 * - Platform fees (configured)
 * - Min/max limit validation
 */

export interface FeeCalculationResult {
  currency: string;
  amount: string;
  networkFee: string;
  platformFee: string;
  totalFee: string;
  totalAmount: string; // amount + totalFee
  minimumWithdrawal: string;
  maximumWithdrawal: string;
}

@Injectable()
export class FeeCalculationService {
  private readonly logger = new Logger(FeeCalculationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Calculate total fees for a withdrawal
   * @param currency - BTC, ETH, or USDT
   * @param amount - Withdrawal amount as decimal string
   * @param network - Optional network (for USDT: ERC20/TRC20)
   * @returns FeeCalculationResult with all fee details
   */
  async calculateWithdrawalFees(
    currency: 'BTC' | 'ETH' | 'USDT',
    amount: string,
    network?: string,
  ): Promise<FeeCalculationResult> {
    this.logger.log({
      message: 'Calculating withdrawal fees',
      currency,
      amount,
      network,
    });

    // Validate amount
    const validation = this.validateWithdrawalAmount(currency, amount);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Get network fee
    const networkFee = await this.getNetworkFee(currency, network);

    // Get platform fee
    const platformFee = this.getPlatformFee(currency);

    // Calculate totals
    const amountNum = parseFloat(amount);
    const networkFeeNum = parseFloat(networkFee);
    const platformFeeNum = parseFloat(platformFee);
    const totalFee = (networkFeeNum + platformFeeNum).toFixed(8);
    const totalAmount = (amountNum + parseFloat(totalFee)).toFixed(8);

    const result: FeeCalculationResult = {
      currency,
      amount,
      networkFee,
      platformFee,
      totalFee,
      totalAmount,
      minimumWithdrawal: this.getMinimumWithdrawal(currency),
      maximumWithdrawal: this.getMaximumWithdrawal(currency),
    };

    this.logger.log({
      message: 'Fees calculated',
      result,
    });

    return result;
  }

  /**
   * Get current network fee estimate from blockchain
   * For MVP, uses configured default fees
   * Production should integrate with BlockCypher, Infura, etc.
   *
   * @param currency - BTC, ETH, or USDT
   * @param network - Optional network (for USDT)
   * @returns Network fee as decimal string
   */
  async getNetworkFee(currency: string, network?: string): Promise<string> {
    // For MVP, return configured default network fees
    // Production TODO: Integrate with blockchain APIs
    // - BTC: BlockCypher API /txs/fee-estimate
    // - ETH: Infura/Alchemy eth_gasPrice * gas_limit
    // - USDT: Same as ETH (ERC-20)

    const defaultFees = {
      BTC: '0.00001', // ~1 sat/vB * 250 vB
      ETH: '0.002', // ~50 Gwei * 21000 gas
      USDT: network === 'TRC20' ? '1.0' : '0.003', // TRC20 or ERC20
    };

    const fee = defaultFees[currency] || '0.001';

    this.logger.debug({
      message: 'Network fee estimated',
      currency,
      network,
      fee,
      note: 'Using default fee for MVP',
    });

    return fee;
  }

  /**
   * Get platform fee from configuration
   * These are additional fees charged by the platform
   *
   * @param currency - BTC, ETH, or USDT
   * @returns Platform fee as decimal string
   */
  getPlatformFee(currency: string): string {
    const key = `${currency}_PLATFORM_FEE`;
    const fee = this.configService.get<string>(key);

    if (!fee) {
      this.logger.warn({
        message: 'Platform fee not configured, using default',
        currency,
        key,
      });

      // Fallback defaults
      const defaults = {
        BTC: '0.0005',
        ETH: '0.005',
        USDT: '1.0',
      };
      return defaults[currency] || '0.001';
    }

    return fee;
  }

  /**
   * Get minimum withdrawal amount
   * @param currency - BTC, ETH, or USDT
   * @returns Minimum withdrawal as decimal string
   */
  getMinimumWithdrawal(currency: string): string {
    const key = `${currency}_MIN_WITHDRAWAL`;
    const min = this.configService.get<string>(key);

    if (!min) {
      const defaults = {
        BTC: '0.001',
        ETH: '0.01',
        USDT: '10.0',
      };
      return defaults[currency] || '0.001';
    }

    return min;
  }

  /**
   * Get maximum withdrawal amount
   * @param currency - BTC, ETH, or USDT
   * @returns Maximum withdrawal as decimal string
   */
  getMaximumWithdrawal(currency: string): string {
    const key = `${currency}_MAX_WITHDRAWAL`;
    const max = this.configService.get<string>(key);

    if (!max) {
      const defaults = {
        BTC: '10.0',
        ETH: '100.0',
        USDT: '100000.0',
      };
      return defaults[currency] || '10.0';
    }

    return max;
  }

  /**
   * Validate withdrawal amount against min/max limits
   * @param currency - BTC, ETH, or USDT
   * @param amount - Withdrawal amount as decimal string
   * @returns Validation result with errors if any
   */
  validateWithdrawalAmount(
    currency: string,
    amount: string,
  ): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Check if amount is a valid number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Withdrawal amount must be a positive number');
      return { isValid: false, errors };
    }

    // Check minimum
    const min = parseFloat(this.getMinimumWithdrawal(currency));
    if (amountNum < min) {
      errors.push(
        `Withdrawal amount must be at least ${min} ${currency}`,
      );
    }

    // Check maximum
    const max = parseFloat(this.getMaximumWithdrawal(currency));
    if (amountNum > max) {
      errors.push(
        `Withdrawal amount cannot exceed ${max} ${currency}`,
      );
    }

    if (errors.length > 0) {
      this.logger.warn({
        message: 'Withdrawal amount validation failed',
        currency,
        amount,
        errors,
      });
      return { isValid: false, errors };
    }

    return { isValid: true };
  }

  /**
   * Check if withdrawal requires admin approval
   * Large withdrawals (> $10,000 equivalent) need admin approval
   *
   * @param currency - BTC, ETH, or USDT
   * @param amount - Withdrawal amount
   * @param usdPrice - Current USD price of the currency
   * @returns boolean
   */
  requiresAdminApproval(
    currency: string,
    amount: string,
    usdPrice?: number,
  ): boolean {
    // For MVP, use hardcoded threshold
    const threshold = 10000; // $10,000 USD

    if (!usdPrice) {
      // If price not available, require approval for large amounts
      const largeAmounts = {
        BTC: 0.2, // Assuming BTC > $50k
        ETH: 3.0, // Assuming ETH > $3k
        USDT: 10000.0, // USDT is 1:1 with USD
      };

      const amountNum = parseFloat(amount);
      return amountNum >= (largeAmounts[currency] || 1.0);
    }

    // Calculate USD equivalent
    const amountNum = parseFloat(amount);
    const usdEquivalent = amountNum * usdPrice;

    return usdEquivalent >= threshold;
  }
}
