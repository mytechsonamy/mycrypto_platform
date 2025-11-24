import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TradingService } from '../services';
import { CreateOrderDTO } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Trading')
@Controller('api/v1/trading')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a new order' })
  @ApiResponse({
    status: 201,
    description: 'Order placed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid order request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 503,
    description: 'Trade Engine service unavailable',
  })
  async placeOrder(
    @Request() req: any,
    @Body(ValidationPipe) createOrderDTO: CreateOrderDTO,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.tradingService.placeOrder(userId, createOrderDTO);
  }

  @Get('orderbook/:symbol')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get order book for a trading pair' })
  @ApiParam({
    name: 'symbol',
    description: 'Trading pair symbol (e.g., BTC-USDT)',
    example: 'BTC-USDT',
  })
  @ApiQuery({
    name: 'depth',
    description: 'Order book depth (number of price levels)',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Order book retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Trading pair not found',
  })
  async getOrderBook(
    @Param('symbol') symbol: string,
    @Query('depth', new ParseIntPipe({ optional: true })) depth?: number,
  ) {
    return this.tradingService.getOrderBook(symbol, depth || 20);
  }

  @Get('markets/:symbol/ticker')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get market ticker data for a trading pair' })
  @ApiParam({
    name: 'symbol',
    description: 'Trading pair symbol (e.g., BTC-USDT)',
    example: 'BTC-USDT',
  })
  @ApiResponse({
    status: 200,
    description: 'Market ticker retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Trading pair not found',
  })
  async getMarketTicker(@Param('symbol') symbol: string) {
    return this.tradingService.getMarketTicker(symbol);
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({
    name: 'status',
    description: 'Filter by order status (open, filled, cancelled, etc.)',
    required: false,
    type: String,
    example: 'open',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getUserOrders(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.tradingService.getUserOrders(userId, status);
  }

  @Get('orders/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific order by ID' })
  @ApiParam({
    name: 'orderId',
    description: 'Order ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getOrder(
    @Request() req: any,
    @Param('orderId') orderId: string,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.tradingService.getOrder(userId, orderId);
  }

  @Delete('orders/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({
    name: 'orderId',
    description: 'Order ID to cancel',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Order cannot be cancelled (already filled or cancelled)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async cancelOrder(
    @Request() req: any,
    @Param('orderId') orderId: string,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.tradingService.cancelOrder(userId, orderId);
  }

  @Get('trades')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recent trades' })
  @ApiQuery({
    name: 'symbol',
    description: 'Filter by trading pair symbol',
    required: false,
    type: String,
    example: 'BTC-USDT',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of trades to return',
    required: false,
    type: Number,
    example: 100,
  })
  @ApiResponse({
    status: 200,
    description: 'Trades retrieved successfully',
  })
  async getTrades(
    @Query('symbol') symbol?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.tradingService.getRecentTrades(symbol, limit || 100);
  }
}
