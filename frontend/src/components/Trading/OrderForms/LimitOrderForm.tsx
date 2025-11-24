/**
 * Limit Order Form - Component for placing limit buy/sell orders with Time-in-Force options
 * Features:
 * - Buy/Sell toggle with color-coded interface
 * - Price input with market price reference
 * - Amount input with currency label
 * - Time-in-Force selector (GTC, IOC, FOK, POST_ONLY)
 * - Auto-calculated total from Price × Amount
 * - Available balance display and validation
 * - Fee calculation (0.1% maker for POST_ONLY, 0.2% taker for others)
 * - Price guidance with suggested prices
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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

interface LimitOrderFormProps {
  onOrderPlaced?: () => void;
}

// Constants
const MAKER_FEE_RATE = 0.001; // 0.1% for POST_ONLY
const TAKER_FEE_RATE = 0.002; // 0.2% for GTC, IOC, FOK
const PRICE_WARNING_THRESHOLD = 0.05; // 5% difference from market

// Time-in-Force options with Turkish labels and descriptions
const TIME_IN_FORCE_OPTIONS = [
  {
    value: TimeInForce.GTC,
    label: 'İptal Edilene Kadar (GTC)',
    shortLabel: 'GTC',
    description: 'Emir iptal edilene veya tamamen gerçekleşene kadar aktif kalır',
    feeRate: TAKER_FEE_RATE,
  },
  {
    value: TimeInForce.IOC,
    label: 'Hemen Veya İptal (IOC)',
    shortLabel: 'IOC',
    description: 'Hemen mevcut miktarı gerçekleştirir, geri kalanı iptal eder',
    feeRate: TAKER_FEE_RATE,
  },
  {
    value: TimeInForce.FOK,
    label: 'Hep Veya Hiç (FOK)',
    shortLabel: 'FOK',
    description: 'Tüm emir hemen gerçekleşmeli, yoksa tamamen iptal edilir',
    feeRate: TAKER_FEE_RATE,
  },
  {
    value: TimeInForce.POST_ONLY,
    label: 'Yalnız Likidite Sağlayıcı',
    shortLabel: 'POST',
    description: 'Asla taker olmaz, yalnızca maker komisyonu (0.1%) öder',
    feeRate: MAKER_FEE_RATE,
  },
];

const LimitOrderForm: React.FC<LimitOrderFormProps> = ({ onOrderPlaced }) => {
  const dispatch = useAppDispatch();
  const ticker = useAppSelector(selectTicker);
  const selectedSymbol = useAppSelector(selectSelectedSymbol);
  const orderBook = useAppSelector(selectOrderBook);
  const walletBalances = useAppSelector(selectWalletBalances);

  // Form state
  const [side, setSide] = useState<OrderSide>(OrderSide.BUY);
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>(TimeInForce.GTC);
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
    setPrice('');
    setAmount('');
    setError(null);
  }, [selectedSymbol]);

  // Get available balance for the relevant currency
  const availableBalance = useMemo(() => {
    const currency = side === OrderSide.BUY ? quoteCurrency : baseCurrency;
    const balance = walletBalances.find((b) => b.currency === currency);
    return balance ? parseFloat(balance.availableBalance) : 0;
  }, [walletBalances, side, baseCurrency, quoteCurrency]);

  // Get market price from order book or ticker
  const marketPrice = useMemo(() => {
    if (side === OrderSide.BUY && orderBook.asks.length > 0) {
      return parseFloat(orderBook.asks[0][0]); // Best ask price
    }
    if (side === OrderSide.SELL && orderBook.bids.length > 0) {
      return parseFloat(orderBook.bids[0][0]); // Best bid price
    }
    // Fallback to ticker price
    return ticker ? parseFloat(ticker.lastPrice) : 0;
  }, [side, orderBook, ticker]);

  // Get current fee rate based on Time-in-Force
  const feeRate = useMemo(() => {
    return timeInForce === TimeInForce.POST_ONLY ? MAKER_FEE_RATE : TAKER_FEE_RATE;
  }, [timeInForce]);

  // Calculate total and fee
  const { total, fee, totalWithFee } = useMemo(() => {
    const priceNum = parseFloat(price) || 0;
    const amountNum = parseFloat(amount) || 0;
    const calculatedTotal = amountNum * priceNum;
    const calculatedFee = calculatedTotal * feeRate;

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
  }, [price, amount, feeRate, side]);

  // Calculate price difference from market
  const priceDiffPercent = useMemo(() => {
    const priceNum = parseFloat(price) || 0;
    if (priceNum === 0 || marketPrice === 0) return 0;
    return ((priceNum - marketPrice) / marketPrice) * 100;
  }, [price, marketPrice]);

  // Generate suggested prices
  const suggestedPrices = useMemo(() => {
    if (!marketPrice) return [];
    return [
      { label: '-1%', value: marketPrice * 0.99 },
      { label: '-0.5%', value: marketPrice * 0.995 },
      { label: 'Market', value: marketPrice },
      { label: '+0.5%', value: marketPrice * 1.005 },
      { label: '+1%', value: marketPrice * 1.01 },
    ];
  }, [marketPrice]);

  // Validation
  const validationError = useMemo(() => {
    const priceNum = parseFloat(price);
    const amountNum = parseFloat(amount);

    if (!price || !amount) {
      return null; // Don't show error for empty fields
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      return 'Geçerli bir fiyat giriniz';
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      return 'Geçerli bir miktar giriniz';
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

    // Warn for very small orders
    if (total < 100) {
      return 'Minimum emir tutarı 100 TRY olmalıdır';
    }

    return null;
  }, [price, amount, side, totalWithFee, availableBalance, baseCurrency, quoteCurrency, total]);

  // Price warning
  const priceWarning = useMemo(() => {
    if (!price || !marketPrice) return null;

    const diffPercent = Math.abs(priceDiffPercent);
    if (diffPercent > PRICE_WARNING_THRESHOLD * 100) {
      if (side === OrderSide.BUY && priceDiffPercent > 0) {
        return `Uyarı: Limit fiyatınız piyasa fiyatından %${diffPercent.toFixed(1)} daha yüksek`;
      }
      if (side === OrderSide.SELL && priceDiffPercent < 0) {
        return `Uyarı: Limit fiyatınız piyasa fiyatından %${diffPercent.toFixed(1)} daha düşük`;
      }
    }
    return null;
  }, [price, marketPrice, priceDiffPercent, side]);

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

  // Handle Time-in-Force change
  const handleTimeInForceChange = (event: SelectChangeEvent<TimeInForce>) => {
    setTimeInForce(event.target.value as TimeInForce);
  };

  // Handle suggested price click
  const handleSuggestedPriceClick = (suggestedPrice: number) => {
    setPrice(suggestedPrice.toFixed(2));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate price
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setError('Geçerli bir fiyat giriniz');
      return;
    }

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
        type: OrderType.LIMIT,
        quantity: amount,
        price,
        timeInForce,
      };

      // Place order
      const placedOrder = await placeOrder(orderRequest);

      // Success notification
      const tifOption = TIME_IN_FORCE_OPTIONS.find((o) => o.value === timeInForce);
      toast.success(
        `Limit ${side === OrderSide.BUY ? 'alış' : 'satış'} emri başarıyla oluşturuldu. Emir ID: ${placedOrder.orderId} - ${tifOption?.shortLabel}`,
        { position: 'top-right', autoClose: 5000 }
      );

      // Reset form
      setPrice('');
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

  // Get selected Time-in-Force option
  const selectedTifOption = TIME_IN_FORCE_OPTIONS.find((o) => o.value === timeInForce);

  return (
    <>
      <Paper elevation={2} sx={{ p: 2, minHeight: 400 }}>
        <Typography variant="h6" gutterBottom>
          Limit Emir
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

        {/* Price warning */}
        {priceWarning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {priceWarning}
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

          {/* Market Price Reference */}
          {marketPrice > 0 && (
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="caption" color="text.secondary">
                Mevcut Piyasa Fiyatı
              </Typography>
              <Typography variant="body2" fontWeight={600} color="primary">
                {marketPrice.toFixed(2)} {quoteCurrency}
              </Typography>
            </Box>
          )}

          {/* Price Input */}
          <TextField
            fullWidth
            label={`Limit Fiyatı (${quoteCurrency})`}
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{quoteCurrency}</InputAdornment>
              ),
            }}
            inputProps={{
              step: '0.01',
              min: '0',
            }}
            sx={{ mb: 1 }}
            required
          />

          {/* Suggested Prices */}
          {marketPrice > 0 && (
            <Box sx={{ mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {suggestedPrices.map((sp) => (
                <Chip
                  key={sp.label}
                  label={`${sp.label}: ${sp.value.toFixed(2)}`}
                  size="small"
                  onClick={() => handleSuggestedPriceClick(sp.value)}
                  sx={{
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'white',
                    },
                  }}
                />
              ))}
            </Box>
          )}

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

          {/* Time-in-Force Selector */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="time-in-force-label">Sipariş Geçerliliği</InputLabel>
            <Select
              labelId="time-in-force-label"
              id="time-in-force-select"
              value={timeInForce}
              label="Sipariş Geçerliliği"
              onChange={handleTimeInForceChange}
            >
              {TIME_IN_FORCE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">{option.label}</Typography>
                      {option.value === TimeInForce.POST_ONLY && (
                        <Chip
                          label="0.1% ücret"
                          size="small"
                          color="success"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Time-in-Force Info */}
          {selectedTifOption && (
            <Alert
              severity="info"
              icon={<InfoOutlinedIcon fontSize="small" />}
              sx={{ mb: 2, py: 0.5 }}
            >
              <Typography variant="caption">
                {selectedTifOption.description}
                {' - '}
                İşlem ücreti: {(selectedTifOption.feeRate * 100).toFixed(1)}%
              </Typography>
            </Alert>
          )}

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
                İşlem Ücreti ({(feeRate * 100).toFixed(1)}%)
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
            disabled={loading || !price || !amount || !!validationError}
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
              'Limit Satın Al'
            ) : (
              'Limit Sat'
            )}
          </Button>
        </Box>

        {/* Limit order info */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 2, display: 'block' }}
        >
          Limit emirler belirlediğiniz fiyattan veya daha iyisinden işlenir.
          Emir gerçekleşene veya iptal edilene kadar beklemede kalır.
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
          Limit {side === OrderSide.BUY ? 'Alış' : 'Satış'} Emrini Onayla
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Aşağıdaki limit emrini onaylıyor musunuz?
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
                    {side === OrderSide.BUY ? 'LIMIT ALIŞ' : 'LIMIT SATIŞ'}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    Limit Fiyatı
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {parseFloat(price).toFixed(2)} {quoteCurrency}
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
                    Sipariş Geçerliliği
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {selectedTifOption?.shortLabel}
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
                    İşlem Ücreti ({(feeRate * 100).toFixed(1)}%)
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
            {timeInForce === TimeInForce.POST_ONLY
              ? 'POST_ONLY emriniz asla taker olmayacak ve 0.1% maker ücreti ödeyeceksiniz.'
              : timeInForce === TimeInForce.GTC
              ? 'GTC emriniz iptal edilene veya tamamen gerçekleşene kadar aktif kalacaktır.'
              : timeInForce === TimeInForce.IOC
              ? 'IOC emriniz hemen mevcut miktarı gerçekleştirecek, geri kalanı iptal edilecektir.'
              : 'FOK emriniz tamamı hemen gerçekleşmezse tamamen iptal edilecektir.'}
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

export default LimitOrderForm;
