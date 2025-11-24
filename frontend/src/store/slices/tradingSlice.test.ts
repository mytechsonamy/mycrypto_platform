/**
 * Tests for tradingSlice
 */

import tradingReducer, {
  setSelectedSymbol,
  setOrderBook,
  updateOrderBook,
  setTicker,
  setRecentTrades,
  addTrade,
  setLoading,
  setError,
  setAggregateLevel,
  setWsConnected,
  resetTradingState,
  TradingState,
} from './tradingSlice';
import { Trade, Ticker } from '../../types/trading.types';

describe('tradingSlice', () => {
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
  };

  it('should return the initial state', () => {
    expect(tradingReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('setSelectedSymbol', () => {
    it('should set the selected symbol', () => {
      const actual = tradingReducer(initialState, setSelectedSymbol('ETH_TRY'));
      expect(actual.selectedSymbol).toEqual('ETH_TRY');
    });

    it('should reset order book when symbol changes', () => {
      const stateWithData: TradingState = {
        ...initialState,
        orderBook: {
          bids: [['850000', '0.5', '425000'] as [string, string, string]],
          asks: [['850100', '0.3', '255030'] as [string, string, string]],
          spread: '100',
          spreadPercent: '0.01',
          lastUpdateId: 123,
        },
      };
      const actual = tradingReducer(stateWithData, setSelectedSymbol('ETH_TRY'));
      expect(actual.orderBook.bids).toEqual([]);
      expect(actual.orderBook.asks).toEqual([]);
      expect(actual.orderBook.lastUpdateId).toEqual(0);
    });
  });

  describe('setOrderBook', () => {
    it('should set order book with calculated spread', () => {
      const bids: [string, string][] = [
        ['850000', '0.5'],
        ['849900', '0.3'],
      ];
      const asks: [string, string][] = [
        ['850100', '0.4'],
        ['850200', '0.2'],
      ];

      const actual = tradingReducer(
        initialState,
        setOrderBook({ bids, asks, lastUpdateId: 123 })
      );

      expect(actual.orderBook.bids.length).toBeGreaterThan(0);
      expect(actual.orderBook.asks.length).toBeGreaterThan(0);
      expect(actual.orderBook.lastUpdateId).toEqual(123);
      expect(parseFloat(actual.orderBook.spread)).toBeGreaterThan(0);
      expect(actual.loading).toBe(false);
      expect(actual.error).toBeNull();
    });

    it('should limit to top 20 levels', () => {
      const bids: [string, string][] = Array.from({ length: 30 }, (_, i) => [
        (850000 - i * 100).toString(),
        '0.5',
      ]);
      const asks: [string, string][] = Array.from({ length: 30 }, (_, i) => [
        (850100 + i * 100).toString(),
        '0.5',
      ]);

      const actual = tradingReducer(
        initialState,
        setOrderBook({ bids, asks, lastUpdateId: 123 })
      );

      expect(actual.orderBook.bids.length).toBeLessThanOrEqual(20);
      expect(actual.orderBook.asks.length).toBeLessThanOrEqual(20);
    });
  });

  describe('updateOrderBook', () => {
    const stateWithOrderBook: TradingState = {
      ...initialState,
      orderBook: {
        bids: [
          ['850000', '0.5', '425000'] as [string, string, string],
          ['849900', '0.3', '254970'] as [string, string, string],
        ],
        asks: [
          ['850100', '0.4', '340040'] as [string, string, string],
          ['850200', '0.2', '170040'] as [string, string, string],
        ],
        spread: '100',
        spreadPercent: '0.01',
        lastUpdateId: 100,
      },
    };

    it('should update existing price level', () => {
      const actual = tradingReducer(
        stateWithOrderBook,
        updateOrderBook({
          bids: [['850000', '1.0']],
          asks: [],
          lastUpdateId: 101,
        })
      );

      expect(actual.orderBook.lastUpdateId).toEqual(101);
    });

    it('should remove price level when quantity is 0', () => {
      const actual = tradingReducer(
        stateWithOrderBook,
        updateOrderBook({
          bids: [['850000', '0']],
          asks: [],
          lastUpdateId: 101,
        })
      );

      const hasPriceLevel = actual.orderBook.bids.some(([price]) => price === '850000');
      expect(hasPriceLevel).toBe(false);
    });

    it('should skip update if lastUpdateId is older', () => {
      const actual = tradingReducer(
        stateWithOrderBook,
        updateOrderBook({
          bids: [['850000', '999']],
          asks: [],
          lastUpdateId: 99,
        })
      );

      expect(actual.orderBook.lastUpdateId).toEqual(100);
    });
  });

  describe('setTicker', () => {
    it('should set ticker data', () => {
      const ticker: Ticker = {
        symbol: 'BTC_TRY',
        lastPrice: '850000',
        priceChange: '5000',
        priceChangePercent: '0.59',
        highPrice: '855000',
        lowPrice: '840000',
        volume: '123.45',
        quoteVolume: '104925000',
        openTime: Date.now() - 86400000,
        closeTime: Date.now(),
        firstId: 1,
        lastId: 1000,
        count: 1000,
      };

      const actual = tradingReducer(initialState, setTicker(ticker));

      expect(actual.ticker).toEqual({
        lastPrice: '850000',
        priceChange: '5000',
        priceChangePercent: '0.59',
        highPrice: '855000',
        lowPrice: '840000',
        volume: '123.45',
        quoteVolume: '104925000',
      });
    });
  });

  describe('setRecentTrades', () => {
    it('should set recent trades', () => {
      const trades: Trade[] = [
        {
          id: '1',
          symbol: 'BTC_TRY',
          price: '850000',
          quantity: '0.5',
          quoteQuantity: '425000',
          time: Date.now(),
          isBuyerMaker: true,
          isBestMatch: true,
        },
      ];

      const actual = tradingReducer(initialState, setRecentTrades(trades));
      expect(actual.recentTrades).toEqual(trades);
    });

    it('should limit to 50 trades', () => {
      const trades: Trade[] = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        symbol: 'BTC_TRY',
        price: '850000',
        quantity: '0.5',
        quoteQuantity: '425000',
        time: Date.now(),
        isBuyerMaker: true,
        isBestMatch: true,
      }));

      const actual = tradingReducer(initialState, setRecentTrades(trades));
      expect(actual.recentTrades.length).toBe(50);
    });
  });

  describe('addTrade', () => {
    it('should add new trade to the beginning', () => {
      const existingTrades: Trade[] = [
        {
          id: '1',
          symbol: 'BTC_TRY',
          price: '850000',
          quantity: '0.5',
          quoteQuantity: '425000',
          time: Date.now() - 1000,
          isBuyerMaker: true,
          isBestMatch: true,
        },
      ];

      const stateWithTrades = { ...initialState, recentTrades: existingTrades };

      const newTrade: Trade = {
        id: '2',
        symbol: 'BTC_TRY',
        price: '850100',
        quantity: '0.3',
        quoteQuantity: '255030',
        time: Date.now(),
        isBuyerMaker: false,
        isBestMatch: true,
      };

      const actual = tradingReducer(stateWithTrades, addTrade(newTrade));
      expect(actual.recentTrades[0]).toEqual(newTrade);
      expect(actual.recentTrades.length).toBe(2);
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      const actual = tradingReducer(initialState, setLoading(true));
      expect(actual.loading).toBe(true);
    });
  });

  describe('setError', () => {
    it('should set error state', () => {
      const actual = tradingReducer(initialState, setError('Test error'));
      expect(actual.error).toBe('Test error');
      expect(actual.loading).toBe(false);
    });
  });

  describe('setAggregateLevel', () => {
    it('should set aggregate level', () => {
      const actual = tradingReducer(initialState, setAggregateLevel(0.5));
      expect(actual.aggregateLevel).toBe(0.5);
    });
  });

  describe('setWsConnected', () => {
    it('should set WebSocket connection status', () => {
      const actual = tradingReducer(initialState, setWsConnected(true));
      expect(actual.wsConnected).toBe(true);
    });
  });

  describe('resetTradingState', () => {
    it('should reset to initial state', () => {
      const modifiedState = {
        ...initialState,
        selectedSymbol: 'ETH_TRY' as const,
        loading: true,
        error: 'Test error',
      };

      const actual = tradingReducer(modifiedState, resetTradingState());
      expect(actual).toEqual(initialState);
    });
  });
});
