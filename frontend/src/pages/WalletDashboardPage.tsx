/**
 * WalletDashboardPage Component
 * Main wallet dashboard showing all balance cards
 */

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Alert,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchWalletBalances,
  selectWalletBalances,
  selectWalletLoading,
  selectWalletError,
  clearWalletError,
} from '../store/slices/walletSlice';
import WalletBalanceCard from '../components/wallet/WalletBalanceCard';
import { Currency } from '../types/wallet.types';

// Auto-refresh interval in milliseconds (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

/**
 * WalletDashboardPage container component
 */
const WalletDashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const balances = useAppSelector(selectWalletBalances);
  const loading = useAppSelector(selectWalletLoading);
  const error = useAppSelector(selectWalletError);

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch balances on mount
  useEffect(() => {
    dispatch(fetchWalletBalances());
  }, [dispatch]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchWalletBalances());
      setLastRefresh(new Date());
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [dispatch]);

  // Handle manual refresh
  const handleRefresh = () => {
    dispatch(fetchWalletBalances());
    setLastRefresh(new Date());
  };

  // Handle deposit action
  const handleDeposit = (currency: Currency) => {
    // TODO: Implement deposit modal in FE-025/FE-026
    console.log(`Deposit ${currency} - To be implemented in next sprint`);
    alert(`${currency} yatırma özelliği yakın zamanda eklenecek`);
  };

  // Handle withdraw action
  const handleWithdraw = (currency: Currency) => {
    // TODO: Implement withdraw modal in FE-028/FE-029
    console.log(`Withdraw ${currency} - To be implemented in next sprint`);
    alert(`${currency} çekme özelliği yakın zamanda eklenecek`);
  };

  // Calculate total portfolio value in TRY
  const calculatePortfolioValue = (): string => {
    // TODO: Implement with real-time price conversion in FE-024
    // For now, just sum TRY and USDT balances
    const tryBalance = balances.find((b) => b.currency === 'TRY');
    const usdtBalance = balances.find((b) => b.currency === 'USDT');

    let total = 0;

    if (tryBalance) {
      total += parseFloat(tryBalance.totalBalance);
    }

    // Assume USDT = 34 TRY (this should come from price feed)
    if (usdtBalance) {
      total += parseFloat(usdtBalance.totalBalance) * 34;
    }

    return total.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Cüzdanlarım
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Bakiyeleri yenile"
          >
            Yenile
          </Button>
        </Box>
      </Box>

      {/* Portfolio Summary */}
      {balances.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Toplam Portföy Değeri
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
            {calculatePortfolioValue()} ₺
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9, mt: 1, display: 'block' }}>
            4 farklı varlık
          </Typography>
        </Paper>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => dispatch(clearWalletError())}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Balance Cards Grid */}
      <Grid container spacing={3}>
        {loading && balances.length === 0 ? (
          // Show loading skeletons for initial load
          <>
            {['TRY', 'BTC', 'ETH', 'USDT'].map((currency) => (
              <Grid item xs={12} sm={6} md={3} key={currency}>
                <WalletBalanceCard
                  balance={{
                    currency: currency as Currency,
                    availableBalance: '0',
                    lockedBalance: '0',
                    totalBalance: '0',
                  }}
                  onDeposit={handleDeposit}
                  onWithdraw={handleWithdraw}
                  loading={true}
                />
              </Grid>
            ))}
          </>
        ) : balances.length > 0 ? (
          // Show actual balance cards
          balances.map((balance) => (
            <Grid item xs={12} sm={6} md={3} key={balance.currency}>
              <WalletBalanceCard
                balance={balance}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
                loading={false}
              />
            </Grid>
          ))
        ) : (
          // Show empty state
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: 'background.default',
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Cüzdan bulunamadı
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cüzdanlarınız yüklenemiyor. Lütfen tekrar deneyin.
              </Typography>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                sx={{ mt: 2 }}
              >
                Tekrar Dene
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Info Section */}
      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Bilgilendirme
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" paragraph>
          - Bakiyeleriniz her 30 saniyede bir otomatik olarak güncellenir.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          - Kilitli bakiyeler, bekleyen emirlerde kullanılan miktarları gösterir.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          - Yatırma ve çekme işlemleri için ilgili butonları kullanabilirsiniz.
        </Typography>
      </Paper>
    </Container>
  );
};

export default WalletDashboardPage;
