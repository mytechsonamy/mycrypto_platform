import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCryptoWithdrawalDto } from '../dto/create-crypto-withdrawal.dto';
import {
  CryptoWithdrawalResponseDto,
  CryptoWithdrawalHistoryDto,
  CryptoWithdrawalFeeDto,
} from '../dto/crypto-withdrawal-response.dto';
import { WithdrawalRequestService } from '../services/withdrawal-request.service';
import { FeeCalculationService } from '../services/fee-calculation.service';

@Controller('api/v1/wallet/withdraw/crypto')
@UseGuards(JwtAuthGuard)
@ApiTags('Crypto Withdrawal')
@ApiBearerAuth()
export class CryptoWithdrawalController {
  constructor(
    private readonly withdrawalRequestService: WithdrawalRequestService,
    private readonly feeCalculationService: FeeCalculationService,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create crypto withdrawal request' })
  @ApiResponse({ status: 201, type: CryptoWithdrawalResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: '2FA verification failed' })
  async createWithdrawal(
    @Body() dto: CreateCryptoWithdrawalDto,
    @Request() req,
  ): Promise<CryptoWithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRequestService.createWithdrawalRequest(
      req.user.userId,
      dto,
    );

    return this.mapToResponseDto(withdrawal);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get withdrawal history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: CryptoWithdrawalHistoryDto })
  async getHistory(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req,
  ): Promise<CryptoWithdrawalHistoryDto> {
    const { withdrawals, total } = await this.withdrawalRequestService.getWithdrawalHistory(
      req.user.userId,
      page,
      limit,
    );

    return {
      withdrawals: withdrawals.map(w => this.mapToResponseDto(w)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get('fees/:currency')
  @ApiOperation({ summary: 'Get withdrawal fees' })
  @ApiResponse({ status: 200, type: CryptoWithdrawalFeeDto })
  async getFees(
    @Param('currency') currency: 'BTC' | 'ETH' | 'USDT',
  ): Promise<CryptoWithdrawalFeeDto> {
    const minAmount = this.feeCalculationService.getMinimumWithdrawal(currency);
    const fees = await this.feeCalculationService.calculateWithdrawalFees(
      currency,
      minAmount,
    );

    return fees;
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel pending withdrawal' }}
  @ApiResponse({ status: 200, type: CryptoWithdrawalResponseDto })
  async cancelWithdrawal(
    @Param('id') id: string,
    @Request() req,
  ): Promise<CryptoWithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRequestService.cancelWithdrawal(
      req.user.userId,
      id,
    );

    return this.mapToResponseDto(withdrawal);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withdrawal details' })
  @ApiResponse({ status: 200, type: CryptoWithdrawalResponseDto })
  async getWithdrawal(
    @Param('id') id: string,
    @Request() req,
  ): Promise<CryptoWithdrawalResponseDto> {
    const withdrawal = await this.withdrawalRequestService.getWithdrawal(
      req.user.userId,
      id,
    );

    return this.mapToResponseDto(withdrawal);
  }

  private mapToResponseDto(withdrawal: any): CryptoWithdrawalResponseDto {
    return {
      id: withdrawal.id,
      currency: withdrawal.currency,
      destinationAddress: withdrawal.destinationAddress,
      amount: withdrawal.amount,
      networkFee: withdrawal.networkFee,
      platformFee: withdrawal.platformFee,
      totalAmount: withdrawal.totalAmount,
      status: withdrawal.status,
      transactionHash: withdrawal.transactionHash,
      confirmations: withdrawal.confirmations,
      requiresAdminApproval: withdrawal.requiresAdminApproval,
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
    };
  }
}
