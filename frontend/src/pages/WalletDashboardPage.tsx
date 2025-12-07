/**
 * WalletDashboardPage - Figma Design Implementation
 * Main wallet dashboard with balance cards and asset table
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchWalletBalances,
  selectWalletBalances,
  selectWalletLoading,
  selectWalletError,
  clearWalletError,
} from '../store/slices/walletSlice';
import Header from '../components/layout/Header';
import { GRADIENTS, getColors } from '../theme/figmaTheme';
import { Currency } from '../types/wallet.types';

// Currency icons and colors
const currencyIcons: Record<Currency, { icon: string; color: string }> = {
  TRY: { icon: '₺', color: '#10B981' },
  BTC: { icon: '₿', color: '#F7931A' },
  ETH: { icon: 'Ξ', color: '#627EEA' },
  USDT: { icon: '₮', color: '#26A17B' },
};

// Mock price changes (in real app, these would come from WebSocket)
const priceChanges: Record<Currency, number> = {
  TRY: 0,
  BTC: 5.2,
  ETH: 3.8,
  USDT: 0,
};

const WalletDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
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
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Handle manual refresh
  const handleRefresh = () => {
    dispatch(fetchWalletBalances());
    setLastRefresh(new Date());
  };

  // Handle deposit action
  const handleDeposit = (currency: Currency) => {
    navigate('/wallet/deposit');
  };

  // Handle withdraw action
  const handleWithdraw = (currency: Currency) => {
    navigate('/wallet/withdraw');
  };

  // Calculate total portfolio value in TRY
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

  // Format currency value
  const formatValue = (value: string | number, currency: Currency): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (currency === 'TRY' || currency === 'USDT') {
      return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  };

  // Get TRY value for a balance
  const getTRYValue = (balance: string, currency: Currency): number => {
    const num = parseFloat(balance);
    if (currency === 'TRY') return num;
    if (currency === 'USDT') return num * 34;
    if (currency === 'BTC') return num * 1632450;
    if (currency === 'ETH') return num * 13200;
    return 0;
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: colors.darkBg }}>
      <Header />

      <Box sx={{ maxWidth: 1824, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        {/* Page Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '24px', md: '32px' },
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            {t('wallet.title')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => handleDeposit('TRY')}
              sx={{
                backgroundColor: colors.successGreen,
                '&:hover': { backgroundColor: colors.successGreen, opacity: 0.9 },
              }}
            >
              {t('wallet.deposit.title')}
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<RemoveIcon />}
              onClick={() => handleWithdraw('TRY')}
              sx={{
                backgroundColor: colors.dangerRed,
                '&:hover': { backgroundColor: colors.dangerRed, opacity: 0.9 },
              }}
            >
              {t('wallet.withdraw.title')}
            </Button>
          </Box>
        </Box>

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

        {/* Balance Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Total Balance Card */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                background: GRADIENTS.primary,
                borderRadius: '16px',
                p: 3,
                height: '160px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                sx={{
                  color: colors.textWhite,
                  opacity: 0.8,
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {t('wallet.totalBalance')}
              </Typography>
              <Box>
                {loading && balances.length === 0 ? (
                  <Skeleton variant="text" width="80%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                ) : (
                  <>
                    <Typography
                      sx={{
                        color: colors.textWhite,
                        fontSize: '28px',
                        fontWeight: 700,
                      }}
                    >
                      ₺{calculatePortfolioValue().toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography
                      sx={{
                        color: colors.textWhite,
                        opacity: 0.7,
                        fontSize: '14px',
                        mt: 1,
                      }}
                    >
                      +12.5% this week
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Grid>

          {/* TRY Balance Card */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                background: GRADIENTS.success,
                borderRadius: '16px',
                p: 3,
                height: '160px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                sx={{
                  color: colors.textWhite,
                  opacity: 0.8,
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {t('wallet.tryBalance')}
              </Typography>
              <Box>
                {loading && balances.length === 0 ? (
                  <Skeleton variant="text" width="80%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                ) : (
                  <Typography
                    sx={{
                      color: colors.textWhite,
                      fontSize: '28px',
                      fontWeight: 700,
                    }}
                  >
                    ₺{formatValue(balances.find(b => b.currency === 'TRY')?.totalBalance || '0', 'TRY')}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Crypto Value Card */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                background: GRADIENTS.cyan,
                borderRadius: '16px',
                p: 3,
                height: '160px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                sx={{
                  color: colors.textWhite,
                  opacity: 0.8,
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {t('wallet.cryptoValue')}
              </Typography>
              <Box>
                {loading && balances.length === 0 ? (
                  <Skeleton variant="text" width="80%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                ) : (
                  <>
                    <Typography
                      sx={{
                        color: colors.textWhite,
                        fontSize: '28px',
                        fontWeight: 700,
                      }}
                    >
                      ₺{(calculatePortfolioValue() - parseFloat(balances.find(b => b.currency === 'TRY')?.totalBalance || '0')).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography
                      sx={{
                        color: colors.textWhite,
                        opacity: 0.7,
                        fontSize: '14px',
                        mt: 1,
                      }}
                    >
                      +8.2%
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Assets Table */}
        <Box
          sx={{
            backgroundColor: colors.cardBg,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}
        >
          {/* Table Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 3,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <Typography
              sx={{
                fontSize: '18px',
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              {t('wallet.yourAssets')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                {t('common.lastUpdate')}: {lastRefresh.toLocaleTimeString()}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                {t('common.refresh')}
              </Button>
            </Box>
          </Box>

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('wallet.asset')}</TableCell>
                  <TableCell align="right">{t('wallet.balance')}</TableCell>
                  <TableCell align="right">{t('wallet.valueTry')}</TableCell>
                  <TableCell align="right">{t('wallet.change24h')}</TableCell>
                  <TableCell align="center">{t('wallet.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && balances.length === 0 ? (
                  // Loading skeletons
                  ['TRY', 'BTC', 'ETH', 'USDT'].map((currency) => (
                    <TableRow key={currency}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Skeleton variant="circular" width={40} height={40} />
                          <Box>
                            <Skeleton variant="text" width={100} />
                            <Skeleton variant="text" width={60} />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right"><Skeleton variant="text" width={80} /></TableCell>
                      <TableCell align="right"><Skeleton variant="text" width={100} /></TableCell>
                      <TableCell align="right"><Skeleton variant="text" width={60} /></TableCell>
                      <TableCell align="center"><Skeleton variant="text" width={120} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  balances.map((balance) => {
                    const iconInfo = currencyIcons[balance.currency];
                    const change = priceChanges[balance.currency];
                    const tryValue = getTRYValue(balance.totalBalance, balance.currency);

                    return (
                      <TableRow
                        key={balance.currency}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(0, 111, 255, 0.05)',
                          },
                        }}
                      >
                        {/* Asset */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: iconInfo.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: colors.textWhite,
                                fontWeight: 700,
                                fontSize: '16px',
                              }}
                            >
                              {iconInfo.icon}
                            </Box>
                            <Box>
                              <Typography
                                sx={{
                                  fontWeight: 500,
                                  color: colors.textPrimary,
                                }}
                              >
                                {t(`currencies.${balance.currency}`)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: colors.textSecondary }}
                              >
                                {balance.currency}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Balance */}
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 500, color: colors.textPrimary }}>
                            {formatValue(balance.totalBalance, balance.currency)} {balance.currency}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            {t('common.available')}: {formatValue(balance.availableBalance, balance.currency)}
                          </Typography>
                        </TableCell>

                        {/* Value (TRY) */}
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 500, color: colors.textPrimary }}>
                            ₺{tryValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>

                        {/* 24h Change */}
                        <TableCell align="right">
                          {change === 0 ? (
                            <Typography sx={{ color: colors.textSecondary }}>-</Typography>
                          ) : (
                            <Chip
                              size="small"
                              icon={change > 0 ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />}
                              label={`${change > 0 ? '+' : ''}${change}%`}
                              color={change > 0 ? 'success' : 'error'}
                              sx={{
                                fontWeight: 500,
                                '& .MuiChip-icon': {
                                  color: 'inherit',
                                },
                              }}
                            />
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Button
                              size="small"
                              onClick={() => handleDeposit(balance.currency)}
                              sx={{
                                color: colors.primaryBlue,
                                fontSize: '12px',
                                '&:hover': {
                                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 111, 255, 0.1)' : 'rgba(0, 111, 255, 0.05)',
                                },
                              }}
                            >
                              {t('wallet.deposit.title')}
                            </Button>
                            <Button
                              size="small"
                              onClick={() => handleWithdraw(balance.currency)}
                              sx={{
                                color: colors.dangerRed,
                                fontSize: '12px',
                                '&:hover': {
                                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255, 71, 87, 0.05)',
                                },
                              }}
                            >
                              {t('wallet.withdraw.title')}
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Empty State */}
          {!loading && balances.length === 0 && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography
                variant="h6"
                sx={{ color: colors.textSecondary, mb: 2 }}
              >
                {t('wallet.noAssets')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleDeposit('TRY')}
              >
                {t('wallet.makeFirstDeposit')}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default WalletDashboardPage;
