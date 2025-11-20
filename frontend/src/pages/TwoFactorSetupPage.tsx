/**
 * Two-Factor Authentication Setup Page
 * Multi-step wizard for enabling 2FA
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setup2FA,
  verifySetup2FA,
  select2FASetupData,
  select2FABackupCodes,
  select2FALoading,
  select2FAError,
  clear2FAError,
  clearBackupCodes,
} from '../store/slices/authSlice';
import QRCodeDisplay from '../components/auth/QRCodeDisplay';
import BackupCodesDisplay from '../components/auth/BackupCodesDisplay';

const steps = ['QR Kodu Tara', 'Kodu Dogrula', 'Yedek Kodlar'];

const TwoFactorSetupPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const setupData = useAppSelector(select2FASetupData);
  const backupCodes = useAppSelector(select2FABackupCodes);
  const loading = useAppSelector(select2FALoading);
  const error = useAppSelector(select2FAError);

  const [activeStep, setActiveStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Initialize setup on mount
  useEffect(() => {
    dispatch(setup2FA());
    return () => {
      dispatch(clear2FAError());
    };
  }, [dispatch]);

  // Move to backup codes step when verification succeeds
  useEffect(() => {
    if (backupCodes && activeStep === 1) {
      setActiveStep(2);
      toast.success('2FA basariyla etkinlestirildi!');
    }
  }, [backupCodes, activeStep]);

  // Handle verification code input
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
    setCodeError(null);

    // Auto-submit when 6 digits entered
    if (value.length === 6 && setupData?.setupToken) {
      handleVerify(value);
    }
  };

  // Handle verification
  const handleVerify = useCallback(async (code: string) => {
    if (!setupData?.setupToken) return;

    if (code.length !== 6) {
      setCodeError('Dogrulama kodu 6 haneli olmalidir.');
      return;
    }

    dispatch(verifySetup2FA({ setupToken: setupData.setupToken, code }));
  }, [dispatch, setupData]);

  // Handle step navigation
  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep(1);
    } else if (activeStep === 1 && verificationCode.length === 6) {
      handleVerify(verificationCode);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
      setVerificationCode('');
      setCodeError(null);
    }
  };

  // Handle setup completion
  const handleComplete = () => {
    dispatch(clearBackupCodes());
    navigate('/settings/2fa');
  };

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        // QR Code Step
        if (loading && !setupData) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          );
        }

        if (setupData) {
          return (
            <Box>
              <QRCodeDisplay
                qrCode={setupData.qrCode}
                secret={setupData.secret}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleNext}
                sx={{ mt: 3 }}
              >
                Devam Et
              </Button>
            </Box>
          );
        }

        return null;

      case 1:
        // Verification Code Step
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Authenticator uygulamanizda goruntulenen 6 haneli kodu girin.
            </Typography>

            <TextField
              fullWidth
              label="Dogrulama Kodu"
              value={verificationCode}
              onChange={handleCodeChange}
              error={!!codeError || !!error}
              helperText={codeError || error}
              disabled={loading}
              inputProps={{
                maxLength: 6,
                pattern: '[0-9]*',
                inputMode: 'numeric',
                autoComplete: 'one-time-code',
                'aria-label': 'Dogrulama kodu',
              }}
              autoFocus
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={loading}
                sx={{ flex: 1 }}
              >
                Geri
              </Button>
              <Button
                variant="contained"
                onClick={() => handleVerify(verificationCode)}
                disabled={loading || verificationCode.length !== 6}
                sx={{ flex: 1 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Dogrula'
                )}
              </Button>
            </Box>
          </Box>
        );

      case 2:
        // Backup Codes Step
        if (backupCodes) {
          return (
            <BackupCodesDisplay
              codes={backupCodes}
              onConfirm={handleComplete}
              showConfirmation={true}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

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
          <Typography
            component="h1"
            variant="h5"
            align="center"
            gutterBottom
            sx={{ fontWeight: 600, mb: 3 }}
          >
            Iki Faktorlu Kimlik Dogrulama Kurulumu
          </Typography>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Alert */}
          {error && activeStep !== 1 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Step Content */}
          {renderStepContent()}
        </Paper>
      </Box>
    </Container>
  );
};

export default TwoFactorSetupPage;
