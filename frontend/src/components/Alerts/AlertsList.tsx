/**
 * Alerts List Component
 * Display active price alerts with edit/delete actions
 */

import React, { useState } from 'react';
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
          Henüz aktif uyarınız bulunmamaktadır. Yukarıdaki formdan yeni uyarı oluşturabilirsiniz.
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
              <TableCell>Sembol</TableCell>
              <TableCell>Koşul</TableCell>
              <TableCell align="right">Hedef Fiyat</TableCell>
              <TableCell align="right">Güncel Fiyat</TableCell>
              <TableCell align="center">Durum</TableCell>
              <TableCell>Oluşturulma</TableCell>
              <TableCell align="center">İşlemler</TableCell>
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
                          <Typography variant="body2">Yükselirse</Typography>
                        </>
                      ) : (
                        <>
                          <TrendingDownIcon fontSize="small" color="error" />
                          <Typography variant="body2">Düşerse</Typography>
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
                      {alert.price.toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} TRY
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {currentPrice ? (
                      <Typography variant="body2">
                        {currentPrice.toLocaleString('tr-TR', {
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
                        title={`Tetiklemeden %${distance.percent.toFixed(1)} ${distance.direction === 'up' ? 'yukarıda' : 'aşağıda'}`}
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
                      aria-label="Düzenle"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(alert)}
                      disabled={loading}
                      color="error"
                      aria-label="Sil"
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
          Uyarıyı Düzenle
          <IconButton
            aria-label="close"
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
                {selectedAlert.symbol.replace('_', '/')} için uyarı düzenleniyor
              </Alert>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Koşul</InputLabel>
                <Select
                  value={editCondition}
                  label="Koşul"
                  onChange={(e) => setEditCondition(e.target.value as AlertCondition)}
                >
                  <MenuItem value={AlertCondition.ABOVE}>Fiyat Yükselirse</MenuItem>
                  <MenuItem value={AlertCondition.BELOW}>Fiyat Düşerse</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Hedef Fiyat (TRY)"
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
          <Button onClick={() => setEditDialogOpen(false)}>İptal</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={loading}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Uyarıyı Sil</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Typography>
              {selectedAlert.symbol.replace('_', '/')} için oluşturulan{' '}
              {selectedAlert.price.toLocaleString('tr-TR')} TRY fiyat uyarısını silmek istediğinizden
              emin misiniz?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={loading}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AlertsList;
