/**
 * Login Form Component (Presentational)
 * Pure component for user login with validation
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  Paper,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { LoginFormData, ValidationErrors } from '../../types/auth.types';
import { validateEmail } from '../../utils/validation';

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  loading: boolean;
  error: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  loading,
  error,
}) => {
  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Handle input changes
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, checked, type } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear error when user starts typing
    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  }, [touched]);

  // Handle field blur for validation
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target as HTMLInputElement;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    // Validate field on blur
    let fieldError: string | undefined;

    switch (name) {
      case 'email':
        fieldError = validateEmail(formData.email);
        break;
      case 'password':
        if (!formData.password) {
          fieldError = 'Şifre gereklidir.';
        }
        break;
    }

    setErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));
  }, [formData]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate email
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
    });

    // Validate and submit if no errors
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, onSubmit]);

  // Toggle password visibility
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 3, sm: 4 },
        width: '100%',
        maxWidth: 440,
        mx: 'auto',
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Giriş formu"
      >
        {/* Header */}
        <Typography
          component="h1"
          variant="h5"
          align="center"
          gutterBottom
          sx={{ fontWeight: 600, mb: 3 }}
        >
          Giriş Yap
        </Typography>

        {/* Error alert */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            role="alert"
          >
            {error}
          </Alert>
        )}

        {/* Email field */}
        <TextField
          fullWidth
          id="email"
          name="email"
          type="email"
          label="E-posta"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.email && !!errors.email}
          helperText={touched.email && errors.email}
          disabled={loading}
          required
          autoComplete="email"
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="action" aria-hidden="true" />
              </InputAdornment>
            ),
          }}
          inputProps={{
            'aria-label': 'E-posta adresi',
            'aria-describedby': touched.email && errors.email ? 'email-error' : undefined,
          }}
          sx={{ mb: 2 }}
        />

        {/* Password field */}
        <TextField
          fullWidth
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="Şifre"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.password && !!errors.password}
          helperText={touched.password && errors.password}
          disabled={loading}
          required
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" aria-hidden="true" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  onClick={togglePasswordVisibility}
                  edge="end"
                  disabled={loading}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          inputProps={{
            'aria-label': 'Şifre',
            'aria-describedby': touched.password && errors.password ? 'password-error' : undefined,
          }}
          sx={{ mb: 1 }}
        />

        {/* Remember me and forgot password row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={loading}
                color="primary"
                inputProps={{
                  'aria-label': 'Beni hatırla',
                }}
              />
            }
            label={
              <Typography variant="body2">
                Beni hatırla
              </Typography>
            }
          />
          <Link
            component={RouterLink}
            to="/forgot-password"
            variant="body2"
            underline="hover"
          >
            Şifremi unuttum
          </Link>
        </Box>

        {/* Submit button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{
            py: 1.5,
            mb: 2,
            fontWeight: 600,
            fontSize: '1rem',
          }}
          aria-label={loading ? 'Giriş yapılıyor' : 'Giriş yap'}
        >
          {loading ? (
            <>
              <CircularProgress
                size={24}
                color="inherit"
                sx={{ mr: 1 }}
                aria-hidden="true"
              />
              Giriş Yapılıyor...
            </>
          ) : (
            'Giriş Yap'
          )}
        </Button>

        {/* Register link */}
        <Typography
          variant="body2"
          align="center"
          color="text.secondary"
        >
          Hesabınız yok mu?{' '}
          <Link
            component={RouterLink}
            to="/register"
            underline="hover"
          >
            Kayıt ol
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
};

export default LoginForm;
