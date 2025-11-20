/**
 * Forgot Password Form Component (Presentational)
 * Pure component for requesting password reset
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  CircularProgress,
  Paper,
  Alert,
} from '@mui/material';
import { Email as EmailIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { ForgotPasswordFormData, ValidationErrors } from '../../types/auth.types';
import { validateEmail } from '../../utils/validation';

interface ForgotPasswordFormProps {
  onSubmit: (data: ForgotPasswordFormData) => void;
  loading: boolean;
  error: string | null;
  success: boolean;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSubmit,
  loading,
  error,
  success,
}) => {
  // Form state
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  });

  // UI state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});

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
    if (name === 'email') {
      const fieldError = validateEmail(formData.email);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError,
      }));
    }
  }, [formData]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true });

    // Validate and submit if no errors
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, onSubmit]);

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
          <Typography
            component="h1"
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 600, mb: 2 }}
          >
            E-posta Gonderildi
          </Typography>

          <Alert
            severity="success"
            sx={{ mb: 3, textAlign: 'left' }}
          >
            Sifre sifirlama baglantisi e-posta adresinize gonderildi. Lutfen gelen kutunuzu kontrol edin.
          </Alert>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            E-posta birka dakika icinde gelmezse, spam klasorunuzu kontrol edin.
          </Typography>

          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            fullWidth
            startIcon={<ArrowBackIcon />}
          >
            Giris Sayfasina Don
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
          Sifremi Unuttum
        </Typography>

        <Typography
          variant="body2"
          align="center"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          E-posta adresinizi girin, size sifre sifirlama baglantisi gonderelim.
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
          aria-label={loading ? 'Gonderiliyor' : 'Sifre sifirlama baglantisi gonder'}
        >
          {loading ? (
            <>
              <CircularProgress
                size={24}
                color="inherit"
                sx={{ mr: 1 }}
                aria-hidden="true"
              />
              Gonderiliyor...
            </>
          ) : (
            'Sifirlama Baglantisi Gonder'
          )}
        </Button>

        {/* Back to login link */}
        <Box sx={{ textAlign: 'center' }}>
          <Link
            component={RouterLink}
            to="/login"
            variant="body2"
            underline="hover"
            sx={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} />
            Giris sayfasina don
          </Link>
        </Box>
      </Box>
    </Paper>
  );
};

export default ForgotPasswordForm;
