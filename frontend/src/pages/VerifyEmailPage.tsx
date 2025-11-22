/**
 * Verify Email Page Container Component
 * Handles email verification flow with token from URL
 */

import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../store';
import {
  verifyEmail,
  resendVerification,
  selectUser,
  selectVerificationStatus,
  selectVerificationError,
  selectResendLoading,
  selectResendSuccess,
  setVerificationPending,
  resetVerification,
  clearResendSuccess,
} from '../store/slices/authSlice';
import VerificationPending from '../components/auth/VerificationPending';
import VerificationProcessing from '../components/auth/VerificationProcessing';
import VerificationSuccess from '../components/auth/VerificationSuccess';
import VerificationError from '../components/auth/VerificationError';
import { selectVerification } from '../store/slices/authSlice';

const VerifyEmailPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Select state from Redux
  const user = useAppSelector(selectUser);
  const verificationStatus = useAppSelector(selectVerificationStatus);
  const verificationError = useAppSelector(selectVerificationError);
  const verification = useAppSelector(selectVerification);
  const resendLoading = useAppSelector(selectResendLoading);
  const resendSuccess = useAppSelector(selectResendSuccess);

  // Handle token verification on mount
  useEffect(() => {
    if (token) {
      // Token present - start verification
      dispatch(verifyEmail(token));
    } else {
      // No token - show pending state
      dispatch(setVerificationPending());
    }
  }, [token, dispatch]);

  // Handle resend success toast
  useEffect(() => {
    if (resendSuccess) {
      toast.success('Doğrulama e-postası yeniden gönderildi.', {
        position: 'top-right',
        autoClose: 5000,
      });
      // Clear success after showing toast
      const timeout = setTimeout(() => {
        dispatch(clearResendSuccess());
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [resendSuccess, dispatch]);

  // Handle resend error toast
  useEffect(() => {
    if (verification.resendError) {
      toast.error(verification.resendError, {
        position: 'top-right',
        autoClose: 5000,
      });
    }
  }, [verification.resendError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      dispatch(resetVerification());
    };
  }, [dispatch]);

  // Handle resend verification
  const handleResend = (email: string) => {
    dispatch(resendVerification(email));
  };

  // Determine error type for error component
  const getErrorType = (): 'invalid' | 'expired' | 'generic' => {
    if (verificationError === 'expired') {
      return 'expired';
    }
    if (verificationError === 'invalid') {
      return 'invalid';
    }
    return 'generic';
  };

  // Render appropriate component based on verification status
  const renderContent = () => {
    switch (verificationStatus) {
      case 'verifying':
        return <VerificationProcessing />;

      case 'success':
        return <VerificationSuccess />;

      case 'error':
        return (
          <VerificationError
            errorType={getErrorType()}
            email={user?.email || null}
            onResend={handleResend}
            resendLoading={resendLoading}
            resendSuccess={resendSuccess}
            resendError={verification.resendError}
          />
        );

      case 'pending':
      case 'idle':
      default:
        return (
          <VerificationPending
            email={user?.email || null}
            onResend={handleResend}
            resendLoading={resendLoading}
            resendSuccess={resendSuccess}
            resendError={verification.resendError}
          />
        );
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: { xs: 4, sm: 8 },
        }}
      >
        {renderContent()}
      </Box>
    </Container>
  );
};

export default VerifyEmailPage;
