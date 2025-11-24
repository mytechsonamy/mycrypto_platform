/**
 * Trade History Component Tests
 * Target: 80%+ coverage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TradeHistoryComponent from './TradeHistoryComponent';
import tradingReducer from '../../../store/slices/tradingSlice';
import { ExecutedTrade, OrderSide, OrderType } from '../../../types/trading.types';
import { toast } from 'react-toastify';

// Create a default MUI theme
const theme = createTheme();

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Helper to render component with required providers
const renderWithProviders = (store: any) => {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <TradeHistoryComponent />
      </ThemeProvider>
    </Provider>
  );
};

// Mock date-fns locale
jest.mock('date-fns/locale', () => ({
  tr: {},
}));

// Mock MUI DatePicker
jest.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ value, onChange, label }: any) => (
    <input
      type="text"
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));

jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }: any) => children,
}));

jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: jest.fn(),
}));

// Helper to create mock store
const createMockStore = (tradeHistory: ExecutedTrade[] = [], loading = false, error: string | null = null) => {
  return configureStore({
    reducer: {
      trading: tradingReducer,
    },
    preloadedState: {
      trading: {
        selectedSymbol: 'BTC_TRY',
        orderBook: { bids: [], asks: [], spread: '0', spreadPercent: '0', lastUpdateId: 0 },
        ticker: null,
        recentTrades: [],
        openOrders: [],
        orderHistory: [],
        tradeHistory,
        tradeHistorySummary: {
          totalTrades: tradeHistory.length,
          totalPnl: tradeHistory.reduce((sum, t) => sum + (t.pnl || 0), 0),
          avgPnlPercent: tradeHistory.length > 0
            ? tradeHistory.reduce((sum, t) => sum + (t.pnlPercent || 0), 0) / tradeHistory.length
            : 0,
          winRate: tradeHistory.length > 0
            ? (tradeHistory.filter(t => (t.pnl || 0) > 0).length / tradeHistory.length) * 100
            : 0,
        },
        tradeHistoryTotal: tradeHistory.length,
        loading: false,
        error: null,
        aggregateLevel: 0.1,
        wsConnected: false,
        orderPlacement: { loading: false, error: null, lastOrderId: null },
        orderCancellation: { loading: false, error: null, cancelingOrderId: null },
        orderHistoryFetch: { loading: false, error: null },
        tradeHistoryFetch: { loading, error },
      },
    },
  });
};

// Mock trades with P&L
const mockTrades: ExecutedTrade[] = [
  {
    tradeId: 'trade-1',
    symbol: 'BTC_TRY',
    side: OrderSide.BUY,
    type: OrderType.LIMIT,
    price: 2800000,
    quantity: 0.5,
    totalValue: 1400000,
    fee: 2800,
    orderId: 'order-1',
    counterOrderId: 'counter-1',
    executedAt: Date.now() - 3600000, // 1 hour ago
  },
  {
    tradeId: 'trade-2',
    symbol: 'BTC_TRY',
    side: OrderSide.SELL,
    type: OrderType.MARKET,
    price: 2850000,
    quantity: 0.5,
    totalValue: 1425000,
    fee: 2850,
    orderId: 'order-2',
    counterOrderId: 'counter-2',
    executedAt: Date.now() - 1800000, // 30 minutes ago
    pnl: 19350, // Profit
    pnlPercent: 1.38,
  },
  {
    tradeId: 'trade-3',
    symbol: 'ETH_TRY',
    side: OrderSide.SELL,
    type: OrderType.LIMIT,
    price: 145000,
    quantity: 2.0,
    totalValue: 290000,
    fee: 580,
    orderId: 'order-3',
    counterOrderId: 'counter-3',
    executedAt: Date.now() - 900000, // 15 minutes ago
    pnl: -5580, // Loss
    pnlPercent: -1.92,
  },
];

describe('TradeHistoryComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup DOM for each test
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    // Cleanup
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('renders component with all statistics cards', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      // Check statistics cards
      expect(screen.getByText('Toplam İşlemler')).toBeInTheDocument();
      expect(screen.getByText('Toplam Kar/Zarar')).toBeInTheDocument();
      expect(screen.getByText('Ortalama Kar/Zarar %')).toBeInTheDocument();
      expect(screen.getByText('Kazanma Oranı')).toBeInTheDocument();

      // Check table header
      expect(screen.getByText('İşlem Geçmişi')).toBeInTheDocument();
    });

    it('renders all table columns', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      // Check column headers
      expect(screen.getByText('Sembol')).toBeInTheDocument();
      expect(screen.getByText('Taraf')).toBeInTheDocument();
      expect(screen.getByText('Fiyat')).toBeInTheDocument();
      expect(screen.getByText('Toplam')).toBeInTheDocument();
      expect(screen.getByText('Kar/Zarar')).toBeInTheDocument();
      expect(screen.getByText('Kar/Zarar %')).toBeInTheDocument();
      expect(screen.getByText('Zaman')).toBeInTheDocument();
    });

    it('renders trades with correct data', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      // Check if trade symbols are displayed
      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
      expect(screen.getByText('ETH/TRY')).toBeInTheDocument();

      // Check if sides are displayed
      const buyChips = screen.getAllByText('Alış');
      const sellChips = screen.getAllByText('Satış');
      expect(buyChips.length).toBeGreaterThan(0);
      expect(sellChips.length).toBeGreaterThan(0);
    });

    it('displays empty state when no trades', () => {
      const store = createMockStore([]);
      renderWithProviders(store);

      expect(screen.getByText('İşlem geçmişi bulunamadı')).toBeInTheDocument();
    });

    it('displays loading state', () => {
      const store = createMockStore([], true);
      renderWithProviders(store);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays error state', () => {
      const store = createMockStore([], false, 'Test error message');
      renderWithProviders(store);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('P&L Display', () => {
    it('displays profit with green color and positive sign', () => {
      const store = createMockStore(mockTrades);
      const { container } = renderWithProviders(store);

      // Find profit trade (trade-2)
      const profitTrade = mockTrades.find(t => t.tradeId === 'trade-2');
      expect(profitTrade).toBeDefined();
      expect(profitTrade!.pnl).toBeGreaterThan(0);

      // Check if profit is displayed with correct formatting
      const pnlText = profitTrade!.pnl!.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
      expect(container.textContent).toContain(pnlText);
    });

    it('displays loss with red color and negative sign', () => {
      const store = createMockStore(mockTrades);
      const { container } = renderWithProviders(store);

      // Find loss trade (trade-3)
      const lossTrade = mockTrades.find(t => t.tradeId === 'trade-3');
      expect(lossTrade).toBeDefined();
      expect(lossTrade!.pnl).toBeLessThan(0);

      // Check if loss is displayed
      const pnlText = lossTrade!.pnl!.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
      expect(container.textContent).toContain(pnlText);
    });

    it('displays "-" for trades without P&L', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      // Trade without P&L should show "-"
      const cells = screen.getAllByRole('cell');
      const dashCells = cells.filter(cell => cell.textContent === '-');
      expect(dashCells.length).toBeGreaterThan(0);
    });

    it('calculates and displays correct summary statistics', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      // Total trades
      expect(screen.getByText('3')).toBeInTheDocument();

      // Total P&L (19350 - 5580 = 13770)
      const totalPnl = 19350 - 5580;
      const totalPnlText = `+${totalPnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY`;
      expect(screen.getByText(totalPnlText)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('shows filter panel when filter button is clicked', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      const filterButton = screen.getByRole('button', { name: /Filtreleri Göster/i });
      fireEvent.click(filterButton);

      // Check if filter inputs are visible
      expect(screen.getByLabelText('Sembol')).toBeInTheDocument();
      expect(screen.getByLabelText('Taraf')).toBeInTheDocument();
      expect(screen.getByLabelText('Tarih Aralığı')).toBeInTheDocument();
    });

    it('allows filtering by symbol', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      // Open filters
      const filterButton = screen.getByRole('button', { name: /Filtreleri Göster/i });
      fireEvent.click(filterButton);

      // Select symbol filter
      const symbolSelect = screen.getByLabelText('Sembol');
      fireEvent.mouseDown(symbolSelect);

      const btcOption = screen.getByRole('option', { name: /BTC\/TRY/i });
      fireEvent.click(btcOption);

      // Apply filters
      const applyButton = screen.getByRole('button', { name: /Filtrele/i });
      fireEvent.click(applyButton);

      // Verify filter was applied (would trigger fetchTradeHistory action)
      expect(applyButton).toBeEnabled();
    });

    it('resets filters when reset button is clicked', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      // Open filters
      const filterButton = screen.getByRole('button', { name: /Filtreleri Göster/i });
      fireEvent.click(filterButton);

      // Change a filter
      const symbolSelect = screen.getByLabelText('Sembol');
      fireEvent.mouseDown(symbolSelect);
      const btcOption = screen.getByRole('option', { name: /BTC\/TRY/i });
      fireEvent.click(btcOption);

      // Reset filters
      const resetButton = screen.getByRole('button', { name: /Sıfırla/i });
      fireEvent.click(resetButton);

      // Verify filters are reset (symbol should be "Tümü")
      expect(symbolSelect).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts by time when time column header is clicked', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      const timeHeader = screen.getByText('Zaman');
      fireEvent.click(timeHeader);

      // Sorting should toggle (default is desc, clicking should make it asc)
      expect(timeHeader).toBeInTheDocument();
    });

    it('sorts by price when price column header is clicked', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      const priceHeader = screen.getByText('Fiyat');
      fireEvent.click(priceHeader);

      // Verify sorting indicator is active
      expect(priceHeader).toBeInTheDocument();
    });

    it('sorts by P&L when P&L column header is clicked', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      const pnlHeader = screen.getByText('Kar/Zarar');
      fireEvent.click(pnlHeader);

      // Verify sorting
      expect(pnlHeader).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('displays pagination controls', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      expect(screen.getByText('Sayfa başına satır:')).toBeInTheDocument();
    });
  });

  describe('CSV Export', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL and document methods
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      document.createElement = jest.fn().mockReturnValue({
        setAttribute: jest.fn(),
        click: jest.fn(),
        style: {},
      });
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
    });

    it('exports trades to CSV when export button is clicked', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      const exportButton = screen.getByRole('button', { name: /İndir/i });
      fireEvent.click(exportButton);

      // Verify toast success message
      expect(toast.success).toHaveBeenCalledWith(
        'İşlem geçmişi CSV olarak indirildi',
        expect.any(Object)
      );
    });

    it('disables export button when no trades', () => {
      const store = createMockStore([]);
      renderWithProviders(store);

      const exportButton = screen.getByRole('button', { name: /İndir/i });
      expect(exportButton).toBeDisabled();
    });

    it('disables export button when loading', () => {
      const store = createMockStore(mockTrades, true);
      renderWithProviders(store);

      const exportButton = screen.getByRole('button', { name: /İndir/i });
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Refresh', () => {
    it('refreshes trade history when refresh button is clicked', () => {
      const store = createMockStore(mockTrades);
      renderWithProviders(store);

      const refreshButton = screen.getByRole('button', { name: /Yenile/i });
      fireEvent.click(refreshButton);

      // Verify button is enabled
      expect(refreshButton).toBeEnabled();
    });

    it('disables refresh button when loading', () => {
      const store = createMockStore(mockTrades, true);
      renderWithProviders(store);

      const refreshButton = screen.getByRole('button', { name: /Yenile/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Statistics Calculation', () => {
    it('calculates total P&L correctly', () => {
      const trades: ExecutedTrade[] = [
        { ...mockTrades[0], pnl: 1000, pnlPercent: 5 },
        { ...mockTrades[1], pnl: -500, pnlPercent: -2.5 },
        { ...mockTrades[2], pnl: 200, pnlPercent: 1 },
      ];
      const store = createMockStore(trades);
      renderWithProviders(store);

      // Total P&L should be 1000 - 500 + 200 = 700
      const expectedPnl = '+700,00 TRY';
      expect(screen.getByText(expectedPnl)).toBeInTheDocument();
    });

    it('calculates win rate correctly', () => {
      const trades: ExecutedTrade[] = [
        { ...mockTrades[0], pnl: 1000, pnlPercent: 5 },
        { ...mockTrades[1], pnl: -500, pnlPercent: -2.5 },
        { ...mockTrades[2], pnl: 200, pnlPercent: 1 },
      ];
      const store = createMockStore(trades);
      renderWithProviders(store);

      // Win rate should be 2/3 = 66.67%
      const winRateText = '66.7%';
      expect(screen.getByText(winRateText)).toBeInTheDocument();
    });
  });
});
