/**
 * Forgot Password Page (Container)
 * Connects ForgotPasswordForm to Redux store
 */

import React, { useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store';
import {
  requestPasswordReset,
  resetPasswordResetRequest,
  selectPasswordResetRequestLoading,
  selectPasswordResetRequestSuccess,
  selectPasswordResetRequestError,
} from '../store/slices/authSlice';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';
import { ForgotPasswordFormData } from '../types/auth.types';

const ForgotPasswordPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectPasswordResetRequestLoading);
  const success = useAppSelector(selectPasswordResetRequestSuccess);
  const error = useAppSelector(selectPasswordResetRequestError);

  // Reset state on component mount
  useEffect(() => {
    dispatch(resetPasswordResetRequest());
  }, [dispatch]);

  // Handle form submission
  const handleSubmit = (data: ForgotPasswordFormData) => {
    dispatch(requestPasswordReset(data.email));
  };

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
        <ForgotPasswordForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          success={success}
        />
      </Container>
    </Box>
  );
};

export default ForgotPasswordPage;
