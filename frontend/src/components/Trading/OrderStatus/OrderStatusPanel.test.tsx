/**
 * Tests for OrderStatusPanel component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ToastContainer } from 'react-toastify';
import OrderStatusPanel from './OrderStatusPanel';
import tradingReducer from '../../../store/slices/tradingSlice';
import { OrderSide, OrderType, OrderStatus } from '../../../types/trading.types';
import * as tradingApi from '../../../api/tradingApi';

// Mock trading API
jest.mock('../../../api/tradingApi');
const mockGetOpenOrders = tradingApi.getOpenOrders as jest.MockedFunction<
  typeof tradingApi.getOpenOrders
>;
const mockGetOrderHistory = tradingApi.getOrderHistory as jest.MockedFunction<
  typeof tradingApi.getOrderHistory
>;
const mockCancelOrder = tradingApi.cancelOrder as jest.MockedFunction<typeof tradingApi.cancelOrder>;

const createMockStore = () => {
  return configureStore({
    reducer: {
      trading: tradingReducer,
    },
    preloadedState: {
      trading: {
        selectedSymbol: 'BTC_TRY' as any,
        orderBook: { bids: [], asks: [], spread: '0', spreadPercent: '0', lastUpdateId: 0 },
        ticker: null,
        recentTrades: [],
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

const renderWithRedux = (component: React.ReactElement, store = createMockStore()) => {
  return render(
    <Provider store={store}>
      {component}
      <ToastContainer />
    </Provider>
  );
};

describe('OrderStatusPanel', () => {
  const mockOpenOrders = [
    {
      orderId: 'order-1',
      symbol: 'BTC_TRY',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: '0.5',
      price: '850000',
      status: OrderStatus.NEW,
      executedQty: '0',
      cummulativeQuoteQty: '0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      clientOrderId: 'client-1',
      timeInForce: 'GTC' as any,
    },
  ];

  const mockOrderHistory = [
    {
      orderId: 'order-2',
      symbol: 'ETH_TRY',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      quantity: '1.0',
      price: '45000',
      status: OrderStatus.FILLED,
      executedQty: '1.0',
      cummulativeQuoteQty: '45000',
      createdAt: Date.now() - 60000,
      updatedAt: Date.now() - 30000,
      clientOrderId: 'client-2',
      timeInForce: 'GTC' as any,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOpenOrders.mockResolvedValue(mockOpenOrders);
    mockGetOrderHistory.mockResolvedValue({
      orders: mockOrderHistory,
      total: 1,
      page: 1,
      totalPages: 1,
    });
  });

  it('renders order status panel with tabs', () => {
    renderWithRedux(<OrderStatusPanel />);

    expect(screen.getByText(/Açık Emirler/)).toBeInTheDocument();
    expect(screen.getByText('Emir Geçmişi')).toBeInTheDocument();
  });

  it('loads and displays open orders on mount', async () => {
    renderWithRedux(<OrderStatusPanel />);

    await waitFor(() => {
      expect(mockGetOpenOrders).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
      expect(screen.getByText('Alış')).toBeInTheDocument();
    });
  });

  it('switches to order history tab', async () => {
    renderWithRedux(<OrderStatusPanel />);

    const historyTab = screen.getByText('Emir Geçmişi');
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(mockGetOrderHistory).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('ETH/TRY')).toBeInTheDocument();
      expect(screen.getByText('Satış')).toBeInTheDocument();
      expect(screen.getByText('Tamamlandı')).toBeInTheDocument();
    });
  });

  it('shows empty state when no open orders', async () => {
    mockGetOpenOrders.mockResolvedValueOnce([]);

    renderWithRedux(<OrderStatusPanel />);

    await waitFor(() => {
      expect(screen.getByText('Açık emir bulunmuyor')).toBeInTheDocument();
    });
  });

  it('displays cancel button for open orders', async () => {
    renderWithRedux(<OrderStatusPanel />);

    await waitFor(() => {
      const cancelButtons = screen.queryAllByRole('button', { name: /emri iptal et/i });
      expect(cancelButtons.length).toBeGreaterThan(0);
    });
  });

  it('opens cancel confirmation dialog', async () => {
    renderWithRedux(<OrderStatusPanel />);

    await waitFor(() => {
      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /emri iptal et/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('Emri İptal Et')).toBeInTheDocument();
      expect(screen.getByText(/bu emri iptal etmek istediğinizden emin misiniz/i)).toBeInTheDocument();
    });
  });

  it('cancels order successfully', async () => {
    const canceledOrder = { ...mockOpenOrders[0], status: OrderStatus.CANCELED };
    mockCancelOrder.mockResolvedValueOnce(canceledOrder);
    mockGetOpenOrders.mockResolvedValueOnce([]);

    renderWithRedux(<OrderStatusPanel />);

    await waitFor(() => {
      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /emri iptal et/i });
    fireEvent.click(cancelButton);

    // Confirm cancellation
    await waitFor(() => {
      expect(screen.getByText('Emri İptal Et')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'İptal Et' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalledWith('order-1');
    });
  });

  it('handles cancel error', async () => {
    mockCancelOrder.mockRejectedValueOnce(new Error('İptal edilemedi'));

    renderWithRedux(<OrderStatusPanel />);

    await waitFor(() => {
      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /emri iptal et/i });
    fireEvent.click(cancelButton);

    // Confirm cancellation
    await waitFor(() => {
      expect(screen.getByText('Emri İptal Et')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'İptal Et' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalled();
    });
  });

  it('refreshes orders when refresh button clicked', async () => {
    renderWithRedux(<OrderStatusPanel />);

    await waitFor(() => {
      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /yenile/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockGetOpenOrders).toHaveBeenCalledTimes(2);
    });
  });

  it('refreshes on refreshTrigger change', async () => {
    const { rerender } = renderWithRedux(<OrderStatusPanel refreshTrigger={1} />);

    await waitFor(() => {
      expect(mockGetOpenOrders).toHaveBeenCalledTimes(1);
    });

    rerender(
      <Provider store={createMockStore()}>
        <OrderStatusPanel refreshTrigger={2} />
        <ToastContainer />
      </Provider>
    );

    await waitFor(() => {
      expect(mockGetOpenOrders).toHaveBeenCalledTimes(2);
    });
  });
});
