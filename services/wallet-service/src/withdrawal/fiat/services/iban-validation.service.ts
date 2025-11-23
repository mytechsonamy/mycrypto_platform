import { Injectable, Logger } from '@nestjs/common';
import { isValidIBAN, isValidBIC, electronicFormatIBAN, friendlyFormatIBAN } from 'ibantools';

/**
 * IBANValidationService
 * Validates IBAN, SWIFT/BIC codes, and US bank account details
 *
 * Story 2.6: Fiat Withdrawal - Day 1
 * - IBAN validation with checksum verification
 * - SWIFT/BIC code validation
 * - US routing number and account number validation
 */

export interface IBANValidationResult {
  isValid: boolean;
  iban?: string; // Normalized IBAN (electronic format)
  friendlyFormat?: string; // IBAN with spaces
  country?: string;
  error?: string;
}

export interface SWIFTValidationResult {
  isValid: boolean;
  swift?: string; // Normalized SWIFT code
  error?: string;
}

export interface USAccountValidationResult {
  isValid: boolean;
  error?: string;
}

@Injectable()
export class IBANValidationService {
  private readonly logger = new Logger(IBANValidationService.name);

  /**
   * Validate IBAN (International Bank Account Number)
   * Supports all EU countries + many others
   *
   * @param iban - IBAN string (with or without spaces)
   * @returns IBANValidationResult
   */
  validateIBAN(iban: string): IBANValidationResult {
    if (!iban || typeof iban !== 'string') {
      return {
        isValid: false,
        error: 'IBAN is required',
      };
    }

    // Remove spaces and convert to uppercase
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

    // Validate IBAN format and checksum
    const isValid = isValidIBAN(cleanIBAN);

    if (!isValid) {
      this.logger.warn({
        message: 'Invalid IBAN provided',
        iban: cleanIBAN.substring(0, 4) + '***', // Log only first 4 chars for security
      });

      return {
        isValid: false,
        error: 'Invalid IBAN format or checksum',
      };
    }

    // Extract country code (first 2 characters)
    const country = cleanIBAN.substring(0, 2);

    // Get electronic and friendly formats
    const electronicFormat = electronicFormatIBAN(cleanIBAN);
    const friendly = friendlyFormatIBAN(cleanIBAN);

    this.logger.log({
      message: 'IBAN validated successfully',
      country,
    });

    return {
      isValid: true,
      iban: electronicFormat || cleanIBAN,
      friendlyFormat: friendly || undefined,
      country,
    };
  }

  /**
   * Validate SWIFT/BIC code
   * Format: 8 or 11 characters (AAAABBCCXXX)
   * - AAAA: Bank code (4 letters)
   * - BB: Country code (2 letters)
   * - CC: Location code (2 letters or digits)
   * - XXX: Branch code (3 letters or digits, optional)
   *
   * @param swift - SWIFT/BIC code
   * @returns SWIFTValidationResult
   */
  validateSWIFT(swift: string): SWIFTValidationResult {
    if (!swift || typeof swift !== 'string') {
      return {
        isValid: false,
        error: 'SWIFT/BIC code is required',
      };
    }

    // Remove spaces and convert to uppercase
    const cleanSWIFT = swift.replace(/\s/g, '').toUpperCase();

    // Validate using ibantools
    const isValid = isValidBIC(cleanSWIFT);

    if (!isValid) {
      this.logger.warn({
        message: 'Invalid SWIFT/BIC code provided',
        swift: cleanSWIFT.substring(0, 4) + '***',
      });

      return {
        isValid: false,
        error: 'Invalid SWIFT/BIC code format',
      };
    }

    this.logger.log({
      message: 'SWIFT/BIC code validated successfully',
      swift: cleanSWIFT.substring(0, 6) + '***',
    });

    return {
      isValid: true,
      swift: cleanSWIFT,
    };
  }

  /**
   * Validate US bank account details (routing number + account number)
   * Routing number: 9 digits (ABA routing number)
   * Account number: 6-17 digits
   *
   * @param accountNumber - US bank account number
   * @param routingNumber - US routing number (ABA)
   * @returns USAccountValidationResult
   */
  validateUSAccount(
    accountNumber: string,
    routingNumber: string,
  ): USAccountValidationResult {
    if (!accountNumber || !routingNumber) {
      return {
        isValid: false,
        error: 'Both account number and routing number are required',
      };
    }

    // Validate routing number format (9 digits)
    const routingRegex = /^\d{9}$/;
    if (!routingRegex.test(routingNumber)) {
      return {
        isValid: false,
        error: 'Routing number must be exactly 9 digits',
      };
    }

    // Validate routing number checksum (ABA algorithm)
    if (!this.validateRoutingNumber(routingNumber)) {
      return {
        isValid: false,
        error: 'Invalid routing number checksum',
      };
    }

    // Validate account number format (6-17 digits)
    const accountRegex = /^\d{6,17}$/;
    if (!accountRegex.test(accountNumber)) {
      return {
        isValid: false,
        error: 'Account number must be 6-17 digits',
      };
    }

    this.logger.log({
      message: 'US bank account validated successfully',
      routingNumber: routingNumber.substring(0, 3) + '***',
    });

    return {
      isValid: true,
    };
  }

  /**
   * Validate US routing number checksum (ABA algorithm)
   * Formula: (3 * (d1 + d4 + d7) + 7 * (d2 + d5 + d8) + 1 * (d3 + d6 + d9)) % 10 = 0
   *
   * @param routingNumber - 9-digit routing number
   * @returns boolean
   * @private
   */
  private validateRoutingNumber(routingNumber: string): boolean {
    const digits = routingNumber.split('').map(Number);

    const checksum =
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      1 * (digits[2] + digits[5] + digits[8]);

    return checksum % 10 === 0;
  }

  /**
   * Determine account type based on currency
   * Used to decide which validation to apply
   *
   * @param currency - Currency code (USD, EUR, TRY, GBP, etc.)
   * @returns 'IBAN' | 'US_ACCOUNT' | 'UNKNOWN'
   */
  getAccountType(currency: string): 'IBAN' | 'US_ACCOUNT' | 'UNKNOWN' {
    const ibanCurrencies = ['EUR', 'GBP', 'CHF', 'TRY', 'PLN', 'SEK', 'NOK', 'DKK'];
    const usAccountCurrencies = ['USD'];

    if (ibanCurrencies.includes(currency.toUpperCase())) {
      return 'IBAN';
    }

    if (usAccountCurrencies.includes(currency.toUpperCase())) {
      return 'US_ACCOUNT';
    }

    return 'UNKNOWN';
  }
}
