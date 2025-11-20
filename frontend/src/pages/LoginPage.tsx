/**
 * Login Page Container Component
 * Connects LoginForm to Redux store and handles navigation
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import { toast } from 'react-toastify';
import LoginForm from '../components/auth/LoginForm';
import { useAppDispatch, useAppSelector } from '../store';
import {
  loginUser,
  selectAuthLoading,
  selectAuthError,
  selectLoginSuccess,
  selectIsAuthenticated,
  clearError,
  resetLogin,
} from '../store/slices/authSlice';
import { LoginFormData } from '../types/auth.types';

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Select state from Redux
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const loginSuccess = useAppSelector(selectLoginSuccess);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle successful login
  useEffect(() => {
    if (loginSuccess) {
      toast.success('Giris basarili! Hosgeldiniz.', {
        position: 'top-right',
        autoClose: 3000,
      });
      // Reset login state and navigate
      dispatch(resetLogin());
      navigate('/dashboard', { replace: true });
    }
  }, [loginSuccess, dispatch, navigate]);

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
      dispatch(resetLogin());
    };
  }, [dispatch]);

  // Handle form submission
  const handleSubmit = (data: LoginFormData) => {
    dispatch(
      loginUser({
        email: data.email,
        password: data.password,
      })
    );

    // Handle "Remember me" - store preference in localStorage
    if (data.rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberedEmail', data.email);
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberedEmail');
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
        <LoginForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </Box>
    </Container>
  );
};

export default LoginPage;
