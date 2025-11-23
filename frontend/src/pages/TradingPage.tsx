/**
 * Trading Page - Main trading interface
 * Layout: OrderBook (left) | Chart/Ticker (center) | Order Form (right)
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setSelectedSymbol,
  setOrderBook,
  setTicker,
  setRecentTrades,
  addTrade,
  updateOrderBook,
  setLoading,
  setError,
  setAggregateLevel,
  setWsConnected,
  selectSelectedSymbol,
  selectOrderBook,
  selectTicker,
  selectTradingLoading,
  selectTradingError,
  selectAggregateLevel,
  selectWsConnected,
} from '../store/slices/tradingSlice';
import {
  TradingPair,
  TRADING_PAIRS,
  AggregateLevel,
  WebSocketMessageType,
} from '../types/trading.types';
import { getOrderBook, getTicker, getRecentTrades } from '../api/tradingApi';
import websocketService from '../services/websocket.service';
import OrderBookComponent from '../components/Trading/OrderBook/OrderBookComponent';

const TradingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const selectedSymbol = useAppSelector(selectSelectedSymbol);
  const orderBook = useAppSelector(selectOrderBook);
  const ticker = useAppSelector(selectTicker);
  const loading = useAppSelector(selectTradingLoading);
  const error = useAppSelector(selectTradingError);
  const aggregateLevel = useAppSelector(selectAggregateLevel);
  const wsConnected = useAppSelector(selectWsConnected);

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch(setLoading(true));

        // Load order book, ticker, and recent trades in parallel
        const [orderBookData, tickerData, tradesData] = await Promise.all([
          getOrderBook(selectedSymbol, 30),
          getTicker(selectedSymbol),
          getRecentTrades(selectedSymbol, 50),
        ]);

        dispatch(
          setOrderBook({
            bids: orderBookData.bids,
            asks: orderBookData.asks,
            lastUpdateId: orderBookData.lastUpdateId,
          })
        );
        dispatch(setTicker(tickerData));
        dispatch(setRecentTrades(tradesData));
        setInitialLoadComplete(true);
      } catch (err) {
        dispatch(setError(err instanceof Error ? err.message : 'Veri yüklenirken bir hata oluştu'));
      }
    };

    loadInitialData();
  }, [selectedSymbol, dispatch]);

  // Setup WebSocket connection
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        // Connect to WebSocket
        const token = localStorage.getItem('accessToken');
        await websocketService.connect(token || undefined);
        dispatch(setWsConnected(true));

        // Subscribe to order book updates
        websocketService.subscribeToOrderBook(selectedSymbol, (message) => {
          if (message.type === WebSocketMessageType.ORDER_BOOK_SNAPSHOT) {
            dispatch(
              setOrderBook({
                bids: message.data.bids,
                asks: message.data.asks,
                lastUpdateId: message.data.lastUpdateId,
              })
            );
          } else if (message.type === WebSocketMessageType.ORDER_BOOK_UPDATE) {
            dispatch(
              updateOrderBook({
                bids: message.data.bids,
                asks: message.data.asks,
                lastUpdateId: message.data.lastUpdateId,
              })
            );
          }
        });

        // Subscribe to ticker updates
        websocketService.subscribeToTicker(selectedSymbol, (message) => {
          if (message.type === WebSocketMessageType.TICKER_UPDATE) {
            dispatch(setTicker(message.data));
          }
        });

        // Subscribe to trade updates
        websocketService.subscribeToTrades(selectedSymbol, (message) => {
          if (message.type === WebSocketMessageType.TRADE_EXECUTED) {
            dispatch(addTrade(message.data));
          }
        });
      } catch (err) {
        console.error('WebSocket connection failed:', err);
        dispatch(setWsConnected(false));
      }
    };

    if (initialLoadComplete) {
      setupWebSocket();
    }

    // Cleanup on unmount or symbol change
    return () => {
      if (websocketService.isConnected()) {
        websocketService.unsubscribe(`orderbook:${selectedSymbol}`);
        websocketService.unsubscribe(`ticker:${selectedSymbol}`);
        websocketService.unsubscribe(`trades:${selectedSymbol}`);
      }
    };
  }, [selectedSymbol, initialLoadComplete, dispatch]);

  // Handle symbol change
  const handleSymbolChange = (event: SelectChangeEvent<TradingPair>) => {
    const newSymbol = event.target.value as TradingPair;
    dispatch(setSelectedSymbol(newSymbol));
    setInitialLoadComplete(false);
  };

  // Handle aggregate level change
  const handleAggregateChange = (level: AggregateLevel) => {
    dispatch(setAggregateLevel(level));
  };

  // Format price change
  const formatPriceChange = (change: string): string => {
    const num = parseFloat(change);
    return num >= 0 ? `+${change}` : change;
  };

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Spot İşlem
              </Typography>

              {/* Symbol selector */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="symbol-select-label">İşlem Çifti</InputLabel>
                <Select
                  labelId="symbol-select-label"
                  id="symbol-select"
                  value={selectedSymbol}
                  label="İşlem Çifti"
                  onChange={handleSymbolChange}
                >
                  {TRADING_PAIRS.map((pair) => (
                    <MenuItem key={pair} value={pair}>
                      {pair.replace('_', ' / ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* WebSocket status */}
              <Chip
                label={wsConnected ? 'Bağlı' : 'Bağlantı Yok'}
                color={wsConnected ? 'success' : 'default'}
                size="small"
                sx={{ fontSize: '0.75rem' }}
              />
            </Box>
          </Grid>

          {/* Ticker summary */}
          <Grid item xs={12} md={6}>
            {ticker && (
              <Box display="flex" gap={3} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Son Fiyat
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color:
                        parseFloat(ticker.priceChange) >= 0
                          ? 'success.main'
                          : 'error.main',
                      fontWeight: 600,
                    }}
                  >
                    {parseFloat(ticker.lastPrice).toLocaleString('tr-TR')} TRY
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    24s Değişim
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color:
                        parseFloat(ticker.priceChange) >= 0
                          ? 'success.main'
                          : 'error.main',
                      fontWeight: 600,
                    }}
                  >
                    {formatPriceChange(ticker.priceChange)} ({ticker.priceChangePercent}%)
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    24s Hacim
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {parseFloat(ticker.volume).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main trading layout */}
      <Grid container spacing={2}>
        {/* Left: Order Book */}
        <Grid item xs={12} lg={4}>
          <OrderBookComponent
            bids={orderBook.bids}
            asks={orderBook.asks}
            spread={orderBook.spread}
            spreadPercent={orderBook.spreadPercent}
            symbol={selectedSymbol}
            loading={loading && !initialLoadComplete}
            error={error}
            aggregateLevel={aggregateLevel}
            onAggregateChange={handleAggregateChange}
          />
        </Grid>

        {/* Center: Chart & Recent Trades (Placeholder) */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              minHeight: 600,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Fiyat Grafiği
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Çok yakında...
            </Typography>
            <CircularProgress sx={{ mt: 2 }} />
          </Paper>
        </Grid>

        {/* Right: Order Form (Placeholder) */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              minHeight: 600,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Emir Formu
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Çok yakında...
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
              Limit / Market / Stop emirleri
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Bottom: Open Orders & Trade History (Placeholder) */}
      <Box sx={{ mt: 3 }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Açık Emirler & İşlem Geçmişi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Çok yakında...
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default TradingPage;
