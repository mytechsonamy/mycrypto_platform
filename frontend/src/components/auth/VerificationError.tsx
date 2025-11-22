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
        return 'Doğrulama bağlantısının süresi dolmuş. Lütfen yeni bir bağlantı isteyin.';
      case 'invalid':
        return 'Geçersiz doğrulama bağlantısı. Lütfen yeni bir bağlantı isteyin.';
      default:
        return 'Doğrulama sırasında bir hata oluştu. Lütfen tekrar deneyin.';
    }
  };

  const getErrorTitle = (): string => {
    switch (errorType) {
      case 'expired':
        return 'Bağlantı Süresi Doldu';
      case 'invalid':
        return 'Geçersiz Bağlantı';
      default:
        return 'Doğrulama Hatası';
    }
  };

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('E-posta adresi gereklidir.');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Geçerli bir e-posta adresi girin.');
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
          Doğrulama e-postası yeniden gönderildi.
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
          aria-label="Yeni doğrulama bağlantısı gönder"
          fullWidth
        >
          {resendLoading ? 'Gönderiliyor...' : 'Yeni Bağlantı Gönder'}
        </Button>
      </Box>

      <Button
        variant="text"
        color="primary"
        href="/register"
        aria-label="Kayıt sayfasına geri dön"
      >
        Geri Dön
      </Button>
    </Paper>
  );
};

export default VerificationError;
