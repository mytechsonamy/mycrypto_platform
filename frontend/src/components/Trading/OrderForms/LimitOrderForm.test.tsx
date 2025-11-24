/**
 * Tests for LimitOrderForm component
 * Coverage areas:
 * - Component rendering with all fields
 * - Buy/Sell toggle functionality
 * - Price and amount input
 * - Time-in-Force selection
 * - Fee calculation (maker vs taker)
 * - Balance validation
 * - Price warnings
 * - Suggested price buttons
 * - Form submission
 * - Confirmation dialog
 * - Error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ToastContainer } from 'react-toastify';
import LimitOrderForm from './LimitOrderForm';
import tradingReducer from '../../../store/slices/tradingSlice';
import walletReducer from '../../../store/slices/walletSlice';
import authReducer from '../../../store/slices/authSlice';
import { OrderSide, TimeInForce } from '../../../types/trading.types';
import * as tradingApi from '../../../api/tradingApi';

// Mock trading API
jest.mock('../../../api/tradingApi');

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
  ToastContainer: () => null,
}));

// Helper to create test store
const createTestStore = (initialState?: any) => {
  return configureStore({
    // @ts-ignore - Type issue with preloadedState in test configuration
    reducer: {
      auth: authReducer,
      trading: tradingReducer,
      wallet: walletReducer,
    },
    preloadedState: initialState as any,
  });
};

// Mock initial state
const mockInitialState = {
  trading: {
    selectedSymbol: 'BTC_TRY',
    orderBook: {
      bids: [
        ['2800000.00', '1.5', '4200000.00'],
        ['2799000.00', '2.0', '5598000.00'],
      ],
      asks: [
        ['2801000.00', '1.2', '3361200.00'],
        ['2802000.00', '1.8', '5043600.00'],
      ],
      spread: '1000.00',
      spreadPercent: '0.04',
      lastUpdateId: 12345,
    },
    ticker: {
      lastPrice: '2800500.00',
      priceChange: '50000.00',
      priceChangePercent: '1.82',
      highPrice: '2850000.00',
      lowPrice: '2750000.00',
      volume: '125.50',
      quoteVolume: '351540000.00',
    },
    recentTrades: [],
    openOrders: [],
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
  wallet: {
    balances: [
      {
        currency: 'BTC',
        availableBalance: '1.5',
        lockedBalance: '0.0',
        totalBalance: '1.5',
      },
      {
        currency: 'TRY',
        availableBalance: '10000000.00',
        lockedBalance: '0.0',
        totalBalance: '10000000.00',
      },
    ],
    loading: false,
    error: null,
    lastUpdated: Date.now(),
  },
};

describe('LimitOrderForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      expect(screen.getByText('Limit Emir')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /alış/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /satış/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/limit fiyatı/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/miktar/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sipariş geçerliliği/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /limit satın al/i })).toBeInTheDocument();
    });

    it('should display available balance', () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      expect(screen.getByText(/kullanılabilir bakiye/i)).toBeInTheDocument();
      expect(screen.getByText(/10000000.00 TRY/i)).toBeInTheDocument();
    });

    it('should display market price reference', () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      expect(screen.getByText(/mevcut piyasa fiyatı/i)).toBeInTheDocument();
      expect(screen.getByText(/2801000.00 TRY/i)).toBeInTheDocument(); // Best ask for buy
    });

    it('should display suggested prices', () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      expect(screen.getByText(/-1%:/)).toBeInTheDocument();
      expect(screen.getByText(/-0.5%:/)).toBeInTheDocument();
      expect(screen.getByText(/Market:/)).toBeInTheDocument();
      expect(screen.getByText(/\+0.5%:/)).toBeInTheDocument();
      expect(screen.getByText(/\+1%:/)).toBeInTheDocument();
    });
  });

  describe('Buy/Sell Toggle', () => {
    it('should toggle between buy and sell', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const buyButton = screen.getByRole('button', { name: /alış/i });
      const sellButton = screen.getByRole('button', { name: /satış/i });

      // Initially buy is selected
      expect(buyButton).toHaveClass('Mui-selected');

      // Click sell
      fireEvent.click(sellButton);
      expect(sellButton).toHaveClass('Mui-selected');

      // Balance should change to BTC
      expect(screen.getByText(/1.50000000 BTC/i)).toBeInTheDocument();
    });

    it('should change button text based on side', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      expect(screen.getByRole('button', { name: /limit satın al/i })).toBeInTheDocument();

      const sellButton = screen.getByRole('button', { name: /satış/i });
      fireEvent.click(sellButton);

      expect(screen.getByRole('button', { name: /limit sat/i })).toBeInTheDocument();
    });
  });

  describe('Time-in-Force Selection', () => {
    it('should display all Time-in-Force options', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const tifSelect = screen.getByRole('combobox', { name: /sipariş geçerliliği/i });
      fireEvent.mouseDown(tifSelect);

      await waitFor(() => {
        const gtcOptions = screen.getAllByText(/İptal Edilene Kadar/i);
        expect(gtcOptions.length).toBeGreaterThan(0);

        const iocOptions = screen.getAllByText(/Hemen Veya İptal/i);
        expect(iocOptions.length).toBeGreaterThan(0);

        const fokOptions = screen.getAllByText(/Hep Veya Hiç/i);
        expect(fokOptions.length).toBeGreaterThan(0);

        const postOptions = screen.getAllByText(/Yalnız Likidite Sağlayıcı/i);
        expect(postOptions.length).toBeGreaterThan(0);
      });
    });

    it('should show 0.1% fee chip for POST_ONLY', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const tifSelect = screen.getByLabelText(/sipariş geçerliliği/i);
      fireEvent.mouseDown(tifSelect);

      await waitFor(() => {
        expect(screen.getByText(/0.1% ücret/i)).toBeInTheDocument();
      });
    });

    it('should update fee calculation when changing to POST_ONLY', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      // Enter price and amount
      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');

      // Initially should show 0.2% fee (taker) - check for "560.00" which is 0.2% of 280000
      await waitFor(() => {
        const feeElements = screen.getAllByText(/560.00/);
        expect(feeElements.length).toBeGreaterThan(0);
      });

      // Change to POST_ONLY
      const tifSelect = screen.getByRole('combobox', { name: /sipariş geçerliliği/i });
      fireEvent.mouseDown(tifSelect);

      const postOnlyOption = await screen.findByText(/Yalnız Likidite Sağlayıcı/i);
      fireEvent.click(postOnlyOption);

      // Should now show 0.1% fee (maker) - check for "280.00" which is 0.1% of 280000
      await waitFor(() => {
        const feeElements = screen.getAllByText(/280.00/);
        expect(feeElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Fee Calculation', () => {
    it('should calculate taker fee (0.2%) for GTC orders', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');

      // Total: 280000, Fee: 560 (0.2%)
      await waitFor(() => {
        expect(screen.getByText(/280000.00 TRY/)).toBeInTheDocument();
        expect(screen.getByText(/\+ 560.00 TRY/)).toBeInTheDocument();
        expect(screen.getByText(/280560.00 TRY/)).toBeInTheDocument();
      });
    });

    it('should calculate maker fee (0.1%) for POST_ONLY orders', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');

      // Change to POST_ONLY
      const tifSelect = screen.getByLabelText(/sipariş geçerliliği/i);
      fireEvent.mouseDown(tifSelect);

      const postOnlyOption = await screen.findByText(/Yalnız Likidite Sağlayıcı/i);
      fireEvent.click(postOnlyOption);

      // Total: 280000, Fee: 280 (0.1%)
      await waitFor(() => {
        expect(screen.getByText(/280000.00 TRY/)).toBeInTheDocument();
        expect(screen.getByText(/\+ 280.00 TRY/)).toBeInTheDocument();
        expect(screen.getByText(/280280.00 TRY/)).toBeInTheDocument();
      });
    });

    it('should subtract fee for sell orders', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      // Switch to sell
      const sellButton = screen.getByRole('button', { name: /satış/i });
      fireEvent.click(sellButton);

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');

      // Total: 280000, Fee: -560 (0.2%)
      await waitFor(() => {
        expect(screen.getByText(/280000.00 TRY/)).toBeInTheDocument();
        expect(screen.getByText(/- 560.00 TRY/)).toBeInTheDocument();
        expect(screen.getByText(/279440.00 TRY/)).toBeInTheDocument();
      });
    });
  });

  describe('Balance Validation', () => {
    it('should show error when buy order exceeds available TRY balance', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);

      // Try to buy with insufficient balance
      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '5'); // 14,000,000 TRY needed, only 10M available

      await waitFor(() => {
        expect(screen.getByText(/yetersiz bakiye/i)).toBeInTheDocument();
      });
    });

    it('should show error when sell order exceeds available BTC balance', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      // Switch to sell
      const sellButton = screen.getByRole('button', { name: /satış/i });
      fireEvent.click(sellButton);

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);

      // Try to sell more than available
      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '2'); // Only 1.5 BTC available

      await waitFor(() => {
        expect(screen.getByText(/yetersiz bakiye/i)).toBeInTheDocument();
      });
    });

    it('should show error for orders below minimum (100 TRY)', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);

      await userEvent.type(priceInput, '50');
      await userEvent.type(amountInput, '1');

      await waitFor(() => {
        expect(screen.getByText(/minimum emir tutarı 100 TRY/i)).toBeInTheDocument();
      });
    });
  });

  describe('Price Warnings', () => {
    it('should warn when buy price is significantly above market', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);

      // Set price 10% above market (market ~2,801,000)
      await userEvent.type(priceInput, '3081100');
      await userEvent.type(amountInput, '0.1');

      await waitFor(() => {
        expect(screen.getByText(/uyarı.*piyasa fiyatından.*daha yüksek/i)).toBeInTheDocument();
      });
    });

    it('should warn when sell price is significantly below market', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      // Switch to sell
      const sellButton = screen.getByRole('button', { name: /satış/i });
      fireEvent.click(sellButton);

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);

      // Set price 10% below market (market ~2,800,000)
      await userEvent.type(priceInput, '2520000');
      await userEvent.type(amountInput, '0.1');

      await waitFor(() => {
        expect(screen.getByText(/uyarı.*piyasa fiyatından.*daha düşük/i)).toBeInTheDocument();
      });
    });
  });

  describe('Suggested Prices', () => {
    it('should populate price when clicking suggested price chip', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i) as HTMLInputElement;

      // Click market price suggestion
      const marketChip = screen.getByText(/Market:/);
      fireEvent.click(marketChip);

      await waitFor(() => {
        expect(priceInput.value).toBe('2801000.00');
      });
    });
  });

  describe('Form Submission', () => {
    it('should open confirmation dialog on submit', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);
      const submitButton = screen.getByRole('button', { name: /limit satın al/i });

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/limit alış emrini onayla/i)).toBeInTheDocument();
      });
    });

    it('should display order details in confirmation dialog', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);
      const submitButton = screen.getByRole('button', { name: /limit satın al/i });

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/limit alış emrini onayla/i)).toBeInTheDocument();
      });

      // Check for order details in the table
      expect(screen.getByText(/BTC \/ TRY/i)).toBeInTheDocument();
      expect(screen.getByText(/LIMIT ALIŞ/i)).toBeInTheDocument();
    });

    it('should place order when confirmed', async () => {
      const mockPlaceOrder = jest.spyOn(tradingApi, 'placeOrder').mockResolvedValue({
        orderId: 'order-123',
        symbol: 'BTC_TRY',
        clientOrderId: 'client-123',
        side: OrderSide.BUY,
        type: 'LIMIT' as any,
        timeInForce: TimeInForce.GTC,
        quantity: '0.1',
        price: '2800000',
        status: 'NEW' as any,
        executedQty: '0',
        cummulativeQuoteQty: '0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
          <ToastContainer />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);
      const submitButton = screen.getByRole('button', { name: /limit satın al/i });

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');
      fireEvent.click(submitButton);

      // Wait for confirmation dialog and confirm
      await waitFor(() => {
        expect(screen.getByText(/limit alış emrini onayla/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /onayla/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockPlaceOrder).toHaveBeenCalledWith({
          symbol: 'BTC_TRY',
          side: OrderSide.BUY,
          type: 'LIMIT',
          quantity: '0.1',
          price: '2800000',
          timeInForce: TimeInForce.GTC,
        });
      });
    });

    it('should handle order placement errors', async () => {
      const mockPlaceOrder = jest
        .spyOn(tradingApi, 'placeOrder')
        .mockRejectedValue(new Error('Yetersiz bakiye'));

      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);
      const submitButton = screen.getByRole('button', { name: /limit satın al/i });

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/limit alış emrini onayla/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /onayla/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/yetersiz bakiye/i)).toBeInTheDocument();
      });
    });

    it('should close confirmation dialog when cancelled', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      const amountInput = screen.getByLabelText(/miktar/i);
      const submitButton = screen.getByRole('button', { name: /limit satın al/i });

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/limit alış emrini onayla/i)).toBeInTheDocument();
      });

      // Find all buttons and select the one with "İptal" text
      const allButtons = screen.getAllByRole('button');
      const cancelButton = allButtons.find(btn => btn.textContent === 'İptal');
      expect(cancelButton).toBeDefined();

      if (cancelButton) {
        fireEvent.click(cancelButton);
      }

      await waitFor(() => {
        expect(screen.queryByText(/limit alış emrini onayla/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Reset', () => {
    it('should reset form after successful order placement', async () => {
      const mockPlaceOrder = jest.spyOn(tradingApi, 'placeOrder').mockResolvedValue({
        orderId: 'order-123',
        symbol: 'BTC_TRY',
        clientOrderId: 'client-123',
        side: OrderSide.BUY,
        type: 'LIMIT' as any,
        timeInForce: TimeInForce.GTC,
        quantity: '0.1',
        price: '2800000',
        status: 'NEW' as any,
        executedQty: '0',
        cummulativeQuoteQty: '0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const priceInput = screen.getByLabelText(/limit fiyatı/i) as HTMLInputElement;
      const amountInput = screen.getByLabelText(/miktar/i) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /limit satın al/i });

      await userEvent.type(priceInput, '2800000');
      await userEvent.type(amountInput, '0.1');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/limit alış emrini onayla/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /onayla/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(priceInput.value).toBe('');
        expect(amountInput.value).toBe('');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      expect(screen.getByLabelText(/limit fiyatı/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/miktar/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sipariş geçerliliği/i)).toBeInTheDocument();
    });

    it('should disable submit button when form is invalid', async () => {
      const store = createTestStore(mockInitialState);
      render(
        <Provider store={store}>
          <LimitOrderForm />
        </Provider>
      );

      const submitButton = screen.getByRole('button', { name: /limit satın al/i });
      expect(submitButton).toBeDisabled();

      // Fill only price
      const priceInput = screen.getByLabelText(/limit fiyatı/i);
      await userEvent.type(priceInput, '2800000');
      expect(submitButton).toBeDisabled();

      // Fill amount as well
      const amountInput = screen.getByLabelText(/miktar/i);
      await userEvent.type(amountInput, '0.1');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
