/**
 * Reset Password Page (Container)
 * Connects ResetPasswordForm to Redux store
 * Extracts token from URL query parameter
 */

import React, { useEffect } from 'react';
import { Box, Container, Paper, Typography, Button, Alert } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import {
  confirmPasswordReset,
  resetPasswordResetConfirm,
  selectPasswordResetConfirmLoading,
  selectPasswordResetConfirmSuccess,
  selectPasswordResetConfirmError,
} from '../store/slices/authSlice';
import ResetPasswordForm from '../components/auth/ResetPasswordForm';
import { ResetPasswordFormData } from '../types/auth.types';

const ResetPasswordPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const loading = useAppSelector(selectPasswordResetConfirmLoading);
  const success = useAppSelector(selectPasswordResetConfirmSuccess);
  const error = useAppSelector(selectPasswordResetConfirmError);

  // Reset state on component mount
  useEffect(() => {
    dispatch(resetPasswordResetConfirm());
  }, [dispatch]);

  // Handle form submission
  const handleSubmit = (data: ResetPasswordFormData) => {
    if (token) {
      dispatch(confirmPasswordReset({
        token,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      }));
    }
  };

  // If no token in URL, show error
  if (!token) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          px: 2,
          bgcolor: 'grey.50',
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{
              p: { xs: 3, sm: 4 },
              width: '100%',
              maxWidth: 440,
              mx: 'auto',
              textAlign: 'center',
            }}
          >
            <Typography
              component="h1"
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Geçersiz Bağlantı
            </Typography>

            <Alert
              severity="error"
              sx={{ mb: 3, textAlign: 'left' }}
            >
              Şifre sıfırlama bağlantısı geçersiz veya eksik. Lütfen e-postanızdaki bağlantıya tıklayın veya yeni bir şifre sıfırlama isteği gönderin.
            </Alert>

            <Button
              component={RouterLink}
              to="/forgot-password"
              variant="contained"
              fullWidth
              sx={{ mb: 2 }}
            >
              Yeni Sıfırlama İsteği Gönder
            </Button>

            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              fullWidth
            >
              Giriş Sayfasına Dön
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        bgcolor: 'grey.50',
      }}
    >
      <Container maxWidth="sm">
        <ResetPasswordForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          success={success}
        />
      </Container>
    </Box>
  );
};

export default ResetPasswordPage;
