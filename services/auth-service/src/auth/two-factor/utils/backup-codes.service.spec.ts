import { BackupCodeService } from './backup-codes.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('BackupCodeService', () => {
  let service: BackupCodeService;

  beforeEach(() => {
    service = new BackupCodeService();
    jest.clearAllMocks();
  });

  describe('generateCodes', () => {
    it('should generate 10 backup codes in correct format', () => {
      const codes = service.generateCodes();

      expect(codes).toHaveLength(10);
      codes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });

    it('should generate unique codes', () => {
      const codes = service.generateCodes();
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(10);
    });

    it('should generate specified number of codes', () => {
      const codes = service.generateCodes(5);

      expect(codes).toHaveLength(5);
      codes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });
  });

  describe('hashCodes', () => {
    it('should hash all codes', async () => {
      const codes = ['ABCD-1234', 'EFGH-5678'];
      const hashedCodes = ['hash1', 'hash2'];

      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce(hashedCodes[0])
        .mockResolvedValueOnce(hashedCodes[1]);

      const result = await service.hashCodes(codes);

      expect(result).toEqual(hashedCodes);
      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
      expect(bcrypt.hash).toHaveBeenCalledWith('ABCD-1234', 10);
      expect(bcrypt.hash).toHaveBeenCalledWith('EFGH-5678', 10);
    });

    it('should handle hashing errors', async () => {
      const codes = ['ABCD-1234'];
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash failed'));

      await expect(service.hashCodes(codes)).rejects.toThrow('Hash failed');
    });
  });

  describe('verifyCode', () => {
    it('should verify valid backup code', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyCode('ABCD-1234', 'hashedCode');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('ABCD-1234', 'hashedCode');
    });

    it('should reject invalid backup code', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyCode('WRONG-CODE', 'hashedCode');

      expect(result).toBe(false);
    });

    it('should handle comparison errors', async () => {
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Compare failed'));

      const result = await service.verifyCode('ABCD-1234', 'hashedCode');

      expect(result).toBe(false);
    });
  });
});