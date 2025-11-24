/**
 * Depth chart types for order book depth visualization
 */

// Depth level data structure
export interface DepthLevel {
  price: string;
  volume: string;
  cumulative: string;
  percentage: number;
}

// Depth chart data structure
export interface DepthChartData {
  bids: DepthLevel[];
  asks: DepthLevel[];
  spread: {
    value: string;
    percentage: string;
  };
}

// Depth chart zoom levels
export const ZOOM_LEVELS = [1, 2, 5, 10] as const;
export type ZoomLevel = typeof ZOOM_LEVELS[number];

// Depth chart state interface
export interface DepthChartState {
  data: DepthChartData;
  loading: boolean;
  error: string | null;
  zoomLevel: ZoomLevel;
  panOffset: number;
  aggregateLevel: number;
}
