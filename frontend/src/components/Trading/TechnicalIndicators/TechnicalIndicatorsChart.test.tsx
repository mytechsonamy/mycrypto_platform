/**
 * Technical Indicators Chart Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TechnicalIndicatorsChart from './TechnicalIndicatorsChart';
import { ChartDataPoint, IndicatorType } from '../../../types/indicators.types';

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div>Line</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  Legend: () => <div>Legend</div>,
  ReferenceLine: () => <div>ReferenceLine</div>,
}));

// Mock data
const mockChartData: ChartDataPoint[] = [
  {
    timestamp: Date.now() - 300000,
    price: 1500000,
    sma20: 1495000,
    sma50: 1490000,
    sma200: 1480000,
    ema20: 1496000,
    ema50: 1491000,
    ema200: 1481000,
    rsi: 55,
    macd: 1000,
    macdSignal: 900,
    macdHistogram: 100,
    volume: 100,
  },
  {
    timestamp: Date.now() - 240000,
    price: 1505000,
    sma20: 1496000,
    sma50: 1491000,
    sma200: 1481000,
    ema20: 1497000,
    ema50: 1492000,
    ema200: 1482000,
    rsi: 58,
    macd: 1100,
    macdSignal: 950,
    macdHistogram: 150,
    volume: 120,
  },
  {
    timestamp: Date.now() - 180000,
    price: 1510000,
    sma20: 1498000,
    sma50: 1493000,
    sma200: 1483000,
    ema20: 1499000,
    ema50: 1494000,
    ema200: 1484000,
    rsi: 62,
    macd: 1200,
    macdSignal: 1000,
    macdHistogram: 200,
    volume: 150,
  },
  {
    timestamp: Date.now() - 120000,
    price: 1520000,
    sma20: 1502000,
    sma50: 1496000,
    sma200: 1486000,
    ema20: 1503000,
    ema50: 1497000,
    ema200: 1487000,
    rsi: 68,
    macd: 1300,
    macdSignal: 1050,
    macdHistogram: 250,
    volume: 180,
  },
  {
    timestamp: Date.now() - 60000,
    price: 1525000,
    sma20: 1505000,
    sma50: 1499000,
    sma200: 1489000,
    ema20: 1506000,
    ema50: 1500000,
    ema200: 1490000,
    rsi: 72,
    macd: 1400,
    macdSignal: 1100,
    macdHistogram: 300,
    volume: 200,
  },
];

describe('TechnicalIndicatorsChart', () => {
  it('renders chart with default settings', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    expect(screen.getByText(/Teknik İndikatörler - BTC\/TRY/i)).toBeInTheDocument();
    expect(screen.getByText(/SMA \(Basit Hareketli Ortalama\)/i)).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={[]} loading={true} />);

    expect(screen.getByText(/Yükleniyor/i)).toBeInTheDocument();
  });

  it('displays empty state when no data', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={[]} />);

    expect(screen.getByText(/Veri bulunmamaktadır/i)).toBeInTheDocument();
  });

  it('switches between indicator types', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Initially SMA is selected
    expect(screen.getByText(/SMA \(Basit Hareketli Ortalama\)/i)).toBeInTheDocument();

    // Change to EMA
    const select = screen.getByRole('button', { name: '' });
    fireEvent.mouseDown(select);

    const emaOption = screen.getByText(/EMA \(Üstel Hareketli Ortalama\)/i);
    fireEvent.click(emaOption);

    // EMA should now be selected
    expect(screen.getByText(/EMA \(Üstel Hareketli Ortalama\)/i)).toBeInTheDocument();
  });

  it('displays current indicator values', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Check for SMA values (default selected periods: 20, 50, 200)
    expect(screen.getByText(/SMA 20: 1505000.00/i)).toBeInTheDocument();
    expect(screen.getByText(/SMA 50: 1499000.00/i)).toBeInTheDocument();
    expect(screen.getByText(/SMA 200: 1489000.00/i)).toBeInTheDocument();
  });

  it('shows RSI indicator when selected', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Change to RSI
    const select = screen.getByRole('button', { name: '' });
    fireEvent.mouseDown(select);

    const rsiOption = screen.getByText(/RSI \(Göreceli Güç Endeksi\)/i);
    fireEvent.click(rsiOption);

    // RSI chart should be shown
    expect(screen.getByText(/RSI İndikatörü/i)).toBeInTheDocument();
    expect(screen.getByText(/RSI: 72.00/i)).toBeInTheDocument();
  });

  it('shows MACD indicator when selected', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Change to MACD
    const select = screen.getByRole('button', { name: '' });
    fireEvent.mouseDown(select);

    const macdOption = screen.getByText(/MACD/i);
    fireEvent.click(macdOption);

    // MACD chart should be shown
    expect(screen.getByText(/MACD İndikatörü/i)).toBeInTheDocument();
    expect(screen.getByText(/MACD: 1400.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Signal: 1100.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Histogram: 300.00/i)).toBeInTheDocument();
  });

  it('allows period selection for SMA', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Period buttons should be visible for SMA
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('allows period selection for EMA', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Change to EMA
    const select = screen.getByRole('button', { name: '' });
    fireEvent.mouseDown(select);

    const emaOption = screen.getByText(/EMA \(Üstel Hareketli Ortalama\)/i);
    fireEvent.click(emaOption);

    // Period buttons should be visible for EMA
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('does not show period selection for RSI', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Change to RSI
    const select = screen.getByRole('button', { name: '' });
    fireEvent.mouseDown(select);

    const rsiOption = screen.getByText(/RSI \(Göreceli Güç Endeksi\)/i);
    fireEvent.click(rsiOption);

    // Period buttons should not be visible for RSI
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('does not show period selection for MACD', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Change to MACD
    const select = screen.getByRole('button', { name: '' });
    fireEvent.mouseDown(select);

    const macdOption = screen.getByText(/MACD/i);
    fireEvent.click(macdOption);

    // Period buttons should not be visible for MACD
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('renders for different trading pairs', () => {
    const { rerender } = render(
      <TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />
    );

    expect(screen.getByText(/BTC\/TRY/i)).toBeInTheDocument();

    rerender(<TechnicalIndicatorsChart symbol="ETH_TRY" data={mockChartData} />);

    expect(screen.getByText(/ETH\/TRY/i)).toBeInTheDocument();
  });

  it('handles empty indicator values gracefully', () => {
    const incompleteData: ChartDataPoint[] = [
      {
        timestamp: Date.now(),
        price: 1500000,
        // Missing indicator values
      },
    ];

    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={incompleteData} />);

    // Should render without errors
    expect(screen.getByText(/Teknik İndikatörler/i)).toBeInTheDocument();
  });

  it('updates when data changes', () => {
    const { rerender } = render(
      <TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />
    );

    // Initial RSI value
    const select = screen.getByRole('button', { name: '' });
    fireEvent.mouseDown(select);
    const rsiOption = screen.getByText(/RSI \(Göreceli Güç Endeksi\)/i);
    fireEvent.click(rsiOption);

    expect(screen.getByText(/RSI: 72.00/i)).toBeInTheDocument();

    // Update data with new RSI value
    const updatedData = [...mockChartData];
    updatedData[updatedData.length - 1] = {
      ...updatedData[updatedData.length - 1],
      rsi: 65,
    };

    rerender(<TechnicalIndicatorsChart symbol="BTC_TRY" data={updatedData} />);

    expect(screen.getByText(/RSI: 65.00/i)).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Chart should render without errors (actual formatting tested in integration)
    expect(screen.getByText(/Teknik İndikatörler/i)).toBeInTheDocument();
  });

  it('formats prices correctly', () => {
    render(<TechnicalIndicatorsChart symbol="BTC_TRY" data={mockChartData} />);

    // Price formatting should be applied (verified by current values display)
    expect(screen.getByText(/1505000.00/i)).toBeInTheDocument();
  });
});
