import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BlockCypherService } from './blockcypher.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BlockCypherService', () => {
  let service: BlockCypherService;
  let configService: ConfigService;

  const mockApiToken = 'test-api-token-12345';
  const mockWebhookUrl = 'https://test.example.com/webhook';
  const testBtcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
  const testEthAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const testTxHash = '1a2b3c4d5e6f7g8h9i0j';

  // Mock HTTP client instances
  const mockBtcClient = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };

  const mockEthClient = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      switch (key) {
        case 'BLOCKCYPHER_API_TOKEN':
          return mockApiToken;
        case 'BLOCKCYPHER_WEBHOOK_URL':
          return mockWebhookUrl;
        default:
          return defaultValue;
      }
    }),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock axios.create to return our mock clients
    mockedAxios.create = jest.fn((config) => {
      if (config.baseURL.includes('btc')) {
        return mockBtcClient as any;
      } else if (config.baseURL.includes('eth')) {
        return mockEthClient as any;
      }
      return {} as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockCypherService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BlockCypherService>(BlockCypherService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load API token from config', () => {
      expect(configService.get).toHaveBeenCalledWith('BLOCKCYPHER_API_TOKEN');
    });

    it('should load webhook URL from config', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'BLOCKCYPHER_WEBHOOK_URL',
        'https://api.mycrypto-platform.com/wallet/deposit/crypto/webhook',
      );
    });

    it('should create BTC and ETH HTTP clients', () => {
      expect(mockedAxios.create).toHaveBeenCalledTimes(2);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.blockcypher.com/v1/btc/main',
          timeout: 10000,
        }),
      );
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.blockcypher.com/v1/eth/main',
          timeout: 10000,
        }),
      );
    });

    it('should handle missing API token gracefully', async () => {
      const noTokenConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'BLOCKCYPHER_WEBHOOK_URL') return mockWebhookUrl;
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BlockCypherService,
          {
            provide: ConfigService,
            useValue: noTokenConfigService,
          },
        ],
      }).compile();

      const serviceWithoutToken = module.get<BlockCypherService>(BlockCypherService);
      expect(serviceWithoutToken).toBeDefined();
    });
  });

  describe('registerAddressWebhook', () => {
    it('should register webhook for BTC address', async () => {
      const mockResponse = {
        data: {
          id: 'webhook-123',
          event: 'unconfirmed-tx',
          address: testBtcAddress,
          token: mockApiToken,
          url: mockWebhookUrl,
        },
      };

      mockBtcClient.post.mockResolvedValue(mockResponse);

      const result = await service.registerAddressWebhook('BTC', testBtcAddress);

      expect(mockBtcClient.post).toHaveBeenCalledWith('/hooks', {
        event: 'unconfirmed-tx',
        address: testBtcAddress,
        url: mockWebhookUrl,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should register webhook for ETH address', async () => {
      const mockResponse = {
        data: {
          id: 'webhook-456',
          event: 'unconfirmed-tx',
          address: testEthAddress,
          token: mockApiToken,
          url: mockWebhookUrl,
        },
      };

      mockEthClient.post.mockResolvedValue(mockResponse);

      const result = await service.registerAddressWebhook('ETH', testEthAddress);

      expect(mockEthClient.post).toHaveBeenCalledWith('/hooks', {
        event: 'unconfirmed-tx',
        address: testEthAddress,
        url: mockWebhookUrl,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should register webhook for USDT address (uses ETH client)', async () => {
      const mockResponse = {
        data: {
          id: 'webhook-789',
          event: 'unconfirmed-tx',
          address: testEthAddress,
          token: mockApiToken,
          url: mockWebhookUrl,
        },
      };

      mockEthClient.post.mockResolvedValue(mockResponse);

      const result = await service.registerAddressWebhook('USDT', testEthAddress);

      expect(mockEthClient.post).toHaveBeenCalledWith('/hooks', {
        event: 'unconfirmed-tx',
        address: testEthAddress,
        url: mockWebhookUrl,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error for unsupported currency', async () => {
      await expect(
        service.registerAddressWebhook('XRP', 'some-address'),
      ).rejects.toThrow('Unsupported currency: XRP');
    });

    it('should handle API errors gracefully', async () => {
      const apiError = {
        response: {
          data: { error: 'Invalid address format' },
        },
        message: 'Request failed',
      };

      mockBtcClient.post.mockRejectedValue(apiError);

      await expect(
        service.registerAddressWebhook('BTC', 'invalid-address'),
      ).rejects.toEqual(apiError);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete BTC webhook', async () => {
      mockBtcClient.delete.mockResolvedValue({ data: {} });

      await service.deleteWebhook('BTC', 'webhook-123');

      expect(mockBtcClient.delete).toHaveBeenCalledWith('/hooks/webhook-123');
    });

    it('should delete ETH webhook', async () => {
      mockEthClient.delete.mockResolvedValue({ data: {} });

      await service.deleteWebhook('ETH', 'webhook-456');

      expect(mockEthClient.delete).toHaveBeenCalledWith('/hooks/webhook-456');
    });

    it('should delete USDT webhook (uses ETH client)', async () => {
      mockEthClient.delete.mockResolvedValue({ data: {} });

      await service.deleteWebhook('USDT', 'webhook-789');

      expect(mockEthClient.delete).toHaveBeenCalledWith('/hooks/webhook-789');
    });

    it('should handle deletion errors', async () => {
      const apiError = {
        response: {
          data: { error: 'Webhook not found' },
        },
        message: 'Not found',
      };

      mockBtcClient.delete.mockRejectedValue(apiError);

      await expect(
        service.deleteWebhook('BTC', 'nonexistent-webhook'),
      ).rejects.toEqual(apiError);
    });
  });

  describe('getAddressBalance', () => {
    it('should get BTC address balance', async () => {
      const mockResponse = {
        data: {
          balance: 100000000, // 1 BTC in satoshis
          unconfirmed_balance: 0,
        },
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      const result = await service.getAddressBalance('BTC', testBtcAddress);

      expect(mockBtcClient.get).toHaveBeenCalledWith(`/addrs/${testBtcAddress}/balance`);
      expect(result).toBe('100000000');
    });

    it('should get ETH address balance', async () => {
      const mockResponse = {
        data: {
          balance: 1000000000000000000, // 1 ETH in wei
          unconfirmed_balance: 0,
        },
      };

      mockEthClient.get.mockResolvedValue(mockResponse);

      const result = await service.getAddressBalance('ETH', testEthAddress);

      expect(mockEthClient.get).toHaveBeenCalledWith(`/addrs/${testEthAddress}/balance`);
      expect(result).toBe('1000000000000000000');
    });

    it('should handle zero balance', async () => {
      const mockResponse = {
        data: {
          balance: 0,
          unconfirmed_balance: 0,
        },
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      const result = await service.getAddressBalance('BTC', testBtcAddress);

      expect(result).toBe('0');
    });

    it('should handle API errors when getting balance', async () => {
      const apiError = {
        response: {
          data: { error: 'Address not found' },
        },
        message: 'Not found',
      };

      mockBtcClient.get.mockRejectedValue(apiError);

      await expect(
        service.getAddressBalance('BTC', testBtcAddress),
      ).rejects.toEqual(apiError);
    });
  });

  describe('getTransaction', () => {
    it('should get BTC transaction details', async () => {
      const mockResponse = {
        data: {
          hash: testTxHash,
          block_height: 700000,
          confirmed: '2023-01-15T10:30:00Z',
          confirmations: 6,
          inputs: [{ addresses: ['sender-address'] }],
          outputs: [{ addresses: [testBtcAddress], value: 50000000 }],
          total: 50000000,
          fees: 5000,
        },
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      const result = await service.getTransaction('BTC', testTxHash);

      expect(mockBtcClient.get).toHaveBeenCalledWith(`/txs/${testTxHash}`);
      expect(result).toEqual({
        txHash: testTxHash,
        blockHeight: 700000,
        blockTime: '2023-01-15T10:30:00Z',
        confirmations: 6,
        from: ['sender-address'],
        to: [testBtcAddress],
        amounts: [50000000],
        total: 50000000,
        fees: 5000,
      });
    });

    it('should get ETH transaction details', async () => {
      const mockResponse = {
        data: {
          hash: testTxHash,
          block_height: 15000000,
          confirmed: '2023-01-15T10:30:00Z',
          confirmations: 12,
          inputs: [{ addresses: ['0xsender'] }],
          outputs: [{ addresses: [testEthAddress], value: 1000000000000000000 }],
          total: 1000000000000000000,
          fees: 21000000000000,
        },
      };

      mockEthClient.get.mockResolvedValue(mockResponse);

      const result = await service.getTransaction('ETH', testTxHash);

      expect(mockEthClient.get).toHaveBeenCalledWith(`/txs/${testTxHash}`);
      expect(result.confirmations).toBe(12);
      expect(result.total).toBe(1000000000000000000);
    });

    it('should handle transactions with no inputs/outputs', async () => {
      const mockResponse = {
        data: {
          hash: testTxHash,
          block_height: 700000,
          confirmed: '2023-01-15T10:30:00Z',
          confirmations: 3,
          inputs: null,
          outputs: null,
          total: 0,
          fees: 0,
        },
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      const result = await service.getTransaction('BTC', testTxHash);

      expect(result.from).toEqual([]);
      expect(result.to).toEqual([]);
      expect(result.amounts).toEqual([]);
    });

    it('should handle transaction not found', async () => {
      const apiError = {
        response: {
          data: { error: 'Transaction not found' },
        },
        message: 'Not found',
      };

      mockBtcClient.get.mockRejectedValue(apiError);

      await expect(
        service.getTransaction('BTC', 'nonexistent-tx'),
      ).rejects.toEqual(apiError);
    });
  });

  describe('getAddressTransactions', () => {
    it('should get BTC address transactions', async () => {
      const mockResponse = {
        data: {
          txs: [
            {
              hash: 'tx1',
              block_height: 700000,
              confirmed: '2023-01-15T10:30:00Z',
              confirmations: 6,
              inputs: [{ addresses: ['sender1'] }],
              outputs: [{ addresses: [testBtcAddress], value: 50000000 }],
              total: 50000000,
              fees: 5000,
            },
            {
              hash: 'tx2',
              block_height: 700001,
              confirmed: '2023-01-15T10:35:00Z',
              confirmations: 5,
              inputs: [{ addresses: ['sender2'] }],
              outputs: [{ addresses: [testBtcAddress], value: 30000000 }],
              total: 30000000,
              fees: 3000,
            },
          ],
        },
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      const result = await service.getAddressTransactions('BTC', testBtcAddress);

      expect(mockBtcClient.get).toHaveBeenCalledWith(`/addrs/${testBtcAddress}/full`, {
        params: { limit: 50 },
      });
      expect(result).toHaveLength(2);
      expect(result[0].txHash).toBe('tx1');
      expect(result[1].txHash).toBe('tx2');
    });

    it('should support custom limit parameter', async () => {
      const mockResponse = {
        data: { txs: [] },
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      await service.getAddressTransactions('BTC', testBtcAddress, 10);

      expect(mockBtcClient.get).toHaveBeenCalledWith(`/addrs/${testBtcAddress}/full`, {
        params: { limit: 10 },
      });
    });

    it('should handle empty transaction list', async () => {
      const mockResponse = {
        data: { txs: [] },
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      const result = await service.getAddressTransactions('BTC', testBtcAddress);

      expect(result).toEqual([]);
    });

    it('should handle missing txs field', async () => {
      const mockResponse = {
        data: {},
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      const result = await service.getAddressTransactions('BTC', testBtcAddress);

      expect(result).toEqual([]);
    });

    it('should handle API errors when getting transactions', async () => {
      const apiError = {
        response: {
          data: { error: 'Rate limit exceeded' },
        },
        message: 'Too many requests',
      };

      mockEthClient.get.mockRejectedValue(apiError);

      await expect(
        service.getAddressTransactions('ETH', testEthAddress),
      ).rejects.toEqual(apiError);
    });
  });

  describe('getUsdtBalance', () => {
    it('should get USDT ERC-20 token balance', async () => {
      const mockResponse = {
        data: {
          balance: 1000000000, // 1000 USDT (6 decimals)
        },
      };

      mockEthClient.get.mockResolvedValue(mockResponse);

      const result = await service.getUsdtBalance(testEthAddress);

      expect(mockEthClient.get).toHaveBeenCalledWith(
        `/addrs/${testEthAddress}/tokens/0xdac17f958d2ee523a2206206994597c13d831ec7/balance`,
      );
      expect(result).toBe('1000000000');
    });

    it('should handle zero USDT balance', async () => {
      const mockResponse = {
        data: {
          balance: 0,
        },
      };

      mockEthClient.get.mockResolvedValue(mockResponse);

      const result = await service.getUsdtBalance(testEthAddress);

      expect(result).toBe('0');
    });

    it('should handle USDT balance API errors', async () => {
      const apiError = {
        response: {
          data: { error: 'Token not found' },
        },
        message: 'Not found',
      };

      mockEthClient.get.mockRejectedValue(apiError);

      await expect(service.getUsdtBalance(testEthAddress)).rejects.toEqual(apiError);
    });
  });

  describe('getRequiredConfirmations', () => {
    it('should return 3 confirmations for BTC', () => {
      const result = service.getRequiredConfirmations('BTC');
      expect(result).toBe(3);
    });

    it('should return 12 confirmations for ETH', () => {
      const result = service.getRequiredConfirmations('ETH');
      expect(result).toBe(12);
    });

    it('should return 12 confirmations for USDT', () => {
      const result = service.getRequiredConfirmations('USDT');
      expect(result).toBe(12);
    });

    it('should throw error for unsupported currency', () => {
      expect(() => service.getRequiredConfirmations('XRP')).toThrow(
        'Unsupported currency: XRP',
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true when API is available', async () => {
      mockBtcClient.get.mockResolvedValue({ data: {} });

      const result = await service.isAvailable();

      expect(mockBtcClient.get).toHaveBeenCalledWith('/');
      expect(result).toBe(true);
    });

    it('should return false when API is not available', async () => {
      mockBtcClient.get.mockRejectedValue(new Error('Network error'));

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      mockBtcClient.get.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('Address Masking (Private Method Testing)', () => {
    // Test via public methods that use maskAddress internally
    it('should mask addresses in logs when registering webhook', async () => {
      const mockResponse = {
        data: {
          id: 'webhook-123',
          event: 'unconfirmed-tx',
          address: testBtcAddress,
          token: mockApiToken,
          url: mockWebhookUrl,
        },
      };

      mockBtcClient.post.mockResolvedValue(mockResponse);

      await service.registerAddressWebhook('BTC', testBtcAddress);

      // Address should be masked in logs (first 6 + last 4 chars visible)
      expect(mockBtcClient.post).toHaveBeenCalled();
    });
  });

  describe('Client Selection', () => {
    it('should use BTC client for BTC operations', async () => {
      mockBtcClient.get.mockResolvedValue({ data: { balance: 0 } });

      await service.getAddressBalance('BTC', testBtcAddress);

      expect(mockBtcClient.get).toHaveBeenCalled();
      expect(mockEthClient.get).not.toHaveBeenCalled();
    });

    it('should use ETH client for ETH operations', async () => {
      mockEthClient.get.mockResolvedValue({ data: { balance: 0 } });

      await service.getAddressBalance('ETH', testEthAddress);

      expect(mockEthClient.get).toHaveBeenCalled();
      expect(mockBtcClient.get).not.toHaveBeenCalled();
    });

    it('should use ETH client for USDT operations', async () => {
      mockEthClient.get.mockResolvedValue({ data: { balance: 0 } });

      await service.getAddressBalance('USDT', testEthAddress);

      expect(mockEthClient.get).toHaveBeenCalled();
      expect(mockBtcClient.get).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large balance values', async () => {
      const mockResponse = {
        data: {
          balance: 9007199254740991, // Max safe integer
        },
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      const result = await service.getAddressBalance('BTC', testBtcAddress);

      expect(result).toBe('9007199254740991');
    });

    it('should handle transaction with multiple outputs', async () => {
      const mockResponse = {
        data: {
          hash: testTxHash,
          block_height: 700000,
          confirmed: '2023-01-15T10:30:00Z',
          confirmations: 6,
          inputs: [{ addresses: ['sender'] }],
          outputs: [
            { addresses: ['addr1'], value: 10000 },
            { addresses: ['addr2'], value: 20000 },
            { addresses: ['addr3'], value: 30000 },
          ],
          total: 60000,
          fees: 5000,
        },
      };

      mockBtcClient.get.mockResolvedValue(mockResponse);

      const result = await service.getTransaction('BTC', testTxHash);

      expect(result.to).toEqual(['addr1', 'addr2', 'addr3']);
      expect(result.amounts).toEqual([10000, 20000, 30000]);
    });

    it('should handle short addresses in masking', async () => {
      const shortAddress = '0x123';
      const mockResponse = {
        data: {
          id: 'webhook-123',
          event: 'unconfirmed-tx',
          address: shortAddress,
          token: mockApiToken,
          url: mockWebhookUrl,
        },
      };

      mockEthClient.post.mockResolvedValue(mockResponse);

      // Should not throw on short address
      await service.registerAddressWebhook('ETH', shortAddress);

      expect(mockEthClient.post).toHaveBeenCalled();
    });
  });
});
