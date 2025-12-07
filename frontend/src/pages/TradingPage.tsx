/**
 * Trading Page - Figma Design Implementation (Dark Theme)
 * Simplified version that works without backend
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Chip,
  SelectChangeEvent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  Card,
  useTheme,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import Header from '../components/layout/Header';
import { GRADIENTS } from '../theme/figmaTheme';

// Trading pairs
const TRADING_PAIRS = ['BTC_TRY', 'ETH_TRY', 'USDT_TRY'] as const;
type TradingPair = typeof TRADING_PAIRS[number];

// Mock ticker data
const MOCK_TICKERS: Record<TradingPair, { lastPrice: string; priceChange: string; priceChangePercent: string; highPrice: string; lowPrice: string; volume: string }> = {
  BTC_TRY: { lastPrice: '1632450.00', priceChange: '45230.00', priceChangePercent: '2.85', highPrice: '1650000.00', lowPrice: '1580000.00', volume: '125.45' },
  ETH_TRY: { lastPrice: '13200.00', priceChange: '-320.00', priceChangePercent: '-2.37', highPrice: '13800.00', lowPrice: '12900.00', volume: '1240.80' },
  USDT_TRY: { lastPrice: '34.25', priceChange: '0.15', priceChangePercent: '0.44', highPrice: '34.50', lowPrice: '33.90', volume: '15420000.00' },
};

// Mock order book data
const generateOrderBook = (basePrice: number) => {
  const bids = [];
  const asks = [];
  for (let i = 0; i < 10; i++) {
    bids.push({
      price: (basePrice * (1 - 0.001 * (i + 1))).toFixed(2),
      amount: (Math.random() * 2).toFixed(4),
      total: (Math.random() * 50000).toFixed(2),
    });
    asks.push({
      price: (basePrice * (1 + 0.001 * (i + 1))).toFixed(2),
      amount: (Math.random() * 2).toFixed(4),
      total: (Math.random() * 50000).toFixed(2),
    });
  }
  return { bids, asks };
};

// Mock recent trades
const generateRecentTrades = (basePrice: number) => {
  const trades = [];
  for (let i = 0; i < 15; i++) {
    const isBuy = Math.random() > 0.5;
    trades.push({
      id: i,
      price: (basePrice * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2),
      amount: (Math.random() * 0.5).toFixed(4),
      time: new Date(Date.now() - i * 30000).toLocaleTimeString('tr-TR'),
      isBuy,
    });
  }
  return trades;
};

const TradingPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [selectedSymbol, setSelectedSymbol] = useState<TradingPair>('BTC_TRY');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ticker = MOCK_TICKERS[selectedSymbol];
  const basePrice = parseFloat(ticker.lastPrice);
  const [orderBook, setOrderBook] = useState(generateOrderBook(basePrice));
  const [recentTrades, setRecentTrades] = useState(generateRecentTrades(basePrice));

  // Update order book and trades when symbol changes
  useEffect(() => {
    const price = parseFloat(MOCK_TICKERS[selectedSymbol].lastPrice);
    setOrderBook(generateOrderBook(price));
    setRecentTrades(generateRecentTrades(price));
    setPrice(price.toFixed(2));
  }, [selectedSymbol]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      const price = parseFloat(MOCK_TICKERS[selectedSymbol].lastPrice);
      setOrderBook(generateOrderBook(price));
      setRecentTrades(generateRecentTrades(price));
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const handleSymbolChange = (event: SelectChangeEvent<TradingPair>) => {
    setSelectedSymbol(event.target.value as TradingPair);
  };

  const handleOrderTypeChange = (_: React.SyntheticEvent, newValue: 'market' | 'limit') => {
    setOrderType(newValue);
  };

  const handlePlaceOrder = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      setError('Please enter a valid price');
      return;
    }
    setError(null);
    alert(`${side.toUpperCase()} order placed: ${amount} ${selectedSymbol.split('_')[0]} at ${orderType === 'market' ? 'market price' : `₺${price}`}`);
    setAmount('');
  };

  const formatPriceChange = (change: string): string => {
    const num = parseFloat(change);
    return num >= 0 ? `+${change}` : change;
  };

  const priceChangePositive = parseFloat(ticker.priceChange) >= 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />

      <Box sx={{ maxWidth: 1920, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
        {/* Trading Header */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Typography
                  variant="h4"
                  sx={{
                    fontSize: { xs: '24px', sm: '28px' },
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  {selectedSymbol.replace('_', '/')}
                </Typography>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={selectedSymbol}
                    onChange={handleSymbolChange}
                  >
                    {TRADING_PAIRS.map((pair) => (
                      <MenuItem key={pair} value={pair}>
                        {pair.replace('_', ' / ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Chip
                  label={t('trade.demoMode')}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: 'warning.main',
                    border: '1px solid',
                    borderColor: 'warning.main',
                    fontWeight: 500,
                    fontSize: '12px',
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" gap={4} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                    {t('trade.price')}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: priceChangePositive ? 'success.main' : 'error.main',
                    }}
                  >
                    ₺{parseFloat(ticker.lastPrice).toLocaleString('tr-TR')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                    {t('trade.change24h')}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: priceChangePositive ? 'success.main' : 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {priceChangePositive ? <TrendingUpIcon sx={{ fontSize: 18 }} /> : <TrendingDownIcon sx={{ fontSize: 18 }} />}
                    {formatPriceChange(ticker.priceChange)} ({ticker.priceChangePercent}%)
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                    {t('trade.high24h')}
                  </Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'text.primary' }}>
                    ₺{parseFloat(ticker.highPrice).toLocaleString('tr-TR')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                    {t('trade.low24h')}
                  </Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'text.primary' }}>
                    ₺{parseFloat(ticker.lowPrice).toLocaleString('tr-TR')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                    {t('trade.volume24h')}
                  </Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, color: 'text.primary' }}>
                    {parseFloat(ticker.volume).toFixed(2)} {selectedSymbol.split('_')[0]}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Main Trading Layout */}
        <Grid container spacing={2}>
          {/* Order Book */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 2, color: 'text.primary' }}>
                {t('trade.orderBook.title')}
              </Typography>

              {/* Asks (Sell Orders) */}
              <TableContainer sx={{ maxHeight: 250 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1 }}>{t('trade.orderBook.price')} (TRY)</TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>{t('trade.orderBook.amount')}</TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>{t('trade.orderBook.total')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderBook.asks.slice().reverse().map((ask, idx) => (
                      <TableRow key={`ask-${idx}`} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ color: 'error.main', py: 0.5 }}>{parseFloat(ask.price).toLocaleString('tr-TR')}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{ask.amount}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{parseFloat(ask.total).toLocaleString('tr-TR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Spread */}
              <Box sx={{ py: 1.5, textAlign: 'center', borderTop: 1, borderBottom: 1, borderColor: 'divider', my: 1 }}>
                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: priceChangePositive ? 'success.main' : 'error.main' }}>
                  ₺{parseFloat(ticker.lastPrice).toLocaleString('tr-TR')}
                </Typography>
              </Box>

              {/* Bids (Buy Orders) */}
              <TableContainer sx={{ maxHeight: 250 }}>
                <Table size="small">
                  <TableBody>
                    {orderBook.bids.map((bid, idx) => (
                      <TableRow key={`bid-${idx}`} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ color: 'success.main', py: 0.5 }}>{parseFloat(bid.price).toLocaleString('tr-TR')}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{bid.amount}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{parseFloat(bid.total).toLocaleString('tr-TR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Recent Trades */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 2, color: 'text.primary' }}>
                {t('trade.recentTrades.title')}
              </Typography>
              <TableContainer sx={{ maxHeight: 550 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1 }}>{t('trade.recentTrades.price')} (TRY)</TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>{t('trade.recentTrades.amount')}</TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>{t('trade.recentTrades.time')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTrades.map((trade) => (
                      <TableRow key={trade.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ color: trade.isBuy ? 'success.main' : 'error.main', py: 0.5 }}>
                          {parseFloat(trade.price).toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{trade.amount}</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary', py: 0.5 }}>{trade.time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Order Form */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2 }}>
              <Tabs
                value={orderType}
                onChange={handleOrderTypeChange}
                variant="fullWidth"
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label={t('trade.market')} value="market" sx={{ textTransform: 'none', fontWeight: 600 }} />
                <Tab label={t('trade.limit')} value="limit" sx={{ textTransform: 'none', fontWeight: 600 }} />
              </Tabs>

              {/* Buy/Sell Toggle */}
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Button
                  fullWidth
                  variant={side === 'buy' ? 'contained' : 'outlined'}
                  onClick={() => setSide('buy')}
                  sx={{
                    py: 1.5,
                    backgroundColor: side === 'buy' ? 'success.main' : 'transparent',
                    borderColor: 'success.main',
                    color: side === 'buy' ? 'white' : 'success.main',
                    '&:hover': {
                      backgroundColor: side === 'buy' ? 'success.dark' : 'rgba(16, 185, 129, 0.1)',
                      borderColor: 'success.main',
                    },
                  }}
                >
                  {t('trade.buy')}
                </Button>
                <Button
                  fullWidth
                  variant={side === 'sell' ? 'contained' : 'outlined'}
                  onClick={() => setSide('sell')}
                  sx={{
                    py: 1.5,
                    backgroundColor: side === 'sell' ? 'error.main' : 'transparent',
                    borderColor: 'error.main',
                    color: side === 'sell' ? 'white' : 'error.main',
                    '&:hover': {
                      backgroundColor: side === 'sell' ? 'error.dark' : 'rgba(255, 71, 87, 0.1)',
                      borderColor: 'error.main',
                    },
                  }}
                >
                  {t('trade.sell')}
                </Button>
              </Box>

              {/* Price Input (Limit only) */}
              {orderType === 'limit' && (
                <TextField
                  fullWidth
                  label={t('trade.price')}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">TRY</InputAdornment>,
                  }}
                />
              )}

              {/* Amount Input */}
              <TextField
                fullWidth
                label={t('trade.amount')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{selectedSymbol.split('_')[0]}</InputAdornment>,
                }}
              />

              {/* Quick Amount Buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                {['25%', '50%', '75%', '100%'].map((pct) => (
                  <Button
                    key={pct}
                    size="small"
                    variant="outlined"
                    onClick={() => setAmount((parseFloat(pct) / 100 * 0.5).toFixed(4))}
                    sx={{ flex: 1, fontSize: '12px' }}
                  >
                    {pct}
                  </Button>
                ))}
              </Box>

              {/* Order Summary */}
              <Card sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">{t('trade.price')}</Typography>
                  <Typography variant="body2">
                    {orderType === 'market' ? t('trade.marketPrice') : `₺${parseFloat(price || '0').toLocaleString('tr-TR')}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">{t('trade.amount')}</Typography>
                  <Typography variant="body2">{amount || '0'} {selectedSymbol.split('_')[0]}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{t('trade.total')}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ₺{((parseFloat(amount || '0') * parseFloat(orderType === 'market' ? ticker.lastPrice : (price || '0')))).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Card>

              {/* Place Order Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handlePlaceOrder}
                sx={{
                  py: 1.5,
                  background: side === 'buy' ? 'linear-gradient(135deg, #10B981 0%, #069868 100%)' : 'linear-gradient(135deg, #FF4757 0%, #E5303E 100%)',
                  fontWeight: 600,
                  fontSize: '16px',
                  '&:hover': {
                    opacity: 0.9,
                  },
                }}
              >
                {side === 'buy' ? t('trade.buy') : t('trade.sell')} {selectedSymbol.split('_')[0]}
              </Button>
            </Paper>

            {/* Info Card */}
            <Card sx={{ p: 2, mt: 2, background: GRADIENTS.primary }}>
              <Typography sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                {t('trade.demoTrading')}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                {t('trade.demoTradingInfo')}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default TradingPage;
