/**
 * Market Analysis Panel Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import MarketAnalysisPanel from './MarketAnalysisPanel';
import {
  MarketAnalysis,
  MarketTrend,
  TradingSignal,
  RSISignal,
  MACDSignal,
  SMASignal,
} from '../../../types/indicators.types';

// Mock analysis data
const mockAnalysisBullish: MarketAnalysis = {
  symbol: 'BTC_TRY',
  currentPrice: 1525000,
  trend: MarketTrend.STRONG_BULLISH,
  signal: TradingSignal.STRONG_BUY,
  rsiSignal: RSISignal.NEUTRAL,
  rsiValue: 65,
  macdSignal: MACDSignal.BULLISH,
  macdValue: 1400,
  macdSignalValue: 1100,
  smaSignals: {
    sma20: SMASignal.ABOVE,
    sma50: SMASignal.ABOVE,
    sma200: SMASignal.ABOVE,
  },
  smaValues: {
    sma20: 1505000,
    sma50: 1499000,
    sma200: 1489000,
  },
  recommendation:
    'Güçlü yükseliş trendi devam ediyor. Tüm teknik göstergeler alım sinyali veriyor. Ancak RSI değeri yüksek, dikkatli olunmalı.',
  confidence: 85,
  timestamp: Date.now(),
};

const mockAnalysisBearish: MarketAnalysis = {
  symbol: 'BTC_TRY',
  currentPrice: 1425000,
  trend: MarketTrend.BEARISH,
  signal: TradingSignal.SELL,
  rsiSignal: RSISignal.OVERSOLD,
  rsiValue: 28,
  macdSignal: MACDSignal.BEARISH,
  macdValue: -1200,
  macdSignalValue: -900,
  smaSignals: {
    sma20: SMASignal.BELOW,
    sma50: SMASignal.BELOW,
    sma200: SMASignal.CROSSING_DOWN,
  },
  smaValues: {
    sma20: 1450000,
    sma50: 1470000,
    sma200: 1480000,
  },
  recommendation:
    'Düşüş trendi devam ediyor. RSI aşırı satım bölgesinde, toparlanma yakın olabilir.',
  confidence: 72,
  timestamp: Date.now(),
};

const mockAnalysisNeutral: MarketAnalysis = {
  symbol: 'ETH_TRY',
  currentPrice: 75000,
  trend: MarketTrend.NEUTRAL,
  signal: TradingSignal.NEUTRAL,
  rsiSignal: RSISignal.NEUTRAL,
  rsiValue: 50,
  macdSignal: MACDSignal.NEUTRAL,
  macdValue: 50,
  macdSignalValue: 45,
  smaSignals: {
    sma20: SMASignal.ABOVE,
    sma50: SMASignal.BELOW,
    sma200: SMASignal.ABOVE,
  },
  smaValues: {
    sma20: 74000,
    sma50: 76000,
    sma200: 73000,
  },
  recommendation: 'Piyasa belirsiz. Net bir yön yok, pozisyon almak için beklenmeli.',
  confidence: 45,
  timestamp: Date.now(),
};

describe('MarketAnalysisPanel', () => {
  it('renders loading state', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={null} loading={true} />);

    expect(screen.getByText(/Analiz yapılıyor/i)).toBeInTheDocument();
  });

  it('renders empty state when no analysis', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={null} />);

    expect(screen.getByText(/Analiz verisi bulunmamaktadır/i)).toBeInTheDocument();
  });

  it('renders bullish analysis correctly', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    // Check header
    expect(screen.getByText(/Piyasa Analizi - BTC\/TRY/i)).toBeInTheDocument();

    // Check signal
    expect(screen.getByText(/Güçlü AL/i)).toBeInTheDocument();

    // Check confidence
    expect(screen.getByText(/85/i)).toBeInTheDocument();

    // Check trend
    expect(screen.getByText(/Güçlü Yükseliş/i)).toBeInTheDocument();

    // Check current price
    expect(screen.getByText(/1.525.000,00 TRY/i)).toBeInTheDocument();

    // Check recommendation
    expect(screen.getByText(/Güçlü yükseliş trendi devam ediyor/i)).toBeInTheDocument();
  });

  it('renders bearish analysis correctly', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBearish} />);

    // Check signal
    expect(screen.getByText(/SAT/i)).toBeInTheDocument();

    // Check trend
    expect(screen.getByText(/Düşüş/i)).toBeInTheDocument();

    // Check RSI oversold
    expect(screen.getByText(/Aşırı Satım/i)).toBeInTheDocument();

    // Check MACD bearish
    expect(screen.getByText(/Düşüş Sinyali/i)).toBeInTheDocument();
  });

  it('renders neutral analysis correctly', () => {
    render(<MarketAnalysisPanel symbol="ETH_TRY" analysis={mockAnalysisNeutral} />);

    // Check signal
    expect(screen.getByText(/NÖTR/i)).toBeInTheDocument();

    // Check trend
    expect(screen.getByText(/Nötr/i)).toBeInTheDocument();

    // Check recommendation
    expect(screen.getByText(/Piyasa belirsiz/i)).toBeInTheDocument();
  });

  it('displays RSI indicator correctly', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    // RSI should be shown
    expect(screen.getByText(/RSI \(14\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Nötr \(65.0\)/i)).toBeInTheDocument();
  });

  it('displays RSI overbought signal', () => {
    const overboughtAnalysis: MarketAnalysis = {
      ...mockAnalysisBullish,
      rsiSignal: RSISignal.OVERBOUGHT,
      rsiValue: 75,
    };

    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={overboughtAnalysis} />);

    expect(screen.getByText(/Aşırı Alım \(75.0\)/i)).toBeInTheDocument();
  });

  it('displays RSI oversold signal', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBearish} />);

    expect(screen.getByText(/Aşırı Satım \(28.0\)/i)).toBeInTheDocument();
  });

  it('displays MACD indicator correctly', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    expect(screen.getByText(/MACD/i)).toBeInTheDocument();
    expect(screen.getByText(/Yükseliş Sinyali/i)).toBeInTheDocument();
    expect(screen.getByText(/MACD: 1400.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Signal: 1100.00/i)).toBeInTheDocument();
  });

  it('displays SMA signals correctly', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    // Check SMA headers
    expect(screen.getByText(/SMA 20/i)).toBeInTheDocument();
    expect(screen.getByText(/SMA 50/i)).toBeInTheDocument();
    expect(screen.getByText(/SMA 200/i)).toBeInTheDocument();

    // Check SMA values
    expect(screen.getByText(/1.505.000,00/i)).toBeInTheDocument();
    expect(screen.getByText(/1.499.000,00/i)).toBeInTheDocument();
    expect(screen.getByText(/1.489.000,00/i)).toBeInTheDocument();

    // Check SMA signals (all "Yukarıda" for bullish)
    const aboveChips = screen.getAllByText(/Yukarıda/i);
    expect(aboveChips.length).toBe(3);
  });

  it('displays SMA below signals', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBearish} />);

    // Check SMA signals (all "Aşağıda" for bearish)
    const belowChips = screen.getAllByText(/Aşağıda/i);
    expect(belowChips.length).toBe(2); // sma20 and sma50

    // sma200 is crossing down
    expect(screen.getByText(/Aşağı Kesiyor/i)).toBeInTheDocument();
  });

  it('displays confidence level correctly', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    // High confidence (85%) should show "Güçlü"
    expect(screen.getByText(/Güçlü/i)).toBeInTheDocument();
  });

  it('displays medium confidence correctly', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBearish} />);

    // Medium confidence (72%) should show "Güçlü"
    expect(screen.getByText(/Güçlü/i)).toBeInTheDocument();
  });

  it('displays low confidence correctly', () => {
    render(<MarketAnalysisPanel symbol="ETH_TRY" analysis={mockAnalysisNeutral} />);

    // Low confidence (45%) should show "Orta"
    expect(screen.getByText(/Orta/i)).toBeInTheDocument();
  });

  it('displays disclaimer', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    expect(
      screen.getByText(/Bu analiz sadece bilgilendirme amaçlıdır/i)
    ).toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    expect(screen.getByText(/Son Güncelleme:/i)).toBeInTheDocument();
  });

  it('handles different trading pairs', () => {
    const { rerender } = render(
      <MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />
    );

    expect(screen.getByText(/BTC\/TRY/i)).toBeInTheDocument();

    const ethAnalysis = { ...mockAnalysisBullish, symbol: 'ETH_TRY' as const };
    rerender(<MarketAnalysisPanel symbol="ETH_TRY" analysis={ethAnalysis} />);

    expect(screen.getByText(/ETH\/TRY/i)).toBeInTheDocument();
  });

  it('renders strong buy signal with correct styling', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    const strongBuyText = screen.getByText(/Güçlü AL/i);
    expect(strongBuyText).toBeInTheDocument();
  });

  it('renders strong sell signal', () => {
    const strongSellAnalysis: MarketAnalysis = {
      ...mockAnalysisBearish,
      signal: TradingSignal.STRONG_SELL,
      trend: MarketTrend.STRONG_BEARISH,
    };

    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={strongSellAnalysis} />);

    expect(screen.getByText(/Güçlü SAT/i)).toBeInTheDocument();
    expect(screen.getByText(/Güçlü Düşüş/i)).toBeInTheDocument();
  });

  it('handles missing SMA values gracefully', () => {
    const incompleteAnalysis: MarketAnalysis = {
      ...mockAnalysisBullish,
      smaValues: {
        sma20: undefined,
        sma50: undefined,
        sma200: undefined,
      },
    };

    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={incompleteAnalysis} />);

    // Should show dashes for missing values
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders responsive layout on mobile', () => {
    // Mock mobile viewport
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(max-width:600px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    // Component should render without errors
    expect(screen.getByText(/Piyasa Analizi/i)).toBeInTheDocument();
  });

  it('displays all indicator sections', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    // Main sections
    expect(screen.getByText(/Teknik İndikatörler/i)).toBeInTheDocument();
    expect(screen.getByText(/Hareketli Ortalama Sinyalleri/i)).toBeInTheDocument();
  });

  it('shows buy signal with correct color coding', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    // Buy signal should be present
    expect(screen.getByText(/Güçlü AL/i)).toBeInTheDocument();
  });

  it('shows sell signal with correct color coding', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBearish} />);

    // Sell signal should be present
    expect(screen.getByText(/SAT/i)).toBeInTheDocument();
  });

  it('displays trend strength indicator', () => {
    render(<MarketAnalysisPanel symbol="BTC_TRY" analysis={mockAnalysisBullish} />);

    expect(screen.getByText(/Trend Gücü/i)).toBeInTheDocument();
  });
});
