/**
 * Tests for tradingApi
 */

// Mock axios BEFORE importing the module
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };

  return {
    create: jest.fn(() => mockAxiosInstance),
    isAxiosError: jest.fn(),
  };
});

import axios from 'axios';
import {
  getOrderBook,
  getTicker,
  getRecentTrades,
  placeOrder,
  cancelOrder,
  getOpenOrders,
  getOrderHistory,
  getTradeHistory,
} from './tradingApi';
import { OrderRequest, OrderSide, OrderType, TimeInForce } from '../types/trading.types';

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variable
const originalEnv = process.env;

describe('tradingApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, REACT_APP_USE_MOCK_TRADING_API: 'true' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getOrderBook', () => {
    it('should use mock data when USE_MOCK_TRADING_API is true', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const result = await getOrderBook('BTC_TRY', 20);

      expect(result.bids).toBeDefined();
      expect(result.asks).toBeDefined();
      expect(result.lastUpdateId).toBeDefined();
      expect(result.bids.length).toBeGreaterThan(0);
      expect(result.asks.length).toBeGreaterThan(0);
    });
  });

  describe('getTicker', () => {
    it('should use mock data when USE_MOCK_TRADING_API is true', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const result = await getTicker('BTC_TRY');

      expect(result.symbol).toBe('BTC_TRY');
      expect(result.lastPrice).toBeDefined();
      expect(result.priceChange).toBeDefined();
      expect(result.volume).toBeDefined();
    });
  });

  describe('getRecentTrades', () => {
    it('should use mock data when USE_MOCK_TRADING_API is true', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const result = await getRecentTrades('BTC_TRY', 50);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].symbol).toBe('BTC_TRY');
      expect(result[0].price).toBeDefined();
    });
  });

  describe('placeOrder', () => {
    it('should place order successfully in mock mode', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const orderRequest: OrderRequest = {
        symbol: 'BTC_TRY',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        timeInForce: TimeInForce.GTC,
        quantity: '0.001',
        price: '850000',
      };

      const result = await placeOrder(orderRequest);

      expect(result.orderId).toBeDefined();
      expect(result.symbol).toBe('BTC_TRY');
      expect(result.status).toBe('NEW');
    });

    it('should throw error for invalid quantity in mock mode', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const orderRequest: OrderRequest = {
        symbol: 'BTC_TRY',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: '0',
        price: '850000',
      };

      await expect(placeOrder(orderRequest)).rejects.toThrow(
        'Miktar sıfırdan büyük olmalıdır.'
      );
    });

    it('should throw error for limit order without price in mock mode', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const orderRequest: OrderRequest = {
        symbol: 'BTC_TRY',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: '0.001',
      };

      await expect(placeOrder(orderRequest)).rejects.toThrow(
        'Limit emir için fiyat gereklidir.'
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully in mock mode', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const result = await cancelOrder('order-123');

      expect(result.orderId).toBe('order-123');
      expect(result.status).toBe('CANCELED');
    });
  });

  describe('getOpenOrders', () => {
    it('should fetch open orders successfully in mock mode', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const result = await getOpenOrders();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getOrderHistory', () => {
    it('should fetch order history successfully in mock mode', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const result = await getOrderHistory(1, 50);

      expect(result.orders).toBeDefined();
      expect(result.page).toBe(1);
    });
  });

  describe('getTradeHistory', () => {
    it('should fetch trade history successfully in mock mode', async () => {
      process.env.REACT_APP_USE_MOCK_TRADING_API = 'true';

      const result = await getTradeHistory(1, 50);

      expect(result.trades).toBeDefined();
      expect(result.page).toBe(1);
    });
  });
});
