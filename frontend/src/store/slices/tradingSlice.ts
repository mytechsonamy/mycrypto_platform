/**
 * Redux slice for trading state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  OrderBook,
  Ticker,
  Trade,
  Order,
  TradingPair,
  AggregateLevel,
  OrderBookLevel,
  OrderStatus,
  OrderRequest,
  ExecutedTrade,
  TradeHistoryResponse,
  TradeHistoryFilters,
  OrderSide,
  OrderType,
} from '../../types/trading.types';
import {
  placeOrder as placeOrderApi,
  cancelOrder as cancelOrderApi,
  getOrderHistory as getOrderHistoryApi,
  getUserTradeHistory as getUserTradeHistoryApi,
} from '../../api/tradingApi';

// Order history filters
export interface OrderHistoryFilters {
  symbol?: string;
  side?: OrderSide;
  type?: OrderType;
  status?: OrderStatus;
  startDate?: number;
  endDate?: number;
}

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
  tradeHistory: ExecutedTrade[];
  tradeHistorySummary: {
    totalTrades: number;
    totalPnl: number;
    avgPnlPercent: number;
    winRate: number;
  };
  tradeHistoryTotal: number;
  loading: boolean;
  error: string | null;
  aggregateLevel: AggregateLevel;
  wsConnected: boolean;
  orderPlacement: {
    loading: boolean;
    error: string | null;
    lastOrderId: string | null;
  };
  orderCancellation: {
    loading: boolean;
    error: string | null;
    cancelingOrderId: string | null;
  };
  orderHistoryFetch: {
    loading: boolean;
    error: string | null;
  };
  tradeHistoryFetch: {
    loading: boolean;
    error: string | null;
  };
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
  tradeHistory: [],
  tradeHistorySummary: {
    totalTrades: 0,
    totalPnl: 0,
    avgPnlPercent: 0,
    winRate: 0,
  },
  tradeHistoryTotal: 0,
  loading: false,
  error: null,
  aggregateLevel: 0.1,
  wsConnected: false,
  orderPlacement: {
    loading: false,
    error: null,
    lastOrderId: null,
  },
  orderCancellation: {
    loading: false,
    error: null,
    cancelingOrderId: null,
  },
  orderHistoryFetch: {
    loading: false,
    error: null,
  },
  tradeHistoryFetch: {
    loading: false,
    error: null,
  },
};

/**
 * Async thunk for placing a market order
 */
export const placeMarketOrder = createAsyncThunk(
  'trading/placeMarketOrder',
  async (orderRequest: OrderRequest, { rejectWithValue }) => {
    try {
      const order = await placeOrderApi(orderRequest);
      return order;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Emir oluşturulamadı.');
    }
  }
);

/**
 * Async thunk for placing a limit order
 */
export const placeLimitOrder = createAsyncThunk(
  'trading/placeLimitOrder',
  async (orderRequest: OrderRequest, { rejectWithValue }) => {
    try {
      const order = await placeOrderApi(orderRequest);
      return order;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Limit emir oluşturulamadı.');
    }
  }
);

/**
 * Async thunk for canceling an order
 */
export const cancelOrder = createAsyncThunk(
  'trading/cancelOrder',
  async (orderId: string, { rejectWithValue, getState }) => {
    try {
      const canceledOrder = await cancelOrderApi(orderId);

      // Get the order from state to calculate unlocked funds
      const state = getState() as { trading: TradingState };
      const order = state.trading.openOrders.find(o => o.orderId === orderId);

      if (!order) {
        throw new Error('Sipariş bulunamadı.');
      }

      // Calculate unlocked funds
      const [baseCurrency, quoteCurrency] = order.symbol.split('_');
      const remainingQty = parseFloat(order.quantity) - parseFloat(order.executedQty);

      let unlockedCurrency: string;
      let unlockedAmount: number;

      if (order.side === 'BUY') {
        // For BUY orders, unlock quote currency (TRY/USDT)
        // Locked amount = remaining × price × (1 + feeRate)
        const feeRate = 0.002; // 0.2% fee
        const price = parseFloat(order.price);
        unlockedAmount = remainingQty * price * (1 + feeRate);
        unlockedCurrency = quoteCurrency;
      } else {
        // For SELL orders, unlock base currency (BTC/ETH)
        // Locked amount = remaining quantity
        unlockedAmount = remainingQty;
        unlockedCurrency = baseCurrency;
      }

      return {
        order: canceledOrder,
        unlockedCurrency,
        unlockedAmount,
      };
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Sipariş iptal edilemedi. Lütfen tekrar deneyin.');
    }
  }
);

/**
 * Async thunk for fetching order history
 */
export const fetchOrderHistory = createAsyncThunk(
  'trading/fetchOrderHistory',
  async (filters: OrderHistoryFilters, { rejectWithValue }) => {
    try {
      const orders = await getOrderHistoryApi(filters);
      return orders;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Sipariş geçmişi yüklenemedi.');
    }
  }
);

/**
 * Async thunk for fetching user trade history with P&L
 */
export const fetchTradeHistory = createAsyncThunk(
  'trading/fetchTradeHistory',
  async (filters: TradeHistoryFilters, { rejectWithValue }) => {
    try {
      const response = await getUserTradeHistoryApi(filters);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('İşlem geçmişi yüklenemedi.');
    }
  }
);

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

    // Clear order placement error
    clearOrderPlacementError: (state) => {
      state.orderPlacement.error = null;
    },

    // Clear order cancellation error
    clearOrderCancellationError: (state) => {
      state.orderCancellation.error = null;
    },

    // Remove order from open orders (used for optimistic updates)
    removeOrder: (state, action: PayloadAction<string>) => {
      const orderId = action.payload;
      state.openOrders = state.openOrders.filter(order => order.orderId !== orderId);
    },
  },
  extraReducers: (builder) => {
    builder
      // Place market order pending
      .addCase(placeMarketOrder.pending, (state) => {
        state.orderPlacement.loading = true;
        state.orderPlacement.error = null;
      })
      // Place market order fulfilled
      .addCase(placeMarketOrder.fulfilled, (state, action) => {
        state.orderPlacement.loading = false;
        state.orderPlacement.error = null;
        state.orderPlacement.lastOrderId = action.payload.orderId;

        // Add to open orders if not filled immediately
        if (action.payload.status !== OrderStatus.FILLED) {
          state.openOrders = [action.payload, ...state.openOrders];
        } else {
          // Add to order history if filled immediately
          state.orderHistory = [action.payload, ...state.orderHistory];
        }
      })
      // Place market order rejected
      .addCase(placeMarketOrder.rejected, (state, action) => {
        state.orderPlacement.loading = false;
        state.orderPlacement.error = action.payload as string || 'Emir oluşturulamadı.';
      })
      // Place limit order pending
      .addCase(placeLimitOrder.pending, (state) => {
        state.orderPlacement.loading = true;
        state.orderPlacement.error = null;
      })
      // Place limit order fulfilled
      .addCase(placeLimitOrder.fulfilled, (state, action) => {
        state.orderPlacement.loading = false;
        state.orderPlacement.error = null;
        state.orderPlacement.lastOrderId = action.payload.orderId;

        // Add to open orders if not filled immediately
        if (action.payload.status !== OrderStatus.FILLED) {
          state.openOrders = [action.payload, ...state.openOrders];
        } else {
          // Add to order history if filled immediately
          state.orderHistory = [action.payload, ...state.orderHistory];
        }
      })
      // Place limit order rejected
      .addCase(placeLimitOrder.rejected, (state, action) => {
        state.orderPlacement.loading = false;
        state.orderPlacement.error = action.payload as string || 'Limit emir oluşturulamadı.';
      })
      // Cancel order pending
      .addCase(cancelOrder.pending, (state, action) => {
        state.orderCancellation.loading = true;
        state.orderCancellation.error = null;
        state.orderCancellation.cancelingOrderId = action.meta.arg;
      })
      // Cancel order fulfilled
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.orderCancellation.loading = false;
        state.orderCancellation.error = null;
        state.orderCancellation.cancelingOrderId = null;

        const { order } = action.payload;

        // Remove from open orders
        state.openOrders = state.openOrders.filter(o => o.orderId !== order.orderId);

        // Add to order history
        state.orderHistory = [order, ...state.orderHistory];

        // Note: Wallet balance update is handled in the component via the updateBalance action
        // from walletSlice to maintain separation of concerns
      })
      // Cancel order rejected
      .addCase(cancelOrder.rejected, (state, action) => {
        state.orderCancellation.loading = false;
        state.orderCancellation.error = action.payload as string || 'Sipariş iptal edilemedi.';
        state.orderCancellation.cancelingOrderId = null;
      })
      // Fetch order history pending
      .addCase(fetchOrderHistory.pending, (state) => {
        state.orderHistoryFetch.loading = true;
        state.orderHistoryFetch.error = null;
      })
      // Fetch order history fulfilled
      .addCase(fetchOrderHistory.fulfilled, (state, action) => {
        state.orderHistoryFetch.loading = false;
        state.orderHistoryFetch.error = null;
        state.orderHistory = action.payload;
      })
      // Fetch order history rejected
      .addCase(fetchOrderHistory.rejected, (state, action) => {
        state.orderHistoryFetch.loading = false;
        state.orderHistoryFetch.error = action.payload as string || 'Sipariş geçmişi yüklenemedi.';
      })
      // Fetch trade history pending
      .addCase(fetchTradeHistory.pending, (state) => {
        state.tradeHistoryFetch.loading = true;
        state.tradeHistoryFetch.error = null;
      })
      // Fetch trade history fulfilled
      .addCase(fetchTradeHistory.fulfilled, (state, action) => {
        state.tradeHistoryFetch.loading = false;
        state.tradeHistoryFetch.error = null;
        state.tradeHistory = action.payload.trades;
        state.tradeHistorySummary = action.payload.summary;
        state.tradeHistoryTotal = action.payload.total;
      })
      // Fetch trade history rejected
      .addCase(fetchTradeHistory.rejected, (state, action) => {
        state.tradeHistoryFetch.loading = false;
        state.tradeHistoryFetch.error = action.payload as string || 'İşlem geçmişi yüklenemedi.';
      });
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
  clearOrderPlacementError,
  clearOrderCancellationError,
  removeOrder,
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
export const selectOrderPlacement = (state: { trading: TradingState }) => state.trading.orderPlacement;
export const selectOrderPlacementLoading = (state: { trading: TradingState }) => state.trading.orderPlacement.loading;
export const selectOrderPlacementError = (state: { trading: TradingState }) => state.trading.orderPlacement.error;
export const selectLastOrderId = (state: { trading: TradingState }) => state.trading.orderPlacement.lastOrderId;
export const selectOrderCancellation = (state: { trading: TradingState }) => state.trading.orderCancellation;
export const selectOrderCancellationLoading = (state: { trading: TradingState }) => state.trading.orderCancellation.loading;
export const selectOrderCancellationError = (state: { trading: TradingState }) => state.trading.orderCancellation.error;
export const selectCancelingOrderId = (state: { trading: TradingState }) => state.trading.orderCancellation.cancelingOrderId;
export const selectOrderHistoryLoading = (state: { trading: TradingState }) => state.trading.orderHistoryFetch.loading;
export const selectOrderHistoryError = (state: { trading: TradingState }) => state.trading.orderHistoryFetch.error;
export const selectTradeHistory = (state: { trading: TradingState }) => state.trading.tradeHistory;
export const selectTradeHistorySummary = (state: { trading: TradingState }) => state.trading.tradeHistorySummary;
export const selectTradeHistoryTotal = (state: { trading: TradingState }) => state.trading.tradeHistoryTotal;
export const selectTradeHistoryLoading = (state: { trading: TradingState }) => state.trading.tradeHistoryFetch.loading;
export const selectTradeHistoryError = (state: { trading: TradingState }) => state.trading.tradeHistoryFetch.error;
