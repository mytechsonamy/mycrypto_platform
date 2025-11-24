/**
 * Create Alert Form Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateAlertForm from './CreateAlertForm';
import { AlertCondition, NotificationType } from '../../types/alerts.types';

const mockOnSubmit = jest.fn();

const defaultProps = {
  onSubmit: mockOnSubmit,
  loading: false,
  error: null,
  currentPrices: {
    BTC_TRY: 2850000,
    ETH_TRY: 220000,
    USDT_TRY: 33.5,
  },
  activeAlertsCount: 0,
  maxAlerts: 10,
};

describe('CreateAlertForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders form with all fields', () => {
      render(<CreateAlertForm {...defaultProps} />);

      expect(screen.getByText('Yeni Fiyat Uyarısı Oluştur')).toBeInTheDocument();
      expect(screen.getByLabelText(/Sembol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Koşul/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hedef Fiyat/i)).toBeInTheDocument();
      expect(screen.getByText(/Bildirim Türü/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Uyarı Oluştur/i })).toBeInTheDocument();
    });

    it('displays current price for selected symbol', () => {
      render(<CreateAlertForm {...defaultProps} />);

      expect(screen.getByText(/Güncel Fiyat: 2.850.000 TRY/i)).toBeInTheDocument();
    });

    it('displays error message when provided', () => {
      const props = { ...defaultProps, error: 'Test error message' };
      render(<CreateAlertForm {...props} />);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('shows warning when max alerts reached', () => {
      const props = { ...defaultProps, activeAlertsCount: 10 };
      render(<CreateAlertForm {...props} />);

      expect(
        screen.getByText(/Maksimum 10 aktif uyarı oluşturabilirsiniz/i)
      ).toBeInTheDocument();
    });

    it('disables submit button when loading', () => {
      const props = { ...defaultProps, loading: true };
      render(<CreateAlertForm {...props} />);

      const submitButton = screen.getByRole('button', { name: /Oluşturuluyor/i });
      expect(submitButton).toBeDisabled();
    });

    it('disables submit button when max alerts reached', () => {
      const props = { ...defaultProps, activeAlertsCount: 10 };
      render(<CreateAlertForm {...props} />);

      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Interactions', () => {
    it('allows selecting different trading pairs', () => {
      render(<CreateAlertForm {...defaultProps} />);

      const symbolSelect = screen.getByLabelText(/Sembol/i);
      fireEvent.mouseDown(symbolSelect);

      const ethOption = screen.getByText('ETH/TRY');
      fireEvent.click(ethOption);

      expect(screen.getByText(/Güncel Fiyat: 220.000 TRY/i)).toBeInTheDocument();
    });

    it('allows selecting alert condition', () => {
      render(<CreateAlertForm {...defaultProps} />);

      const conditionSelect = screen.getByLabelText(/Koşul/i);
      fireEvent.mouseDown(conditionSelect);

      const belowOption = screen.getByText(/Fiyat Düşerse/i);
      fireEvent.click(belowOption);

      // Verify condition changed
      expect(screen.getByText(/Fiyat Düşerse/i)).toBeInTheDocument();
    });

    it('allows entering target price', () => {
      render(<CreateAlertForm {...defaultProps} />);

      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      fireEvent.change(priceInput, { target: { value: '2900000' } });

      expect(priceInput).toHaveValue(2900000);
    });

    it('handles notification type checkbox changes', () => {
      render(<CreateAlertForm {...defaultProps} />);

      const emailCheckbox = screen.getByLabelText(/E-posta/i);
      const inAppCheckbox = screen.getByLabelText(/Uygulama İçi/i);

      // Initially both should be checked (BOTH)
      expect(emailCheckbox).toBeChecked();
      expect(inAppCheckbox).toBeChecked();

      // Uncheck email
      fireEvent.click(emailCheckbox);
      expect(emailCheckbox).not.toBeChecked();
      expect(inAppCheckbox).toBeChecked();

      // Check email again
      fireEvent.click(emailCheckbox);
      expect(emailCheckbox).toBeChecked();
      expect(inAppCheckbox).toBeChecked();
    });

    it('toggles active status checkbox', () => {
      render(<CreateAlertForm {...defaultProps} />);

      const activeCheckbox = screen.getByLabelText(/Uyarıyı aktif olarak oluştur/i);
      expect(activeCheckbox).toBeChecked();

      fireEvent.click(activeCheckbox);
      expect(activeCheckbox).not.toBeChecked();
    });
  });

  describe('Form Validation', () => {
    it('validates empty price', async () => {
      render(<CreateAlertForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Fiyat giriniz/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates invalid price (negative)', async () => {
      render(<CreateAlertForm {...defaultProps} />);

      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      fireEvent.change(priceInput, { target: { value: '-1000' } });

      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Geçerli bir fiyat giriniz/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates price deviation from current price', async () => {
      render(<CreateAlertForm {...defaultProps} />);

      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      // Price too high (more than 50% above current)
      fireEvent.change(priceInput, { target: { value: '5000000' } });

      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Fiyat güncel fiyatın %50 aralığında olmalı/i)
        ).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates when current price is not available', async () => {
      const props = { ...defaultProps, currentPrices: {} };
      render(<CreateAlertForm {...props} />);

      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      fireEvent.change(priceInput, { target: { value: '2900000' } });

      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Güncel fiyat bilgisi alınamadı/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('clears validation error when field is corrected', async () => {
      render(<CreateAlertForm {...defaultProps} />);

      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });

      // Submit with empty price
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Fiyat giriniz/i)).toBeInTheDocument();
      });

      // Enter valid price
      fireEvent.change(priceInput, { target: { value: '2900000' } });

      // Error should be cleared
      expect(screen.queryByText(/Fiyat giriniz/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      render(<CreateAlertForm {...defaultProps} />);

      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      fireEvent.change(priceInput, { target: { value: '2900000' } });

      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          symbol: 'BTC_TRY',
          condition: AlertCondition.ABOVE,
          price: '2900000',
          notificationType: NotificationType.BOTH,
          isActive: true,
        });
      });
    });

    it('resets form after successful submission', async () => {
      render(<CreateAlertForm {...defaultProps} />);

      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      fireEvent.change(priceInput, { target: { value: '2900000' } });

      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      // Form should be reset
      expect(priceInput).toHaveValue(null);
    });

    it('submits with selected symbol and condition', async () => {
      render(<CreateAlertForm {...defaultProps} />);

      // Select ETH/TRY
      const symbolSelect = screen.getByLabelText(/Sembol/i);
      fireEvent.mouseDown(symbolSelect);
      fireEvent.click(screen.getByText('ETH/TRY'));

      // Select BELOW condition
      const conditionSelect = screen.getByLabelText(/Koşul/i);
      fireEvent.mouseDown(conditionSelect);
      fireEvent.click(screen.getByText(/Fiyat Düşerse/i));

      // Enter price
      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      fireEvent.change(priceInput, { target: { value: '200000' } });

      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          symbol: 'ETH_TRY',
          condition: AlertCondition.BELOW,
          price: '200000',
          notificationType: NotificationType.BOTH,
          isActive: true,
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all form fields', () => {
      render(<CreateAlertForm {...defaultProps} />);

      expect(screen.getByLabelText(/Sembol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Koşul/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hedef Fiyat/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/E-posta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Uygulama İçi/i)).toBeInTheDocument();
    });

    it('displays helper text for price input', () => {
      render(<CreateAlertForm {...defaultProps} />);

      expect(screen.getByText(/Uyarı tetiklenecek fiyat seviyesi/i)).toBeInTheDocument();
    });
  });
});
