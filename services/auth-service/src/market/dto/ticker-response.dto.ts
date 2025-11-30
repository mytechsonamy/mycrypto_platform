/**
 * Ticker response DTO
 * Represents real-time market ticker data for a trading symbol
 */
export class TickerResponseDto {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  high: string;
  low: string;
  volume: string;
  quoteVolume: string;
  timestamp: string;
}

/**
 * Bulk tickers response DTO
 * Contains multiple ticker data for different symbols
 */
export class BulkTickersResponseDto {
  tickers: TickerResponseDto[];
  timestamp: string;
}
