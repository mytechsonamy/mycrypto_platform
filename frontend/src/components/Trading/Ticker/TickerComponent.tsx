/**
 * Ticker Component
 * Displays real-time market data (ticker) for a trading pair
 * Shows: Last Price, 24h Change, 24h High, 24h Low, 24h Volume
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme,
  Skeleton,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export interface TickerData {
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export interface TickerComponentProps {
  ticker: TickerData | null;
  symbol: string;
  loading?: boolean;
  error?: string | null;
  realtime?: boolean; // Default: true
  showVolume?: boolean; // Default: true
  compact?: boolean; // Default: false
}

const TickerComponent: React.FC<TickerComponentProps> = ({
  ticker,
  symbol,
  loading = false,
  error = null,
  realtime = true,
  showVolume = true,
  compact = false,
}) => {
  const theme = useTheme();

  // Format price with Turkish locale
  const formatPrice = (value: string, decimals: number = 2): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Format volume (8 decimals for crypto, 2 for quote)
  const formatVolume = (value: string, decimals: number = 2): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Format price change with + sign
  const formatPriceChange = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num >= 0 ? `+${formatPrice(value, 2)}` : formatPrice(value, 2);
  };

  // Determine color based on price change
  const getPriceChangeColor = (priceChange: string): string => {
    const num = parseFloat(priceChange);
    if (isNaN(num) || num === 0) return theme.palette.text.secondary;
    return num > 0 ? theme.palette.success.main : theme.palette.error.main;
  };

  // Extract base currency from symbol (e.g., BTC from BTC_TRY)
  const getBaseCurrency = (symbol: string): string => {
    return symbol.split('_')[0];
  };

  // Render skeleton loader
  if (loading) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 2,
        }}
      >
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Grid item xs={6} sm={4} md={2.4} key={item}>
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="100%" height={32} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  // Render error state
  if (error) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          bgcolor: theme.palette.error.light,
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="error.dark">
          {error}
        </Typography>
      </Paper>
    );
  }

  // Render empty state
  if (!ticker) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          bgcolor: theme.palette.grey[100],
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          Piyasa verisi yükleniyor...
        </Typography>
      </Paper>
    );
  }

  const priceChangeColor = getPriceChangeColor(ticker.priceChange);
  const isPositiveChange = parseFloat(ticker.priceChange) >= 0;
  const baseCurrency = getBaseCurrency(symbol);

  // Compact mode renders a minimal version
  if (compact) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: theme.palette.background.paper,
        }}
        role="region"
        aria-label="Piyasa verileri (sıkıştırılmış)"
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          {/* Symbol */}
          <Typography variant="subtitle2" fontWeight={600}>
            {symbol.replace('_', '/')}
          </Typography>

          {/* Last Price */}
          <Typography
            variant="h6"
            sx={{
              color: priceChangeColor,
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            {formatPrice(ticker.lastPrice, 2)} TRY
          </Typography>

          {/* 24h Change */}
          <Box display="flex" alignItems="center" gap={0.5}>
            {isPositiveChange ? (
              <TrendingUpIcon sx={{ fontSize: 16, color: priceChangeColor }} aria-hidden="true" />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 16, color: priceChangeColor }} aria-hidden="true" />
            )}
            <Typography variant="body2" sx={{ color: priceChangeColor, fontWeight: 600 }}>
              {formatPriceChange(ticker.priceChange)} ({isPositiveChange ? '+' : ''}{ticker.priceChangePercent}%)
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
      }}
      role="region"
      aria-label="Piyasa verileri"
    >
      <Grid container spacing={{ xs: 1, sm: 2 }}>
        {/* Last Price */}
        <Grid item xs={6} sm={4} md={showVolume ? 2.4 : 3}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
            >
              Son Fiyat
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              {isPositiveChange ? (
                <TrendingUpIcon
                  sx={{ fontSize: { xs: 16, sm: 20 }, color: priceChangeColor }}
                  aria-hidden="true"
                />
              ) : (
                <TrendingDownIcon
                  sx={{ fontSize: { xs: 16, sm: 20 }, color: priceChangeColor }}
                  aria-hidden="true"
                />
              )}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  color: priceChangeColor,
                }}
                aria-label={`Son fiyat ${formatPrice(ticker.lastPrice)} Türk lirası`}
              >
                {formatPrice(ticker.lastPrice, 2)} TRY
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* 24h Change */}
        <Grid item xs={6} sm={4} md={showVolume ? 2.4 : 3}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
            >
              24S Değişim
            </Typography>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                  color: priceChangeColor,
                }}
                aria-label={`24 saatlik değişim ${formatPriceChange(ticker.priceChange)} Türk lirası, yüzde ${ticker.priceChangePercent}`}
              >
                {formatPriceChange(ticker.priceChange)} TRY
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  color: priceChangeColor,
                  fontWeight: 500,
                }}
              >
                ({isPositiveChange ? '+' : ''}{ticker.priceChangePercent}%)
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* 24h High */}
        <Grid item xs={6} sm={4} md={showVolume ? 2.4 : 3}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
            >
              24S Yüksek
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '1.1rem' },
              }}
              aria-label={`24 saatlik en yüksek fiyat ${formatPrice(ticker.highPrice)} Türk lirası`}
            >
              {formatPrice(ticker.highPrice, 2)} TRY
            </Typography>
          </Box>
        </Grid>

        {/* 24h Low */}
        <Grid item xs={6} sm={4} md={showVolume ? 2.4 : 3}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
            >
              24S Düşük
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '1.1rem' },
              }}
              aria-label={`24 saatlik en düşük fiyat ${formatPrice(ticker.lowPrice)} Türk lirası`}
            >
              {formatPrice(ticker.lowPrice, 2)} TRY
            </Typography>
          </Box>
        </Grid>

        {/* 24h Volume - Only show if showVolume is true */}
        {showVolume && (
        <Grid item xs={12} sm={4} md={2.4}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
            >
              24S İşlem Hacmi
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '1.1rem' },
              }}
              aria-label={`24 saatlik işlem hacmi ${formatVolume(ticker.volume, 2)} ${baseCurrency}`}
            >
              {formatVolume(ticker.volume, 2)} {baseCurrency}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
            >
              {formatVolume(ticker.quoteVolume, 0)} TRY
            </Typography>
          </Box>
        </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default TickerComponent;
