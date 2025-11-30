/**
 * 24-hour market statistics interface
 */
export interface Statistics {
  symbol: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  timestamp: Date;
}

/**
 * Internal trade data structure for statistics calculation
 */
export interface TradeData {
  price: string;
  quantity: string;
  executed_at: string;
}
