/**
 * Trading API client
 * Integrates with Trade Engine API at /api/v1
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ApiResponse,
  ApiErrorResponse,
  OrderBookResponse,
  TickerResponse,
  TradesResponse,
  OrderRequest,
  Order,
  TradingPair,
  TimeInForce,
  OrderStatus,
  OrderSide,
  OrderType,
  ExecutedTrade,
  TradeHistoryResponse,
  TradeHistoryFilters,
} from '../types/trading.types';

// API base URL - configured via environment variables
const API_BASE_URL = process.env.REACT_APP_TRADING_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance with default config
const tradingApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor for adding auth tokens
tradingApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
tradingApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (!error.response) {
      // Network error
      return Promise.reject(new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.'));
    }

    const { status, data } = error.response;

    // Handle specific error codes
    switch (status) {
      case 400:
        return Promise.reject(new Error(data?.message || 'Geçersiz istek.'));
      case 401:
        return Promise.reject(new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.'));
      case 403:
        return Promise.reject(new Error('Bu işlem için yetkiniz yok.'));
      case 404:
        return Promise.reject(new Error('İstenen kaynak bulunamadı.'));
      case 429:
        return Promise.reject(new Error('Çok fazla istek gönderdiniz. Lütfen bekleyin.'));
      case 500:
      case 502:
      case 503:
        return Promise.reject(new Error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.'));
      default:
        return Promise.reject(new Error(data?.message || 'Beklenmeyen bir hata oluştu.'));
    }
  }
);

// Flag to use mock responses during development
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_TRADING_API === 'true';

// Mock delay to simulate network latency
const mockDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Mock data generators
const generateMockOrderBook = (symbol: string): OrderBookResponse => {
  const basePrice = symbol === 'BTC_TRY' ? 850000 : symbol === 'ETH_TRY' ? 45000 : 28;
  const bids: [string, string][] = [];
  const asks: [string, string][] = [];

  // Generate 30 bid levels (descending)
  for (let i = 0; i < 30; i++) {
    const price = (basePrice - i * (basePrice * 0.001)).toFixed(2);
    const quantity = (Math.random() * 2 + 0.5).toFixed(8);
    bids.push([price, quantity]);
  }

  // Generate 30 ask levels (ascending)
  for (let i = 0; i < 30; i++) {
    const price = (basePrice + i * (basePrice * 0.001)).toFixed(2);
    const quantity = (Math.random() * 2 + 0.5).toFixed(8);
    asks.push([price, quantity]);
  }

  return {
    lastUpdateId: Date.now(),
    bids,
    asks,
  };
};

const generateMockTicker = (symbol: string): TickerResponse => {
  const basePrice = symbol === 'BTC_TRY' ? 850000 : symbol === 'ETH_TRY' ? 45000 : 28;
  const priceChange = (Math.random() - 0.5) * basePrice * 0.05;
  const priceChangePercent = ((priceChange / basePrice) * 100).toFixed(2);

  return {
    symbol,
    lastPrice: basePrice.toFixed(2),
    priceChange: priceChange.toFixed(2),
    priceChangePercent,
    highPrice: (basePrice * 1.03).toFixed(2),
    lowPrice: (basePrice * 0.97).toFixed(2),
    volume: (Math.random() * 1000 + 500).toFixed(8),
    quoteVolume: (Math.random() * basePrice * 1000).toFixed(2),
    openTime: Date.now() - 86400000,
    closeTime: Date.now(),
    firstId: 1,
    lastId: 100000,
    count: 100000,
  };
};

const generateMockTrades = (symbol: string): TradesResponse => {
  const basePrice = symbol === 'BTC_TRY' ? 850000 : symbol === 'ETH_TRY' ? 45000 : 28;
  const trades: TradesResponse = [];

  for (let i = 0; i < 20; i++) {
    const price = (basePrice + (Math.random() - 0.5) * basePrice * 0.01).toFixed(2);
    const quantity = (Math.random() * 2 + 0.1).toFixed(8);
    const quoteQuantity = (parseFloat(price) * parseFloat(quantity)).toFixed(2);

    trades.push({
      id: `trade-${Date.now()}-${i}`,
      symbol,
      price,
      quantity,
      quoteQuantity,
      time: Date.now() - i * 1000,
      isBuyerMaker: Math.random() > 0.5,
      isBestMatch: true,
    });
  }

  return trades;
};

/**
 * Get order book for a symbol
 * @param symbol - Trading pair symbol (e.g., 'BTC_TRY')
 * @param depth - Order book depth (default: 20, max: 100)
 */
export const getOrderBook = async (
  symbol: TradingPair,
  depth: number = 20
): Promise<OrderBookResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(300);
    return generateMockOrderBook(symbol);
  }

  try {
    const response = await tradingApiClient.get<ApiResponse<OrderBookResponse>>(
      `/orderbook/${symbol}`,
      { params: { depth } }
    );
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get ticker data for a symbol
 * @param symbol - Trading pair symbol (e.g., 'BTC_TRY')
 */
export const getTicker = async (symbol: TradingPair): Promise<TickerResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(200);
    return generateMockTicker(symbol);
  }

  try {
    const response = await tradingApiClient.get<ApiResponse<TickerResponse>>(
      `/ticker/${symbol}`
    );
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get recent trades for a symbol
 * @param symbol - Trading pair symbol (e.g., 'BTC_TRY')
 * @param limit - Number of trades to return (default: 50, max: 500)
 */
export const getRecentTrades = async (
  symbol: TradingPair,
  limit: number = 50
): Promise<TradesResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(200);
    return generateMockTrades(symbol);
  }

  try {
    const response = await tradingApiClient.get<ApiResponse<TradesResponse>>(
      `/trades/${symbol}`,
      { params: { limit } }
    );
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Place a new order
 * @param order - Order request data
 */
export const placeOrder = async (order: OrderRequest): Promise<Order> => {
  if (USE_MOCK_API) {
    await mockDelay(500);
    // Mock validation
    if (parseFloat(order.quantity) <= 0) {
      throw new Error('Miktar sıfırdan büyük olmalıdır.');
    }
    if (order.type === 'LIMIT' && !order.price) {
      throw new Error('Limit emir için fiyat gereklidir.');
    }

    // Mock success response
    const mockOrder: Order = {
      orderId: `order-${Date.now()}`,
      symbol: order.symbol,
      clientOrderId: order.newClientOrderId || `client-${Date.now()}`,
      side: order.side,
      type: order.type,
      timeInForce: order.timeInForce || TimeInForce.GTC,
      quantity: order.quantity,
      price: order.price || '0',
      stopPrice: order.stopPrice,
      status: OrderStatus.NEW,
      executedQty: '0',
      cummulativeQuoteQty: '0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return mockOrder;
  }

  try {
    const response = await tradingApiClient.post<ApiResponse<Order>>('/orders', order);
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Cancel an existing order
 * @param orderId - Order ID to cancel
 */
export const cancelOrder = async (orderId: string): Promise<Order> => {
  if (USE_MOCK_API) {
    await mockDelay(300);
    const mockOrder: Order = {
      orderId,
      symbol: 'BTC_TRY',
      clientOrderId: `client-${Date.now()}`,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      timeInForce: TimeInForce.GTC,
      quantity: '0.001',
      price: '850000',
      status: OrderStatus.CANCELED,
      executedQty: '0',
      cummulativeQuoteQty: '0',
      createdAt: Date.now() - 60000,
      updatedAt: Date.now(),
    };
    return mockOrder;
  }

  try {
    const response = await tradingApiClient.delete<ApiResponse<Order>>(`/orders/${orderId}`);
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all open orders
 */
export const getOpenOrders = async (): Promise<Order[]> => {
  if (USE_MOCK_API) {
    await mockDelay(300);
    return [];
  }

  try {
    const response = await tradingApiClient.get<ApiResponse<Order[]>>('/orders/open');
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Order history filters (moved to types file to avoid export conflict)
 */
interface OrderHistoryFiltersApi {
  symbol?: string;
  side?: OrderSide;
  type?: OrderType;
  status?: OrderStatus;
  startDate?: number;
  endDate?: number;
}

/**
 * Generate mock order history
 */
const generateMockOrderHistory = (filters: OrderHistoryFiltersApi): Order[] => {
  const orders: Order[] = [];
  const statuses = [OrderStatus.FILLED, OrderStatus.CANCELED, OrderStatus.REJECTED];
  const symbols: TradingPair[] = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'];
  const sides = [OrderSide.BUY, OrderSide.SELL];
  const types = [OrderType.MARKET, OrderType.LIMIT];

  // Generate 50 mock historical orders
  for (let i = 0; i < 50; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = sides[Math.floor(Math.random() * sides.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const basePrice = symbol === 'BTC_TRY' ? 850000 : symbol === 'ETH_TRY' ? 45000 : 28;
    const price = type === OrderType.LIMIT ? (basePrice + (Math.random() - 0.5) * basePrice * 0.02).toFixed(2) : '0';
    const quantity = (Math.random() * 0.5 + 0.01).toFixed(8);
    const executedQty = status === OrderStatus.FILLED ? quantity : status === OrderStatus.CANCELED ? '0' : (Math.random() * parseFloat(quantity)).toFixed(8);
    const commission = status === OrderStatus.FILLED ? (parseFloat(price) * parseFloat(quantity) * 0.002).toFixed(2) : '0';
    const createdAt = Date.now() - i * 3600000; // 1 hour intervals

    orders.push({
      orderId: `order-hist-${Date.now()}-${i}`,
      symbol,
      clientOrderId: `client-${Date.now()}-${i}`,
      side,
      type,
      timeInForce: TimeInForce.GTC,
      quantity,
      price,
      status,
      executedQty,
      cummulativeQuoteQty: (parseFloat(price) * parseFloat(executedQty)).toFixed(2),
      fills: status === OrderStatus.FILLED ? [{
        price,
        quantity: executedQty,
        commission,
        commissionAsset: symbol.split('_')[1],
        tradeId: `trade-${Date.now()}-${i}`,
      }] : [],
      createdAt,
      updatedAt: createdAt + 1000,
    });
  }

  return orders;
};

/**
 * Get order history with filters
 * @param filters - Optional filters for order history
 */
export const getOrderHistory = async (
  filters: OrderHistoryFiltersApi = {}
): Promise<Order[]> => {
  if (USE_MOCK_API) {
    await mockDelay(500);
    let orders = generateMockOrderHistory(filters);

    // Apply filters
    if (filters.symbol) {
      orders = orders.filter(o => o.symbol === filters.symbol);
    }
    if (filters.side) {
      orders = orders.filter(o => o.side === filters.side);
    }
    if (filters.type) {
      orders = orders.filter(o => o.type === filters.type);
    }
    if (filters.status) {
      orders = orders.filter(o => o.status === filters.status);
    }
    if (filters.startDate) {
      orders = orders.filter(o => o.createdAt >= filters.startDate!);
    }
    if (filters.endDate) {
      orders = orders.filter(o => o.createdAt <= filters.endDate!);
    }

    return orders;
  }

  try {
    const response = await tradingApiClient.get<ApiResponse<Order[]>>(
      '/orders/history',
      {
        params: {
          symbol: filters.symbol,
          side: filters.side,
          type: filters.type,
          status: filters.status,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate mock user trade history with P&L calculations
 */
const generateMockTradeHistory = (filters: TradeHistoryFilters): TradeHistoryResponse => {
  const trades: ExecutedTrade[] = [];
  const symbols: TradingPair[] = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'];
  const sides = [OrderSide.BUY, OrderSide.SELL];
  const types = [OrderType.MARKET, OrderType.LIMIT];

  // Generate 30 mock executed trades with pairs (buy/sell) for realistic P&L
  for (let i = 0; i < 15; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const basePrice = symbol === 'BTC_TRY' ? 2800000 : symbol === 'ETH_TRY' ? 150000 : 28;
    const quantity = parseFloat((Math.random() * 0.5 + 0.1).toFixed(8));
    const buyPrice = basePrice + (Math.random() - 0.5) * basePrice * 0.02;
    const sellPrice = buyPrice + (Math.random() - 0.3) * basePrice * 0.03; // Can be profit or loss
    const buyType = types[Math.floor(Math.random() * types.length)];
    const sellType = types[Math.floor(Math.random() * types.length)];

    // Buy trade
    const buyTotalValue = buyPrice * quantity;
    const buyFee = buyTotalValue * 0.002; // 0.2% fee
    const buyExecutedAt = Date.now() - i * 7200000 - 3600000; // 2 hours apart, buy first

    // Sell trade
    const sellTotalValue = sellPrice * quantity;
    const sellFee = sellTotalValue * 0.002;
    const sellExecutedAt = Date.now() - i * 7200000; // After buy

    // Calculate P&L for the sell trade
    const pnl = (sellPrice - buyPrice) * quantity - (buyFee + sellFee);
    const pnlPercent = (pnl / (buyPrice * quantity)) * 100;

    // Add buy trade
    trades.push({
      tradeId: `trade-buy-${Date.now()}-${i}`,
      symbol,
      side: OrderSide.BUY,
      type: buyType,
      price: buyPrice,
      quantity,
      totalValue: buyTotalValue,
      fee: buyFee,
      orderId: `order-buy-${Date.now()}-${i}`,
      counterOrderId: `counter-sell-${Date.now()}-${i}`,
      executedAt: buyExecutedAt,
    });

    // Add sell trade with P&L
    trades.push({
      tradeId: `trade-sell-${Date.now()}-${i}`,
      symbol,
      side: OrderSide.SELL,
      type: sellType,
      price: sellPrice,
      quantity,
      totalValue: sellTotalValue,
      fee: sellFee,
      orderId: `order-sell-${Date.now()}-${i}`,
      counterOrderId: `counter-buy-${Date.now()}-${i}`,
      executedAt: sellExecutedAt,
      pnl,
      pnlPercent,
    });
  }

  // Sort by execution time (newest first)
  trades.sort((a, b) => b.executedAt - a.executedAt);

  // Calculate summary statistics
  const tradesWithPnl = trades.filter(t => t.pnl !== undefined);
  const totalPnl = tradesWithPnl.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const avgPnlPercent = tradesWithPnl.length > 0
    ? tradesWithPnl.reduce((sum, t) => sum + (t.pnlPercent || 0), 0) / tradesWithPnl.length
    : 0;
  const winningTrades = tradesWithPnl.filter(t => (t.pnl || 0) > 0).length;
  const winRate = tradesWithPnl.length > 0 ? (winningTrades / tradesWithPnl.length) * 100 : 0;

  return {
    trades,
    total: trades.length,
    page: 1,
    limit: 50,
    summary: {
      totalTrades: trades.length,
      totalPnl,
      avgPnlPercent,
      winRate,
    },
  };
};

/**
 * Get user's executed trade history with P&L calculations
 * @param filters - Optional filters for trade history
 */
export const getUserTradeHistory = async (
  filters: TradeHistoryFilters = {}
): Promise<TradeHistoryResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(500);
    let response = generateMockTradeHistory(filters);

    // Apply filters
    let filteredTrades = response.trades;

    if (filters.symbol) {
      filteredTrades = filteredTrades.filter(t => t.symbol === filters.symbol);
    }
    if (filters.side) {
      filteredTrades = filteredTrades.filter(t => t.side === filters.side);
    }
    if (filters.startDate) {
      filteredTrades = filteredTrades.filter(t => t.executedAt >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredTrades = filteredTrades.filter(t => t.executedAt <= filters.endDate!);
    }

    // Recalculate summary for filtered trades
    const tradesWithPnl = filteredTrades.filter(t => t.pnl !== undefined);
    const totalPnl = tradesWithPnl.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgPnlPercent = tradesWithPnl.length > 0
      ? tradesWithPnl.reduce((sum, t) => sum + (t.pnlPercent || 0), 0) / tradesWithPnl.length
      : 0;
    const winningTrades = tradesWithPnl.filter(t => (t.pnl || 0) > 0).length;
    const winRate = tradesWithPnl.length > 0 ? (winningTrades / tradesWithPnl.length) * 100 : 0;

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedTrades = filteredTrades.slice(start, end);

    return {
      trades: paginatedTrades,
      total: filteredTrades.length,
      page,
      limit,
      summary: {
        totalTrades: filteredTrades.length,
        totalPnl,
        avgPnlPercent,
        winRate,
      },
    };
  }

  try {
    const response = await tradingApiClient.get<ApiResponse<TradeHistoryResponse>>(
      '/trades/user',
      {
        params: {
          symbol: filters.symbol,
          side: filters.side,
          startDate: filters.startDate,
          endDate: filters.endDate,
          page: filters.page || 1,
          limit: filters.limit || 50,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

export default {
  getOrderBook,
  getTicker,
  getRecentTrades,
  placeOrder,
  cancelOrder,
  getOpenOrders,
  getOrderHistory,
  getUserTradeHistory,
};
