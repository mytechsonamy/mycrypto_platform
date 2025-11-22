import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeeCalculationService } from './fee-calculation.service';

describe('FeeCalculationService', () => {
  let service: FeeCalculationService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeeCalculationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                BTC_MIN_WITHDRAWAL: '0.001',
                ETH_MIN_WITHDRAWAL: '0.01',
                USDT_MIN_WITHDRAWAL: '10.0',
                BTC_MAX_WITHDRAWAL: '10.0',
                ETH_MAX_WITHDRAWAL: '100.0',
                USDT_MAX_WITHDRAWAL: '100000.0',
                BTC_PLATFORM_FEE: '0.0005',
                ETH_PLATFORM_FEE: '0.005',
                USDT_PLATFORM_FEE: '1.0',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FeeCalculationService>(FeeCalculationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateWithdrawalFees', () => {
    it('should calculate BTC withdrawal fees correctly', async () => {
      const result = await service.calculateWithdrawalFees('BTC', '0.1');

      expect(result.currency).toBe('BTC');
      expect(result.amount).toBe('0.1');
      expect(result.networkFee).toBe('0.00001');
      expect(result.platformFee).toBe('0.0005');
      expect(parseFloat(result.totalFee)).toBeCloseTo(0.00051, 5);
      expect(parseFloat(result.totalAmount)).toBeCloseTo(0.10051, 5);
    });

    it('should calculate ETH withdrawal fees correctly', async () => {
      const result = await service.calculateWithdrawalFees('ETH', '1.0');

      expect(result.currency).toBe('ETH');
      expect(result.amount).toBe('1.0');
      expect(result.networkFee).toBe('0.002');
      expect(result.platformFee).toBe('0.005');
      expect(parseFloat(result.totalFee)).toBeCloseTo(0.007, 3);
      expect(parseFloat(result.totalAmount)).toBeCloseTo(1.007, 3);
    });

    it('should calculate USDT ERC20 fees correctly', async () => {
      const result = await service.calculateWithdrawalFees('USDT', '100.0', 'ERC20');

      expect(result.currency).toBe('USDT');
      expect(result.amount).toBe('100.0');
      expect(result.platformFee).toBe('1.0');
      expect(parseFloat(result.totalAmount)).toBeGreaterThan(100.0);
    });

    it('should throw error for amount below minimum', async () => {
      await expect(
        service.calculateWithdrawalFees('BTC', '0.0001'),
      ).rejects.toThrow();
    });

    it('should throw error for amount above maximum', async () => {
      await expect(
        service.calculateWithdrawalFees('BTC', '100.0'),
      ).rejects.toThrow();
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        service.calculateWithdrawalFees('BTC', 'invalid'),
      ).rejects.toThrow();
    });

    it('should throw error for zero amount', async () => {
      await expect(
        service.calculateWithdrawalFees('BTC', '0'),
      ).rejects.toThrow();
    });

    it('should throw error for negative amount', async () => {
      await expect(
        service.calculateWithdrawalFees('BTC', '-0.1'),
      ).rejects.toThrow();
    });
  });

  describe('getNetworkFee', () => {
    it('should return BTC network fee', async () => {
      const fee = await service.getNetworkFee('BTC');
      expect(fee).toBe('0.00001');
    });

    it('should return ETH network fee', async () => {
      const fee = await service.getNetworkFee('ETH');
      expect(fee).toBe('0.002');
    });

    it('should return USDT ERC20 network fee', async () => {
      const fee = await service.getNetworkFee('USDT', 'ERC20');
      expect(fee).toBe('0.003');
    });

    it('should return USDT TRC20 network fee', async () => {
      const fee = await service.getNetworkFee('USDT', 'TRC20');
      expect(fee).toBe('1.0');
    });
  });

  describe('getPlatformFee', () => {
    it('should return BTC platform fee from config', () => {
      const fee = service.getPlatformFee('BTC');
      expect(fee).toBe('0.0005');
    });

    it('should return ETH platform fee from config', () => {
      const fee = service.getPlatformFee('ETH');
      expect(fee).toBe('0.005');
    });

    it('should return USDT platform fee from config', () => {
      const fee = service.getPlatformFee('USDT');
      expect(fee).toBe('1.0');
    });
  });

  describe('validateWithdrawalAmount', () => {
    it('should validate valid BTC amount', () => {
      const result = service.validateWithdrawalAmount('BTC', '0.1');
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject amount below minimum', () => {
      const result = service.validateWithdrawalAmount('BTC', '0.0001');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Withdrawal amount must be at least 0.001 BTC');
    });

    it('should reject amount above maximum', () => {
      const result = service.validateWithdrawalAmount('BTC', '100.0');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Withdrawal amount cannot exceed 10 BTC');
    });

    it('should reject invalid number', () => {
      const result = service.validateWithdrawalAmount('BTC', 'abc');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Withdrawal amount must be a positive number');
    });

    it('should reject zero amount', () => {
      const result = service.validateWithdrawalAmount('BTC', '0');
      expect(result.isValid).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = service.validateWithdrawalAmount('BTC', '-1');
      expect(result.isValid).toBe(false);
    });
  });

  describe('requiresAdminApproval', () => {
    it('should require approval for large BTC withdrawal', () => {
      const requires = service.requiresAdminApproval('BTC', '0.5', 50000);
      expect(requires).toBe(true); // 0.5 * 50000 = $25,000
    });

    it('should not require approval for small BTC withdrawal', () => {
      const requires = service.requiresAdminApproval('BTC', '0.1', 50000);
      expect(requires).toBe(false); // 0.1 * 50000 = $5,000
    });

    it('should require approval for large USDT withdrawal', () => {
      const requires = service.requiresAdminApproval('USDT', '15000', 1);
      expect(requires).toBe(true);
    });

    it('should not require approval for small USDT withdrawal', () => {
      const requires = service.requiresAdminApproval('USDT', '5000', 1);
      expect(requires).toBe(false);
    });

    it('should use default threshold when price not provided', () => {
      const requires = service.requiresAdminApproval('BTC', '0.3');
      expect(requires).toBe(true); // 0.3 >= 0.2 (default threshold)
    });
  });

  describe('getMinimumWithdrawal', () => {
    it('should return BTC minimum from config', () => {
      const min = service.getMinimumWithdrawal('BTC');
      expect(min).toBe('0.001');
    });

    it('should return ETH minimum from config', () => {
      const min = service.getMinimumWithdrawal('ETH');
      expect(min).toBe('0.01');
    });

    it('should return USDT minimum from config', () => {
      const min = service.getMinimumWithdrawal('USDT');
      expect(min).toBe('10.0');
    });
  });

  describe('getMaximumWithdrawal', () => {
    it('should return BTC maximum from config', () => {
      const max = service.getMaximumWithdrawal('BTC');
      expect(max).toBe('10.0');
    });

    it('should return ETH maximum from config', () => {
      const max = service.getMaximumWithdrawal('ETH');
      expect(max).toBe('100.0');
    });

    it('should return USDT maximum from config', () => {
      const max = service.getMaximumWithdrawal('USDT');
      expect(max).toBe('100000.0');
    });
  });
});
