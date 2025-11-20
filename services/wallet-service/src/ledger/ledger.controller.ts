import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { TransactionQueryDto, TransactionResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

/**
 * LedgerController
 * Handles transaction history endpoints
 */
@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('api/v1/wallet/transactions')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  /**
   * Get user's transaction history
   * GET /api/v1/wallet/transactions
   */
  @Get()
  @ApiOperation({
    summary: 'Get transaction history',
    description: 'Retrieves user\'s transaction history with optional filters and pagination. Returns deposits, withdrawals, trades, fees, and refunds.',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    description: 'Filter by currency',
    example: 'TRY',
    enum: ['TRY', 'BTC', 'ETH', 'USDT'],
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by transaction type',
    example: 'DEPOSIT',
    enum: ['DEPOSIT', 'WITHDRAWAL', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'REFUND', 'ADMIN_ADJUSTMENT'],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO 8601 format)',
    example: '2025-11-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO 8601 format)',
    example: '2025-11-30T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-indexed)',
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (max 100)',
    example: 20,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getTransactions(
    @Request() req,
    @Query() query: TransactionQueryDto,
  ): Promise<{ success: boolean; data: TransactionResponseDto; meta: any }> {
    const userId = req.user.userId;
    const transactions = await this.ledgerService.getUserTransactions(userId, query);

    return {
      success: true,
      data: transactions,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }
}
