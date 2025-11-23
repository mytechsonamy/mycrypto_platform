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
 * Get order history
 * @param page - Page number (default: 1)
 * @param limit - Number of orders per page (default: 50)
 */
export const getOrderHistory = async (
  page: number = 1,
  limit: number = 50
): Promise<{ orders: Order[]; total: number; page: number; totalPages: number }> => {
  if (USE_MOCK_API) {
    await mockDelay(300);
    return {
      orders: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
  }

  try {
    const response = await tradingApiClient.get<
      ApiResponse<{ orders: Order[]; total: number; page: number; totalPages: number }>
    >('/orders/history', {
      params: { page, limit },
    });
    return response.data.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get trade history
 * @param page - Page number (default: 1)
 * @param limit - Number of trades per page (default: 50)
 */
export const getTradeHistory = async (
  page: number = 1,
  limit: number = 50
): Promise<{ trades: TradesResponse; total: number; page: number; totalPages: number }> => {
  if (USE_MOCK_API) {
    await mockDelay(300);
    return {
      trades: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
  }

  try {
    const response = await tradingApiClient.get<
      ApiResponse<{ trades: TradesResponse; total: number; page: number; totalPages: number }>
    >('/trades', {
      params: { page, limit },
    });
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
  getTradeHistory,
};
