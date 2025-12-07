/**
 * Alert History Component
 * Display recently triggered price alerts
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { TriggeredAlert, AlertCondition } from '../../types/alerts.types';

interface AlertHistoryProps {
  triggeredAlerts: TriggeredAlert[];
  onClearHistory: () => void;
  onCreateSimilar?: (alert: TriggeredAlert) => void;
}

const AlertHistory: React.FC<AlertHistoryProps> = ({
  triggeredAlerts,
  onClearHistory,
  onCreateSimilar,
}) => {
  const { t } = useTranslation();

  // Format date and time
  const formatDateTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format price difference
  const formatPriceDiff = (targetPrice: number, currentPrice: number): {
    diff: number;
    percent: number;
    direction: 'up' | 'down';
  } => {
    const diff = currentPrice - targetPrice;
    const percent = (diff / targetPrice) * 100;
    const direction = diff > 0 ? 'up' : 'down';

    return { diff, percent, direction };
  };

  if (triggeredAlerts.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {t('alerts.noTriggered')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">{t('alerts.triggeredAlerts')}</Typography>
        <Button
          startIcon={<DeleteIcon />}
          onClick={onClearHistory}
          size="small"
          color="error"
        >
          {t('alerts.clearHistory')}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('alerts.table.symbol')}</TableCell>
              <TableCell>{t('alerts.table.condition')}</TableCell>
              <TableCell align="right">{t('alerts.table.targetPrice')}</TableCell>
              <TableCell align="right">{t('alerts.table.triggeredPrice')}</TableCell>
              <TableCell align="center">{t('alerts.table.difference')}</TableCell>
              <TableCell>{t('alerts.table.triggeredAt')}</TableCell>
              <TableCell align="center">{t('alerts.table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {triggeredAlerts.map((alert) => {
              const priceDiff = formatPriceDiff(alert.price, alert.currentPrice);

              return (
                <TableRow key={alert.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {alert.symbol.replace('_', '/')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {alert.condition === AlertCondition.ABOVE ? (
                        <>
                          <TrendingUpIcon fontSize="small" color="success" />
                          <Typography variant="body2">{t('alerts.form.rose')}</Typography>
                        </>
                      ) : (
                        <>
                          <TrendingDownIcon fontSize="small" color="error" />
                          <Typography variant="body2">{t('alerts.form.fell')}</Typography>
                        </>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {alert.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} TRY
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={
                        alert.condition === AlertCondition.ABOVE
                          ? 'success.main'
                          : 'error.main'
                      }
                    >
                      {alert.currentPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} TRY
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={`${priceDiff.diff > 0 ? '+' : ''}${priceDiff.diff.toLocaleString(undefined, { minimumFractionDigits: 2 })} TRY`}
                    >
                      <Chip
                        label={`${priceDiff.percent > 0 ? '+' : ''}${priceDiff.percent.toFixed(2)}%`}
                        color={priceDiff.percent > 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateTime(alert.triggeredAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {onCreateSimilar && (
                      <Tooltip title={t('alerts.actions.createSimilar')}>
                        <IconButton
                          size="small"
                          onClick={() => onCreateSimilar(alert)}
                          aria-label={t('alerts.actions.createSimilar')}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('alerts.showingTriggered', { count: triggeredAlerts.length })}
      </Typography>
    </Box>
  );
};

export default AlertHistory;
