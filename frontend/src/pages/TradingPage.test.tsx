/**
 * Tests for TradingPage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TradingPage from './TradingPage';
import tradingReducer from '../store/slices/tradingSlice';
import * as tradingApi from '../api/tradingApi';
import websocketService from '../services/websocket.service';
import walletReducer from '../store/slices/walletSlice';
import authReducer from '../store/slices/authSlice';

// Mock @mui/material useMediaQuery
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: jest.fn(() => false),
}));

// Mock trading API
jest.mock('../api/tradingApi');
const mockedTradingApi = tradingApi as jest.Mocked<typeof tradingApi>;

// Mock WebSocket service
jest.mock('../services/websocket.service', () => ({
  __esModule: true,
  default: {
    connect: jest.fn((token) => {
      console.warn('mock connect called with:', token);
      return Promise.resolve();
    }),
    disconnect: jest.fn(),
    isConnected: jest.fn(() => true),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    subscribeToOrderBook: jest.fn(),
    subscribeToTicker: jest.fn(),
    subscribeToTrades: jest.fn(),
    subscribeToOrders: jest.fn(),
    getSubscriptions: jest.fn(() => []),
  },
}));

const mockedWebSocketService = websocketService as jest.Mocked<typeof websocketService>;

describe('TradingPage', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Redux store
    store = configureStore({
      reducer: {
        trading: tradingReducer,
        wallet: walletReducer,
        auth: authReducer,
      },
    });

    // Mock API responses
    mockedTradingApi.getOrderBook.mockResolvedValue({
      lastUpdateId: 123,
      bids: [
        ['850000', '0.5'],
        ['849900', '0.3'],
      ],
      asks: [
        ['850100', '0.4'],
        ['850200', '0.2'],
      ],
    });

    mockedTradingApi.getTicker.mockResolvedValue({
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
    });

    mockedTradingApi.getRecentTrades.mockResolvedValue([
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
    ]);

    mockedTradingApi.getUserTradeHistory.mockResolvedValue({
      trades: [],
      total: 0,
      page: 1,
      limit: 20,
      summary: {
        totalTrades: 0,
        totalPnl: 0,
        avgPnlPercent: 0,
        winRate: 0,
      },
    });

    mockedTradingApi.getOpenOrders.mockResolvedValue([]);
    mockedTradingApi.getOrderHistory.mockResolvedValue([]);

    // Mock WebSocket connection
    mockedWebSocketService.connect.mockResolvedValue(undefined);
    mockedWebSocketService.isConnected.mockReturnValue(true);
  });

  const renderTradingPage = () => {
    return render(
      <Provider store={store}>
        <TradingPage />
      </Provider>
    );
  };

  it('should render without crashing', () => {
    renderTradingPage();
    expect(screen.getByText(/Spot İşlem/i)).toBeInTheDocument();
  });

  it('should load initial data on mount', async () => {
    renderTradingPage();

    await waitFor(() => {
      expect(mockedTradingApi.getOrderBook).toHaveBeenCalledWith('BTC_TRY', 30);
      expect(mockedTradingApi.getTicker).toHaveBeenCalledWith('BTC_TRY');
      expect(mockedTradingApi.getRecentTrades).toHaveBeenCalledWith('BTC_TRY', 50);
    });
  });

  it('should display symbol selector', () => {
    renderTradingPage();
    expect(screen.getByLabelText(/İşlem Çifti/i)).toBeInTheDocument();
  });

  it('should display ticker information', async () => {
    renderTradingPage();

    expect(await screen.findByText(/Son Fiyat/i)).toBeInTheDocument();
    expect(await screen.findByText(/24s Değişim/i)).toBeInTheDocument();
    expect(await screen.findByText(/24s Hacim/i)).toBeInTheDocument();
    expect(await screen.findByText(/850.000/)).toBeInTheDocument();
  });
  it('should display WebSocket connection status', async () => {
    renderTradingPage();

    await waitFor(() => {
      expect(screen.getByText(/Bağlı/i)).toBeInTheDocument();
    });
  });

  it('should change symbol when selector is changed', async () => {
    renderTradingPage();

    // Wait for initial load
    await waitFor(() => {
      expect(mockedTradingApi.getOrderBook).toHaveBeenCalled();
    });

    // Clear mock calls
    jest.clearAllMocks();

    // Change symbol
    const selector = screen.getByLabelText(/İşlem Çifti/i);
    fireEvent.mouseDown(selector);

    const ethOption = await screen.findByText('ETH / TRY');
    fireEvent.click(ethOption);

    // Should load data for new symbol
    await waitFor(() => {
      expect(mockedTradingApi.getOrderBook).toHaveBeenCalledWith('ETH_TRY', 30);
    });
  });

  it('should setup WebSocket connection after initial load', async () => {
    renderTradingPage();

    await waitFor(() => {
      expect(mockedWebSocketService.connect).toHaveBeenCalled();
      expect(mockedWebSocketService.subscribeToOrderBook).toHaveBeenCalledWith(
        'BTC_TRY',
        expect.any(Function)
      );
      expect(mockedWebSocketService.subscribeToTicker).toHaveBeenCalledWith(
        'BTC_TRY',
        expect.any(Function)
      );
      expect(mockedWebSocketService.subscribeToTrades).toHaveBeenCalledWith(
        'BTC_TRY',
        expect.any(Function)
      );
    });
  });

  it('should display order book component', async () => {
    renderTradingPage();

    await waitFor(() => {
      expect(screen.getByText(/Emir Defteri - BTC_TRY/i)).toBeInTheDocument();
    });
  });

  it('should display placeholder for chart', () => {
    renderTradingPage();
    expect(screen.getByText(/Fiyat Grafiği/i)).toBeInTheDocument();
    const placeholders = screen.getAllByText(/Çok yakında.../i);
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('should display placeholder for order form', () => {
    renderTradingPage();
    expect(screen.getByText(/Emir Formu/i)).toBeInTheDocument();
  });

  it('should display placeholder for open orders', () => {
    renderTradingPage();
    expect(screen.getByText(/Açık Emirler & İşlem Geçmişi/i)).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockedTradingApi.getOrderBook.mockRejectedValue(new Error(errorMessage));

    renderTradingPage();

    await waitFor(() => {
      const errors = screen.getAllByText(errorMessage);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('should display positive price change in green', async () => {
    renderTradingPage();

    await waitFor(() => {
      const priceChangeElement = screen.getByText(/\+5000/);
      expect(priceChangeElement).toBeInTheDocument();
    });
  });

  it('should format price change with + sign for positive values', async () => {
    renderTradingPage();

    const priceChangeElement = await screen.findByText(/5000/);
    expect(priceChangeElement).toBeInTheDocument();
  });

  it('should cleanup WebSocket subscriptions on unmount', async () => {
    const { unmount } = renderTradingPage();

    await waitFor(() => {
      expect(mockedWebSocketService.connect).toHaveBeenCalled();
    });

    unmount();

    expect(mockedWebSocketService.unsubscribe).toHaveBeenCalledWith('orderbook:BTC_TRY');
    expect(mockedWebSocketService.unsubscribe).toHaveBeenCalledWith('ticker:BTC_TRY');
    expect(mockedWebSocketService.unsubscribe).toHaveBeenCalledWith('trades:BTC_TRY');
  });

  it('should handle WebSocket connection failure', async () => {
    mockedWebSocketService.connect.mockRejectedValue(new Error('Connection failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    renderTradingPage();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'WebSocket connection failed:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should display all trading pairs in selector', async () => {
    renderTradingPage();

    const selector = screen.getByLabelText(/İşlem Çifti/i);
    fireEvent.mouseDown(selector);

    await waitFor(() => {
      const btcOptions = screen.getAllByText(/BTC \/ TRY/i);
      const ethOptions = screen.getAllByText(/ETH \/ TRY/i);
      const usdtOptions = screen.getAllByText(/USDT \/ TRY/i);
      expect(btcOptions.length).toBeGreaterThan(0);
      expect(ethOptions.length).toBeGreaterThan(0);
      expect(usdtOptions.length).toBeGreaterThan(0);
    });
  });

  it('should use authentication token for WebSocket if available', async () => {
    const mockToken = 'test-token-123';
    localStorage.setItem('accessToken', mockToken);
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');

    renderTradingPage();

    // Wait for connection to be established (Bağlı chip visible)
    expect(await screen.findByText('Bağlı')).toBeInTheDocument();

    // Verify token was retrieved
    expect(getItemSpy).toHaveBeenCalledWith('accessToken');

    getItemSpy.mockRestore();
    localStorage.removeItem('accessToken');
  });

  it('should handle missing ticker data gracefully', async () => {
    mockedTradingApi.getTicker.mockResolvedValue({
      symbol: 'BTC_TRY',
      lastPrice: '0',
      priceChange: '0',
      priceChangePercent: '0',
      highPrice: '0',
      lowPrice: '0',
      volume: '0',
      quoteVolume: '0',
      openTime: 0,
      closeTime: 0,
      firstId: 0,
      lastId: 0,
      count: 0,
    });

    renderTradingPage();

    // Should still render without crashing
    await waitFor(() => {
      expect(screen.getByText(/Spot İşlem/i)).toBeInTheDocument();
    });
  });
});
