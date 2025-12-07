/**
 * Alerts List Component
 * Display active price alerts with edit/delete actions
 */

import React, { useState } from 'react';
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
  IconButton,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  PriceAlert,
  AlertCondition,
  AlertStatus,
} from '../../types/alerts.types';

interface AlertsListProps {
  alerts: PriceAlert[];
  currentPrices: { [symbol: string]: number };
  onEdit: (alertId: string, updates: { price?: number; condition?: AlertCondition }) => void;
  onDelete: (alertId: string) => void;
  loading: boolean;
}

const AlertsList: React.FC<AlertsListProps> = ({
  alerts,
  currentPrices,
  onEdit,
  onDelete,
  loading,
}) => {
  const { t } = useTranslation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editCondition, setEditCondition] = useState<AlertCondition>(AlertCondition.ABOVE);

  // Open edit dialog
  const handleEditClick = (alert: PriceAlert) => {
    setSelectedAlert(alert);
    setEditPrice(alert.price.toString());
    setEditCondition(alert.condition);
    setEditDialogOpen(true);
  };

  // Handle edit submission
  const handleEditSubmit = () => {
    if (selectedAlert) {
      const priceNum = parseFloat(editPrice);
      if (!isNaN(priceNum) && priceNum > 0) {
        onEdit(selectedAlert.id, {
          price: priceNum,
          condition: editCondition,
        });
        setEditDialogOpen(false);
        setSelectedAlert(null);
      }
    }
  };

  // Open delete dialog
  const handleDeleteClick = (alert: PriceAlert) => {
    setSelectedAlert(alert);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedAlert) {
      onDelete(selectedAlert.id);
      setDeleteDialogOpen(false);
      setSelectedAlert(null);
    }
  };

  // Calculate distance to trigger
  const calculateDistance = (alert: PriceAlert): {
    percent: number;
    direction: 'up' | 'down';
  } => {
    const currentPrice = currentPrices[alert.symbol];
    if (!currentPrice) return { percent: 0, direction: 'up' };

    const diff = alert.price - currentPrice;
    const percent = Math.abs((diff / currentPrice) * 100);
    const direction = diff > 0 ? 'up' : 'down';

    return { percent, direction };
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeAlerts = alerts.filter((a) => a.status === AlertStatus.ACTIVE);

  if (activeAlerts.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {t('alerts.noActiveAlerts')}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('alerts.table.symbol')}</TableCell>
              <TableCell>{t('alerts.table.condition')}</TableCell>
              <TableCell align="right">{t('alerts.table.targetPrice')}</TableCell>
              <TableCell align="right">{t('alerts.table.currentPrice')}</TableCell>
              <TableCell align="center">{t('alerts.table.status')}</TableCell>
              <TableCell>{t('alerts.table.createdAt')}</TableCell>
              <TableCell align="center">{t('alerts.table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeAlerts.map((alert) => {
              const currentPrice = currentPrices[alert.symbol];
              const distance = calculateDistance(alert);
              const isClose = distance.percent < 5;

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
                          <Typography variant="body2">{t('alerts.form.rises')}</Typography>
                        </>
                      ) : (
                        <>
                          <TrendingDownIcon fontSize="small" color="error" />
                          <Typography variant="body2">{t('alerts.form.falls')}</Typography>
                        </>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={alert.condition === AlertCondition.ABOVE ? 'success.main' : 'error.main'}
                    >
                      {alert.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} TRY
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {currentPrice ? (
                      <Typography variant="body2">
                        {currentPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} TRY
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {currentPrice && (
                      <Tooltip
                        title={distance.direction === 'up'
                          ? t('alerts.distance.above', { percent: distance.percent.toFixed(1) })
                          : t('alerts.distance.below', { percent: distance.percent.toFixed(1) })}
                      >
                        <Chip
                          label={`%${distance.percent.toFixed(1)}`}
                          color={isClose ? 'warning' : 'default'}
                          size="small"
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(alert.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(alert)}
                      disabled={loading}
                      aria-label={t('alerts.actions.edit')}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(alert)}
                      disabled={loading}
                      color="error"
                      aria-label={t('alerts.actions.delete')}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('alerts.dialogs.editTitle')}
          <IconButton
            aria-label={t('common.close')}
            onClick={() => setEditDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('alerts.dialogs.editInfo', { symbol: selectedAlert.symbol.replace('_', '/') })}
              </Alert>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('alerts.form.condition')}</InputLabel>
                <Select
                  value={editCondition}
                  label={t('alerts.form.condition')}
                  onChange={(e) => setEditCondition(e.target.value as AlertCondition)}
                >
                  <MenuItem value={AlertCondition.ABOVE}>{t('alerts.form.priceRises')}</MenuItem>
                  <MenuItem value={AlertCondition.BELOW}>{t('alerts.form.priceFalls')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t('alerts.form.targetPriceTry')}
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                inputProps={{
                  step: '0.01',
                  min: '0',
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={loading}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('alerts.dialogs.deleteTitle')}</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Typography>
              {t('alerts.dialogs.deleteConfirm', {
                symbol: selectedAlert.symbol.replace('_', '/'),
                price: selectedAlert.price.toLocaleString()
              })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={loading}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AlertsList;
