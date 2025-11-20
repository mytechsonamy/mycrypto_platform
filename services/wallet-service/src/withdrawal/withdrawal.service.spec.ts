import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { UserWallet } from '../wallet/entities/user-wallet.entity';
import { FiatAccount } from '../wallet/entities/fiat-account.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WithdrawalService', () => {
  let service: WithdrawalService;
  let withdrawalRepository: Repository<WithdrawalRequest>;
  let walletRepository: Repository<UserWallet>;
  let fiatAccountRepository: Repository<FiatAccount>;
  let ledgerRepository: Repository<LedgerEntry>;
  let dataSource: DataSource;
  let configService: ConfigService;
  let queryRunner: QueryRunner;

  const mockUserId = 'user-123';
  const mockFiatAccountId = 'fiat-456';
  const mockWithdrawalId = 'withdrawal-789';

  beforeEach(async () => {
    // Mock QueryRunner
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
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        {
          provide: getRepositoryToken(WithdrawalRequest),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UserWallet),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(FiatAccount),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(LedgerEntry),
          useClass: Repository,
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                TRY_WITHDRAWAL_FEE: 5,
                TRY_MIN_WITHDRAWAL: 100,
                TRY_MAX_WITHDRAWAL: 50000,
                WITHDRAWAL_DAILY_LIMIT: 5,
                AUTH_SERVICE_URL: 'http://auth-service:3000',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WithdrawalService>(WithdrawalService);
    withdrawalRepository = module.get<Repository<WithdrawalRequest>>(
      getRepositoryToken(WithdrawalRequest),
    );
    walletRepository = module.get<Repository<UserWallet>>(
      getRepositoryToken(UserWallet),
    );
    fiatAccountRepository = module.get<Repository<FiatAccount>>(
      getRepositoryToken(FiatAccount),
    );
    ledgerRepository = module.get<Repository<LedgerEntry>>(
      getRepositoryToken(LedgerEntry),
    );
    dataSource = module.get<DataSource>(DataSource);
    configService = module.get<ConfigService>(ConfigService);
    queryRunner = mockQueryRunner as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWithdrawalRequest', () => {
    const createDto = {
      amount: 1000,
      fiatAccountId: mockFiatAccountId,
      twoFaCode: '123456',
    };

    const mockFiatAccount = {
      id: mockFiatAccountId,
      userId: mockUserId,
      bankName: 'Ziraat Bank',
      iban: 'TR330006100519786457841326',
      accountHolderName: 'John Doe',
      isVerified: true,
    };

    const mockWallet = {
      id: 'wallet-123',
      userId: mockUserId,
      currency: 'TRY',
      availableBalance: '5000.00',
      lockedBalance: '0.00',
      totalBalance: '5000.00',
    };

    it('should create a withdrawal request successfully', async () => {
      // Mock 2FA verification
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, data: { valid: true } },
      });

      // Mock fiat account verification
      jest.spyOn(fiatAccountRepository, 'findOne').mockResolvedValueOnce(mockFiatAccount as any);

      // Mock daily limit check
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      jest.spyOn(withdrawalRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      // Mock wallet and withdrawal creation
      queryRunner.manager.findOne = jest.fn().mockResolvedValueOnce(mockWallet);

      const savedWithdrawal = {
        id: mockWithdrawalId,
        userId: mockUserId,
        currency: 'TRY',
        amount: '1000.00',
        fee: '5.00',
        status: 'PENDING',
        fiatAccountId: mockFiatAccountId,
        twoFaVerified: true,
        createdAt: new Date(),
        get netAmount() {
          const amountNum = parseFloat(this.amount) || 0;
          const feeNum = parseFloat(this.fee) || 0;
          return (amountNum - feeNum).toFixed(2);
        },
      };

      queryRunner.manager.save = jest.fn()
        .mockResolvedValueOnce(mockWallet) // Save wallet
        .mockResolvedValueOnce(savedWithdrawal) // Save withdrawal
        .mockResolvedValueOnce({}); // Save ledger entry

      queryRunner.manager.create = jest.fn()
        .mockReturnValueOnce({
          id: mockWithdrawalId,
          userId: mockUserId,
          currency: 'TRY',
          amount: '1000.00',
          fee: '5.00',
          status: 'PENDING',
          fiatAccountId: mockFiatAccountId,
          twoFaVerified: true,
          get netAmount() {
            return '995.00';
          },
        })
        .mockReturnValueOnce({});

      const result = await service.createWithdrawalRequest(mockUserId, createDto);

      expect(result).toMatchObject({
        withdrawalId: mockWithdrawalId,
        amount: '1000.00',
        fee: '5.00',
        netAmount: '995.00',
        status: 'PENDING',
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for amount below minimum', async () => {
      const invalidDto = { ...createDto, amount: 50 };

      await expect(service.createWithdrawalRequest(mockUserId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createWithdrawalRequest(mockUserId, invalidDto)).rejects.toThrow(
        'Minimum withdrawal amount is 100 TRY',
      );
    });

    it('should throw BadRequestException for amount above maximum', async () => {
      const invalidDto = { ...createDto, amount: 60000 };

      await expect(service.createWithdrawalRequest(mockUserId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createWithdrawalRequest(mockUserId, invalidDto)).rejects.toThrow(
        'Maximum withdrawal amount is 50000 TRY',
      );
    });

    it('should throw BadRequestException when daily limit is reached', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5), // Daily limit reached
      };
      jest.spyOn(withdrawalRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await expect(service.createWithdrawalRequest(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createWithdrawalRequest(mockUserId, createDto)).rejects.toThrow(
        'Daily withdrawal limit reached',
      );
    });

    it('should throw UnauthorizedException for invalid 2FA code', async () => {
      // Mock daily limit check
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      jest.spyOn(withdrawalRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      // Mock invalid 2FA
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: false, data: { valid: false } },
      });

      await expect(service.createWithdrawalRequest(mockUserId, createDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw NotFoundException for non-existent fiat account', async () => {
      // Mock daily limit check
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      jest.spyOn(withdrawalRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      // Mock 2FA verification
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, data: { valid: true } },
      });

      // Mock fiat account not found
      jest.spyOn(fiatAccountRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.createWithdrawalRequest(mockUserId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      // Clear all mocks first
      jest.clearAllMocks();
      mockedAxios.post.mockClear();

      // Mock daily limit check
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      jest.spyOn(withdrawalRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      // Mock 2FA verification - successful
      mockedAxios.post.mockResolvedValue({
        data: { success: true, data: { valid: true } },
      });

      // Mock fiat account verification
      jest.spyOn(fiatAccountRepository, 'findOne').mockResolvedValue(mockFiatAccount as any);

      // Mock wallet with insufficient balance
      const insufficientWallet = { ...mockWallet, availableBalance: '500.00' };
      queryRunner.manager.findOne = jest.fn().mockResolvedValue(insufficientWallet);

      await expect(service.createWithdrawalRequest(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createWithdrawalRequest(mockUserId, createDto)).rejects.toThrow(
        'Insufficient balance',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getWithdrawalRequest', () => {
    it('should return withdrawal request', async () => {
      const mockWithdrawal = {
        id: mockWithdrawalId,
        userId: mockUserId,
        amount: '1000.00',
        fee: '5.00',
        netAmount: '995.00',
        status: 'PENDING',
        fiatAccountId: mockFiatAccountId,
        createdAt: new Date(),
      };

      jest.spyOn(withdrawalRepository, 'findOne').mockResolvedValueOnce(mockWithdrawal as any);

      const result = await service.getWithdrawalRequest(mockUserId, mockWithdrawalId);

      expect(result).toMatchObject({
        withdrawalId: mockWithdrawalId,
        amount: '1000.00',
        fee: '5.00',
        netAmount: '995.00',
        status: 'PENDING',
      });
    });

    it('should throw NotFoundException for non-existent withdrawal', async () => {
      jest.spyOn(withdrawalRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.getWithdrawalRequest(mockUserId, mockWithdrawalId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelWithdrawalRequest', () => {
    const mockWithdrawal = {
      id: mockWithdrawalId,
      userId: mockUserId,
      amount: '1000.00',
      fee: '5.00',
      status: 'PENDING',
      fiatAccountId: mockFiatAccountId,
    };

    const mockWallet = {
      id: 'wallet-123',
      userId: mockUserId,
      currency: 'TRY',
      availableBalance: '4000.00',
      lockedBalance: '1005.00',
      totalBalance: '5005.00',
    };

    it('should cancel withdrawal and unlock balance', async () => {
      queryRunner.manager.findOne = jest.fn()
        .mockResolvedValueOnce(mockWithdrawal)
        .mockResolvedValueOnce(mockWallet);

      queryRunner.manager.save = jest.fn()
        .mockResolvedValueOnce(mockWallet) // Save wallet
        .mockResolvedValueOnce({ ...mockWithdrawal, status: 'CANCELLED' }) // Save withdrawal
        .mockResolvedValueOnce({}); // Save ledger entry

      queryRunner.manager.create = jest.fn().mockReturnValue({});

      const result = await service.cancelWithdrawalRequest(mockUserId, mockWithdrawalId);

      expect(result.status).toBe('CANCELLED');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent withdrawal', async () => {
      queryRunner.manager.findOne = jest.fn().mockResolvedValueOnce(null);

      await expect(service.cancelWithdrawalRequest(mockUserId, mockWithdrawalId)).rejects.toThrow(
        NotFoundException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException for non-pending withdrawal', async () => {
      const completedWithdrawal = { ...mockWithdrawal, status: 'COMPLETED' };
      queryRunner.manager.findOne = jest.fn().mockResolvedValueOnce(completedWithdrawal);

      await expect(service.cancelWithdrawalRequest(mockUserId, mockWithdrawalId)).rejects.toThrow(
        ConflictException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('approveWithdrawal', () => {
    it('should approve pending withdrawal', async () => {
      const mockWithdrawal = {
        id: mockWithdrawalId,
        userId: mockUserId,
        status: 'PENDING',
      };

      jest.spyOn(withdrawalRepository, 'findOne').mockResolvedValueOnce(mockWithdrawal as any);
      jest.spyOn(withdrawalRepository, 'save').mockResolvedValueOnce({
        ...mockWithdrawal,
        status: 'APPROVED',
      } as any);

      await service.approveWithdrawal(mockWithdrawalId, 'admin-123');

      expect(withdrawalRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'APPROVED' }),
      );
    });

    it('should throw NotFoundException for non-existent withdrawal', async () => {
      jest.spyOn(withdrawalRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.approveWithdrawal(mockWithdrawalId, 'admin-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for non-pending withdrawal', async () => {
      const completedWithdrawal = {
        id: mockWithdrawalId,
        status: 'COMPLETED',
      };

      jest.spyOn(withdrawalRepository, 'findOne').mockResolvedValueOnce(completedWithdrawal as any);

      await expect(service.approveWithdrawal(mockWithdrawalId, 'admin-123')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
