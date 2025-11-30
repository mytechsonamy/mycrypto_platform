/**
 * Technical Indicators Chart Component
 * Advanced technical indicators visualization with Recharts
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ChartIcon,
} from '@mui/icons-material';
import {
  IndicatorType,
  IndicatorPeriod,
  INDICATOR_PERIODS,
  ChartDataPoint,
} from '../../../types/indicators.types';
import { TradingPair } from '../../../types/trading.types';

interface TechnicalIndicatorsChartProps {
  symbol: TradingPair;
  data: ChartDataPoint[]; // Historical price + indicator data
  loading?: boolean;
}

// Color palette for indicators
const INDICATOR_COLORS = {
  price: '#2196F3',
  sma5: '#FF9800',
  sma10: '#F44336',
  sma20: '#4CAF50',
  sma50: '#9C27B0',
  sma100: '#00BCD4',
  sma200: '#FF5722',
  ema5: '#FFB74D',
  ema10: '#E57373',
  ema20: '#81C784',
  ema50: '#BA68C8',
  ema100: '#4DD0E1',
  ema200: '#FF8A65',
  rsi: '#673AB7',
  macd: '#009688',
  macdSignal: '#FF5252',
  macdHistogram: '#BDBDBD',
};

const TechnicalIndicatorsChart: React.FC<TechnicalIndicatorsChartProps> = ({
  symbol,
  data,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // State for indicator selection
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType>(IndicatorType.SMA);
  const [selectedPeriods, setSelectedPeriods] = useState<IndicatorPeriod[]>([20, 50, 200]);
  const [showPrice, setShowPrice] = useState(true);

  // Format timestamp for display
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (isMobile) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format price for display
  const formatPrice = (value: number): string => {
    return value.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Handle indicator type change
  const handleIndicatorChange = (event: any) => {
    const newIndicator = event.target.value as IndicatorType;
    setSelectedIndicator(newIndicator);

    // Reset periods based on indicator type
    if (newIndicator === IndicatorType.RSI) {
      setSelectedPeriods([20]); // Default RSI period (14 not supported, use 20)
    } else if (newIndicator === IndicatorType.MACD) {
      setSelectedPeriods([]); // MACD doesn't use period selection
    } else {
      setSelectedPeriods([20, 50, 200]); // Default MA periods
    }
  };

  // Handle period selection
  const handlePeriodChange = (_event: React.MouseEvent<HTMLElement>, newPeriods: IndicatorPeriod[]) => {
    if (newPeriods.length > 0) {
      setSelectedPeriods(newPeriods);
    }
  };

  // Get current indicator values
  const currentValues = useMemo(() => {
    if (data.length === 0) return {};

    const latest = data[data.length - 1];
    const values: { [key: string]: number } = {};

    if (selectedIndicator === IndicatorType.SMA) {
      selectedPeriods.forEach((period) => {
        const key = `sma${period}` as keyof ChartDataPoint;
        if (latest[key] !== undefined) {
          values[`SMA ${period}`] = latest[key] as number;
        }
      });
    } else if (selectedIndicator === IndicatorType.EMA) {
      selectedPeriods.forEach((period) => {
        const key = `ema${period}` as keyof ChartDataPoint;
        if (latest[key] !== undefined) {
          values[`EMA ${period}`] = latest[key] as number;
        }
      });
    } else if (selectedIndicator === IndicatorType.RSI && latest.rsi !== undefined) {
      values['RSI'] = latest.rsi;
    } else if (selectedIndicator === IndicatorType.MACD) {
      if (latest.macd !== undefined) values['MACD'] = latest.macd;
      if (latest.macdSignal !== undefined) values['Signal'] = latest.macdSignal;
      if (latest.macdHistogram !== undefined) values['Histogram'] = latest.macdHistogram;
    }

    return values;
  }, [data, selectedIndicator, selectedPeriods]);

  // Render price chart with selected indicators
  const renderPriceChart = () => {
    return (
      <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            stroke={theme.palette.text.secondary}
            style={{ fontSize: isMobile ? 10 : 12 }}
          />
          <YAxis
            tickFormatter={formatPrice}
            stroke={theme.palette.text.secondary}
            style={{ fontSize: isMobile ? 10 : 12 }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(value: number) => formatPrice(value)}
            labelFormatter={formatTime}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}
            iconType="line"
          />

          {/* Price line */}
          {showPrice && (
            <Line
              type="monotone"
              dataKey="price"
              stroke={INDICATOR_COLORS.price}
              strokeWidth={2}
              dot={false}
              name="Fiyat"
              isAnimationActive={false}
            />
          )}

          {/* SMA lines */}
          {selectedIndicator === IndicatorType.SMA &&
            selectedPeriods.map((period) => (
              <Line
                key={`sma${period}`}
                type="monotone"
                dataKey={`sma${period}`}
                stroke={INDICATOR_COLORS[`sma${period}` as keyof typeof INDICATOR_COLORS] || '#666'}
                strokeWidth={1.5}
                dot={false}
                name={`SMA ${period}`}
                isAnimationActive={false}
              />
            ))}

          {/* EMA lines */}
          {selectedIndicator === IndicatorType.EMA &&
            selectedPeriods.map((period) => (
              <Line
                key={`ema${period}`}
                type="monotone"
                dataKey={`ema${period}`}
                stroke={INDICATOR_COLORS[`ema${period}` as keyof typeof INDICATOR_COLORS] || '#666'}
                strokeWidth={1.5}
                dot={false}
                name={`EMA ${period}`}
                isAnimationActive={false}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Render RSI chart
  const renderRSIChart = () => {
    return (
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            stroke={theme.palette.text.secondary}
            style={{ fontSize: isMobile ? 10 : 12 }}
          />
          <YAxis
            domain={[0, 100]}
            stroke={theme.palette.text.secondary}
            style={{ fontSize: isMobile ? 10 : 12 }}
          />
          <Tooltip
            labelFormatter={formatTime}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />

          {/* Overbought/Oversold reference lines */}
          <ReferenceLine y={70} stroke="#F44336" strokeDasharray="3 3" label="Overbought" />
          <ReferenceLine y={30} stroke="#4CAF50" strokeDasharray="3 3" label="Oversold" />

          <Line
            type="monotone"
            dataKey="rsi"
            stroke={INDICATOR_COLORS.rsi}
            strokeWidth={2}
            dot={false}
            name="RSI"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Render MACD chart
  const renderMACDChart = () => {
    return (
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            stroke={theme.palette.text.secondary}
            style={{ fontSize: isMobile ? 10 : 12 }}
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            style={{ fontSize: isMobile ? 10 : 12 }}
          />
          <Tooltip
            labelFormatter={formatTime}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />

          <ReferenceLine y={0} stroke={theme.palette.divider} />

          <Line
            type="monotone"
            dataKey="macd"
            stroke={INDICATOR_COLORS.macd}
            strokeWidth={2}
            dot={false}
            name="MACD"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="macdSignal"
            stroke={INDICATOR_COLORS.macdSignal}
            strokeWidth={2}
            dot={false}
            name="Signal"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Yükleniyor...</Typography>
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Veri bulunmamaktadır</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChartIcon />
          Teknik İndikatörler - {symbol.replace('_', '/')}
        </Typography>
      </Box>

      {/* Controls */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth size="small">
            <Select
              value={selectedIndicator}
              onChange={handleIndicatorChange}
              displayEmpty
            >
              <MenuItem value={IndicatorType.SMA}>SMA (Basit Hareketli Ortalama)</MenuItem>
              <MenuItem value={IndicatorType.EMA}>EMA (Üstel Hareketli Ortalama)</MenuItem>
              <MenuItem value={IndicatorType.RSI}>RSI (Göreceli Güç Endeksi)</MenuItem>
              <MenuItem value={IndicatorType.MACD}>MACD</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Period selection for MA indicators */}
        {(selectedIndicator === IndicatorType.SMA || selectedIndicator === IndicatorType.EMA) && (
          <Grid item xs={12} sm={6} md={8}>
            <ToggleButtonGroup
              value={selectedPeriods}
              onChange={handlePeriodChange}
              aria-label="indicator periods"
              size="small"
              sx={{
                flexWrap: 'wrap',
                '& .MuiToggleButton-root': {
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  px: isMobile ? 1 : 2,
                },
              }}
            >
              {INDICATOR_PERIODS.map((period) => (
                <ToggleButton key={period} value={period} aria-label={`${period} period`}>
                  {period}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>
        )}
      </Grid>

      {/* Current Values */}
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {Object.entries(currentValues).map(([label, value]) => (
          <Chip
            key={label}
            label={`${label}: ${value.toFixed(2)}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Main Price Chart */}
      {(selectedIndicator === IndicatorType.SMA || selectedIndicator === IndicatorType.EMA) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Fiyat ve {selectedIndicator === IndicatorType.SMA ? 'SMA' : 'EMA'}
          </Typography>
          {renderPriceChart()}
        </Box>
      )}

      {/* RSI Chart */}
      {selectedIndicator === IndicatorType.RSI && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            RSI İndikatörü
          </Typography>
          {renderRSIChart()}
        </Box>
      )}

      {/* MACD Chart */}
      {selectedIndicator === IndicatorType.MACD && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            MACD İndikatörü
          </Typography>
          {renderMACDChart()}
        </Box>
      )}
    </Paper>
  );
};

export default TechnicalIndicatorsChart;
