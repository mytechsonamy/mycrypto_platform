import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { LedgerService } from './ledger.service';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { TransactionQueryDto } from './dto';

describe('LedgerService', () => {
  let service: LedgerService;
  let repository: Repository<LedgerEntry>;

  const mockUserId = 'user-123';

  const mockLedgerEntries: LedgerEntry[] = [
    {
      id: 'entry-1',
      userId: mockUserId,
      currency: 'TRY',
      type: 'DEPOSIT',
      amount: '1000.00',
      balanceBefore: '0.00',
      balanceAfter: '1000.00',
      referenceId: 'deposit-1',
      referenceType: 'DEPOSIT_REQUEST',
      description: 'Bank transfer deposit',
      metadata: { bankName: 'Ziraat Bank' },
      createdAt: new Date('2025-11-20T10:00:00Z'),
    },
    {
      id: 'entry-2',
      userId: mockUserId,
      currency: 'TRY',
      type: 'WITHDRAWAL',
      amount: '-500.00',
      balanceBefore: '1000.00',
      balanceAfter: '500.00',
      referenceId: 'withdrawal-1',
      referenceType: 'WITHDRAWAL_REQUEST',
      description: 'Bank transfer withdrawal',
      metadata: { bankName: 'Akbank' },
      createdAt: new Date('2025-11-20T12:00:00Z'),
    },
  ] as LedgerEntry[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        {
          provide: getRepositoryToken(LedgerEntry),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    repository = module.get<Repository<LedgerEntry>>(getRepositoryToken(LedgerEntry));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserTransactions', () => {
    it('should return paginated transactions without filters', async () => {
      const query: TransactionQueryDto = { page: 1, limit: 20 };

      jest.spyOn(repository, 'findAndCount').mockResolvedValueOnce([mockLedgerEntries, 2]);

      const result = await service.getUserTransactions(mockUserId, query);

      expect(result.transactions).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by currency', async () => {
      const query: TransactionQueryDto = { page: 1, limit: 20, currency: 'TRY' };

      jest.spyOn(repository, 'findAndCount').mockResolvedValueOnce([mockLedgerEntries, 2]);

      const result = await service.getUserTransactions(mockUserId, query);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId, currency: 'TRY' }),
        }),
      );
    });

    it('should filter by type', async () => {
      const query: TransactionQueryDto = { page: 1, limit: 20, type: 'DEPOSIT' };

      jest.spyOn(repository, 'findAndCount').mockResolvedValueOnce([[mockLedgerEntries[0]], 1]);

      const result = await service.getUserTransactions(mockUserId, query);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId, type: 'DEPOSIT' }),
        }),
      );
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].type).toBe('DEPOSIT');
    });

    it('should filter by date range (both start and end)', async () => {
      const query: TransactionQueryDto = {
        page: 1,
        limit: 20,
        startDate: '2025-11-20T00:00:00Z',
        endDate: '2025-11-20T23:59:59Z',
      };

      jest.spyOn(repository, 'findAndCount').mockResolvedValueOnce([mockLedgerEntries, 2]);

      await service.getUserTransactions(mockUserId, query);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            createdAt: expect.any(Object), // Between object
          }),
        }),
      );
    });

    it('should filter by start date only', async () => {
      const query: TransactionQueryDto = {
        page: 1,
        limit: 20,
        startDate: '2025-11-20T00:00:00Z',
      };

      jest.spyOn(repository, 'findAndCount').mockResolvedValueOnce([mockLedgerEntries, 2]);

      await service.getUserTransactions(mockUserId, query);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            createdAt: expect.any(Object), // MoreThanOrEqual object
          }),
        }),
      );
    });

    it('should filter by end date only', async () => {
      const query: TransactionQueryDto = {
        page: 1,
        limit: 20,
        endDate: '2025-11-20T23:59:59Z',
      };

      jest.spyOn(repository, 'findAndCount').mockResolvedValueOnce([mockLedgerEntries, 2]);

      await service.getUserTransactions(mockUserId, query);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            createdAt: expect.any(Object), // LessThanOrEqual object
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      const query: TransactionQueryDto = { page: 2, limit: 10 };

      jest.spyOn(repository, 'findAndCount').mockResolvedValueOnce([[], 25]);

      const result = await service.getUserTransactions(mockUserId, query);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * 10
          take: 10,
        }),
      );
    });

    it('should use default pagination values', async () => {
      const query: TransactionQueryDto = {};

      jest.spyOn(repository, 'findAndCount').mockResolvedValueOnce([mockLedgerEntries, 2]);

      const result = await service.getUserTransactions(mockUserId, query);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should return empty array when no transactions found', async () => {
      const query: TransactionQueryDto = { page: 1, limit: 20 };

      jest.spyOn(repository, 'findAndCount').mockResolvedValueOnce([[], 0]);

      const result = await service.getUserTransactions(mockUserId, query);

      expect(result.transactions).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('createLedgerEntry', () => {
    it('should create a ledger entry', async () => {
      const entryData: Partial<LedgerEntry> = {
        userId: mockUserId,
        currency: 'TRY',
        type: 'DEPOSIT',
        amount: '1000.00',
        balanceBefore: '0.00',
        balanceAfter: '1000.00',
        referenceId: 'deposit-1',
        referenceType: 'DEPOSIT_REQUEST',
        description: 'Bank transfer deposit',
      };

      const createdEntry = { id: 'entry-1', ...entryData } as LedgerEntry;

      jest.spyOn(repository, 'create').mockReturnValue(createdEntry);
      jest.spyOn(repository, 'save').mockResolvedValue(createdEntry);

      const result = await service.createLedgerEntry(entryData);

      expect(result).toEqual(createdEntry);
      expect(repository.create).toHaveBeenCalledWith(entryData);
      expect(repository.save).toHaveBeenCalledWith(createdEntry);
    });
  });

  describe('calculateBalanceFromLedger', () => {
    it('should calculate balance from ledger entries', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '1500.50' }),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.calculateBalanceFromLedger(mockUserId, 'TRY');

      expect(result).toBe('1500.50000000');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ledger.userId = :userId', { userId: mockUserId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('ledger.currency = :currency', { currency: 'TRY' });
    });

    it('should return 0 when no entries found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.calculateBalanceFromLedger(mockUserId, 'BTC');

      expect(result).toBe('0.00000000');
    });
  });

  describe('getTransactionCount', () => {
    it('should return transaction count without filters', async () => {
      jest.spyOn(repository, 'count').mockResolvedValue(25);

      const result = await service.getTransactionCount(mockUserId);

      expect(result).toBe(25);
      expect(repository.count).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should return transaction count with currency filter', async () => {
      jest.spyOn(repository, 'count').mockResolvedValue(10);

      const result = await service.getTransactionCount(mockUserId, { currency: 'TRY' });

      expect(result).toBe(10);
      expect(repository.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ userId: mockUserId, currency: 'TRY' }),
      });
    });

    it('should return transaction count with type filter', async () => {
      jest.spyOn(repository, 'count').mockResolvedValue(5);

      const result = await service.getTransactionCount(mockUserId, { type: 'DEPOSIT' });

      expect(result).toBe(5);
      expect(repository.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ userId: mockUserId, type: 'DEPOSIT' }),
      });
    });
  });
});
