import { EncryptionService } from './encryption.service';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;
  // Generate a proper 32-byte key and encode it as base64
  const testKeyBuffer = Buffer.from('test-encryption-key-32-bytes-ok!', 'utf8'); // 32 bytes
  const testKey = testKeyBuffer.toString('base64');

  beforeEach(() => {
    service = new EncryptionService(testKey);
  });

  describe('constructor', () => {
    it('should initialize with a 32-byte key', () => {
      expect(() => new EncryptionService(testKey)).not.toThrow();
    });

    it('should throw error if key is invalid', () => {
      expect(() => new EncryptionService('invalid-base64!')).toThrow();
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data successfully', () => {
      const plaintext = 'This is a secret message';

      const encrypted = service.encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toBeTruthy(); // Should be a base64 string

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate different ciphertexts for same plaintext (due to random IV)', () => {
      const plaintext = 'Same message';

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same plaintext
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+{}[]|\\:;"\'<>,.?/~`±§';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(1000);

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error when decrypting invalid data', () => {
      expect(() => service.decrypt('invalid-encrypted-data')).toThrow('Decryption failed');
    });

    it('should throw error when decrypting with wrong IV format', () => {
      expect(() => service.decrypt('no-colon-separator')).toThrow('Decryption failed');
    });

    it('should throw error when decrypting data encrypted with different key', () => {
      const key1 = Buffer.from('key1-32-bytes-long-for-testing!!', 'utf8').toString('base64');
      const key2 = Buffer.from('key2-32-bytes-long-for-testing!!', 'utf8').toString('base64');
      const service1 = new EncryptionService(key1);
      const service2 = new EncryptionService(key2);

      const encrypted = service1.encrypt('test data');

      expect(() => service2.decrypt(encrypted)).toThrow('Decryption failed');
    });
  });

  describe('encrypt', () => {
    it('should return base64 encoded string', () => {
      const plaintext = 'test';
      const encrypted = service.encrypt(plaintext);

      // Should be valid base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();

      // Should be able to decode it
      const decoded = Buffer.from(encrypted, 'base64');
      expect(decoded.length).toBeGreaterThan(0);
    });
  });

  describe('decrypt', () => {
    it('should handle corrupted auth tag', () => {
      const plaintext = 'test';
      const encrypted = service.encrypt(plaintext);

      // Corrupt the encrypted data
      const encryptedBuffer = Buffer.from(encrypted, 'base64');
      encryptedBuffer[encryptedBuffer.length - 1] = encryptedBuffer[encryptedBuffer.length - 1] ^ 1; // Flip a bit
      const corrupted = encryptedBuffer.toString('base64');

      expect(() => service.decrypt(corrupted)).toThrow('Decryption failed');
    });
  });
});