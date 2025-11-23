import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { WithdrawalRequestService } from './withdrawal-request.service';
import { CryptoWithdrawalRequest } from '../entities/crypto-withdrawal-request.entity';
import { UserWallet } from '../../wallet/entities/user-wallet.entity';
import { LedgerEntry } from '../../ledger/entities/ledger-entry.entity';
import { AddressValidationService } from './address-validation.service';
import { FeeCalculationService } from './fee-calculation.service';
import { TwoFactorVerificationService } from './two-factor-verification.service';
import { RedisService } from '../../common/redis/redis.service';

describe('WithdrawalRequestService', () => {
  let service: WithdrawalRequestService;
  let withdrawalRepository: any;
  let walletRepository: any;
  let ledgerRepository: any;
  let addressValidationService: AddressValidationService;
  let feeCalculationService: FeeCalculationService;
  let twoFactorService: TwoFactorVerificationService;
  let redisService: RedisService;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testBtcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
  const testEthAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn((entity, data) => ({ id: 'generated-id', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
    },
  };

  const mockWithdrawalRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockWalletRepository = {};

  const mockLedgerRepository = {};

  const mockAddressValidationService = {
    validateAddress: jest.fn(),
  };

  const mockFeeCalculationService = {
    calculateWithdrawalFees: jest.fn(),
    requiresAdminApproval: jest.fn(),
  };

  const mockTwoFactorService = {
    verify2FACode: jest.fn(),
  };

  const mockRedisService = {
    del: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalRequestService,
        {
          provide: getRepositoryToken(CryptoWithdrawalRequest),
          useValue: mockWithdrawalRepository,
        },
        {
          provide: getRepositoryToken(UserWallet),
          useValue: mockWalletRepository,
        },
        {
          provide: getRepositoryToken(LedgerEntry),
          useValue: mockLedgerRepository,
        },
        {
          provide: AddressValidationService,
          useValue: mockAddressValidationService,
        },
        {
          provide: FeeCalculationService,
          useValue: mockFeeCalculationService,
        },
        {
          provide: TwoFactorVerificationService,
          useValue: mockTwoFactorService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<WithdrawalRequestService>(WithdrawalRequestService);
    withdrawalRepository = module.get(getRepositoryToken(CryptoWithdrawalRequest));
    walletRepository = module.get(getRepositoryToken(UserWallet));
    ledgerRepository = module.get(getRepositoryToken(LedgerEntry));
    addressValidationService = module.get<AddressValidationService>(
      AddressValidationService,
    );
    feeCalculationService = module.get<FeeCalculationService>(
      FeeCalculationService,
    );
    twoFactorService = module.get<TwoFactorVerificationService>(
      TwoFactorVerificationService,
    );
    redisService = module.get<RedisService>(RedisService);
    dataSource = module.get<DataSource>(DataSource);
    queryRunner = mockQueryRunner as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(withdrawalRepository).toBeDefined();
      expect(walletRepository).toBeDefined();
      expect(ledgerRepository).toBeDefined();
      expect(addressValidationService).toBeDefined();
      expect(feeCalculationService).toBeDefined();
      expect(twoFactorService).toBeDefined();
      expect(redisService).toBeDefined();
      expect(dataSource).toBeDefined();
    });
  });

  describe('createWithdrawalRequest', () => {
    const createWithdrawalDto = {
      currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
      amount: '0.5',
      destinationAddress: testBtcAddress,
      twoFaCode: '123456',
      network: undefined,
    };

    const mockWallet = {
      userId: testUserId,
      currency: 'BTC',
      availableBalance: '1.00000000',
      lockedBalance: '0.00000000',
      totalBalance: '1.00000000',
    };

    const mockFees = {
      networkFee: '0.0001',
      platformFee: '0.0005',
      totalAmount: '0.5006',
    };

    it('should create withdrawal request successfully', async () => {
      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(mockFees);
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(false);
      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);

      const result = await service.createWithdrawalRequest(
        testUserId,
        createWithdrawalDto,
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.currency).toBe('BTC');
      expect(result.amount).toBe('0.5');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `user:balances:${testUserId}`,
      );
    });

    it('should throw BadRequestException for invalid address', async () => {
      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: false,
        errors: ['Invalid address format'],
      });

      await expect(
        service.createWithdrawalRequest(testUserId, createWithdrawalDto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createWithdrawalRequest(testUserId, createWithdrawalDto),
      ).rejects.toThrow('Invalid BTC address: Invalid address format');
    });

    it('should throw ForbiddenException for invalid 2FA code', async () => {
      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({
        isValid: false,
        error: 'Invalid or expired 2FA code',
      });

      await expect(
        service.createWithdrawalRequest(testUserId, createWithdrawalDto),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.createWithdrawalRequest(testUserId, createWithdrawalDto),
      ).rejects.toThrow('Invalid or expired 2FA code');
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(mockFees);
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(false);

      const insufficientWallet = {
        ...mockWallet,
        availableBalance: '0.1',
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(insufficientWallet);

      await expect(
        service.createWithdrawalRequest(testUserId, createWithdrawalDto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createWithdrawalRequest(testUserId, createWithdrawalDto),
      ).rejects.toThrow('Insufficient balance');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should lock funds in wallet', async () => {
      const freshWallet = {
        userId: testUserId,
        currency: 'BTC',
        availableBalance: '1.00000000',
        lockedBalance: '0.00000000',
        totalBalance: '1.00000000',
      };

      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(mockFees);
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(false);
      mockQueryRunner.manager.findOne.mockResolvedValue(freshWallet);

      await service.createWithdrawalRequest(testUserId, createWithdrawalDto);

      // Check that wallet save was called with updated balances
      const savedWallet = mockQueryRunner.manager.save.mock.calls.find(
        (call) => call[0] && call[0].availableBalance !== undefined && call[0].lockedBalance !== undefined,
      );
      expect(savedWallet).toBeDefined();

      const wallet = savedWallet[0];
      expect(parseFloat(wallet.availableBalance)).toBeLessThan(1.0);
      expect(parseFloat(wallet.lockedBalance)).toBeGreaterThan(0);
    });

    it('should create ledger entry for withdrawal lock', async () => {
      const freshWallet = {
        userId: testUserId,
        currency: 'BTC',
        availableBalance: '1.00000000',
        lockedBalance: '0.00000000',
        totalBalance: '1.00000000',
      };

      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(mockFees);
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(false);
      mockQueryRunner.manager.findOne.mockResolvedValue(freshWallet);

      await service.createWithdrawalRequest(testUserId, createWithdrawalDto);

      const ledgerCall = mockQueryRunner.manager.create.mock.calls.find(
        (call) => call[0] === LedgerEntry,
      );
      expect(ledgerCall).toBeDefined();

      const ledgerData = ledgerCall[1];
      expect(ledgerData.type).toBe('WITHDRAWAL_LOCK');
      expect(ledgerData.userId).toBe(testUserId);
      expect(ledgerData.currency).toBe('BTC');
    });

    it('should set requiresAdminApproval flag correctly', async () => {
      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(mockFees);
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(true); // Large amount
      mockQueryRunner.manager.findOne.mockResolvedValue({
        ...mockWallet,
        availableBalance: '100.00000000',
      });

      const result = await service.createWithdrawalRequest(testUserId, {
        ...createWithdrawalDto,
        amount: '50', // Large amount requiring admin approval
      });

      expect(result.requiresAdminApproval).toBe(true);
    });

    it('should rollback transaction on error', async () => {
      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(mockFees);
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(false);
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createWithdrawalRequest(testUserId, createWithdrawalDto),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create wallet if not exists', async () => {
      const newWallet = {
        userId: testUserId,
        currency: 'BTC',
        availableBalance: '1.00000000',
        lockedBalance: '0.00000000',
        totalBalance: '1.00000000',
      };

      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(mockFees);
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(false);

      // First call returns null (no wallet)
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      // Mock the wallet creation and save
      mockQueryRunner.manager.create.mockImplementation((entity, data) => {
        if (entity === UserWallet) {
          return { ...newWallet, ...data };
        }
        return { id: 'generated-id', ...data };
      });
      mockQueryRunner.manager.save.mockImplementation((entity) => {
        if (entity.currency && entity.userId) {
          // It's a wallet, return it with proper balance for checking
          return Promise.resolve({ ...newWallet, ...entity });
        }
        return Promise.resolve(entity);
      });

      await service.createWithdrawalRequest(testUserId, createWithdrawalDto);

      const walletCreateCall = mockQueryRunner.manager.create.mock.calls.find(
        (call) => call[0] === UserWallet,
      );
      expect(walletCreateCall).toBeDefined();
    });

    it('should handle ETH withdrawal', async () => {
      const ethDto = {
        currency: 'ETH' as 'BTC' | 'ETH' | 'USDT',
        amount: '1.0',
        destinationAddress: testEthAddress,
        twoFaCode: '123456',
        network: undefined,
      };

      const ethWallet = {
        userId: testUserId,
        currency: 'ETH',
        availableBalance: '5.00000000',
        lockedBalance: '0.00000000',
        totalBalance: '5.00000000',
      };

      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testEthAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue({
        networkFee: '0.005',
        platformFee: '0.005',
        totalAmount: '1.01',
      });
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(false);
      mockQueryRunner.manager.findOne.mockResolvedValue(ethWallet);

      const result = await service.createWithdrawalRequest(testUserId, ethDto);

      expect(result.currency).toBe('ETH');
      expect(result.destinationAddress).toBe(testEthAddress);
    });

    it('should handle USDT withdrawal with network specified', async () => {
      const usdtDto = {
        currency: 'USDT' as 'BTC' | 'ETH' | 'USDT',
        amount: '1000',
        destinationAddress: testEthAddress,
        twoFaCode: '123456',
        network: 'ERC20',
      };

      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testEthAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue({
        networkFee: '1',
        platformFee: '1',
        totalAmount: '1002',
      });
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(false);
      mockQueryRunner.manager.findOne.mockResolvedValue({
        userId: testUserId,
        currency: 'USDT',
        availableBalance: '5000.000000',
        lockedBalance: '0.000000',
      });

      const result = await service.createWithdrawalRequest(testUserId, usdtDto);

      expect(result.currency).toBe('USDT');
      expect(addressValidationService.validateAddress).toHaveBeenCalledWith(
        'USDT',
        testEthAddress,
        'ERC20',
      );
    });
  });

  describe('cancelWithdrawal', () => {
    const mockWithdrawal = {
      id: 'withdrawal-123',
      userId: testUserId,
      currency: 'BTC',
      amount: '0.5',
      totalAmount: '0.5006',
      status: 'PENDING',
    };

    const mockWallet = {
      userId: testUserId,
      currency: 'BTC',
      availableBalance: '0.50000000',
      lockedBalance: '0.50060000',
    };

    it('should cancel pending withdrawal successfully', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);
      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);

      const result = await service.cancelWithdrawal(testUserId, 'withdrawal-123');

      expect(result.status).toBe('CANCELLED');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalled();
    });

    it('should unlock funds when cancelling', async () => {
      const freshMockWallet = {
        userId: testUserId,
        currency: 'BTC',
        availableBalance: '0.50000000',
        lockedBalance: '0.50060000',
      };

      mockWithdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);
      mockQueryRunner.manager.findOne.mockResolvedValue(freshMockWallet);

      await service.cancelWithdrawal(testUserId, 'withdrawal-123');

      const savedWallet = mockQueryRunner.manager.save.mock.calls.find(
        (call) => call[0] && call[0].availableBalance !== undefined && call[0].lockedBalance !== undefined,
      );
      expect(savedWallet).toBeDefined();

      const wallet = savedWallet[0];
      expect(parseFloat(wallet.availableBalance)).toBeGreaterThan(0.5);
      expect(parseFloat(wallet.lockedBalance)).toBeLessThan(0.5006);
    });

    it('should create ledger entry for unlock', async () => {
      const freshMockWallet = {
        userId: testUserId,
        currency: 'BTC',
        availableBalance: '0.50000000',
        lockedBalance: '0.50060000',
      };

      mockWithdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);
      mockQueryRunner.manager.findOne.mockResolvedValue(freshMockWallet);

      await service.cancelWithdrawal(testUserId, 'withdrawal-123');

      const ledgerCall = mockQueryRunner.manager.create.mock.calls.find(
        (call) => call[0] === LedgerEntry,
      );
      expect(ledgerCall).toBeDefined();

      const ledgerData = ledgerCall[1];
      expect(ledgerData.type).toBe('WITHDRAWAL_UNLOCK');
      expect(ledgerData.description).toContain('cancelled');
    });

    it('should throw NotFoundException if withdrawal not found', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelWithdrawal(testUserId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.cancelWithdrawal(testUserId, 'nonexistent-id'),
      ).rejects.toThrow('Withdrawal request not found');
    });

    it('should throw BadRequestException if withdrawal is not PENDING', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue({
        ...mockWithdrawal,
        status: 'COMPLETED',
      });

      await expect(
        service.cancelWithdrawal(testUserId, 'withdrawal-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.cancelWithdrawal(testUserId, 'withdrawal-123'),
      ).rejects.toThrow('Only PENDING withdrawals can be cancelled');
    });

    it('should rollback transaction on error', async () => {
      const freshWithdrawal = {
        id: 'withdrawal-123',
        userId: testUserId,
        currency: 'BTC',
        amount: '0.5',
        totalAmount: '0.5006',
        status: 'PENDING',
      };

      mockWithdrawalRepository.findOne.mockResolvedValue(freshWithdrawal);
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        service.cancelWithdrawal(testUserId, 'withdrawal-123'),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getWithdrawal', () => {
    it('should return withdrawal by ID', async () => {
      const mockWithdrawal = {
        id: 'withdrawal-123',
        userId: testUserId,
        currency: 'BTC',
        amount: '0.5',
        status: 'PENDING',
      };

      mockWithdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);

      const result = await service.getWithdrawal(testUserId, 'withdrawal-123');

      expect(result).toEqual(mockWithdrawal);
      expect(mockWithdrawalRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'withdrawal-123', userId: testUserId },
      });
    });

    it('should throw NotFoundException if withdrawal not found', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getWithdrawal(testUserId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWithdrawalHistory', () => {
    it('should return paginated withdrawal history', async () => {
      const mockWithdrawals = [
        {
          id: 'withdrawal-1',
          userId: testUserId,
          currency: 'BTC',
          amount: '0.5',
          status: 'COMPLETED',
        },
        {
          id: 'withdrawal-2',
          userId: testUserId,
          currency: 'ETH',
          amount: '1.0',
          status: 'PENDING',
        },
      ];

      mockWithdrawalRepository.findAndCount.mockResolvedValue([
        mockWithdrawals,
        2,
      ]);

      const result = await service.getWithdrawalHistory(testUserId, 1, 10);

      expect(result.withdrawals).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockWithdrawalRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: testUserId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should support pagination', async () => {
      mockWithdrawalRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getWithdrawalHistory(testUserId, 3, 5);

      expect(mockWithdrawalRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: testUserId },
        order: { createdAt: 'DESC' },
        skip: 10, // (page 3 - 1) * limit 5
        take: 5,
      });
    });

    it('should handle empty history', async () => {
      mockWithdrawalRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getWithdrawalHistory(testUserId);

      expect(result.withdrawals).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use default pagination values', async () => {
      mockWithdrawalRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getWithdrawalHistory(testUserId);

      expect(mockWithdrawalRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: testUserId },
        order: { createdAt: 'DESC' },
        skip: 0, // Default page 1
        take: 10, // Default limit 10
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large withdrawal amounts', async () => {
      const largeWithdrawalDto = {
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        amount: '100',
        destinationAddress: testBtcAddress,
        twoFaCode: '123456',
        network: undefined,
      };

      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue({
        networkFee: '0.001',
        platformFee: '0.05',
        totalAmount: '100.051',
      });
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(true);
      mockQueryRunner.manager.findOne.mockResolvedValue({
        userId: testUserId,
        currency: 'BTC',
        availableBalance: '200.00000000',
        lockedBalance: '0.00000000',
      });

      const result = await service.createWithdrawalRequest(
        testUserId,
        largeWithdrawalDto,
      );

      expect(result.requiresAdminApproval).toBe(true);
    });

    it('should handle very small withdrawal amounts', async () => {
      const smallWithdrawalDto = {
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        amount: '0.0001',
        destinationAddress: testBtcAddress,
        twoFaCode: '123456',
        network: undefined,
      };

      mockAddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: testBtcAddress,
      });
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue({
        networkFee: '0.0001',
        platformFee: '0.0005',
        totalAmount: '0.0006',
      });
      mockFeeCalculationService.requiresAdminApproval.mockReturnValue(false);
      mockQueryRunner.manager.findOne.mockResolvedValue({
        userId: testUserId,
        currency: 'BTC',
        availableBalance: '1.00000000',
        lockedBalance: '0.00000000',
      });

      const result = await service.createWithdrawalRequest(
        testUserId,
        smallWithdrawalDto,
      );

      expect(result.amount).toBe('0.0001');
    });
  });
});
