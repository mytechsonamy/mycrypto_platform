/**
 * Open Orders Component - Enhanced display of all open orders
 * Features:
 * - Comprehensive table with all order details
 * - Filter by symbol, side, type, status
 * - Sort by time, symbol, price, amount
 * - Real-time updates via WebSocket
 * - Progress bars for partial fills
 * - Status indicators with colors
 * - Mobile-responsive design
 * - Cancel order action
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  CircularProgress,
  Collapse,
  Grid,
  SelectChangeEvent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  selectOpenOrders,
  selectSelectedSymbol,
  setOpenOrders,
  updateOrder,
  cancelOrder as cancelOrderThunk,
  selectOrderCancellationLoading,
  selectOrderCancellationError,
  clearOrderCancellationError,
} from '../../../store/slices/tradingSlice';
import { updateBalance } from '../../../store/slices/walletSlice';
import { getOpenOrders } from '../../../api/tradingApi';
import CancelOrderDialog from '../OrderForms/CancelOrderDialog';
import {
  Order,
  OrderStatus,
  OrderSide,
  OrderType,
  TradingPair,
  TRADING_PAIRS,
  WebSocketMessageType,
} from '../../../types/trading.types';
import websocketService from '../../../services/websocket.service';
import { toast } from 'react-toastify';

interface OpenOrdersComponentProps {
  onOrderCanceled?: () => void;
}

// Sort configuration
type SortField = 'time' | 'symbol' | 'price' | 'amount';
type SortOrder = 'asc' | 'desc';

// Filter status options
type FilterStatus = 'all' | 'open' | 'partial';

const OpenOrdersComponent: React.FC<OpenOrdersComponentProps> = ({
  onOrderCanceled,
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const openOrders = useAppSelector(selectOpenOrders);
  const selectedSymbol = useAppSelector(selectSelectedSymbol);
  const cancelLoading = useAppSelector(selectOrderCancellationLoading);
  const cancelError = useAppSelector(selectOrderCancellationError);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filterSymbol, setFilterSymbol] = useState<TradingPair | 'all'>('all');
  const [filterSide, setFilterSide] = useState<OrderSide | 'all'>('all');
  const [filterType, setFilterType] = useState<OrderType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  // Load open orders
  const loadOpenOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const orders = await getOpenOrders();
      dispatch(setOpenOrders(orders));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Açık emirler yüklenemedi';
      setError(errorMessage);
      toast.error(errorMessage, { position: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadOpenOrders();
  }, []);

  // Setup WebSocket subscription for order updates
  useEffect(() => {
    if (!websocketService.isConnected()) {
      return;
    }

    // Subscribe to order updates
    websocketService.subscribeToOrders((message) => {
      if (message.type === WebSocketMessageType.ORDER_UPDATE) {
        const order = message.data as Order;

        // Only process updates for the current symbol
        if (order.symbol === selectedSymbol) {
          dispatch(updateOrder(order));

          // Show toast for significant updates
          if (order.status === OrderStatus.FILLED) {
            toast.success(`Emir tamamlandı: ${order.orderId}`, { position: 'top-right', autoClose: 3000 });
          } else if (order.status === OrderStatus.PARTIALLY_FILLED) {
            const filledPercent = (parseFloat(order.executedQty) / parseFloat(order.quantity)) * 100;
            toast.info(`Emir kısmi doldu: ${filledPercent.toFixed(1)}%`, { position: 'top-right', autoClose: 2000 });
          }
        }
      }
    });

    // Cleanup on unmount
    return () => {
      // Note: We don't unsubscribe from orders as it's a global subscription
      // The websocket service handles cleanup on disconnect
    };
  }, [selectedSymbol, dispatch]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return openOrders.filter((order) => {
      // Filter by symbol
      if (filterSymbol !== 'all' && order.symbol !== filterSymbol) {
        return false;
      }

      // Filter by side
      if (filterSide !== 'all' && order.side !== filterSide) {
        return false;
      }

      // Filter by type
      if (filterType !== 'all' && order.type !== filterType) {
        return false;
      }

      // Filter by status
      if (filterStatus === 'open' && order.status !== OrderStatus.NEW) {
        return false;
      }
      if (filterStatus === 'partial' && order.status !== OrderStatus.PARTIALLY_FILLED) {
        return false;
      }

      return true;
    });
  }, [openOrders, filterSymbol, filterSide, filterType, filterStatus]);

  // Sort orders
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'time':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = parseFloat(a.price) - parseFloat(b.price);
          break;
        case 'amount':
          comparison = parseFloat(a.quantity) - parseFloat(b.quantity);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredOrders, sortField, sortOrder]);

  // Paginate orders
  const paginatedOrders = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedOrders.slice(start, end);
  }, [sortedOrders, page, rowsPerPage]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handle filter change
  const handleFilterSymbolChange = (event: SelectChangeEvent<TradingPair | 'all'>) => {
    setFilterSymbol(event.target.value as TradingPair | 'all');
    setPage(0);
  };

  const handleFilterSideChange = (event: SelectChangeEvent<OrderSide | 'all'>) => {
    setFilterSide(event.target.value as OrderSide | 'all');
    setPage(0);
  };

  const handleFilterTypeChange = (event: SelectChangeEvent<OrderType | 'all'>) => {
    setFilterType(event.target.value as OrderType | 'all');
    setPage(0);
  };

  const handleFilterStatusChange = (event: SelectChangeEvent<FilterStatus>) => {
    setFilterStatus(event.target.value as FilterStatus);
    setPage(0);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterSymbol('all');
    setFilterSide('all');
    setFilterType('all');
    setFilterStatus('all');
    setPage(0);
  };

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle cancel order
  const handleCancelClick = (order: Order) => {
    setOrderToCancel(order);
    setCancelDialogOpen(true);
    // Clear any previous errors
    dispatch(clearOrderCancellationError());
  };

  const handleCancelConfirm = async () => {
    if (!orderToCancel) return;

    try {
      // Dispatch the cancel order thunk
      const result = await dispatch(cancelOrderThunk(orderToCancel.orderId)).unwrap();

      // Update wallet balance with unlocked funds
      if (result.unlockedCurrency && result.unlockedAmount > 0) {
        // Get current balance from wallet state
        const currentBalance = await import('../../../store').then(store => {
          const state = store.default.getState();
          return state.wallet.balances.find(b => b.currency === result.unlockedCurrency);
        });

        if (currentBalance) {
          // Update balance by adding unlocked amount to available
          const newAvailableBalance = parseFloat(currentBalance.availableBalance) + result.unlockedAmount;
          const newLockedBalance = parseFloat(currentBalance.lockedBalance) - result.unlockedAmount;

          dispatch(updateBalance({
            currency: result.unlockedCurrency as any,
            availableBalance: newAvailableBalance.toFixed(8),
            lockedBalance: Math.max(0, newLockedBalance).toFixed(8),
            totalBalance: (newAvailableBalance + Math.max(0, newLockedBalance)).toFixed(8),
          }));
        }
      }

      toast.success('Sipariş başarıyla iptal edildi', {
        position: 'top-right',
        autoClose: 3000,
      });

      setCancelDialogOpen(false);
      setOrderToCancel(null);

      if (onOrderCanceled) {
        onOrderCanceled();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sipariş iptal edilemedi. Lütfen tekrar deneyin.';
      // Error is already in Redux state, just show toast
      toast.error(errorMessage, { position: 'top-right' });
    }
  };

  const handleCancelDialogClose = () => {
    if (!cancelLoading) {
      setCancelDialogOpen(false);
      setOrderToCancel(null);
      dispatch(clearOrderCancellationError());
    }
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

  // Get status color and label
  const getStatusColor = (status: OrderStatus): 'default' | 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case OrderStatus.NEW:
        return 'default';
      case OrderStatus.PARTIALLY_FILLED:
        return 'info';
      case OrderStatus.FILLED:
        return 'success';
      case OrderStatus.CANCELED:
      case OrderStatus.REJECTED:
      case OrderStatus.EXPIRED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.NEW]: 'Açık',
      [OrderStatus.PARTIALLY_FILLED]: 'Kısmi',
      [OrderStatus.FILLED]: 'Tamamlandı',
      [OrderStatus.CANCELED]: 'İptal',
      [OrderStatus.PENDING_CANCEL]: 'İptal Ediliyor',
      [OrderStatus.REJECTED]: 'Reddedildi',
      [OrderStatus.EXPIRED]: 'Süresi Doldu',
    };
    return labels[status] || status;
  };

  // Calculate fill percentage
  const calculateFillPercentage = (order: Order): number => {
    const executed = parseFloat(order.executedQty);
    const total = parseFloat(order.quantity);
    return total > 0 ? (executed / total) * 100 : 0;
  };

  // Render order row
  const renderOrderRow = (order: Order) => {
    const [baseCurrency, quoteCurrency] = order.symbol.split('_');
    const fillPercentage = calculateFillPercentage(order);
    const remainingQty = parseFloat(order.quantity) - parseFloat(order.executedQty);
    const totalValue = parseFloat(order.price) * parseFloat(order.quantity);

    return (
      <TableRow
        key={order.orderId}
        sx={{
          '&:hover': { backgroundColor: 'action.hover' },
          backgroundColor: order.status === OrderStatus.PARTIALLY_FILLED ? 'action.selected' : 'inherit',
        }}
      >
        {/* Symbol */}
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {order.symbol.replace('_', '/')}
          </Typography>
        </TableCell>

        {/* Side */}
        <TableCell>
          <Chip
            label={order.side === OrderSide.BUY ? 'Alış' : 'Satış'}
            size="small"
            sx={{
              backgroundColor: order.side === OrderSide.BUY ? 'success.main' : 'error.main',
              color: 'white',
              fontWeight: 600,
            }}
          />
        </TableCell>

        {/* Type */}
        {!isMobile && (
          <TableCell>
            <Typography variant="body2">{order.type}</Typography>
          </TableCell>
        )}

        {/* Price */}
        <TableCell align="right">
          <Typography variant="body2" fontWeight={500}>
            {order.price !== '0' ? parseFloat(order.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : 'Market'}
          </Typography>
        </TableCell>

        {/* Order Amount */}
        {!isMobile && (
          <TableCell align="right">
            <Typography variant="body2">
              {parseFloat(order.quantity).toFixed(8)} {baseCurrency}
            </Typography>
          </TableCell>
        )}

        {/* Filled */}
        <TableCell align="right">
          <Typography variant="body2" color="text.secondary">
            {parseFloat(order.executedQty).toFixed(8)}
          </Typography>
          {fillPercentage > 0 && (
            <Box sx={{ mt: 0.5, minWidth: 80 }}>
              <LinearProgress
                variant="determinate"
                value={fillPercentage}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'action.disabledBackground',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: order.side === OrderSide.BUY ? 'success.main' : 'error.main',
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {fillPercentage.toFixed(1)}%
              </Typography>
            </Box>
          )}
        </TableCell>

        {/* Remaining */}
        {!isMobile && (
          <TableCell align="right">
            <Typography variant="body2" color="text.secondary">
              {remainingQty.toFixed(8)}
            </Typography>
          </TableCell>
        )}

        {/* Total */}
        {!isMobile && (
          <TableCell align="right">
            <Typography variant="body2">
              {totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {quoteCurrency}
            </Typography>
          </TableCell>
        )}

        {/* Status */}
        <TableCell>
          <Chip
            label={getStatusLabel(order.status)}
            color={getStatusColor(order.status)}
            size="small"
          />
        </TableCell>

        {/* Time */}
        <TableCell>
          <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
            {formatTime(order.createdAt)}
          </Typography>
        </TableCell>

        {/* Action */}
        <TableCell align="right">
          {(order.status === OrderStatus.NEW || order.status === OrderStatus.PARTIALLY_FILLED) && (
            <Tooltip title="Emri İptal Et">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleCancelClick(order)}
                disabled={cancelLoading}
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <Paper elevation={2} sx={{ p: 2 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Açık Emirler ({sortedOrders.length})
          </Typography>

          <Box display="flex" gap={1}>
            <Tooltip title={showFilters ? 'Filtreleri Gizle' : 'Filtreleri Göster'}>
              <IconButton
                onClick={() => setShowFilters(!showFilters)}
                color={showFilters ? 'primary' : 'default'}
              >
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Yenile">
              <IconButton onClick={loadOpenOrders} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Filters */}
        <Collapse in={showFilters}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sembol</InputLabel>
                  <Select value={filterSymbol} label="Sembol" onChange={handleFilterSymbolChange}>
                    <MenuItem value="all">Tümü</MenuItem>
                    {TRADING_PAIRS.map((pair) => (
                      <MenuItem key={pair} value={pair}>
                        {pair.replace('_', '/')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Taraf</InputLabel>
                  <Select value={filterSide} label="Taraf" onChange={handleFilterSideChange}>
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value={OrderSide.BUY}>Alış</MenuItem>
                    <MenuItem value={OrderSide.SELL}>Satış</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tür</InputLabel>
                  <Select value={filterType} label="Tür" onChange={handleFilterTypeChange}>
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value={OrderType.MARKET}>Market</MenuItem>
                    <MenuItem value={OrderType.LIMIT}>Limit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Durum</InputLabel>
                  <Select value={filterStatus} label="Durum" onChange={handleFilterStatusChange}>
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value="open">Açık</MenuItem>
                    <MenuItem value="partial">Kısmi Dolu</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleResetFilters}
                  sx={{ textTransform: 'none' }}
                >
                  Filtreleri Sıfırla
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Error display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Orders table */}
        <TableContainer sx={{ maxHeight: 600 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'symbol'}
                      direction={sortField === 'symbol' ? sortOrder : 'asc'}
                      onClick={() => handleSort('symbol')}
                    >
                      Sembol
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Taraf</TableCell>
                  {!isMobile && <TableCell>Tür</TableCell>}
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'price'}
                      direction={sortField === 'price' ? sortOrder : 'asc'}
                      onClick={() => handleSort('price')}
                    >
                      Fiyat
                    </TableSortLabel>
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortField === 'amount'}
                        direction={sortField === 'amount' ? sortOrder : 'asc'}
                        onClick={() => handleSort('amount')}
                      >
                        Sipariş Miktarı
                      </TableSortLabel>
                    </TableCell>
                  )}
                  <TableCell align="right">Doldurulmuş</TableCell>
                  {!isMobile && <TableCell align="right">Kalan</TableCell>}
                  {!isMobile && <TableCell align="right">Toplam</TableCell>}
                  <TableCell>Durum</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'time'}
                      direction={sortField === 'time' ? sortOrder : 'asc'}
                      onClick={() => handleSort('time')}
                    >
                      Zaman
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 7 : 11} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        {filteredOrders.length === 0 && openOrders.length > 0
                          ? 'Filtre kriterlerine uygun açık emir bulunamadı'
                          : 'Açık emir bulunmuyor'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => renderOrderRow(order))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        {/* Pagination */}
        {sortedOrders.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={sortedOrders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Sayfa başına satır:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        )}
      </Paper>

      {/* Cancel order dialog */}
      <CancelOrderDialog
        open={cancelDialogOpen}
        order={orderToCancel}
        loading={cancelLoading}
        error={cancelError}
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelDialogClose}
      />
    </>
  );
};

export default OpenOrdersComponent;
