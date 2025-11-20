/**
 * Validation utilities for form inputs
 */

import { PasswordValidation, PasswordStrength, ValidationErrors, RegisterFormData } from '../types/auth.types';

// Password requirements
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

/**
 * Validate email format
 */
export const validateEmail = (email: string): string | undefined => {
  if (!email) {
    return 'E-posta adresi gereklidir.';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Gecerli bir e-posta adresi giriniz.';
  }
  return undefined;
};

/**
 * Validate password and return detailed validation result
 */
export const validatePassword = (password: string): PasswordValidation => {
  const hasMinLength = password.length >= MIN_PASSWORD_LENGTH;
  const hasUppercase = UPPERCASE_REGEX.test(password);
  const hasNumber = NUMBER_REGEX.test(password);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(password);

  // Calculate strength
  const validCriteria = [hasMinLength, hasUppercase, hasNumber, hasSpecialChar].filter(Boolean).length;

  let strength: PasswordStrength;
  if (validCriteria <= 2) {
    strength = 'weak';
  } else if (validCriteria === 3) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecialChar,
    strength,
  };
};

/**
 * Get password error message
 */
export const getPasswordError = (password: string): string | undefined => {
  if (!password) {
    return 'Sifre gereklidir.';
  }

  const validation = validatePassword(password);
  const errors: string[] = [];

  if (!validation.hasMinLength) {
    errors.push(`en az ${MIN_PASSWORD_LENGTH} karakter`);
  }
  if (!validation.hasUppercase) {
    errors.push('en az 1 buyuk harf');
  }
  if (!validation.hasNumber) {
    errors.push('en az 1 rakam');
  }
  if (!validation.hasSpecialChar) {
    errors.push('en az 1 ozel karakter');
  }

  if (errors.length > 0) {
    return `Sifre ${errors.join(', ')} icermelidir.`;
  }

  return undefined;
};

/**
 * Validate confirm password
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
  if (!confirmPassword) {
    return 'Sifre tekrari gereklidir.';
  }
  if (password !== confirmPassword) {
    return 'Sifreler eslesmedi.';
  }
  return undefined;
};

/**
 * Validate entire registration form
 */
export const validateRegistrationForm = (data: RegisterFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = getPasswordError(data.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const confirmPasswordError = validateConfirmPassword(data.password, data.confirmPassword);
  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError;
  }

  if (!data.acceptTerms) {
    errors.acceptTerms = 'Kullanim kosullarini kabul etmelisiniz.';
  }

  if (!data.acceptKvkk) {
    errors.acceptKvkk = 'KVKK aydinlatma metnini kabul etmelisiniz.';
  }

  return errors;
};

/**
 * Check if form has any errors
 */
export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};
