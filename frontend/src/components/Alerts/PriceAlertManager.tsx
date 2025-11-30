/**
 * Price Alert Manager Component
 * Comprehensive alert management interface combining create, list, edit, delete, and history
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  NotificationsActive as ActiveIcon,
  History as HistoryIcon,
  Assessment as StatsIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  selectAlerts,
  selectActiveAlertsCount,
  selectAlertsLoading,
  selectAlertsError,
  selectTriggeredAlerts,
  clearError,
  clearTriggeredHistory,
} from '../../store/slices/alertsSlice';
import CreateAlertForm from './CreateAlertForm';
import AlertsList from './AlertsList';
import AlertHistory from './AlertHistory';
import {
  AlertFormData,
  AlertCondition,
  MAX_ACTIVE_ALERTS,
  AlertStatus,
  PriceAlert,
} from '../../types/alerts.types';
import { TradingPair, TRADING_PAIRS } from '../../types/trading.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`alert-tabpanel-${index}`}
      aria-labelledby={`alert-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const PriceAlertManager: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const dispatch = useAppDispatch();
  const alerts = useAppSelector(selectAlerts);
  const activeAlertsCount = useAppSelector(selectActiveAlertsCount);
  const loading = useAppSelector(selectAlertsLoading);
  const error = useAppSelector(selectAlertsError);
  const triggeredAlerts = useAppSelector(selectTriggeredAlerts);

  const [activeTab, setActiveTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  // Get current prices from ticker (mock data for now - will be replaced with real multi-ticker support)
  const ticker = useAppSelector((state) => state.trading.ticker);
  const selectedSymbol = useAppSelector((state) => state.trading.selectedSymbol);

  const currentPrices: { [symbol: string]: number } = {};
  if (ticker && selectedSymbol) {
    currentPrices[selectedSymbol] = parseFloat(ticker.lastPrice);
  }

  // Mock prices for other symbols (temporary - will be replaced with real API)
  TRADING_PAIRS.forEach((pair) => {
    if (!currentPrices[pair]) {
      if (pair === 'BTC_TRY') {
        currentPrices[pair] = 1500000;
      } else if (pair === 'ETH_TRY') {
        currentPrices[pair] = 75000;
      } else if (pair === 'USDT_TRY') {
        currentPrices[pair] = 30;
      }
    }
  });

  // Fetch alerts on mount
  useEffect(() => {
    dispatch(fetchAlerts());
  }, [dispatch]);

  // Show error in snackbar
  useEffect(() => {
    if (error) {
      setSnackbarMessage(error);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle create alert
  const handleCreateAlert = async (data: AlertFormData) => {
    const result = await dispatch(
      createAlert({
        symbol: data.symbol,
        condition: data.condition,
        price: parseFloat(data.price),
        notificationType: data.notificationType,
        isActive: data.isActive,
      })
    );

    if (createAlert.fulfilled.match(result)) {
      setSnackbarMessage('Fiyat uyarısı başarıyla oluşturuldu');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } else {
      setSnackbarMessage(result.payload as string || 'Uyarı oluşturulamadı');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle edit alert
  const handleEditAlert = async (
    alertId: string,
    updates: { price?: number; condition?: AlertCondition }
  ) => {
    const result = await dispatch(
      updateAlert({
        id: alertId,
        ...updates,
      })
    );

    if (updateAlert.fulfilled.match(result)) {
      setSnackbarMessage('Uyarı başarıyla güncellendi');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }
  };

  // Handle delete alert
  const handleDeleteAlert = async (alertId: string) => {
    const result = await dispatch(deleteAlert(alertId));

    if (deleteAlert.fulfilled.match(result)) {
      setSnackbarMessage('Uyarı silindi');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    }
  };

  // Handle toggle alert status
  const handleToggleAlert = async (alertId: string, enabled: boolean) => {
    const result = await dispatch(
      updateAlert({
        id: alertId,
        isActive: enabled,
      })
    );

    if (updateAlert.fulfilled.match(result)) {
      setSnackbarMessage(enabled ? 'Uyarı aktif edildi' : 'Uyarı devre dışı bırakıldı');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    }
  };

  // Calculate statistics
  const activeAlerts = alerts.filter((a) => a.status === AlertStatus.ACTIVE);
  const inactiveAlerts = alerts.filter((a) => a.status === AlertStatus.INACTIVE);
  const totalTriggered = triggeredAlerts.length;

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ActiveIcon color="success" />
                <Typography variant="body2" color="text.secondary">
                  Aktif Uyarılar
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {activeAlerts.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Maksimum {MAX_ACTIVE_ALERTS}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon color="info" />
                <Typography variant="body2" color="text.secondary">
                  Tetiklenen
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {totalTriggered}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Toplam tetikleme sayısı
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatsIcon color="warning" />
                <Typography variant="body2" color="text.secondary">
                  Pasif Uyarılar
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {inactiveAlerts.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Devre dışı uyarılar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="alert management tabs"
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={isMobile ? 'Aktif' : 'Aktif Uyarılar'}
            icon={<ActiveIcon />}
            iconPosition="start"
            id="alert-tab-0"
            aria-controls="alert-tabpanel-0"
          />
          <Tab
            label={isMobile ? 'Geçmiş' : 'Geçmiş'}
            icon={<HistoryIcon />}
            iconPosition="start"
            id="alert-tab-1"
            aria-controls="alert-tabpanel-1"
          />
        </Tabs>

        {/* Tab 0: Active Alerts */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {/* Create Form */}
            <Grid item xs={12} lg={4}>
              <CreateAlertForm
                onSubmit={handleCreateAlert}
                loading={loading}
                error={null}
                currentPrices={currentPrices}
                activeAlertsCount={activeAlertsCount}
                maxAlerts={MAX_ACTIVE_ALERTS}
              />
            </Grid>

            {/* Alerts List */}
            <Grid item xs={12} lg={8}>
              <AlertsList
                alerts={activeAlerts}
                currentPrices={currentPrices}
                onEdit={handleEditAlert}
                onDelete={handleDeleteAlert}
                loading={loading}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 1: History */}
        <TabPanel value={activeTab} index={1}>
          <AlertHistory
            triggeredAlerts={triggeredAlerts}
            onClearHistory={() => dispatch(clearTriggeredHistory())}
          />
        </TabPanel>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PriceAlertManager;
