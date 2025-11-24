/**
 * Market Order Form - Component for placing market buy/sell orders
 * Features:
 * - Buy/Sell toggle with color-coded interface
 * - Amount input with currency label
 * - Auto-calculated total from order book best prices
 * - Available balance display and validation
 * - Fee calculation (0.2% taker fee)
 * - Confirmation dialog before submission
 * - Success/error notifications
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  selectTicker,
  selectSelectedSymbol,
  selectOrderBook,
} from '../../../store/slices/tradingSlice';
import {
  selectWalletBalances,
  fetchWalletBalances,
} from '../../../store/slices/walletSlice';
import { placeOrder } from '../../../api/tradingApi';
import {
  OrderType,
  OrderSide,
  TimeInForce,
  OrderRequest,
} from '../../../types/trading.types';
import { Currency } from '../../../types/wallet.types';
import { toast } from 'react-toastify';

interface MarketOrderFormProps {
  onOrderPlaced?: () => void;
}

// Constants
const TAKER_FEE_RATE = 0.002; // 0.2%

const MarketOrderForm: React.FC<MarketOrderFormProps> = ({ onOrderPlaced }) => {
  const dispatch = useAppDispatch();
  const ticker = useAppSelector(selectTicker);
  const selectedSymbol = useAppSelector(selectSelectedSymbol);
  const orderBook = useAppSelector(selectOrderBook);
  const walletBalances = useAppSelector(selectWalletBalances);

  // Form state
  const [side, setSide] = useState<OrderSide>(OrderSide.BUY);
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Parse symbol to get base and quote currencies
  const [baseCurrency, quoteCurrency] = useMemo(() => {
    const [base, quote] = selectedSymbol.split('_');
    return [base as Currency, quote as Currency];
  }, [selectedSymbol]);

  // Load wallet balances on mount
  useEffect(() => {
    dispatch(fetchWalletBalances());
  }, [dispatch]);

  // Reset form when symbol changes
  useEffect(() => {
    setAmount('');
    setError(null);
  }, [selectedSymbol]);

  // Get available balance for the relevant currency
  const availableBalance = useMemo(() => {
    const currency = side === OrderSide.BUY ? quoteCurrency : baseCurrency;
    const balance = walletBalances.find((b) => b.currency === currency);
    return balance ? parseFloat(balance.availableBalance) : 0;
  }, [walletBalances, side, baseCurrency, quoteCurrency]);

  // Get best price from order book
  const bestPrice = useMemo(() => {
    if (side === OrderSide.BUY && orderBook.asks.length > 0) {
      return parseFloat(orderBook.asks[0][0]); // Best ask price
    }
    if (side === OrderSide.SELL && orderBook.bids.length > 0) {
      return parseFloat(orderBook.bids[0][0]); // Best bid price
    }
    // Fallback to ticker price
    return ticker ? parseFloat(ticker.lastPrice) : 0;
  }, [side, orderBook, ticker]);

  // Calculate total and fee
  const { total, fee, totalWithFee } = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    const calculatedTotal = amountNum * bestPrice;
    const calculatedFee = calculatedTotal * TAKER_FEE_RATE;

    if (side === OrderSide.BUY) {
      // For BUY: User pays total + fee in TRY
      return {
        total: calculatedTotal,
        fee: calculatedFee,
        totalWithFee: calculatedTotal + calculatedFee,
      };
    } else {
      // For SELL: User receives total - fee in TRY
      return {
        total: calculatedTotal,
        fee: calculatedFee,
        totalWithFee: calculatedTotal - calculatedFee,
      };
    }
  }, [amount, bestPrice, side]);

  // Validation
  const validationError = useMemo(() => {
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return null; // Don't show error for empty field
    }

    if (side === OrderSide.BUY) {
      // Check if user has enough TRY (including fees)
      if (totalWithFee > availableBalance) {
        const shortfall = totalWithFee - availableBalance;
        return `Yetersiz bakiye. ${shortfall.toFixed(2)} ${quoteCurrency} eksik.`;
      }
    } else {
      // Check if user has enough of base currency
      if (amountNum > availableBalance) {
        const shortfall = amountNum - availableBalance;
        return `Yetersiz bakiye. ${shortfall.toFixed(8)} ${baseCurrency} eksik.`;
      }
    }

    return null;
  }, [amount, side, totalWithFee, availableBalance, baseCurrency, quoteCurrency]);

  // Handle side change
  const handleSideChange = (
    event: React.MouseEvent<HTMLElement>,
    newSide: OrderSide | null
  ) => {
    if (newSide !== null) {
      setSide(newSide);
      setError(null);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Geçerli bir miktar giriniz');
      return;
    }

    // Check validation errors
    if (validationError) {
      setError(validationError);
      return;
    }

    // Open confirmation dialog
    setConfirmDialogOpen(true);
  };

  // Handle confirmed order placement
  const handleConfirmOrder = async () => {
    setConfirmDialogOpen(false);
    setLoading(true);
    setError(null);

    try {
      // Build order request
      const orderRequest: OrderRequest = {
        symbol: selectedSymbol,
        side,
        type: OrderType.MARKET,
        quantity: amount,
        timeInForce: TimeInForce.IOC, // Immediate-or-cancel for market orders
      };

      // Place order
      const placedOrder = await placeOrder(orderRequest);

      // Success notification
      toast.success(
        `${side === OrderSide.BUY ? 'Alış' : 'Satış'} emri başarıyla oluşturuldu. Emir ID: ${placedOrder.orderId}`,
        { position: 'top-right', autoClose: 5000 }
      );

      // Reset form
      setAmount('');

      // Refresh wallet balances
      dispatch(fetchWalletBalances());

      // Callback
      if (onOrderPlaced) {
        onOrderPlaced();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Emir oluşturulamadı';
      setError(errorMessage);
      toast.error(errorMessage, { position: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel confirmation
  const handleCancelConfirm = () => {
    setConfirmDialogOpen(false);
  };

  // Format balance display
  const formatBalance = (value: number, currency: Currency): string => {
    if (currency === quoteCurrency) {
      return value.toFixed(2);
    }
    return value.toFixed(8);
  };

  return (
    <>
      <Paper elevation={2} sx={{ p: 2, minHeight: 400 }}>
        <Typography variant="h6" gutterBottom>
          Market Emir
        </Typography>

        {/* Buy/Sell Toggle */}
        <ToggleButtonGroup
          value={side}
          exclusive
          onChange={handleSideChange}
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton
            value={OrderSide.BUY}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'success.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'success.dark',
                },
              },
            }}
          >
            Alış
          </ToggleButton>
          <ToggleButton
            value={OrderSide.SELL}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'error.main',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'error.dark',
                },
              },
            }}
          >
            Satış
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Error display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Order form */}
        <Box component="form" onSubmit={handleSubmit}>
          {/* Available Balance */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="caption" color="text.secondary">
              Kullanılabilir Bakiye
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatBalance(
                availableBalance,
                side === OrderSide.BUY ? quoteCurrency : baseCurrency
              )}{' '}
              {side === OrderSide.BUY ? quoteCurrency : baseCurrency}
            </Typography>
          </Box>

          {/* Amount Input */}
          <TextField
            fullWidth
            label={`Miktar (${baseCurrency})`}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00000000"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{baseCurrency}</InputAdornment>
              ),
            }}
            inputProps={{
              step: '0.00000001',
              min: '0',
            }}
            sx={{ mb: 2 }}
            required
            error={!!validationError}
            helperText={validationError || ' '}
          />

          {/* Price Preview */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="caption" color="text.secondary">
              Tahmini Fiyat
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {bestPrice.toFixed(2)} {quoteCurrency}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Order Summary */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Emir Özeti
            </Typography>

            <Box
              display="flex"
              justifyContent="space-between"
              sx={{ mb: 0.5 }}
            >
              <Typography variant="body2" color="text.secondary">
                Toplam
              </Typography>
              <Typography variant="body2">
                {total.toFixed(2)} {quoteCurrency}
              </Typography>
            </Box>

            <Box
              display="flex"
              justifyContent="space-between"
              sx={{ mb: 0.5 }}
            >
              <Typography variant="body2" color="text.secondary">
                İşlem Ücreti (0.2%)
              </Typography>
              <Typography variant="body2">
                {side === OrderSide.BUY ? '+' : '-'} {fee.toFixed(2)}{' '}
                {quoteCurrency}
              </Typography>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" fontWeight={600}>
                {side === OrderSide.BUY ? 'Ödenecek Tutar' : 'Alınacak Tutar'}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {totalWithFee.toFixed(2)} {quoteCurrency}
              </Typography>
            </Box>
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || !amount || !!validationError}
            sx={{
              backgroundColor:
                side === OrderSide.BUY ? 'success.main' : 'error.main',
              '&:hover': {
                backgroundColor:
                  side === OrderSide.BUY ? 'success.dark' : 'error.dark',
              },
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : side === OrderSide.BUY ? (
              'Satın Al'
            ) : (
              'Sat'
            )}
          </Button>
        </Box>

        {/* Market order info */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 2, display: 'block' }}
        >
          Market emirler mevcut en iyi fiyattan anında işlenir. Fiyat değişkenlik
          gösterebilir.
        </Typography>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelConfirm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {side === OrderSide.BUY ? 'Alış' : 'Satış'} Emrini Onayla
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Aşağıdaki market emrini onaylıyor musunuz?
          </Typography>

          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    İşlem Çifti
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {selectedSymbol.replace('_', ' / ')}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    Tür
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        side === OrderSide.BUY ? 'success.main' : 'error.main',
                      fontWeight: 600,
                    }}
                  >
                    {side === OrderSide.BUY ? 'ALIŞ' : 'SATIŞ'}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    Miktar
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {amount} {baseCurrency}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    Tahmini Fiyat
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {bestPrice.toFixed(2)} {quoteCurrency}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    Toplam
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {total.toFixed(2)} {quoteCurrency}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    İşlem Ücreti (0.2%)
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {fee.toFixed(2)} {quoteCurrency}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>
                    {side === OrderSide.BUY
                      ? 'Ödenecek Tutar'
                      : 'Alınacak Tutar'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>
                    {totalWithFee.toFixed(2)} {quoteCurrency}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Alert severity="info" sx={{ mt: 2 }}>
            Market emirler mevcut en iyi fiyattan anında işlenir. Gerçek işlem
            fiyatı gösterilen fiyattan farklı olabilir.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm} color="inherit">
            İptal
          </Button>
          <Button
            onClick={handleConfirmOrder}
            variant="contained"
            sx={{
              backgroundColor:
                side === OrderSide.BUY ? 'success.main' : 'error.main',
              '&:hover': {
                backgroundColor:
                  side === OrderSide.BUY ? 'success.dark' : 'error.dark',
              },
            }}
          >
            Onayla
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MarketOrderForm;
