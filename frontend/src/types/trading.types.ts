/**
 * Trading types for order book, orders, and trades
 */

// Order book level [price, quantity, total]
export type OrderBookLevel = [string, string, string];

// Order book data
export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: string;
  spreadPercent: string;
  lastUpdateId: number;
  symbol: string;
}

// Ticker data
export interface Ticker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

// Trade data
export interface Trade {
  id: string;
  symbol: string;
  price: string;
  quantity: string;
  quoteQuantity: string;
  time: number;
  isBuyerMaker: boolean;
  isBestMatch: boolean;
}

// Order side
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

// Order type
export enum OrderType {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET',
  STOP_LOSS = 'STOP_LOSS',
  STOP_LOSS_LIMIT = 'STOP_LOSS_LIMIT',
  TAKE_PROFIT = 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT = 'TAKE_PROFIT_LIMIT',
}

// Order status
export enum OrderStatus {
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
  PENDING_CANCEL = 'PENDING_CANCEL',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

// Time in force
export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancel
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK', // Fill or Kill
}

// Order request
export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  timeInForce?: TimeInForce;
  quantity: string;
  price?: string;
  stopPrice?: string;
  icebergQty?: string;
  newClientOrderId?: string;
  newOrderRespType?: 'ACK' | 'RESULT' | 'FULL';
}

// Order response
export interface Order {
  orderId: string;
  symbol: string;
  clientOrderId: string;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  quantity: string;
  price: string;
  stopPrice?: string;
  status: OrderStatus;
  executedQty: string;
  cummulativeQuoteQty: string;
  fills?: OrderFill[];
  createdAt: number;
  updatedAt: number;
}

// Order fill
export interface OrderFill {
  price: string;
  quantity: string;
  commission: string;
  commissionAsset: string;
  tradeId: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Error response
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Order book API response
export interface OrderBookResponse {
  lastUpdateId: number;
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][]; // [price, quantity]
}

// Ticker API response
export interface TickerResponse extends Ticker {}

// Trades API response
export type TradesResponse = Trade[];

// WebSocket message types
export enum WebSocketMessageType {
  ORDER_BOOK_SNAPSHOT = 'orderbook_snapshot',
  ORDER_BOOK_UPDATE = 'orderbook_update',
  TICKER_UPDATE = 'ticker_update',
  TRADE_EXECUTED = 'trade_executed',
  ORDER_UPDATE = 'order_update',
  BALANCE_UPDATE = 'balance_update',
}

// WebSocket order book snapshot
export interface OrderBookSnapshotMessage {
  type: WebSocketMessageType.ORDER_BOOK_SNAPSHOT;
  symbol: string;
  data: OrderBookResponse;
  timestamp: number;
}

// WebSocket order book update
export interface OrderBookUpdateMessage {
  type: WebSocketMessageType.ORDER_BOOK_UPDATE;
  symbol: string;
  data: {
    lastUpdateId: number;
    bids: [string, string][]; // [price, quantity] - quantity 0 means remove
    asks: [string, string][];
  };
  timestamp: number;
}

// WebSocket ticker update
export interface TickerUpdateMessage {
  type: WebSocketMessageType.TICKER_UPDATE;
  symbol: string;
  data: Ticker;
  timestamp: number;
}

// WebSocket trade executed
export interface TradeExecutedMessage {
  type: WebSocketMessageType.TRADE_EXECUTED;
  symbol: string;
  data: Trade;
  timestamp: number;
}

// WebSocket order update
export interface OrderUpdateMessage {
  type: WebSocketMessageType.ORDER_UPDATE;
  data: Order;
  timestamp: number;
}

// WebSocket balance update
export interface BalanceUpdateMessage {
  type: WebSocketMessageType.BALANCE_UPDATE;
  data: {
    asset: string;
    free: string;
    locked: string;
  };
  timestamp: number;
}

// Union type for all WebSocket messages
export type WebSocketMessage =
  | OrderBookSnapshotMessage
  | OrderBookUpdateMessage
  | TickerUpdateMessage
  | TradeExecutedMessage
  | OrderUpdateMessage
  | BalanceUpdateMessage;

// Trading pairs
export const TRADING_PAIRS = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'] as const;
export type TradingPair = typeof TRADING_PAIRS[number];

// Order book aggregate levels (percentage)
export const AGGREGATE_LEVELS = [0.1, 0.5, 1] as const;
export type AggregateLevel = typeof AGGREGATE_LEVELS[number];
