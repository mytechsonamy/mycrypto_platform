/**
 * WalletBalanceCard Component
 * Displays a single currency balance card with deposit/withdraw actions
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Divider,
  Stack,
  Skeleton,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { WalletBalance, CURRENCY_METADATA, Currency } from '../../types/wallet.types';

interface WalletBalanceCardProps {
  balance: WalletBalance;
  onDeposit: (currency: Currency) => void;
  onWithdraw: (currency: Currency) => void;
  loading?: boolean;
}

/**
 * Format balance with appropriate decimals and symbol
 */
const formatBalance = (amount: string, currency: Currency): string => {
  const metadata = CURRENCY_METADATA[currency];
  const numericAmount = parseFloat(amount);

  // Handle NaN or invalid amounts
  if (isNaN(numericAmount)) {
    return `0.${'0'.repeat(metadata.decimals)} ${metadata.symbol}`;
  }

  // Format with appropriate decimals
  const formatted = numericAmount.toLocaleString('tr-TR', {
    minimumFractionDigits: metadata.decimals,
    maximumFractionDigits: metadata.decimals,
  });

  return `${formatted} ${metadata.symbol}`;
};

/**
 * WalletBalanceCard presentational component
 */
const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({
  balance,
  onDeposit,
  onWithdraw,
  loading = false,
}) => {
  const metadata = CURRENCY_METADATA[balance.currency];
  const hasLockedBalance = parseFloat(balance.lockedBalance) > 0;

  if (loading) {
    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CardContent sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="40%" height={24} sx={{ mt: 2 }} />
          <Skeleton variant="text" width="80%" height={48} sx={{ mt: 1 }} />
          <Skeleton variant="text" width="50%" height={24} sx={{ mt: 2 }} />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Skeleton variant="rectangular" width="50%" height={36} />
            <Skeleton variant="rectangular" width="50%" height={36} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      role="article"
      aria-label={`${metadata.name} cuzdan kartı`}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Currency Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2,
          }}
        >
          <AccountBalanceWalletIcon color="primary" />
          <Typography variant="h6" component="h3">
            {metadata.name}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Total Balance (Prominent) */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Toplam Bakiye
          </Typography>
          <Typography
            variant="h5"
            component="div"
            sx={{ fontWeight: 'bold', color: 'primary.main' }}
            aria-label={`Toplam bakiye: ${formatBalance(balance.totalBalance, balance.currency)}`}
          >
            {formatBalance(balance.totalBalance, balance.currency)}
          </Typography>
        </Box>

        {/* Available Balance */}
        <Stack spacing={1} sx={{ mb: 2, flex: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Kullanilabilir:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {formatBalance(balance.availableBalance, balance.currency)}
            </Typography>
          </Box>

          {/* Locked Balance (only show if > 0) */}
          {hasLockedBalance && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Kilitli (Emirlerde):
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'warning.main' }}>
                {formatBalance(balance.lockedBalance, balance.currency)}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<ArrowDownwardIcon />}
            onClick={() => onDeposit(balance.currency)}
            fullWidth
            aria-label={`${metadata.name} yatir`}
          >
            Yatir
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ArrowUpwardIcon />}
            onClick={() => onWithdraw(balance.currency)}
            fullWidth
            aria-label={`${metadata.name} cek`}
          >
            Cek
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default WalletBalanceCard;
