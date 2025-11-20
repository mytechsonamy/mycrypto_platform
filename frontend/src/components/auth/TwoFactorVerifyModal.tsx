/**
 * Two-Factor Verification Modal
 * Modal for 2FA verification during login
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  verify2FA,
  select2FALoading,
  select2FAError,
  clear2FAError,
} from '../../store/slices/authSlice';

interface TwoFactorVerifyModalProps {
  open: boolean;
  challengeToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TIMEOUT_DURATION = 5 * 60; // 5 minutes in seconds

const TwoFactorVerifyModal: React.FC<TwoFactorVerifyModalProps> = ({
  open,
  challengeToken,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(select2FALoading);
  const error = useAppSelector(select2FAError);

  const [code, setCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_DURATION);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCode('');
      setIsBackupCode(false);
      setTimeRemaining(TIMEOUT_DURATION);
      setCodeError(null);
      dispatch(clear2FAError());
    }
  }, [open, dispatch]);

  // Countdown timer
  useEffect(() => {
    if (!open) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onClose]);

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle code input
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (isBackupCode) {
      // Allow alphanumeric and hyphens for backup codes
      value = value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 11);
    } else {
      // Only digits for TOTP codes
      value = value.replace(/\D/g, '').slice(0, 6);
    }

    setCode(value);
    setCodeError(null);

    // Auto-submit when code is complete
    const expectedLength = isBackupCode ? 11 : 6;
    if (value.length === expectedLength) {
      handleVerify(value);
    }
  };

  // Handle verification
  const handleVerify = useCallback(async (verificationCode: string) => {
    if (!challengeToken) return;

    const expectedLength = isBackupCode ? 11 : 6;
    if (verificationCode.length !== expectedLength) {
      setCodeError(
        isBackupCode
          ? 'Yedek kod 11 karakter olmalidir.'
          : 'Dogrulama kodu 6 haneli olmalidir.'
      );
      return;
    }

    const result = await dispatch(verify2FA({ challengeToken, code: verificationCode }));

    if (verify2FA.fulfilled.match(result)) {
      onSuccess();
    }
  }, [dispatch, challengeToken, isBackupCode, onSuccess]);

  // Toggle between TOTP and backup code
  const handleToggleBackupCode = () => {
    setIsBackupCode(!isBackupCode);
    setCode('');
    setCodeError(null);
    dispatch(clear2FAError());
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(code);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="2fa-dialog-title"
    >
      <DialogTitle id="2fa-dialog-title" sx={{ pb: 1 }}>
        <Typography variant="h6" component="span">
          Iki Faktorlu Dogrulama
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {/* Timer */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography
              variant="body2"
              color={timeRemaining < 60 ? 'error' : 'text.secondary'}
            >
              Kalan sure: {formatTime(timeRemaining)}
            </Typography>
          </Box>

          {/* Instructions */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isBackupCode
              ? 'Yedek kodlarinizdan birini girin.'
              : 'Authenticator uygulamanizda goruntulenen 6 haneli kodu girin.'}
          </Typography>

          {/* Error Alert */}
          {(error || codeError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || codeError}
            </Alert>
          )}

          {/* Code Input */}
          <TextField
            fullWidth
            label={isBackupCode ? 'Yedek Kod' : 'Dogrulama Kodu'}
            value={code}
            onChange={handleCodeChange}
            disabled={loading}
            inputProps={{
              maxLength: isBackupCode ? 11 : 6,
              pattern: isBackupCode ? '[A-Za-z0-9-]*' : '[0-9]*',
              inputMode: isBackupCode ? 'text' : 'numeric',
              autoComplete: 'one-time-code',
              'aria-label': isBackupCode ? 'Yedek kod' : 'Dogrulama kodu',
            }}
            autoFocus
            sx={{ mb: 2 }}
          />

          {/* Toggle Link */}
          <Box sx={{ textAlign: 'center' }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={handleToggleBackupCode}
              underline="hover"
              sx={{ cursor: 'pointer' }}
            >
              {isBackupCode ? 'Authenticator kodu kullan' : 'Yedek kod kullan'}
            </Link>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={loading}>
            Iptal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || code.length < (isBackupCode ? 11 : 6)}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Dogrula'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TwoFactorVerifyModal;
