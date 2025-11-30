/**
 * Order History Component - Display historical orders with filters and export
 * Features:
 * - Comprehensive table with all order details
 * - Filter by symbol, side, type, status, date range
 * - Sort by time (default newest first), symbol, status, amount, total
 * - Pagination: 10/25/50/100 rows per page
 * - Statistics: Total orders, Filled, Canceled, Rejected counts
 * - Status badge colors: Filled (green), Canceled (gray), Rejected (red)
 * - Export to CSV with Turkish formatting
 * - Date range filter: Today, This Week, This Month, Custom
 * - Mobile-responsive design
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
  Alert,
  CircularProgress,
  Collapse,
  Grid,
  Card,
  CardContent,
  TextField,
  SelectChangeEvent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
// Removed date-pickers imports to avoid peer dependency issues
// Using native date inputs instead
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  selectOrderHistory,
  fetchOrderHistory,
  selectOrderHistoryLoading,
  selectOrderHistoryError,
} from '../../../store/slices/tradingSlice';
import {
  Order,
  OrderStatus,
  OrderSide,
  OrderType,
  TradingPair,
  TRADING_PAIRS,
} from '../../../types/trading.types';
import { toast } from 'react-toastify';

interface OrderHistoryComponentProps {
  onOrderDetailsClick?: (order: Order) => void;
}

// Sort configuration
type SortField = 'time' | 'symbol' | 'status' | 'amount' | 'total';
type SortOrder = 'asc' | 'desc';

// Filter status options for historical orders
type HistoricalStatus = 'all' | OrderStatus.FILLED | OrderStatus.CANCELED | OrderStatus.REJECTED;

// Date range presets
type DateRangePreset = 'today' | 'week' | 'month' | 'custom';

const OrderHistoryComponent: React.FC<OrderHistoryComponentProps> = ({
  onOrderDetailsClick,
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const orderHistory = useAppSelector(selectOrderHistory);
  const loading = useAppSelector(selectOrderHistoryLoading);
  const error = useAppSelector(selectOrderHistoryError);

  // UI state
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filterSymbol, setFilterSymbol] = useState<TradingPair | 'all'>('all');
  const [filterSide, setFilterSide] = useState<OrderSide | 'all'>('all');
  const [filterType, setFilterType] = useState<OrderType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<HistoricalStatus>('all');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('month');
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  // Sort state
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Load order history
  const loadOrderHistory = () => {
    dispatch(fetchOrderHistory({
      symbol: filterSymbol === 'all' ? undefined : filterSymbol,
      side: filterSide === 'all' ? undefined : filterSide,
      type: filterType === 'all' ? undefined : filterType,
      status: filterStatus === 'all' ? undefined : filterStatus,
      startDate: startDate ? startDate.getTime() : undefined,
      endDate: endDate ? endDate.getTime() : undefined,
    }));
  };

  // Initial load
  useEffect(() => {
    loadOrderHistory();
  }, [dispatch]);

  // Apply date range preset
  useEffect(() => {
    const now = new Date();
    let start: Date;

    switch (dateRangePreset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        setStartDate(start);
        setEndDate(now);
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setStartDate(start);
        setEndDate(now);
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setStartDate(start);
        setEndDate(now);
        break;
      case 'custom':
        // Don't change dates, user will set manually
        break;
    }
  }, [dateRangePreset]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = orderHistory.length;
    const filled = orderHistory.filter(o => o.status === OrderStatus.FILLED).length;
    const canceled = orderHistory.filter(o => o.status === OrderStatus.CANCELED).length;
    const rejected = orderHistory.filter(o => o.status === OrderStatus.REJECTED).length;

    return { total, filled, canceled, rejected };
  }, [orderHistory]);

  // Filter orders (already filtered by API, but apply additional client-side filtering if needed)
  const filteredOrders = useMemo(() => {
    return orderHistory.filter((order) => {
      // All filtering is done server-side, but we keep this for consistency
      return true;
    });
  }, [orderHistory]);

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
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'amount':
          comparison = parseFloat(a.quantity) - parseFloat(b.quantity);
          break;
        case 'total': {
          const totalA = parseFloat(a.price) * parseFloat(a.quantity);
          const totalB = parseFloat(b.price) * parseFloat(b.quantity);
          comparison = totalA - totalB;
          break;
        }
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

  const handleFilterStatusChange = (event: SelectChangeEvent<HistoricalStatus>) => {
    setFilterStatus(event.target.value as HistoricalStatus);
    setPage(0);
  };

  const handleDateRangePresetChange = (event: SelectChangeEvent<DateRangePreset>) => {
    setDateRangePreset(event.target.value as DateRangePreset);
    setPage(0);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterSymbol('all');
    setFilterSide('all');
    setFilterType('all');
    setFilterStatus('all');
    setDateRangePreset('month');
    setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    setEndDate(new Date());
    setPage(0);
  };

  // Apply filters
  const handleApplyFilters = () => {
    loadOrderHistory();
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

  // Handle CSV export
  const handleExportCSV = () => {
    try {
      // Prepare CSV data
      const headers = [
        'Sembol',
        'Taraf',
        'Tür',
        'Fiyat',
        'Miktar',
        'Doldurulmuş',
        'Durum',
        'Ücret',
        'Toplam',
        'Tarih',
        'Saat',
      ];

      const rows = sortedOrders.map(order => {
        const [baseCurrency, quoteCurrency] = order.symbol.split('_');
        const fee = order.fills?.reduce((sum, fill) => sum + parseFloat(fill.commission), 0) || 0;
        const total = parseFloat(order.price) * parseFloat(order.quantity);
        const date = new Date(order.createdAt);

        return [
          order.symbol.replace('_', '/'),
          order.side === OrderSide.BUY ? 'Alış' : 'Satış',
          order.type === OrderType.MARKET ? 'Market' : 'Limit',
          order.price !== '0' ? parseFloat(order.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-',
          parseFloat(order.quantity).toFixed(8),
          parseFloat(order.executedQty).toFixed(8),
          getStatusLabel(order.status),
          fee.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
          total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
          date.toLocaleDateString('tr-TR'),
          date.toLocaleTimeString('tr-TR'),
        ];
      });

      // Add summary row
      const totalOrders = sortedOrders.length;
      const totalFees = sortedOrders.reduce((sum, order) => {
        const fee = order.fills?.reduce((s, fill) => s + parseFloat(fill.commission), 0) || 0;
        return sum + fee;
      }, 0);
      const totalVolume = sortedOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.price) * parseFloat(order.quantity));
      }, 0);

      rows.push([]);
      rows.push([
        'ÖZET',
        '',
        '',
        '',
        '',
        '',
        `Toplam: ${totalOrders}`,
        totalFees.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
        totalVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
        '',
        '',
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Create blob and download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `order_history_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Sipariş geçmişi CSV olarak indirildi', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'CSV dışa aktarılamadı';
      toast.error(errorMessage, { position: 'top-right' });
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

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Get status color and label
  const getStatusColor = (status: OrderStatus): 'default' | 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case OrderStatus.FILLED:
        return 'success';
      case OrderStatus.CANCELED:
        return 'default';
      case OrderStatus.REJECTED:
        return 'error';
      case OrderStatus.PARTIALLY_FILLED:
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.NEW]: 'Açık',
      [OrderStatus.PARTIALLY_FILLED]: 'Kısmi',
      [OrderStatus.FILLED]: 'Dolduruldu',
      [OrderStatus.CANCELED]: 'İptal Edildi',
      [OrderStatus.PENDING_CANCEL]: 'İptal Ediliyor',
      [OrderStatus.REJECTED]: 'Reddedildi',
      [OrderStatus.EXPIRED]: 'Süresi Doldu',
    };
    return labels[status] || status;
  };

  // Render order row
  const renderOrderRow = (order: Order) => {
    const [baseCurrency, quoteCurrency] = order.symbol.split('_');
    const fee = order.fills?.reduce((sum, fill) => sum + parseFloat(fill.commission), 0) || 0;
    const total = parseFloat(order.price) * parseFloat(order.quantity);

    return (
      <TableRow
        key={order.orderId}
        sx={{
          '&:hover': { backgroundColor: 'action.hover' },
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
            <Typography variant="body2">{order.type === OrderType.MARKET ? 'Market' : 'Limit'}</Typography>
          </TableCell>
        )}

        {/* Price */}
        <TableCell align="right">
          <Typography variant="body2" fontWeight={500}>
            {order.price !== '0' ? parseFloat(order.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
          </Typography>
        </TableCell>

        {/* Amount */}
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
        </TableCell>

        {/* Status */}
        <TableCell>
          <Chip
            label={getStatusLabel(order.status)}
            color={getStatusColor(order.status)}
            size="small"
          />
        </TableCell>

        {/* Fee */}
        {!isMobile && (
          <TableCell align="right">
            <Typography variant="body2" color="text.secondary">
              {fee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {quoteCurrency}
            </Typography>
          </TableCell>
        )}

        {/* Total */}
        <TableCell align="right">
          <Typography variant="body2">
            {total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {quoteCurrency}
          </Typography>
        </TableCell>

        {/* Time */}
        <TableCell>
          <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
            {formatDate(order.createdAt)}
          </Typography>
          <Typography variant="body2" fontSize="0.7rem" color="text.secondary">
            {formatTime(order.createdAt)}
          </Typography>
        </TableCell>

        {/* Action */}
        <TableCell align="right">
          {onOrderDetailsClick && (
            <Tooltip title="Detayları Görüntüle">
              <IconButton
                size="small"
                color="primary"
                onClick={() => onOrderDetailsClick(order)}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box>
        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Card elevation={1}>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Toplam Siparişler
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {statistics.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={1} sx={{ borderLeft: 3, borderColor: 'success.main' }}>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Doldurulmuş
                </Typography>
                <Typography variant="h5" fontWeight={600} color="success.main">
                  {statistics.filled}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={1} sx={{ borderLeft: 3, borderColor: 'grey.500' }}>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  İptal Edildi
                </Typography>
                <Typography variant="h5" fontWeight={600} color="grey.700">
                  {statistics.canceled}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={1} sx={{ borderLeft: 3, borderColor: 'error.main' }}>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Reddedildi
                </Typography>
                <Typography variant="h5" fontWeight={600} color="error.main">
                  {statistics.rejected}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Paper */}
        <Paper elevation={2} sx={{ p: 2 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Sipariş Geçmişi
            </Typography>

            <Box display="flex" gap={1}>
              <Tooltip title="CSV İndir">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportCSV}
                  disabled={loading || sortedOrders.length === 0}
                  sx={{ textTransform: 'none' }}
                >
                  {!isMobile && 'İndir'}
                </Button>
              </Tooltip>
              <Tooltip title={showFilters ? 'Filtreleri Gizle' : 'Filtreleri Göster'}>
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? 'primary' : 'default'}
                >
                  <FilterListIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Yenile">
                <IconButton onClick={loadOrderHistory} disabled={loading}>
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
                      <MenuItem value={OrderStatus.FILLED}>Dolduruldu</MenuItem>
                      <MenuItem value={OrderStatus.CANCELED}>İptal Edildi</MenuItem>
                      <MenuItem value={OrderStatus.REJECTED}>Reddedildi</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tarih Aralığı</InputLabel>
                    <Select value={dateRangePreset} label="Tarih Aralığı" onChange={handleDateRangePresetChange}>
                      <MenuItem value="today">Bugün</MenuItem>
                      <MenuItem value="week">Bu Hafta</MenuItem>
                      <MenuItem value="month">Bu Ay</MenuItem>
                      <MenuItem value="custom">Özel</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {dateRangePreset === 'custom' && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="Başlangıç Tarihi"
                        type="date"
                        size="small"
                        fullWidth
                        value={startDate ? startDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setStartDate(new Date(e.target.value));
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="Bitiş Tarihi"
                        type="date"
                        size="small"
                        fullWidth
                        value={endDate ? endDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setEndDate(new Date(e.target.value));
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleApplyFilters}
                      sx={{ textTransform: 'none' }}
                    >
                      Filtrele
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleResetFilters}
                      sx={{ textTransform: 'none' }}
                    >
                      Sıfırla
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Collapse>

          {/* Error display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
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
                    <TableCell align="right">Fiyat</TableCell>
                    {!isMobile && <TableCell align="right">Miktar</TableCell>}
                    <TableCell align="right">Doldurulmuş</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'status'}
                        direction={sortField === 'status' ? sortOrder : 'asc'}
                        onClick={() => handleSort('status')}
                      >
                        Durum
                      </TableSortLabel>
                    </TableCell>
                    {!isMobile && <TableCell align="right">Ücret</TableCell>}
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortField === 'total'}
                        direction={sortField === 'total' ? sortOrder : 'asc'}
                        onClick={() => handleSort('total')}
                      >
                        Toplam
                      </TableSortLabel>
                    </TableCell>
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
                      <TableCell colSpan={isMobile ? 8 : 11} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          Sipariş geçmişi bulunamadı
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
              rowsPerPageOptions={[10, 25, 50, 100]}
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
      </Box>
    );
  };

export default OrderHistoryComponent;
