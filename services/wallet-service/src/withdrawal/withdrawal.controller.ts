import {
  Controller,
  Post,
  Get,
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
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalRequestDto, WithdrawalResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

/**
 * WithdrawalController
 * Handles TRY withdrawal endpoints
 */
@ApiTags('Withdrawals')
@ApiBearerAuth()
@Controller('api/v1/wallet/withdraw')
@UseGuards(JwtAuthGuard)
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  /**
   * Create TRY withdrawal request
   * POST /api/v1/wallet/withdraw/try
   */
  @Post('try')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute (prevents 2FA brute force)
  @ApiOperation({
    summary: 'Create TRY withdrawal request',
    description: 'Initiates a TRY withdrawal to a verified bank account. Requires 2FA verification. Balance is locked until withdrawal is processed or cancelled. Rate limited to 5 requests per minute.',
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal request created successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid amount, insufficient balance, or daily limit reached',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token, or invalid 2FA code',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Fiat account not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - Rate limit exceeded (5 requests per minute)',
  })
  async createWithdrawalRequest(
    @Request() req,
    @Body() dto: CreateWithdrawalRequestDto,
  ): Promise<{ success: boolean; data: WithdrawalResponseDto; meta: any }> {
    const userId = req.user.userId;
    const withdrawal = await this.withdrawalService.createWithdrawalRequest(userId, dto);

    return {
      success: true,
      data: withdrawal,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }

  /**
   * Get withdrawal request by ID
   * GET /api/v1/wallet/withdraw/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get withdrawal request status',
    description: 'Retrieves the current status and details of a withdrawal request',
  })
  @ApiParam({
    name: 'id',
    description: 'Withdrawal request ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request found',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Withdrawal request not found',
  })
  async getWithdrawalRequest(
    @Request() req,
    @Param('id') withdrawalId: string,
  ): Promise<{ success: boolean; data: WithdrawalResponseDto; meta: any }> {
    const userId = req.user.userId;
    const withdrawal = await this.withdrawalService.getWithdrawalRequest(userId, withdrawalId);

    return {
      success: true,
      data: withdrawal,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }

  /**
   * Cancel pending withdrawal request
   * POST /api/v1/wallet/withdraw/:id/cancel
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel pending withdrawal request',
    description: 'Cancels a pending withdrawal and unlocks the balance. Only PENDING withdrawals can be cancelled.',
  })
  @ApiParam({
    name: 'id',
    description: 'Withdrawal request ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request cancelled successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Withdrawal request not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Withdrawal cannot be cancelled (not in PENDING status)',
  })
  async cancelWithdrawalRequest(
    @Request() req,
    @Param('id') withdrawalId: string,
  ): Promise<{ success: boolean; data: WithdrawalResponseDto; meta: any }> {
    const userId = req.user.userId;
    const withdrawal = await this.withdrawalService.cancelWithdrawalRequest(userId, withdrawalId);

    return {
      success: true,
      data: withdrawal,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }
}
