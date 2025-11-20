import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FiatAccount } from '../wallet/entities/fiat-account.entity';
import { DepositRequest } from './entities/deposit-request.entity';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { CreateDepositRequestDto } from './dto/create-deposit-request.dto';
import { BankAccountResponseDto } from './dto/bank-account-response.dto';
import { DepositResponseDto, DepositStatusResponseDto } from './dto/deposit-response.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * DepositService
 * Handles TRY deposit operations including bank account management and deposit requests
 */
@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);
  private readonly virtualIban: string;
  private readonly minDeposit: number;
  private readonly maxDeposit: number;

  constructor(
    @InjectRepository(FiatAccount)
    private readonly fiatAccountRepository: Repository<FiatAccount>,
    @InjectRepository(DepositRequest)
    private readonly depositRequestRepository: Repository<DepositRequest>,
    private readonly configService: ConfigService,
  ) {
    // Load configuration
    this.virtualIban = this.configService.get<string>('VIRTUAL_IBAN', 'TR330006100519786457841326');
    this.minDeposit = this.configService.get<number>('TRY_MIN_DEPOSIT', 100);
    this.maxDeposit = this.configService.get<number>('TRY_MAX_DEPOSIT', 50000);
  }

  /**
   * Add a new bank account for the user
   * @param userId User ID from JWT
   * @param dto Bank account details
   * @returns Created bank account
   */
  async addBankAccount(
    userId: string,
    dto: AddBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    const traceId = uuidv4();

    this.logger.log({
      message: 'Adding bank account',
      trace_id: traceId,
      user_id: userId,
      iban: this.maskIban(dto.iban),
    });

    try {
      // TODO: Verify account holder name matches KYC name from auth-service
      // For now, we'll accept any name, but this should be validated against KYC data

      // Check if IBAN already exists for this user
      const existingAccount = await this.fiatAccountRepository.findOne({
        where: {
          userId,
          iban: dto.iban,
        },
      });

      if (existingAccount) {
        this.logger.warn({
          message: 'Duplicate IBAN attempted',
          trace_id: traceId,
          user_id: userId,
          iban: this.maskIban(dto.iban),
        });
        throw new ConflictException({
          error: 'DUPLICATE_IBAN',
          message: 'This IBAN is already registered to your account',
        });
      }

      // Create new bank account
      const bankAccount = this.fiatAccountRepository.create({
        userId,
        accountHolderName: dto.accountHolderName,
        iban: dto.iban,
        bankName: dto.bankName,
        isVerified: false, // Will be verified during first successful deposit
      });

      const saved = await this.fiatAccountRepository.save(bankAccount);

      this.logger.log({
        message: 'Bank account added successfully',
        trace_id: traceId,
        user_id: userId,
        account_id: saved.id,
      });

      return this.mapToAccountResponse(saved);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error({
        message: 'Failed to add bank account',
        trace_id: traceId,
        user_id: userId,
        error: error.message,
      });

      throw new BadRequestException({
        error: 'ADD_BANK_ACCOUNT_FAILED',
        message: 'Failed to add bank account',
      });
    }
  }

  /**
   * Get all bank accounts for the user
   * @param userId User ID from JWT
   * @returns List of user's bank accounts
   */
  async getUserBankAccounts(userId: string): Promise<BankAccountResponseDto[]> {
    this.logger.log({
      message: 'Fetching user bank accounts',
      user_id: userId,
    });

    try {
      const accounts = await this.fiatAccountRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      return accounts.map(account => this.mapToAccountResponse(account));
    } catch (error) {
      this.logger.error({
        message: 'Failed to fetch bank accounts',
        user_id: userId,
        error: error.message,
      });

      throw new BadRequestException({
        error: 'FETCH_ACCOUNTS_FAILED',
        message: 'Failed to fetch bank accounts',
      });
    }
  }

  /**
   * Remove a bank account
   * @param userId User ID from JWT
   * @param accountId Bank account ID to remove
   */
  async removeBankAccount(userId: string, accountId: string): Promise<void> {
    const traceId = uuidv4();

    this.logger.log({
      message: 'Removing bank account',
      trace_id: traceId,
      user_id: userId,
      account_id: accountId,
    });

    try {
      const account = await this.fiatAccountRepository.findOne({
        where: {
          id: accountId,
          userId,
        },
      });

      if (!account) {
        throw new NotFoundException({
          error: 'ACCOUNT_NOT_FOUND',
          message: 'Bank account not found',
        });
      }

      // Check if there are any pending deposits using this account
      const pendingDeposits = await this.depositRequestRepository.count({
        where: {
          fiatAccountId: accountId,
          status: 'PENDING',
        },
      });

      if (pendingDeposits > 0) {
        throw new BadRequestException({
          error: 'ACCOUNT_HAS_PENDING_DEPOSITS',
          message: 'Cannot remove account with pending deposits',
        });
      }

      await this.fiatAccountRepository.remove(account);

      this.logger.log({
        message: 'Bank account removed successfully',
        trace_id: traceId,
        user_id: userId,
        account_id: accountId,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error({
        message: 'Failed to remove bank account',
        trace_id: traceId,
        user_id: userId,
        account_id: accountId,
        error: error.message,
      });

      throw new BadRequestException({
        error: 'REMOVE_ACCOUNT_FAILED',
        message: 'Failed to remove bank account',
      });
    }
  }

  /**
   * Create a new TRY deposit request
   * @param userId User ID from JWT
   * @param dto Deposit request details
   * @returns Deposit request with virtual IBAN and reference code
   */
  async createDepositRequest(
    userId: string,
    dto: CreateDepositRequestDto,
  ): Promise<DepositResponseDto> {
    const traceId = uuidv4();

    this.logger.log({
      message: 'Creating deposit request',
      trace_id: traceId,
      user_id: userId,
      amount: dto.amount,
      fiat_account_id: dto.fiatAccountId,
    });

    try {
      // Validate amount limits
      if (dto.amount < this.minDeposit || dto.amount > this.maxDeposit) {
        throw new BadRequestException({
          error: 'INVALID_AMOUNT',
          message: `Deposit amount must be between ${this.minDeposit} and ${this.maxDeposit} TRY`,
        });
      }

      // Verify the bank account exists and belongs to the user
      const bankAccount = await this.fiatAccountRepository.findOne({
        where: {
          id: dto.fiatAccountId,
          userId,
        },
      });

      if (!bankAccount) {
        throw new NotFoundException({
          error: 'BANK_ACCOUNT_NOT_FOUND',
          message: 'Bank account not found',
        });
      }

      // TODO: Check daily deposit limit
      // This should sum up all deposits for the user today and ensure it doesn't exceed 50,000 TRY

      // Generate unique reference code
      const reference = this.generateReferenceCode();

      // Create deposit request
      const depositRequest = this.depositRequestRepository.create({
        userId,
        currency: 'TRY',
        amount: dto.amount.toFixed(2),
        status: 'PENDING',
        fiatAccountId: dto.fiatAccountId,
        transactionReference: reference,
      });

      const saved = await this.depositRequestRepository.save(depositRequest);

      // Calculate expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      this.logger.log({
        message: 'Deposit request created successfully',
        trace_id: traceId,
        user_id: userId,
        deposit_id: saved.id,
        reference,
      });

      // TODO: Send notification to admin about new deposit request
      // This should be done via RabbitMQ or notification service

      return {
        depositId: saved.id,
        amount: saved.amount,
        virtualIban: this.virtualIban,
        reference,
        status: saved.status,
        expiresAt: expiresAt.toISOString(),
        createdAt: saved.createdAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error({
        message: 'Failed to create deposit request',
        trace_id: traceId,
        user_id: userId,
        error: error.message,
      });

      throw new BadRequestException({
        error: 'CREATE_DEPOSIT_FAILED',
        message: 'Failed to create deposit request',
      });
    }
  }

  /**
   * Get deposit request status
   * @param userId User ID from JWT
   * @param depositId Deposit request ID
   * @returns Deposit request details
   */
  async getDepositRequest(
    userId: string,
    depositId: string,
  ): Promise<DepositStatusResponseDto> {
    this.logger.log({
      message: 'Fetching deposit request',
      user_id: userId,
      deposit_id: depositId,
    });

    try {
      const deposit = await this.depositRequestRepository.findOne({
        where: {
          id: depositId,
          userId,
        },
      });

      if (!deposit) {
        throw new NotFoundException({
          error: 'DEPOSIT_NOT_FOUND',
          message: 'Deposit request not found',
        });
      }

      return {
        depositId: deposit.id,
        userId: deposit.userId,
        amount: deposit.amount,
        currency: deposit.currency,
        status: deposit.status,
        transactionReference: deposit.transactionReference,
        adminNotes: deposit.adminNotes,
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt,
        completedAt: deposit.completedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error({
        message: 'Failed to fetch deposit request',
        user_id: userId,
        deposit_id: depositId,
        error: error.message,
      });

      throw new BadRequestException({
        error: 'FETCH_DEPOSIT_FAILED',
        message: 'Failed to fetch deposit request',
      });
    }
  }

  /**
   * Approve a deposit request (for admin use)
   * This will be called by admin panel in the future
   * @param depositId Deposit request ID
   * @param adminId Admin user ID
   * @returns Updated deposit request
   */
  async approveDeposit(
    depositId: string,
    adminId: string,
  ): Promise<DepositStatusResponseDto> {
    const traceId = uuidv4();

    this.logger.log({
      message: 'Approving deposit request',
      trace_id: traceId,
      deposit_id: depositId,
      admin_id: adminId,
    });

    try {
      const deposit = await this.depositRequestRepository.findOne({
        where: { id: depositId },
      });

      if (!deposit) {
        throw new NotFoundException({
          error: 'DEPOSIT_NOT_FOUND',
          message: 'Deposit request not found',
        });
      }

      if (deposit.status !== 'PENDING') {
        throw new BadRequestException({
          error: 'INVALID_STATUS',
          message: 'Only pending deposits can be approved',
        });
      }

      // Update deposit status
      deposit.status = 'APPROVED';
      deposit.completedAt = new Date();
      deposit.adminNotes = `Approved by admin ${adminId}`;

      const saved = await this.depositRequestRepository.save(deposit);

      // TODO: Create ledger entry and update wallet balance
      // This should be done via LedgerService

      // TODO: Send notification to user about successful deposit
      // This should be done via notification service

      this.logger.log({
        message: 'Deposit approved successfully',
        trace_id: traceId,
        deposit_id: depositId,
        user_id: deposit.userId,
        amount: deposit.amount,
      });

      return {
        depositId: saved.id,
        userId: saved.userId,
        amount: saved.amount,
        currency: saved.currency,
        status: saved.status,
        transactionReference: saved.transactionReference,
        adminNotes: saved.adminNotes,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        completedAt: saved.completedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error({
        message: 'Failed to approve deposit',
        trace_id: traceId,
        deposit_id: depositId,
        error: error.message,
      });

      throw new BadRequestException({
        error: 'APPROVE_DEPOSIT_FAILED',
        message: 'Failed to approve deposit',
      });
    }
  }

  /**
   * Get all deposit requests for a user
   * @param userId User ID from JWT
   * @returns Array of deposit requests
   */
  async getUserDepositRequests(userId: string): Promise<DepositStatusResponseDto[]> {
    const traceId = uuidv4();

    this.logger.log({
      message: 'Getting user deposit requests',
      trace_id: traceId,
      user_id: userId,
    });

    try {
      const requests = await this.depositRequestRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      this.logger.log({
        message: 'Retrieved deposit requests successfully',
        trace_id: traceId,
        user_id: userId,
        count: requests.length,
      });

      return requests.map((req) => ({
        depositId: req.id,
        userId: req.userId,
        amount: req.amount,
        currency: req.currency,
        transactionReference: req.transactionReference,
        status: req.status,
        adminNotes: req.adminNotes,
        receiptUrl: req.receiptUrl,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
        completedAt: req.completedAt,
      }));
    } catch (error) {
      this.logger.error({
        message: 'Failed to retrieve deposit requests',
        trace_id: traceId,
        user_id: userId,
        error: error.message,
      });

      throw new BadRequestException({
        error: 'GET_DEPOSITS_FAILED',
        message: 'Failed to retrieve deposit requests',
      });
    }
  }

  /**
   * Generate unique reference code for deposit
   * Format: DEP-YYYYMMDD-XXXXXX
   */
  private generateReferenceCode(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DEP-${dateStr}-${randomStr}`;
  }

  /**
   * Mask IBAN for logging (show only first 6 and last 4 characters)
   */
  private maskIban(iban: string): string {
    if (iban.length <= 10) return iban;
    const start = iban.substring(0, 6);
    const end = iban.substring(iban.length - 4);
    const masked = '*'.repeat(iban.length - 10);
    return `${start}${masked}${end}`;
  }

  /**
   * Map FiatAccount entity to response DTO
   */
  private mapToAccountResponse(account: FiatAccount): BankAccountResponseDto {
    return {
      id: account.id,
      accountHolderName: account.accountHolderName,
      iban: account.iban,
      bankName: account.bankName,
      isVerified: account.isVerified,
      verifiedAt: account.verifiedAt,
      createdAt: account.createdAt,
    };
  }
}
