/**
 * OrderBook Component
 * Displays real-time order book with bids and asks
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
  CircularProgress,
  Alert,
  ButtonGroup,
  Button,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { OrderBookLevel, AggregateLevel, AGGREGATE_LEVELS } from '../../../types/trading.types';

export interface UserOrderData {
  volume: string;
  count: number;
}

export interface OrderBookProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: string;
  spreadPercent: string;
  symbol: string;
  loading?: boolean;
  error?: string | null;
  aggregateLevel?: AggregateLevel;
  onAggregateChange?: (aggregate: AggregateLevel) => void;
  userOrders?: string[]; // Array of price levels where user has orders
  userOrderData?: Record<string, UserOrderData>; // Detailed user order info per price
}

const OrderBookComponent: React.FC<OrderBookProps> = ({
  bids,
  asks,
  spread,
  spreadPercent,
  symbol,
  loading = false,
  error = null,
  aggregateLevel = 0.1,
  onAggregateChange,
  userOrders = [],
  userOrderData = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Calculate max total for depth visualization
  const maxBidTotal = useMemo(() => {
    return bids.length > 0 ? Math.max(...bids.map(([, , total]) => parseFloat(total))) : 0;
  }, [bids]);

  const maxAskTotal = useMemo(() => {
    return asks.length > 0 ? Math.max(...asks.map(([, , total]) => parseFloat(total))) : 0;
  }, [asks]);

  // Format number with commas
  const formatNumber = (value: string, decimals: number = 2): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Format crypto quantity (8 decimals)
  const formatQuantity = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00000000';
    return num.toFixed(8);
  };

  // Calculate depth percentage for visualization
  const calculateDepthPercent = (total: string, maxTotal: number): number => {
    const totalNum = parseFloat(total);
    return maxTotal > 0 ? (totalNum / maxTotal) * 100 : 0;
  };

  // Render order book row
  const renderOrderRow = (
    level: OrderBookLevel,
    side: 'bid' | 'ask',
    maxTotal: number
  ): JSX.Element => {
    const [price, quantity, total] = level;
    const depthPercent = calculateDepthPercent(total, maxTotal);
    const isUserOrder = userOrders.includes(price);
    const userOrder = userOrderData[price];
    const bgColor = side === 'bid' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)';
    const userOrderBg = 'rgba(255, 235, 59, 0.15)'; // Light yellow for user orders
    const userOrderBorder = isUserOrder ? `2px solid ${theme.palette.warning.main}` : 'none';

    const rowContent = (
      <TableRow
        key={price}
        sx={{
          position: 'relative',
          cursor: isUserOrder ? 'help' : 'pointer',
          '&:hover': {
            bgcolor: side === 'bid' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
          },
          bgcolor: isUserOrder ? userOrderBg : 'transparent',
          borderLeft: side === 'bid' ? userOrderBorder : 'none',
          borderRight: side === 'ask' ? userOrderBorder : 'none',
        }}
      >
        {/* Depth visualization background */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: side === 'bid' ? 0 : 'auto',
            left: side === 'ask' ? 0 : 'auto',
            bottom: 0,
            width: `${depthPercent}%`,
            bgcolor: bgColor,
            zIndex: 0,
          }}
        />

        {/* Price */}
        <TableCell
          sx={{
            position: 'relative',
            zIndex: 1,
            color: side === 'bid' ? theme.palette.success.main : theme.palette.error.main,
            fontWeight: isUserOrder ? 700 : 600,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            py: 0.5,
            px: { xs: 0.5, sm: 1 },
          }}
        >
          {formatNumber(price, 2)}
        </TableCell>

        {/* Quantity */}
        <TableCell
          sx={{
            position: 'relative',
            zIndex: 1,
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
            py: 0.5,
            px: { xs: 0.5, sm: 1 },
          }}
        >
          {formatQuantity(quantity)}
        </TableCell>

        {/* Total */}
        <TableCell
          sx={{
            position: 'relative',
            zIndex: 1,
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
            py: 0.5,
            px: { xs: 0.5, sm: 1 },
          }}
        >
          {formatNumber(total)}
        </TableCell>
      </TableRow>
    );

    // If user has orders at this price, wrap in tooltip
    if (isUserOrder && userOrder) {
      return (
        <Tooltip
          key={price}
          title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="caption" fontWeight={600}>
                Emirleriniz
              </Typography>
              <Typography variant="caption" display="block">
                {userOrder.count} emir
              </Typography>
              <Typography variant="caption" display="block">
                Toplam: {formatQuantity(userOrder.volume)}
              </Typography>
            </Box>
          }
          placement={side === 'bid' ? 'left' : 'right'}
          arrow
        >
          {rowContent}
        </Tooltip>
      );
    }

    return rowContent;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Emir Defteri - {symbol}
        </Typography>

        {/* Aggregate level selector */}
        {onAggregateChange && (
          <ButtonGroup size="small" variant="outlined">
            {AGGREGATE_LEVELS.map((level) => (
              <Button
                key={level}
                variant={aggregateLevel === level ? 'contained' : 'outlined'}
                onClick={() => onAggregateChange(level)}
                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
              >
                {level}%
              </Button>
            ))}
          </ButtonGroup>
        )}
      </Box>

      {/* Order book tables */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
        }}
      >
        {/* Asks (Sell orders) */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            borderRight: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
            borderBottom: isMobile ? `1px solid ${theme.palette.divider}` : 'none',
          }}
        >
          <TableContainer sx={{ height: '100%' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      bgcolor: theme.palette.background.paper,
                    }}
                  >
                    Fiyat (TRY)
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      bgcolor: theme.palette.background.paper,
                    }}
                  >
                    Miktar
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      bgcolor: theme.palette.background.paper,
                    }}
                  >
                    Toplam (TRY)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {asks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Satış emri yok
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  asks.slice().reverse().map((level) => renderOrderRow(level, 'ask', maxAskTotal))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Spread display */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: theme.palette.grey[100],
            py: 2,
            px: { xs: 1, sm: 2 },
            minHeight: { xs: 60, sm: 80 },
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
          >
            Spread
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.9rem', sm: '1.1rem' },
              color: theme.palette.warning.main,
            }}
          >
            {formatNumber(spread)} TRY
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
          >
            ({spreadPercent}%)
          </Typography>
        </Box>

        {/* Bids (Buy orders) */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            borderLeft: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
          }}
        >
          <TableContainer sx={{ height: '100%' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      bgcolor: theme.palette.background.paper,
                    }}
                  >
                    Fiyat (TRY)
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      bgcolor: theme.palette.background.paper,
                    }}
                  >
                    Miktar
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      bgcolor: theme.palette.background.paper,
                    }}
                  >
                    Toplam (TRY)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bids.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Alış emri yok
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  bids.map((level) => renderOrderRow(level, 'bid', maxBidTotal))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Paper>
  );
};

export default OrderBookComponent;
