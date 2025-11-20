import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import {
  TransactionQueryDto,
  TransactionResponseDto,
  TransactionItemDto,
  PaginationDto,
} from './dto';

/**
 * LedgerService
 * Handles transaction history queries with filtering and pagination
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
  ) {}

  /**
   * Get user's transaction history with filters and pagination
   * @param userId - User ID
   * @param filters - Query filters (currency, type, date range, pagination)
   * @returns Paginated transaction history
   */
  async getUserTransactions(
    userId: string,
    filters: TransactionQueryDto,
  ): Promise<TransactionResponseDto> {
    const traceId = this.generateTraceId();
    this.logger.log({
      message: 'Getting user transactions',
      userId,
      filters,
      trace_id: traceId,
    });

    // Build query conditions
    const whereConditions: any = { userId };

    // Filter by currency
    if (filters.currency) {
      whereConditions.currency = filters.currency.toUpperCase();
    }

    // Filter by type
    if (filters.type) {
      whereConditions.type = filters.type.toUpperCase();
    }

    // Filter by date range
    if (filters.startDate && filters.endDate) {
      whereConditions.createdAt = Between(
        new Date(filters.startDate),
        new Date(filters.endDate),
      );
    } else if (filters.startDate) {
      whereConditions.createdAt = MoreThanOrEqual(new Date(filters.startDate));
    } else if (filters.endDate) {
      whereConditions.createdAt = LessThanOrEqual(new Date(filters.endDate));
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [transactions, total] = await this.ledgerRepository.findAndCount({
      where: whereConditions,
      order: {
        createdAt: 'DESC', // Most recent first
      },
      skip,
      take: limit,
    });

    this.logger.debug({
      message: 'Transactions retrieved',
      userId,
      total,
      page,
      limit,
      trace_id: traceId,
    });

    // Convert to DTOs
    const transactionItems: TransactionItemDto[] = transactions.map(this.toTransactionItemDto);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationDto = {
      page,
      limit,
      total,
      totalPages,
    };

    return {
      transactions: transactionItems,
      pagination,
    };
  }

  /**
   * Create a ledger entry
   * Used by other services (deposit, withdrawal, trading) to record transactions
   * @param data - Ledger entry data
   * @returns Created ledger entry
   */
  async createLedgerEntry(data: Partial<LedgerEntry>): Promise<LedgerEntry> {
    const traceId = this.generateTraceId();
    this.logger.log({
      message: 'Creating ledger entry',
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      trace_id: traceId,
    });

    const ledgerEntry = this.ledgerRepository.create(data);
    const savedEntry = await this.ledgerRepository.save(ledgerEntry);

    this.logger.debug({
      message: 'Ledger entry created',
      id: savedEntry.id,
      userId: data.userId,
      trace_id: traceId,
    });

    return savedEntry;
  }

  /**
   * Get user's balance from ledger entries
   * Calculates balance by summing all ledger entries
   * This is for verification/audit purposes
   * @param userId - User ID
   * @param currency - Currency code
   * @returns Calculated balance
   */
  async calculateBalanceFromLedger(userId: string, currency: string): Promise<string> {
    this.logger.debug({
      message: 'Calculating balance from ledger',
      userId,
      currency,
    });

    const result = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .select('SUM(CAST(ledger.amount AS DECIMAL))', 'total')
      .where('ledger.userId = :userId', { userId })
      .andWhere('ledger.currency = :currency', { currency })
      .getRawOne();

    const balance = result?.total || '0';

    this.logger.debug({
      message: 'Balance calculated from ledger',
      userId,
      currency,
      balance,
    });

    return parseFloat(balance).toFixed(8);
  }

  /**
   * Get transaction count for a user
   * @param userId - User ID
   * @param filters - Optional filters
   * @returns Transaction count
   */
  async getTransactionCount(userId: string, filters?: TransactionQueryDto): Promise<number> {
    const whereConditions: any = { userId };

    if (filters?.currency) {
      whereConditions.currency = filters.currency.toUpperCase();
    }

    if (filters?.type) {
      whereConditions.type = filters.type.toUpperCase();
    }

    if (filters?.startDate && filters?.endDate) {
      whereConditions.createdAt = Between(
        new Date(filters.startDate),
        new Date(filters.endDate),
      );
    } else if (filters?.startDate) {
      whereConditions.createdAt = MoreThanOrEqual(new Date(filters.startDate));
    } else if (filters?.endDate) {
      whereConditions.createdAt = LessThanOrEqual(new Date(filters.endDate));
    }

    return await this.ledgerRepository.count({ where: whereConditions });
  }

  /**
   * Convert ledger entry entity to transaction item DTO
   * @param entry - Ledger entry entity
   * @returns Transaction item DTO
   */
  private toTransactionItemDto(entry: LedgerEntry): TransactionItemDto {
    return {
      id: entry.id,
      currency: entry.currency,
      type: entry.type,
      amount: entry.amount,
      balanceBefore: entry.balanceBefore,
      balanceAfter: entry.balanceAfter,
      referenceId: entry.referenceId,
      referenceType: entry.referenceType,
      description: entry.description,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    };
  }

  /**
   * Generate unique trace ID for logging
   * @returns Trace ID
   */
  private generateTraceId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
