import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WithdrawalProcessingService } from './withdrawal-processing.service';
import { CryptoWithdrawalRequest } from '../entities/crypto-withdrawal-request.entity';
import { UserWallet } from '../../wallet/entities/user-wallet.entity';
import { LedgerEntry } from '../../ledger/entities/ledger-entry.entity';
import { TransactionSigningService } from './transaction-signing.service';
import { BlockchainBroadcastingService } from './blockchain-broadcasting.service';
import { RedisService } from '../../common/redis/redis.service';
import { DataSource } from 'typeorm';

describe('WithdrawalProcessingService', () => {
  let service: WithdrawalProcessingService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockSigningService = {
    signBitcoinTransaction: jest.fn(),
    signEthereumTransaction: jest.fn(),
    signUSDTTransaction: jest.fn(),
  };

  const mockBroadcastingService = {
    broadcastBitcoinTransaction: jest.fn(),
    broadcastEthereumTransaction: jest.fn(),
    broadcastUSDTTransaction: jest.fn(),
  };

  const mockRedisService = {
    del: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn((entity, data) => data),
      },
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalProcessingService,
        {
          provide: getRepositoryToken(CryptoWithdrawalRequest),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserWallet),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(LedgerEntry),
          useValue: mockRepository,
        },
        {
          provide: TransactionSigningService,
          useValue: mockSigningService,
        },
        {
          provide: BlockchainBroadcastingService,
          useValue: mockBroadcastingService,
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

    service = module.get<WithdrawalProcessingService>(WithdrawalProcessingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error if withdrawal not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(
      service.processWithdrawal('non-existent-id'),
    ).rejects.toThrow('Withdrawal request not found');
  });

  it('should throw error if withdrawal not in PENDING status', async () => {
    mockRepository.findOne.mockResolvedValue({
      id: 'test-id',
      status: 'COMPLETED',
    });

    await expect(
      service.processWithdrawal('test-id'),
    ).rejects.toThrow('Cannot process withdrawal with status COMPLETED');
  });

  it('should return withdrawal if it requires admin approval', async () => {
    const mockWithdrawal = {
      id: 'test-id',
      status: 'PENDING',
      requiresAdminApproval: true,
    };

    mockRepository.findOne.mockResolvedValue(mockWithdrawal);

    const result = await service.processWithdrawal('test-id');

    expect(result).toEqual(mockWithdrawal);
  });
});
