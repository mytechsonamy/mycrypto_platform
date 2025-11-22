import { Test, TestingModule } from '@nestjs/testing';
import { AddressValidationService } from './address-validation.service';

describe('AddressValidationService', () => {
  let service: AddressValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AddressValidationService],
    }).compile();

    service = module.get<AddressValidationService>(AddressValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Bitcoin - Valid P2PKH', () => {
    it('should validate genesis address', async () => {
      const result = await service.validateBitcoinAddress(
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        'mainnet',
      );
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('P2PKH');
    });
  });

  describe('Bitcoin - Valid P2SH', () => {
    it('should validate P2SH address', async () => {
      const result = await service.validateBitcoinAddress(
        '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
        'mainnet',
      );
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('P2SH');
    });
  });

  describe('Bitcoin - Valid Bech32', () => {
    it('should validate SegWit address', async () => {
      const result = await service.validateBitcoinAddress(
        'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        'mainnet',
      );
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('P2WPKH');
    });
  });

  describe('Bitcoin - Invalid', () => {
    it('should reject empty', async () => {
      const result = await service.validateBitcoinAddress('', 'mainnet');
      expect(result.isValid).toBe(false);
    });

    it('should reject null', async () => {
      const result = await service.validateBitcoinAddress(null as any, 'mainnet');
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid format', async () => {
      const result = await service.validateBitcoinAddress('invalid', 'mainnet');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Ethereum - Valid', () => {
    it('should validate checksummed', async () => {
      const result = await service.validateEthereumAddress(
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      );
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('EIP-55');
    });

    it('should normalize lowercase', async () => {
      const result = await service.validateEthereumAddress(
        '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed',
      );
      expect(result.isValid).toBe(true);
      expect(result.normalizedAddress).toBe('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
    });
  });

  describe('Ethereum - Invalid', () => {
    it('should reject empty', async () => {
      const result = await service.validateEthereumAddress('');
      expect(result.isValid).toBe(false);
    });

    it('should reject too short', async () => {
      const result = await service.validateEthereumAddress('0x1234');
      expect(result.isValid).toBe(false);
    });
  });

  describe('USDT ERC20', () => {
    it('should validate ERC20 address', async () => {
      const result = await service.validateUSDTAddress(
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'ERC20',
      );
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('USDT-ERC20');
    });
  });

  describe('USDT TRC20', () => {
    it('should validate TRC20 address', async () => {
      const result = await service.validateUSDTAddress(
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        'TRC20',
      );
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('USDT-TRC20');
    });
  });

  describe('Unified Method', () => {
    it('should route BTC', async () => {
      const result = await service.validateAddress(
        'BTC',
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      );
      expect(result.isValid).toBe(true);
    });

    it('should route ETH', async () => {
      const result = await service.validateAddress(
        'ETH',
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      );
      expect(result.isValid).toBe(true);
    });
  });
});
