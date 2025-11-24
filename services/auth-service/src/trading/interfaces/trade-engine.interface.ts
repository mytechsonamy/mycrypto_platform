export interface PlaceOrderRequest {
  symbol: string;
  side: string;
  type: string;
  quantity: string;
  price?: string;
  time_in_force?: string;
  trigger_price?: string;
  post_only?: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  symbol: string;
  side: string;
  type: string;
  status: string;
  quantity: string;
  filled_quantity: string;
  remaining_quantity: string;
  price?: string;
  average_fill_price?: string;
  time_in_force: string;
  trigger_price?: string;
  post_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  symbol: string;
  price: string;
  quantity: string;
  buyer_order_id: string;
  seller_order_id: string;
  taker_side: string;
  executed_at: string;
}

export interface OrderBookLevel {
  price: string;
  quantity: string;
  order_count: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export interface MarketTicker {
  symbol: string;
  last_price: string;
  bid_price: string;
  ask_price: string;
  high_24h: string;
  low_24h: string;
  volume_24h: string;
  price_change_24h: string;
  price_change_percent_24h: string;
  timestamp: string;
}

export interface TradeEngineResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    request_id?: string;
  };
}

export interface PlaceOrderResponse {
  order: Order;
  trades?: Trade[];
}

export interface ListOrdersResponse {
  orders: Order[];
  total: number;
}

export interface ListTradesResponse {
  trades: Trade[];
  total: number;
}
