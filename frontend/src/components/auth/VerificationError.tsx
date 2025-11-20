/**
 * Verification Error Component
 * Shows error message when verification fails
 */

import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import SendIcon from '@mui/icons-material/Send';

interface VerificationErrorProps {
  errorType: 'invalid' | 'expired' | 'generic';
  email: string | null;
  onResend: (email: string) => void;
  resendLoading: boolean;
  resendSuccess: boolean;
  resendError: string | null;
}

const VerificationError: React.FC<VerificationErrorProps> = ({
  errorType,
  email,
  onResend,
  resendLoading,
  resendSuccess,
  resendError,
}) => {
  const [inputEmail, setInputEmail] = useState(email || '');
  const [emailError, setEmailError] = useState<string | null>(null);

  const getErrorMessage = (): string => {
    switch (errorType) {
      case 'expired':
        return 'Dogrulama baglantisinin suresi dolmus. Lutfen yeni bir baglanti isteyin.';
      case 'invalid':
        return 'Gecersiz dogrulama baglantisi. Lutfen yeni bir baglanti isteyin.';
      default:
        return 'Dogrulama sirasinda bir hata olustu. Lutfen tekrar deneyin.';
    }
  };

  const getErrorTitle = (): string => {
    switch (errorType) {
      case 'expired':
        return 'Baglanti Suresi Doldu';
      case 'invalid':
        return 'Gecersiz Baglanti';
      default:
        return 'Dogrulama Hatasi';
    }
  };

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('E-posta adresi gereklidir.');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Gecerli bir e-posta adresi girin.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleResend = () => {
    if (validateEmail(inputEmail)) {
      onResend(inputEmail);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
      }}
      role="alert"
      aria-labelledby="verification-error-title"
    >
      <ErrorIcon
        sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
        aria-hidden="true"
      />

      <Typography
        id="verification-error-title"
        component="h1"
        variant="h5"
        gutterBottom
        sx={{ fontWeight: 600, color: 'error.main' }}
      >
        {getErrorTitle()}
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        {getErrorMessage()}
      </Typography>

      {resendSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} role="status">
          Dogrulama e-postasi yeniden gonderildi.
        </Alert>
      )}

      {resendError && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {resendError}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          id="resend-email"
          label="E-posta Adresi"
          type="email"
          value={inputEmail}
          onChange={handleEmailChange}
          error={!!emailError}
          helperText={emailError}
          disabled={resendLoading}
          sx={{ mb: 2 }}
          inputProps={{
            'aria-describedby': emailError ? 'email-error' : undefined,
          }}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={handleResend}
          disabled={resendLoading || resendSuccess}
          startIcon={resendLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          aria-label="Yeni dogrulama baglantisi gonder"
          fullWidth
        >
          {resendLoading ? 'Gonderiliyor...' : 'Yeni Baglanti Gonder'}
        </Button>
      </Box>

      <Button
        variant="text"
        color="primary"
        href="/register"
        aria-label="Kayit sayfasina geri don"
      >
        Geri Don
      </Button>
    </Paper>
  );
};

export default VerificationError;
