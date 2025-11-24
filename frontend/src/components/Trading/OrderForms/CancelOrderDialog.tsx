/**
 * Cancel Order Dialog Component
 * Displays order details and confirms cancellation
 * Features:
 * - Shows comprehensive order information
 * - Confirmation with warning message
 * - Loading state during cancellation
 * - Error handling with retry option
 * - Accessible with keyboard navigation
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Box,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Order, OrderSide, OrderType } from '../../../types/trading.types';

export interface CancelOrderDialogProps {
  open: boolean;
  order: Order | null;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const CancelOrderDialog: React.FC<CancelOrderDialogProps> = ({
  open,
  order,
  loading,
  error,
  onConfirm,
  onCancel,
}) => {
  // Hooks must be called unconditionally
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Don't show dialog if order is null
  if (!order) {
    return null;
  }

  // Calculate order details
  const [baseCurrency, quoteCurrency] = order.symbol.split('_');
  const totalAmount = parseFloat(order.quantity);
  const filledAmount = parseFloat(order.executedQty);
  const remainingAmount = totalAmount - filledAmount;
  const fillPercentage = totalAmount > 0 ? (filledAmount / totalAmount) * 100 : 0;

  // Format price
  const formatPrice = (price: string): string => {
    if (price === '0' || !price) {
      return '-';
    }
    return parseFloat(price).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  // Format amount
  const formatAmount = (amount: number, currency: string): string => {
    return `${amount.toFixed(8)} ${currency}`;
  };

  // Get side label and color
  const getSideLabel = (side: OrderSide): string => {
    return side === OrderSide.BUY ? 'Alış' : 'Satış';
  };

  const getSideColor = (side: OrderSide): 'success' | 'error' => {
    return side === OrderSide.BUY ? 'success' : 'error';
  };

  // Get type label
  const getTypeLabel = (type: OrderType): string => {
    switch (type) {
      case OrderType.MARKET:
        return 'Market';
      case OrderType.LIMIT:
        return 'Limit';
      case OrderType.STOP_LOSS:
        return 'Stop Loss';
      case OrderType.STOP_LOSS_LIMIT:
        return 'Stop Loss Limit';
      case OrderType.TAKE_PROFIT:
        return 'Take Profit';
      case OrderType.TAKE_PROFIT_LIMIT:
        return 'Take Profit Limit';
      default:
        return type;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby="cancel-order-dialog-title"
      aria-describedby="cancel-order-dialog-description"
    >
      <DialogTitle id="cancel-order-dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          <WarningAmberIcon color="warning" />
          <Typography variant="h6" component="span">
            Siparişi İptal Etmek Üzeresiniz
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Error display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Warning message */}
        <Alert severity="warning" sx={{ mb: 2 }}>
          Bu işlem geri alınamaz. Sipariş iptal edildikten sonra kilitli bakiyeniz hesabınıza iade edilecektir.
        </Alert>

        {/* Order details */}
        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
          Sipariş Detayları:
        </Typography>

        <Table size="small" sx={{ mb: 2 }}>
          <TableBody>
            {/* Symbol */}
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 600, width: '40%' }}>
                Sembol
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {order.symbol.replace('_', '/')}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Side */}
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                Taraf
              </TableCell>
              <TableCell>
                <Chip
                  label={getSideLabel(order.side)}
                  color={getSideColor(order.side)}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </TableCell>
            </TableRow>

            {/* Type */}
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                Tür
              </TableCell>
              <TableCell>
                <Typography variant="body2">{getTypeLabel(order.type)}</Typography>
              </TableCell>
            </TableRow>

            {/* Price */}
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                Fiyat
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatPrice(order.price)}
                  {order.price !== '0' && ` ${quoteCurrency}`}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Amount */}
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                Miktar
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatAmount(totalAmount, baseCurrency)}</Typography>
              </TableCell>
            </TableRow>

            {/* Filled */}
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                Doldurulmuş
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatAmount(filledAmount, baseCurrency)}
                  {fillPercentage > 0 && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ({fillPercentage.toFixed(1)}%)
                    </Typography>
                  )}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Remaining */}
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                Kalan (İptal Edilecek)
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={600} color="error.main">
                  {formatAmount(remainingAmount, baseCurrency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Total Value */}
            {order.price !== '0' && (
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                  İptal Edilen Toplam Değer
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {(remainingAmount * parseFloat(order.price)).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {quoteCurrency}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {/* Order ID */}
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                Sipariş ID
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {order.orderId}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Confirmation text */}
        <Typography
          id="cancel-order-dialog-description"
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mt: 2 }}
        >
          Bu siparişi iptal etmek istediğinizden emin misiniz?
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onCancel}
          disabled={loading}
          variant="outlined"
          fullWidth={isMobile}
          sx={{ textTransform: 'none' }}
        >
          Vazgeç
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color="error"
          fullWidth={isMobile}
          autoFocus
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ textTransform: 'none' }}
        >
          {loading ? 'İptal Ediliyor...' : 'İptal Et'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelOrderDialog;
