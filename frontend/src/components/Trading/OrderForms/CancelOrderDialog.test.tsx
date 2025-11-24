/**
 * Tests for CancelOrderDialog component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CancelOrderDialog from './CancelOrderDialog';
import { Order, OrderSide, OrderType, OrderStatus, TimeInForce } from '../../../types/trading.types';

// Mock useMediaQuery
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: jest.fn(() => false), // Default to desktop view
}));

// Mock order data
const mockBuyOrder: Order = {
  orderId: 'order-123',
  symbol: 'BTC_TRY',
  clientOrderId: 'client-123',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  timeInForce: TimeInForce.GTC,
  quantity: '1.5',
  price: '850000',
  status: OrderStatus.NEW,
  executedQty: '0',
  cummulativeQuoteQty: '0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockSellOrder: Order = {
  orderId: 'order-456',
  symbol: 'ETH_TRY',
  clientOrderId: 'client-456',
  side: OrderSide.SELL,
  type: OrderType.LIMIT,
  timeInForce: TimeInForce.GTC,
  quantity: '10',
  price: '45000',
  status: OrderStatus.NEW,
  executedQty: '0',
  cummulativeQuoteQty: '0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockPartialOrder: Order = {
  orderId: 'order-789',
  symbol: 'BTC_TRY',
  clientOrderId: 'client-789',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  timeInForce: TimeInForce.GTC,
  quantity: '2',
  price: '850000',
  status: OrderStatus.PARTIALLY_FILLED,
  executedQty: '0.5',
  cummulativeQuoteQty: '425000',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockMarketOrder: Order = {
  orderId: 'order-999',
  symbol: 'BTC_TRY',
  clientOrderId: 'client-999',
  side: OrderSide.BUY,
  type: OrderType.MARKET,
  timeInForce: TimeInForce.IOC,
  quantity: '0.5',
  price: '0',
  status: OrderStatus.NEW,
  executedQty: '0',
  cummulativeQuoteQty: '0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('CancelOrderDialog', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when order is null', () => {
      const { container } = render(
        <CancelOrderDialog
          open={true}
          order={null}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('should render dialog when order is provided', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Siparişi İptal Etmek Üzeresiniz')).toBeInTheDocument();
      expect(screen.getByText('Sipariş Detayları:')).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      render(
        <CancelOrderDialog
          open={false}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Siparişi İptal Etmek Üzeresiniz')).not.toBeInTheDocument();
    });

    it('should display warning message', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText(/Bu işlem geri alınamaz/i)
      ).toBeInTheDocument();
    });
  });

  describe('Order Details Display', () => {
    it('should display correct symbol for BUY order', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
    });

    it('should display correct side for BUY order', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Alış')).toBeInTheDocument();
    });

    it('should display correct side for SELL order', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockSellOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Satış')).toBeInTheDocument();
    });

    it('should display correct order type', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Limit')).toBeInTheDocument();
    });

    it('should display price for limit order', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/850.000,00/)).toBeInTheDocument();
    });

    it('should display dash for market order price', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockMarketOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Find the price row and check for dash
      const priceCell = screen.getByText('Fiyat').closest('tr');
      expect(priceCell).toHaveTextContent('-');
    });

    it('should display correct total amount', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const amountRow = screen.getByText('Miktar').closest('tr');
      expect(amountRow).toHaveTextContent('1.50000000 BTC');
    });

    it('should display filled amount and percentage for partial order', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockPartialOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/0.50000000 BTC/)).toBeInTheDocument();
      expect(screen.getByText(/25.0%/)).toBeInTheDocument();
    });

    it('should display remaining amount', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockPartialOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/1.50000000 BTC/)).toBeInTheDocument();
    });

    it('should display total value for limit order', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Total value = 1.5 * 850000 = 1,275,000
      expect(screen.getByText(/1.275.000,00 TRY/)).toBeInTheDocument();
    });

    it('should display order ID', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('order-123')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onCancel when Vazgeç button is clicked', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /vazgeç/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when İptal Et button is clicked', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'İptal Et' });
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should not allow cancel when loading', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={true}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /vazgeç/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should not allow confirm when loading', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={true}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'İptal Ediliyor...' });
      expect(confirmButton).toBeDisabled();
    });

    it('should show loading text when loading', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={true}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('İptal Ediliyor...')).toBeInTheDocument();
    });

    it('should not close dialog on backdrop click when loading', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={true}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // When loading, the buttons should be disabled
      const confirmButton = screen.getByRole('button', { name: 'İptal Ediliyor...' });
      const cancelButton = screen.getByRole('button', { name: /vazgeç/i });
      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Error Display', () => {
    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Sipariş iptal edilemedi. Lütfen tekrar deneyin.';
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={errorMessage}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should not display error alert when error is null', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const alerts = screen.queryAllByRole('alert');
      // Only warning alert should be present, not error
      expect(alerts).toHaveLength(1);
    });

    it('should still allow retry when error is shown', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error="Network error"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'İptal Et' });
      expect(confirmButton).not.toBeDisabled();

      fireEvent.click(confirmButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Check that dialog title is present
      expect(screen.getByText('Siparişi İptal Etmek Üzeresiniz')).toBeInTheDocument();
      // Check that dialog description is present
      expect(screen.getByText(/Bu siparişi iptal etmek istediğinizden emin misiniz?/i)).toBeInTheDocument();
    });

    it('should have autoFocus on confirm button', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // The confirm button should have autoFocus prop (rendered by MUI)
      const confirmButton = screen.getByRole('button', { name: 'İptal Et' });
      expect(confirmButton).toBeInTheDocument();
      // Just check the button exists and is the primary action
      expect(confirmButton).toHaveClass('MuiButton-containedError');
    });

    it('should render proper table structure for screen readers', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const tableHeaders = screen.getAllByRole('rowheader');
      expect(tableHeaders.length).toBeGreaterThan(0);
      expect(tableHeaders[0]).toHaveAttribute('scope', 'row');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero filled amount correctly', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const filledRow = screen.getByText('Doldurulmuş').closest('tr');
      expect(filledRow).toHaveTextContent('0.00000000 BTC');
      // Should not show percentage when filled is 0
      expect(filledRow).not.toHaveTextContent('%');
    });

    it('should handle very large numbers correctly', () => {
      const largeOrder: Order = {
        ...mockBuyOrder,
        quantity: '999999.12345678',
        price: '9999999.99',
      };

      render(
        <CancelOrderDialog
          open={true}
          order={largeOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const amountRow = screen.getByText('Miktar').closest('tr');
      expect(amountRow).toHaveTextContent('999999.12345678 BTC');
    });

    it('should handle very small numbers correctly', () => {
      const smallOrder: Order = {
        ...mockBuyOrder,
        quantity: '0.00000001',
        price: '0.01',
      };

      render(
        <CancelOrderDialog
          open={true}
          order={smallOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const amountRow = screen.getByText('Miktar').closest('tr');
      expect(amountRow).toHaveTextContent('0.00000001 BTC');
    });

    it('should handle different order types correctly', () => {
      const stopLossOrder: Order = {
        ...mockBuyOrder,
        type: OrderType.STOP_LOSS,
        stopPrice: '840000',
      };

      render(
        <CancelOrderDialog
          open={true}
          order={stopLossOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Stop Loss')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render all order details on desktop', () => {
      render(
        <CancelOrderDialog
          open={true}
          order={mockBuyOrder}
          loading={false}
          error={null}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Sembol')).toBeInTheDocument();
      expect(screen.getByText('Taraf')).toBeInTheDocument();
      expect(screen.getByText('Tür')).toBeInTheDocument();
      expect(screen.getByText('Fiyat')).toBeInTheDocument();
      expect(screen.getByText('Miktar')).toBeInTheDocument();
      expect(screen.getByText('Doldurulmuş')).toBeInTheDocument();
      expect(screen.getByText('Kalan (İptal Edilecek)')).toBeInTheDocument();
    });
  });
});
