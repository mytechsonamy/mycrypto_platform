/**
 * Price Alert Manager Component Tests
 * Comprehensive test coverage for alert management interface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PriceAlertManager from './PriceAlertManager';
import alertsReducer from '../../store/slices/alertsSlice';
import tradingReducer from '../../store/slices/tradingSlice';
import {
  AlertCondition,
  AlertStatus,
  NotificationType,
  PriceAlert,
} from '../../types/alerts.types';

// Mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      alerts: alertsReducer,
      trading: tradingReducer,
    },
    preloadedState: {
      alerts: {
        alerts: [],
        triggeredAlerts: [],
        loading: false,
        error: null,
        editingAlertId: null,
        ...initialState.alerts,
      },
      trading: {
        tickers: {
          BTC_TRY: {
            symbol: 'BTC_TRY',
            lastPrice: '1500000.00',
            priceChange: '50000.00',
            priceChangePercent: '3.45',
            highPrice: '1550000.00',
            lowPrice: '1450000.00',
            volume: '100.00',
            quoteVolume: '150000000.00',
            openTime: Date.now() - 86400000,
            closeTime: Date.now(),
            firstId: 1,
            lastId: 100,
            count: 100,
          },
          ETH_TRY: {
            symbol: 'ETH_TRY',
            lastPrice: '75000.00',
            priceChange: '2000.00',
            priceChangePercent: '2.74',
            highPrice: '76000.00',
            lowPrice: '73000.00',
            volume: '500.00',
            quoteVolume: '37500000.00',
            openTime: Date.now() - 86400000,
            closeTime: Date.now(),
            firstId: 1,
            lastId: 200,
            count: 200,
          },
        },
        orderBook: {
          BTC_TRY: {
            bids: [],
            asks: [],
            spread: '0',
            spreadPercent: '0',
            lastUpdateId: 0,
            symbol: 'BTC_TRY',
          },
        },
        recentTrades: {},
        orders: [],
        openOrders: [],
        orderHistory: [],
        executedTrades: [],
        tradeHistory: {
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
        },
        loading: false,
        error: null,
        selectedSymbol: 'BTC_TRY',
        selectedOrderType: 'LIMIT',
        ...initialState.trading,
      },
    },
  });
};

describe('PriceAlertManager', () => {
  it('renders all main sections', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Check statistics cards
    expect(screen.getByText('Aktif Uyarılar')).toBeInTheDocument();
    expect(screen.getByText('Tetiklenen')).toBeInTheDocument();
    expect(screen.getByText('Pasif Uyarılar')).toBeInTheDocument();

    // Check tabs
    expect(screen.getByText('Aktif Uyarılar')).toBeInTheDocument();
    expect(screen.getByText('Geçmiş')).toBeInTheDocument();

    // Check create form
    expect(screen.getByText('Yeni Fiyat Uyarısı Oluştur')).toBeInTheDocument();
  });

  it('displays correct statistics', () => {
    const mockAlerts: PriceAlert[] = [
      {
        id: 'alert-1',
        symbol: 'BTC_TRY',
        condition: AlertCondition.ABOVE,
        price: 1600000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      },
      {
        id: 'alert-2',
        symbol: 'ETH_TRY',
        condition: AlertCondition.BELOW,
        price: 70000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.ACTIVE,
        createdAt: Date.now(),
      },
      {
        id: 'alert-3',
        symbol: 'BTC_TRY',
        condition: AlertCondition.ABOVE,
        price: 1550000,
        notificationType: NotificationType.EMAIL,
        status: AlertStatus.INACTIVE,
        createdAt: Date.now(),
      },
    ];

    const store = createMockStore({
      alerts: {
        alerts: mockAlerts,
        triggeredAlerts: [],
        loading: false,
        error: null,
        editingAlertId: null,
      },
    });

    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Check active alerts count (2)
    const activeCards = screen.getAllByText('2');
    expect(activeCards.length).toBeGreaterThan(0);

    // Check inactive alerts count (1)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows empty state when no alerts', () => {
    const store = createMockStore({
      alerts: {
        alerts: [],
        triggeredAlerts: [],
        loading: false,
        error: null,
        editingAlertId: null,
      },
    });

    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    expect(
      screen.getByText(/Henüz aktif uyarınız bulunmamaktadır/i)
    ).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Initially on active alerts tab
    expect(screen.getByText('Yeni Fiyat Uyarısı Oluştur')).toBeInTheDocument();

    // Click on history tab
    const historyTab = screen.getByRole('tab', { name: /Geçmiş/i });
    fireEvent.click(historyTab);

    // Should show history content
    // (Note: AlertHistory component shows its own content)
  });

  it('displays current prices from tickers', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Current price should be displayed in the form
    expect(screen.getByText(/Güncel Fiyat: 1.500.000 TRY/i)).toBeInTheDocument();
  });

  it('handles create alert flow', async () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Fill out the form
    const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
    fireEvent.change(priceInput, { target: { value: '1600000' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
    fireEvent.click(submitButton);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/başarıyla oluşturuldu/i)).toBeInTheDocument();
    });
  });

  it('displays error message in snackbar', async () => {
    const store = createMockStore({
      alerts: {
        alerts: [],
        triggeredAlerts: [],
        loading: false,
        error: 'Test error message',
        editingAlertId: null,
      },
    });

    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Error should be displayed in snackbar
    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    const store = createMockStore({
      alerts: {
        alerts: [],
        triggeredAlerts: [],
        loading: true,
        error: null,
        editingAlertId: null,
      },
    });

    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Loading state should be passed to child components
    expect(screen.getByRole('button', { name: /Uyarı Oluştur/i })).toBeDisabled();
  });

  it('displays triggered alerts in history tab', () => {
    const mockTriggeredAlerts = [
      {
        id: 'alert-1',
        symbol: 'BTC_TRY',
        condition: AlertCondition.ABOVE,
        price: 1600000,
        notificationType: NotificationType.BOTH,
        status: AlertStatus.TRIGGERED,
        createdAt: Date.now() - 86400000,
        currentPrice: 1610000,
        triggeredAt: Date.now(),
      },
    ];

    const store = createMockStore({
      alerts: {
        alerts: [],
        triggeredAlerts: mockTriggeredAlerts,
        loading: false,
        error: null,
        editingAlertId: null,
      },
    });

    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Switch to history tab
    const historyTab = screen.getByRole('tab', { name: /Geçmiş/i });
    fireEvent.click(historyTab);

    // Triggered alerts should be shown (content from AlertHistory component)
  });

  it('respects maximum alerts limit', () => {
    const maxAlerts = Array.from({ length: 10 }, (_, i) => ({
      id: `alert-${i}`,
      symbol: 'BTC_TRY',
      condition: AlertCondition.ABOVE,
      price: 1600000 + i * 1000,
      notificationType: NotificationType.BOTH,
      status: AlertStatus.ACTIVE,
      createdAt: Date.now(),
    }));

    const store = createMockStore({
      alerts: {
        alerts: maxAlerts,
        triggeredAlerts: [],
        loading: false,
        error: null,
        editingAlertId: null,
      },
    });

    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Warning about max alerts should be shown
    expect(screen.getByText(/Maksimum 10 aktif uyarı/i)).toBeInTheDocument();

    // Create button should be disabled
    expect(screen.getByRole('button', { name: /Uyarı Oluştur/i })).toBeDisabled();
  });

  it('closes snackbar when clicking close', async () => {
    const store = createMockStore({
      alerts: {
        alerts: [],
        triggeredAlerts: [],
        loading: false,
        error: 'Test error',
        editingAlertId: null,
      },
    });

    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Wait for snackbar to appear
    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    // Close the snackbar
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Snackbar should be closed
    await waitFor(() => {
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  it('renders responsive layout on mobile', () => {
    // Mock mobile viewport
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(max-width:600px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const store = createMockStore();
    render(
      <Provider store={store}>
        <PriceAlertManager />
      </Provider>
    );

    // Component should render without errors
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });
});
