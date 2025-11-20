import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DepositService } from './deposit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { CreateDepositRequestDto } from './dto/create-deposit-request.dto';
import { BankAccountResponseDto } from './dto/bank-account-response.dto';
import { DepositResponseDto, DepositStatusResponseDto } from './dto/deposit-response.dto';

/**
 * DepositController
 * Handles TRY deposit operations including bank account management
 */
@ApiTags('Deposit')
@Controller('api/v1/wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  /**
   * Add a new bank account
   * POST /api/v1/wallet/bank-accounts
   */
  @Post('bank-accounts')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Add bank account',
    description: 'Add a new bank account for TRY deposits. Account holder name must match KYC name.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bank account added successfully',
    type: BankAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or validation failed',
    schema: {
      example: {
        error: 'INVALID_IBAN',
        message: 'IBAN must be in Turkish format (TR followed by 24 digits)',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - IBAN already registered',
    schema: {
      example: {
        error: 'DUPLICATE_IBAN',
        message: 'This IBAN is already registered to your account',
      },
    },
  })
  async addBankAccount(
    @Request() req,
    @Body() dto: AddBankAccountDto,
  ): Promise<{
    success: boolean;
    data: BankAccountResponseDto;
    meta: { timestamp: string; request_id: string };
  }> {
    const userId = req.user.userId;
    const data = await this.depositService.addBankAccount(userId, dto);

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown',
      },
    };
  }

  /**
   * Get all bank accounts for the user
   * GET /api/v1/wallet/bank-accounts
   */
  @Get('bank-accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List bank accounts',
    description: 'Get all bank accounts registered for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of bank accounts retrieved successfully',
    type: [BankAccountResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getUserBankAccounts(
    @Request() req,
  ): Promise<{
    success: boolean;
    data: BankAccountResponseDto[];
    meta: { timestamp: string; request_id: string; count: number };
  }> {
    const userId = req.user.userId;
    const data = await this.depositService.getUserBankAccounts(userId);

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown',
        count: data.length,
      },
    };
  }

  /**
   * Remove a bank account
   * DELETE /api/v1/wallet/bank-accounts/:id
   */
  @Delete('bank-accounts/:id')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Remove bank account',
    description: 'Remove a bank account. Cannot remove account with pending deposits.',
  })
  @ApiParam({
    name: 'id',
    description: 'Bank account ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank account removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Bank account removed successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Account has pending deposits',
    schema: {
      example: {
        error: 'ACCOUNT_HAS_PENDING_DEPOSITS',
        message: 'Cannot remove account with pending deposits',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Bank account not found',
    schema: {
      example: {
        error: 'ACCOUNT_NOT_FOUND',
        message: 'Bank account not found',
      },
    },
  })
  async removeBankAccount(
    @Request() req,
    @Param('id') accountId: string,
  ): Promise<{
    success: boolean;
    message: string;
    meta: { timestamp: string; request_id: string };
  }> {
    const userId = req.user.userId;
    await this.depositService.removeBankAccount(userId, accountId);

    return {
      success: true,
      message: 'Bank account removed successfully',
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown',
      },
    };
  }

  /**
   * Create a new TRY deposit request
   * POST /api/v1/wallet/deposit/try
   */
  @Post('deposit/try')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Create TRY deposit request',
    description:
      'Create a new TRY deposit request. Returns virtual IBAN and reference code for bank transfer.',
  })
  @ApiResponse({
    status: 201,
    description: 'Deposit request created successfully',
    type: DepositResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or amount out of range',
    schema: {
      example: {
        error: 'INVALID_AMOUNT',
        message: 'Deposit amount must be between 100 and 50000 TRY',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Bank account not found',
    schema: {
      example: {
        error: 'BANK_ACCOUNT_NOT_FOUND',
        message: 'Bank account not found',
      },
    },
  })
  async createDepositRequest(
    @Request() req,
    @Body() dto: CreateDepositRequestDto,
  ): Promise<{
    success: boolean;
    data: DepositResponseDto;
    meta: { timestamp: string; request_id: string };
  }> {
    const userId = req.user.userId;
    const data = await this.depositService.createDepositRequest(userId, dto);

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown',
      },
    };
  }

  /**
   * Get deposit request status
   * GET /api/v1/wallet/deposit/:id
   */
  @Get('deposit/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get deposit status',
    description: 'Get the current status and details of a deposit request',
  })
  @ApiParam({
    name: 'id',
    description: 'Deposit request ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit request details retrieved successfully',
    type: DepositStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Deposit request not found',
    schema: {
      example: {
        error: 'DEPOSIT_NOT_FOUND',
        message: 'Deposit request not found',
      },
    },
  })
  async getDepositRequest(
    @Request() req,
    @Param('id') depositId: string,
  ): Promise<{
    success: boolean;
    data: DepositStatusResponseDto;
    meta: { timestamp: string; request_id: string };
  }> {
    const userId = req.user.userId;
    const data = await this.depositService.getDepositRequest(userId, depositId);

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown',
      },
    };
  }

  /**
   * Get all deposit requests for the user
   * GET /api/v1/wallet/deposit/requests
   */
  @Get('deposit/requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List deposit requests',
    description: 'Get all deposit requests for the authenticated user with optional status filter',
  })
  @ApiResponse({
    status: 200,
    description: 'List of deposit requests retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          requests: [
            {
              requestId: '550e8400-e29b-41d4-a716-446655440000',
              amount: '1000.00',
              currency: 'TRY',
              referenceCode: 'DEP-20251120-ABC123',
              virtualIban: 'TR330006100519786457841326',
              status: 'PENDING',
              createdAt: '2025-11-20T10:30:45.123Z',
              updatedAt: '2025-11-20T10:30:45.123Z',
            },
          ],
        },
        meta: {
          timestamp: '2025-11-20T10:35:00.000Z',
          request_id: 'req_abc123',
          count: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getUserDepositRequests(
    @Request() req,
  ): Promise<{
    success: boolean;
    data: { requests: DepositStatusResponseDto[] };
    meta: { timestamp: string; request_id: string; count: number };
  }> {
    const userId = req.user.userId;
    const requests = await this.depositService.getUserDepositRequests(userId);

    return {
      success: true,
      data: {
        requests,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown',
        count: requests.length,
      },
    };
  }
}
