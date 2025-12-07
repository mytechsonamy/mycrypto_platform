/**
 * Create Alert Form Component
 * Form for creating new price alerts with validation
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Select,
  InputLabel,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { AddAlert as AddAlertIcon } from '@mui/icons-material';
import {
  AlertCondition,
  NotificationType,
  AlertFormData,
  MAX_PRICE_DEVIATION_PERCENT,
} from '../../types/alerts.types';
import { TRADING_PAIRS } from '../../types/trading.types';

interface CreateAlertFormProps {
  onSubmit: (data: AlertFormData) => void;
  loading: boolean;
  error: string | null;
  currentPrices: { [symbol: string]: number };
  activeAlertsCount: number;
  maxAlerts: number;
}

const CreateAlertForm: React.FC<CreateAlertFormProps> = ({
  onSubmit,
  loading,
  error,
  currentPrices,
  activeAlertsCount,
  maxAlerts,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AlertFormData>({
    symbol: 'BTC_TRY',
    condition: AlertCondition.ABOVE,
    price: '',
    notificationType: NotificationType.BOTH,
    isActive: true,
  });

  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  // Validate price
  const validatePrice = (symbol: string, price: string): string | null => {
    const priceNum = parseFloat(price);
    const currentPrice = currentPrices[symbol];

    if (!price || price.trim() === '') {
      return t('alerts.validation.enterPrice');
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      return t('alerts.validation.invalidPrice');
    }

    if (!currentPrice) {
      return t('alerts.validation.priceNotAvailable');
    }

    // Check if price is within acceptable range (within 50% of current price)
    const deviation = Math.abs(priceNum - currentPrice) / currentPrice * 100;
    if (deviation > MAX_PRICE_DEVIATION_PERCENT) {
      return t('alerts.validation.priceOutOfRange', { percent: MAX_PRICE_DEVIATION_PERCENT });
    }

    return null;
  };

  // Handle form field changes
  const handleChange = (
    field: keyof AlertFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle notification type checkbox changes
  const handleNotificationChange = (type: 'email' | 'inApp') => {
    const currentType = formData.notificationType;

    if (type === 'email') {
      if (currentType === NotificationType.EMAIL) {
        setFormData((prev) => ({
          ...prev,
          notificationType: NotificationType.IN_APP,
        }));
      } else if (currentType === NotificationType.IN_APP) {
        setFormData((prev) => ({
          ...prev,
          notificationType: NotificationType.BOTH,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          notificationType: NotificationType.IN_APP,
        }));
      }
    } else {
      if (currentType === NotificationType.IN_APP) {
        setFormData((prev) => ({
          ...prev,
          notificationType: NotificationType.EMAIL,
        }));
      } else if (currentType === NotificationType.EMAIL) {
        setFormData((prev) => ({
          ...prev,
          notificationType: NotificationType.BOTH,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          notificationType: NotificationType.EMAIL,
        }));
      }
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const errors: { [key: string]: string } = {};

    const priceError = validatePrice(formData.symbol, formData.price);
    if (priceError) {
      errors.price = priceError;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Submit form
    onSubmit(formData);

    // Reset form after successful submission
    setFormData({
      symbol: 'BTC_TRY',
      condition: AlertCondition.ABOVE,
      price: '',
      notificationType: NotificationType.BOTH,
      isActive: true,
    });
  };

  const currentPrice = currentPrices[formData.symbol];
  const isEmailChecked =
    formData.notificationType === NotificationType.EMAIL ||
    formData.notificationType === NotificationType.BOTH;
  const isInAppChecked =
    formData.notificationType === NotificationType.IN_APP ||
    formData.notificationType === NotificationType.BOTH;

  const canCreateAlert = activeAlertsCount < maxAlerts;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddAlertIcon />
        {t('alerts.createAlert')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!canCreateAlert && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('alerts.maxAlertsWarning', { max: maxAlerts })}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="symbol-label">{t('alerts.form.symbol')}</InputLabel>
        <Select
          labelId="symbol-label"
          id="symbol-select"
          value={formData.symbol}
          label={t('alerts.form.symbol')}
          onChange={(e) => handleChange('symbol', e.target.value)}
          disabled={loading}
        >
          {TRADING_PAIRS.map((pair) => (
            <MenuItem key={pair} value={pair}>
              {pair.replace('_', '/')}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {currentPrice && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('alerts.form.currentPriceValue', { price: currentPrice.toLocaleString() })}
        </Typography>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="condition-label">{t('alerts.form.condition')}</InputLabel>
        <Select
          labelId="condition-label"
          id="condition-select"
          value={formData.condition}
          label={t('alerts.form.condition')}
          onChange={(e) => handleChange('condition', e.target.value)}
          disabled={loading}
        >
          <MenuItem value={AlertCondition.ABOVE}>{t('alerts.form.priceRises')}</MenuItem>
          <MenuItem value={AlertCondition.BELOW}>{t('alerts.form.priceFalls')}</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label={t('alerts.form.targetPriceTry')}
        type="number"
        value={formData.price}
        onChange={(e) => handleChange('price', e.target.value)}
        error={!!validationErrors.price}
        helperText={validationErrors.price || t('alerts.form.priceHint')}
        disabled={loading}
        sx={{ mb: 2 }}
        inputProps={{
          step: '0.01',
          min: '0',
        }}
      />

      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">{t('alerts.form.notificationType')}</FormLabel>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={isEmailChecked}
                onChange={() => handleNotificationChange('email')}
                disabled={loading}
              />
            }
            label={t('alerts.form.email')}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isInAppChecked}
                onChange={() => handleNotificationChange('inApp')}
                disabled={loading}
              />
            }
            label={t('alerts.form.inApp')}
          />
        </FormGroup>
      </FormControl>

      <FormControlLabel
        control={
          <Checkbox
            checked={formData.isActive}
            onChange={(e) => handleChange('isActive', e.target.checked)}
            disabled={loading}
          />
        }
        label={t('alerts.form.createActiveAlert')}
        sx={{ mb: 2, display: 'block' }}
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading || !canCreateAlert}
        startIcon={loading ? <CircularProgress size={20} /> : <AddAlertIcon />}
      >
        {loading ? t('alerts.form.creating') : t('alerts.form.create')}
      </Button>
    </Box>
  );
};

export default CreateAlertForm;
