export interface OrderbookLevel {
  price: string;
  quantity: string;
}

export class OrderbookResponseDto {
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  lastUpdateId: number;
  spread: string;
  timestamp: string;
}
