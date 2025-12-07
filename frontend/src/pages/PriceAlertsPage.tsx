/**
 * Price Alerts Page - Figma Design Implementation (Dark Theme)
 * User can create, view, edit, and delete price alerts
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Divider,
  Chip,
  Card,
  useTheme,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
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
import Header from '../components/layout/Header';
import { GRADIENTS, getColors } from '../theme/figmaTheme';

const PriceAlertsPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
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
        dispatch(fetchAlerts());

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
        toast.error(t('errors.networkError'));
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
              dispatch(triggerAlert({ alertId: alert.id, currentPrice }));

              const message =
                alert.condition === AlertCondition.ABOVE
                  ? `${alert.symbol.replace('_', '/')} price crossed ${alert.price.toLocaleString('tr-TR')} TRY!`
                  : `${alert.symbol.replace('_', '/')} price dropped below ${alert.price.toLocaleString('tr-TR')} TRY!`;

              toast.success(message, {
                autoClose: 10000,
                icon: <NotificationsActiveIcon />,
              });

              console.log('Email notification sent:', message);
            }
          }
        });
      } catch (err) {
        console.error('Failed to update prices:', err);
      }
    }, 30000);

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
      toast.success(t('alerts.alertCreated'));
      dispatch(clearError());
    } catch (err: any) {
      toast.error(err || t('common.error'));
    }
  };

  // Handle edit alert
  const handleEditAlert = async (
    alertId: string,
    updates: { price?: number; condition?: AlertCondition }
  ) => {
    try {
      await dispatch(updateAlert({ id: alertId, ...updates })).unwrap();
      toast.success(t('alerts.alertUpdated'));
      dispatch(clearError());
    } catch (err: any) {
      toast.error(err || t('common.error'));
    }
  };

  // Handle delete alert
  const handleDeleteAlert = async (alertId: string) => {
    try {
      await dispatch(deleteAlert(alertId)).unwrap();
      toast.success(t('alerts.alertDeleted'));
      dispatch(clearError());
    } catch (err: any) {
      toast.error(err || t('common.error'));
    }
  };

  // Handle clear triggered history
  const handleClearHistory = () => {
    dispatch(clearTriggeredHistory());
    toast.info(t('alerts.clearHistory'));
  };

  // Handle create similar alert
  const handleCreateSimilar = (triggeredAlert: TriggeredAlert) => {
    toast.info(t('alerts.createAlert'));
  };

  if (!initialLoadComplete) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: colors.darkBg }}>
        <Header />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 72px)',
          }}
        >
          <CircularProgress size={48} sx={{ color: colors.primaryBlue }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: colors.darkBg }}>
      <Header />

      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontSize: { xs: '28px', md: '36px' },
              fontWeight: 700,
              color: colors.textPrimary,
              mb: 1,
            }}
          >
            {t('alerts.title')}
          </Typography>
          <Typography
            sx={{
              fontSize: '16px',
              color: colors.textSecondary,
              mb: 2,
            }}
          >
            {t('alerts.subtitle')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              label={t('alerts.currentAlertsCount', { count: activeAlertsCount, max: MAX_ACTIVE_ALERTS })}
              sx={{
                backgroundColor: activeAlertsCount >= MAX_ACTIVE_ALERTS
                  ? 'rgba(255, 71, 87, 0.2)'
                  : 'rgba(0, 111, 255, 0.2)',
                color: activeAlertsCount >= MAX_ACTIVE_ALERTS
                  ? colors.dangerRed
                  : colors.primaryBlue,
                border: `1px solid ${activeAlertsCount >= MAX_ACTIVE_ALERTS ? colors.dangerRed : colors.primaryBlue}`,
                fontWeight: 500,
              }}
            />
            {triggeredAlerts.length > 0 && (
              <Chip
                label={`${t('alerts.status.triggered')}: ${triggeredAlerts.length}`}
                sx={{
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: colors.successGreen,
                  border: `1px solid ${colors.successGreen}`,
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: 'rgba(0, 111, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <NotificationsIcon sx={{ color: colors.primaryBlue, fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('alerts.activeAlerts')}
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary }}>
                    {activeAlertsCount}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: 'rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUpIcon sx={{ color: colors.successGreen, fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('alerts.form.above')}
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary }}>
                    {activeAlerts.filter(a => a.condition === AlertCondition.ABOVE).length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: 'rgba(255, 71, 87, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingDownIcon sx={{ color: colors.dangerRed, fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('alerts.form.below')}
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary }}>
                    {activeAlerts.filter(a => a.condition === AlertCondition.BELOW).length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: 'rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <NotificationsActiveIcon sx={{ color: colors.warningOrange, fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('alerts.status.triggered')}
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary }}>
                    {triggeredAlerts.length}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

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
              <Typography sx={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary, mb: 2 }}>
                {t('alerts.activeAlerts')} ({activeAlertsCount})
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
          <Typography sx={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary, mb: 2 }}>
            {t('alerts.about.title')}
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            {[
              t('alerts.about.maxAlerts', { max: MAX_ACTIVE_ALERTS }),
              t('alerts.about.checkInterval'),
              t('alerts.about.priceDeviation', { percent: MAX_PRICE_DEVIATION_PERCENT }),
              t('alerts.about.autoDeactivate'),
              t('alerts.about.emailComingSoon'),
            ].map((item, index) => (
              <li key={index} style={{ marginBottom: 8 }}>
                <Typography sx={{ fontSize: '14px', color: colors.textSecondary }}>
                  {item}
                </Typography>
              </li>
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default PriceAlertsPage;
