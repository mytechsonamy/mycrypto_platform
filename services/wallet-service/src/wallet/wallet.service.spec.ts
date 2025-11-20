import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { UserWallet } from './entities/user-wallet.entity';
import { RedisService } from '../common/redis/redis.service';

describe('WalletService', () => {
  let service: WalletService;
  let userWalletRepository: Repository<UserWallet>;
  let redisService: RedisService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(UserWallet),
          useValue: mockUserWalletRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    userWalletRepository = module.get<Repository<UserWallet>>(
      getRepositoryToken(UserWallet),
    );
    redisService = module.get<RedisService>(RedisService);

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
});
