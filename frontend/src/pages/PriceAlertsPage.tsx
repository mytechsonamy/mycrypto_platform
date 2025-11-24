/**
 * Price Alerts Page - Manage cryptocurrency price alerts
 * User can create, view, edit, and delete price alerts
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  triggerAlert,
  clearTriggeredHistory,
  selectAlerts,
  selectActiveAlerts,
  selectTriggeredAlerts,
  selectAlertsLoading,
  selectAlertsError,
  selectActiveAlertsCount,
  clearError,
} from '../store/slices/alertsSlice';
import {
  selectTicker,
  setSelectedSymbol,
} from '../store/slices/tradingSlice';
import {
  CreateAlertRequest,
  AlertFormData,
  MAX_ACTIVE_ALERTS,
  MAX_PRICE_DEVIATION_PERCENT,
  AlertCondition,
  TriggeredAlert,
} from '../types/alerts.types';
import { getTicker } from '../api/tradingApi';
import { TRADING_PAIRS } from '../types/trading.types';
import CreateAlertForm from '../components/Alerts/CreateAlertForm';
import AlertsList from '../components/Alerts/AlertsList';
import AlertHistory from '../components/Alerts/AlertHistory';

const PriceAlertsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const alerts = useAppSelector(selectAlerts);
  const activeAlerts = useAppSelector(selectActiveAlerts);
  const triggeredAlerts = useAppSelector(selectTriggeredAlerts);
  const loading = useAppSelector(selectAlertsLoading);
  const error = useAppSelector(selectAlertsError);
  const activeAlertsCount = useAppSelector(selectActiveAlertsCount);
  const ticker = useAppSelector(selectTicker);

  const [currentPrices, setCurrentPrices] = useState<{ [symbol: string]: number }>({});
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load alerts from local storage
        dispatch(fetchAlerts());

        // Load current prices for all trading pairs
        const pricesPromises = TRADING_PAIRS.map(async (symbol) => {
          try {
            const tickerData = await getTicker(symbol);
            return { symbol, price: parseFloat(tickerData.lastPrice) };
          } catch (err) {
            console.error(`Failed to load price for ${symbol}:`, err);
            return { symbol, price: 0 };
          }
        });

        const prices = await Promise.all(pricesPromises);
        const pricesMap = prices.reduce((acc, { symbol, price }) => {
          acc[symbol] = price;
          return acc;
        }, {} as { [symbol: string]: number });

        setCurrentPrices(pricesMap);
        setInitialLoadComplete(true);
      } catch (err) {
        console.error('Failed to load initial data:', err);
        toast.error('Veri yüklenirken hata oluştu');
      }
    };

    loadInitialData();
  }, [dispatch]);

  // Periodically update prices (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const pricesPromises = TRADING_PAIRS.map(async (symbol) => {
          try {
            const tickerData = await getTicker(symbol);
            return { symbol, price: parseFloat(tickerData.lastPrice) };
          } catch (err) {
            return null;
          }
        });

        const prices = await Promise.all(pricesPromises);
        const validPrices = prices.filter((p) => p !== null) as Array<{
          symbol: string;
          price: number;
        }>;

        const pricesMap = validPrices.reduce((acc, { symbol, price }) => {
          acc[symbol] = price;
          return acc;
        }, {} as { [symbol: string]: number });

        setCurrentPrices((prev) => ({ ...prev, ...pricesMap }));

        // Check alert conditions
        activeAlerts.forEach((alert) => {
          const currentPrice = pricesMap[alert.symbol];
          if (currentPrice) {
            const shouldTrigger =
              (alert.condition === AlertCondition.ABOVE &&
                currentPrice >= alert.price) ||
              (alert.condition === AlertCondition.BELOW &&
                currentPrice <= alert.price);

            if (shouldTrigger) {
              // Trigger alert
              dispatch(triggerAlert({ alertId: alert.id, currentPrice }));

              // Show notification
              const message =
                alert.condition === AlertCondition.ABOVE
                  ? `${alert.symbol.replace('_', '/')} fiyatı ${alert.price.toLocaleString('tr-TR')} TRY'yi geçti!`
                  : `${alert.symbol.replace('_', '/')} fiyatı ${alert.price.toLocaleString('tr-TR')} TRY'nin altına düştü!`;

              toast.success(message, {
                autoClose: 10000,
                icon: <NotificationsActiveIcon />,
              });

              // Mock email notification (log to console)
              console.log('Email notification sent:', message);
            }
          }
        });
      } catch (err) {
        console.error('Failed to update prices:', err);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeAlerts, dispatch]);

  // Handle create alert
  const handleCreateAlert = async (formData: AlertFormData) => {
    try {
      const request: CreateAlertRequest = {
        symbol: formData.symbol,
        condition: formData.condition,
        price: parseFloat(formData.price),
        notificationType: formData.notificationType,
        isActive: formData.isActive,
      };

      await dispatch(createAlert(request)).unwrap();
      toast.success('Fiyat uyarısı başarıyla oluşturuldu');
      dispatch(clearError());
    } catch (err: any) {
      toast.error(err || 'Uyarı oluşturulurken hata oluştu');
    }
  };

  // Handle edit alert
  const handleEditAlert = async (
    alertId: string,
    updates: { price?: number; condition?: AlertCondition }
  ) => {
    try {
      await dispatch(updateAlert({ id: alertId, ...updates })).unwrap();
      toast.success('Uyarı başarıyla güncellendi');
      dispatch(clearError());
    } catch (err: any) {
      toast.error(err || 'Uyarı güncellenirken hata oluştu');
    }
  };

  // Handle delete alert
  const handleDeleteAlert = async (alertId: string) => {
    try {
      await dispatch(deleteAlert(alertId)).unwrap();
      toast.success('Uyarı başarıyla silindi');
      dispatch(clearError());
    } catch (err: any) {
      toast.error(err || 'Uyarı silinirken hata oluştu');
    }
  };

  // Handle clear triggered history
  const handleClearHistory = () => {
    dispatch(clearTriggeredHistory());
    toast.info('Uyarı geçmişi temizlendi');
  };

  // Handle create similar alert
  const handleCreateSimilar = (triggeredAlert: TriggeredAlert) => {
    // Pre-fill form with similar alert data
    // This would require passing data to CreateAlertForm
    // For now, just show a toast
    toast.info(
      `${triggeredAlert.symbol.replace('_', '/')} için yeni uyarı oluşturmak üzere formu kullanın`
    );
  };

  if (!initialLoadComplete) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <NotificationsIcon fontSize="large" color="primary" />
          <Typography variant="h4" component="h1">
            Fiyat Uyarıları
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Kripto para fiyatlarını takip edin ve hedef fiyat seviyelerine ulaşıldığında bildirim alın
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Chip
            label={`Aktif Uyarılar: ${activeAlertsCount}/${MAX_ACTIVE_ALERTS}`}
            color={activeAlertsCount >= MAX_ACTIVE_ALERTS ? 'error' : 'primary'}
            variant={activeAlertsCount >= MAX_ACTIVE_ALERTS ? 'filled' : 'outlined'}
          />
          {triggeredAlerts.length > 0 && (
            <Chip
              label={`Tetiklenen: ${triggeredAlerts.length}`}
              color="success"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Create Alert Form */}
        <Grid item xs={12} lg={4}>
          <CreateAlertForm
            onSubmit={handleCreateAlert}
            loading={loading}
            error={error}
            currentPrices={currentPrices}
            activeAlertsCount={activeAlertsCount}
            maxAlerts={MAX_ACTIVE_ALERTS}
          />
        </Grid>

        {/* Active Alerts List */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Aktif Uyarılar ({activeAlertsCount})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <AlertsList
              alerts={alerts}
              currentPrices={currentPrices}
              onEdit={handleEditAlert}
              onDelete={handleDeleteAlert}
              loading={loading}
            />
          </Paper>
        </Grid>

        {/* Alert History */}
        {triggeredAlerts.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <AlertHistory
                triggeredAlerts={triggeredAlerts}
                onClearHistory={handleClearHistory}
                onCreateSimilar={handleCreateSimilar}
              />
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Info Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Fiyat Uyarıları Hakkında
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>
            <Typography variant="body2" color="text.secondary">
              Maksimum {MAX_ACTIVE_ALERTS} aktif uyarı oluşturabilirsiniz
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Uyarılar her 30 saniyede bir kontrol edilir
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Hedef fiyat güncel fiyatın %{MAX_PRICE_DEVIATION_PERCENT} aralığında olmalıdır
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Tetiklenen uyarılar otomatik olarak devre dışı bırakılır
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              E-posta bildirimleri yakında eklenecektir (şimdilik uygulama içi bildirim)
            </Typography>
          </li>
        </Box>
      </Paper>
    </Container>
  );
};

export default PriceAlertsPage;
