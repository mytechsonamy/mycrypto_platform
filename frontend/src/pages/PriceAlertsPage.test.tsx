/**
 * Price Alerts Page Tests
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import PriceAlertsPage from './PriceAlertsPage';
import alertsReducer from '../store/slices/alertsSlice';
import tradingReducer from '../store/slices/tradingSlice';
import * as tradingApi from '../api/tradingApi';

// Mock toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock trading API
jest.mock('../api/tradingApi', () => ({
  getTicker: jest.fn(),
}));

const mockTicker = {
  symbol: 'BTC_TRY',
  lastPrice: '2850000',
  priceChange: '50000',
  priceChangePercent: '1.79',
  highPrice: '2900000',
  lowPrice: '2800000',
  volume: '100',
  quoteVolume: '285000000',
  openTime: Date.now() - 86400000,
  closeTime: Date.now(),
  firstId: 1,
  lastId: 100,
  count: 100,
};

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      alerts: alertsReducer,
      trading: tradingReducer,
    },
    preloadedState: initialState,
  });
};

const renderWithProviders = (component: React.ReactElement, store?: any) => {
  const mockStore = store || createMockStore();
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
};

describe('PriceAlertsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tradingApi.getTicker as jest.Mock).mockResolvedValue(mockTicker);
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Page Rendering', () => {
    it('renders page header and title', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByText('Fiyat Uyarıları')).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          /Kripto para fiyatlarını takip edin ve hedef fiyat seviyelerine ulaşıldığında bildirim alın/i
        )
      ).toBeInTheDocument();
    });

    it('shows loading spinner initially', () => {
      renderWithProviders(<PriceAlertsPage />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays active alerts count chip', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Aktif Uyarılar: 0\/10/i)).toBeInTheDocument();
      });
    });

    it('renders create alert form', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByText('Yeni Fiyat Uyarısı Oluştur')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/Sembol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Koşul/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hedef Fiyat/i)).toBeInTheDocument();
    });

    it('renders active alerts section', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Aktif Uyarılar \(0\)/i)).toBeInTheDocument();
      });
    });

    it('renders info section', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByText('Fiyat Uyarıları Hakkında')).toBeInTheDocument();
      });

      expect(screen.getByText(/Maksimum 10 aktif uyarı oluşturabilirsiniz/i)).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('loads current prices on mount', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(tradingApi.getTicker).toHaveBeenCalledWith('BTC_TRY');
        expect(tradingApi.getTicker).toHaveBeenCalledWith('ETH_TRY');
        expect(tradingApi.getTicker).toHaveBeenCalledWith('USDT_TRY');
      });
    });

    it('displays current price for selected symbol', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Güncel Fiyat:/i)).toBeInTheDocument();
      });
    });

    it('handles API error gracefully', async () => {
      (tradingApi.getTicker as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch ticker')
      );

      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Veri yüklenirken hata oluştu');
      });
    });
  });

  describe('Alert Creation', () => {
    it('creates alert successfully', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByText('Yeni Fiyat Uyarısı Oluştur')).toBeInTheDocument();
      });

      // Fill form
      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      fireEvent.change(priceInput, { target: { value: '2900000' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Fiyat uyarısı başarıyla oluşturuldu');
      });
    });

    it('validates price within acceptable range', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByText('Yeni Fiyat Uyarısı Oluştur')).toBeInTheDocument();
      });

      // Enter price too far from current (over 50% deviation)
      const priceInput = screen.getByLabelText(/Hedef Fiyat/i);
      fireEvent.change(priceInput, { target: { value: '5000000' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Fiyat güncel fiyatın %50 aralığında olmalı/i)
        ).toBeInTheDocument();
      });
    });

    it('prevents creating more than 10 alerts', async () => {
      // Create store with 10 active alerts
      const alerts = Array.from({ length: 10 }, (_, i) => ({
        id: `alert-${i}`,
        symbol: 'BTC_TRY',
        condition: 'ABOVE',
        price: 2900000 + i * 1000,
        notificationType: 'BOTH',
        status: 'ACTIVE',
        createdAt: Date.now(),
      }));

      const store = createMockStore({
        alerts: {
          alerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      renderWithProviders(<PriceAlertsPage />, store);

      await waitFor(() => {
        expect(
          screen.getByText(/Maksimum 10 aktif uyarı oluşturabilirsiniz/i)
        ).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Uyarı Oluştur/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Alert Display', () => {
    it('displays active alerts in list', async () => {
      const alerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY',
          condition: 'ABOVE',
          price: 2900000,
          notificationType: 'BOTH',
          status: 'ACTIVE',
          createdAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      renderWithProviders(<PriceAlertsPage />, store);

      await waitFor(() => {
        expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
        expect(screen.getByText(/2.900.000/)).toBeInTheDocument();
      });
    });

    it('shows empty state when no alerts', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Henüz aktif uyarınız bulunmamaktadır/i)
        ).toBeInTheDocument();
      });
    });

    it('displays triggered alerts count chip', async () => {
      const triggeredAlerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY',
          condition: 'ABOVE',
          price: 2900000,
          currentPrice: 2905000,
          notificationType: 'BOTH',
          status: 'TRIGGERED',
          createdAt: Date.now() - 3600000,
          triggeredAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts: [],
          triggeredAlerts,
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      renderWithProviders(<PriceAlertsPage />, store);

      await waitFor(() => {
        expect(screen.getByText(/Tetiklenen: 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('Alert Actions', () => {
    it('deletes alert when delete button clicked', async () => {
      const alerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY',
          condition: 'ABOVE',
          price: 2900000,
          notificationType: 'BOTH',
          status: 'ACTIVE',
          createdAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts,
          triggeredAlerts: [],
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      renderWithProviders(<PriceAlertsPage />, store);

      await waitFor(() => {
        expect(screen.getByText('BTC/TRY')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByLabelText(/Sil/i);
      fireEvent.click(deleteButton);

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText(/Uyarıyı Sil/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /Sil/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Uyarı başarıyla silindi');
      });
    });

    it('clears triggered alerts history', async () => {
      const triggeredAlerts = [
        {
          id: 'alert-1',
          symbol: 'BTC_TRY',
          condition: 'ABOVE',
          price: 2900000,
          currentPrice: 2905000,
          notificationType: 'BOTH',
          status: 'TRIGGERED',
          createdAt: Date.now() - 3600000,
          triggeredAt: Date.now(),
        },
      ];

      const store = createMockStore({
        alerts: {
          alerts: [],
          triggeredAlerts,
          loading: false,
          error: null,
          editingAlertId: null,
        },
      });

      renderWithProviders(<PriceAlertsPage />, store);

      await waitFor(() => {
        expect(screen.getByText('Tetiklenmiş Uyarılar')).toBeInTheDocument();
      });

      const clearButton = screen.getByText(/Geçmişi Temizle/i);
      fireEvent.click(clearButton);

      expect(toast.info).toHaveBeenCalledWith('Uyarı geçmişi temizlendi');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Sembol/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/Koşul/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hedef Fiyat/i)).toBeInTheDocument();
    });

    it('has semantic HTML structure', async () => {
      renderWithProviders(<PriceAlertsPage />);

      await waitFor(() => {
        expect(screen.getByText('Fiyat Uyarıları')).toBeInTheDocument();
      });

      expect(screen.getByText('Yeni Fiyat Uyarısı Oluştur')).toBeInTheDocument();
    });
  });
});
