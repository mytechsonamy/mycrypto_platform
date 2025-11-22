/**
 * Password Strength Indicator Component
 * Shows visual feedback on password strength with checklist
 */

import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { PasswordValidation, PasswordStrength } from '../../types/auth.types';

interface PasswordStrengthIndicatorProps {
  validation: PasswordValidation;
  show: boolean;
}

// Strength colors and labels
const STRENGTH_CONFIG: Record<PasswordStrength, { color: 'error' | 'warning' | 'success'; label: string; value: number }> = {
  weak: { color: 'error', label: 'Zayıf', value: 33 },
  medium: { color: 'warning', label: 'Orta', value: 66 },
  strong: { color: 'success', label: 'Güçlü', value: 100 },
};

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  validation,
  show,
}) => {
  if (!show) {
    return null;
  }

  const strengthConfig = STRENGTH_CONFIG[validation.strength];

  const requirements = [
    { met: validation.hasMinLength, label: 'En az 8 karakter' },
    { met: validation.hasUppercase, label: 'En az 1 büyük harf' },
    { met: validation.hasNumber, label: 'En az 1 rakam' },
    { met: validation.hasSpecialChar, label: 'En az 1 özel karakter (!@#$%^&*)' },
  ];

  return (
    <Box
      sx={{ mt: 1, mb: 2 }}
      role="region"
      aria-label="Şifre güç göstergesi"
      data-testid="password-strength-indicator"
    >
      {/* Strength bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ flexGrow: 1, mr: 1 }}>
          <LinearProgress
            variant="determinate"
            value={strengthConfig.value}
            color={strengthConfig.color}
            sx={{ height: 8, borderRadius: 4 }}
            aria-label={`Şifre gücü: ${strengthConfig.label}`}
            className={`strength-${validation.strength}`}
            data-testid="password-strength-bar"
          />
        </Box>
        <Typography
          variant="body2"
          color={`${strengthConfig.color}.main`}
          sx={{ minWidth: 50, fontWeight: 500 }}
          data-testid="password-strength-label"
        >
          {strengthConfig.label}
        </Typography>
      </Box>

      {/* Requirements checklist */}
      <List dense disablePadding>
        {requirements.map((req, index) => (
          <ListItem
            key={index}
            disablePadding
            sx={{ py: 0.25 }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              {req.met ? (
                <CheckCircleIcon
                  color="success"
                  fontSize="small"
                  aria-hidden="true"
                />
              ) : (
                <CancelIcon
                  color="error"
                  fontSize="small"
                  aria-hidden="true"
                />
              )}
            </ListItemIcon>
            <ListItemText
              primary={req.label}
              primaryTypographyProps={{
                variant: 'body2',
                color: req.met ? 'success.main' : 'text.secondary',
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default PasswordStrengthIndicator;
