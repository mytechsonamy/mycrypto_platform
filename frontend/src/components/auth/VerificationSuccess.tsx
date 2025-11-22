/**
 * Verification Success Component
 * Shows success message after email is verified
 */

import React from 'react';
import { Paper, Typography, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LoginIcon from '@mui/icons-material/Login';

const VerificationSuccess: React.FC = () => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
      }}
      role="status"
      aria-labelledby="verification-success-title"
      aria-live="polite"
    >
      <CheckCircleIcon
        sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
        aria-hidden="true"
      />

      <Typography
        id="verification-success-title"
        component="h1"
        variant="h5"
        gutterBottom
        sx={{ fontWeight: 600, color: 'success.main' }}
      >
        E-posta Doğrulandı!
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        E-posta adresiniz başarıyla doğrulandı. Artık giriş yapabilirsiniz.
      </Typography>

      <Button
        variant="contained"
        color="primary"
        href="/login"
        size="large"
        startIcon={<LoginIcon />}
        aria-label="Giriş sayfasına git"
        sx={{ px: 4 }}
      >
        Giriş Yap
      </Button>
    </Paper>
  );
};

export default VerificationSuccess;
