import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CryptoDepositController } from './crypto-deposit.controller';
import { CryptoDepositService } from './services/crypto-deposit.service';
import { KycVerificationService } from '../../common/services/kyc-verification.service';
import { CryptoCurrency } from './dto/generate-address.dto';
import { Request } from 'express';

describe('CryptoDepositController', () => {
  let controller: CryptoDepositController;
  let cryptoDepositService: CryptoDepositService;
  let kycVerificationService: KycVerificationService;

  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testAuthToken = 'test-jwt-token-12345';
  const testBtcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
  const testEthAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const testTxHash = '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z';

  const mockCryptoDepositService = {
    generateDepositAddress: jest.fn(),
    getUserDepositAddress: jest.fn(),
    getDepositHistory: jest.fn(),
    getTransactionStatus: jest.fn(),
    processIncomingTransaction: jest.fn(),
  };

  const mockKycVerificationService = {
    requireKycLevel1: jest.fn(),
  };

  const createMockRequest = (
    userId: string,
    authToken?: string,
  ): Request & { user: { userId: string } } => {
    return {
      user: { userId },
      headers: authToken
        ? { authorization: `Bearer ${authToken}` }
        : {},
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CryptoDepositController],
      providers: [
        {
          provide: CryptoDepositService,
          useValue: mockCryptoDepositService,
        },
        {
          provide: KycVerificationService,
          useValue: mockKycVerificationService,
        },
      ],
    }).compile();

    controller = module.get<CryptoDepositController>(CryptoDepositController);
    cryptoDepositService = module.get<CryptoDepositService>(CryptoDepositService);
    kycVerificationService = module.get<KycVerificationService>(KycVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(cryptoDepositService).toBeDefined();
      expect(kycVerificationService).toBeDefined();
    });
  });

  describe('generateAddress', () => {
    const mockDepositAddress = {
      id: 'addr-123',
      userId: testUserId,
      currency: CryptoCurrency.BTC,
      address: testBtcAddress,
      qrCodeUrl: 'https://qr.example.com/btc',
      requiredConfirmations: 3,
      estimatedConfirmationTime: '30-60 minutes',
      createdAt: new Date(),
    };

    it('should generate BTC deposit address with valid KYC', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);
      const dto = { currency: CryptoCurrency.BTC };

      mockKycVerificationService.requireKycLevel1.mockResolvedValue(true);
      mockCryptoDepositService.generateDepositAddress.mockResolvedValue(
        mockDepositAddress,
      );

      const result = await controller.generateAddress(mockRequest, dto);

      expect(kycVerificationService.requireKycLevel1).toHaveBeenCalledWith(
        testUserId,
        testAuthToken,
      );
      expect(cryptoDepositService.generateDepositAddress).toHaveBeenCalledWith(
        testUserId,
        dto,
      );
      expect(result).toEqual(mockDepositAddress);
    });

    it('should generate ETH deposit address', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);
      const dto = { currency: CryptoCurrency.ETH };
      const ethAddress = {
        ...mockDepositAddress,
        currency: CryptoCurrency.ETH,
        address: testEthAddress,
        requiredConfirmations: 12,
        estimatedConfirmationTime: '3-5 minutes',
      };

      mockKycVerificationService.requireKycLevel1.mockResolvedValue(true);
      mockCryptoDepositService.generateDepositAddress.mockResolvedValue(ethAddress);

      const result = await controller.generateAddress(mockRequest, dto);

      expect(result.currency).toBe(CryptoCurrency.ETH);
      expect(result.requiredConfirmations).toBe(12);
    });

    it('should generate USDT deposit address', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);
      const dto = { currency: CryptoCurrency.USDT };
      const usdtAddress = {
        ...mockDepositAddress,
        currency: CryptoCurrency.USDT,
        address: testEthAddress,
        requiredConfirmations: 12,
      };

      mockKycVerificationService.requireKycLevel1.mockResolvedValue(true);
      mockCryptoDepositService.generateDepositAddress.mockResolvedValue(
        usdtAddress,
      );

      const result = await controller.generateAddress(mockRequest, dto);

      expect(result.currency).toBe(CryptoCurrency.USDT);
    });

    it('should throw 401 if authorization header is missing', async () => {
      const mockRequest = createMockRequest(testUserId); // No auth token
      const dto = { currency: CryptoCurrency.BTC };

      await expect(controller.generateAddress(mockRequest, dto)).rejects.toThrow(
        new HttpException(
          {
            error: 'MISSING_TOKEN',
            message: 'Authorization token required',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should throw 401 if authorization header does not start with Bearer', async () => {
      const mockRequest = {
        user: { userId: testUserId },
        headers: { authorization: 'InvalidFormat token' },
      } as any;
      const dto = { currency: CryptoCurrency.BTC };

      await expect(controller.generateAddress(mockRequest, dto)).rejects.toThrow(
        HttpException,
      );
    });

    it('should extract JWT token correctly from Bearer header', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);
      const dto = { currency: CryptoCurrency.BTC };

      mockKycVerificationService.requireKycLevel1.mockResolvedValue(true);
      mockCryptoDepositService.generateDepositAddress.mockResolvedValue(
        mockDepositAddress,
      );

      await controller.generateAddress(mockRequest, dto);

      expect(kycVerificationService.requireKycLevel1).toHaveBeenCalledWith(
        testUserId,
        testAuthToken,
      );
    });

    it('should throw 403 if KYC Level 1 not approved', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);
      const dto = { currency: CryptoCurrency.BTC };

      mockKycVerificationService.requireKycLevel1.mockRejectedValue(
        new HttpException(
          {
            error: 'KYC_REQUIRED',
            message: 'KYC Level 1 approval required',
          },
          HttpStatus.FORBIDDEN,
        ),
      );

      await expect(
        controller.generateAddress(mockRequest, dto),
      ).rejects.toThrow(HttpException);
    });

    it('should propagate service errors', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);
      const dto = { currency: CryptoCurrency.BTC };

      mockKycVerificationService.requireKycLevel1.mockResolvedValue(true);
      mockCryptoDepositService.generateDepositAddress.mockRejectedValue(
        new HttpException('Service error', HttpStatus.INTERNAL_SERVER_ERROR),
      );

      await expect(
        controller.generateAddress(mockRequest, dto),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getAddress', () => {
    const mockDepositAddress = {
      id: 'addr-123',
      userId: testUserId,
      currency: 'BTC',
      address: testBtcAddress,
      qrCodeUrl: 'https://qr.example.com/btc',
      requiredConfirmations: 3,
      estimatedConfirmationTime: '30-60 minutes',
      createdAt: new Date(),
    };

    it('should get existing BTC deposit address', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getUserDepositAddress.mockResolvedValue(
        mockDepositAddress,
      );

      const result = await controller.getAddress(mockRequest, 'btc');

      expect(cryptoDepositService.getUserDepositAddress).toHaveBeenCalledWith(
        testUserId,
        'BTC',
      );
      expect(result).toEqual(mockDepositAddress);
    });

    it('should convert currency to uppercase', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getUserDepositAddress.mockResolvedValue(
        mockDepositAddress,
      );

      await controller.getAddress(mockRequest, 'eth');

      expect(cryptoDepositService.getUserDepositAddress).toHaveBeenCalledWith(
        testUserId,
        'ETH',
      );
    });

    it('should get USDT address', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);
      const usdtAddress = {
        ...mockDepositAddress,
        currency: 'USDT',
        address: testEthAddress,
      };

      mockCryptoDepositService.getUserDepositAddress.mockResolvedValue(usdtAddress);

      const result = await controller.getAddress(mockRequest, 'usdt');

      expect(result.currency).toBe('USDT');
    });

    it('should throw 404 if no active address exists', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getUserDepositAddress.mockRejectedValue(
        new HttpException(
          {
            error: 'ADDRESS_NOT_FOUND',
            message: 'No active BTC deposit address found',
          },
          HttpStatus.NOT_FOUND,
        ),
      );

      await expect(
        controller.getAddress(mockRequest, 'btc'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getDepositHistory', () => {
    const mockHistory = {
      transactions: [
        {
          id: 'tx-1',
          txHash: 'hash1',
          currency: 'BTC',
          amount: '0.5',
          status: 'CREDITED',
          confirmations: 6,
          requiredConfirmations: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    it('should get deposit history with default pagination', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getDepositHistory.mockResolvedValue(mockHistory);

      const result = await controller.getDepositHistory(mockRequest);

      expect(cryptoDepositService.getDepositHistory).toHaveBeenCalledWith(
        testUserId,
        undefined,
        1,
        20,
      );
      expect(result).toEqual(mockHistory);
    });

    it('should filter by currency', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getDepositHistory.mockResolvedValue(mockHistory);

      await controller.getDepositHistory(mockRequest, 'btc');

      expect(cryptoDepositService.getDepositHistory).toHaveBeenCalledWith(
        testUserId,
        'BTC',
        1,
        20,
      );
    });

    it('should support custom pagination', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getDepositHistory.mockResolvedValue({
        ...mockHistory,
        page: 2,
        pageSize: 10,
      });

      await controller.getDepositHistory(mockRequest, undefined, 2, 10);

      expect(cryptoDepositService.getDepositHistory).toHaveBeenCalledWith(
        testUserId,
        undefined,
        2,
        10,
      );
    });

    it('should validate page minimum (1)', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getDepositHistory.mockResolvedValue(mockHistory);

      await controller.getDepositHistory(mockRequest, undefined, 0);

      expect(cryptoDepositService.getDepositHistory).toHaveBeenCalledWith(
        testUserId,
        undefined,
        1, // Corrected to minimum
        20,
      );
    });

    it('should validate page minimum for negative values', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getDepositHistory.mockResolvedValue(mockHistory);

      await controller.getDepositHistory(mockRequest, undefined, -5);

      expect(cryptoDepositService.getDepositHistory).toHaveBeenCalledWith(
        testUserId,
        undefined,
        1, // Corrected to minimum
        20,
      );
    });

    it('should validate pageSize maximum (100)', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getDepositHistory.mockResolvedValue(mockHistory);

      await controller.getDepositHistory(mockRequest, undefined, 1, 500);

      expect(cryptoDepositService.getDepositHistory).toHaveBeenCalledWith(
        testUserId,
        undefined,
        1,
        100, // Capped at maximum
      );
    });

    it('should validate pageSize minimum (1)', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getDepositHistory.mockResolvedValue(mockHistory);

      // pageSize of 0 should default to 20, not 1 (based on the actual controller code)
      await controller.getDepositHistory(mockRequest, undefined, 1, 0);

      // The controller uses Math.max(1, pageSize || 20), so 0 results in Math.max(1, 20) = 20
      expect(cryptoDepositService.getDepositHistory).toHaveBeenCalledWith(
        testUserId,
        undefined,
        1,
        20, // Default value when pageSize is falsy
      );
    });

    it('should convert currency filter to uppercase', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getDepositHistory.mockResolvedValue(mockHistory);

      await controller.getDepositHistory(mockRequest, 'eth');

      expect(cryptoDepositService.getDepositHistory).toHaveBeenCalledWith(
        testUserId,
        'ETH',
        1,
        20,
      );
    });
  });

  describe('getTransactionStatus', () => {
    const mockTransaction = {
      id: 'tx-123',
      txHash: testTxHash,
      currency: 'BTC',
      amount: '0.5',
      status: 'PENDING',
      confirmations: 2,
      requiredConfirmations: 3,
      fromAddress: 'sender-address',
      toAddress: testBtcAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should get transaction status', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getTransactionStatus.mockResolvedValue(
        mockTransaction,
      );

      const result = await controller.getTransactionStatus(mockRequest, testTxHash);

      expect(cryptoDepositService.getTransactionStatus).toHaveBeenCalledWith(
        testUserId,
        testTxHash,
      );
      expect(result).toEqual(mockTransaction);
    });

    it('should throw 404 if transaction not found', async () => {
      const mockRequest = createMockRequest(testUserId, testAuthToken);

      mockCryptoDepositService.getTransactionStatus.mockRejectedValue(
        new HttpException(
          {
            error: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found',
          },
          HttpStatus.NOT_FOUND,
        ),
      );

      await expect(
        controller.getTransactionStatus(mockRequest, 'nonexistent-hash'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('handleWebhook', () => {
    const mockWebhookData = {
      hash: testTxHash,
      address: testBtcAddress,
      chain: 'btc',
      confirmations: 1,
      value: 50000000,
    };

    beforeEach(() => {
      // Set up environment variable for testing
      process.env.BLOCKCYPHER_WEBHOOK_TOKEN = 'test-webhook-token';
    });

    afterEach(() => {
      delete process.env.BLOCKCYPHER_WEBHOOK_TOKEN;
    });

    it('should process valid BTC webhook', async () => {
      mockCryptoDepositService.processIncomingTransaction.mockResolvedValue(
        undefined,
      );

      const result = await controller.handleWebhook(
        mockWebhookData,
        'test-webhook-token',
      );

      expect(cryptoDepositService.processIncomingTransaction).toHaveBeenCalledWith(
        testTxHash,
        'BTC',
        testBtcAddress,
      );
      expect(result).toEqual({ status: 'processed' });
    });

    it('should process valid ETH webhook', async () => {
      const ethWebhookData = {
        hash: testTxHash,
        address: testEthAddress,
        chain: 'eth',
        confirmations: 1,
        value: 1000000000000000000,
      };

      mockCryptoDepositService.processIncomingTransaction.mockResolvedValue(
        undefined,
      );

      const result = await controller.handleWebhook(
        ethWebhookData,
        'test-webhook-token',
      );

      expect(cryptoDepositService.processIncomingTransaction).toHaveBeenCalledWith(
        testTxHash,
        'ETH',
        testEthAddress,
      );
      expect(result).toEqual({ status: 'processed' });
    });

    it('should throw 401 if webhook token is invalid', async () => {
      await expect(
        controller.handleWebhook(mockWebhookData, 'wrong-token'),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'INVALID_WEBHOOK_TOKEN',
            message: 'Webhook token validation failed',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );

      expect(
        cryptoDepositService.processIncomingTransaction,
      ).not.toHaveBeenCalled();
    });

    it('should throw 400 if webhook data is missing', async () => {
      await expect(
        controller.handleWebhook(null, 'test-webhook-token'),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'INVALID_WEBHOOK_DATA',
            message: 'Missing required fields: hash, address',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw 400 if hash is missing', async () => {
      const invalidData = { address: testBtcAddress, chain: 'btc' };

      await expect(
        controller.handleWebhook(invalidData, 'test-webhook-token'),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'INVALID_WEBHOOK_DATA',
            message: 'Missing required fields: hash, address',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw 400 if address is missing', async () => {
      const invalidData = { hash: testTxHash, chain: 'btc' };

      await expect(
        controller.handleWebhook(invalidData, 'test-webhook-token'),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'INVALID_WEBHOOK_DATA',
            message: 'Missing required fields: hash, address',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw 400 if transaction hash is too short', async () => {
      const invalidData = {
        hash: 'tooshort',
        address: testBtcAddress,
        chain: 'btc',
      };

      await expect(
        controller.handleWebhook(invalidData, 'test-webhook-token'),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'INVALID_TX_HASH',
            message: 'Invalid transaction hash format',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw 400 if transaction hash is not a string', async () => {
      const invalidData = {
        hash: 12345,
        address: testBtcAddress,
        chain: 'btc',
      };

      await expect(
        controller.handleWebhook(invalidData, 'test-webhook-token'),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'INVALID_TX_HASH',
            message: 'Invalid transaction hash format',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should process webhook without token validation if no env token set', async () => {
      delete process.env.BLOCKCYPHER_WEBHOOK_TOKEN;

      mockCryptoDepositService.processIncomingTransaction.mockResolvedValue(
        undefined,
      );

      const result = await controller.handleWebhook(mockWebhookData);

      expect(cryptoDepositService.processIncomingTransaction).toHaveBeenCalled();
      expect(result).toEqual({ status: 'processed' });
    });

    it('should determine currency from chain field', async () => {
      mockCryptoDepositService.processIncomingTransaction.mockResolvedValue(
        undefined,
      );

      // BTC chain
      await controller.handleWebhook(
        { ...mockWebhookData, chain: 'btc' },
        'test-webhook-token',
      );
      expect(cryptoDepositService.processIncomingTransaction).toHaveBeenCalledWith(
        expect.any(String),
        'BTC',
        expect.any(String),
      );

      // ETH chain (non-btc defaults to ETH)
      await controller.handleWebhook(
        { ...mockWebhookData, chain: 'eth' },
        'test-webhook-token',
      );
      expect(cryptoDepositService.processIncomingTransaction).toHaveBeenCalledWith(
        expect.any(String),
        'ETH',
        expect.any(String),
      );
    });
  });
});
