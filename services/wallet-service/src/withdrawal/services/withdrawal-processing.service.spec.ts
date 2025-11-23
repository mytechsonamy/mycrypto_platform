import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WithdrawalProcessingService } from './withdrawal-processing.service';
import { CryptoWithdrawalRequest } from '../entities/crypto-withdrawal-request.entity';
import { UserWallet } from '../../wallet/entities/user-wallet.entity';
import { LedgerEntry } from '../../ledger/entities/ledger-entry.entity';
import { TransactionSigningService } from './transaction-signing.service';
import { BlockchainBroadcastingService } from './blockchain-broadcasting.service';
import { RedisService } from '../../common/redis/redis.service';

describe('WithdrawalProcessingService', () => {
  let service: WithdrawalProcessingService;
  let withdrawalRepository: Repository<CryptoWithdrawalRequest>;
  let walletRepository: Repository<UserWallet>;
  let ledgerRepository: Repository<LedgerEntry>;
  let signingService: TransactionSigningService;
  let broadcastingService: BlockchainBroadcastingService;
  let redisService: RedisService;
  let dataSource: DataSource;

  const testUserId = 'user-123';
  const testWithdrawalId = 'withdrawal-123';
  const testTxHash = '0x1234567890abcdef';

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
    save: jest.fn(),
  };

  const mockWalletRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockLedgerRepository = {
    create: jest.fn(),
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
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalProcessingService,
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
    withdrawalRepository = module.get<Repository<CryptoWithdrawalRequest>>(
      getRepositoryToken(CryptoWithdrawalRequest),
    );
    walletRepository = module.get<Repository<UserWallet>>(getRepositoryToken(UserWallet));
    ledgerRepository = module.get<Repository<LedgerEntry>>(getRepositoryToken(LedgerEntry));
    signingService = module.get<TransactionSigningService>(TransactionSigningService);
    broadcastingService = module.get<BlockchainBroadcastingService>(
      BlockchainBroadcastingService,
    );
    redisService = module.get<RedisService>(RedisService);
    dataSource = module.get<DataSource>(DataSource);

    // Reset all mocks
    jest.clearAllMocks();
    mockQueryRunner.manager.save.mockReset();
    mockQueryRunner.manager.findOne.mockReset();
    mockQueryRunner.manager.create.mockReset();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(withdrawalRepository).toBeDefined();
      expect(walletRepository).toBeDefined();
      expect(ledgerRepository).toBeDefined();
      expect(signingService).toBeDefined();
      expect(broadcastingService).toBeDefined();
      expect(redisService).toBeDefined();
      expect(dataSource).toBeDefined();
    });
  });

  describe('processWithdrawal', () => {
    const mockWithdrawal = {
      id: testWithdrawalId,
      userId: testUserId,
      currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
      amount: '0.5',
      totalAmount: '0.5006',
      destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      status: 'PENDING' as const,
      requiresAdminApproval: false,
    };

    it('should throw BadRequestException if withdrawal not found', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(null);

      await expect(service.processWithdrawal(testWithdrawalId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.processWithdrawal(testWithdrawalId)).rejects.toThrow(
        'Withdrawal request not found',
      );
    });

    it('should throw BadRequestException if withdrawal status is not PENDING', async () => {
      const completedWithdrawal = { ...mockWithdrawal, status: 'COMPLETED' as const };
      mockWithdrawalRepository.findOne.mockResolvedValue(completedWithdrawal);

      await expect(service.processWithdrawal(testWithdrawalId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.processWithdrawal(testWithdrawalId)).rejects.toThrow(
        'Cannot process withdrawal with status COMPLETED',
      );
    });

    it('should return withdrawal if it requires admin approval', async () => {
      const adminApprovalWithdrawal = { ...mockWithdrawal, requiresAdminApproval: true };
      mockWithdrawalRepository.findOne.mockResolvedValue(adminApprovalWithdrawal);

      const result = await service.processWithdrawal(testWithdrawalId);

      expect(result).toEqual(adminApprovalWithdrawal);
      expect(mockSigningService.signBitcoinTransaction).not.toHaveBeenCalled();
    });

    it('should process automatic withdrawal if no admin approval required', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);
      mockWithdrawalRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockSigningService.signBitcoinTransaction.mockResolvedValue({
        txHex: 'signed-tx-hex',
      });
      mockBroadcastingService.broadcastBitcoinTransaction.mockResolvedValue({
        success: true,
        txHash: testTxHash,
      });

      const result = await service.processWithdrawal(testWithdrawalId);

      expect(result.status).toBe('BROADCASTED');
      expect(result.transactionHash).toBe(testTxHash);
      expect(mockSigningService.signBitcoinTransaction).toHaveBeenCalled();
      expect(mockBroadcastingService.broadcastBitcoinTransaction).toHaveBeenCalled();
    });
  });

  describe('processAutomaticWithdrawal', () => {
    const mockWithdrawal = {
      id: testWithdrawalId,
      userId: testUserId,
      currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
      amount: '0.5',
      totalAmount: '0.5006',
      destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      status: 'PENDING' as const,
      requiresAdminApproval: false,
    } as any;

    it('should successfully process BTC withdrawal through all stages', async () => {
      const freshWithdrawal = {
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        amount: '0.5',
        totalAmount: '0.5006',
        destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        status: 'PENDING' as const,
        requiresAdminApproval: false,
      } as any;

      mockWithdrawalRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockSigningService.signBitcoinTransaction.mockResolvedValue({
        txHex: 'signed-tx-hex',
      });
      mockBroadcastingService.broadcastBitcoinTransaction.mockResolvedValue({
        success: true,
        txHash: testTxHash,
      });

      const result = await service.processAutomaticWithdrawal(freshWithdrawal);

      expect(result.status).toBe('BROADCASTED');
      expect(result.transactionHash).toBe(testTxHash);
      expect(result.confirmations).toBe(0);

      // Verify save was called 4 times (APPROVED, SIGNING, BROADCASTING, BROADCASTED)
      expect(mockWithdrawalRepository.save).toHaveBeenCalledTimes(4);
    });

    it('should successfully process ETH withdrawal', async () => {
      const ethWithdrawal = {
        ...mockWithdrawal,
        currency: 'ETH' as 'BTC' | 'ETH' | 'USDT',
        destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      } as any;

      mockWithdrawalRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockSigningService.signEthereumTransaction.mockResolvedValue({
        signedTx: 'signed-eth-tx',
      });
      mockBroadcastingService.broadcastEthereumTransaction.mockResolvedValue({
        success: true,
        txHash: testTxHash,
      });

      const result = await service.processAutomaticWithdrawal(ethWithdrawal);

      expect(result.status).toBe('BROADCASTED');
      expect(mockSigningService.signEthereumTransaction).toHaveBeenCalledWith(
        ethWithdrawal.destinationAddress,
        ethWithdrawal.amount,
        0,
        '21000',
        '50',
      );
    });

    it('should successfully process USDT withdrawal', async () => {
      const usdtWithdrawal = {
        ...mockWithdrawal,
        currency: 'USDT' as 'BTC' | 'ETH' | 'USDT',
        destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      } as any;

      mockWithdrawalRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockSigningService.signUSDTTransaction.mockResolvedValue({
        signedTx: 'signed-usdt-tx',
      });
      mockBroadcastingService.broadcastUSDTTransaction.mockResolvedValue({
        success: true,
        txHash: testTxHash,
      });

      const result = await service.processAutomaticWithdrawal(usdtWithdrawal);

      expect(result.status).toBe('BROADCASTED');
      expect(mockSigningService.signUSDTTransaction).toHaveBeenCalledWith(
        usdtWithdrawal.destinationAddress,
        usdtWithdrawal.amount,
        'ERC20',
        0,
        '65000',
        '50',
      );
    });

    it('should handle broadcast failure and call handleBroadcastFailure', async () => {
      const freshWithdrawal = {
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        amount: '0.5',
        totalAmount: '0.5006',
        destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        status: 'PENDING' as const,
        requiresAdminApproval: false,
      } as any;

      mockWithdrawalRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockSigningService.signBitcoinTransaction.mockResolvedValue({
        txHex: 'signed-tx-hex',
      });
      mockBroadcastingService.broadcastBitcoinTransaction.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      mockQueryRunner.manager.findOne.mockResolvedValue({
        userId: testUserId,
        currency: 'BTC',
        availableBalance: '0.50000000',
        lockedBalance: '0.50060000',
        totalBalance: '1.00060000',
      });

      const result = await service.processAutomaticWithdrawal(freshWithdrawal);

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('Network error');
    });

    it('should handle signing failure', async () => {
      const freshWithdrawal = {
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        amount: '0.5',
        totalAmount: '0.5006',
        destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        status: 'PENDING' as const,
        requiresAdminApproval: false,
      } as any;

      mockWithdrawalRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockSigningService.signBitcoinTransaction.mockRejectedValue(
        new Error('Signing failed'),
      );

      mockQueryRunner.manager.findOne.mockResolvedValue({
        userId: testUserId,
        currency: 'BTC',
        availableBalance: '0.50000000',
        lockedBalance: '0.50060000',
        totalBalance: '1.00060000',
      });

      const result = await service.processAutomaticWithdrawal(freshWithdrawal);

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toContain('Signing failed');
    });
  });

  describe('processAdminApprovedWithdrawal', () => {
    const mockWithdrawal = {
      id: testWithdrawalId,
      userId: testUserId,
      currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
      amount: '0.5',
      totalAmount: '0.5006',
      destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      status: 'PENDING' as const,
      requiresAdminApproval: true,
    } as any;

    it('should throw BadRequestException if status is not PENDING', async () => {
      const approvedWithdrawal = { ...mockWithdrawal, status: 'APPROVED' as const };

      await expect(
        service.processAdminApprovedWithdrawal(approvedWithdrawal),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.processAdminApprovedWithdrawal(approvedWithdrawal),
      ).rejects.toThrow('Withdrawal must be in PENDING status to be approved');
    });

    it('should throw BadRequestException if withdrawal does not require admin approval', async () => {
      const noAdminWithdrawal = { ...mockWithdrawal, requiresAdminApproval: false };

      await expect(
        service.processAdminApprovedWithdrawal(noAdminWithdrawal),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.processAdminApprovedWithdrawal(noAdminWithdrawal),
      ).rejects.toThrow('Withdrawal does not require admin approval');
    });

    it('should process admin-approved withdrawal successfully', async () => {
      mockWithdrawalRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockSigningService.signBitcoinTransaction.mockResolvedValue({
        txHex: 'signed-tx-hex',
      });
      mockBroadcastingService.broadcastBitcoinTransaction.mockResolvedValue({
        success: true,
        txHash: testTxHash,
      });

      const result = await service.processAdminApprovedWithdrawal(mockWithdrawal);

      expect(result.status).toBe('BROADCASTED');
      expect(result.transactionHash).toBe(testTxHash);
    });
  });

  describe('finalizeWithdrawal', () => {
    const mockWithdrawal = {
      id: testWithdrawalId,
      userId: testUserId,
      currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
      amount: '0.5',
      totalAmount: '0.5006',
      destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      status: 'BROADCASTED' as const,
      transactionHash: testTxHash,
      confirmations: 6,
    };

    const mockWallet = {
      userId: testUserId,
      currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
      availableBalance: '0.50000000',
      lockedBalance: '0.50060000',
      totalBalance: '1.00060000',
    };

    it('should throw BadRequestException if withdrawal not found', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(null);

      await expect(service.finalizeWithdrawal(testWithdrawalId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.finalizeWithdrawal(testWithdrawalId)).rejects.toThrow(
        'Withdrawal request not found',
      );
    });

    it('should throw BadRequestException if withdrawal status is not BROADCASTED', async () => {
      const pendingWithdrawal = { ...mockWithdrawal, status: 'PENDING' as const };
      mockWithdrawalRepository.findOne.mockResolvedValue(pendingWithdrawal);

      await expect(service.finalizeWithdrawal(testWithdrawalId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.finalizeWithdrawal(testWithdrawalId)).rejects.toThrow(
        'Cannot finalize withdrawal with status PENDING',
      );
    });

    it('should finalize withdrawal successfully', async () => {
      mockWithdrawalRepository.findOne.mockResolvedValue(mockWithdrawal);
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);

      const result = await service.finalizeWithdrawal(testWithdrawalId);

      expect(result.status).toBe('COMPLETED');
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should deduct locked balance correctly', async () => {
      const freshWithdrawal = {
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        amount: '0.5',
        totalAmount: '0.5006',
        destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        status: 'BROADCASTED' as const,
        transactionHash: testTxHash,
        confirmations: 6,
      };

      mockWithdrawalRepository.findOne.mockResolvedValue(freshWithdrawal);
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const freshWallet = {
        userId: testUserId,
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        availableBalance: '0.50000000',
        lockedBalance: '0.50060000',
        totalBalance: '1.00060000',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(freshWallet);

      await service.finalizeWithdrawal(testWithdrawalId);

      const savedWallet = mockQueryRunner.manager.save.mock.calls.find(
        (call) =>
          call[0] &&
          call[0].lockedBalance !== undefined &&
          call[0].availableBalance !== undefined,
      );

      expect(savedWallet).toBeDefined();
      expect(savedWallet[0].lockedBalance).toBe('0.00000000');
    });

    it('should create ledger entry for withdrawal completion', async () => {
      const freshWithdrawal = {
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        amount: '0.5',
        totalAmount: '0.5006',
        destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        status: 'BROADCASTED' as const,
        transactionHash: testTxHash,
        confirmations: 6,
      };

      mockWithdrawalRepository.findOne.mockResolvedValue(freshWithdrawal);
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);

      await service.finalizeWithdrawal(testWithdrawalId);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        LedgerEntry,
        expect.objectContaining({
          userId: testUserId,
          currency: 'BTC',
          type: 'WITHDRAWAL_COMPLETE',
          amount: '-0.5006',
          referenceType: 'CRYPTO_WITHDRAWAL',
          referenceId: testWithdrawalId,
        }),
      );
    });

    it('should invalidate user cache after finalization', async () => {
      const freshWithdrawal = {
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        amount: '0.5',
        totalAmount: '0.5006',
        destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        status: 'BROADCASTED' as const,
        transactionHash: testTxHash,
        confirmations: 6,
      };

      mockWithdrawalRepository.findOne.mockResolvedValue(freshWithdrawal);
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);

      await service.finalizeWithdrawal(testWithdrawalId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`user:balances:${testUserId}`);
    });

    it('should rollback transaction on error', async () => {
      const freshWithdrawal = {
        id: testWithdrawalId,
        userId: testUserId,
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        amount: '0.5',
        totalAmount: '0.5006',
        destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        status: 'BROADCASTED' as const,
        transactionHash: testTxHash,
        confirmations: 6,
      };

      mockWithdrawalRepository.findOne.mockResolvedValue(freshWithdrawal);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.finalizeWithdrawal(testWithdrawalId)).rejects.toThrow(
        'Database error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('handleBroadcastFailure', () => {
    const mockWithdrawal = {
      id: testWithdrawalId,
      userId: testUserId,
      currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
      amount: '0.5',
      totalAmount: '0.5006',
      destinationAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      status: 'BROADCASTING' as const,
    } as any;

    const mockWallet = {
      userId: testUserId,
      currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
      availableBalance: '0.50000000',
      lockedBalance: '0.50060000',
      totalBalance: '1.00060000',
    };

    it('should mark withdrawal as FAILED', async () => {
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);

      const result = await service.handleBroadcastFailure(
        mockWithdrawal,
        'Network error',
      );

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('Network error');
    });

    it('should unlock funds in wallet', async () => {
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const freshWallet = {
        userId: testUserId,
        currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
        availableBalance: '0.50000000',
        lockedBalance: '0.50060000',
        totalBalance: '1.00060000',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(freshWallet);

      await service.handleBroadcastFailure(mockWithdrawal, 'Network error');

      const savedWallet = mockQueryRunner.manager.save.mock.calls.find(
        (call) =>
          call[0] &&
          call[0].availableBalance !== undefined &&
          call[0].lockedBalance !== undefined,
      );

      expect(savedWallet).toBeDefined();
      expect(savedWallet[0].availableBalance).toBe('1.00060000');
      expect(savedWallet[0].lockedBalance).toBe('0.00000000');
    });

    it('should create ledger entry for failure', async () => {
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);

      await service.handleBroadcastFailure(mockWithdrawal, 'Network error');

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        LedgerEntry,
        expect.objectContaining({
          userId: testUserId,
          currency: 'BTC',
          type: 'WITHDRAWAL_FAILED',
          amount: '0.5006',
          referenceType: 'CRYPTO_WITHDRAWAL',
          referenceId: testWithdrawalId,
        }),
      );
    });

    it('should invalidate user cache after failure', async () => {
      mockQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);

      await service.handleBroadcastFailure(mockWithdrawal, 'Network error');

      expect(mockRedisService.del).toHaveBeenCalledWith(`user:balances:${testUserId}`);
    });

    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.handleBroadcastFailure(mockWithdrawal, 'Network error'),
      ).rejects.toThrow('Database error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
