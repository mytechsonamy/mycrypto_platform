/**
 * Trade History Component - Display user's executed trades with P&L calculations
 * Features:
 * - Comprehensive table with all trade details including P&L and P&L%
 * - Filter by symbol, side, date range
 * - Sort by time (default newest first), symbol, price, P&L
 * - Pagination: 10/25/50/100 rows per page
 * - Color coding: Green for profit, red for loss
 * - Aggregated statistics: Total trades, Total P&L, Average P&L%, Win rate
 * - Export to CSV with all trade details including P&L
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
  SelectChangeEvent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  selectTradeHistory,
  selectTradeHistorySummary,
  selectTradeHistoryTotal,
  fetchTradeHistory,
  selectTradeHistoryLoading,
  selectTradeHistoryError,
} from '../../../store/slices/tradingSlice';
import {
  ExecutedTrade,
  OrderSide,
  TradingPair,
  TRADING_PAIRS,
} from '../../../types/trading.types';
import { toast } from 'react-toastify';

// Sort configuration
type SortField = 'time' | 'symbol' | 'price' | 'pnl';
type SortOrder = 'asc' | 'desc';

// Date range presets
type DateRangePreset = 'today' | 'week' | 'month' | 'custom';

const TradeHistoryComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const tradeHistory = useAppSelector(selectTradeHistory);
  const summary = useAppSelector(selectTradeHistorySummary);
  const total = useAppSelector(selectTradeHistoryTotal);
  const loading = useAppSelector(selectTradeHistoryLoading);
  const error = useAppSelector(selectTradeHistoryError);

  // UI state
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filterSymbol, setFilterSymbol] = useState<TradingPair | 'all'>('all');
  const [filterSide, setFilterSide] = useState<OrderSide | 'all'>('all');
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

  // Load trade history
  const loadTradeHistory = () => {
    dispatch(fetchTradeHistory({
      symbol: filterSymbol === 'all' ? undefined : filterSymbol,
      side: filterSide === 'all' ? undefined : filterSide,
      startDate: startDate ? startDate.getTime() : undefined,
      endDate: endDate ? endDate.getTime() : undefined,
      page: page + 1, // API uses 1-based pagination
      limit: rowsPerPage,
    }));
  };

  // Initial load
  useEffect(() => {
    loadTradeHistory();
  }, []);

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

  // Sort trades
  const sortedTrades = useMemo(() => {
    const sorted = [...tradeHistory];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'time':
          comparison = a.executedAt - b.executedAt;
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'pnl': {
          const pnlA = a.pnl || 0;
          const pnlB = b.pnl || 0;
          comparison = pnlA - pnlB;
          break;
        }
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [tradeHistory, sortField, sortOrder]);

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

  const handleDateRangePresetChange = (event: SelectChangeEvent<DateRangePreset>) => {
    setDateRangePreset(event.target.value as DateRangePreset);
    setPage(0);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilterSymbol('all');
    setFilterSide('all');
    setDateRangePreset('month');
    setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    setEndDate(new Date());
    setPage(0);
  };

  // Apply filters
  const handleApplyFilters = () => {
    loadTradeHistory();
    setPage(0);
  };

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    // Reload data with new page
    dispatch(fetchTradeHistory({
      symbol: filterSymbol === 'all' ? undefined : filterSymbol,
      side: filterSide === 'all' ? undefined : filterSide,
      startDate: startDate ? startDate.getTime() : undefined,
      endDate: endDate ? endDate.getTime() : undefined,
      page: newPage + 1,
      limit: rowsPerPage,
    }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    // Reload data with new limit
    dispatch(fetchTradeHistory({
      symbol: filterSymbol === 'all' ? undefined : filterSymbol,
      side: filterSide === 'all' ? undefined : filterSide,
      startDate: startDate ? startDate.getTime() : undefined,
      endDate: endDate ? endDate.getTime() : undefined,
      page: 1,
      limit: newRowsPerPage,
    }));
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
        'Toplam',
        'Ücret',
        'Kar/Zarar',
        'Kar/Zarar %',
        'Tarih',
        'Saat',
      ];

      const rows = sortedTrades.map(trade => {
        const [baseCurrency, quoteCurrency] = trade.symbol.split('_');
        const date = new Date(trade.executedAt);

        return [
          trade.symbol.replace('_', '/'),
          trade.side === OrderSide.BUY ? 'Alış' : 'Satış',
          trade.type === 'MARKET' ? 'Market' : 'Limit',
          trade.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
          trade.quantity.toFixed(8),
          trade.totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
          trade.fee.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
          trade.pnl !== undefined ? trade.pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-',
          trade.pnlPercent !== undefined ? trade.pnlPercent.toFixed(2) + '%' : '-',
          date.toLocaleDateString('tr-TR'),
          date.toLocaleTimeString('tr-TR'),
        ];
      });

      // Add summary row
      rows.push([]);
      rows.push([
        'ÖZET',
        '',
        '',
        '',
        '',
        '',
        `Toplam İşlemler: ${summary.totalTrades}`,
        summary.totalPnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
        summary.avgPnlPercent.toFixed(2) + '%',
        `Kazanma Oranı: ${summary.winRate.toFixed(1)}%`,
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
      link.setAttribute('download', `trade_history_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('İşlem geçmişi CSV olarak indirildi', {
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

  // Get P&L color
  const getPnlColor = (pnl: number | undefined): string => {
    if (pnl === undefined) return theme.palette.text.secondary;
    if (pnl > 0) return theme.palette.success.main;
    if (pnl < 0) return theme.palette.error.main;
    return theme.palette.text.secondary;
  };

  // Render trade row
  const renderTradeRow = (trade: ExecutedTrade) => {
    const [baseCurrency, quoteCurrency] = trade.symbol.split('_');
    const hasPnl = trade.pnl !== undefined;
    const rowBgColor = hasPnl
      ? trade.pnl! > 0
        ? 'rgba(76, 175, 80, 0.08)'
        : trade.pnl! < 0
        ? 'rgba(244, 67, 54, 0.08)'
        : 'transparent'
      : 'transparent';

    return (
      <TableRow
        key={trade.tradeId}
        sx={{
          backgroundColor: rowBgColor,
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        {/* Symbol */}
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {trade.symbol.replace('_', '/')}
          </Typography>
        </TableCell>

        {/* Side */}
        <TableCell>
          <Chip
            label={trade.side === OrderSide.BUY ? 'Alış' : 'Satış'}
            size="small"
            sx={{
              backgroundColor: trade.side === OrderSide.BUY ? 'success.main' : 'error.main',
              color: 'white',
              fontWeight: 600,
            }}
          />
        </TableCell>

        {/* Type */}
        {!isMobile && (
          <TableCell>
            <Typography variant="body2">{trade.type === 'MARKET' ? 'Market' : 'Limit'}</Typography>
          </TableCell>
        )}

        {/* Price */}
        <TableCell align="right">
          <Typography variant="body2" fontWeight={500}>
            {trade.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </Typography>
        </TableCell>

        {/* Amount */}
        {!isMobile && (
          <TableCell align="right">
            <Typography variant="body2">
              {trade.quantity.toFixed(8)} {baseCurrency}
            </Typography>
          </TableCell>
        )}

        {/* Total */}
        <TableCell align="right">
          <Typography variant="body2">
            {trade.totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {quoteCurrency}
          </Typography>
        </TableCell>

        {/* Fee */}
        {!isMobile && (
          <TableCell align="right">
            <Typography variant="body2" color="text.secondary">
              {trade.fee.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {quoteCurrency}
            </Typography>
          </TableCell>
        )}

        {/* P&L */}
        <TableCell align="right">
          {hasPnl ? (
            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
              {trade.pnl! > 0 ? (
                <TrendingUpIcon fontSize="small" sx={{ color: 'success.main' }} />
              ) : trade.pnl! < 0 ? (
                <TrendingDownIcon fontSize="small" sx={{ color: 'error.main' }} />
              ) : null}
              <Typography variant="body2" fontWeight={600} sx={{ color: getPnlColor(trade.pnl) }}>
                {trade.pnl!.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {quoteCurrency}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          )}
        </TableCell>

        {/* P&L % */}
        <TableCell align="right">
          {hasPnl && trade.pnlPercent !== undefined ? (
            <Typography variant="body2" fontWeight={600} sx={{ color: getPnlColor(trade.pnl) }}>
              {trade.pnlPercent > 0 ? '+' : ''}
              {trade.pnlPercent.toFixed(2)}%
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          )}
        </TableCell>

        {/* Time */}
        <TableCell>
          <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
            {formatDate(trade.executedAt)}
          </Typography>
          <Typography variant="body2" fontSize="0.7rem" color="text.secondary">
            {formatTime(trade.executedAt)}
          </Typography>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
      <Box>
        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Card elevation={1}>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Toplam İşlemler
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {summary.totalTrades}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card
              elevation={1}
              sx={{
                borderLeft: 3,
                borderColor: summary.totalPnl >= 0 ? 'success.main' : 'error.main',
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Toplam Kar/Zarar
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={600}
                  sx={{ color: summary.totalPnl >= 0 ? 'success.main' : 'error.main' }}
                >
                  {summary.totalPnl >= 0 ? '+' : ''}
                  {summary.totalPnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card
              elevation={1}
              sx={{
                borderLeft: 3,
                borderColor: summary.avgPnlPercent >= 0 ? 'success.main' : 'error.main',
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Ortalama Kar/Zarar %
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={600}
                  sx={{ color: summary.avgPnlPercent >= 0 ? 'success.main' : 'error.main' }}
                >
                  {summary.avgPnlPercent >= 0 ? '+' : ''}
                  {summary.avgPnlPercent.toFixed(2)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={1} sx={{ borderLeft: 3, borderColor: 'primary.main' }}>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Kazanma Oranı
                </Typography>
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {summary.winRate.toFixed(1)}%
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
              İşlem Geçmişi
            </Typography>

            <Box display="flex" gap={1}>
              <Tooltip title="CSV İndir">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportCSV}
                  disabled={loading || sortedTrades.length === 0}
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
                <IconButton onClick={loadTradeHistory} disabled={loading}>
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
                      <DatePicker
                        label="Başlangıç Tarihi"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <DatePicker
                        label="Bitiş Tarihi"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                          },
                        }}
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

          {/* Trades table */}
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
                    {!isMobile && <TableCell align="right">Miktar</TableCell>}
                    <TableCell align="right">Toplam</TableCell>
                    {!isMobile && <TableCell align="right">Ücret</TableCell>}
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortField === 'pnl'}
                        direction={sortField === 'pnl' ? sortOrder : 'asc'}
                        onClick={() => handleSort('pnl')}
                      >
                        Kar/Zarar
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">Kar/Zarar %</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'time'}
                        direction={sortField === 'time' ? sortOrder : 'asc'}
                        onClick={() => handleSort('time')}
                      >
                        Zaman
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedTrades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isMobile ? 7 : 10} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          İşlem geçmişi bulunamadı
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTrades.map((trade) => renderTradeRow(trade))
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>

          {/* Pagination */}
          {total > 0 && (
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={total}
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
    </LocalizationProvider>
  );
};

export default TradeHistoryComponent;
