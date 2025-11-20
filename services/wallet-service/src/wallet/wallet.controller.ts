import {
  Controller,
  Get,
  UseGuards,
  Request,
  HttpStatus,
  Logger,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WalletBalanceResponseDto } from './dto/wallet-balance-response.dto';

/**
 * WalletController
 * Handles wallet balance endpoints
 */
@ApiTags('wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /api/v1/wallet/balances
   * Returns all wallet balances for the authenticated user
   */
  @Get('balances')
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
  @ApiOperation({
    summary: 'Get all wallet balances',
    description: 'Returns all wallet balances (TRY, BTC, ETH, USDT) for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved wallet balances',
    type: WalletBalanceResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          wallets: [
            {
              currency: 'TRY',
              availableBalance: '1000.00',
              lockedBalance: '250.00',
              totalBalance: '1250.00',
            },
            {
              currency: 'BTC',
              availableBalance: '0.05000000',
              lockedBalance: '0.01000000',
              totalBalance: '0.06000000',
            },
            {
              currency: 'ETH',
              availableBalance: '1.50000000',
              lockedBalance: '0.00000000',
              totalBalance: '1.50000000',
            },
            {
              currency: 'USDT',
              availableBalance: '500.00000000',
              lockedBalance: '100.00000000',
              totalBalance: '600.00000000',
            },
          ],
        },
        meta: {
          timestamp: '2025-11-20T10:30:45.123Z',
          requestId: 'req_abc123',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (100 requests per minute)',
  })
  async getBalances(@Request() req: any): Promise<WalletBalanceResponseDto> {
    const userId = req.user.userId;
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;

    this.logger.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'wallet-service',
      trace_id: requestId,
      message: 'Get wallet balances request',
      context: { user_id: userId },
    });

    const wallets = await this.walletService.getUserBalances(userId);

    const response: WalletBalanceResponseDto = {
      success: true,
      data: {
        wallets,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    this.logger.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'wallet-service',
      trace_id: requestId,
      message: 'Get wallet balances success',
      context: { user_id: userId, wallet_count: wallets.length },
    });

    return response;
  }

  /**
   * GET /api/v1/wallet/balance/:currency
   * Returns balance for a specific currency
   */
  @Get('balance/:currency')
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
  @ApiOperation({
    summary: 'Get wallet balance for specific currency',
    description: 'Returns balance for a specific currency (TRY, BTC, ETH, USDT) for the authenticated user',
  })
  @ApiParam({
    name: 'currency',
    description: 'Currency code',
    enum: ['TRY', 'BTC', 'ETH', 'USDT'],
    example: 'TRY',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved wallet balance',
    schema: {
      example: {
        success: true,
        data: {
          currency: 'TRY',
          availableBalance: '1000.00',
          lockedBalance: '250.00',
          totalBalance: '1250.00',
        },
        meta: {
          timestamp: '2025-11-20T10:30:45.123Z',
          requestId: 'req_abc123',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Currency not supported',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  async getBalance(
    @Request() req: any,
    @Param('currency') currency: string,
  ): Promise<any> {
    const userId = req.user.userId;
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;

    this.logger.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'wallet-service',
      trace_id: requestId,
      message: 'Get wallet balance request',
      context: { user_id: userId, currency },
    });

    const balance = await this.walletService.getUserBalance(userId, currency);

    const response = {
      success: true,
      data: balance,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    this.logger.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'wallet-service',
      trace_id: requestId,
      message: 'Get wallet balance success',
      context: { user_id: userId, currency, total: balance.totalBalance },
    });

    return response;
  }
}
