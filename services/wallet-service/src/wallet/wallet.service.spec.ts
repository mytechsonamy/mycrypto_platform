import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { UserWallet } from './entities/user-wallet.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { RedisService } from '../common/redis/redis.service';

describe('WalletService', () => {
  let service: WalletService;
  let userWalletRepository: Repository<UserWallet>;
  let redisService: RedisService;
  let dataSource: DataSource;

  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

  const mockUserWallets: UserWallet[] = [
    {
      id: '1',
      userId: mockUserId,
      currency: 'TRY',
      availableBalance: '1000.00',
      lockedBalance: '250.00',
      createdAt: new Date(),
      updatedAt: new Date(),
      get totalBalance() {
        return '1250.00';
      },
    } as UserWallet,
    {
      id: '2',
      userId: mockUserId,
      currency: 'BTC',
      availableBalance: '0.05000000',
      lockedBalance: '0.01000000',
      createdAt: new Date(),
      updatedAt: new Date(),
      get totalBalance() {
        return '0.06000000';
      },
    } as UserWallet,
  ];

  const mockUserWalletRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getBalance: jest.fn(),
    setBalance: jest.fn(),
    invalidateAllBalances: jest.fn(),
  };

  // Mock QueryRunner for transaction tests
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(UserWallet),
          useValue: mockUserWalletRepository,
        },
        {
          provide: getRepositoryToken(LedgerEntry),
          useValue: {},
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

    service = module.get<WalletService>(WalletService);
    userWalletRepository = module.get<Repository<UserWallet>>(
      getRepositoryToken(UserWallet),
    );
    redisService = module.get<RedisService>(RedisService);
    dataSource = module.get<DataSource>(DataSource);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserBalances', () => {
    it('should return cached balances if available', async () => {
      const cachedBalances = [
        {
          currency: 'TRY',
          availableBalance: '1000.00',
          lockedBalance: '250.00',
          totalBalance: '1250.00',
        },
      ];

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedBalances));

      const result = await service.getUserBalances(mockUserId);

      expect(result).toEqual(cachedBalances);
      expect(mockRedisService.get).toHaveBeenCalledWith(`user:balances:${mockUserId}`);
      expect(mockUserWalletRepository.find).not.toHaveBeenCalled();
    });

    it('should query database and cache result if cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockUserWalletRepository.find.mockResolvedValue(mockUserWallets);

      const result = await service.getUserBalances(mockUserId);

      expect(result).toHaveLength(4); // TRY, BTC, ETH, USDT
      expect(result[0].currency).toBe('TRY');
      expect(result[0].availableBalance).toBe('1000.00');
      expect(result[0].totalBalance).toBe('1250.00');

      expect(result[1].currency).toBe('BTC');
      expect(result[1].availableBalance).toBe('0.05000000');

      // ETH and USDT should have zero balances
      expect(result[2].currency).toBe('ETH');
      expect(result[2].availableBalance).toBe('0.00000000');
      expect(result[2].totalBalance).toBe('0.00000000');

      expect(result[3].currency).toBe('USDT');
      expect(result[3].availableBalance).toBe('0.00000000');

      expect(mockUserWalletRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `user:balances:${mockUserId}`,
        JSON.stringify(result),
        5,
      );
    });

    it('should return all currencies with zero balances if user has no wallets', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockUserWalletRepository.find.mockResolvedValue([]);

      const result = await service.getUserBalances(mockUserId);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        currency: 'TRY',
        availableBalance: '0.00000000',
        lockedBalance: '0.00000000',
        totalBalance: '0.00000000',
      });
      expect(result[1]).toEqual({
        currency: 'BTC',
        availableBalance: '0.00000000',
        lockedBalance: '0.00000000',
        totalBalance: '0.00000000',
      });
    });
  });

  describe('getUserBalance', () => {
    it('should return cached balance if available', async () => {
      const cachedBalance = {
        currency: 'BTC',
        availableBalance: '0.05000000',
        lockedBalance: '0.01000000',
        totalBalance: '0.06000000',
      };

      mockRedisService.getBalance.mockResolvedValue(JSON.stringify(cachedBalance));

      const result = await service.getUserBalance(mockUserId, 'BTC');

      expect(result).toEqual(cachedBalance);
      expect(mockRedisService.getBalance).toHaveBeenCalledWith(mockUserId, 'BTC');
      expect(mockUserWalletRepository.findOne).not.toHaveBeenCalled();
    });

    it('should query database and cache result if cache miss', async () => {
      mockRedisService.getBalance.mockResolvedValue(null);
      mockUserWalletRepository.findOne.mockResolvedValue(mockUserWallets[1]);

      const result = await service.getUserBalance(mockUserId, 'BTC');

      expect(result).toEqual({
        currency: 'BTC',
        availableBalance: '0.05000000',
        lockedBalance: '0.01000000',
        totalBalance: '0.06000000',
      });

      expect(mockUserWalletRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, currency: 'BTC' },
      });
      expect(mockRedisService.setBalance).toHaveBeenCalledWith(
        mockUserId,
        'BTC',
        JSON.stringify(result),
      );
    });

    it('should return zero balance if wallet does not exist', async () => {
      mockRedisService.getBalance.mockResolvedValue(null);
      mockUserWalletRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserBalance(mockUserId, 'ETH');

      expect(result).toEqual({
        currency: 'ETH',
        availableBalance: '0.00000000',
        lockedBalance: '0.00000000',
        totalBalance: '0.00000000',
      });
    });

    it('should throw NotFoundException for unsupported currency', async () => {
      await expect(service.getUserBalance(mockUserId, 'DOGE')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserBalance(mockUserId, 'DOGE')).rejects.toThrow(
        'Currency DOGE is not supported',
      );
    });

    it('should handle case-insensitive currency codes', async () => {
      mockRedisService.getBalance.mockResolvedValue(null);
      mockUserWalletRepository.findOne.mockResolvedValue(mockUserWallets[0]);

      const result = await service.getUserBalance(mockUserId, 'try');

      expect(mockUserWalletRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, currency: 'TRY' },
      });
      expect(result.currency).toBe('TRY');
    });
  });

  describe('invalidateUserBalanceCache', () => {
    it('should invalidate all cache keys for user', async () => {
      await service.invalidateUserBalanceCache(mockUserId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`user:balances:${mockUserId}`);
      expect(mockRedisService.invalidateAllBalances).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('creditUserWallet', () => {
    beforeEach(() => {
      // Reset QueryRunner mocks before each test
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);
      mockRedisService.invalidateAllBalances.mockResolvedValue(undefined);
    });

    it('should credit existing wallet and create ledger entry', async () => {
      const existingWallet = {
        id: 'wallet-123',
        userId: mockUserId,
        currency: 'BTC',
        availableBalance: '0.05000000',
        lockedBalance: '0.00000000',
        get totalBalance() {
          return '0.05000000';
        },
      } as UserWallet;

      const updatedWallet = {
        ...existingWallet,
        availableBalance: '0.05150000',
      };

      const ledgerEntry = {
        id: 'ledger-123',
        userId: mockUserId,
        currency: 'BTC',
        type: 'DEPOSIT',
        amount: '0.00150000',
        balanceBefore: '0.05000000',
        balanceAfter: '0.05150000',
        referenceId: 'tx-abc123',
        referenceType: 'CRYPTO_DEPOSIT',
        description: 'Crypto deposit: BTC from bc1q...',
        metadata: { txHash: 'abc123', confirmations: 3 },
        createdAt: new Date(),
      } as LedgerEntry;

      mockQueryRunner.manager.findOne.mockResolvedValue(existingWallet);
      mockQueryRunner.manager.create
        .mockReturnValueOnce(updatedWallet)
        .mockReturnValueOnce(ledgerEntry);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(updatedWallet)
        .mockResolvedValueOnce(ledgerEntry);

      const result = await service.creditUserWallet(
        mockUserId,
        'BTC',
        '0.00150000',
        'tx-abc123',
        'CRYPTO_DEPOSIT',
        'Crypto deposit: BTC from bc1q...',
        { txHash: 'abc123', confirmations: 3 },
      );

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(UserWallet, {
        where: { userId: mockUserId, currency: 'BTC' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalledWith(`user:balances:${mockUserId}`);
      expect(mockRedisService.invalidateAllBalances).toHaveBeenCalledWith(mockUserId);

      expect(result).toEqual({
        currency: 'BTC',
        availableBalance: '0.05150000',
        lockedBalance: '0.00000000',
        totalBalance: '0.05000000',
      });
    });

    it('should create new wallet if it does not exist', async () => {
      const newWallet = {
        id: 'wallet-456',
        userId: mockUserId,
        currency: 'ETH',
        availableBalance: '0.10000000',
        lockedBalance: '0.00000000',
        get totalBalance() {
          return '0.10000000';
        },
      } as UserWallet;

      const ledgerEntry = {
        id: 'ledger-456',
        userId: mockUserId,
        currency: 'ETH',
        type: 'DEPOSIT',
        amount: '0.10000000',
        balanceBefore: '0.00000000',
        balanceAfter: '0.10000000',
        referenceId: 'tx-def456',
        referenceType: 'CRYPTO_DEPOSIT',
        description: 'First ETH deposit',
        metadata: null,
        createdAt: new Date(),
      } as LedgerEntry;

      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => {
        if (entity === UserWallet) {
          return { ...data, ...newWallet };
        }
        return { ...data, ...ledgerEntry };
      });
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(newWallet)
        .mockResolvedValueOnce(ledgerEntry);

      const result = await service.creditUserWallet(
        mockUserId,
        'ETH',
        '0.10000000',
        'tx-def456',
        'CRYPTO_DEPOSIT',
        'First ETH deposit',
      );

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(UserWallet, {
        where: { userId: mockUserId, currency: 'ETH' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(UserWallet, {
        userId: mockUserId,
        currency: 'ETH',
        availableBalance: '0.10000000',
        lockedBalance: '0.00000000',
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.currency).toBe('ETH');
      // Verify the result has the expected structure
      expect(result).toHaveProperty('availableBalance');
      expect(result).toHaveProperty('lockedBalance');
      expect(result).toHaveProperty('totalBalance');
    });

    it('should handle case-insensitive currency codes', async () => {
      const wallet = {
        id: 'wallet-789',
        userId: mockUserId,
        currency: 'USDT',
        availableBalance: '100.00000000',
        lockedBalance: '0.00000000',
        get totalBalance() {
          return '100.00000000';
        },
      } as UserWallet;

      mockQueryRunner.manager.findOne.mockResolvedValue(wallet);
      mockQueryRunner.manager.create.mockReturnValue(wallet);
      mockQueryRunner.manager.save.mockResolvedValue(wallet);

      await service.creditUserWallet(
        mockUserId,
        'usdt',
        '50.00000000',
        'ref-123',
        'CRYPTO_DEPOSIT',
        'USDT deposit',
      );

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(UserWallet, {
        where: { userId: mockUserId, currency: 'USDT' },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('should create ledger entry with correct audit trail', async () => {
      const wallet = {
        id: 'wallet-123',
        userId: mockUserId,
        currency: 'BTC',
        availableBalance: '1.00000000',
        lockedBalance: '0.00000000',
        get totalBalance() {
          return '1.00000000';
        },
      } as UserWallet;

      mockQueryRunner.manager.findOne.mockResolvedValue(wallet);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockResolvedValue(wallet);

      await service.creditUserWallet(
        mockUserId,
        'BTC',
        '0.50000000',
        'tx-xyz',
        'CRYPTO_DEPOSIT',
        'Test deposit',
        { txHash: 'xyz789', blockHeight: 800000 },
      );

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(LedgerEntry, {
        userId: mockUserId,
        currency: 'BTC',
        type: 'DEPOSIT',
        amount: '0.50000000',
        balanceBefore: '1.00000000',
        balanceAfter: '1.50000000',
        referenceId: 'tx-xyz',
        referenceType: 'CRYPTO_DEPOSIT',
        description: 'Test deposit',
        metadata: { txHash: 'xyz789', blockHeight: 800000 },
      });
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Database error');
      mockQueryRunner.manager.findOne.mockRejectedValue(error);

      await expect(
        service.creditUserWallet(
          mockUserId,
          'BTC',
          '0.001',
          'ref-123',
          'CRYPTO_DEPOSIT',
          'Test',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException for unsupported currency', async () => {
      await expect(
        service.creditUserWallet(
          mockUserId,
          'DOGE',
          '100',
          'ref-123',
          'DEPOSIT',
          'Test',
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.creditUserWallet(
          mockUserId,
          'DOGE',
          '100',
          'ref-123',
          'DEPOSIT',
          'Test',
        ),
      ).rejects.toThrow('Currency DOGE is not supported');

      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid amount', async () => {
      await expect(
        service.creditUserWallet(
          mockUserId,
          'BTC',
          '-0.001',
          'ref-123',
          'DEPOSIT',
          'Test',
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.creditUserWallet(
          mockUserId,
          'BTC',
          '-0.001',
          'ref-123',
          'DEPOSIT',
          'Test',
        ),
      ).rejects.toThrow('Amount must be a positive number');
    });

    it('should throw BadRequestException for zero amount', async () => {
      await expect(
        service.creditUserWallet(
          mockUserId,
          'BTC',
          '0',
          'ref-123',
          'DEPOSIT',
          'Test',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-numeric amount', async () => {
      await expect(
        service.creditUserWallet(
          mockUserId,
          'BTC',
          'invalid',
          'ref-123',
          'DEPOSIT',
          'Test',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should invalidate cache after successful credit', async () => {
      const wallet = {
        id: 'wallet-123',
        userId: mockUserId,
        currency: 'BTC',
        availableBalance: '1.00000000',
        lockedBalance: '0.00000000',
        get totalBalance() {
          return '1.00000000';
        },
      } as UserWallet;

      mockQueryRunner.manager.findOne.mockResolvedValue(wallet);
      mockQueryRunner.manager.create.mockReturnValue(wallet);
      mockQueryRunner.manager.save.mockResolvedValue(wallet);

      await service.creditUserWallet(
        mockUserId,
        'BTC',
        '0.001',
        'ref-123',
        'CRYPTO_DEPOSIT',
        'Test',
      );

      expect(mockRedisService.del).toHaveBeenCalledWith(`user:balances:${mockUserId}`);
      expect(mockRedisService.invalidateAllBalances).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle large decimal amounts correctly', async () => {
      const wallet = {
        id: 'wallet-123',
        userId: mockUserId,
        currency: 'BTC',
        availableBalance: '123.45678900',
        lockedBalance: '0.00000000',
        get totalBalance() {
          return '123.45678900';
        },
      } as UserWallet;

      mockQueryRunner.manager.findOne.mockResolvedValue(wallet);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockResolvedValue(wallet);

      await service.creditUserWallet(
        mockUserId,
        'BTC',
        '0.00000001',
        'ref-123',
        'CRYPTO_DEPOSIT',
        'Test',
      );

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        LedgerEntry,
        expect.objectContaining({
          amount: '0.00000001',
          balanceBefore: '123.45678900',
          balanceAfter: '123.45678901',
        }),
      );
    });

    it('should use pessimistic write lock to prevent race conditions', async () => {
      const wallet = {
        id: 'wallet-123',
        userId: mockUserId,
        currency: 'BTC',
        availableBalance: '1.00000000',
        lockedBalance: '0.00000000',
        get totalBalance() {
          return '1.00000000';
        },
      } as UserWallet;

      mockQueryRunner.manager.findOne.mockResolvedValue(wallet);
      mockQueryRunner.manager.create.mockReturnValue(wallet);
      mockQueryRunner.manager.save.mockResolvedValue(wallet);

      await service.creditUserWallet(
        mockUserId,
        'BTC',
        '0.001',
        'ref-123',
        'CRYPTO_DEPOSIT',
        'Test',
      );

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        UserWallet,
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });
  });
});
