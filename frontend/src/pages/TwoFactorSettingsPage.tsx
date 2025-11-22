/**
 * Two-Factor Authentication Settings Page
 * Manage 2FA settings including enable/disable and backup codes
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import {
  get2FAStatus,
  select2FAEnabled,
  select2FAStatus,
  select2FALoading,
  select2FAError,
  clear2FAError,
} from '../store/slices/authSlice';
import DisableTwoFactorModal from '../components/auth/DisableTwoFactorModal';
import RegenerateBackupCodesModal from '../components/auth/RegenerateBackupCodesModal';

const TwoFactorSettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isEnabled = useAppSelector(select2FAEnabled);
  const status = useAppSelector(select2FAStatus);
  const loading = useAppSelector(select2FALoading);
  const error = useAppSelector(select2FAError);

  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);

  // Fetch 2FA status on mount
  useEffect(() => {
    dispatch(get2FAStatus());
    return () => {
      dispatch(clear2FAError());
    };
  }, [dispatch]);

  // Handle enable 2FA
  const handleEnable = () => {
    navigate('/settings/2fa/setup');
  };

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !status) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SecurityIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
            <Typography
              component="h1"
              variant="h5"
              sx={{ fontWeight: 600 }}
            >
              İki Faktörlü Kimlik Doğrulama
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Status Section */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mr: 2 }}>
                Durum:
              </Typography>
              <Chip
                icon={isEnabled ? <CheckCircleIcon /> : <WarningIcon />}
                label={isEnabled ? 'Etkin' : 'Devre Dışı'}
                color={isEnabled ? 'success' : 'default'}
                size="small"
              />
            </Box>

            {isEnabled && status && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Etkinleştirme tarihi: {formatDate(status.enabledAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Kalan yedek kod: {status.backupCodesRemaining}
                </Typography>
              </>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Actions */}
          {isEnabled ? (
            <Box>
              {/* Warning for low backup codes */}
              {status && status.backupCodesRemaining <= 3 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  Kalan yedek kod sayınız düşük. Yeni kodlar oluşturmanızı öneririz.
                </Alert>
              )}

              {/* Regenerate Backup Codes */}
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setRegenerateModalOpen(true)}
                sx={{ mb: 2 }}
              >
                Yedek Kodları Yenile
              </Button>

              {/* Disable 2FA */}
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => setDisableModalOpen(true)}
              >
                2FA'yı Devre Dışı Bırak
              </Button>

              {/* Description */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 3, textAlign: 'center' }}
              >
                2FA hesabınızı daha güvenli hale getirir. Devre dışı bırakmanız
                önerilmez.
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Enable 2FA */}
              <Alert severity="info" sx={{ mb: 3 }}>
                İki faktörlü kimlik doğrulama, hesabınıza ek bir güvenlik katmanı
                ekler. Etkinleştirmeniz şiddetle önerilir.
              </Alert>

              <Button
                variant="contained"
                fullWidth
                onClick={handleEnable}
                size="large"
              >
                2FA'yı Etkinleştir
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Modals */}
      <DisableTwoFactorModal
        open={disableModalOpen}
        onClose={() => setDisableModalOpen(false)}
      />

      <RegenerateBackupCodesModal
        open={regenerateModalOpen}
        onClose={() => setRegenerateModalOpen(false)}
      />
    </Container>
  );
};

export default TwoFactorSettingsPage;
