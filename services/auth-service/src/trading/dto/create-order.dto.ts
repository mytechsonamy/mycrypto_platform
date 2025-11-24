import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_MARKET = 'stop_market',
  STOP_LIMIT = 'stop_limit',
}

export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancel
  IOC = 'IOC', // Immediate Or Cancel
  FOK = 'FOK', // Fill Or Kill
}

export class CreateOrderDTO {
  @ApiProperty({ description: 'Trading pair symbol', example: 'BTC-USDT' })
  @IsNotEmpty()
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'Order side', enum: OrderSide, example: 'buy' })
  @IsNotEmpty()
  @IsEnum(OrderSide)
  side: OrderSide;

  @ApiProperty({ description: 'Order type', enum: OrderType, example: 'limit' })
  @IsNotEmpty()
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ description: 'Order quantity', example: '0.5' })
  @IsNotEmpty()
  @IsString()
  quantity: string;

  @ApiPropertyOptional({ description: 'Limit price (required for limit orders)', example: '50000.00' })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiPropertyOptional({ description: 'Time in force', enum: TimeInForce, example: 'GTC' })
  @IsOptional()
  @IsEnum(TimeInForce)
  timeInForce?: TimeInForce;

  @ApiPropertyOptional({ description: 'Trigger price for stop orders', example: '49000.00' })
  @IsOptional()
  @IsString()
  triggerPrice?: string;

  @ApiPropertyOptional({ description: 'Post-only flag (order will only be added to order book, never execute immediately)', example: false })
  @IsOptional()
  @IsBoolean()
  postOnly?: boolean;
}
