/**
 * Regenerate Backup Codes Modal
 * Modal for generating new backup codes
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  regenerateBackupCodes,
  select2FABackupCodes,
  select2FALoading,
  select2FAError,
  clear2FAError,
  clearBackupCodes,
} from '../../store/slices/authSlice';
import BackupCodesDisplay from './BackupCodesDisplay';

interface RegenerateBackupCodesModalProps {
  open: boolean;
  onClose: () => void;
}

const RegenerateBackupCodesModal: React.FC<RegenerateBackupCodesModalProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const backupCodes = useAppSelector(select2FABackupCodes);
  const loading = useAppSelector(select2FALoading);
  const error = useAppSelector(select2FAError);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState<'password' | 'codes'>('password');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPassword(false);
      setLocalError(null);
      setStep('password');
      dispatch(clear2FAError());
      dispatch(clearBackupCodes());
    }
  }, [open, dispatch]);

  // Move to codes step when backup codes are received
  useEffect(() => {
    if (backupCodes && step === 'password') {
      setStep('codes');
      toast.success('Yeni yedek kodlar oluşturuldu!');
    }
  }, [backupCodes, step]);

  // Handle password input
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setLocalError(null);
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle regenerate
  const handleRegenerate = async () => {
    if (!password) {
      setLocalError('Şifre gereklidir.');
      return;
    }

    dispatch(regenerateBackupCodes(password));
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRegenerate();
  };

  // Handle close
  const handleClose = () => {
    dispatch(clearBackupCodes());
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="regenerate-codes-dialog-title"
    >
      <DialogTitle id="regenerate-codes-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RefreshIcon color="primary" />
          <Typography variant="h6" component="span">
            Yedek Kodları Yenile
          </Typography>
        </Box>
      </DialogTitle>

      {step === 'password' ? (
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {/* Warning */}
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Yeni kodlar oluşturulunca eski kodlar geçersiz olacak.
                Yeni kodları güvenli bir yere kaydettiğinizden emin olun.
              </Typography>
            </Alert>

            {/* Error Alert */}
            {(error || localError) && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error || localError}
              </Alert>
            )}

            {/* Password Input */}
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Şifre"
              value={password}
              onChange={handlePasswordChange}
              disabled={loading}
              required
              autoComplete="current-password"
              autoFocus
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      onClick={togglePasswordVisibility}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              inputProps={{
                'aria-label': 'Şifre',
              }}
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleClose} disabled={loading}>
              İptal
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !password}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Kodları Yenile'
              )}
            </Button>
          </DialogActions>
        </form>
      ) : (
        <>
          <DialogContent>
            {backupCodes && (
              <BackupCodesDisplay
                codes={backupCodes}
                showConfirmation={false}
              />
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              variant="contained"
              onClick={handleClose}
              fullWidth
            >
              Tamam
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default RegenerateBackupCodesModal;
