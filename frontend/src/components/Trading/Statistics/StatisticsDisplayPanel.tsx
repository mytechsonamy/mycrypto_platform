/**
 * Statistics Display Panel
 * Displays comprehensive market statistics in a responsive grid layout
 * Features: High, Low, Open, Close, Volume, Quote Volume
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Skeleton,
  Alert,
  useTheme,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';

export interface StatCard {
  label: string;
  value: string;
  change?: string;
  color?: 'up' | 'down' | 'neutral';
}

export interface StatisticsDisplayPanelProps {
  ticker: {
    highPrice: string;
    lowPrice: string;
    openPrice?: string;
    lastPrice: string;
    volume: string;
    quoteVolume: string;
    priceChange: string;
  } | null;
  symbol: string;
  loading?: boolean;
  error?: string | null;
}

const StatisticsDisplayPanel: React.FC<StatisticsDisplayPanelProps> = ({
  ticker,
  symbol,
  loading = false,
  error = null,
}) => {
  const theme = useTheme();

  // Extract base and quote currency from symbol
  const getBaseCurrency = (symbol: string): string => {
    return symbol.split('_')[0];
  };

  const getQuoteCurrency = (symbol: string): string => {
    return symbol.split('_')[1];
  };

  // Format price with Turkish locale
  const formatPrice = (value: string, decimals: number = 2): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Format volume
  const formatVolume = (value: string, decimals: number = 2): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Determine color based on change
  const getChangeColor = (change?: string): 'up' | 'down' | 'neutral' => {
    if (!change) return 'neutral';
    const num = parseFloat(change);
    if (isNaN(num) || num === 0) return 'neutral';
    return num > 0 ? 'up' : 'down';
  };

  // Get color from theme
  const getColorFromTheme = (colorType: 'up' | 'down' | 'neutral'): string => {
    switch (colorType) {
      case 'up':
        return theme.palette.success.main;
      case 'down':
        return theme.palette.error.main;
      case 'neutral':
      default:
        return theme.palette.text.secondary;
    }
  };

  // Render loading skeleton
  if (loading) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Piyasa İstatistikleri
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item}>
              <Box>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="100%" height={40} />
                <Skeleton variant="text" width="40%" height={24} />
              </Box>
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
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Paper>
    );
  }

  // Render empty state
  if (!ticker) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          bgcolor: theme.palette.grey[100],
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          İstatistik verisi yükleniyor...
        </Typography>
      </Paper>
    );
  }

  const baseCurrency = getBaseCurrency(symbol);
  const quoteCurrency = getQuoteCurrency(symbol);

  // Calculate changes
  const priceChange = parseFloat(ticker.priceChange);
  const changeColor = getChangeColor(ticker.priceChange);
  const themeColor = getColorFromTheme(changeColor);

  // Build stat cards
  const statCards: StatCard[] = [
    {
      label: '24S En Yüksek',
      value: `${formatPrice(ticker.highPrice)} ${quoteCurrency}`,
      color: changeColor,
    },
    {
      label: '24S En Düşük',
      value: `${formatPrice(ticker.lowPrice)} ${quoteCurrency}`,
      color: changeColor,
    },
    {
      label: 'Açılış Fiyatı',
      value: ticker.openPrice
        ? `${formatPrice(ticker.openPrice)} ${quoteCurrency}`
        : `${formatPrice(ticker.lastPrice)} ${quoteCurrency}`,
      color: 'neutral',
    },
    {
      label: 'Kapanış Fiyatı',
      value: `${formatPrice(ticker.lastPrice)} ${quoteCurrency}`,
      change: ticker.priceChange,
      color: changeColor,
    },
    {
      label: `İşlem Hacmi (${baseCurrency})`,
      value: formatVolume(ticker.volume, 4),
      color: 'neutral',
    },
    {
      label: `İşlem Hacmi (${quoteCurrency})`,
      value: formatVolume(ticker.quoteVolume, 0),
      color: 'neutral',
    },
  ];

  // Render icon based on color
  const renderIcon = (color: 'up' | 'down' | 'neutral') => {
    if (color === 'up') {
      return <TrendingUpIcon sx={{ fontSize: 20, color: themeColor }} aria-hidden="true" />;
    } else if (color === 'down') {
      return <TrendingDownIcon sx={{ fontSize: 20, color: themeColor }} aria-hidden="true" />;
    }
    return <RemoveIcon sx={{ fontSize: 20, color: themeColor }} aria-hidden="true" />;
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
      }}
      role="region"
      aria-label="Piyasa istatistikleri"
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{ mb: 2, fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}
      >
        Piyasa İstatistikleri
      </Typography>

      <Grid container spacing={2}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: theme.palette.grey[50],
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: theme.palette.grey[100],
                  boxShadow: 1,
                },
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  fontWeight: 500,
                }}
              >
                {card.label}
              </Typography>

              <Box display="flex" alignItems="center" gap={0.5}>
                {card.change && renderIcon(card.color || 'neutral')}
                <Typography
                  variant="h6"
                  sx={{
                    color: getColorFromTheme(card.color || 'neutral'),
                    fontWeight: 700,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                  }}
                  aria-label={`${card.label}: ${card.value}`}
                >
                  {card.value}
                </Typography>
              </Box>

              {card.change && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    color: getColorFromTheme(card.color || 'neutral'),
                    fontWeight: 600,
                    fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  }}
                >
                  {priceChange >= 0 ? '+' : ''}{formatPrice(card.change)} 24s
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Summary footer */}
      <Box
        sx={{
          mt: 3,
          pt: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          24 saatlik piyasa verileri
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: themeColor,
            fontWeight: 600,
          }}
        >
          {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)} {quoteCurrency}
        </Typography>
      </Box>
    </Paper>
  );
};

export default StatisticsDisplayPanel;
