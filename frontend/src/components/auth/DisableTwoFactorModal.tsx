/**
 * Disable Two-Factor Authentication Modal
 * Confirmation dialog for disabling 2FA
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
  Warning as WarningIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  disable2FA,
  select2FALoading,
  select2FAError,
  clear2FAError,
} from '../../store/slices/authSlice';

interface DisableTwoFactorModalProps {
  open: boolean;
  onClose: () => void;
}

const DisableTwoFactorModal: React.FC<DisableTwoFactorModalProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(select2FALoading);
  const error = useAppSelector(select2FAError);

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPassword('');
      setCode('');
      setShowPassword(false);
      setLocalError(null);
      dispatch(clear2FAError());
    }
  }, [open, dispatch]);

  // Handle password input
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setLocalError(null);
  };

  // Handle code input
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setLocalError(null);
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle disable
  const handleDisable = async () => {
    // Validate inputs
    if (!password) {
      setLocalError('Sifre gereklidir.');
      return;
    }

    if (code.length !== 6) {
      setLocalError('Dogrulama kodu 6 haneli olmalidir.');
      return;
    }

    const result = await dispatch(disable2FA({ password, code }));

    if (disable2FA.fulfilled.match(result)) {
      toast.success('2FA basariyla devre disi birakildi.');
      onClose();
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleDisable();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="disable-2fa-dialog-title"
    >
      <DialogTitle id="disable-2fa-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          <Typography variant="h6" component="span">
            2FA'yi Devre Disi Birak
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {/* Warning */}
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              2FA'yi devre disi birakmak hesabinizin guvenligini azaltir.
              Sadece gerekli durumlarda devre disi birakin.
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
            label="Sifre"
            value={password}
            onChange={handlePasswordChange}
            disabled={loading}
            required
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Sifreyi gizle' : 'Sifreyi goster'}
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
              'aria-label': 'Sifre',
            }}
            sx={{ mb: 2 }}
          />

          {/* 2FA Code Input */}
          <TextField
            fullWidth
            label="Dogrulama Kodu"
            value={code}
            onChange={handleCodeChange}
            disabled={loading}
            required
            inputProps={{
              maxLength: 6,
              pattern: '[0-9]*',
              inputMode: 'numeric',
              autoComplete: 'one-time-code',
              'aria-label': 'Dogrulama kodu',
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={loading}>
            Iptal
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={loading || !password || code.length !== 6}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Devre Disi Birak'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default DisableTwoFactorModal;
