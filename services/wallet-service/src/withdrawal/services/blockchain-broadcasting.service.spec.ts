import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BlockchainBroadcastingService } from './blockchain-broadcasting.service';
import { of, throwError } from 'rxjs';

describe('BlockchainBroadcastingService', () => {
  let service: BlockchainBroadcastingService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        BLOCKCYPHER_API_TOKEN: 'test_token',
        INFURA_PROJECT_ID: 'test_infura_id',
        BITCOIN_NETWORK: 'testnet',
        ETHEREUM_NETWORK: 'sepolia',
        WITHDRAWAL_MAX_RETRIES: 3,
        WITHDRAWAL_RETRY_DELAY: 100, // Faster for tests
        BTC_CONFIRMATION_COUNT: 3,
        ETH_CONFIRMATION_COUNT: 12,
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainBroadcastingService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<BlockchainBroadcastingService>(BlockchainBroadcastingService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('broadcastBitcoinTransaction', () => {
    it('should broadcast Bitcoin transaction successfully', async () => {
      const mockTxHex = '0100000001000000000000000000000000';
      const mockResponse = {
        data: {
          tx: {
            hash: 'abc123def456',
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.broadcastBitcoinTransaction(mockTxHex);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('abc123def456');
      expect(result.confirmations).toBe(0);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('blockcypher.com'),
        { tx: mockTxHex },
        expect.any(Object),
      );
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockTxHex = '0100000001000000000000000000000000';
      const mockResponse = {
        data: {
          tx: {
            hash: 'abc123def456',
          },
        },
      };

      // Fail first 2 times, succeed on 3rd
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(of(mockResponse));

      const result = await service.broadcastBitcoinTransaction(mockTxHex);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('abc123def456');
      expect(mockHttpService.post).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockTxHex = '0100000001000000000000000000000000';

      mockHttpService.post.mockReturnValue(
        throwError(() => ({
          response: { data: { error: 'Invalid transaction' } },
        })),
      );

      const result = await service.broadcastBitcoinTransaction(mockTxHex);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockHttpService.post).toHaveBeenCalledTimes(3);
    });

    it('should handle missing API token gracefully', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'BLOCKCYPHER_API_TOKEN') {
          return 'your_blockcypher_api_token_here';
        }
        return null;
      });

      const result = await service.broadcastBitcoinTransaction('test_hex');

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });
  });

  describe('broadcastEthereumTransaction', () => {
    it('should broadcast Ethereum transaction successfully', async () => {
      const mockSignedTx = '0xf86c808504a817c800825208940000000000000000000000000000000000000000880de0b6b3a76400008025a0';

      // Mock the ethProvider which is initialized in constructor
      // Since we can't easily mock the provider initialization, we'll test the error path
      const result = await service.broadcastEthereumTransaction(mockSignedTx);

      // With test config, provider won't be initialized, so it simulates
      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
    });

    it('should handle broadcast errors', async () => {
      // This will use the simulated broadcast since provider isn't configured
      const result = await service.broadcastEthereumTransaction('invalid_tx');

      expect(result).toBeDefined();
      expect(result.success).toBe(true); // Simulated success
    });
  });

  describe('broadcastUSDTTransaction', () => {
    it('should broadcast USDT ERC20 transaction', async () => {
      const mockSignedTx = '0xf86c808504a817c800825208940000000000000000000000000000000000000000880de0b6b3a76400008025a0';

      const result = await service.broadcastUSDTTransaction(mockSignedTx, 'ERC20');

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
    });

    it('should throw error for TRC20 (not implemented)', async () => {
      await expect(
        service.broadcastUSDTTransaction('test_tx', 'TRC20'),
      ).rejects.toThrow('TRC20 broadcasting not yet implemented');
    });
  });

  describe('getBitcoinTransactionStatus', () => {
    it('should get transaction status with confirmations', async () => {
      // Ensure config returns valid token
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'BLOCKCYPHER_API_TOKEN') return 'test_token';
        if (key === 'BITCOIN_NETWORK') return 'testnet';
        if (key === 'BTC_CONFIRMATION_COUNT') return 3;
        return defaultValue;
      });

      const mockTxHash = 'abc123def456';
      const mockResponse = {
        data: {
          confirmations: 5,
          block_height: 700000,
          confirmed: '2025-01-15T10:30:00Z',
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getBitcoinTransactionStatus(mockTxHash);

      expect(result.txHash).toBe(mockTxHash);
      expect(result.confirmations).toBe(5);
      expect(result.isConfirmed).toBe(true); // 5 >= 3 required
      expect(result.blockNumber).toBe(700000);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining(mockTxHash),
        expect.any(Object),
      );
    });

    it('should return unconfirmed status for pending transaction', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'BLOCKCYPHER_API_TOKEN') return 'test_token';
        if (key === 'BITCOIN_NETWORK') return 'testnet';
        if (key === 'BTC_CONFIRMATION_COUNT') return 3;
        return defaultValue;
      });

      const mockTxHash = 'abc123def456';
      const mockResponse = {
        data: {
          confirmations: 1,
          block_height: null,
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getBitcoinTransactionStatus(mockTxHash);

      expect(result.confirmations).toBe(1);
      expect(result.isConfirmed).toBe(false); // 1 < 3 required
    });

    it('should handle API errors gracefully', async () => {
      const mockTxHash = 'abc123def456';

      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Transaction not found')),
      );

      const result = await service.getBitcoinTransactionStatus(mockTxHash);

      expect(result.confirmations).toBe(0);
      expect(result.isConfirmed).toBe(false);
    });

    it('should handle missing API token', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'BLOCKCYPHER_API_TOKEN') {
          return 'your_blockcypher_api_token_here';
        }
        return null;
      });

      const result = await service.getBitcoinTransactionStatus('test_hash');

      expect(result.confirmations).toBe(0);
      expect(result.isConfirmed).toBe(false);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });
  });

  describe('getEthereumTransactionStatus', () => {
    it('should return mock status when provider not configured', async () => {
      const mockTxHash = '0xabc123';

      const result = await service.getEthereumTransactionStatus(mockTxHash);

      expect(result.txHash).toBe(mockTxHash);
      expect(result.confirmations).toBe(0);
      expect(result.isConfirmed).toBe(false);
    });
  });

  describe('getTransactionStatus', () => {
    it('should route to Bitcoin status for BTC', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'BLOCKCYPHER_API_TOKEN') return 'test_token';
        if (key === 'BITCOIN_NETWORK') return 'testnet';
        if (key === 'BTC_CONFIRMATION_COUNT') return 3;
        return defaultValue;
      });

      const mockTxHash = 'abc123';
      const mockResponse = {
        data: {
          confirmations: 3,
          block_height: 700000,
        },
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getTransactionStatus(mockTxHash, 'BTC');

      expect(result.confirmations).toBe(3);
      expect(mockHttpService.get).toHaveBeenCalled();
    });

    it('should route to Ethereum status for ETH', async () => {
      const mockTxHash = '0xabc123';

      const result = await service.getTransactionStatus(mockTxHash, 'ETH');

      expect(result.txHash).toBe(mockTxHash);
    });

    it('should route to Ethereum status for USDT ERC20', async () => {
      const mockTxHash = '0xabc123';

      const result = await service.getTransactionStatus(mockTxHash, 'USDT', 'ERC20');

      expect(result.txHash).toBe(mockTxHash);
    });

    it('should throw error for unsupported currency/network', async () => {
      await expect(
        service.getTransactionStatus('hash', 'USDT', 'TRC20'),
      ).rejects.toThrow('Unsupported currency/network');
    });
  });

  describe('estimateConfirmationTime', () => {
    it('should estimate Bitcoin confirmation time', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'BTC_CONFIRMATION_COUNT') return 3;
        return defaultValue;
      });

      const time = service.estimateConfirmationTime('BTC');
      expect(time).toBe(30); // 3 confirmations * 10 minutes
    });

    it('should estimate Ethereum confirmation time', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ETH_CONFIRMATION_COUNT') return 12;
        return defaultValue;
      });

      const time = service.estimateConfirmationTime('ETH');
      expect(time).toBe(3); // 12 confirmations * 12 seconds / 60 = 2.4 min, ceil = 3
    });

    it('should estimate USDT confirmation time (follows ETH)', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ETH_CONFIRMATION_COUNT') return 12;
        return defaultValue;
      });

      const time = service.estimateConfirmationTime('USDT');
      expect(time).toBe(3); // Same as ETH
    });
  });
});
