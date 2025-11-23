/**
 * Redux slice for trading state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  OrderBook,
  Ticker,
  Trade,
  Order,
  TradingPair,
  AggregateLevel,
  OrderBookLevel,
  OrderStatus,
} from '../../types/trading.types';

// Trading state interface
export interface TradingState {
  selectedSymbol: TradingPair;
  orderBook: {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    spread: string;
    spreadPercent: string;
    lastUpdateId: number;
  };
  ticker: {
    lastPrice: string;
    priceChange: string;
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
  } | null;
  recentTrades: Trade[];
  openOrders: Order[];
  orderHistory: Order[];
  loading: boolean;
  error: string | null;
  aggregateLevel: AggregateLevel;
  wsConnected: boolean;
}

// Initial state
const initialState: TradingState = {
  selectedSymbol: 'BTC_TRY',
  orderBook: {
    bids: [],
    asks: [],
    spread: '0',
    spreadPercent: '0',
    lastUpdateId: 0,
  },
  ticker: null,
  recentTrades: [],
  openOrders: [],
  orderHistory: [],
  loading: false,
  error: null,
  aggregateLevel: 0.1,
  wsConnected: false,
};

/**
 * Calculate spread between best bid and best ask
 */
const calculateSpread = (bids: OrderBookLevel[], asks: OrderBookLevel[]): { spread: string; spreadPercent: string } => {
  if (bids.length === 0 || asks.length === 0) {
    return { spread: '0', spreadPercent: '0' };
  }

  const bestBid = parseFloat(bids[0][0]);
  const bestAsk = parseFloat(asks[0][0]);
  const spread = bestAsk - bestBid;
  const spreadPercent = ((spread / bestAsk) * 100).toFixed(2);

  return {
    spread: spread.toFixed(2),
    spreadPercent,
  };
};

/**
 * Aggregate order book levels by percentage
 */
const aggregateOrderBook = (
  levels: OrderBookLevel[],
  aggregatePercent: number
): OrderBookLevel[] => {
  if (levels.length === 0 || aggregatePercent === 0) {
    return levels;
  }

  const aggregated: OrderBookLevel[] = [];
  let currentBucket: number | null = null;
  let currentQuantity = 0;
  let currentTotal = 0;

  levels.forEach(([price, quantity, total]) => {
    const priceNum = parseFloat(price);
    const quantityNum = parseFloat(quantity);
    const totalNum = parseFloat(total);

    // Calculate bucket based on aggregate percentage
    const bucket = Math.floor(priceNum / (priceNum * (aggregatePercent / 100)));

    if (currentBucket === null) {
      currentBucket = bucket;
      currentQuantity = quantityNum;
      currentTotal = totalNum;
    } else if (bucket === currentBucket) {
      // Same bucket, aggregate
      currentQuantity += quantityNum;
      currentTotal += totalNum;
    } else {
      // New bucket, push previous
      const avgPrice = currentTotal / currentQuantity;
      aggregated.push([
        avgPrice.toFixed(2),
        currentQuantity.toFixed(8),
        currentTotal.toFixed(2),
      ]);
      currentBucket = bucket;
      currentQuantity = quantityNum;
      currentTotal = totalNum;
    }
  });

  // Push last bucket
  if (currentBucket !== null && currentQuantity > 0) {
    const avgPrice = currentTotal / currentQuantity;
    aggregated.push([
      avgPrice.toFixed(2),
      currentQuantity.toFixed(8),
      currentTotal.toFixed(2),
    ]);
  }

  return aggregated;
};

/**
 * Calculate cumulative totals for order book levels
 */
const calculateCumulativeTotals = (levels: [string, string][]): OrderBookLevel[] => {
  let cumulativeTotal = 0;
  return levels.map(([price, quantity]) => {
    const priceNum = parseFloat(price);
    const quantityNum = parseFloat(quantity);
    const total = priceNum * quantityNum;
    cumulativeTotal += total;
    return [price, quantity, cumulativeTotal.toFixed(2)];
  });
};

/**
 * Trading slice
 */
const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    // Set selected trading symbol
    setSelectedSymbol: (state, action: PayloadAction<TradingPair>) => {
      state.selectedSymbol = action.payload;
      // Reset order book when switching symbols
      state.orderBook = {
        bids: [],
        asks: [],
        spread: '0',
        spreadPercent: '0',
        lastUpdateId: 0,
      };
      state.recentTrades = [];
    },

    // Set order book (full snapshot)
    setOrderBook: (state, action: PayloadAction<{ bids: [string, string][]; asks: [string, string][]; lastUpdateId: number }>) => {
      const { bids, asks, lastUpdateId } = action.payload;

      // Calculate cumulative totals
      const bidsWithTotals = calculateCumulativeTotals(bids);
      const asksWithTotals = calculateCumulativeTotals(asks);

      // Apply aggregation
      const aggregatedBids = aggregateOrderBook(bidsWithTotals, state.aggregateLevel);
      const aggregatedAsks = aggregateOrderBook(asksWithTotals, state.aggregateLevel);

      // Calculate spread
      const { spread, spreadPercent } = calculateSpread(aggregatedBids, aggregatedAsks);

      state.orderBook = {
        bids: aggregatedBids.slice(0, 20), // Top 20 levels
        asks: aggregatedAsks.slice(0, 20),
        spread,
        spreadPercent,
        lastUpdateId,
      };
      state.loading = false;
      state.error = null;
    },

    // Update order book (incremental update)
    updateOrderBook: (state, action: PayloadAction<{ bids: [string, string][]; asks: [string, string][]; lastUpdateId: number }>) => {
      const { bids, asks, lastUpdateId } = action.payload;

      // Skip if update is older than current
      if (lastUpdateId <= state.orderBook.lastUpdateId) {
        return;
      }

      // Apply updates to existing order book
      const updatedBids = [...state.orderBook.bids];
      const updatedAsks = [...state.orderBook.asks];

      // Update bids
      bids.forEach(([price, quantity]) => {
        const quantityNum = parseFloat(quantity);
        const existingIndex = updatedBids.findIndex(([p]) => p === price);

        if (quantityNum === 0) {
          // Remove level
          if (existingIndex !== -1) {
            updatedBids.splice(existingIndex, 1);
          }
        } else {
          // Update or add level
          const priceNum = parseFloat(price);
          const total = priceNum * quantityNum;
          if (existingIndex !== -1) {
            updatedBids[existingIndex] = [price, quantity, total.toFixed(2)];
          } else {
            updatedBids.push([price, quantity, total.toFixed(2)]);
          }
        }
      });

      // Update asks
      asks.forEach(([price, quantity]) => {
        const quantityNum = parseFloat(quantity);
        const existingIndex = updatedAsks.findIndex(([p]) => p === price);

        if (quantityNum === 0) {
          // Remove level
          if (existingIndex !== -1) {
            updatedAsks.splice(existingIndex, 1);
          }
        } else {
          // Update or add level
          const priceNum = parseFloat(price);
          const total = priceNum * quantityNum;
          if (existingIndex !== -1) {
            updatedAsks[existingIndex] = [price, quantity, total.toFixed(2)];
          } else {
            updatedAsks.push([price, quantity, total.toFixed(2)]);
          }
        }
      });

      // Sort bids (descending) and asks (ascending)
      updatedBids.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
      updatedAsks.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

      // Recalculate cumulative totals
      const bidsWithTotals = calculateCumulativeTotals(updatedBids.map(([p, q]) => [p, q]));
      const asksWithTotals = calculateCumulativeTotals(updatedAsks.map(([p, q]) => [p, q]));

      // Apply aggregation
      const aggregatedBids = aggregateOrderBook(bidsWithTotals, state.aggregateLevel);
      const aggregatedAsks = aggregateOrderBook(asksWithTotals, state.aggregateLevel);

      // Calculate spread
      const { spread, spreadPercent } = calculateSpread(aggregatedBids, aggregatedAsks);

      state.orderBook = {
        bids: aggregatedBids.slice(0, 20),
        asks: aggregatedAsks.slice(0, 20),
        spread,
        spreadPercent,
        lastUpdateId,
      };
    },

    // Set ticker data
    setTicker: (state, action: PayloadAction<Ticker>) => {
      const ticker = action.payload;
      state.ticker = {
        lastPrice: ticker.lastPrice,
        priceChange: ticker.priceChange,
        priceChangePercent: ticker.priceChangePercent,
        highPrice: ticker.highPrice,
        lowPrice: ticker.lowPrice,
        volume: ticker.volume,
        quoteVolume: ticker.quoteVolume,
      };
    },

    // Set recent trades
    setRecentTrades: (state, action: PayloadAction<Trade[]>) => {
      state.recentTrades = action.payload.slice(0, 50); // Keep last 50 trades
    },

    // Add new trade (from WebSocket)
    addTrade: (state, action: PayloadAction<Trade>) => {
      state.recentTrades = [action.payload, ...state.recentTrades].slice(0, 50);
    },

    // Set open orders
    setOpenOrders: (state, action: PayloadAction<Order[]>) => {
      state.openOrders = action.payload;
    },

    // Set order history
    setOrderHistory: (state, action: PayloadAction<Order[]>) => {
      state.orderHistory = action.payload;
    },

    // Add or update order (from WebSocket)
    updateOrder: (state, action: PayloadAction<Order>) => {
      const order = action.payload;
      const index = state.openOrders.findIndex((o) => o.orderId === order.orderId);

      if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELED) {
        // Move to history
        if (index !== -1) {
          state.openOrders.splice(index, 1);
        }
        state.orderHistory = [order, ...state.orderHistory];
      } else {
        // Update or add to open orders
        if (index !== -1) {
          state.openOrders[index] = order;
        } else {
          state.openOrders = [order, ...state.openOrders];
        }
      }
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set aggregate level
    setAggregateLevel: (state, action: PayloadAction<AggregateLevel>) => {
      state.aggregateLevel = action.payload;
      // Reapply aggregation to current order book
      if (state.orderBook.bids.length > 0 || state.orderBook.asks.length > 0) {
        const aggregatedBids = aggregateOrderBook(state.orderBook.bids, action.payload);
        const aggregatedAsks = aggregateOrderBook(state.orderBook.asks, action.payload);
        const { spread, spreadPercent } = calculateSpread(aggregatedBids, aggregatedAsks);

        state.orderBook = {
          ...state.orderBook,
          bids: aggregatedBids.slice(0, 20),
          asks: aggregatedAsks.slice(0, 20),
          spread,
          spreadPercent,
        };
      }
    },

    // Set WebSocket connection status
    setWsConnected: (state, action: PayloadAction<boolean>) => {
      state.wsConnected = action.payload;
    },

    // Reset trading state
    resetTradingState: (state) => {
      return initialState;
    },
  },
});

// Export actions
export const {
  setSelectedSymbol,
  setOrderBook,
  updateOrderBook,
  setTicker,
  setRecentTrades,
  addTrade,
  setOpenOrders,
  setOrderHistory,
  updateOrder,
  setLoading,
  setError,
  clearError,
  setAggregateLevel,
  setWsConnected,
  resetTradingState,
} = tradingSlice.actions;

// Export reducer
export default tradingSlice.reducer;

// Selectors
export const selectTrading = (state: { trading: TradingState }) => state.trading;
export const selectSelectedSymbol = (state: { trading: TradingState }) => state.trading.selectedSymbol;
export const selectOrderBook = (state: { trading: TradingState }) => state.trading.orderBook;
export const selectTicker = (state: { trading: TradingState }) => state.trading.ticker;
export const selectRecentTrades = (state: { trading: TradingState }) => state.trading.recentTrades;
export const selectOpenOrders = (state: { trading: TradingState }) => state.trading.openOrders;
export const selectOrderHistory = (state: { trading: TradingState }) => state.trading.orderHistory;
export const selectTradingLoading = (state: { trading: TradingState }) => state.trading.loading;
export const selectTradingError = (state: { trading: TradingState }) => state.trading.error;
export const selectAggregateLevel = (state: { trading: TradingState }) => state.trading.aggregateLevel;
export const selectWsConnected = (state: { trading: TradingState }) => state.trading.wsConnected;
