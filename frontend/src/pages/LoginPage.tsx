/**
 * Login Page - Figma Design Implementation
 * Desktop and Mobile responsive login page with gradient branding
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../store';
import {
  loginUser,
  selectAuthLoading,
  selectAuthError,
  selectLoginSuccess,
  clearError,
  resetLogin,
} from '../store/slices/authSlice';
import { GRADIENTS, getColors } from '../theme/figmaTheme';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Redux state
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const loginSuccess = useAppSelector(selectLoginSuccess);

  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem('rememberMe');
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (remembered === 'true' && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Handle successful login
  useEffect(() => {
    if (loginSuccess) {
      toast.success(t('auth.login.loginSuccess'), {
        position: 'top-right',
        autoClose: 3000,
      });
      dispatch(resetLogin());
      navigate('/wallet', { replace: true });
    }
  }, [loginSuccess, dispatch, navigate, t]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error, {
        position: 'top-right',
        autoClose: 5000,
      });
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    dispatch(loginUser({ email, password }));

    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberedEmail');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: colors.darkBg,
      }}
    >
      {/* Left Panel - Branding (Desktop only) */}
      {!isMobile && (
        <Box
          sx={{
            width: '45%',
            background: GRADIENTS.primary,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            p: 8,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <Box
            sx={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -150,
              left: -150,
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            }}
          />

          {/* Logo and tagline */}
          <Typography
            variant="h1"
            sx={{
              color: colors.textWhite,
              fontSize: '48px',
              fontWeight: 700,
              mb: 2,
              position: 'relative',
            }}
          >
            MyCrypto
          </Typography>
          <Typography
            variant="h4"
            sx={{
              color: colors.textWhite,
              opacity: 0.8,
              fontSize: '24px',
              fontWeight: 400,
              position: 'relative',
            }}
          >
            {t('auth.branding.tagline')}
          </Typography>

          {/* Features list */}
          <Box sx={{ mt: 6, position: 'relative' }}>
            {[
              t('auth.branding.features.secure'),
              t('auth.branding.features.realtime'),
              t('auth.branding.features.lowFees'),
              t('auth.branding.features.multiCurrency'),
            ].map((feature, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  color: colors.textWhite,
                  opacity: 0.9,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: colors.vibrantCyan,
                    mr: 2,
                  }}
                />
                <Typography variant="body1">{feature}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Right Panel - Login Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, sm: 6, md: 8 },
        }}
      >
        {/* Mobile logo */}
        {isMobile && (
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                color: colors.textPrimary,
                fontWeight: 700,
                background: GRADIENTS.primary,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MyCrypto
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: colors.textSecondary, mt: 1 }}
            >
              {t('auth.branding.tagline')}
            </Typography>
          </Box>
        )}

        {/* Form Card */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: colors.cardBg,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            p: { xs: 3, sm: 5 },
          }}
        >
          <Typography
            variant="h2"
            sx={{
              color: colors.textPrimary,
              fontSize: '28px',
              fontWeight: 700,
              mb: 1,
            }}
          >
            {t('auth.login.welcomeBack')}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: colors.textSecondary,
              mb: 4,
            }}
          >
            {t('auth.login.signInToAccount')}
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Email Field */}
          <Box sx={{ mb: 3 }}>
            <Typography
              component="label"
              sx={{
                display: 'block',
                color: colors.textPrimary,
                fontSize: '14px',
                fontWeight: 500,
                mb: 1,
              }}
            >
              {t('auth.login.email')}
            </Typography>
            <TextField
              fullWidth
              type="email"
              placeholder={t('auth.login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              inputProps={{ 'aria-label': t('auth.login.email') }}
            />
          </Box>

          {/* Password Field */}
          <Box sx={{ mb: 2 }}>
            <Typography
              component="label"
              sx={{
                display: 'block',
                color: colors.textPrimary,
                fontSize: '14px',
                fontWeight: 500,
                mb: 1,
              }}
            >
              {t('auth.login.password')}
            </Typography>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              inputProps={{ 'aria-label': t('auth.login.password') }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: colors.textSecondary }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Remember Me & Forgot Password */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  sx={{
                    color: colors.border,
                    '&.Mui-checked': {
                      color: colors.primaryBlue,
                    },
                  }}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ color: colors.textSecondary }}
                >
                  {t('auth.login.rememberMe')}
                </Typography>
              }
            />
            <Link
              component={RouterLink}
              to="/forgot-password"
              sx={{
                color: colors.primaryBlue,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || !email || !password}
            sx={{
              py: 1.5,
              fontSize: '16px',
              fontWeight: 600,
              mb: 3,
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              t('auth.login.loginButton')
            )}
          </Button>

          {/* Register Link */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="body2"
              component="span"
              sx={{ color: colors.textSecondary }}
            >
              {t('auth.login.noAccount')}{' '}
            </Typography>
            <Link
              component={RouterLink}
              to="/register"
              sx={{
                color: colors.primaryBlue,
                textDecoration: 'none',
                fontWeight: 600,
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {t('auth.login.signUp')}
            </Link>
          </Box>
        </Box>

        {/* Footer */}
        <Typography
          variant="caption"
          sx={{
            color: colors.textSecondary,
            mt: 4,
            textAlign: 'center',
          }}
        >
          {t('auth.login.termsAgreement')}
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
