import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => {
      if (key === 'NOTIFICATIONS_ENABLED') {
        return false;
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendDepositDetected', () => {
    it('should log deposit detected notification for BTC', async () => {
      const userId = 'user-123';
      const currency = 'BTC';
      const amount = '0.00150000';
      const txHash = 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const confirmations = 1;
      const requiredConfirmations = 3;

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendDepositDetected(
        userId,
        currency,
        amount,
        txHash,
        confirmations,
        requiredConfirmations,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Crypto deposit detected notification',
          type: 'CRYPTO_DEPOSIT_DETECTED',
          userId,
          data: expect.objectContaining({
            currency,
            amount,
            txHash,
            confirmations,
            requiredConfirmations,
          }),
        }),
      );
    });

    it('should log deposit detected notification for ETH', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendDepositDetected(
        'user-456',
        'ETH',
        '0.05000000',
        '0xabc123def456',
        5,
        12,
      );

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should log deposit detected notification for USDT', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendDepositDetected(
        'user-789',
        'USDT',
        '100.00000000',
        '0xdef789ghi012',
        8,
        12,
      );

      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('sendDepositCredited', () => {
    it('should log deposit credited notification with full details', async () => {
      const userId = 'user-123';
      const currency = 'BTC';
      const amount = '0.00150000';
      const txHash =
        'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890';
      const newBalance = '0.10000000';

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendDepositCredited(
        userId,
        currency,
        amount,
        txHash,
        newBalance,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Crypto deposit credited notification',
          type: 'CRYPTO_DEPOSIT_CREDITED',
          userId,
          data: expect.objectContaining({
            currency,
            amount,
            txHash,
            newBalance,
            shortTxHash: expect.any(String),
          }),
        }),
      );
    });

    it('should log deposit credited notification for ETH', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendDepositCredited(
        'user-456',
        'ETH',
        '1.50000000',
        '0xabc123def456ghi789jkl012',
        '5.00000000',
      );

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle short transaction hashes', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendDepositCredited(
        'user-789',
        'USDT',
        '50.00',
        'short',
        '100.00',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shortTxHash: 'short',
          }),
        }),
      );
    });
  });

  describe('sendTryDepositCredited', () => {
    it('should log TRY deposit credited notification', async () => {
      const userId = 'user-123';
      const amount = '1000.00';
      const reference = 'REF-123456';
      const newBalance = '5000.00';

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendTryDepositCredited(
        userId,
        amount,
        reference,
        newBalance,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'TRY deposit credited notification',
          type: 'TRY_DEPOSIT_CREDITED',
          userId,
          data: expect.objectContaining({
            currency: 'TRY',
            amount,
            reference,
            newBalance,
          }),
        }),
      );
    });

    it('should handle large TRY amounts', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendTryDepositCredited(
        'user-456',
        '50000.00',
        'REF-789012',
        '100000.00',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: '50000.00',
            newBalance: '100000.00',
          }),
        }),
      );
    });
  });

  describe('getEstimatedTime', () => {
    it('should calculate BTC confirmation time correctly', () => {
      // BTC: ~10 minutes per block, 2 remaining = 20 minutes
      const result = service['getEstimatedTime']('BTC', 1, 3);
      expect(result).toBe('20 minutes');
    });

    it('should calculate ETH confirmation time correctly', () => {
      // ETH: ~15 seconds per block = 0.25 minutes, 7 remaining = 2 minutes
      const result = service['getEstimatedTime']('ETH', 5, 12);
      expect(result).toBe('2 minutes');
    });

    it('should calculate USDT confirmation time correctly', () => {
      // USDT (ERC-20): ~15 seconds per block, 4 remaining = 1 minute
      const result = service['getEstimatedTime']('USDT', 8, 12);
      expect(result).toBe('1 minutes');
    });

    it('should return "0 minutes" when confirmations >= required', () => {
      const result = service['getEstimatedTime']('BTC', 3, 3);
      expect(result).toBe('0 minutes');
    });

    it('should return "0 minutes" when confirmations > required', () => {
      const result = service['getEstimatedTime']('ETH', 15, 12);
      expect(result).toBe('0 minutes');
    });

    it('should handle hours correctly', () => {
      // BTC: 10 min/block * 100 blocks = 1000 minutes = 16h 40m
      const result = service['getEstimatedTime']('BTC', 0, 100);
      expect(result).toBe('16h 40m');
    });

    it('should handle exact hours', () => {
      // BTC: 10 min/block * 60 blocks = 600 minutes = 10 hours
      const result = service['getEstimatedTime']('BTC', 0, 60);
      expect(result).toBe('10 hours');
    });
  });

  describe('shortenTxHash', () => {
    it('should shorten long transaction hashes', () => {
      const longHash =
        'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890';
      const result = service['shortenTxHash'](longHash);
      // First 8: abc123de, Last 8: z567890 (only 7 chars), so: yz567890
      expect(result).toBe('abc123de...yz567890');
    });

    it('should shorten Ethereum transaction hashes', () => {
      const ethHash =
        '0xabc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890';
      const result = service['shortenTxHash'](ethHash);
      expect(result).toBe('0xabc123...yz567890');
    });

    it('should return short hashes unchanged', () => {
      const shortHash = 'short';
      const result = service['shortenTxHash'](shortHash);
      expect(result).toBe('short');
    });

    it('should handle exactly 16 character hashes (threshold)', () => {
      const exactHash = '1234567890123456';
      const result = service['shortenTxHash'](exactHash);
      // Length 16 is >= 16, so it should shorten
      expect(result).toBe('12345678...90123456');
    });

    it('should handle 15 character hashes (just below threshold)', () => {
      const justBelowHash = '123456789012345';
      const result = service['shortenTxHash'](justBelowHash);
      // Length 15 is < 16, so no shortening
      expect(result).toBe('123456789012345');
    });

    it('should handle empty transaction hash', () => {
      const result = service['shortenTxHash']('');
      expect(result).toBe('');
    });
  });

  describe('Configuration', () => {
    it('should initialize with NOTIFICATIONS_ENABLED from ConfigService', () => {
      // The service was initialized in beforeEach
      // ConfigService.get is called during constructor
      expect(service).toBeDefined();
      // We can verify the private property was set (indirectly) by checking service behavior
      const notificationsEnabled = service['notificationsEnabled'];
      expect(typeof notificationsEnabled).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty userId gracefully', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendDepositDetected('', 'BTC', '0.001', 'txhash', 1, 3);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '',
        }),
      );
    });

    it('should handle zero confirmations', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendDepositDetected(
        'user-123',
        'BTC',
        '0.001',
        'txhash',
        0,
        3,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confirmations: 0,
          }),
        }),
      );
    });

    it('should handle very large amounts', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendDepositCredited(
        'user-123',
        'BTC',
        '1000.00000000',
        'txhash',
        '5000.00000000',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: '1000.00000000',
            newBalance: '5000.00000000',
          }),
        }),
      );
    });

    it('should handle null-like values gracefully', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendTryDepositCredited('user-123', '0', '', '0');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: '0',
            reference: '',
            newBalance: '0',
          }),
        }),
      );
    });
  });
});
