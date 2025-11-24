/**
 * Recent Trades Component
 * Displays recent trades (last 50) for a trading pair
 * Shows: price, quantity, time, buy/sell side with color coding
 */

import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  Skeleton,
  Chip,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Trade } from '../../../types/trading.types';

export interface RecentTradesComponentProps {
  trades: Trade[];
  symbol: string;
  loading?: boolean;
  error?: string | null;
  maxHeight?: number;
}

const RecentTradesComponent: React.FC<RecentTradesComponentProps> = ({
  trades,
  symbol,
  loading = false,
  error = null,
  maxHeight = 600,
}) => {
  const theme = useTheme();

  // Format price with Turkish locale
  const formatPrice = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format quantity (8 decimals for crypto)
  const formatQuantity = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  // Format time (HH:MM:SS in Turkish locale)
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Determine if trade is a buy (buyer is taker) or sell (seller is taker)
  // isBuyerMaker: true means buyer made (placed) the order, seller took it -> SELL
  // isBuyerMaker: false means seller made the order, buyer took it -> BUY
  const getTradeSide = (trade: Trade): 'BUY' | 'SELL' => {
    return trade.isBuyerMaker ? 'SELL' : 'BUY';
  };

  // Get color for trade side
  const getSideColor = (side: 'BUY' | 'SELL'): string => {
    return side === 'BUY' ? theme.palette.info.main : theme.palette.warning.main;
  };

  // Get side label in Turkish
  const getSideLabel = (side: 'BUY' | 'SELL'): string => {
    return side === 'BUY' ? 'Alış' : 'Satış';
  };

  // Sort trades by time (most recent first)
  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => b.time - a.time);
  }, [trades]);

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
        <Typography variant="h6" gutterBottom>
          Son İşlemler
        </Typography>
        <Box>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
            <Box key={item} display="flex" justifyContent="space-between" mb={1}>
              <Skeleton variant="text" width="25%" height={24} />
              <Skeleton variant="text" width="20%" height={24} />
              <Skeleton variant="text" width="15%" height={24} />
              <Skeleton variant="rectangular" width="15%" height={24} />
            </Box>
          ))}
        </Box>
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
        <Typography variant="h6" gutterBottom>
          Son İşlemler
        </Typography>
        <Typography variant="body2" color="error.dark">
          {error}
        </Typography>
      </Paper>
    );
  }

  // Render empty state
  if (sortedTrades.length === 0) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Son İşlemler
        </Typography>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
          bgcolor={theme.palette.grey[50]}
          borderRadius={1}
        >
          <Typography variant="body2" color="text.secondary">
            Henüz işlem bulunmamaktadır
          </Typography>
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
      aria-label="Son işlemler tablosu"
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography
          variant="h6"
          sx={{
            fontSize: { xs: '1rem', sm: '1.25rem' },
            fontWeight: 600,
          }}
        >
          Son İşlemler
        </Typography>
        <Chip
          label={`${sortedTrades.length} işlem`}
          size="small"
          sx={{
            fontSize: '0.75rem',
            height: 24,
          }}
        />
      </Box>

      {/* Trades Table */}
      <TableContainer sx={{ maxHeight, overflowY: 'auto' }}>
        <Table
          stickyHeader
          size="small"
          sx={{
            '& .MuiTableCell-root': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 600,
                  bgcolor: theme.palette.background.paper,
                  borderBottom: `2px solid ${theme.palette.divider}`,
                }}
              >
                Fiyat (TRY)
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  bgcolor: theme.palette.background.paper,
                  borderBottom: `2px solid ${theme.palette.divider}`,
                }}
              >
                Miktar
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  bgcolor: theme.palette.background.paper,
                  borderBottom: `2px solid ${theme.palette.divider}`,
                }}
              >
                Zaman
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: 600,
                  bgcolor: theme.palette.background.paper,
                  borderBottom: `2px solid ${theme.palette.divider}`,
                }}
              >
                Taraf
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTrades.map((trade, index) => {
              const side = getTradeSide(trade);
              const sideColor = getSideColor(side);
              const sideLabel = getSideLabel(side);

              return (
                <TableRow
                  key={trade.id}
                  hover
                  sx={{
                    '&:nth-of-type(odd)': {
                      bgcolor: theme.palette.action.hover,
                    },
                    '&:hover': {
                      bgcolor: theme.palette.action.selected,
                    },
                    // Highlight new trades (first 3)
                    ...(index < 3 && {
                      animation: 'highlight 2s ease-out',
                      '@keyframes highlight': {
                        '0%': {
                          bgcolor: theme.palette.action.selected,
                        },
                        '100%': {
                          bgcolor: 'transparent',
                        },
                      },
                    }),
                  }}
                >
                  {/* Price */}
                  <TableCell
                    sx={{
                      fontWeight: 500,
                      color: sideColor,
                    }}
                  >
                    {formatPrice(trade.price)}
                  </TableCell>

                  {/* Quantity */}
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                    {formatQuantity(trade.quantity)}
                  </TableCell>

                  {/* Time */}
                  <TableCell
                    align="right"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontFamily: 'monospace',
                    }}
                  >
                    {formatTime(trade.time)}
                  </TableCell>

                  {/* Side */}
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      {side === 'BUY' ? (
                        <ArrowDownwardIcon
                          sx={{
                            fontSize: { xs: 14, sm: 16 },
                            color: sideColor,
                          }}
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUpwardIcon
                          sx={{
                            fontSize: { xs: 14, sm: 16 },
                            color: sideColor,
                          }}
                          aria-hidden="true"
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: { xs: '0.7rem', sm: '0.8rem' },
                          fontWeight: 600,
                          color: sideColor,
                        }}
                      >
                        {sideLabel}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer Info */}
      <Box
        mt={1.5}
        pt={1.5}
        borderTop={`1px solid ${theme.palette.divider}`}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography variant="caption" color="text.secondary">
          Gerçek zamanlı güncelleniyor
        </Typography>
        <Typography variant="caption" color="text.secondary" fontFamily="monospace">
          {symbol.replace('_', ' / ')}
        </Typography>
      </Box>
    </Paper>
  );
};

export default RecentTradesComponent;
