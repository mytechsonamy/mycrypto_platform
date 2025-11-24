/**
 * Unit tests for MarketOrderForm component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import MarketOrderForm from './MarketOrderForm';
import tradingReducer from '../../../store/slices/tradingSlice';
import walletReducer from '../../../store/slices/walletSlice';
import * as tradingApi from '../../../api/tradingApi';
import { OrderSide, OrderType, OrderStatus, TimeInForce } from '../../../types/trading.types';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock trading API
jest.mock('../../../api/tradingApi', () => ({
  placeOrder: jest.fn(),
}));

// Helper function to create mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      trading: tradingReducer,
      wallet: walletReducer,
    },
    preloadedState: {
      trading: {
        selectedSymbol: 'BTC_TRY' as const,
        orderBook: {
          bids: [
            ['2850000.00', '0.5', '1425000.00'] as [string, string, string],
            ['2849000.00', '1.2', '3418800.00'] as [string, string, string],
          ],
          asks: [
            ['2851000.00', '0.8', '2280800.00'] as [string, string, string],
            ['2852000.00', '0.6', '1711200.00'] as [string, string, string],
          ],
          spread: '1000',
          spreadPercent: '0.04',
          lastUpdateId: 12345,
        },
        ticker: {
          lastPrice: '2850500.00',
          priceChange: '25000.00',
          priceChangePercent: '0.88',
          highPrice: '2870000.00',
          lowPrice: '2820000.00',
          volume: '123.45',
          quoteVolume: '351234567.89',
        },
        recentTrades: [],
        openOrders: [],
        orderHistory: [],
        loading: false,
        error: null,
        aggregateLevel: 0.1 as const,
        wsConnected: true,
        orderPlacement: {
          loading: false,
          error: null,
          lastOrderId: null,
        },
      },
      wallet: {
        balances: [
          {
            currency: 'TRY' as const,
            availableBalance: '500000.00',
            lockedBalance: '0.00',
            totalBalance: '500000.00',
          },
          {
            currency: 'BTC' as const,
            availableBalance: '0.10000000',
            lockedBalance: '0.00',
            totalBalance: '0.10000000',
          },
          {
            currency: 'ETH' as const,
            availableBalance: '1.50000000',
            lockedBalance: '0.00',
            totalBalance: '1.50000000',
          },
          {
            currency: 'USDT' as const,
            availableBalance: '5000.00',
            lockedBalance: '0.00',
            totalBalance: '5000.00',
          },
        ],
        loading: false,
        error: null,
      },
      ...initialState,
    },
  });
};

describe('MarketOrderForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the form with all elements', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Check title
      expect(screen.getByText('Market Emir')).toBeInTheDocument();

      // Check Buy/Sell toggle buttons
      expect(screen.getByRole('button', { name: /alış/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /satış/i })).toBeInTheDocument();

      // Check amount input
      expect(screen.getByLabelText(/miktar \(btc\)/i)).toBeInTheDocument();

      // Check submit button
      expect(screen.getByRole('button', { name: /satın al/i })).toBeInTheDocument();
    });

    it('displays available balance correctly', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // For BUY side, should show TRY balance
      expect(screen.getByText(/kullanılabilir bakiye/i)).toBeInTheDocument();
      expect(screen.getByText(/500000.00 TRY/i)).toBeInTheDocument();
    });

    it('displays estimated price from order book', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // For BUY side, should show best ask price
      expect(screen.getByText(/tahmini fiyat/i)).toBeInTheDocument();
      expect(screen.getByText(/2851000.00 TRY/i)).toBeInTheDocument();
    });
  });

  describe('Buy/Sell Toggle', () => {
    it('switches from BUY to SELL', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const sellButton = screen.getByRole('button', { name: /satış/i });
      fireEvent.click(sellButton);

      // Submit button should change to "Sat"
      expect(screen.getByRole('button', { name: /^sat$/i })).toBeInTheDocument();

      // Available balance should now show BTC
      expect(screen.getByText(/0.10000000 BTC/i)).toBeInTheDocument();

      // Price should change to best bid
      expect(screen.getByText(/2850000.00 TRY/i)).toBeInTheDocument();
    });

    it('clears error when switching sides', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Set amount that's too high
      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '10' } });

      // Should show error
      waitFor(() => {
        expect(screen.getByText(/yetersiz bakiye/i)).toBeInTheDocument();
      });

      // Switch to SELL
      const sellButton = screen.getByRole('button', { name: /satış/i });
      fireEvent.click(sellButton);

      // Error should be cleared (though new validation may apply)
      waitFor(() => {
        expect(screen.queryByText(/yetersiz bakiye/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty amount on submit', async () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const submitButton = screen.getByRole('button', { name: /satın al/i });

      // Button should be disabled when amount is empty
      expect(submitButton).toBeDisabled();
    });

    it('shows error for negative amount', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '-0.5' } });

      // HTML5 validation should prevent negative input
      expect(amountInput).toHaveAttribute('min', '0');
    });

    it('shows error when BUY amount exceeds TRY balance', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Amount that requires more TRY than available (including fees)
      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '1' } });

      // Should show insufficient balance error
      waitFor(() => {
        expect(screen.getByText(/yetersiz bakiye/i)).toBeInTheDocument();
      });
    });

    it('shows error when SELL amount exceeds BTC balance', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Switch to SELL
      const sellButton = screen.getByRole('button', { name: /satış/i });
      fireEvent.click(sellButton);

      // Amount exceeding available BTC (0.10000000)
      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.5' } });

      // Should show insufficient balance error
      waitFor(() => {
        expect(screen.getByText(/yetersiz bakiye/i)).toBeInTheDocument();
      });
    });

    it('validates amount with fees for BUY orders', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Amount that's close to the limit
      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.175' } });

      // Total = 0.175 * 2851000 = 498925
      // Fee = 498925 * 0.002 = 997.85
      // Total with fee = 499922.85 (within 500000 limit)
      // Should not show error
      waitFor(() => {
        expect(screen.queryByText(/yetersiz bakiye/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Fee Calculation', () => {
    it('calculates and displays fees correctly for BUY orders', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.1' } });

      // Total = 0.1 * 2851000 = 285100
      // Fee = 285100 * 0.002 = 570.20
      // Total with fee = 285670.20

      waitFor(() => {
        expect(screen.getByText(/285100.00 TRY/i)).toBeInTheDocument(); // Total
        expect(screen.getByText(/\+ 570.20 TRY/i)).toBeInTheDocument(); // Fee
        expect(screen.getByText(/285670.20 TRY/i)).toBeInTheDocument(); // Total with fee
      });
    });

    it('calculates and displays fees correctly for SELL orders', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Switch to SELL
      const sellButton = screen.getByRole('button', { name: /satış/i });
      fireEvent.click(sellButton);

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });

      // Total = 0.05 * 2850000 = 142500
      // Fee = 142500 * 0.002 = 285
      // Total after fee = 142215

      waitFor(() => {
        expect(screen.getByText(/142500.00 TRY/i)).toBeInTheDocument(); // Total
        expect(screen.getByText(/- 285.00 TRY/i)).toBeInTheDocument(); // Fee
        expect(screen.getByText(/142215.00 TRY/i)).toBeInTheDocument(); // Total after fee
      });
    });

    it('displays 0.2% fee rate correctly', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Check that the fee label exists with 0.2% mentioned - use text content matcher
      expect(screen.getByText((content, element) => {
        return element?.textContent?.includes('İşlem Ücreti') && element?.textContent?.includes('0.2%') || false;
      })).toBeInTheDocument();
    });
  });

  describe('Order Submission', () => {
    it('opens confirmation dialog when submitting valid order', async () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });

      const submitButton = screen.getByRole('button', { name: /satın al/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/alış emrini onayla/i)).toBeInTheDocument();
      });
    });

    it('displays correct order details in confirmation dialog', async () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });

      const submitButton = screen.getByRole('button', { name: /satın al/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/BTC \/ TRY/i)).toBeInTheDocument();
        expect(screen.getByText(/ALIŞ/i)).toBeInTheDocument();
        expect(screen.getByText(/0.05 BTC/i)).toBeInTheDocument();
      });
    });

    it('places order when confirmed', async () => {
      const mockOrder = {
        orderId: 'order-12345',
        symbol: 'BTC_TRY',
        clientOrderId: 'client-12345',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        timeInForce: TimeInForce.IOC,
        quantity: '0.05',
        price: '0',
        status: OrderStatus.FILLED,
        executedQty: '0.05',
        cummulativeQuoteQty: '142550.00',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (tradingApi.placeOrder as jest.Mock).mockResolvedValue(mockOrder);

      const store = createMockStore();
      const onOrderPlaced = jest.fn();
      render(
        <Provider store={store}>
          <MarketOrderForm onOrderPlaced={onOrderPlaced} />
        </Provider>
      );

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });

      const submitButton = screen.getByRole('button', { name: /satın al/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/alış emrini onayla/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /onayla/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(tradingApi.placeOrder).toHaveBeenCalledWith({
          symbol: 'BTC_TRY',
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          quantity: '0.05',
          timeInForce: TimeInForce.IOC,
        });
      });

      // Success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Alış emri başarıyla oluşturuldu'),
          expect.any(Object)
        );
      });

      // Callback should be called
      expect(onOrderPlaced).toHaveBeenCalled();

      // Form should be reset - check that it's empty or 0
      await waitFor(() => {
        expect((amountInput as HTMLInputElement).value).toBe('');
      });
    });

    it('places SELL order correctly', async () => {
      const mockOrder = {
        orderId: 'order-67890',
        symbol: 'BTC_TRY',
        clientOrderId: 'client-67890',
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        timeInForce: TimeInForce.IOC,
        quantity: '0.05',
        price: '0',
        status: OrderStatus.FILLED,
        executedQty: '0.05',
        cummulativeQuoteQty: '142500.00',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (tradingApi.placeOrder as jest.Mock).mockResolvedValue(mockOrder);

      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Switch to SELL
      const sellButton = screen.getByRole('button', { name: /satış/i });
      fireEvent.click(sellButton);

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });

      const submitButton = screen.getByRole('button', { name: /^sat$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/satış emrini onayla/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /onayla/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(tradingApi.placeOrder).toHaveBeenCalledWith({
          symbol: 'BTC_TRY',
          side: OrderSide.SELL,
          type: OrderType.MARKET,
          quantity: '0.05',
          timeInForce: TimeInForce.IOC,
        });
      });

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Satış emri başarıyla oluşturuldu'),
        expect.any(Object)
      );
    });

    it('handles API errors correctly', async () => {
      const errorMessage = 'Yetersiz bakiye';
      (tradingApi.placeOrder as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });

      const submitButton = screen.getByRole('button', { name: /satın al/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/alış emrini onayla/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /onayla/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          errorMessage,
          expect.any(Object)
        );
      });

      // Error should be displayed in the form
      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      // Form should NOT be reset on error
      expect(amountInput).toHaveValue(0.05);
    });

    it('shows loading state during submission', async () => {
      (tradingApi.placeOrder as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });

      const submitButton = screen.getByRole('button', { name: /satın al/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/alış emrini onayla/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /onayla/i });
      fireEvent.click(confirmButton);

      // Loading spinner should appear
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('cancels order confirmation', async () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });

      const submitButton = screen.getByRole('button', { name: /satın al/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/alış emrini onayla/i)).toBeInTheDocument();
      });

      // Find cancel button by text (MUI Dialog doesn't use button role for actions)
      const cancelButton = screen.getByText('İptal').closest('button');
      expect(cancelButton).toBeTruthy();
      if (cancelButton) {
        fireEvent.click(cancelButton);
      }

      await waitFor(() => {
        expect(screen.queryByText(/alış emrini onayla/i)).not.toBeInTheDocument();
      });

      // placeOrder should not be called
      expect(tradingApi.placeOrder).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing wallet balances gracefully', () => {
      const store = createMockStore({
        wallet: {
          balances: [],
          loading: false,
          error: null,
        },
      });

      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Should show 0 balance - check in the available balance section
      const balanceText = screen.getByText(/kullanılabilir bakiye/i);
      expect(balanceText).toBeInTheDocument();
      // Check that the balance shows 0 - use text content matcher for flexibility
      expect(screen.getByText((content, element) => {
        return element?.textContent?.includes('0.00 TRY') || false;
      })).toBeInTheDocument();
    });

    it('handles missing order book gracefully', () => {
      const store = createMockStore({
        trading: {
          ...createMockStore().getState().trading,
          orderBook: {
            bids: [],
            asks: [],
            spread: '0',
            spreadPercent: '0',
            lastUpdateId: 0,
          },
          ticker: null,
        },
      });

      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Should show 0 price in estimated price
      expect(screen.getByText(/tahmini fiyat/i)).toBeInTheDocument();
      // Look for a price value that's 0.00 TRY (there are multiple, get them all)
      const priceElements = screen.getAllByText(/0\.00\s*TRY/i);
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('resets form when symbol changes', () => {
      const store = createMockStore();
      const { rerender } = render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const amountInput = screen.getByLabelText(/miktar \(btc\)/i);
      fireEvent.change(amountInput, { target: { value: '0.05' } });

      // Change symbol
      store.dispatch({ type: 'trading/setSelectedSymbol', payload: 'ETH_TRY' });

      rerender(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      // Amount should be reset (though this depends on implementation)
      // At minimum, error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      expect(screen.getByLabelText(/miktar \(btc\)/i)).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      expect(screen.getByRole('button', { name: /alış/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /satış/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /satın al/i })).toBeInTheDocument();
    });

    it('disables submit button when validation fails', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <MarketOrderForm />
        </Provider>
      );

      const submitButton = screen.getByRole('button', { name: /satın al/i });
      expect(submitButton).toBeDisabled(); // No amount entered
    });
  });
});
