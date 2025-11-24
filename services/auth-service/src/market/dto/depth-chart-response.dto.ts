export interface DepthChartLevel {
  price: string;
  volume: string;
  cumulative: string;
  percentage: string;
}

export interface SpreadInfo {
  value: string;
  percentage: string;
}

export class DepthChartResponseDto {
  symbol: string;
  bids: DepthChartLevel[];
  asks: DepthChartLevel[];
  spread: SpreadInfo;
  maxBidVolume: string;
  maxAskVolume: string;
  timestamp: string;
}
