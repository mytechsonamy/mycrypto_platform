/**
 * Order Status Panel - Displays open orders and order history
 * Features: Open orders table, order history, cancel functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  selectOpenOrders,
  selectOrderHistory,
  setOpenOrders,
  setOrderHistory,
} from '../../../store/slices/tradingSlice';
import { getOpenOrders, getOrderHistory, cancelOrder } from '../../../api/tradingApi';
import { Order, OrderStatus, OrderSide, OrderType } from '../../../types/trading.types';
import { toast } from 'react-toastify';

interface OrderStatusPanelProps {
  refreshTrigger?: number;
}

const OrderStatusPanel: React.FC<OrderStatusPanelProps> = ({ refreshTrigger }) => {
  const dispatch = useAppDispatch();
  const openOrders = useAppSelector(selectOpenOrders);
  const orderHistory = useAppSelector(selectOrderHistory);

  // UI state
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [canceling, setCanceling] = useState(false);

  // Load open orders
  const loadOpenOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const orders = await getOpenOrders();
      dispatch(setOpenOrders(orders));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Emirler yüklenemedi';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load order history
  const loadOrderHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOrderHistory(1, 50);
      dispatch(setOrderHistory(response.orders));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Geçmiş yüklenemedi';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (activeTab === 'open') {
      loadOpenOrders();
    } else {
      loadOrderHistory();
    }
  }, [activeTab]);

  // Refresh on trigger
  useEffect(() => {
    if (refreshTrigger) {
      if (activeTab === 'open') {
        loadOpenOrders();
      } else {
        loadOrderHistory();
      }
    }
  }, [refreshTrigger]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: 'open' | 'history') => {
    setActiveTab(newValue);
    setError(null);
  };

  // Handle cancel order click
  const handleCancelClick = (order: Order) => {
    setOrderToCancel(order);
    setCancelDialogOpen(true);
  };

  // Handle cancel order confirm
  const handleCancelConfirm = async () => {
    if (!orderToCancel) return;

    try {
      setCanceling(true);
      await cancelOrder(orderToCancel.orderId);

      toast.success('Emir başarıyla iptal edildi', { position: 'top-right' });

      // Refresh open orders
      await loadOpenOrders();

      setCancelDialogOpen(false);
      setOrderToCancel(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Emir iptal edilemedi';
      toast.error(errorMessage, { position: 'top-right' });
    } finally {
      setCanceling(false);
    }
  };

  // Handle cancel dialog close
  const handleCancelDialogClose = () => {
    if (!canceling) {
      setCancelDialogOpen(false);
      setOrderToCancel(null);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status color
  const getStatusColor = (status: OrderStatus): 'default' | 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case OrderStatus.NEW:
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

  // Get status label
  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.NEW]: 'Yeni',
      [OrderStatus.PARTIALLY_FILLED]: 'Kısmi',
      [OrderStatus.FILLED]: 'Tamamlandı',
      [OrderStatus.CANCELED]: 'İptal',
      [OrderStatus.PENDING_CANCEL]: 'İptal Ediliyor',
      [OrderStatus.REJECTED]: 'Reddedildi',
      [OrderStatus.EXPIRED]: 'Süresi Doldu',
    };
    return labels[status] || status;
  };

  // Render order rows
  const renderOrderRow = (order: Order, showCancel: boolean = false) => {
    const [baseCurrency, quoteCurrency] = order.symbol.split('_');
    const filledPercent = (parseFloat(order.executedQty) / parseFloat(order.quantity)) * 100;

    return (
      <TableRow key={order.orderId} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
        <TableCell>
          <Typography variant="body2" fontSize="0.75rem">
            {formatTime(order.createdAt)}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={order.side === OrderSide.BUY ? 'Alış' : 'Satış'}
            color={order.side === OrderSide.BUY ? 'success' : 'error'}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2">{order.symbol.replace('_', '/')}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{order.type}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">
            {order.price !== '0' ? parseFloat(order.price).toLocaleString('tr-TR') : 'Market'}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{parseFloat(order.quantity).toFixed(6)}</Typography>
          {showCancel && filledPercent > 0 && filledPercent < 100 && (
            <Typography variant="caption" color="text.secondary">
              ({filledPercent.toFixed(1)}% tamamlandı)
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Chip label={getStatusLabel(order.status)} color={getStatusColor(order.status)} size="small" />
        </TableCell>
        {showCancel && (
          <TableCell align="right">
            {(order.status === OrderStatus.NEW || order.status === OrderStatus.PARTIALLY_FILLED) && (
              <Tooltip title="Emri İptal Et">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleCancelClick(order)}
                  disabled={canceling}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label={`Açık Emirler (${openOrders.length})`} value="open" />
          <Tab label="Emir Geçmişi" value="history" />
        </Tabs>

        <Tooltip title="Yenile">
          <IconButton
            onClick={() => (activeTab === 'open' ? loadOpenOrders() : loadOrderHistory())}
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Orders table */}
      <TableContainer sx={{ maxHeight: 400 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Tarih</TableCell>
                <TableCell>Yön</TableCell>
                <TableCell>Sembol</TableCell>
                <TableCell>Tip</TableCell>
                <TableCell align="right">Fiyat</TableCell>
                <TableCell align="right">Miktar</TableCell>
                <TableCell>Durum</TableCell>
                {activeTab === 'open' && <TableCell align="right">İşlem</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {activeTab === 'open' ? (
                openOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        Açık emir bulunmuyor
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  openOrders.map((order) => renderOrderRow(order, true))
                )
              ) : orderHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      Emir geçmişi bulunmuyor
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orderHistory.map((order) => renderOrderRow(order, false))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialogOpen} onClose={handleCancelDialogClose}>
        <DialogTitle>Emri İptal Et</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu emri iptal etmek istediğinizden emin misiniz?
            {orderToCancel && (
              <>
                <br />
                <br />
                <strong>Emir Detayları:</strong>
                <br />
                {orderToCancel.side === OrderSide.BUY ? 'Alış' : 'Satış'} -{' '}
                {orderToCancel.symbol.replace('_', '/')}
                <br />
                Miktar: {parseFloat(orderToCancel.quantity).toFixed(6)}
                <br />
                Fiyat:{' '}
                {orderToCancel.price !== '0'
                  ? parseFloat(orderToCancel.price).toLocaleString('tr-TR')
                  : 'Market'}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialogClose} disabled={canceling}>
            Vazgeç
          </Button>
          <Button
            onClick={handleCancelConfirm}
            color="error"
            variant="contained"
            disabled={canceling}
            autoFocus
          >
            {canceling ? <CircularProgress size={20} /> : 'İptal Et'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default OrderStatusPanel;
