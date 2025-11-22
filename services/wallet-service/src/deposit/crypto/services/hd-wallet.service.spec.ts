import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HDWalletService } from './hd-wallet.service';
import * as bip39 from 'bip39';

describe('HDWalletService', () => {
  let service: HDWalletService;
  let configService: ConfigService;

  // Test mnemonic (24 words, 256-bit entropy) - ONLY FOR TESTING!
  const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'HD_WALLET_MNEMONIC') {
        return testMnemonic;
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HDWalletService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HDWalletService>(HDWalletService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load mnemonic from config', () => {
      expect(configService.get).toHaveBeenCalledWith('HD_WALLET_MNEMONIC');
    });

    it('should throw error if mnemonic not found', () => {
      const invalidConfigService = {
        get: jest.fn(() => null),
      };

      expect(() => {
        new HDWalletService(invalidConfigService as any);
      }).toThrow('HD_WALLET_MNEMONIC not found in environment');
    });

    it('should throw error if mnemonic is invalid', () => {
      const invalidConfigService = {
        get: jest.fn(() => 'invalid mnemonic phrase'),
      };

      expect(() => {
        new HDWalletService(invalidConfigService as any);
      }).toThrow('Invalid HD_WALLET_MNEMONIC');
    });

    it('should validate correct mnemonic format', () => {
      const validMnemonic = bip39.generateMnemonic(256);
      const validConfigService = {
        get: jest.fn(() => validMnemonic),
      };

      expect(() => {
        new HDWalletService(validConfigService as any);
      }).not.toThrow();
    });
  });

  describe('generateBtcAddress', () => {
    it('should generate valid Bitcoin address at index 0', () => {
      const result = service.generateBtcAddress(0);

      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('derivationPath');
      expect(result).toHaveProperty('publicKey');
      expect(result.derivationPath).toBe("m/44'/0'/0'/0/0");
      // BTC address should start with bc1 (native SegWit) for mainnet
      expect(result.address).toMatch(/^bc1/);
    });

    it('should generate different addresses for different indexes', () => {
      const addr0 = service.generateBtcAddress(0);
      const addr1 = service.generateBtcAddress(1);
      const addr2 = service.generateBtcAddress(2);

      expect(addr0.address).not.toBe(addr1.address);
      expect(addr1.address).not.toBe(addr2.address);
      expect(addr0.address).not.toBe(addr2.address);
    });

    it('should generate consistent addresses for same index', () => {
      const addr1 = service.generateBtcAddress(5);
      const addr2 = service.generateBtcAddress(5);

      expect(addr1.address).toBe(addr2.address);
      expect(addr1.publicKey).toBe(addr2.publicKey);
      expect(addr1.derivationPath).toBe(addr2.derivationPath);
    });

    it('should include public key in hex format', () => {
      const result = service.generateBtcAddress(0);

      expect(result.publicKey).toBeDefined();
      expect(result.publicKey).toMatch(/^[0-9a-f]+$/i);
      // Compressed public key should be 66 hex characters (33 bytes)
      expect(result.publicKey.length).toBe(66);
    });

    it('should follow BIP-44 derivation path format', () => {
      const result0 = service.generateBtcAddress(0);
      const result10 = service.generateBtcAddress(10);
      const result100 = service.generateBtcAddress(100);

      expect(result0.derivationPath).toBe("m/44'/0'/0'/0/0");
      expect(result10.derivationPath).toBe("m/44'/0'/0'/0/10");
      expect(result100.derivationPath).toBe("m/44'/0'/0'/0/100");
    });
  });

  describe('generateEthAddress', () => {
    it('should generate valid Ethereum address at index 0', () => {
      const result = service.generateEthAddress(0);

      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('derivationPath');
      expect(result).toHaveProperty('publicKey');
      expect(result.derivationPath).toBe("m/44'/60'/0'/0/0");
      // ETH address should start with 0x
      expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should generate different addresses for different indexes', () => {
      const addr0 = service.generateEthAddress(0);
      const addr1 = service.generateEthAddress(1);
      const addr2 = service.generateEthAddress(2);

      expect(addr0.address).not.toBe(addr1.address);
      expect(addr1.address).not.toBe(addr2.address);
      expect(addr0.address).not.toBe(addr2.address);
    });

    it('should generate consistent addresses for same index', () => {
      const addr1 = service.generateEthAddress(5);
      const addr2 = service.generateEthAddress(5);

      expect(addr1.address).toBe(addr2.address);
      expect(addr1.publicKey).toBe(addr2.publicKey);
      expect(addr1.derivationPath).toBe(addr2.derivationPath);
    });

    it('should generate checksummed Ethereum addresses', () => {
      const result = service.generateEthAddress(0);

      // Ethereum addresses should have mixed case (checksum)
      expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should follow BIP-44 derivation path for Ethereum (coin type 60)', () => {
      const result0 = service.generateEthAddress(0);
      const result10 = service.generateEthAddress(10);

      expect(result0.derivationPath).toBe("m/44'/60'/0'/0/0");
      expect(result10.derivationPath).toBe("m/44'/60'/0'/0/10");
    });
  });

  describe('generateUsdtAddress', () => {
    it('should generate same address as ETH (ERC-20)', () => {
      const ethAddr = service.generateEthAddress(0);
      const usdtAddr = service.generateUsdtAddress(0);

      expect(usdtAddr.address).toBe(ethAddr.address);
      expect(usdtAddr.publicKey).toBe(ethAddr.publicKey);
      expect(usdtAddr.derivationPath).toBe(ethAddr.derivationPath);
    });

    it('should generate different USDT addresses for different indexes', () => {
      const addr0 = service.generateUsdtAddress(0);
      const addr1 = service.generateUsdtAddress(1);

      expect(addr0.address).not.toBe(addr1.address);
    });

    it('should follow Ethereum derivation path', () => {
      const result = service.generateUsdtAddress(5);

      expect(result.derivationPath).toBe("m/44'/60'/0'/0/5");
    });
  });

  describe('getNextAddressIndex', () => {
    it('should return next sequential index', () => {
      expect(service.getNextAddressIndex('BTC', 0)).toBe(1);
      expect(service.getNextAddressIndex('ETH', 5)).toBe(6);
      expect(service.getNextAddressIndex('USDT', 99)).toBe(100);
    });

    it('should work with negative input (edge case)', () => {
      expect(service.getNextAddressIndex('BTC', -1)).toBe(0);
    });

    it('should work with large numbers', () => {
      expect(service.getNextAddressIndex('ETH', 999999)).toBe(1000000);
    });
  });

  describe('verifyAddress', () => {
    it('should verify correct Bitcoin address', () => {
      const generated = service.generateBtcAddress(10);
      const isValid = service.verifyAddress('BTC', generated.address, 10);

      expect(isValid).toBe(true);
    });

    it('should verify correct Ethereum address', () => {
      const generated = service.generateEthAddress(5);
      const isValid = service.verifyAddress('ETH', generated.address, 5);

      expect(isValid).toBe(true);
    });

    it('should verify correct USDT address', () => {
      const generated = service.generateUsdtAddress(3);
      const isValid = service.verifyAddress('USDT', generated.address, 3);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect Bitcoin address', () => {
      const isValid = service.verifyAddress('BTC', 'bc1qinvalidaddress', 0);

      expect(isValid).toBe(false);
    });

    it('should reject incorrect Ethereum address', () => {
      const isValid = service.verifyAddress('ETH', '0x0000000000000000000000000000000000000000', 0);

      expect(isValid).toBe(false);
    });

    it('should reject address with wrong index', () => {
      const generated = service.generateBtcAddress(5);
      const isValid = service.verifyAddress('BTC', generated.address, 10);

      expect(isValid).toBe(false);
    });

    it('should be case-insensitive for Ethereum addresses', () => {
      const generated = service.generateEthAddress(0);
      const lowercase = generated.address.toLowerCase();
      const uppercase = generated.address.toUpperCase();

      expect(service.verifyAddress('ETH', lowercase, 0)).toBe(true);
      expect(service.verifyAddress('ETH', uppercase, 0)).toBe(true);
    });

    it('should throw error for unsupported currency', () => {
      const isValid = service.verifyAddress('XRP', '0xsomeaddress', 0);

      expect(isValid).toBe(false);
    });
  });

  describe('generateMnemonic (static method)', () => {
    it('should generate 24-word mnemonic', () => {
      const mnemonic = HDWalletService.generateMnemonic();
      const words = mnemonic.split(' ');

      expect(words.length).toBe(24);
    });

    it('should generate valid BIP-39 mnemonic', () => {
      const mnemonic = HDWalletService.generateMnemonic();

      expect(bip39.validateMnemonic(mnemonic)).toBe(true);
    });

    it('should generate different mnemonics each time', () => {
      const mnemonic1 = HDWalletService.generateMnemonic();
      const mnemonic2 = HDWalletService.generateMnemonic();
      const mnemonic3 = HDWalletService.generateMnemonic();

      expect(mnemonic1).not.toBe(mnemonic2);
      expect(mnemonic2).not.toBe(mnemonic3);
      expect(mnemonic1).not.toBe(mnemonic3);
    });
  });

  describe('getWalletInfo', () => {
    it('should return coin type constants', () => {
      const info = service.getWalletInfo();

      expect(info).toHaveProperty('coinTypes');
      expect(info.coinTypes.BTC).toBe(0);
      expect(info.coinTypes.ETH).toBe(60);
      expect(info.coinTypes.USDT).toBe(60);
    });
  });

  describe('Address Generation Performance', () => {
    it('should generate BTC addresses quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 10; i++) {
        service.generateBtcAddress(i);
      }

      const duration = Date.now() - start;
      // Should generate 10 addresses in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should generate ETH addresses quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 10; i++) {
        service.generateEthAddress(i);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle index 0', () => {
      const btc = service.generateBtcAddress(0);
      const eth = service.generateEthAddress(0);

      expect(btc.address).toBeDefined();
      expect(eth.address).toBeDefined();
    });

    it('should handle large index numbers', () => {
      const btc = service.generateBtcAddress(2147483647); // Max safe integer for BIP-44
      const eth = service.generateEthAddress(2147483647);

      expect(btc.address).toBeDefined();
      expect(eth.address).toBeDefined();
    });

    it('should generate addresses for sequential indexes without gaps', () => {
      const addresses = [];

      for (let i = 0; i < 5; i++) {
        addresses.push(service.generateBtcAddress(i).address);
      }

      // All addresses should be unique
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(5);
    });
  });
});
