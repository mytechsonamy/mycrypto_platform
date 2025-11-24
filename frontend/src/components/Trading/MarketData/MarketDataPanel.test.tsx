/**
 * Tests for MarketDataPanel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MarketDataPanel from './MarketDataPanel';
import tradingReducer from '../../../store/slices/tradingSlice';

const createMockStore = (ticker: any = null, trades: any = []) => {
  return configureStore({
    reducer: {
      trading: tradingReducer,
    },
    preloadedState: {
      trading: {
        selectedSymbol: 'BTC_TRY' as any,
        orderBook: {
          bids: [],
          asks: [],
          spread: '0',
          spreadPercent: '0',
          lastUpdateId: 0,
        },
        ticker,
        recentTrades: trades,
        openOrders: [],
        orderHistory: [],
        loading: false,
        error: null,
        aggregateLevel: 0.1 as any,
        wsConnected: true,
        orderPlacement: {
          loading: false,
          error: null,
          lastOrderId: null,
        },
      },
    },
  });
};

const renderWithRedux = (component: React.ReactElement, store: any) => {
  return render(<Provider store={store}>{component}</Provider>);
};

describe('MarketDataPanel', () => {
  const mockTicker = {
    lastPrice: '850000.00',
    priceChange: '5000.00',
    priceChangePercent: '0.59',
    highPrice: '860000.00',
    lowPrice: '840000.00',
    volume: '100.5',
    quoteVolume: '85425000.00',
  };

  const mockTrades = [
    {
      id: 'trade-1',
      symbol: 'BTC_TRY',
      price: '850000.00',
      quantity: '0.5',
      quoteQuantity: '425000.00',
      time: Date.now(),
      isBuyerMaker: true,
      isBestMatch: true,
    },
    {
      id: 'trade-2',
      symbol: 'BTC_TRY',
      price: '849000.00',
      quantity: '0.3',
      quoteQuantity: '254700.00',
      time: Date.now() - 1000,
      isBuyerMaker: false,
      isBestMatch: true,
    },
  ];

  it('renders loading skeleton when loading', () => {
    const store = createMockStore();
    renderWithRedux(<MarketDataPanel loading={true} />, store);

    expect(screen.queryByText('Piyasa Verileri')).not.toBeInTheDocument();
  });

  it('renders market data when ticker is available', () => {
    const store = createMockStore(mockTicker);
    renderWithRedux(<MarketDataPanel />, store);

    expect(screen.getByText('Piyasa Verileri')).toBeInTheDocument();
    expect(screen.getByText(/850,000.00/)).toBeInTheDocument();
  });

  it('displays 24h statistics correctly', () => {
    const store = createMockStore(mockTicker);
    renderWithRedux(<MarketDataPanel />, store);

    expect(screen.getByText('24 Saatlik İstatistikler')).toBeInTheDocument();
    expect(screen.getByText('En Yüksek')).toBeInTheDocument();
    expect(screen.getByText('En Düşük')).toBeInTheDocument();
    expect(screen.getByText(/Hacim \(BTC\)/)).toBeInTheDocument();
    expect(screen.getByText(/Hacim \(TRY\)/)).toBeInTheDocument();
  });

  it('displays recent trades list', () => {
    const store = createMockStore(mockTicker, mockTrades);
    renderWithRedux(<MarketDataPanel />, store);

    expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
    expect(screen.getByText('Fiyat (TRY)')).toBeInTheDocument();
    expect(screen.getByText('Miktar (BTC)')).toBeInTheDocument();
  });

  it('shows empty state when no trades available', () => {
    const store = createMockStore(mockTicker, []);
    renderWithRedux(<MarketDataPanel />, store);

    expect(screen.getByText('Henüz işlem yok')).toBeInTheDocument();
  });

  it('displays price change with correct color', () => {
    const store = createMockStore(mockTicker);
    const { container } = renderWithRedux(<MarketDataPanel />, store);

    // Price should be green for positive change
    const priceElement = container.querySelector('[class*="MuiTypography-h4"]');
    expect(priceElement).toHaveStyle({ color: expect.stringContaining('success') });
  });

  it('displays negative price change correctly', () => {
    const negativeTicker = {
      ...mockTicker,
      priceChange: '-5000.00',
      priceChangePercent: '-0.59',
    };
    const store = createMockStore(negativeTicker);
    const { container } = renderWithRedux(<MarketDataPanel />, store);

    // Price should be red for negative change
    const priceElement = container.querySelector('[class*="MuiTypography-h4"]');
    expect(priceElement).toHaveStyle({ color: expect.stringContaining('error') });
  });
});
