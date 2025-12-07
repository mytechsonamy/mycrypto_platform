/**
 * Dashboard Page - Figma Design Implementation (Dark Theme)
 * Main dashboard with portfolio overview and quick actions
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Grid,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalanceWallet as WalletIcon,
  SwapHoriz as TradeIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  NotificationsActive as AlertIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchWalletBalances,
  selectWalletBalances,
  selectWalletLoading,
} from '../store/slices/walletSlice';
import Header from '../components/layout/Header';
import { GRADIENTS, getColors } from '../theme/figmaTheme';

// Mock data for demo
const MOCK_PORTFOLIO = {
  todayChangePercent: 3.47,
  profit24h: 1234.56,
  totalTrades: 247,
  assetsHeld: 4,
};

const MOCK_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', percent: 70.6, value: 85420, change: 5.2, positive: true, color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', percent: 20.4, value: 28350.5, change: 3.8, positive: true, color: '#627EEA' },
  { symbol: 'USDT', name: 'Tether', percent: 5.1, value: 7080, change: 0, positive: true, color: '#26A17B' },
  { symbol: 'TRY', name: 'Turkish Lira', percent: 3.9, value: 125000, change: 0, positive: true, color: '#10B981' },
];

const MOCK_ACTIVITIES = [
  { type: 'buy', asset: 'BTC', amount: '0.1234 BTC', value: '₺201,565.83', time: '2 saat önce' },
  { type: 'sell', asset: 'ETH', amount: '1.5 ETH', value: '₺19,800.00', time: '5 saat önce' },
  { type: 'deposit', asset: 'TRY', amount: '₺50,000', value: '₺50,000', time: '1 gün önce' },
];

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const balances = useAppSelector(selectWalletBalances);
  const loading = useAppSelector(selectWalletLoading);

  useEffect(() => {
    dispatch(fetchWalletBalances());
  }, [dispatch]);

  // Calculate total portfolio value
  const calculatePortfolioValue = (): number => {
    let total = 0;
    balances.forEach((b) => {
      if (b.currency === 'TRY') {
        total += parseFloat(b.totalBalance);
      } else if (b.currency === 'USDT') {
        total += parseFloat(b.totalBalance) * 34;
      } else if (b.currency === 'BTC') {
        total += parseFloat(b.totalBalance) * 1632450;
      } else if (b.currency === 'ETH') {
        total += parseFloat(b.totalBalance) * 13200;
      }
    });
    return total;
  };

  const portfolioValue = calculatePortfolioValue();

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
            {t('dashboard.title')}
          </Typography>
          <Typography
            sx={{
              fontSize: '16px',
              color: colors.textSecondary,
            }}
          >
            {t('dashboard.welcome')}
          </Typography>
        </Box>

        {/* Portfolio Card with Gradient */}
        <Card
          sx={{
            background: GRADIENTS.primary,
            borderRadius: '16px',
            mb: 4,
            p: { xs: 3, md: 4 },
            border: 'none',
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, opacity: 0.8, mb: 1, color: colors.textWhite }}>
              {t('dashboard.portfolio.totalBalance')}
            </Typography>
            {loading && balances.length === 0 ? (
              <Skeleton variant="text" width="60%" height={60} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
            ) : (
              <>
                <Typography sx={{ fontSize: { xs: '36px', md: '48px' }, fontWeight: 700, color: colors.textWhite, mb: 1 }}>
                  ₺{portfolioValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon sx={{ fontSize: 20, color: colors.textWhite }} />
                  <Typography sx={{ fontSize: '16px', color: colors.textWhite, opacity: 0.9 }}>
                    +{MOCK_PORTFOLIO.todayChangePercent}% {t('dashboard.portfolio.todayChange')}
                  </Typography>
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* 24h Profit */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5, height: '100%' }}>
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
                    {t('dashboard.portfolio.profit24h')}
                  </Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 700, color: colors.successGreen }}>
                    +₺{MOCK_PORTFOLIO.profit24h.toLocaleString('tr-TR')}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Total Trades */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5, height: '100%' }}>
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
                  <TradeIcon sx={{ color: colors.primaryBlue, fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('dashboard.portfolio.totalTrades')}
                  </Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 700, color: colors.textPrimary }}>
                    {MOCK_PORTFOLIO.totalTrades}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Assets Held */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: 'rgba(0, 217, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WalletIcon sx={{ color: colors.vibrantCyan, fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('dashboard.portfolio.assetsHeld')}
                  </Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 700, color: colors.textPrimary }}>
                    {MOCK_PORTFOLIO.assetsHeld}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Active Alerts */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2.5, height: '100%' }}>
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
                  <AlertIcon sx={{ color: colors.warningOrange, fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('alerts.activeAlerts')}
                  </Typography>
                  <Typography sx={{ fontSize: '20px', fontWeight: 700, color: colors.textPrimary }}>
                    3
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Two Column Layout */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Top Assets */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary }}>
                {t('dashboard.assets.title')}
              </Typography>
              <Button
                onClick={() => navigate('/wallet')}
                sx={{
                  color: colors.primaryBlue,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                {t('common.all')}
              </Button>
            </Box>
            <Card sx={{ overflow: 'hidden' }}>
              {MOCK_ASSETS.map((asset, index) => (
                <Box
                  key={asset.symbol}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderBottom: index < MOCK_ASSETS.length - 1 ? `1px solid ${colors.border}` : 'none',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 111, 255, 0.05)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: asset.color,
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {asset.symbol.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 500, color: colors.textPrimary }}>
                        {t(`currencies.${asset.symbol}`)}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: colors.textSecondary }}>
                        {asset.symbol}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: '14px', color: colors.textSecondary }}>
                    {asset.percent}%
                  </Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: colors.textPrimary }}>
                      ₺{asset.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </Typography>
                    {asset.change !== 0 && (
                      <Typography
                        sx={{
                          fontSize: '12px',
                          color: asset.positive ? colors.successGreen : colors.dangerRed,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 0.5,
                        }}
                      >
                        {asset.positive ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                        {asset.positive ? '+' : '-'}{asset.change}%
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary }}>
                {t('dashboard.recentActivity.title')}
              </Typography>
              <Button
                sx={{
                  color: colors.primaryBlue,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                {t('common.all')}
              </Button>
            </Box>
            <Card sx={{ overflow: 'hidden' }}>
              {MOCK_ACTIVITIES.map((activity, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderBottom: index < MOCK_ACTIVITIES.length - 1 ? `1px solid ${colors.border}` : 'none',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 111, 255, 0.05)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: activity.type === 'buy' || activity.type === 'deposit'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(255, 71, 87, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {activity.type === 'buy' || activity.type === 'deposit' ? (
                        <ArrowDownIcon sx={{ color: colors.successGreen }} />
                      ) : (
                        <ArrowUpIcon sx={{ color: colors.dangerRed }} />
                      )}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 500, color: colors.textPrimary, textTransform: 'capitalize' }}>
                        {t(`dashboard.recentActivity.${activity.type}`)} {activity.asset}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: colors.textSecondary }}>
                        {activity.time}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: colors.textPrimary }}>
                      {activity.amount}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: colors.textSecondary }}>
                      {activity.value}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Box>
          <Typography sx={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary, mb: 2 }}>
            {t('dashboard.quickActions.title')}
          </Typography>
          <Grid container spacing={2}>
            {[
              { label: t('dashboard.quickActions.deposit'), icon: <ArrowDownIcon />, path: '/wallet', color: colors.successGreen },
              { label: t('dashboard.quickActions.withdraw'), icon: <ArrowUpIcon />, path: '/wallet', color: colors.dangerRed },
              { label: t('dashboard.quickActions.trade'), icon: <TradeIcon />, path: '/trading', color: colors.primaryBlue },
              { label: t('dashboard.quickActions.alerts'), icon: <AlertIcon />, path: '/alerts', color: colors.warningOrange },
            ].map((action) => (
              <Grid item xs={6} sm={3} key={action.label}>
                <Card
                  onClick={() => navigate(action.path)}
                  sx={{
                    p: 3,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: action.color,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 20px ${action.color}20`,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        bgcolor: `${action.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: action.color,
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: action.color }}>
                      {action.label}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;
