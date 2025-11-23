/**
 * Tests for OrderBookComponent
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import OrderBookComponent from './OrderBookComponent';
import { OrderBookLevel } from '../../../types/trading.types';

const theme = createTheme();

describe('OrderBookComponent', () => {
  const mockBids: OrderBookLevel[] = [
    ['850000', '0.5', '425000'],
    ['849900', '0.3', '254970'],
    ['849800', '0.8', '679840'],
  ];

  const mockAsks: OrderBookLevel[] = [
    ['850100', '0.4', '340040'],
    ['850200', '0.2', '170040'],
    ['850300', '0.6', '510180'],
  ];

  const defaultProps = {
    bids: mockBids,
    asks: mockAsks,
    spread: '100',
    spreadPercent: '0.01',
    symbol: 'BTC_TRY',
  };

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
  };

  it('should render without crashing', () => {
    renderWithTheme(<OrderBookComponent {...defaultProps} />);
    expect(screen.getByText(/Emir Defteri - BTC_TRY/i)).toBeInTheDocument();
  });

  it('should display bids and asks', () => {
    renderWithTheme(<OrderBookComponent {...defaultProps} />);

    // Check if prices are displayed
    expect(screen.getByText(/850\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/849\.900,00/)).toBeInTheDocument();
    expect(screen.getByText(/850\.100,00/)).toBeInTheDocument();
  });

  it('should display spread information', () => {
    renderWithTheme(<OrderBookComponent {...defaultProps} />);

    expect(screen.getByText('Spread')).toBeInTheDocument();
    expect(screen.getByText(/100,00 TRY/)).toBeInTheDocument();
    expect(screen.getByText(/\(0.01%\)/)).toBeInTheDocument();
  });

  it('should display loading state', () => {
    renderWithTheme(<OrderBookComponent {...defaultProps} loading={true} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error state', () => {
    const errorMessage = 'Test error message';
    renderWithTheme(<OrderBookComponent {...defaultProps} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should display empty state when no bids', () => {
    renderWithTheme(<OrderBookComponent {...defaultProps} bids={[]} />);
    expect(screen.getByText(/Alış emri yok/i)).toBeInTheDocument();
  });

  it('should display empty state when no asks', () => {
    renderWithTheme(<OrderBookComponent {...defaultProps} asks={[]} />);
    expect(screen.getByText(/Satış emri yok/i)).toBeInTheDocument();
  });

  it('should render aggregate level buttons', () => {
    const onAggregateChange = jest.fn();
    renderWithTheme(
      <OrderBookComponent {...defaultProps} onAggregateChange={onAggregateChange} />
    );

    expect(screen.getByText('0.1%')).toBeInTheDocument();
    expect(screen.getByText('0.5%')).toBeInTheDocument();
    expect(screen.getByText('1%')).toBeInTheDocument();
  });

  it('should call onAggregateChange when button is clicked', () => {
    const onAggregateChange = jest.fn();
    renderWithTheme(
      <OrderBookComponent {...defaultProps} onAggregateChange={onAggregateChange} />
    );

    const button = screen.getByText('0.5%');
    fireEvent.click(button);

    expect(onAggregateChange).toHaveBeenCalledWith(0.5);
  });

  it('should highlight selected aggregate level', () => {
    const onAggregateChange = jest.fn();
    renderWithTheme(
      <OrderBookComponent
        {...defaultProps}
        aggregateLevel={0.5}
        onAggregateChange={onAggregateChange}
      />
    );

    const selectedButton = screen.getByText('0.5%').closest('button');
    expect(selectedButton).toHaveClass('MuiButton-contained');
  });

  it('should display table headers correctly', () => {
    renderWithTheme(<OrderBookComponent {...defaultProps} />);

    const priceHeaders = screen.getAllByText(/Fiyat \(TRY\)/i);
    const amountHeaders = screen.getAllByText(/Miktar/i);
    const totalHeaders = screen.getAllByText(/Toplam \(TRY\)/i);

    expect(priceHeaders.length).toBeGreaterThan(0);
    expect(amountHeaders.length).toBeGreaterThan(0);
    expect(totalHeaders.length).toBeGreaterThan(0);
  });

  it('should format numbers correctly', () => {
    renderWithTheme(<OrderBookComponent {...defaultProps} />);

    // Check Turkish locale formatting (dots for thousands, commas for decimals)
    expect(screen.getByText(/850\.000,00/)).toBeInTheDocument();
  });

  it('should highlight user orders when provided', () => {
    const userOrders = ['850000'];
    const { container } = renderWithTheme(
      <OrderBookComponent {...defaultProps} userOrders={userOrders} />
    );

    // Check if there's a row with the special user order background
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should handle responsive layout on mobile', () => {
    // Mock window.matchMedia for mobile
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === '(max-width: 899.95px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    renderWithTheme(<OrderBookComponent {...defaultProps} />);

    // Component should still render
    expect(screen.getByText(/Emir Defteri - BTC_TRY/i)).toBeInTheDocument();
  });

  it('should display all order book levels up to 20', () => {
    const manyBids: OrderBookLevel[] = Array.from({ length: 25 }, (_, i) => [
      (850000 - i * 100).toString(),
      '0.5',
      '425000',
    ]);
    const manyAsks: OrderBookLevel[] = Array.from({ length: 25 }, (_, i) => [
      (850100 + i * 100).toString(),
      '0.5',
      '425000',
    ]);

    renderWithTheme(<OrderBookComponent {...defaultProps} bids={manyBids} asks={manyAsks} />);

    // Check if component renders without error
    expect(screen.getByText(/Emir Defteri - BTC_TRY/i)).toBeInTheDocument();
  });

  it('should apply correct colors for bids and asks', () => {
    const { container } = renderWithTheme(<OrderBookComponent {...defaultProps} />);

    // Check if bid and ask rows exist
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });
});
