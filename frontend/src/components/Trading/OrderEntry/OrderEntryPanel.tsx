/**
 * Order Entry Panel - Form for placing market and limit orders
 * Features: Buy/Sell tabs, order type selection, quantity/price inputs, validation
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  SelectChangeEvent,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../store';
import { selectTicker, selectSelectedSymbol } from '../../../store/slices/tradingSlice';
import { placeOrder } from '../../../api/tradingApi';
import {
  OrderType,
  OrderSide,
  TimeInForce,
  OrderRequest,
} from '../../../types/trading.types';
import { toast } from 'react-toastify';

interface OrderEntryPanelProps {
  onOrderPlaced?: () => void;
}

const OrderEntryPanel: React.FC<OrderEntryPanelProps> = ({ onOrderPlaced }) => {
  const dispatch = useAppDispatch();
  const ticker = useAppSelector(selectTicker);
  const selectedSymbol = useAppSelector(selectSelectedSymbol);

  // Order form state
  const [side, setSide] = useState<OrderSide>(OrderSide.BUY);
  const [orderType, setOrderType] = useState<OrderType>(OrderType.LIMIT);
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>(TimeInForce.GTC);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill price from ticker for limit orders
  useEffect(() => {
    if (orderType === OrderType.LIMIT && ticker && !price) {
      setPrice(ticker.lastPrice);
    }
  }, [orderType, ticker, price]);

  // Reset form when symbol changes
  useEffect(() => {
    setQuantity('');
    setPrice('');
    setStopPrice('');
    setError(null);
  }, [selectedSymbol]);

  // Handle side tab change
  const handleSideChange = (event: React.SyntheticEvent, newSide: OrderSide) => {
    setSide(newSide);
    setError(null);
  };

  // Handle order type change
  const handleOrderTypeChange = (event: SelectChangeEvent<OrderType>) => {
    const newType = event.target.value as OrderType;
    setOrderType(newType);
    setError(null);

    // Reset fields based on order type
    if (newType === OrderType.MARKET) {
      setPrice('');
      setStopPrice('');
    }
  };

  // Validate form
  const validateForm = (): string | null => {
    // Validate quantity
    const qtyNum = parseFloat(quantity);
    if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
      return 'Geçerli bir miktar giriniz';
    }

    // Validate price for limit orders
    if (orderType === OrderType.LIMIT) {
      const priceNum = parseFloat(price);
      if (!price || isNaN(priceNum) || priceNum <= 0) {
        return 'Geçerli bir fiyat giriniz';
      }
    }

    // Validate stop price for stop orders
    if (orderType === OrderType.STOP_LOSS || orderType === OrderType.STOP_LOSS_LIMIT) {
      const stopPriceNum = parseFloat(stopPrice);
      if (!stopPrice || isNaN(stopPriceNum) || stopPriceNum <= 0) {
        return 'Geçerli bir tetikleme fiyatı giriniz';
      }
    }

    // Validate stop loss limit orders need both price and stop price
    if (orderType === OrderType.STOP_LOSS_LIMIT) {
      const priceNum = parseFloat(price);
      if (!price || isNaN(priceNum) || priceNum <= 0) {
        return 'Stop-Limit emir için fiyat gereklidir';
      }
    }

    return null;
  };

  // Calculate order total
  const calculateTotal = (): string => {
    const qtyNum = parseFloat(quantity);
    const priceNum = orderType === OrderType.MARKET && ticker
      ? parseFloat(ticker.lastPrice)
      : parseFloat(price);

    if (isNaN(qtyNum) || isNaN(priceNum)) {
      return '0.00';
    }

    return (qtyNum * priceNum).toFixed(2);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      // Build order request
      const orderRequest: OrderRequest = {
        symbol: selectedSymbol,
        side,
        type: orderType,
        quantity,
        timeInForce,
      };

      // Add price for limit orders
      if (orderType === OrderType.LIMIT || orderType === OrderType.STOP_LOSS_LIMIT) {
        orderRequest.price = price;
      }

      // Add stop price for stop orders
      if (orderType === OrderType.STOP_LOSS || orderType === OrderType.STOP_LOSS_LIMIT) {
        orderRequest.stopPrice = stopPrice;
      }

      // Place order
      const placedOrder = await placeOrder(orderRequest);

      // Success
      toast.success(
        `${side === OrderSide.BUY ? 'Alış' : 'Satış'} emri başarıyla oluşturuldu`,
        { position: 'top-right' }
      );

      // Reset form
      setQuantity('');
      if (orderType === OrderType.MARKET) {
        setPrice('');
      }
      setStopPrice('');

      // Callback
      if (onOrderPlaced) {
        onOrderPlaced();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Emir oluşturulamadı';
      setError(errorMessage);
      toast.error(errorMessage, { position: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  // Get base and quote currency from symbol
  const [baseCurrency, quoteCurrency] = selectedSymbol.split('_');

  return (
    <Paper elevation={2} sx={{ p: 2, minHeight: 600 }}>
      <Typography variant="h6" gutterBottom>
        Emir Ver
      </Typography>

      {/* Buy/Sell Tabs */}
      <Tabs
        value={side}
        onChange={handleSideChange}
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab
          label="Alış"
          value={OrderSide.BUY}
          sx={{
            color: side === OrderSide.BUY ? 'success.main' : 'text.secondary',
            fontWeight: side === OrderSide.BUY ? 600 : 400,
          }}
        />
        <Tab
          label="Satış"
          value={OrderSide.SELL}
          sx={{
            color: side === OrderSide.SELL ? 'error.main' : 'text.secondary',
            fontWeight: side === OrderSide.SELL ? 600 : 400,
          }}
        />
      </Tabs>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Order form */}
      <Box component="form" onSubmit={handleSubmit}>
        {/* Order type selector */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="order-type-label">Emir Tipi</InputLabel>
          <Select
            labelId="order-type-label"
            id="order-type"
            value={orderType}
            label="Emir Tipi"
            onChange={handleOrderTypeChange}
          >
            <MenuItem value={OrderType.MARKET}>Market</MenuItem>
            <MenuItem value={OrderType.LIMIT}>Limit</MenuItem>
            <MenuItem value={OrderType.STOP_LOSS}>Stop-Loss</MenuItem>
            <MenuItem value={OrderType.STOP_LOSS_LIMIT}>Stop-Loss Limit</MenuItem>
          </Select>
        </FormControl>

        {/* Price input (for limit orders) */}
        {(orderType === OrderType.LIMIT || orderType === OrderType.STOP_LOSS_LIMIT) && (
          <TextField
            fullWidth
            label="Fiyat"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={ticker?.lastPrice || '0.00'}
            InputProps={{
              endAdornment: <InputAdornment position="end">{quoteCurrency}</InputAdornment>,
            }}
            inputProps={{
              step: '0.01',
              min: '0',
            }}
            sx={{ mb: 2 }}
            required
          />
        )}

        {/* Stop price input (for stop orders) */}
        {(orderType === OrderType.STOP_LOSS || orderType === OrderType.STOP_LOSS_LIMIT) && (
          <TextField
            fullWidth
            label="Tetikleme Fiyatı"
            type="number"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder={ticker?.lastPrice || '0.00'}
            InputProps={{
              endAdornment: <InputAdornment position="end">{quoteCurrency}</InputAdornment>,
            }}
            inputProps={{
              step: '0.01',
              min: '0',
            }}
            sx={{ mb: 2 }}
            required
          />
        )}

        {/* Quantity input */}
        <TextField
          fullWidth
          label="Miktar"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0.00"
          InputProps={{
            endAdornment: <InputAdornment position="end">{baseCurrency}</InputAdornment>,
          }}
          inputProps={{
            step: '0.00000001',
            min: '0',
          }}
          sx={{ mb: 2 }}
          required
        />

        {/* Time in force (for limit orders) */}
        {orderType !== OrderType.MARKET && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="time-in-force-label">Geçerlilik</InputLabel>
            <Select
              labelId="time-in-force-label"
              id="time-in-force"
              value={timeInForce}
              label="Geçerlilik"
              onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
            >
              <MenuItem value={TimeInForce.GTC}>GTC (İptal Edilene Kadar)</MenuItem>
              <MenuItem value={TimeInForce.IOC}>IOC (Hemen veya İptal)</MenuItem>
              <MenuItem value={TimeInForce.FOK}>FOK (Tamamı veya İptal)</MenuItem>
            </Select>
          </FormControl>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Order summary */}
        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {orderType === OrderType.MARKET ? 'Tahmini Toplam' : 'Toplam'}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {calculateTotal()} {quoteCurrency}
            </Typography>
          </Box>

          {ticker && orderType === OrderType.MARKET && (
            <Typography variant="caption" color="text.secondary">
              Market emri yaklaşık {ticker.lastPrice} {quoteCurrency} fiyatından işlenecektir
            </Typography>
          )}
        </Box>

        {/* Submit button */}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          sx={{
            backgroundColor: side === OrderSide.BUY ? 'success.main' : 'error.main',
            '&:hover': {
              backgroundColor: side === OrderSide.BUY ? 'success.dark' : 'error.dark',
            },
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            `${side === OrderSide.BUY ? 'Alış' : 'Satış'} Emri Ver`
          )}
        </Button>
      </Box>
    </Paper>
  );
};

export default OrderEntryPanel;
