import { IsOptional, IsString } from 'class-validator';

/**
 * DTO for ticker bulk query parameters
 * GET /api/v1/market/tickers?symbols=BTC_TRY,ETH_TRY
 */
export class TickerQueryDto {
  @IsOptional()
  @IsString()
  symbols?: string; // Comma-separated symbols: "BTC_TRY,ETH_TRY,USDT_TRY"
}
