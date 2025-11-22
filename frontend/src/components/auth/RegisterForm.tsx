/**
 * Registration Form Component (Presentational)
 * Pure component for user registration with validation
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import PasswordStrengthIndicator from '../common/PasswordStrengthIndicator';
import {
  RegisterFormData,
  ValidationErrors,
  PasswordValidation,
} from '../../types/auth.types';
import {
  validateEmail,
  validatePassword,
  getPasswordError,
  validateConfirmPassword,
  validateRegistrationForm,
  hasValidationErrors,
} from '../../utils/validation';

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void;
  loading: boolean;
  error: string | null;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  loading,
  error,
}) => {
  // Form state
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptKvkk: false,
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    strength: 'weak',
  });

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

    // Update password validation
    if (name === 'password') {
      setPasswordValidation(validatePassword(value));
    }

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
        fieldError = getPasswordError(formData.password);
        break;
      case 'confirmPassword':
        fieldError = validateConfirmPassword(formData.password, formData.confirmPassword);
        break;
      case 'acceptTerms':
        fieldError = !formData.acceptTerms ? 'Kullanım koşullarını kabul etmelisiniz.' : undefined;
        break;
      case 'acceptKvkk':
        fieldError = !formData.acceptKvkk ? 'KVKK aydınlatma metnini kabul etmelisiniz.' : undefined;
        break;
    }

    setErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const validationErrors = validateRegistrationForm(formData);
    setErrors(validationErrors);

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
      acceptTerms: true,
      acceptKvkk: true,
    });

    // Submit if no errors
    if (!hasValidationErrors(validationErrors)) {
      onSubmit(formData);
    }
  }, [formData, onSubmit]);

  // Toggle password visibility
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword((prev) => !prev);

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
        aria-label="Kayıt formu"
      >
        {/* Header */}
        <Typography
          component="h1"
          variant="h5"
          align="center"
          gutterBottom
          sx={{ fontWeight: 600, mb: 3 }}
        >
          Hesap Oluştur
        </Typography>

        {/* Email field */}
        <TextField
          fullWidth
          id="email"
          name="email"
          type="email"
          label="E-posta Adresi"
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
          FormHelperTextProps={{
            'data-testid': 'email-error',
            'aria-live': 'polite',
          } as any}
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
          FormHelperTextProps={{
            'data-testid': 'password-error',
            'aria-live': 'polite',
          } as any}
          sx={{ mb: formData.password.length > 0 ? 0 : 2 }}
        />

        {/* Password strength indicator */}
        <PasswordStrengthIndicator
          validation={passwordValidation}
          show={formData.password.length > 0}
        />

        {/* Confirm password field */}
        <TextField
          fullWidth
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          label="Şifre Tekrarı"
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
                  aria-label={showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
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
            'aria-label': 'Şifre tekrarı',
            'aria-describedby': touched.confirmPassword && errors.confirmPassword ? 'confirmPassword-error' : undefined,
          }}
          FormHelperTextProps={{
            'data-testid': 'confirmPassword-error',
            'aria-live': 'polite',
          } as any}
          sx={{ mb: 2 }}
        />

        {/* Terms checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              id="acceptTerms"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
              color="primary"
              inputProps={{
                'aria-label': 'Kullanım koşullarını kabul ediyorum',
              }}
            />
          }
          label={
            <Typography variant="body2">
              <Link href="/terms" target="_blank" rel="noopener">
                Kullanım Koşulları
              </Link>
              'nı okudum ve kabul ediyorum.
            </Typography>
          }
          sx={{ mb: 0, alignItems: 'flex-start' }}
        />
        {touched.acceptTerms && errors.acceptTerms && (
          <FormHelperText error sx={{ ml: 4, mt: 0 }}>
            {errors.acceptTerms}
          </FormHelperText>
        )}

        {/* KVKK checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              id="acceptKvkk"
              name="acceptKvkk"
              checked={formData.acceptKvkk}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
              color="primary"
              inputProps={{
                'aria-label': 'KVKK aydınlatma metnini kabul ediyorum',
              }}
            />
          }
          label={
            <Typography variant="body2">
              <Link href="/kvkk" target="_blank" rel="noopener">
                KVKK Aydınlatma Metni
              </Link>
              'ni okudum ve kabul ediyorum.
            </Typography>
          }
          sx={{ mb: 2, alignItems: 'flex-start' }}
        />
        {touched.acceptKvkk && errors.acceptKvkk && (
          <FormHelperText error sx={{ ml: 4, mt: -1, mb: 2 }}>
            {errors.acceptKvkk}
          </FormHelperText>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading || !formData.email || !formData.password || !formData.acceptTerms || !formData.acceptKvkk}
          sx={{
            py: 1.5,
            mb: 2,
            fontWeight: 600,
            fontSize: '1rem',
          }}
          aria-label={loading ? 'Kayıt yapılıyor' : 'Kayıt ol'}
        >
          {loading ? (
            <>
              <CircularProgress
                size={24}
                color="inherit"
                sx={{ mr: 1 }}
                aria-hidden="true"
              />
              Kayıt Yapılıyor...
            </>
          ) : (
            'Kayıt Ol'
          )}
        </Button>

        {/* Login link */}
        <Typography
          variant="body2"
          align="center"
          color="text.secondary"
        >
          Zaten hesabınız var mı?{' '}
          <Link href="/login" underline="hover">
            Giriş Yapın
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
};

export default RegisterForm;
