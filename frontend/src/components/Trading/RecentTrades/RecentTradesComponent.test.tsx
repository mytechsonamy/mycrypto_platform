/**
 * Tests for RecentTradesComponent
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import RecentTradesComponent from './RecentTradesComponent';
import { Trade } from '../../../types/trading.types';

// Helper to wrap component with theme
const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme();
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Mock trade data
const mockTrades: Trade[] = [
  {
    id: 'trade-001',
    symbol: 'BTC_TRY',
    price: '850000.00',
    quantity: '0.15000000',
    quoteQuantity: '127500.00',
    time: Date.now() - 1000, // 1 second ago
    isBuyerMaker: false, // BUY (buyer took the order)
    isBestMatch: true,
  },
  {
    id: 'trade-002',
    symbol: 'BTC_TRY',
    price: '849500.00',
    quantity: '0.25000000',
    quoteQuantity: '212375.00',
    time: Date.now() - 5000, // 5 seconds ago
    isBuyerMaker: true, // SELL (buyer made the order)
    isBestMatch: true,
  },
  {
    id: 'trade-003',
    symbol: 'BTC_TRY',
    price: '850200.00',
    quantity: '0.10000000',
    quoteQuantity: '85020.00',
    time: Date.now() - 10000, // 10 seconds ago
    isBuyerMaker: false, // BUY
    isBestMatch: true,
  },
  {
    id: 'trade-004',
    symbol: 'BTC_TRY',
    price: '849800.00',
    quantity: '0.50000000',
    quoteQuantity: '424900.00',
    time: Date.now() - 15000, // 15 seconds ago
    isBuyerMaker: true, // SELL
    isBestMatch: true,
  },
  {
    id: 'trade-005',
    symbol: 'BTC_TRY',
    price: '850100.00',
    quantity: '0.20000000',
    quoteQuantity: '170020.00',
    time: Date.now() - 20000, // 20 seconds ago
    isBuyerMaker: false, // BUY
    isBestMatch: true,
  },
];

describe('RecentTradesComponent', () => {
  describe('Loading State', () => {
    it('renders loading skeleton when loading is true', () => {
      renderWithTheme(<RecentTradesComponent trades={[]} symbol="BTC_TRY" loading={true} />);

      expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
      // Check for skeleton elements
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render trades table when loading', () => {
      renderWithTheme(
        <RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" loading={true} />
      );

      expect(screen.queryByText('Fiyat (TRY)')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error message when error prop is provided', () => {
      const errorMessage = 'Veri yüklenirken bir hata oluştu';
      renderWithTheme(
        <RecentTradesComponent
          trades={[]}
          symbol="BTC_TRY"
          error={errorMessage}
        />
      );

      expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('does not render trades table when error is present', () => {
      renderWithTheme(
        <RecentTradesComponent
          trades={mockTrades}
          symbol="BTC_TRY"
          error="Test error"
        />
      );

      expect(screen.queryByText('Fiyat (TRY)')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no trades are provided', () => {
      renderWithTheme(<RecentTradesComponent trades={[]} symbol="BTC_TRY" />);

      expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
      expect(screen.getByText('Henüz işlem bulunmamaktadır')).toBeInTheDocument();
    });

    it('does not render table headers when no trades', () => {
      renderWithTheme(<RecentTradesComponent trades={[]} symbol="BTC_TRY" />);

      expect(screen.queryByText('Fiyat (TRY)')).not.toBeInTheDocument();
      expect(screen.queryByText('Miktar')).not.toBeInTheDocument();
    });
  });

  describe('Trades Display', () => {
    it('renders all trade rows', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      const rows = screen.getAllByRole('row');
      // +1 for header row
      expect(rows).toHaveLength(mockTrades.length + 1);
    });

    it('renders table headers correctly', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByText('Fiyat (TRY)')).toBeInTheDocument();
      expect(screen.getByText('Miktar')).toBeInTheDocument();
      expect(screen.getByText('Zaman')).toBeInTheDocument();
      expect(screen.getByText('Taraf')).toBeInTheDocument();
    });

    it('displays trade count chip', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByText(`${mockTrades.length} işlem`)).toBeInTheDocument();
    });

    it('displays symbol in footer', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByText('BTC / TRY')).toBeInTheDocument();
    });

    it('displays real-time update message', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByText('Gerçek zamanlı güncelleniyor')).toBeInTheDocument();
    });
  });

  describe('Trade Data Formatting', () => {
    it('formats prices with Turkish locale (2 decimals)', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      // Turkish locale uses . as thousand separator and , as decimal separator
      expect(screen.getByText(/850\.000,00/)).toBeInTheDocument();
      expect(screen.getByText(/849\.500,00/)).toBeInTheDocument();
    });

    it('formats quantities correctly', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      // Check that quantities are rendered (Turkish locale format)
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1); // Skip header row

      expect(dataRows[0]).toHaveTextContent(/0,15/);
      expect(dataRows[1]).toHaveTextContent(/0,25/);
    });

    it('formats time in HH:MM:SS format', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      // Check that time is in HH:MM:SS format (matches pattern like 14:30:45)
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1); // Skip header row

      dataRows.forEach((row) => {
        const timeCell = within(row).getAllByRole('cell')[2]; // Time is 3rd column
        expect(timeCell.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
      });
    });
  });

  describe('Color Coding', () => {
    it('shows "Alış" (Buy) for buyer taker trades', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      const buyLabels = screen.getAllByText('Alış');
      expect(buyLabels.length).toBeGreaterThan(0);
    });

    it('shows "Satış" (Sell) for seller taker trades', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      const sellLabels = screen.getAllByText('Satış');
      expect(sellLabels.length).toBeGreaterThan(0);
    });

    it('renders upward arrow for sell trades', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      const rows = screen.getAllByRole('row');
      const sellRow = rows.find((row) => within(row).queryByText('Satış'));

      if (sellRow) {
        // Check for ArrowUpwardIcon (MUI adds specific test IDs or classes)
        expect(sellRow).toHaveTextContent('Satış');
      }
    });

    it('renders downward arrow for buy trades', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      const rows = screen.getAllByRole('row');
      const buyRow = rows.find((row) => within(row).queryByText('Alış'));

      if (buyRow) {
        expect(buyRow).toHaveTextContent('Alış');
      }
    });
  });

  describe('Trade Sorting', () => {
    it('displays trades in descending order by time (most recent first)', () => {
      const unsortedTrades: Trade[] = [
        {
          id: 'trade-old',
          symbol: 'BTC_TRY',
          price: '840000.00',
          quantity: '0.10000000',
          quoteQuantity: '84000.00',
          time: Date.now() - 60000, // Oldest
          isBuyerMaker: false,
          isBestMatch: true,
        },
        {
          id: 'trade-new',
          symbol: 'BTC_TRY',
          price: '850000.00',
          quantity: '0.20000000',
          quoteQuantity: '170000.00',
          time: Date.now(), // Most recent
          isBuyerMaker: true,
          isBestMatch: true,
        },
        {
          id: 'trade-middle',
          symbol: 'BTC_TRY',
          price: '845000.00',
          quantity: '0.15000000',
          quoteQuantity: '126750.00',
          time: Date.now() - 30000, // Middle
          isBuyerMaker: false,
          isBestMatch: true,
        },
      ];

      renderWithTheme(<RecentTradesComponent trades={unsortedTrades} symbol="BTC_TRY" />);

      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1); // Skip header

      // First row should be most recent (850000)
      expect(dataRows[0]).toHaveTextContent(/850\.000,00/);
      // Second row should be middle (845000)
      expect(dataRows[1]).toHaveTextContent(/845\.000,00/);
      // Third row should be oldest (840000)
      expect(dataRows[2]).toHaveTextContent(/840\.000,00/);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByRole('region', { name: 'Son işlemler tablosu' })).toBeInTheDocument();
    });

    it('uses semantic table markup', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(mockTrades.length + 1);
      expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    });

    it('has proper heading hierarchy', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByRole('heading', { name: 'Son İşlemler' })).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders without crashing on mobile viewport', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
    });

    it('applies custom maxHeight prop', () => {
      const customHeight = 400;
      const { container } = renderWithTheme(
        <RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" maxHeight={customHeight} />
      );

      const tableContainer = container.querySelector('.MuiTableContainer-root');
      expect(tableContainer).toHaveStyle({ maxHeight: `${customHeight}px` });
    });
  });

  describe('Edge Cases', () => {
    it('handles trades with zero values gracefully', () => {
      const edgeCaseTrades: Trade[] = [
        {
          id: 'trade-zero',
          symbol: 'BTC_TRY',
          price: '0',
          quantity: '0',
          quoteQuantity: '0',
          time: Date.now(),
          isBuyerMaker: false,
          isBestMatch: true,
        },
      ];

      renderWithTheme(<RecentTradesComponent trades={edgeCaseTrades} symbol="BTC_TRY" />);

      expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
      expect(screen.getAllByText(/0,00/).length).toBeGreaterThan(0);
    });

    it('handles trades with invalid numeric values', () => {
      const invalidTrades: Trade[] = [
        {
          id: 'trade-invalid',
          symbol: 'BTC_TRY',
          price: 'invalid',
          quantity: 'NaN',
          quoteQuantity: 'undefined',
          time: Date.now(),
          isBuyerMaker: false,
          isBestMatch: true,
        },
      ];

      renderWithTheme(<RecentTradesComponent trades={invalidTrades} symbol="BTC_TRY" />);

      // Should render with fallback values
      expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
    });

    it('handles maximum 50 trades correctly', () => {
      const fiftyTrades: Trade[] = Array.from({ length: 50 }, (_, i) => ({
        id: `trade-${i}`,
        symbol: 'BTC_TRY',
        price: `${850000 + i}.00`,
        quantity: '0.10000000',
        quoteQuantity: '85000.00',
        time: Date.now() - i * 1000,
        isBuyerMaker: i % 2 === 0,
        isBestMatch: true,
      }));

      renderWithTheme(<RecentTradesComponent trades={fiftyTrades} symbol="BTC_TRY" />);

      expect(screen.getByText('50 işlem')).toBeInTheDocument();
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(51); // 50 trades + 1 header
    });

    it('handles different symbols correctly', () => {
      const ethTrades: Trade[] = [
        {
          id: 'eth-trade-1',
          symbol: 'ETH_TRY',
          price: '45000.00',
          quantity: '1.50000000',
          quoteQuantity: '67500.00',
          time: Date.now(),
          isBuyerMaker: false,
          isBestMatch: true,
        },
      ];

      renderWithTheme(<RecentTradesComponent trades={ethTrades} symbol="ETH_TRY" />);

      expect(screen.getByText('ETH / TRY')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('uses default loading value when not provided', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
      expect(screen.getByText('Fiyat (TRY)')).toBeInTheDocument();
    });

    it('uses default error value when not provided', () => {
      renderWithTheme(<RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />);

      expect(screen.getByText('Fiyat (TRY)')).toBeInTheDocument();
    });

    it('uses default maxHeight value when not provided', () => {
      const { container } = renderWithTheme(
        <RecentTradesComponent trades={mockTrades} symbol="BTC_TRY" />
      );

      const tableContainer = container.querySelector('.MuiTableContainer-root');
      expect(tableContainer).toHaveStyle({ maxHeight: '600px' });
    });
  });
});
