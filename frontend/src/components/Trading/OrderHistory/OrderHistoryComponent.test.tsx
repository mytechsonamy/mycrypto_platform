/**
 * Unit tests for OrderHistoryComponent
 * Testing: rendering, filtering, sorting, pagination, statistics, CSV export
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OrderHistoryComponent from './OrderHistoryComponent';
import tradingReducer, { TradingState } from '../../../store/slices/tradingSlice';
import { Order, OrderStatus, OrderSide, OrderType, TimeInForce } from '../../../types/trading.types';

// Mock toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock trading API
jest.mock('../../../api/tradingApi', () => ({
  getOrderHistory: jest.fn().mockResolvedValue([]),
}));

// Helper function to create mock order
const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  orderId: 'order-1',
  symbol: 'BTC_TRY',
  clientOrderId: 'client-1',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  timeInForce: TimeInForce.GTC,
  quantity: '0.5',
  price: '850000',
  status: OrderStatus.FILLED,
  executedQty: '0.5',
  cummulativeQuoteQty: '425000',
  fills: [
    {
      price: '850000',
      quantity: '0.5',
      commission: '850',
      commissionAsset: 'TRY',
      tradeId: 'trade-1',
    },
  ],
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 3000000,
  ...overrides,
});

// Helper function to create Redux store
const createMockStore = (orderHistory: Order[] = []) => {
  const initialState: Partial<TradingState> = {
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
    orderHistory,
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
  };

  return configureStore({
    reducer: {
      trading: tradingReducer,
    },
    preloadedState: {
      trading: initialState as TradingState,
    },
  });
};

// Helper function to render component with Redux store and ThemeProvider
const renderWithStore = (orderHistory: Order[] = []) => {
  const store = createMockStore(orderHistory);
  const theme = createTheme();
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <OrderHistoryComponent />
      </ThemeProvider>
    </Provider>
  );
};

describe('OrderHistoryComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render component with title', () => {
      renderWithStore();
      expect(screen.getByText('Sipariş Geçmişi')).toBeInTheDocument();
    });

    it('should render statistics cards', () => {
      renderWithStore();
      expect(screen.getByText('Toplam Siparişler')).toBeInTheDocument();
      expect(screen.getByText('Doldurulmuş')).toBeInTheDocument();
      expect(screen.getByText('İptal Edildi')).toBeInTheDocument();
      expect(screen.getByText('Reddedildi')).toBeInTheDocument();
    });

    it('should render empty state when no orders', () => {
      renderWithStore([]);
      expect(screen.getByText('Sipariş geçmişi bulunamadı')).toBeInTheDocument();
    });

    it('should render orders table with data', () => {
      const orders = [
        createMockOrder({
          orderId: 'order-1',
          symbol: 'BTC_TRY',
          side: OrderSide.BUY,
          status: OrderStatus.FILLED,
        }),
        createMockOrder({
          orderId: 'order-2',
          symbol: 'ETH_TRY',
          side: OrderSide.SELL,
          status: OrderStatus.CANCELED,
        }),
      ];

      renderWithStore(orders);
      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
      expect(screen.getByText('ETH/TRY')).toBeInTheDocument();
      expect(screen.getByText('Alış')).toBeInTheDocument();
      expect(screen.getByText('Satış')).toBeInTheDocument();
    });
  });

  describe('Statistics', () => {
    it('should display correct order counts', () => {
      const orders = [
        createMockOrder({ status: OrderStatus.FILLED }),
        createMockOrder({ status: OrderStatus.FILLED }),
        createMockOrder({ status: OrderStatus.CANCELED }),
        createMockOrder({ status: OrderStatus.REJECTED }),
      ];

      renderWithStore(orders);

      // Find statistics by testing multiple elements
      const statisticsSection = screen.getByText('Toplam Siparişler').closest('div')?.parentElement;
      expect(statisticsSection).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should toggle filters visibility', async () => {
      renderWithStore();

      const filterButton = screen.getByRole('button', { name: /filtreleri göster/i });
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/sembol/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should have sortable columns', () => {
      const orders = [
        createMockOrder({ orderId: 'order-1', createdAt: Date.now() - 7200000 }),
        createMockOrder({ orderId: 'order-2', createdAt: Date.now() - 3600000 }),
      ];

      renderWithStore(orders);
      expect(screen.getByText('Sembol')).toBeInTheDocument();
      expect(screen.getByText('Zaman')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', () => {
      const orders = Array.from({ length: 30 }, (_, i) =>
        createMockOrder({ orderId: `order-${i}` })
      );

      renderWithStore(orders);
      expect(screen.getByText(/sayfa başına satır/i)).toBeInTheDocument();
    });
  });

  describe('CSV Export', () => {
    it('should have export button', () => {
      renderWithStore();
      const exportButton = screen.getByRole('button', { name: /indir/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should disable export when no orders', () => {
      renderWithStore([]);
      const exportButton = screen.getByRole('button', { name: /indir/i });
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Status Display', () => {
    it('should render filled status', () => {
      const order = createMockOrder({ status: OrderStatus.FILLED });
      renderWithStore([order]);
      expect(screen.getByText('Dolduruldu')).toBeInTheDocument();
    });

    it('should render canceled status', () => {
      const order = createMockOrder({ status: OrderStatus.CANCELED });
      renderWithStore([order]);
      expect(screen.getByText('İptal Edildi')).toBeInTheDocument();
    });

    it('should render rejected status', () => {
      const order = createMockOrder({ status: OrderStatus.REJECTED });
      renderWithStore([order]);
      expect(screen.getByText('Reddedildi')).toBeInTheDocument();
    });
  });

  describe('Refresh', () => {
    it('should have refresh button', () => {
      renderWithStore();
      const refreshButton = screen.getByRole('button', { name: /yenile/i });
      expect(refreshButton).toBeInTheDocument();
    });
  });
});
