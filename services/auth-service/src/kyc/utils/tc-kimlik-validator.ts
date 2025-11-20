/**
 * TC Kimlik No (Turkish ID Number) Validator
 *
 * Turkish ID numbers are 11 digits and follow a checksum algorithm:
 * 1. First digit cannot be 0
 * 2. The 10th digit = (sum of odd-positioned digits * 7 - sum of even-positioned digits) mod 10
 * 3. The 11th digit = sum of first 10 digits mod 10
 */

export class TcKimlikValidator {
  /**
   * Validates Turkish ID number (TC Kimlik No)
   * @param tcKimlik - 11-digit Turkish ID number as string
   * @returns true if valid, false otherwise
   */
  static validate(tcKimlik: string): boolean {
    // Remove any whitespace
    tcKimlik = tcKimlik?.trim();

    // Must be exactly 11 digits
    if (!tcKimlik || tcKimlik.length !== 11) {
      return false;
    }

    // Must be all digits
    if (!/^[0-9]{11}$/.test(tcKimlik)) {
      return false;
    }

    // First digit cannot be 0
    if (tcKimlik[0] === '0') {
      return false;
    }

    const digits = tcKimlik.split('').map(Number);

    // Calculate sum of odd-positioned digits (1st, 3rd, 5th, 7th, 9th - indices 0,2,4,6,8)
    const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];

    // Calculate sum of even-positioned digits (2nd, 4th, 6th, 8th - indices 1,3,5,7)
    const sumEven = digits[1] + digits[3] + digits[5] + digits[7];

    // 10th digit should be (sumOdd * 7 - sumEven) mod 10
    const expectedTenthDigit = (sumOdd * 7 - sumEven) % 10;
    if (expectedTenthDigit < 0) {
      // Handle negative modulo
      const adjusted = (expectedTenthDigit + 10) % 10;
      if (adjusted !== digits[9]) {
        return false;
      }
    } else if (expectedTenthDigit !== digits[9]) {
      return false;
    }

    // Calculate sum of first 10 digits
    const sumFirst10 = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0);

    // 11th digit should be sum of first 10 digits mod 10
    if (sumFirst10 % 10 !== digits[10]) {
      return false;
    }

    return true;
  }

  /**
   * Get validation error message in Turkish
   * @param tcKimlik - Turkish ID number to validate
   * @returns Error message or null if valid
   */
  static getErrorMessage(tcKimlik: string): string | null {
    if (!tcKimlik || tcKimlik.trim().length === 0) {
      return 'TC Kimlik No zorunludur';
    }

    tcKimlik = tcKimlik.trim();

    if (tcKimlik.length !== 11) {
      return 'TC Kimlik No 11 haneli olmalıdır';
    }

    if (!/^[0-9]{11}$/.test(tcKimlik)) {
      return 'TC Kimlik No sadece rakamlardan oluşmalıdır';
    }

    if (tcKimlik[0] === '0') {
      return 'TC Kimlik No sıfır ile başlayamaz';
    }

    if (!this.validate(tcKimlik)) {
      return 'Geçersiz TC Kimlik No (checksum hatası)';
    }

    return null;
  }

  /**
   * Sanitize TC Kimlik number (remove spaces, dashes, etc.)
   * @param tcKimlik - Raw TC Kimlik input
   * @returns Sanitized 11-digit string or original if invalid format
   */
  static sanitize(tcKimlik: string): string {
    if (!tcKimlik) return '';

    // Remove all non-digit characters
    return tcKimlik.replace(/\D/g, '');
  }

  /**
   * Format TC Kimlik for display (XXX XX XXX XX X)
   * @param tcKimlik - 11-digit TC Kimlik
   * @returns Formatted string or original if invalid
   */
  static format(tcKimlik: string): string {
    const sanitized = this.sanitize(tcKimlik);

    if (sanitized.length !== 11) {
      return tcKimlik;
    }

    return `${sanitized.slice(0, 3)} ${sanitized.slice(3, 5)} ${sanitized.slice(5, 8)} ${sanitized.slice(8, 10)} ${sanitized.slice(10)}`;
  }
}

/**
 * Example valid TC Kimlik numbers for testing:
 * - 10000000146
 * - 11111111110
 * - 48681066592
 * - 82645941890
 * - 15993937836
 */
