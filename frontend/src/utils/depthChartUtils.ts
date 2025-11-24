/**
 * Utility functions for depth chart calculations
 */

import { OrderBookLevel } from '../types/trading.types';
import { DepthLevel, DepthChartData } from '../types/depth-chart.types';

/**
 * Convert order book levels to depth chart data with cumulative volumes
 */
export const calculateDepthData = (
  bids: OrderBookLevel[],
  asks: OrderBookLevel[],
  spread: string,
  spreadPercent: string
): DepthChartData => {
  // Calculate cumulative volumes for bids (descending price order)
  let cumulativeBidVolume = 0;
  const bidDepthLevels: DepthLevel[] = bids.map(([price, quantity]) => {
    const volume = parseFloat(quantity);
    cumulativeBidVolume += volume;
    return {
      price,
      volume: quantity,
      cumulative: cumulativeBidVolume.toFixed(8),
      percentage: 0, // Will be calculated after
    };
  });

  // Calculate cumulative volumes for asks (ascending price order)
  let cumulativeAskVolume = 0;
  const askDepthLevels: DepthLevel[] = asks.map(([price, quantity]) => {
    const volume = parseFloat(quantity);
    cumulativeAskVolume += volume;
    return {
      price,
      volume: quantity,
      cumulative: cumulativeAskVolume.toFixed(8),
      percentage: 0, // Will be calculated after
    };
  });

  // Calculate percentages
  const maxBidVolume = cumulativeBidVolume;
  const maxAskVolume = cumulativeAskVolume;

  bidDepthLevels.forEach((level) => {
    level.percentage = maxBidVolume > 0 ? (parseFloat(level.cumulative) / maxBidVolume) * 100 : 0;
  });

  askDepthLevels.forEach((level) => {
    level.percentage = maxAskVolume > 0 ? (parseFloat(level.cumulative) / maxAskVolume) * 100 : 0;
  });

  return {
    bids: bidDepthLevels,
    asks: askDepthLevels,
    spread: {
      value: spread,
      percentage: spreadPercent,
    },
  };
};

/**
 * Filter depth data based on aggregate level percentage
 */
export const filterDepthDataByAggregate = (
  depthData: DepthChartData,
  aggregatePercent: number
): DepthChartData => {
  if (aggregatePercent === 0 || depthData.bids.length === 0 || depthData.asks.length === 0) {
    return depthData;
  }

  const filterLevels = (levels: DepthLevel[]): DepthLevel[] => {
    if (levels.length === 0) return [];

    const aggregated: DepthLevel[] = [];
    const basePrice = parseFloat(levels[0].price);
    const bucketSize = basePrice * (aggregatePercent / 100);

    let currentBucket = Math.floor(parseFloat(levels[0].price) / bucketSize);
    let bucketVolume = 0;
    let bucketPrices: number[] = [];

    levels.forEach((level) => {
      const price = parseFloat(level.price);
      const volume = parseFloat(level.volume);
      const bucket = Math.floor(price / bucketSize);

      if (bucket === currentBucket) {
        bucketVolume += volume;
        bucketPrices.push(price);
      } else {
        // Push previous bucket
        if (bucketVolume > 0) {
          const avgPrice = bucketPrices.reduce((sum, p) => sum + p, 0) / bucketPrices.length;
          const cumulative = parseFloat(level.cumulative) - volume; // Previous cumulative
          aggregated.push({
            price: avgPrice.toFixed(2),
            volume: bucketVolume.toFixed(8),
            cumulative: cumulative.toFixed(8),
            percentage: level.percentage,
          });
        }
        // Start new bucket
        currentBucket = bucket;
        bucketVolume = volume;
        bucketPrices = [price];
      }
    });

    // Push last bucket
    if (bucketVolume > 0 && levels.length > 0) {
      const avgPrice = bucketPrices.reduce((sum, p) => sum + p, 0) / bucketPrices.length;
      const lastLevel = levels[levels.length - 1];
      aggregated.push({
        price: avgPrice.toFixed(2),
        volume: bucketVolume.toFixed(8),
        cumulative: lastLevel.cumulative,
        percentage: lastLevel.percentage,
      });
    }

    return aggregated;
  };

  return {
    bids: filterLevels(depthData.bids),
    asks: filterLevels(depthData.asks),
    spread: depthData.spread,
  };
};

/**
 * Apply zoom to depth data
 */
export const applyZoomToDepthData = (
  depthData: DepthChartData,
  zoomLevel: number,
  panOffset: number
): DepthChartData => {
  if (zoomLevel === 1) {
    return depthData;
  }

  // Calculate how many data points to show based on zoom
  const totalBidPoints = depthData.bids.length;
  const totalAskPoints = depthData.asks.length;

  const visibleBidPoints = Math.ceil(totalBidPoints / zoomLevel);
  const visibleAskPoints = Math.ceil(totalAskPoints / zoomLevel);

  // Calculate start index based on pan offset
  const bidStartIndex = Math.max(0, Math.min(panOffset, totalBidPoints - visibleBidPoints));
  const askStartIndex = Math.max(0, Math.min(panOffset, totalAskPoints - visibleAskPoints));

  return {
    bids: depthData.bids.slice(bidStartIndex, bidStartIndex + visibleBidPoints),
    asks: depthData.asks.slice(askStartIndex, askStartIndex + visibleAskPoints),
    spread: depthData.spread,
  };
};

/**
 * Format number for display (with thousand separators)
 */
export const formatDepthNumber = (value: number | string, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format crypto quantity (8 decimals)
 */
export const formatCryptoQuantity = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00000000';
  return num.toFixed(8);
};
