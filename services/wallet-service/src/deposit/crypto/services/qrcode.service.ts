import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

/**
 * QRCodeService
 * Generates QR codes for cryptocurrency deposit addresses
 */
@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);

  /**
   * Generate QR code data URL for an address
   * @param address - Cryptocurrency address
   * @returns Data URL for QR code image
   */
  async generateQRCode(address: string): Promise<string> {
    try {
      // Generate QR code as data URL (base64 encoded PNG)
      const qrCodeDataUrl = await QRCode.toDataURL(address, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 256,
        margin: 2,
      });

      this.logger.log({
        message: 'QR code generated successfully',
        address: address.substring(0, 10) + '...',
      });

      return qrCodeDataUrl;
    } catch (error) {
      this.logger.error({
        message: 'Failed to generate QR code',
        address: address.substring(0, 10) + '...',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Generate QR code for BTC address with amount (BIP-21)
   * @param address - Bitcoin address
   * @param amount - Optional amount in BTC
   * @returns Data URL for QR code
   */
  async generateBitcoinQRCode(
    address: string,
    amount?: string,
  ): Promise<string> {
    let uri = `bitcoin:${address}`;

    if (amount) {
      uri += `?amount=${amount}`;
    }

    return this.generateQRCode(uri);
  }

  /**
   * Generate QR code for ETH/USDT address with amount (EIP-681)
   * @param address - Ethereum address
   * @param amount - Optional amount
   * @param tokenAddress - Optional ERC-20 token contract address
   * @returns Data URL for QR code
   */
  async generateEthereumQRCode(
    address: string,
    amount?: string,
    tokenAddress?: string,
  ): Promise<string> {
    let uri = `ethereum:${address}`;

    if (tokenAddress) {
      // ERC-20 token transfer
      uri = `ethereum:${tokenAddress}/transfer?address=${address}`;
      if (amount) {
        uri += `&uint256=${amount}`;
      }
    } else if (amount) {
      // ETH transfer
      uri += `?value=${amount}`;
    }

    return this.generateQRCode(uri);
  }
}
