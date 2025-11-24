/**
 * Tests for OrderEntryPanel component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ToastContainer } from 'react-toastify';
import OrderEntryPanel from './OrderEntryPanel';
import tradingReducer from '../../../store/slices/tradingSlice';
import { OrderType, OrderSide } from '../../../types/trading.types';
import * as tradingApi from '../../../api/tradingApi';

// Mock trading API
jest.mock('../../../api/tradingApi');
const mockPlaceOrder = tradingApi.placeOrder as jest.MockedFunction<typeof tradingApi.placeOrder>;

// Create mock store
const createMockStore = (initialState = {}) => {
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
        ticker: {
          lastPrice: '850000.00',
          priceChange: '5000.00',
          priceChangePercent: '0.59',
          highPrice: '860000.00',
          lowPrice: '840000.00',
          volume: '100.5',
          quoteVolume: '85425000.00',
        },
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
        ...initialState,
      },
    },
  });
};

// Helper to render with Redux
const renderWithRedux = (component: React.ReactElement, store = createMockStore()) => {
  return {
    ...render(
      <Provider store={store}>
        {component}
        <ToastContainer />
      </Provider>
    ),
    store,
  };
};

describe('OrderEntryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders order entry panel with all elements', () => {
      renderWithRedux(<OrderEntryPanel />);

      // Check for main elements
      expect(screen.getByText('Emir Ver')).toBeInTheDocument();
      expect(screen.getByText('Alış')).toBeInTheDocument();
      expect(screen.getByText('Satış')).toBeInTheDocument();
      expect(screen.getByLabelText('Emir Tipi')).toBeInTheDocument();
      expect(screen.getByLabelText('Miktar')).toBeInTheDocument();
    });

    it('displays buy tab as default', () => {
      renderWithRedux(<OrderEntryPanel />);

      const buyTab = screen.getByRole('tab', { name: /alış/i });
      expect(buyTab).toHaveAttribute('aria-selected', 'true');
    });

    it('shows limit order type as default', () => {
      renderWithRedux(<OrderEntryPanel />);

      const orderTypeSelect = screen.getByLabelText('Emir Tipi');
      expect(orderTypeSelect).toHaveTextContent('Limit');
    });
  });

  describe('Tab Switching', () => {
    it('switches to sell tab when clicked', () => {
      renderWithRedux(<OrderEntryPanel />);

      const sellTab = screen.getByRole('tab', { name: /satış/i });
      fireEvent.click(sellTab);

      expect(sellTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Order Type Selection', () => {
    it('shows price field for limit orders', () => {
      renderWithRedux(<OrderEntryPanel />);

      const priceField = screen.getByLabelText('Fiyat');
      expect(priceField).toBeInTheDocument();
    });

    it('hides price field for market orders', async () => {
      renderWithRedux(<OrderEntryPanel />);

      // Change to market order
      const orderTypeSelect = screen.getByLabelText('Emir Tipi');
      fireEvent.mouseDown(orderTypeSelect);

      const marketOption = await screen.findByText('Market');
      fireEvent.click(marketOption);

      // Price field should not be visible
      expect(screen.queryByLabelText('Fiyat')).not.toBeInTheDocument();
    });

    it('shows stop price field for stop-loss orders', async () => {
      renderWithRedux(<OrderEntryPanel />);

      // Change to stop-loss order
      const orderTypeSelect = screen.getByLabelText('Emir Tipi');
      fireEvent.mouseDown(orderTypeSelect);

      const stopLossOption = await screen.findByText('Stop-Loss');
      fireEvent.click(stopLossOption);

      // Stop price field should be visible
      expect(screen.getByLabelText('Tetikleme Fiyatı')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when quantity is empty', async () => {
      renderWithRedux(<OrderEntryPanel />);

      const submitButton = screen.getByRole('button', { name: /alış emri ver/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/geçerli bir miktar giriniz/i)).toBeInTheDocument();
      });
    });

    it('shows error when quantity is zero', async () => {
      renderWithRedux(<OrderEntryPanel />);

      const quantityInput = screen.getByLabelText('Miktar');
      fireEvent.change(quantityInput, { target: { value: '0' } });

      const submitButton = screen.getByRole('button', { name: /alış emri ver/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/geçerli bir miktar giriniz/i)).toBeInTheDocument();
      });
    });

    it('shows error when price is empty for limit order', async () => {
      renderWithRedux(<OrderEntryPanel />);

      const quantityInput = screen.getByLabelText('Miktar');
      fireEvent.change(quantityInput, { target: { value: '0.5' } });

      const priceInput = screen.getByLabelText('Fiyat');
      fireEvent.change(priceInput, { target: { value: '' } });

      const submitButton = screen.getByRole('button', { name: /alış emri ver/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/geçerli bir fiyat giriniz/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Placement', () => {
    it('successfully places a limit buy order', async () => {
      const mockOrder = {
        orderId: 'order-123',
        symbol: 'BTC_TRY',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: '0.5',
        price: '850000',
        status: 'NEW' as any,
        executedQty: '0',
        cummulativeQuoteQty: '0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        clientOrderId: 'client-123',
        timeInForce: 'GTC' as any,
      };

      mockPlaceOrder.mockResolvedValueOnce(mockOrder);

      const onOrderPlaced = jest.fn();
      renderWithRedux(<OrderEntryPanel onOrderPlaced={onOrderPlaced} />);

      // Fill in form
      const quantityInput = screen.getByLabelText('Miktar');
      fireEvent.change(quantityInput, { target: { value: '0.5' } });

      const priceInput = screen.getByLabelText('Fiyat');
      fireEvent.change(priceInput, { target: { value: '850000' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /alış emri ver/i });
      fireEvent.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(mockPlaceOrder).toHaveBeenCalledWith({
          symbol: 'BTC_TRY',
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          quantity: '0.5',
          price: '850000',
          timeInForce: 'GTC',
        });
      });

      // Verify callback
      expect(onOrderPlaced).toHaveBeenCalled();
    });

    it('successfully places a market sell order', async () => {
      const mockOrder = {
        orderId: 'order-456',
        symbol: 'BTC_TRY',
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        quantity: '0.3',
        price: '0',
        status: 'NEW' as any,
        executedQty: '0',
        cummulativeQuoteQty: '0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        clientOrderId: 'client-456',
        timeInForce: 'GTC' as any,
      };

      mockPlaceOrder.mockResolvedValueOnce(mockOrder);

      renderWithRedux(<OrderEntryPanel />);

      // Switch to sell
      const sellTab = screen.getByRole('tab', { name: /satış/i });
      fireEvent.click(sellTab);

      // Change to market order
      const orderTypeSelect = screen.getByLabelText('Emir Tipi');
      fireEvent.mouseDown(orderTypeSelect);
      const marketOption = await screen.findByText('Market');
      fireEvent.click(marketOption);

      // Fill in quantity
      const quantityInput = screen.getByLabelText('Miktar');
      fireEvent.change(quantityInput, { target: { value: '0.3' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /satış emri ver/i });
      fireEvent.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(mockPlaceOrder).toHaveBeenCalledWith({
          symbol: 'BTC_TRY',
          side: OrderSide.SELL,
          type: OrderType.MARKET,
          quantity: '0.3',
          timeInForce: 'GTC',
        });
      });
    });

    it('handles API error correctly', async () => {
      mockPlaceOrder.mockRejectedValueOnce(new Error('Yetersiz bakiye'));

      renderWithRedux(<OrderEntryPanel />);

      // Fill in form
      const quantityInput = screen.getByLabelText('Miktar');
      fireEvent.change(quantityInput, { target: { value: '100' } });

      const priceInput = screen.getByLabelText('Fiyat');
      fireEvent.change(priceInput, { target: { value: '850000' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /alış emri ver/i });
      fireEvent.click(submitButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/yetersiz bakiye/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order Total Calculation', () => {
    it('calculates total correctly for limit order', async () => {
      renderWithRedux(<OrderEntryPanel />);

      const quantityInput = screen.getByLabelText('Miktar');
      fireEvent.change(quantityInput, { target: { value: '0.5' } });

      const priceInput = screen.getByLabelText('Fiyat');
      fireEvent.change(priceInput, { target: { value: '850000' } });

      // Check total
      await waitFor(() => {
        expect(screen.getByText('425000.00 TRY')).toBeInTheDocument();
      });
    });
  });

  describe('Form Reset', () => {
    it('resets form after successful order placement', async () => {
      const mockOrder = {
        orderId: 'order-789',
        symbol: 'BTC_TRY',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        quantity: '0.5',
        price: '850000',
        status: 'NEW' as any,
        executedQty: '0',
        cummulativeQuoteQty: '0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        clientOrderId: 'client-789',
        timeInForce: 'GTC' as any,
      };

      mockPlaceOrder.mockResolvedValueOnce(mockOrder);

      renderWithRedux(<OrderEntryPanel />);

      // Fill in form
      const quantityInput = screen.getByLabelText('Miktar') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '0.5' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /alış emri ver/i });
      fireEvent.click(submitButton);

      // Verify form is reset
      await waitFor(() => {
        expect(quantityInput.value).toBe('');
      });
    });
  });
});
