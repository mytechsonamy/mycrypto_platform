/**
 * Technical Indicators types for market analysis
 */

import { TradingPair } from './trading.types';

// Indicator types
export enum IndicatorType {
  SMA = 'SMA', // Simple Moving Average
  EMA = 'EMA', // Exponential Moving Average
  RSI = 'RSI', // Relative Strength Index
  MACD = 'MACD', // Moving Average Convergence Divergence
}

// Indicator periods
export const INDICATOR_PERIODS = [5, 10, 20, 50, 100, 200] as const;
export type IndicatorPeriod = typeof INDICATOR_PERIODS[number];

// Moving Average data point
export interface MovingAverageData {
  timestamp: number;
  value: number;
  period: IndicatorPeriod;
}

// RSI data point
export interface RSIData {
  timestamp: number;
  value: number; // 0-100
  period: IndicatorPeriod;
}

// MACD data point
export interface MACDData {
  timestamp: number;
  macd: number; // MACD line
  signal: number; // Signal line
  histogram: number; // MACD - Signal
}

// Technical indicators data
export interface TechnicalIndicators {
  symbol: TradingPair;
  sma: {
    [key in IndicatorPeriod]?: MovingAverageData[];
  };
  ema: {
    [key in IndicatorPeriod]?: MovingAverageData[];
  };
  rsi: {
    [key in IndicatorPeriod]?: RSIData[];
  };
  macd: MACDData[];
  lastUpdate: number;
}

// Chart data point (combines price and indicators)
export interface ChartDataPoint {
  timestamp: number;
  price: number;
  sma5?: number;
  sma10?: number;
  sma20?: number;
  sma50?: number;
  sma100?: number;
  sma200?: number;
  ema5?: number;
  ema10?: number;
  ema20?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  volume?: number;
}

// RSI signal
export enum RSISignal {
  OVERSOLD = 'OVERSOLD', // RSI < 30
  NEUTRAL = 'NEUTRAL', // 30 <= RSI <= 70
  OVERBOUGHT = 'OVERBOUGHT', // RSI > 70
}

// MACD signal
export enum MACDSignal {
  BULLISH = 'BULLISH', // MACD > Signal (buy signal)
  BEARISH = 'BEARISH', // MACD < Signal (sell signal)
  NEUTRAL = 'NEUTRAL', // MACD ~ Signal
}

// SMA signal
export enum SMASignal {
  ABOVE = 'ABOVE', // Price above SMA (bullish)
  BELOW = 'BELOW', // Price below SMA (bearish)
  CROSSING_UP = 'CROSSING_UP', // Price crossing above SMA (buy signal)
  CROSSING_DOWN = 'CROSSING_DOWN', // Price crossing below SMA (sell signal)
}

// Market trend
export enum MarketTrend {
  STRONG_BULLISH = 'STRONG_BULLISH',
  BULLISH = 'BULLISH',
  NEUTRAL = 'NEUTRAL',
  BEARISH = 'BEARISH',
  STRONG_BEARISH = 'STRONG_BEARISH',
}

// Trading signal
export enum TradingSignal {
  STRONG_BUY = 'STRONG_BUY',
  BUY = 'BUY',
  NEUTRAL = 'NEUTRAL',
  SELL = 'SELL',
  STRONG_SELL = 'STRONG_SELL',
}

// Market analysis result
export interface MarketAnalysis {
  symbol: TradingPair;
  currentPrice: number;
  trend: MarketTrend;
  signal: TradingSignal;
  rsiSignal: RSISignal;
  rsiValue: number;
  macdSignal: MACDSignal;
  macdValue: number;
  macdSignalValue: number;
  smaSignals: {
    sma20: SMASignal;
    sma50: SMASignal;
    sma200: SMASignal;
  };
  smaValues: {
    sma20?: number;
    sma50?: number;
    sma200?: number;
  };
  recommendation: string;
  confidence: number; // 0-100
  timestamp: number;
}

// Indicator calculation request
export interface IndicatorRequest {
  symbol: TradingPair;
  type: IndicatorType;
  period?: IndicatorPeriod;
  limit?: number; // Number of data points to return
}

// Indicator calculation response
export interface IndicatorResponse {
  symbol: TradingPair;
  type: IndicatorType;
  period?: IndicatorPeriod;
  data: ChartDataPoint[];
  timestamp: number;
}

// WebSocket indicator update
export interface IndicatorUpdateMessage {
  type: 'indicator_update';
  symbol: TradingPair;
  indicators: Partial<TechnicalIndicators>;
  timestamp: number;
}

// Analysis update via WebSocket
export interface AnalysisUpdateMessage {
  type: 'analysis_update';
  analysis: MarketAnalysis;
  timestamp: number;
}
