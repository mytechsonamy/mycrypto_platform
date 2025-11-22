/**
 * Verification Pending Component
 * Shows "check your email" message after registration
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
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import SendIcon from '@mui/icons-material/Send';

interface VerificationPendingProps {
  email: string | null;
  onResend: (email: string) => void;
  resendLoading: boolean;
  resendSuccess: boolean;
  resendError: string | null;
}

const VerificationPending: React.FC<VerificationPendingProps> = ({
  email,
  onResend,
  resendLoading,
  resendSuccess,
  resendError,
}) => {
  const [inputEmail, setInputEmail] = useState(email || '');
  const [emailError, setEmailError] = useState<string | null>(null);

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
      role="region"
      aria-labelledby="verification-pending-title"
    >
      <MarkEmailReadIcon
        sx={{ fontSize: 64, color: 'primary.main', mb: 2 }}
        aria-hidden="true"
      />

      <Typography
        id="verification-pending-title"
        component="h1"
        variant="h5"
        gutterBottom
        sx={{ fontWeight: 600 }}
      >
        E-posta Doğrulaması
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        Doğrulama bağlantısı e-posta adresinize gönderildi.
      </Typography>

      {email && (
        <Typography
          variant="body1"
          sx={{ mb: 2, fontWeight: 500 }}
        >
          {email}
        </Typography>
      )}

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Lütfen e-postanızı kontrol edin. E-posta gelmediyse, spam/istenmeyen klasörünüzü kontrol edin.
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
          variant="outlined"
          color="primary"
          onClick={handleResend}
          disabled={resendLoading || resendSuccess}
          startIcon={resendLoading ? <CircularProgress size={20} /> : <SendIcon />}
          aria-label="Doğrulama e-postasını tekrar gönder"
          fullWidth
        >
          {resendLoading ? 'Gönderiliyor...' : 'Tekrar Gönder'}
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

export default VerificationPending;
