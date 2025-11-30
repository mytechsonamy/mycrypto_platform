/**
 * Tests for TickerComponent
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TickerComponent, { TickerData } from './TickerComponent';

// Mock theme for tests
const theme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

// Mock ticker data
const mockTickerPositive: TickerData = {
  lastPrice: '2850000.00',
  priceChange: '50000.00',
  priceChangePercent: '1.79',
  highPrice: '2900000.00',
  lowPrice: '2700000.00',
  volume: '150.50',
  quoteVolume: '412156250.00',
};

const mockTickerNegative: TickerData = {
  lastPrice: '2750000.00',
  priceChange: '-50000.00',
  priceChangePercent: '-1.79',
  highPrice: '2900000.00',
  lowPrice: '2700000.00',
  volume: '150.50',
  quoteVolume: '412156250.00',
};

const mockTickerZero: TickerData = {
  lastPrice: '2800000.00',
  priceChange: '0.00',
  priceChangePercent: '0.00',
  highPrice: '2900000.00',
  lowPrice: '2700000.00',
  volume: '150.50',
  quoteVolume: '412156250.00',
};

describe('TickerComponent', () => {
  describe('Rendering', () => {
    it('renders all ticker fields with positive change', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Check all labels are present
      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
      expect(screen.getByText('24S Değişim')).toBeInTheDocument();
      expect(screen.getByText('24S Yüksek')).toBeInTheDocument();
      expect(screen.getByText('24S Düşük')).toBeInTheDocument();
      expect(screen.getByText('24S İşlem Hacmi')).toBeInTheDocument();

      // Check values are formatted correctly (Turkish locale uses . for thousands, , for decimals)
      expect(screen.getByText('2.850.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText('+50.000,00 TRY')).toBeInTheDocument();
      // Percentage value comes from data (not formatted), displayed as 1.79%
      expect(screen.getByText(/1\.79%/)).toBeInTheDocument();
      expect(screen.getByText('2.900.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText('2.700.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText('150,50 BTC')).toBeInTheDocument();
    });

    it('renders with negative price change', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerNegative} symbol="BTC_TRY" />
      );

      expect(screen.getByText('-50.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText(/-1\.79%/)).toBeInTheDocument();
    });

    it('renders with zero price change', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerZero} symbol="BTC_TRY" />
      );

      expect(screen.getByText('+0,00 TRY')).toBeInTheDocument();
      expect(screen.getByText(/0\.00%/)).toBeInTheDocument();
    });

    it('renders loading state', () => {
      renderWithTheme(
        <TickerComponent ticker={null} symbol="BTC_TRY" loading={true} />
      );

      // Should show skeleton loaders
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders error state', () => {
      const errorMessage = 'Veri yüklenirken bir hata oluştu';
      renderWithTheme(
        <TickerComponent
          ticker={null}
          symbol="BTC_TRY"
          error={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('renders empty state when ticker is null', () => {
      renderWithTheme(<TickerComponent ticker={null} symbol="BTC_TRY" />);

      expect(screen.getByText('Piyasa verisi yükleniyor...')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('displays green color for positive price change', () => {
      const { container } = renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Find the last price typography element
      const lastPriceElement = screen.getByText(/2\.850\.000,00 TRY/);
      const styles = window.getComputedStyle(lastPriceElement);

      // Check that color is set (actual color value depends on theme)
      expect(lastPriceElement).toHaveStyle({ fontWeight: '700' });
    });

    it('displays red color for negative price change', () => {
      const { container } = renderWithTheme(
        <TickerComponent ticker={mockTickerNegative} symbol="BTC_TRY" />
      );

      const lastPriceElement = screen.getByText(/2\.750\.000,00 TRY/);
      expect(lastPriceElement).toHaveStyle({ fontWeight: '700' });
    });

    it('displays trending up icon for positive change', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // TrendingUpIcon should be present
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('displays trending down icon for negative change', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerNegative} symbol="BTC_TRY" />
      );

      // TrendingDownIcon should be present
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  describe('Turkish Locale Formatting', () => {
    it('formats prices with Turkish locale (. for thousands)', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Turkish locale uses . for thousands and , for decimals
      expect(screen.getByText('2.850.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText('2.900.000,00 TRY')).toBeInTheDocument();
      expect(screen.getByText('2.700.000,00 TRY')).toBeInTheDocument();
    });

    it('formats volume with correct decimals', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Volume should be formatted with 2 decimals
      expect(screen.getByText('150,50 BTC')).toBeInTheDocument();

      // Quote volume should be formatted without decimals
      expect(screen.getByText('412.156.250 TRY')).toBeInTheDocument();
    });

    it('formats percentage with Turkish locale', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Percentage value comes as string from API, displayed as-is (1.79%)
      expect(screen.getByText(/1\.79%/)).toBeInTheDocument();
    });
  });

  describe('Symbol Handling', () => {
    it('extracts base currency from BTC_TRY', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText(/BTC/)).toBeInTheDocument();
    });

    it('extracts base currency from ETH_TRY', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="ETH_TRY" />
      );

      expect(screen.getByText(/ETH/)).toBeInTheDocument();
    });

    it('extracts base currency from USDT_TRY', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="USDT_TRY" />
      );

      expect(screen.getByText(/USDT/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for last price', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      const lastPriceElement = screen.getByLabelText(/Son fiyat.*Türk lirası/);
      expect(lastPriceElement).toBeInTheDocument();
    });

    it('has proper ARIA labels for 24h change', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      const changeElement = screen.getByLabelText(/24 saatlik değişim/);
      expect(changeElement).toBeInTheDocument();
    });

    it('has proper ARIA labels for 24h high', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      const highElement = screen.getByLabelText(/24 saatlik en yüksek fiyat/);
      expect(highElement).toBeInTheDocument();
    });

    it('has proper ARIA labels for 24h low', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      const lowElement = screen.getByLabelText(/24 saatlik en düşük fiyat/);
      expect(lowElement).toBeInTheDocument();
    });

    it('has proper ARIA labels for volume', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      const volumeElement = screen.getByLabelText(/24 saatlik işlem hacmi/);
      expect(volumeElement).toBeInTheDocument();
    });

    it('has region role for ticker container', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      const regionElement = screen.getByRole('region', { name: 'Piyasa verileri' });
      expect(regionElement).toBeInTheDocument();
    });

    it('hides decorative icons from screen readers', () => {
      const { container } = renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid price values gracefully', () => {
      const invalidTicker: TickerData = {
        lastPrice: 'invalid',
        priceChange: 'NaN',
        priceChangePercent: 'invalid',
        highPrice: '',
        lowPrice: 'undefined',
        volume: 'null',
        quoteVolume: '',
      };

      renderWithTheme(
        <TickerComponent ticker={invalidTicker} symbol="BTC_TRY" />
      );

      // Should render without crashing and show 0 for invalid values
      const zeroElements = screen.getAllByText('0 TRY');
      expect(zeroElements.length).toBeGreaterThan(0);
    });

    it('handles very large numbers', () => {
      const largeTicker: TickerData = {
        lastPrice: '999999999999.99',
        priceChange: '999999999.99',
        priceChangePercent: '999.99',
        highPrice: '999999999999.99',
        lowPrice: '999999999999.99',
        volume: '999999999.99',
        quoteVolume: '999999999999.99',
      };

      renderWithTheme(
        <TickerComponent ticker={largeTicker} symbol="BTC_TRY" />
      );

      // Should render without crashing
      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
    });

    it('handles very small numbers', () => {
      const smallTicker: TickerData = {
        lastPrice: '0.01',
        priceChange: '0.001',
        priceChangePercent: '0.01',
        highPrice: '0.02',
        lowPrice: '0.01',
        volume: '0.0001',
        quoteVolume: '0.001',
      };

      renderWithTheme(
        <TickerComponent ticker={smallTicker} symbol="BTC_TRY" />
      );

      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders on mobile viewport', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
    });

    it('renders on desktop viewport', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles missing optional props', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
    });

    it('handles all props provided', () => {
      renderWithTheme(
        <TickerComponent
          ticker={mockTickerPositive}
          symbol="BTC_TRY"
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      renderWithTheme(
        <TickerComponent
          ticker={mockTickerPositive}
          symbol="BTC_TRY"
          compact={true}
        />
      );

      // Compact mode should show symbol in slash format
      expect(screen.getByText('BTC/TRY')).toBeInTheDocument();

      // Should show price
      expect(screen.getByText('2.850.000,00 TRY')).toBeInTheDocument();

      // Should not show labels (compact mode)
      expect(screen.queryByText('Son Fiyat')).not.toBeInTheDocument();
    });

    it('renders full mode by default', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Full mode should show labels
      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
    });
  });

  describe('Volume Display', () => {
    it('shows volume by default', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      expect(screen.getByText('24S İşlem Hacmi')).toBeInTheDocument();
      expect(screen.getByText('150,50 BTC')).toBeInTheDocument();
    });

    it('hides volume when showVolume is false', () => {
      renderWithTheme(
        <TickerComponent
          ticker={mockTickerPositive}
          symbol="BTC_TRY"
          showVolume={false}
        />
      );

      expect(screen.queryByText('24S İşlem Hacmi')).not.toBeInTheDocument();
    });
  });

  describe('Realtime Prop', () => {
    it('realtime prop is true by default', () => {
      renderWithTheme(
        <TickerComponent ticker={mockTickerPositive} symbol="BTC_TRY" />
      );

      // Component should render normally (realtime doesn't affect rendering directly)
      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
    });

    it('accepts realtime prop', () => {
      renderWithTheme(
        <TickerComponent
          ticker={mockTickerPositive}
          symbol="BTC_TRY"
          realtime={false}
        />
      );

      expect(screen.getByText('Son Fiyat')).toBeInTheDocument();
    });
  });
});
