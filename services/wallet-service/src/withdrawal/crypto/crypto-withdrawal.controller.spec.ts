import { Test, TestingModule } from '@nestjs/testing';
import { CryptoWithdrawalController } from './crypto-withdrawal.controller';
import { WithdrawalRequestService } from '../services/withdrawal-request.service';
import { FeeCalculationService } from '../services/fee-calculation.service';
import { CreateCryptoWithdrawalDto } from '../dto/create-crypto-withdrawal.dto';

describe('CryptoWithdrawalController', () => {
  let controller: CryptoWithdrawalController;
  let withdrawalRequestService: WithdrawalRequestService;
  let feeCalculationService: FeeCalculationService;

  const testUserId = 'user-123';
  const testWithdrawalId = 'withdrawal-123';
  const testBtcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

  const mockWithdrawal = {
    id: testWithdrawalId,
    userId: testUserId,
    currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
    destinationAddress: testBtcAddress,
    amount: '0.5',
    networkFee: '0.0005',
    platformFee: '0.0001',
    totalAmount: '0.5006',
    status: 'PENDING' as const,
    transactionHash: null,
    confirmations: 0,
    requiresAdminApproval: false,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockRequest = {
    user: {
      userId: testUserId,
      email: 'user@test.com',
    },
  };

  const mockWithdrawalRequestService = {
    createWithdrawalRequest: jest.fn(),
    getWithdrawalHistory: jest.fn(),
    cancelWithdrawal: jest.fn(),
    getWithdrawal: jest.fn(),
  };

  const mockFeeCalculationService = {
    calculateWithdrawalFees: jest.fn(),
    getMinimumWithdrawal: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CryptoWithdrawalController],
      providers: [
        {
          provide: WithdrawalRequestService,
          useValue: mockWithdrawalRequestService,
        },
        {
          provide: FeeCalculationService,
          useValue: mockFeeCalculationService,
        },
      ],
    }).compile();

    controller = module.get<CryptoWithdrawalController>(CryptoWithdrawalController);
    withdrawalRequestService = module.get<WithdrawalRequestService>(
      WithdrawalRequestService,
    );
    feeCalculationService = module.get<FeeCalculationService>(FeeCalculationService);

    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(withdrawalRequestService).toBeDefined();
      expect(feeCalculationService).toBeDefined();
    });
  });

  describe('createWithdrawal', () => {
    const createWithdrawalDto: CreateCryptoWithdrawalDto = {
      currency: 'BTC' as 'BTC' | 'ETH' | 'USDT',
      amount: '0.5',
      destinationAddress: testBtcAddress,
      twoFaCode: '123456',
      network: undefined,
    };

    it('should create a withdrawal request successfully', async () => {
      mockWithdrawalRequestService.createWithdrawalRequest.mockResolvedValue(
        mockWithdrawal,
      );

      const result = await controller.createWithdrawal(createWithdrawalDto, mockRequest);

      expect(mockWithdrawalRequestService.createWithdrawalRequest).toHaveBeenCalledWith(
        testUserId,
        createWithdrawalDto,
      );
      expect(result).toEqual({
        id: testWithdrawalId,
        currency: 'BTC',
        destinationAddress: testBtcAddress,
        amount: '0.5',
        networkFee: '0.0005',
        platformFee: '0.0001',
        totalAmount: '0.5006',
        status: 'PENDING',
        transactionHash: null,
        confirmations: 0,
        requiresAdminApproval: false,
        createdAt: mockWithdrawal.createdAt,
        updatedAt: mockWithdrawal.updatedAt,
      });
    });

    it('should call service with correct userId from JWT token', async () => {
      mockWithdrawalRequestService.createWithdrawalRequest.mockResolvedValue(
        mockWithdrawal,
      );

      await controller.createWithdrawal(createWithdrawalDto, mockRequest);

      expect(mockWithdrawalRequestService.createWithdrawalRequest).toHaveBeenCalledWith(
        testUserId,
        expect.any(Object),
      );
    });

    it('should handle ETH withdrawal', async () => {
      const ethDto = {
        ...createWithdrawalDto,
        currency: 'ETH' as 'BTC' | 'ETH' | 'USDT',
        destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      };

      const ethWithdrawal = {
        ...mockWithdrawal,
        currency: 'ETH' as 'BTC' | 'ETH' | 'USDT',
        destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      };

      mockWithdrawalRequestService.createWithdrawalRequest.mockResolvedValue(
        ethWithdrawal,
      );

      const result = await controller.createWithdrawal(ethDto, mockRequest);

      expect(result.currency).toBe('ETH');
      expect(result.destinationAddress).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1');
    });

    it('should handle USDT withdrawal with network specified', async () => {
      const usdtDto = {
        ...createWithdrawalDto,
        currency: 'USDT' as 'BTC' | 'ETH' | 'USDT',
        destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        network: 'ERC20',
      };

      const usdtWithdrawal = {
        ...mockWithdrawal,
        currency: 'USDT' as 'BTC' | 'ETH' | 'USDT',
        destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      };

      mockWithdrawalRequestService.createWithdrawalRequest.mockResolvedValue(
        usdtWithdrawal,
      );

      const result = await controller.createWithdrawal(usdtDto, mockRequest);

      expect(result.currency).toBe('USDT');
    });

    it('should propagate service errors', async () => {
      mockWithdrawalRequestService.createWithdrawalRequest.mockRejectedValue(
        new Error('Insufficient balance'),
      );

      await expect(
        controller.createWithdrawal(createWithdrawalDto, mockRequest),
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('getHistory', () => {
    it('should return paginated withdrawal history', async () => {
      const withdrawals = [mockWithdrawal];
      const total = 1;

      mockWithdrawalRequestService.getWithdrawalHistory.mockResolvedValue({
        withdrawals,
        total,
      });

      const result = await controller.getHistory(1, 10, mockRequest);

      expect(mockWithdrawalRequestService.getWithdrawalHistory).toHaveBeenCalledWith(
        testUserId,
        1,
        10,
      );
      expect(result).toEqual({
        withdrawals: [
          {
            id: testWithdrawalId,
            currency: 'BTC',
            destinationAddress: testBtcAddress,
            amount: '0.5',
            networkFee: '0.0005',
            platformFee: '0.0001',
            totalAmount: '0.5006',
            status: 'PENDING',
            transactionHash: null,
            confirmations: 0,
            requiresAdminApproval: false,
            createdAt: mockWithdrawal.createdAt,
            updatedAt: mockWithdrawal.updatedAt,
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should use default pagination values', async () => {
      mockWithdrawalRequestService.getWithdrawalHistory.mockResolvedValue({
        withdrawals: [],
        total: 0,
      });

      await controller.getHistory(undefined, undefined, mockRequest);

      expect(mockWithdrawalRequestService.getWithdrawalHistory).toHaveBeenCalledWith(
        testUserId,
        1,
        10,
      );
    });

    it('should calculate total pages correctly', async () => {
      mockWithdrawalRequestService.getWithdrawalHistory.mockResolvedValue({
        withdrawals: [],
        total: 25,
      });

      const result = await controller.getHistory(1, 10, mockRequest);

      expect(result.totalPages).toBe(3);
    });

    it('should handle multiple pages', async () => {
      mockWithdrawalRequestService.getWithdrawalHistory.mockResolvedValue({
        withdrawals: [],
        total: 50,
      });

      const result = await controller.getHistory(2, 10, mockRequest);

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(5);
    });

    it('should map all withdrawals to response DTOs', async () => {
      const withdrawals = [mockWithdrawal, { ...mockWithdrawal, id: 'withdrawal-456' }];

      mockWithdrawalRequestService.getWithdrawalHistory.mockResolvedValue({
        withdrawals,
        total: 2,
      });

      const result = await controller.getHistory(1, 10, mockRequest);

      expect(result.withdrawals).toHaveLength(2);
      expect(result.withdrawals[0].id).toBe(testWithdrawalId);
      expect(result.withdrawals[1].id).toBe('withdrawal-456');
    });
  });

  describe('getFees', () => {
    it('should return BTC withdrawal fees', async () => {
      const btcFees = {
        networkFee: '0.0005',
        platformFee: '0.0001',
        totalFee: '0.0006',
        estimatedTime: '30 minutes',
      };

      mockFeeCalculationService.getMinimumWithdrawal.mockReturnValue('0.001');
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(btcFees);

      const result = await controller.getFees('BTC');

      expect(mockFeeCalculationService.getMinimumWithdrawal).toHaveBeenCalledWith('BTC');
      expect(mockFeeCalculationService.calculateWithdrawalFees).toHaveBeenCalledWith(
        'BTC',
        '0.001',
      );
      expect(result).toEqual(btcFees);
    });

    it('should return ETH withdrawal fees', async () => {
      const ethFees = {
        networkFee: '0.005',
        platformFee: '0.001',
        totalFee: '0.006',
        estimatedTime: '5 minutes',
      };

      mockFeeCalculationService.getMinimumWithdrawal.mockReturnValue('0.01');
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(ethFees);

      const result = await controller.getFees('ETH');

      expect(mockFeeCalculationService.getMinimumWithdrawal).toHaveBeenCalledWith('ETH');
      expect(mockFeeCalculationService.calculateWithdrawalFees).toHaveBeenCalledWith(
        'ETH',
        '0.01',
      );
      expect(result).toEqual(ethFees);
    });

    it('should return USDT withdrawal fees', async () => {
      const usdtFees = {
        networkFee: '1',
        platformFee: '0.5',
        totalFee: '1.5',
        estimatedTime: '5 minutes',
      };

      mockFeeCalculationService.getMinimumWithdrawal.mockReturnValue('10');
      mockFeeCalculationService.calculateWithdrawalFees.mockResolvedValue(usdtFees);

      const result = await controller.getFees('USDT');

      expect(mockFeeCalculationService.getMinimumWithdrawal).toHaveBeenCalledWith('USDT');
      expect(mockFeeCalculationService.calculateWithdrawalFees).toHaveBeenCalledWith(
        'USDT',
        '10',
      );
      expect(result).toEqual(usdtFees);
    });
  });

  describe('cancelWithdrawal', () => {
    it('should cancel a pending withdrawal', async () => {
      const cancelledWithdrawal = {
        ...mockWithdrawal,
        status: 'CANCELLED' as const,
      };

      mockWithdrawalRequestService.cancelWithdrawal.mockResolvedValue(
        cancelledWithdrawal,
      );

      const result = await controller.cancelWithdrawal(testWithdrawalId, mockRequest);

      expect(mockWithdrawalRequestService.cancelWithdrawal).toHaveBeenCalledWith(
        testUserId,
        testWithdrawalId,
      );
      expect(result.status).toBe('CANCELLED');
    });

    it('should use userId from JWT token', async () => {
      const cancelledWithdrawal = {
        ...mockWithdrawal,
        status: 'CANCELLED' as const,
      };

      mockWithdrawalRequestService.cancelWithdrawal.mockResolvedValue(
        cancelledWithdrawal,
      );

      await controller.cancelWithdrawal(testWithdrawalId, mockRequest);

      expect(mockWithdrawalRequestService.cancelWithdrawal).toHaveBeenCalledWith(
        testUserId,
        expect.any(String),
      );
    });

    it('should propagate service errors', async () => {
      mockWithdrawalRequestService.cancelWithdrawal.mockRejectedValue(
        new Error('Cannot cancel withdrawal with status COMPLETED'),
      );

      await expect(
        controller.cancelWithdrawal(testWithdrawalId, mockRequest),
      ).rejects.toThrow('Cannot cancel withdrawal with status COMPLETED');
    });
  });

  describe('getWithdrawal', () => {
    it('should return withdrawal details by ID', async () => {
      mockWithdrawalRequestService.getWithdrawal.mockResolvedValue(mockWithdrawal);

      const result = await controller.getWithdrawal(testWithdrawalId, mockRequest);

      expect(mockWithdrawalRequestService.getWithdrawal).toHaveBeenCalledWith(
        testUserId,
        testWithdrawalId,
      );
      expect(result).toEqual({
        id: testWithdrawalId,
        currency: 'BTC',
        destinationAddress: testBtcAddress,
        amount: '0.5',
        networkFee: '0.0005',
        platformFee: '0.0001',
        totalAmount: '0.5006',
        status: 'PENDING',
        transactionHash: null,
        confirmations: 0,
        requiresAdminApproval: false,
        createdAt: mockWithdrawal.createdAt,
        updatedAt: mockWithdrawal.updatedAt,
      });
    });

    it('should use userId from JWT token', async () => {
      mockWithdrawalRequestService.getWithdrawal.mockResolvedValue(mockWithdrawal);

      await controller.getWithdrawal(testWithdrawalId, mockRequest);

      expect(mockWithdrawalRequestService.getWithdrawal).toHaveBeenCalledWith(
        testUserId,
        expect.any(String),
      );
    });

    it('should return completed withdrawal with transaction hash', async () => {
      const completedWithdrawal = {
        ...mockWithdrawal,
        status: 'COMPLETED' as const,
        transactionHash: '0x1234567890abcdef',
        confirmations: 6,
      };

      mockWithdrawalRequestService.getWithdrawal.mockResolvedValue(completedWithdrawal);

      const result = await controller.getWithdrawal(testWithdrawalId, mockRequest);

      expect(result.status).toBe('COMPLETED');
      expect(result.transactionHash).toBe('0x1234567890abcdef');
      expect(result.confirmations).toBe(6);
    });

    it('should propagate service errors', async () => {
      mockWithdrawalRequestService.getWithdrawal.mockRejectedValue(
        new Error('Withdrawal not found'),
      );

      await expect(
        controller.getWithdrawal(testWithdrawalId, mockRequest),
      ).rejects.toThrow('Withdrawal not found');
    });
  });
});
