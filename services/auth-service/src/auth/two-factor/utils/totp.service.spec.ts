import { TOTPService } from './totp.service';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

jest.mock('speakeasy');
jest.mock('qrcode');

describe('TOTPService', () => {
  let service: TOTPService;

  beforeEach(() => {
    service = new TOTPService();
    jest.clearAllMocks();
  });

  describe('generateSecret', () => {
    it('should generate secret and QR code', async () => {
      const mockSecret = {
        ascii: 'test-secret',
        base32: 'ORSXG5A=',
        otpauth_url: 'otpauth://totp/MyCrypto:test@example.com?secret=ORSXG5A=&issuer=MyCrypto',
      };
      const mockQrCode = 'data:image/png;base64,mockQrData';

      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (qrcode.toDataURL as jest.Mock).mockResolvedValue(mockQrCode);

      const result = await service.generateSecret('test@example.com', 'MyCrypto');

      expect(result).toEqual({
        secret: mockSecret.ascii,
        qrCode: mockQrCode,
        manualEntryKey: mockSecret.base32,
      });
      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        length: 32,
        name: encodeURIComponent('MyCrypto:test@example.com'),
        issuer: 'MyCrypto',
      });
      expect(qrcode.toDataURL).toHaveBeenCalledWith(mockSecret.otpauth_url);
    });

    it('should handle QR code generation errors', async () => {
      const mockSecret = {
        ascii: 'test-secret',
        base32: 'ORSXG5A=',
        otpauth_url: 'otpauth://totp/test',
      };

      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (qrcode.toDataURL as jest.Mock).mockRejectedValue(new Error('QR generation failed'));

      await expect(service.generateSecret('test@example.com', 'MyCrypto')).rejects.toThrow(
        'Failed to generate QR code',
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid TOTP token', () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = service.verifyToken('secret', '123456');

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'secret',
        encoding: 'ascii',
        token: '123456',
        window: 1,
      });
    });

    it('should reject invalid TOTP token', () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = service.verifyToken('secret', '999999');

      expect(result).toBe(false);
    });

    it('should handle verification errors', () => {
      (speakeasy.totp.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Verification error');
      });

      const result = service.verifyToken('secret', '123456');

      expect(result).toBe(false);
    });
  });
});