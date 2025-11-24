/**
 * Market Data Panel - Displays ticker info and recent trades
 * Features: 24h stats, price change, volume, recent trades list
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useAppSelector } from '../../../store';
import {
  selectTicker,
  selectRecentTrades,
  selectSelectedSymbol,
} from '../../../store/slices/tradingSlice';
import { Trade } from '../../../types/trading.types';

interface MarketDataPanelProps {
  loading?: boolean;
}

const MarketDataPanel: React.FC<MarketDataPanelProps> = ({ loading = false }) => {
  const ticker = useAppSelector(selectTicker);
  const recentTrades = useAppSelector(selectRecentTrades);
  const selectedSymbol = useAppSelector(selectSelectedSymbol);

  // Get base and quote currency
  const [baseCurrency, quoteCurrency] = selectedSymbol.split('_');

  // Format price change with sign
  const formatPriceChange = (change: string): string => {
    const num = parseFloat(change);
    return num >= 0 ? `+${change}` : change;
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Loading skeleton
  if (loading || !ticker) {
    return (
      <Paper elevation={2} sx={{ p: 3, minHeight: 600 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rectangular" height={200} sx={{ my: 2 }} />
        <Skeleton variant="text" width="40%" height={30} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
      </Paper>
    );
  }

  const priceChange = parseFloat(ticker.priceChange);
  const isPriceUp = priceChange >= 0;

  return (
    <Paper elevation={2} sx={{ p: 3, minHeight: 600, display: 'flex', flexDirection: 'column' }}>
      {/* Market stats header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Piyasa Verileri
        </Typography>

        {/* Current price */}
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <Typography
            variant="h4"
            sx={{
              color: isPriceUp ? 'success.main' : 'error.main',
              fontWeight: 600,
            }}
          >
            {parseFloat(ticker.lastPrice).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {quoteCurrency}
          </Typography>
          {isPriceUp ? (
            <TrendingUpIcon color="success" fontSize="large" />
          ) : (
            <TrendingDownIcon color="error" fontSize="large" />
          )}
        </Box>

        {/* 24h change */}
        <Chip
          label={`${formatPriceChange(ticker.priceChange)} (${ticker.priceChangePercent}%)`}
          color={isPriceUp ? 'success' : 'error'}
          size="medium"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* 24h statistics */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          24 Saatlik İstatistikler
        </Typography>

        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
          {/* High price */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              En Yüksek
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {parseFloat(ticker.highPrice).toLocaleString('tr-TR')} {quoteCurrency}
            </Typography>
          </Box>

          {/* Low price */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              En Düşük
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {parseFloat(ticker.lowPrice).toLocaleString('tr-TR')} {quoteCurrency}
            </Typography>
          </Box>

          {/* Volume */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              Hacim ({baseCurrency})
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {parseFloat(ticker.volume).toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </Typography>
          </Box>

          {/* Quote volume */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              Hacim ({quoteCurrency})
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {parseFloat(ticker.quoteVolume).toLocaleString('tr-TR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Recent trades */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Son İşlemler
        </Typography>

        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Fiyat ({quoteCurrency})</TableCell>
                <TableCell align="right">Miktar ({baseCurrency})</TableCell>
                <TableCell align="right">Zaman</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Henüz işlem yok
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                recentTrades.slice(0, 20).map((trade: Trade, index: number) => {
                  const isBuyerMaker = trade.isBuyerMaker;
                  return (
                    <TableRow
                      key={trade.id || index}
                      sx={{
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <TableCell
                        sx={{
                          color: isBuyerMaker ? 'error.main' : 'success.main',
                          fontWeight: 600,
                        }}
                      >
                        {parseFloat(trade.price).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell align="right">
                        {parseFloat(trade.quantity).toFixed(6)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                        {formatTime(trade.time)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Color legend */}
      <Box display="flex" gap={2} sx={{ mt: 2, justifyContent: 'center' }}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: 'success.main',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Alış
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: 'error.main',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Satış
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default MarketDataPanel;
