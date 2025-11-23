import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FiatWithdrawalService } from './fiat-withdrawal.service';
import {
  FiatWithdrawalRequest,
  FiatWithdrawalStatus,
} from '../entities/fiat-withdrawal-request.entity';
import { BankAccountService } from './bank-account.service';
import { TwoFactorVerificationService } from '../../services/two-factor-verification.service';
import { UserWallet } from '../../../wallet/entities/user-wallet.entity';
import { LedgerEntry } from '../../../ledger/entities/ledger-entry.entity';
import {
  CreateFiatWithdrawalDto,
  FiatWithdrawalCurrency,
} from '../dto/create-fiat-withdrawal.dto';
import { BankAccount } from '../entities/bank-account.entity';

describe('FiatWithdrawalService', () => {
  let service: FiatWithdrawalService;
  let withdrawalRepository: Repository<FiatWithdrawalRequest>;
  let walletRepository: Repository<UserWallet>;
  let ledgerRepository: Repository<LedgerEntry>;
  let bankAccountService: BankAccountService;
  let twoFactorService: TwoFactorVerificationService;
  let dataSource: DataSource;

  const testUserId = 'user-123';
  const testBankAccountId = 'bank-456';
  const testWithdrawalId = 'withdrawal-789';

  const mockBankAccount: Partial<BankAccount> = {
    id: testBankAccountId,
    userId: testUserId,
    currency: 'USD' as any,
    bankName: 'Chase Bank',
    accountNumber: '1234567890',
    routingNumber: '021000021',
    accountHolderName: 'John Doe',
    isVerified: true,
  };

  const mockWallet: Partial<UserWallet> = {
    userId: testUserId,
    currency: 'USD',
    availableBalance: '10000.00',
    lockedBalance: '0.00',
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockWithdrawalRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
  };

  const mockWalletRepository = {
    findOne: jest.fn(),
  };

  const mockLedgerRepository = {
    save: jest.fn(),
  };

  const mockBankAccountService = {
    getBankAccountEntity: jest.fn(),
  };

  const mockTwoFactorService = {
    verify2FACode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiatWithdrawalService,
        {
          provide: getRepositoryToken(FiatWithdrawalRequest),
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
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: BankAccountService,
          useValue: mockBankAccountService,
        },
        {
          provide: TwoFactorVerificationService,
          useValue: mockTwoFactorService,
        },
      ],
    }).compile();

    service = module.get<FiatWithdrawalService>(FiatWithdrawalService);
    withdrawalRepository = module.get<Repository<FiatWithdrawalRequest>>(
      getRepositoryToken(FiatWithdrawalRequest),
    );
    walletRepository = module.get<Repository<UserWallet>>(
      getRepositoryToken(UserWallet),
    );
    ledgerRepository = module.get<Repository<LedgerEntry>>(
      getRepositoryToken(LedgerEntry),
    );
    bankAccountService = module.get<BankAccountService>(BankAccountService);
    twoFactorService = module.get<TwoFactorVerificationService>(
      TwoFactorVerificationService,
    );
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createWithdrawalRequest', () => {
    const createDto: CreateFiatWithdrawalDto = {
      currency: FiatWithdrawalCurrency.USD,
      amount: 1000,
      bankAccountId: testBankAccountId,
      twoFaCode: '123456',
    };

    beforeEach(() => {
      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockBankAccountService.getBankAccountEntity.mockResolvedValue(
        mockBankAccount,
      );
    });

    it('should create withdrawal request successfully (auto-approved)', async () => {
      const freshWallet = { ...mockWallet };
      mockQueryRunner.manager.findOne.mockResolvedValue(freshWallet);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: testWithdrawalId }),
      );
      mockWithdrawalRepository.findOne.mockResolvedValue({
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'USD',
        amount: '1000.00',
        fee: '5.00',
        totalAmount: '1005.00',
        status: FiatWithdrawalStatus.APPROVED,
        requiresAdminApproval: false,
        bankAccount: mockBankAccount,
      });

      const result = await service.createWithdrawalRequest(testUserId, createDto);

      expect(result).toBeDefined();
      expect(result.amount).toBe('1000.00');
      expect(result.fee).toBe('5.00');
      expect(result.totalAmount).toBe('1005.00');
      expect(result.status).toBe(FiatWithdrawalStatus.APPROVED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should create withdrawal with admin approval required (>$10,000)', async () => {
      const largeDt = { ...createDto, amount: 15000 };
      const freshWallet = { ...mockWallet, availableBalance: '20000.00' };

      mockQueryRunner.manager.findOne.mockResolvedValue(freshWallet);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: testWithdrawalId }),
      );
      mockWithdrawalRepository.findOne.mockResolvedValue({
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'USD',
        amount: '15000.00',
        fee: '5.00',
        totalAmount: '15005.00',
        status: FiatWithdrawalStatus.PENDING,
        requiresAdminApproval: true,
        bankAccount: mockBankAccount,
      });

      const result = await service.createWithdrawalRequest(testUserId, largeDt);

      expect(result.requiresAdminApproval).toBe(true);
      expect(result.status).toBe(FiatWithdrawalStatus.PENDING);
    });

    it('should reject invalid 2FA code', async () => {
      mockTwoFactorService.verify2FACode.mockResolvedValue({
        isValid: false,
        error: 'Invalid 2FA code',
      });

      await expect(
        service.createWithdrawalRequest(testUserId, createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createWithdrawalRequest(testUserId, createDto),
      ).rejects.toThrow('Invalid 2FA code');
    });

    it('should reject currency mismatch with bank account', async () => {
      const eurBankAccount = { ...mockBankAccount, currency: 'EUR' };
      mockBankAccountService.getBankAccountEntity.mockResolvedValue(
        eurBankAccount,
      );

      await expect(
        service.createWithdrawalRequest(testUserId, createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createWithdrawalRequest(testUserId, createDto),
      ).rejects.toThrow('does not match withdrawal currency');
    });

    it('should reject amount below minimum', async () => {
      const smallDto = { ...createDto, amount: 5 };

      await expect(
        service.createWithdrawalRequest(testUserId, smallDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createWithdrawalRequest(testUserId, smallDto),
      ).rejects.toThrow('Minimum withdrawal amount');
    });

    it('should reject insufficient balance', async () => {
      const poorWallet = { ...mockWallet, availableBalance: '500.00' };
      mockQueryRunner.manager.findOne.mockResolvedValue(poorWallet);

      await expect(
        service.createWithdrawalRequest(testUserId, createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createWithdrawalRequest(testUserId, createDto),
      ).rejects.toThrow('Insufficient balance');
    });

    it('should reject if no wallet found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.createWithdrawalRequest(testUserId, createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createWithdrawalRequest(testUserId, createDto),
      ).rejects.toThrow('No wallet found');
    });

    it('should lock funds in wallet', async () => {
      const freshWallet = { ...mockWallet };
      mockQueryRunner.manager.findOne.mockResolvedValue(freshWallet);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: testWithdrawalId }),
      );
      mockWithdrawalRepository.findOne.mockResolvedValue({
        id: testWithdrawalId,
        bankAccount: mockBankAccount,
      });

      await service.createWithdrawalRequest(testUserId, createDto);

      const saveCalls = mockQueryRunner.manager.save.mock.calls;
      const walletSave = saveCalls.find(
        (call) => call[0].availableBalance !== undefined,
      );

      expect(walletSave).toBeDefined();
      expect(parseFloat(walletSave[0].availableBalance)).toBeLessThan(
        parseFloat(mockWallet.availableBalance),
      );
      expect(parseFloat(walletSave[0].lockedBalance)).toBeGreaterThan(0);
    });

    it('should create ledger entry', async () => {
      const freshWallet = { ...mockWallet };
      mockQueryRunner.manager.findOne.mockResolvedValue(freshWallet);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: testWithdrawalId }),
      );
      mockWithdrawalRepository.findOne.mockResolvedValue({
        id: testWithdrawalId,
        bankAccount: mockBankAccount,
      });

      await service.createWithdrawalRequest(testUserId, createDto);

      const createCalls = mockQueryRunner.manager.create.mock.calls;
      const ledgerCreate = createCalls.find(
        (call) => call[1] && call[1].type === 'WITHDRAWAL',
      );

      expect(ledgerCreate).toBeDefined();
      expect(ledgerCreate[1].userId).toBe(testUserId);
      expect(ledgerCreate[1].referenceType).toBe('FIAT_WITHDRAWAL');
    });

    it('should rollback on error', async () => {
      mockQueryRunner.manager.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createWithdrawalRequest(testUserId, createDto),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getWithdrawalHistory', () => {
    it('should return paginated withdrawal history', async () => {
      const mockWithdrawals = [
        {
          id: 'w1',
          userId: testUserId,
          currency: 'USD',
          amount: '1000.00',
          status: FiatWithdrawalStatus.COMPLETED,
          bankAccount: mockBankAccount,
        },
        {
          id: 'w2',
          userId: testUserId,
          currency: 'USD',
          amount: '500.00',
          status: FiatWithdrawalStatus.PENDING,
          bankAccount: mockBankAccount,
        },
      ];

      mockWithdrawalRepository.findAndCount.mockResolvedValue([
        mockWithdrawals,
        2,
      ]);

      const result = await service.getWithdrawalHistory(testUserId, 1, 20);

      expect(result.withdrawals).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      mockWithdrawalRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getWithdrawalHistory(
        testUserId,
        1,
        20,
        FiatWithdrawalStatus.PENDING,
      );

      expect(mockWithdrawalRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: testUserId, status: FiatWithdrawalStatus.PENDING },
        }),
      );
    });
  });

  describe('getWithdrawalById', () => {
    it('should return withdrawal by ID', async () => {
      const mockWithdrawal = {
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'USD',
        amount: '1000.00',
        bankAccount: mockBankAccount,
      };

      mockWithdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);

      const result = await service.getWithdrawalById(
        testUserId,
        testWithdrawalId,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(testWithdrawalId);
    });

    it('should throw NotFoundException if not found', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getWithdrawalById(testUserId, testWithdrawalId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelWithdrawal', () => {
    const mockWithdrawal = {
      id: testWithdrawalId,
      userId: testUserId,
      currency: 'USD',
      amount: '1000.00',
      fee: '5.00',
      totalAmount: '1005.00',
      status: FiatWithdrawalStatus.PENDING,
    };

    it('should cancel pending withdrawal and unlock funds', async () => {
      const freshWallet = { ...mockWallet };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockWithdrawal)
        .mockResolvedValueOnce(freshWallet);
      mockQueryRunner.manager.save.mockResolvedValue(mockWithdrawal);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockWithdrawalRepository.findOne.mockResolvedValue({
        ...mockWithdrawal,
        status: FiatWithdrawalStatus.CANCELLED,
        bankAccount: mockBankAccount,
      });

      const result = await service.cancelWithdrawal(
        testUserId,
        testWithdrawalId,
      );

      expect(result.status).toBe(FiatWithdrawalStatus.CANCELLED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if withdrawal not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.cancelWithdrawal(testUserId, testWithdrawalId),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject cancellation of processing withdrawal', async () => {
      const processingWithdrawal = {
        ...mockWithdrawal,
        status: FiatWithdrawalStatus.PROCESSING,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(processingWithdrawal);

      await expect(
        service.cancelWithdrawal(testUserId, testWithdrawalId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancelWithdrawal(testUserId, testWithdrawalId),
      ).rejects.toThrow('Cannot cancel withdrawal with status PROCESSING');
    });

    it('should unlock funds in wallet', async () => {
      const freshWithdrawal = { ...mockWithdrawal, status: FiatWithdrawalStatus.PENDING };
      const freshWallet = { ...mockWallet, lockedBalance: '1005.00' };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(freshWithdrawal)
        .mockResolvedValueOnce(freshWallet);
      mockQueryRunner.manager.save.mockResolvedValue(freshWithdrawal);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockWithdrawalRepository.findOne.mockResolvedValue({
        ...mockWithdrawal,
        status: FiatWithdrawalStatus.CANCELLED,
        bankAccount: mockBankAccount,
      });

      await service.cancelWithdrawal(testUserId, testWithdrawalId);

      const saveCalls = mockQueryRunner.manager.save.mock.calls;
      const walletSave = saveCalls.find(
        (call) => call[0].availableBalance !== undefined,
      );

      expect(walletSave).toBeDefined();
      expect(parseFloat(walletSave[0].availableBalance)).toBeGreaterThan(
        parseFloat(mockWallet.availableBalance),
      );
    });
  });

  describe('getFees', () => {
    it('should return fees for USD', () => {
      const result = service.getFees('USD');

      expect(result.currency).toBe('USD');
      expect(result.fee).toBe(5.0);
      expect(result.minAmount).toBe(10.0);
    });

    it('should return fees for EUR', () => {
      const result = service.getFees('EUR');

      expect(result.currency).toBe('EUR');
      expect(result.fee).toBe(5.0);
      expect(result.minAmount).toBe(10.0);
    });

    it('should return fees for TRY', () => {
      const result = service.getFees('TRY');

      expect(result.currency).toBe('TRY');
      expect(result.fee).toBe(25.0);
      expect(result.minAmount).toBe(100.0);
    });

    it('should throw error for unsupported currency', () => {
      expect(() => service.getFees('JPY')).toThrow(BadRequestException);
      expect(() => service.getFees('JPY')).toThrow('Unsupported currency');
    });
  });

  describe('approveWithdrawal', () => {
    const mockWithdrawal = {
      id: testWithdrawalId,
      userId: testUserId,
      status: FiatWithdrawalStatus.PENDING,
      bankAccount: mockBankAccount,
    };

    it('should approve pending withdrawal', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);
      mockWithdrawalRepository.save.mockResolvedValue({
        ...mockWithdrawal,
        status: FiatWithdrawalStatus.APPROVED,
        adminApprovedBy: 'admin-123',
        adminApprovedAt: new Date(),
      });

      const result = await service.approveWithdrawal(
        'admin-123',
        testWithdrawalId,
        'Approved',
      );

      expect(result.status).toBe(FiatWithdrawalStatus.APPROVED);
      expect(result.adminApprovedBy).toBe('admin-123');
    });

    it('should throw NotFoundException if withdrawal not found', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(null);

      await expect(
        service.approveWithdrawal('admin-123', testWithdrawalId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject approval of non-pending withdrawal', async () => {
      const approvedWithdrawal = {
        ...mockWithdrawal,
        status: FiatWithdrawalStatus.APPROVED,
      };
      mockWithdrawalRepository.findOne.mockResolvedValue(approvedWithdrawal);

      await expect(
        service.approveWithdrawal('admin-123', testWithdrawalId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectWithdrawal', () => {
    const mockWithdrawal = {
      id: testWithdrawalId,
      userId: testUserId,
      currency: 'USD',
      amount: '1000.00',
      totalAmount: '1005.00',
      status: FiatWithdrawalStatus.PENDING,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should reject pending withdrawal and unlock funds', async () => {
      const freshWallet = { ...mockWallet };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockWithdrawal)
        .mockResolvedValueOnce(freshWallet);
      mockQueryRunner.manager.save.mockResolvedValue(mockWithdrawal);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockWithdrawalRepository.findOne.mockResolvedValue({
        ...mockWithdrawal,
        status: FiatWithdrawalStatus.REJECTED,
        bankAccount: mockBankAccount,
      });

      const result = await service.rejectWithdrawal(
        'admin-123',
        testWithdrawalId,
        'Suspicious activity',
      );

      expect(result.status).toBe(FiatWithdrawalStatus.REJECTED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if withdrawal not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.rejectWithdrawal('admin-123', testWithdrawalId, 'Reason'),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject rejection of non-pending withdrawal', async () => {
      const completedWithdrawal = {
        ...mockWithdrawal,
        status: FiatWithdrawalStatus.COMPLETED,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(completedWithdrawal);

      await expect(
        service.rejectWithdrawal('admin-123', testWithdrawalId, 'Reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple withdrawals for pagination', async () => {
      const manyWithdrawals = Array.from({ length: 50 }, (_, i) => ({
        id: `w${i}`,
        userId: testUserId,
        bankAccount: mockBankAccount,
      }));

      mockWithdrawalRepository.findAndCount.mockResolvedValue([
        manyWithdrawals.slice(0, 20),
        50,
      ]);

      const result = await service.getWithdrawalHistory(testUserId, 1, 20);

      expect(result.withdrawals).toHaveLength(20);
      expect(result.totalPages).toBe(3);
    });

    it('should handle EUR currency correctly', async () => {
      const eurDto: CreateFiatWithdrawalDto = {
        currency: FiatWithdrawalCurrency.EUR,
        amount: 100,
        bankAccountId: testBankAccountId,
        twoFaCode: '123456',
      };

      const eurBankAccount = { ...mockBankAccount, currency: 'EUR' };
      const eurWallet = { ...mockWallet, currency: 'EUR' };

      mockTwoFactorService.verify2FACode.mockResolvedValue({ isValid: true });
      mockBankAccountService.getBankAccountEntity.mockResolvedValue(
        eurBankAccount,
      );
      mockQueryRunner.manager.findOne.mockResolvedValue(eurWallet);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: testWithdrawalId }),
      );
      mockWithdrawalRepository.findOne.mockResolvedValue({
        id: testWithdrawalId,
        currency: 'EUR',
        fee: '5.00',
        bankAccount: eurBankAccount,
      });

      const result = await service.createWithdrawalRequest(testUserId, eurDto);

      expect(result.currency).toBe('EUR');
      expect(result.fee).toBe('5.00');
    });
  });
});
