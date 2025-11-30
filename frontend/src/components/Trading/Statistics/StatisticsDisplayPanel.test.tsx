/**
 * Tests for StatisticsDisplayPanel
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import StatisticsDisplayPanel from './StatisticsDisplayPanel';

// Mock theme for tests
const theme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

// Mock ticker data
const mockTickerPositive = {
  highPrice: '2900000.00',
  lowPrice: '2700000.00',
  openPrice: '2800000.00',
  lastPrice: '2850000.00',
  volume: '150.5000',
  quoteVolume: '412156250.00',
  priceChange: '50000.00',
};

const mockTickerNegative = {
  highPrice: '2900000.00',
  lowPrice: '2700000.00',
  openPrice: '2800000.00',
  lastPrice: '2750000.00',
  volume: '150.5000',
  quoteVolume: '412156250.00',
  priceChange: '-50000.00',
};

const mockTickerZero = {
  highPrice: '2900000.00',
  lowPrice: '2700000.00',
  lastPrice: '2800000.00',
  volume: '150.5000',
  quoteVolume: '412156250.00',
  priceChange: '0.00',
};

describe('StatisticsDisplayPanel', () => {
  describe('Rendering', () => {
    it('renders all stat cards', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText('Piyasa İstatistikleri')).toBeInTheDocument();
      expect(screen.getByText('24S En Yüksek')).toBeInTheDocument();
      expect(screen.getByText('24S En Düşük')).toBeInTheDocument();
      expect(screen.getByText('Açılış Fiyatı')).toBeInTheDocument();
      expect(screen.getByText('Kapanış Fiyatı')).toBeInTheDocument();
      expect(screen.getByText('İşlem Hacmi (BTC)')).toBeInTheDocument();
      expect(screen.getByText('İşlem Hacmi (TRY)')).toBeInTheDocument();
    });

    it('renders values with correct formatting', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText('2.900.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText('2.700.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText('2.850.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText('150,5000')).toBeInTheDocument();
      expect(screen.getByText('412.156.250')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={null} symbol="BTC_TRY" loading={true} />
      );

      expect(screen.getByText('Piyasa İstatistikleri')).toBeInTheDocument();
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders error state', () => {
      const errorMessage = 'Veri yüklenirken bir hata oluştu';
      renderWithTheme(
        <StatisticsDisplayPanel
          ticker={null}
          symbol="BTC_TRY"
          error={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('renders empty state when ticker is null', () => {
      renderWithTheme(<StatisticsDisplayPanel ticker={null} symbol="BTC_TRY" />);

      expect(screen.getByText('İstatistik verisi yükleniyor...')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('displays green color for positive price change', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Check for trending up icon
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('displays red color for negative price change', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerNegative} symbol="BTC_TRY" />
      );

      // Check for trending down icon
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('displays neutral color for zero price change', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerZero} symbol="BTC_TRY" />
      );

      expect(screen.getByText('Piyasa İstatistikleri')).toBeInTheDocument();
    });
  });

  describe('Symbol Handling', () => {
    it('extracts base and quote currency from BTC_TRY', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText('İşlem Hacmi (BTC)')).toBeInTheDocument();
      expect(screen.getByText('İşlem Hacmi (TRY)')).toBeInTheDocument();
    });

    it('extracts base and quote currency from ETH_TRY', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="ETH_TRY" />
      );

      expect(screen.getByText('İşlem Hacmi (ETH)')).toBeInTheDocument();
    });

    it('extracts base and quote currency from USDT_TRY', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="USDT_TRY" />
      );

      expect(screen.getByText('İşlem Hacmi (USDT)')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper region role', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      const regionElement = screen.getByRole('region', { name: 'Piyasa istatistikleri' });
      expect(regionElement).toBeInTheDocument();
    });

    it('has proper ARIA labels for stat cards', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByLabelText(/24S En Yüksek/)).toBeInTheDocument();
      expect(screen.getByLabelText(/24S En Düşük/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Açılış Fiyatı/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Kapanış Fiyatı/)).toBeInTheDocument();
    });

    it('hides decorative icons from screen readers', () => {
      const { container } = renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Grid', () => {
    it('renders in responsive grid layout', () => {
      const { container } = renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Check for Grid container
      const gridContainers = container.querySelectorAll('.MuiGrid-container');
      expect(gridContainers.length).toBeGreaterThan(0);

      // Check for Grid items (6 stat cards)
      const gridItems = container.querySelectorAll('.MuiGrid-item');
      expect(gridItems.length).toBe(6);
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid values gracefully', () => {
      const invalidTicker = {
        highPrice: 'invalid',
        lowPrice: 'NaN',
        openPrice: '',
        lastPrice: 'undefined',
        volume: 'null',
        quoteVolume: '',
        priceChange: 'invalid',
      };

      renderWithTheme(
        <StatisticsDisplayPanel ticker={invalidTicker} symbol="BTC_TRY" />
      );

      expect(screen.getByText('Piyasa İstatistikleri')).toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      const largeTicker = {
        highPrice: '999999999999.99',
        lowPrice: '999999999999.99',
        openPrice: '999999999999.99',
        lastPrice: '999999999999.99',
        volume: '999999999.99',
        quoteVolume: '999999999999.99',
        priceChange: '999999999.99',
      };

      renderWithTheme(
        <StatisticsDisplayPanel ticker={largeTicker} symbol="BTC_TRY" />
      );

      expect(screen.getByText('Piyasa İstatistikleri')).toBeInTheDocument();
    });

    it('handles missing openPrice', () => {
      const tickerWithoutOpen = {
        ...mockTickerPositive,
        openPrice: undefined,
      };

      renderWithTheme(
        <StatisticsDisplayPanel ticker={tickerWithoutOpen} symbol="BTC_TRY" />
      );

      // Should use lastPrice as fallback for open
      expect(screen.getByText('Açılış Fiyatı')).toBeInTheDocument();
    });
  });

  describe('Formatting', () => {
    it('formats prices with Turkish locale', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Turkish locale uses . for thousands and , for decimals
      expect(screen.getByText('2.900.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText('2.700.000,00 TRY')).toBeInTheDocument();
    });

    it('formats volume with correct decimals', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Volume should be formatted with 4 decimals
      expect(screen.getByText('150,5000')).toBeInTheDocument();

      // Quote volume should be formatted with 0 decimals
      expect(screen.getByText('412.156.250')).toBeInTheDocument();
    });
  });

  describe('Summary Footer', () => {
    it('renders summary footer with 24h data label', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText('24 saatlik piyasa verileri')).toBeInTheDocument();
    });

    it('shows positive change indicator in footer', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText(/▲.*50000.*TRY/)).toBeInTheDocument();
    });

    it('shows negative change indicator in footer', () => {
      renderWithTheme(
        <StatisticsDisplayPanel ticker={mockTickerNegative} symbol="BTC_TRY" />
      );

      expect(screen.getByText(/▼.*50000.*TRY/)).toBeInTheDocument();
    });
  });
});
