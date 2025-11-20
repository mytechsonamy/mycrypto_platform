/**
 * Reset Password Form Component (Presentational)
 * Pure component for resetting password with new password
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
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
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { ResetPasswordFormData, ValidationErrors } from '../../types/auth.types';
import { validatePassword, validateConfirmPassword, getPasswordError } from '../../utils/validation';
import PasswordStrengthIndicator from '../common/PasswordStrengthIndicator';

interface ResetPasswordFormProps {
  onSubmit: (data: ResetPasswordFormData) => void;
  loading: boolean;
  error: string | null;
  success: boolean;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSubmit,
  loading,
  error,
  success,
}) => {
  // Form state
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    newPassword: '',
    confirmPassword: '',
  });

  // UI state
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Password validation
  const passwordValidation = validatePassword(formData.newPassword);

  // Handle input changes
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    // Validate field on blur
    let fieldError: string | undefined;

    switch (name) {
      case 'newPassword':
        fieldError = getPasswordError(formData.newPassword);
        break;
      case 'confirmPassword':
        fieldError = validateConfirmPassword(formData.newPassword, formData.confirmPassword);
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

    const passwordError = getPasswordError(formData.newPassword);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    const confirmPasswordError = validateConfirmPassword(formData.newPassword, formData.confirmPassword);
    if (confirmPasswordError) {
      newErrors.confirmPassword = confirmPasswordError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      newPassword: true,
      confirmPassword: true,
    });

    // Validate and submit if no errors
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, onSubmit]);

  // Toggle password visibility
  const toggleNewPasswordVisibility = () => setShowNewPassword((prev) => !prev);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword((prev) => !prev);

  // Success state
  if (success) {
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
          sx={{
            textAlign: 'center',
          }}
        >
          <CheckCircleIcon
            sx={{
              fontSize: 64,
              color: 'success.main',
              mb: 2,
            }}
          />

          <Typography
            component="h1"
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 600, mb: 2 }}
          >
            Sifre Degistirildi
          </Typography>

          <Alert
            severity="success"
            sx={{ mb: 3, textAlign: 'left' }}
          >
            Sifreniz basariyla degistirildi. Artik yeni sifrenizle giris yapabilirsiniz.
          </Alert>

          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            fullWidth
            size="large"
          >
            Giris Yap
          </Button>
        </Box>
      </Paper>
    );
  }

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
        aria-label="Sifre sifirlama formu"
      >
        {/* Header */}
        <Typography
          component="h1"
          variant="h5"
          align="center"
          gutterBottom
          sx={{ fontWeight: 600, mb: 1 }}
        >
          Yeni Sifre Belirle
        </Typography>

        <Typography
          variant="body2"
          align="center"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Hesabiniz icin yeni bir sifre belirleyin.
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

        {/* New password field */}
        <TextField
          fullWidth
          id="newPassword"
          name="newPassword"
          type={showNewPassword ? 'text' : 'password'}
          label="Yeni Sifre"
          value={formData.newPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.newPassword && !!errors.password}
          helperText={touched.newPassword && errors.password}
          disabled={loading}
          required
          autoComplete="new-password"
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" aria-hidden="true" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showNewPassword ? 'Sifreyi gizle' : 'Sifreyi goster'}
                  onClick={toggleNewPasswordVisibility}
                  edge="end"
                  disabled={loading}
                >
                  {showNewPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          inputProps={{
            'aria-label': 'Yeni sifre',
            'aria-describedby': touched.newPassword && errors.password ? 'password-error' : undefined,
          }}
          sx={{ mb: 1 }}
        />

        {/* Password strength indicator */}
        <PasswordStrengthIndicator
          validation={passwordValidation}
          show={formData.newPassword.length > 0}
        />

        {/* Confirm password field */}
        <TextField
          fullWidth
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          label="Sifre Tekrari"
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.confirmPassword && !!errors.confirmPassword}
          helperText={touched.confirmPassword && errors.confirmPassword}
          disabled={loading}
          required
          autoComplete="new-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" aria-hidden="true" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showConfirmPassword ? 'Sifreyi gizle' : 'Sifreyi goster'}
                  onClick={toggleConfirmPasswordVisibility}
                  edge="end"
                  disabled={loading}
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          inputProps={{
            'aria-label': 'Sifre tekrari',
            'aria-describedby': touched.confirmPassword && errors.confirmPassword ? 'confirm-password-error' : undefined,
          }}
          sx={{ mb: 3 }}
        />

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
          aria-label={loading ? 'Sifre degistiriliyor' : 'Sifreyi degistir'}
        >
          {loading ? (
            <>
              <CircularProgress
                size={24}
                color="inherit"
                sx={{ mr: 1 }}
                aria-hidden="true"
              />
              Sifre Degistiriliyor...
            </>
          ) : (
            'Sifreyi Degistir'
          )}
        </Button>

        {/* Back to login link */}
        <Typography
          variant="body2"
          align="center"
          color="text.secondary"
        >
          <Link
            component={RouterLink}
            to="/login"
            underline="hover"
          >
            Giris sayfasina don
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
};

export default ResetPasswordForm;
