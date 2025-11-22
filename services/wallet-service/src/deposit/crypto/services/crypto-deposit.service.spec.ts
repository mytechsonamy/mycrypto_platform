import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CryptoDepositService } from './crypto-deposit.service';
import { BlockchainAddress } from '../entities/blockchain-address.entity';
import { BlockchainTransaction } from '../entities/blockchain-transaction.entity';
import { HDWalletService } from './hd-wallet.service';
import { BlockCypherService } from './blockcypher.service';
import { QRCodeService } from './qrcode.service';
import { WalletService } from '../../../wallet/wallet.service';
import { NotificationService } from '../../../common/services/notification.service';
import { CryptoCurrency } from '../dto/generate-address.dto';

describe('CryptoDepositService', () => {
  let service: CryptoDepositService;
  let addressRepository: Repository<BlockchainAddress>;
  let transactionRepository: Repository<BlockchainTransaction>;
  let hdWalletService: HDWalletService;
  let blockCypherService: BlockCypherService;
  let qrCodeService: QRCodeService;
  let walletService: WalletService;
  let notificationService: NotificationService;

  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testBtcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
  const testEthAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const testTxHash = '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z';

  const mockAddressRepository = {
    findOne: jest.fn(),
    create: jest.fn((entity) => entity),
    save: jest.fn((entity) => Promise.resolve({ id: 'addr-123', ...entity })),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
    increment: jest.fn(),
  };

  const mockTransactionRepository = {
    findOne: jest.fn(),
    create: jest.fn((entity) => entity),
    save: jest.fn((entity) => Promise.resolve({ id: 'tx-123', ...entity })),
    findAndCount: jest.fn(),
  };

  const mockHDWalletService = {
    generateBtcAddress: jest.fn(),
    generateEthAddress: jest.fn(),
    generateUsdtAddress: jest.fn(),
    getNextAddressIndex: jest.fn(),
  };

  const mockBlockCypherService = {
    registerAddressWebhook: jest.fn(),
    getTransaction: jest.fn(),
    getRequiredConfirmations: jest.fn((currency: string) => {
      return currency === 'BTC' ? 3 : 12;
    }),
  };

  const mockQRCodeService = {
    generateQRCode: jest.fn((address) => Promise.resolve(`https://qr.example.com/${address}`)),
  };

  const mockWalletService = {
    creditUserWallet: jest.fn(),
    getUserBalance: jest.fn(() =>
      Promise.resolve({
        availableBalance: '1.00000000',
        lockedBalance: '0.00000000',
        totalBalance: '1.00000000',
      }),
    ),
  };

  const mockNotificationService = {
    sendDepositDetected: jest.fn(),
    sendDepositCredited: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoDepositService,
        {
          provide: getRepositoryToken(BlockchainAddress),
          useValue: mockAddressRepository,
        },
        {
          provide: getRepositoryToken(BlockchainTransaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: HDWalletService,
          useValue: mockHDWalletService,
        },
        {
          provide: BlockCypherService,
          useValue: mockBlockCypherService,
        },
        {
          provide: QRCodeService,
          useValue: mockQRCodeService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<CryptoDepositService>(CryptoDepositService);
    addressRepository = module.get(getRepositoryToken(BlockchainAddress));
    transactionRepository = module.get(getRepositoryToken(BlockchainTransaction));
    hdWalletService = module.get<HDWalletService>(HDWalletService);
    blockCypherService = module.get<BlockCypherService>(BlockCypherService);
    qrCodeService = module.get<QRCodeService>(QRCodeService);
    walletService = module.get<WalletService>(WalletService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(addressRepository).toBeDefined();
      expect(transactionRepository).toBeDefined();
      expect(hdWalletService).toBeDefined();
      expect(blockCypherService).toBeDefined();
      expect(qrCodeService).toBeDefined();
      expect(walletService).toBeDefined();
      expect(notificationService).toBeDefined();
    });
  });

  describe('generateDepositAddress', () => {
    it('should return existing active BTC address if one exists', async () => {
      const existingAddress = {
        id: 'addr-123',
        userId: testUserId,
        currency: CryptoCurrency.BTC,
        address: testBtcAddress,
        qrCodeUrl: 'https://qr.example.com/btc',
        isActive: true,
        createdAt: new Date(),
      };

      mockAddressRepository.findOne.mockResolvedValue(existingAddress);

      const result = await service.generateDepositAddress(testUserId, {
        currency: CryptoCurrency.BTC,
      });

      expect(result.address).toBe(testBtcAddress);
      expect(result.currency).toBe(CryptoCurrency.BTC);
      expect(mockHDWalletService.generateBtcAddress).not.toHaveBeenCalled();
    });

    it('should generate new BTC address if no active address exists', async () => {
      mockAddressRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.createQueryBuilder().getRawOne.mockResolvedValue({ max: -1 });
      mockHDWalletService.getNextAddressIndex.mockReturnValue(0);
      mockHDWalletService.generateBtcAddress.mockReturnValue({
        address: testBtcAddress,
        derivationPath: "m/44'/0'/0'/0/0",
        publicKey: '02aabbccdd...',
      });
      mockBlockCypherService.registerAddressWebhook.mockResolvedValue({
        id: 'webhook-123',
        event: 'unconfirmed-tx',
        address: testBtcAddress,
        token: 'test-token',
        url: 'https://webhook.example.com',
      });

      const result = await service.generateDepositAddress(testUserId, {
        currency: CryptoCurrency.BTC,
      });

      expect(mockHDWalletService.generateBtcAddress).toHaveBeenCalledWith(0);
      expect(mockQRCodeService.generateQRCode).toHaveBeenCalledWith(testBtcAddress);
      expect(mockAddressRepository.save).toHaveBeenCalled();
      expect(mockBlockCypherService.registerAddressWebhook).toHaveBeenCalledWith(
        CryptoCurrency.BTC,
        testBtcAddress,
      );
      expect(result.address).toBe(testBtcAddress);
      expect(result.currency).toBe(CryptoCurrency.BTC);
      expect(result.requiredConfirmations).toBe(3);
    });

    it('should generate new ETH address', async () => {
      mockAddressRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.createQueryBuilder().getRawOne.mockResolvedValue({ max: -1 });
      mockHDWalletService.getNextAddressIndex.mockReturnValue(0);
      mockHDWalletService.generateEthAddress.mockReturnValue({
        address: testEthAddress,
        derivationPath: "m/44'/60'/0'/0/0",
        publicKey: '04aabbccdd...',
      });
      mockBlockCypherService.registerAddressWebhook.mockResolvedValue({
        id: 'webhook-456',
      });

      const result = await service.generateDepositAddress(testUserId, {
        currency: CryptoCurrency.ETH,
      });

      expect(mockHDWalletService.generateEthAddress).toHaveBeenCalledWith(0);
      expect(result.address).toBe(testEthAddress);
      expect(result.currency).toBe(CryptoCurrency.ETH);
      expect(result.requiredConfirmations).toBe(12);
    });

    it('should generate new USDT address', async () => {
      mockAddressRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.createQueryBuilder().getRawOne.mockResolvedValue({ max: 4 });
      mockHDWalletService.getNextAddressIndex.mockReturnValue(5);
      mockHDWalletService.generateUsdtAddress.mockReturnValue({
        address: testEthAddress,
        derivationPath: "m/44'/60'/0'/0/5",
        publicKey: '04aabbccdd...',
      });
      mockBlockCypherService.registerAddressWebhook.mockResolvedValue({
        id: 'webhook-789',
      });

      const result = await service.generateDepositAddress(testUserId, {
        currency: CryptoCurrency.USDT,
      });

      expect(mockHDWalletService.generateUsdtAddress).toHaveBeenCalledWith(5);
      expect(result.address).toBe(testEthAddress);
      expect(result.currency).toBe(CryptoCurrency.USDT);
    });

    it('should handle webhook registration failure gracefully', async () => {
      mockAddressRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.createQueryBuilder().getRawOne.mockResolvedValue({ max: -1 });
      mockHDWalletService.getNextAddressIndex.mockReturnValue(0);
      mockHDWalletService.generateBtcAddress.mockReturnValue({
        address: testBtcAddress,
        derivationPath: "m/44'/0'/0'/0/0",
        publicKey: '02aabbccdd...',
      });
      mockBlockCypherService.registerAddressWebhook.mockRejectedValue(
        new Error('Webhook registration failed'),
      );

      // Should not throw, just log warning
      const result = await service.generateDepositAddress(testUserId, {
        currency: CryptoCurrency.BTC,
      });

      expect(result.address).toBe(testBtcAddress);
      expect(mockAddressRepository.save).toHaveBeenCalled();
    });

    it('should increment address index for sequential generation', async () => {
      mockAddressRepository.findOne.mockResolvedValue(null);

      // Create a fresh mock query builder for this test
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 9 }),
      };
      mockAddressRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockHDWalletService.getNextAddressIndex.mockReturnValue(10);
      mockHDWalletService.generateBtcAddress.mockReturnValue({
        address: testBtcAddress,
        derivationPath: "m/44'/0'/0'/0/10",
        publicKey: '02aabbccdd...',
      });
      mockBlockCypherService.registerAddressWebhook.mockResolvedValue({
        id: 'webhook-123',
      });

      await service.generateDepositAddress(testUserId, {
        currency: CryptoCurrency.BTC,
      });

      expect(mockHDWalletService.getNextAddressIndex).toHaveBeenCalledWith(
        CryptoCurrency.BTC,
        9,
      );
      expect(mockHDWalletService.generateBtcAddress).toHaveBeenCalledWith(10);
    });

    it('should throw BadRequestException for unsupported currency', async () => {
      mockAddressRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.createQueryBuilder().getRawOne.mockResolvedValue({ max: -1 });

      await expect(
        service.generateDepositAddress(testUserId, {
          currency: 'XRP' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserDepositAddress', () => {
    it('should return active deposit address for user', async () => {
      const existingAddress = {
        id: 'addr-123',
        userId: testUserId,
        currency: 'BTC',
        address: testBtcAddress,
        qrCodeUrl: 'https://qr.example.com/btc',
        isActive: true,
        createdAt: new Date(),
      };

      mockAddressRepository.findOne.mockResolvedValue(existingAddress);

      const result = await service.getUserDepositAddress(testUserId, 'BTC');

      expect(result.address).toBe(testBtcAddress);
      expect(result.userId).toBe(testUserId);
      expect(mockAddressRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: testUserId,
          currency: 'BTC',
          isActive: true,
        },
      });
    });

    it('should throw NotFoundException if no active address exists', async () => {
      mockAddressRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getUserDepositAddress(testUserId, 'BTC'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDepositHistory', () => {
    it('should return paginated deposit history', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          userId: testUserId,
          currency: 'BTC',
          txHash: 'hash1',
          amount: '0.5',
          status: 'CREDITED',
          confirmations: 6,
          requiredConfirmations: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tx-2',
          userId: testUserId,
          currency: 'ETH',
          txHash: 'hash2',
          amount: '1.0',
          status: 'PENDING',
          confirmations: 5,
          requiredConfirmations: 12,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockTransactionRepository.findAndCount.mockResolvedValue([
        mockTransactions,
        2,
      ]);

      const result = await service.getDepositHistory(testUserId);

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by currency', async () => {
      mockTransactionRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getDepositHistory(testUserId, 'BTC', 1, 20);

      expect(mockTransactionRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: testUserId, currency: 'BTC' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should support pagination', async () => {
      mockTransactionRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getDepositHistory(testUserId, undefined, 3, 10);

      expect(mockTransactionRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: testUserId },
        order: { createdAt: 'DESC' },
        skip: 20, // (page 3 - 1) * pageSize 10
        take: 10,
      });
    });

    it('should handle empty history', async () => {
      mockTransactionRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getDepositHistory(testUserId);

      expect(result.transactions).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getTransactionStatus', () => {
    it('should return transaction status', async () => {
      const mockTransaction = {
        id: 'tx-123',
        userId: testUserId,
        txHash: testTxHash,
        currency: 'BTC',
        amount: '0.5',
        status: 'PENDING',
        confirmations: 2,
        requiredConfirmations: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionStatus(testUserId, testTxHash);

      expect(result.txHash).toBe(testTxHash);
      expect(result.status).toBe('PENDING');
      expect(result.confirmations).toBe(2);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getTransactionStatus(testUserId, 'nonexistent-hash'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processIncomingTransaction', () => {
    const mockTxDetails = {
      txHash: testTxHash,
      blockHeight: 700000,
      blockTime: '2023-01-15T10:30:00Z',
      confirmations: 1,
      from: ['sender-address'],
      to: [testBtcAddress],
      amounts: [50000000], // 0.5 BTC in satoshis
      total: 50000000,
      fees: 5000,
    };

    it('should process new incoming BTC transaction', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.findOne.mockResolvedValue({
        id: 'addr-123',
        userId: testUserId,
        currency: 'BTC',
        address: testBtcAddress,
        isActive: true,
      });
      mockBlockCypherService.getTransaction.mockResolvedValue(mockTxDetails);

      await service.processIncomingTransaction(testTxHash, 'BTC', testBtcAddress);

      expect(mockTransactionRepository.save).toHaveBeenCalled();
      expect(mockNotificationService.sendDepositDetected).toHaveBeenCalledWith(
        testUserId,
        'BTC',
        '0.50000000',
        testTxHash,
        1,
        3,
      );
    });

    it('should update existing transaction confirmations', async () => {
      const existingTx = {
        id: 'tx-123',
        txHash: testTxHash,
        status: 'PENDING',
        confirmations: 1,
      };

      mockTransactionRepository.findOne.mockResolvedValue(existingTx);
      mockBlockCypherService.getTransaction.mockResolvedValue({
        ...mockTxDetails,
        confirmations: 3,
      });

      await service.processIncomingTransaction(testTxHash, 'BTC', testBtcAddress);

      // Should call updateTransactionConfirmations
      expect(mockTransactionRepository.findOne).toHaveBeenCalled();
    });

    it('should skip processing if address not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.findOne.mockResolvedValue(null);

      await service.processIncomingTransaction(testTxHash, 'BTC', 'unknown-address');

      expect(mockBlockCypherService.getTransaction).not.toHaveBeenCalled();
      expect(mockTransactionRepository.save).not.toHaveBeenCalled();
    });

    it('should convert amounts correctly for different currencies', async () => {
      // ETH transaction
      const ethTxDetails = {
        txHash: testTxHash,
        blockHeight: 15000000,
        blockTime: '2023-01-15T10:30:00Z',
        confirmations: 1,
        from: ['0xsender'],
        to: [testEthAddress],
        amounts: [1000000000000000000], // 1 ETH in wei
        total: 1000000000000000000,
        fees: 21000000000000,
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.findOne.mockResolvedValue({
        id: 'addr-456',
        userId: testUserId,
        currency: 'ETH',
        address: testEthAddress,
      });
      mockBlockCypherService.getTransaction.mockResolvedValue(ethTxDetails);

      await service.processIncomingTransaction(testTxHash, 'ETH', testEthAddress);

      const savedTransaction = mockTransactionRepository.save.mock.calls[0][0];
      expect(savedTransaction.amount).toBe('1.000000000000000000');
      expect(savedTransaction.currency).toBe('ETH');
    });

    it('should handle confirmed transactions immediately', async () => {
      const confirmedTxDetails = {
        ...mockTxDetails,
        confirmations: 3, // BTC requires 3
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.findOne.mockResolvedValue({
        id: 'addr-123',
        userId: testUserId,
        currency: 'BTC',
        address: testBtcAddress,
      });
      mockBlockCypherService.getTransaction.mockResolvedValue(confirmedTxDetails);

      // Create a transaction object that will be returned
      let savedTransaction: any;
      mockTransactionRepository.save.mockImplementation((tx) => {
        savedTransaction = { id: 'tx-123', ...tx };
        return Promise.resolve(savedTransaction);
      });

      await service.processIncomingTransaction(testTxHash, 'BTC', testBtcAddress);

      // Verify transaction was saved with PENDING status initially
      expect(mockTransactionRepository.save).toHaveBeenCalled();
      const savedTx = mockTransactionRepository.save.mock.calls[0][0];
      expect(savedTx.status).toBe('PENDING');
      expect(savedTx.confirmations).toBe(3);
    });
  });

  describe('updateTransactionConfirmations', () => {
    it('should update confirmations for pending transaction', async () => {
      const mockTransaction = {
        id: 'tx-123',
        userId: testUserId,
        txHash: testTxHash,
        currency: 'BTC',
        amount: '0.5',
        status: 'PENDING',
        confirmations: 1,
        requiredConfirmations: 3,
      };

      const updatedTxDetails = {
        txHash: testTxHash,
        confirmations: 3,
        blockHeight: 700000,
        blockTime: '2023-01-15T10:30:00Z',
        from: ['sender'],
        to: [testBtcAddress],
        amounts: [50000000],
        total: 50000000,
        fees: 5000,
      };

      mockTransactionRepository.findOne
        .mockResolvedValueOnce(mockTransaction) // First call in updateTransactionConfirmations
        .mockResolvedValueOnce({ ...mockTransaction, status: 'CONFIRMED', confirmations: 3 }); // Second call in creditUserWallet
      mockBlockCypherService.getTransaction.mockResolvedValue(updatedTxDetails);
      mockTransactionRepository.save.mockImplementation((tx) => Promise.resolve(tx));

      await service.updateTransactionConfirmations('tx-123');

      // Should have saved twice: once for CONFIRMED, once for CREDITED
      expect(mockTransactionRepository.save).toHaveBeenCalled();
      const firstSave = mockTransactionRepository.save.mock.calls[0][0];
      expect(firstSave.confirmations).toBe(3);
      expect(firstSave.status).toBe('CONFIRMED');
    });

    it('should not update already credited transaction', async () => {
      const creditedTransaction = {
        id: 'tx-123',
        status: 'CREDITED',
      };

      mockTransactionRepository.findOne.mockResolvedValue(creditedTransaction);

      await service.updateTransactionConfirmations('tx-123');

      expect(mockBlockCypherService.getTransaction).not.toHaveBeenCalled();
      expect(mockTransactionRepository.save).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockTransaction = {
        id: 'tx-123',
        txHash: testTxHash,
        currency: 'BTC',
        status: 'PENDING',
      };

      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);
      mockBlockCypherService.getTransaction.mockRejectedValue(
        new Error('API error'),
      );

      // Should not throw
      await service.updateTransactionConfirmations('tx-123');

      expect(mockTransactionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Amount Conversion', () => {
    it('should convert BTC satoshis to BTC correctly', async () => {
      const mockTxDetails = {
        txHash: testTxHash,
        blockHeight: 700000,
        blockTime: '2023-01-15T10:30:00Z',
        confirmations: 1,
        from: ['sender'],
        to: [testBtcAddress],
        amounts: [100000000], // 1 BTC
        total: 100000000,
        fees: 5000,
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.findOne.mockResolvedValue({
        id: 'addr-123',
        userId: testUserId,
        currency: 'BTC',
        address: testBtcAddress,
      });
      mockBlockCypherService.getTransaction.mockResolvedValue(mockTxDetails);

      await service.processIncomingTransaction(testTxHash, 'BTC', testBtcAddress);

      const savedTx = mockTransactionRepository.save.mock.calls[0][0];
      expect(savedTx.amount).toBe('1.00000000');
    });

    it('should convert USDT correctly (6 decimals)', async () => {
      const usdtTxDetails = {
        txHash: testTxHash,
        blockHeight: 15000000,
        blockTime: '2023-01-15T10:30:00Z',
        confirmations: 1,
        from: ['0xsender'],
        to: [testEthAddress],
        amounts: [1000000000], // 1000 USDT
        total: 1000000000,
        fees: 21000,
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.findOne.mockResolvedValue({
        id: 'addr-789',
        userId: testUserId,
        currency: 'USDT',
        address: testEthAddress,
      });
      mockBlockCypherService.getTransaction.mockResolvedValue(usdtTxDetails);

      await service.processIncomingTransaction(testTxHash, 'USDT', testEthAddress);

      const savedTx = mockTransactionRepository.save.mock.calls[0][0];
      expect(savedTx.amount).toBe('1000.000000');
    });
  });

  describe('Response Mapping', () => {
    it('should map address entity to response DTO correctly', async () => {
      const mockAddress = {
        id: 'addr-123',
        userId: testUserId,
        currency: 'BTC',
        address: testBtcAddress,
        qrCodeUrl: 'https://qr.example.com/btc',
        isActive: true,
        createdAt: new Date('2023-01-15T10:00:00Z'),
      };

      mockAddressRepository.findOne.mockResolvedValue(mockAddress);

      const result = await service.getUserDepositAddress(testUserId, 'BTC');

      expect(result).toEqual({
        id: 'addr-123',
        userId: testUserId,
        currency: 'BTC',
        address: testBtcAddress,
        qrCodeUrl: 'https://qr.example.com/btc',
        requiredConfirmations: 3,
        estimatedConfirmationTime: '30-60 minutes',
        createdAt: mockAddress.createdAt,
      });
    });

    it('should set correct confirmation time for ETH', async () => {
      const mockAddress = {
        id: 'addr-456',
        userId: testUserId,
        currency: 'ETH',
        address: testEthAddress,
        qrCodeUrl: 'https://qr.example.com/eth',
        isActive: true,
        createdAt: new Date(),
      };

      mockAddressRepository.findOne.mockResolvedValue(mockAddress);

      const result = await service.getUserDepositAddress(testUserId, 'ETH');

      expect(result.requiredConfirmations).toBe(12);
      expect(result.estimatedConfirmationTime).toBe('3-5 minutes');
    });
  });

  describe('Address Statistics', () => {
    it('should update address statistics on transaction', async () => {
      const mockTxDetails = {
        txHash: testTxHash,
        blockHeight: 700000,
        blockTime: '2023-01-15T10:30:00Z',
        confirmations: 1,
        from: ['sender'],
        to: [testBtcAddress],
        amounts: [50000000],
        total: 50000000,
        fees: 5000,
      };

      const mockAddress = {
        id: 'addr-123',
        userId: testUserId,
        currency: 'BTC',
        address: testBtcAddress,
        totalReceived: '0.00000000',
        transactionCount: 0,
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockAddressRepository.findOne
        .mockResolvedValueOnce(mockAddress) // First call for finding address
        .mockResolvedValueOnce(mockAddress); // Second call for updating statistics
      mockBlockCypherService.getTransaction.mockResolvedValue(mockTxDetails);

      await service.processIncomingTransaction(testTxHash, 'BTC', testBtcAddress);

      expect(mockAddressRepository.increment).toHaveBeenCalledWith(
        { id: 'addr-123' },
        'transactionCount',
        1,
      );
      expect(mockAddressRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalReceived: '0.50000000',
          lastUsedAt: expect.any(Date),
        }),
      );
    });
  });
});
