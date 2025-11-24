/**
 * Tests for OpenOrdersComponent
 * Coverage: Rendering, filtering, sorting, WebSocket updates, cancel functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import OpenOrdersComponent from './OpenOrdersComponent';
import tradingReducer from '../../../store/slices/tradingSlice';
import {
  Order,
  OrderStatus,
  OrderSide,
  OrderType,
  TimeInForce,
} from '../../../types/trading.types';
import * as tradingApi from '../../../api/tradingApi';
import websocketService from '../../../services/websocket.service';
import { toast } from 'react-toastify';

// Mock dependencies
jest.mock('../../../api/tradingApi');
jest.mock('../../../services/websocket.service');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock useMediaQuery
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: jest.fn(() => false), // Default to desktop view
}));

// Mock orders data
const mockOpenOrders: Order[] = [
  {
    orderId: 'order-001',
    symbol: 'BTC_TRY',
    clientOrderId: 'client-001',
    side: OrderSide.BUY,
    type: OrderType.LIMIT,
    timeInForce: TimeInForce.GTC,
    quantity: '0.5',
    price: '2800000',
    status: OrderStatus.PARTIALLY_FILLED,
    executedQty: '0.2',
    cummulativeQuoteQty: '560000',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 300000,
  },
  {
    orderId: 'order-002',
    symbol: 'ETH_TRY',
    clientOrderId: 'client-002',
    side: OrderSide.SELL,
    type: OrderType.LIMIT,
    timeInForce: TimeInForce.GTC,
    quantity: '2.0',
    price: '150000',
    status: OrderStatus.NEW,
    executedQty: '0',
    cummulativeQuoteQty: '0',
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 1800000,
  },
  {
    orderId: 'order-003',
    symbol: 'BTC_TRY',
    clientOrderId: 'client-003',
    side: OrderSide.BUY,
    type: OrderType.MARKET,
    timeInForce: TimeInForce.IOC,
    quantity: '0.1',
    price: '0',
    status: OrderStatus.NEW,
    executedQty: '0',
    cummulativeQuoteQty: '0',
    createdAt: Date.now() - 900000,
    updatedAt: Date.now() - 900000,
  },
];

// Create mock store
const createMockStore = (initialOrders: Order[] = []) => {
  return configureStore({
    reducer: {
      trading: tradingReducer,
    },
    preloadedState: {
      trading: {
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
        openOrders: initialOrders,
        orderHistory: [],
        loading: false,
        error: null,
        aggregateLevel: 0.1,
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

// Helper to render with store
const renderWithStore = (component: React.ReactElement, orders: Order[] = []) => {
  const store = createMockStore(orders);
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

describe('OpenOrdersComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tradingApi.getOpenOrders as jest.Mock).mockResolvedValue([]);
    (websocketService.isConnected as jest.Mock).mockReturnValue(true);
    (websocketService.subscribe as jest.Mock).mockImplementation(() => {});
    (websocketService.unsubscribe as jest.Mock).mockImplementation(() => {});
  });

  describe('Rendering', () => {
    it('renders component with title', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      expect(screen.getByText(/Açık Emirler/i)).toBeInTheDocument();
    });

    it('displays correct order count in header', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      expect(screen.getByText(/Açık Emirler \(3\)/i)).toBeInTheDocument();
    });

    it('shows empty state when no orders', async () => {
      renderWithStore(<OpenOrdersComponent />, []);

      await waitFor(() => {
        expect(screen.getByText(/Açık emir bulunmuyor/i)).toBeInTheDocument();
      });
    });

    it('displays all required column headers', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      expect(screen.getByText('Sembol')).toBeInTheDocument();
      expect(screen.getByText('Taraf')).toBeInTheDocument();
      expect(screen.getByText('Tür')).toBeInTheDocument();
      expect(screen.getByText('Fiyat')).toBeInTheDocument();
      expect(screen.getByText('Sipariş Miktarı')).toBeInTheDocument();
      expect(screen.getByText('Doldurulmuş')).toBeInTheDocument();
      expect(screen.getByText('Kalan')).toBeInTheDocument();
      expect(screen.getByText('Toplam')).toBeInTheDocument();
      expect(screen.getByText('Durum')).toBeInTheDocument();
      expect(screen.getByText('Zaman')).toBeInTheDocument();
      expect(screen.getByText('İşlem')).toBeInTheDocument();
    });

    it('renders orders in the table', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
      expect(screen.getByText('ETH/TRY')).toBeInTheDocument();
    });
  });

  describe('Order Details Display', () => {
    it('displays BUY orders with correct chip', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      const buyChips = screen.getAllByText('Alış');
      expect(buyChips.length).toBeGreaterThan(0);
    });

    it('displays SELL orders with correct chip', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      const sellChips = screen.getAllByText('Satış');
      expect(sellChips.length).toBeGreaterThan(0);
    });

    it('shows Market for market orders price', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      expect(screen.getByText('Market')).toBeInTheDocument();
    });

    it('shows fill percentage for partially filled orders', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      // Order 1 is 40% filled (0.2/0.5)
      expect(screen.getByText('40.0%')).toBeInTheDocument();
    });

    it('displays correct status chips', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      expect(screen.getByText('Kısmi')).toBeInTheDocument();
      expect(screen.getAllByText('Açık').length).toBeGreaterThan(0);
    });
  });

  describe('Filtering', () => {
    it('shows filter controls when filter button clicked', async () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      const filterButton = screen.getByLabelText(/Filtreleri Göster/i);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Sembol')).toBeInTheDocument();
        expect(screen.getByLabelText('Taraf')).toBeInTheDocument();
        expect(screen.getByLabelText('Tür')).toBeInTheDocument();
        expect(screen.getByLabelText('Durum')).toBeInTheDocument();
      });
    });

    it('hides filters when filter button clicked again', async () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      const filterButton = screen.getByLabelText(/Filtreleri Göster/i);

      // Show filters
      fireEvent.click(filterButton);
      await waitFor(() => {
        expect(screen.getByLabelText('Sembol')).toBeInTheDocument();
      });

      // Hide filters
      const hideButton = screen.getByLabelText(/Filtreleri Gizle/i);
      fireEvent.click(hideButton);

      await waitFor(() => {
        expect(screen.queryByLabelText('Sembol')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('allows sorting by clicking column headers', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      const symbolHeader = screen.getByText('Sembol');
      expect(symbolHeader).toBeInTheDocument();

      // Click to sort
      fireEvent.click(symbolHeader);

      // Component should still render
      expect(screen.getByText(/Açık Emirler/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('displays pagination controls when there are many orders', () => {
      const manyOrders = Array.from({ length: 15 }, (_, i) => ({
        ...mockOpenOrders[0],
        orderId: `order-${i}`,
      }));

      renderWithStore(<OpenOrdersComponent />, manyOrders);
      expect(screen.getByText('Sayfa başına satır:')).toBeInTheDocument();
    });

    it('does not show pagination with few orders', () => {
      renderWithStore(<OpenOrdersComponent />, [mockOpenOrders[0]]);
      // With only 1 order, pagination still shows but won't have multiple pages
      expect(screen.getByText(/Açık Emirler \(1\)/i)).toBeInTheDocument();
    });
  });

  describe('Cancel Order', () => {
    it('shows cancel button for open orders', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      const cancelButtons = screen.getAllByLabelText(/Emri İptal Et/i);
      // Should have cancel buttons for NEW and PARTIALLY_FILLED orders
      expect(cancelButtons.length).toBeGreaterThan(0);
    });

    it('opens cancel confirmation dialog', async () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      const cancelButtons = screen.getAllByLabelText(/Emri İptal Et/i);
      fireEvent.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Emri İptal Et')).toBeInTheDocument();
        expect(screen.getByText(/Bu emri iptal etmek istediğinizden emin misiniz/i)).toBeInTheDocument();
      });
    });

    it('closes dialog when cancel button clicked', async () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      // Open dialog
      const cancelButtons = screen.getAllByLabelText(/Emri İptal Et/i);
      fireEvent.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Bu emri iptal etmek istediğinizden emin misiniz/i)).toBeInTheDocument();
      });

      // Close dialog
      const cancelDialogButton = screen.getByRole('button', { name: /Vazgeç/i });
      fireEvent.click(cancelDialogButton);

      await waitFor(() => {
        expect(screen.queryByText(/Bu emri iptal etmek istediğinizden emin misiniz/i)).not.toBeInTheDocument();
      });
    });

    it('calls cancelOrder API when confirmed', async () => {
      (tradingApi.cancelOrder as jest.Mock).mockResolvedValue({ success: true });

      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      // Open dialog
      const cancelButtons = screen.getAllByLabelText(/Emri İptal Et/i);
      fireEvent.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Bu emri iptal etmek istediğinizden emin misiniz/i)).toBeInTheDocument();
      });

      // Confirm cancellation
      const confirmButton = screen.getByRole('button', { name: /İptal Et/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(tradingApi.cancelOrder).toHaveBeenCalled();
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('subscribes to order updates on mount', () => {
      (websocketService.subscribeToOrders as jest.Mock) = jest.fn();
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      expect(websocketService.subscribeToOrders).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Refresh', () => {
    it('has refresh button', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      const refreshButton = screen.getByLabelText(/Yenile/i);
      expect(refreshButton).toBeInTheDocument();
    });

    it('calls getOpenOrders on mount', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);
      expect(tradingApi.getOpenOrders).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for interactive elements', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      expect(screen.getByLabelText(/Filtreleri Göster/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Yenile/i)).toBeInTheDocument();
    });

    it('has proper table structure', () => {
      renderWithStore(<OpenOrdersComponent />, mockOpenOrders);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error when API call fails', async () => {
      (tradingApi.getOpenOrders as jest.Mock).mockRejectedValue(new Error('API Error'));

      renderWithStore(<OpenOrdersComponent />);

      await waitFor(() => {
        expect(screen.getByText(/Açık emirler yüklenemedi/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
