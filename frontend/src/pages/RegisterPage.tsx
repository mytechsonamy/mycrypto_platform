/**
 * Register Page Container Component
 * Connects RegisterForm to Redux store and handles navigation
 * Integrates Google reCAPTCHA v3 for bot protection
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import { toast } from 'react-toastify';
import RegisterForm from '../components/auth/RegisterForm';
import { useAppDispatch, useAppSelector } from '../store';
import {
  registerUser,
  selectAuthLoading,
  selectAuthError,
  selectRegistrationSuccess,
  clearError,
  resetRegistration,
} from '../store/slices/authSlice';
import { RegisterFormData } from '../types/auth.types';
import { useRecaptcha } from '../hooks/useRecaptcha';

const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // reCAPTCHA hook
  const { executeRecaptcha, isLoaded: recaptchaLoaded, error: recaptchaError } = useRecaptcha();

  // Local state for submission processing
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Select state from Redux
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const registrationSuccess = useAppSelector(selectRegistrationSuccess);

  // Show reCAPTCHA load error
  useEffect(() => {
    if (recaptchaError) {
      toast.warn(recaptchaError, {
        position: 'top-right',
        autoClose: 5000,
      });
    }
  }, [recaptchaError]);

  // Handle successful registration
  useEffect(() => {
    if (registrationSuccess) {
      toast.success('Kayit basarili! Lutfen e-posta adresinizi dogrulayin.', {
        position: 'top-right',
        autoClose: 5000,
      });
      // Reset registration state and navigate
      dispatch(resetRegistration());
      navigate('/verify-email');
    }
  }, [registrationSuccess, dispatch, navigate]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error, {
        position: 'top-right',
        autoClose: 5000,
      });
      // Clear error after showing toast
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(resetRegistration());
    };
  }, [dispatch]);

  // Handle form submission with reCAPTCHA
  const handleSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);

    try {
      // Execute reCAPTCHA and get token
      let recaptchaToken: string | undefined;

      try {
        recaptchaToken = await executeRecaptcha('register');
      } catch (recaptchaErr) {
        // Log the error but continue with registration
        // Backend will handle cases where token is missing
        console.warn('reCAPTCHA execution failed:', recaptchaErr);

        // Show warning but allow form submission (graceful fallback)
        toast.warn('reCAPTCHA dogrulamasi basarisiz oldu. Kayit deneniyor...', {
          position: 'top-right',
          autoClose: 3000,
        });
      }

      // Dispatch registration action with reCAPTCHA token
      dispatch(
        registerUser({
          email: data.email,
          password: data.password,
          acceptTerms: data.acceptTerms,
          acceptKvkk: data.acceptKvkk,
          recaptchaToken,
        })
      );
    } catch (err) {
      // Handle unexpected errors
      toast.error('Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.', {
        position: 'top-right',
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
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
        <RegisterForm
          onSubmit={handleSubmit}
          loading={loading || isSubmitting}
          error={error}
        />
      </Box>
    </Container>
  );
};

export default RegisterPage;
