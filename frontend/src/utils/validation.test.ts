/**
 * Tests for validation utilities
 */

import {
  validateEmail,
  validatePassword,
  getPasswordError,
  validateConfirmPassword,
  validateRegistrationForm,
  hasValidationErrors,
} from './validation';

describe('validateEmail', () => {
  it('returns error for empty email', () => {
    expect(validateEmail('')).toBe('E-posta adresi gereklidir.');
  });

  it('returns error for invalid email format', () => {
    expect(validateEmail('invalid')).toBe('Gecerli bir e-posta adresi giriniz.');
    expect(validateEmail('invalid@')).toBe('Gecerli bir e-posta adresi giriniz.');
    expect(validateEmail('@example.com')).toBe('Gecerli bir e-posta adresi giriniz.');
  });

  it('returns undefined for valid email', () => {
    expect(validateEmail('test@example.com')).toBeUndefined();
    expect(validateEmail('user.name@domain.co.uk')).toBeUndefined();
  });
});

describe('validatePassword', () => {
  it('returns weak for short password', () => {
    const result = validatePassword('abc');
    expect(result.strength).toBe('weak');
    expect(result.hasMinLength).toBe(false);
  });

  it('returns weak for password with only length', () => {
    const result = validatePassword('abcdefgh');
    expect(result.strength).toBe('weak');
    expect(result.hasMinLength).toBe(true);
    expect(result.hasUppercase).toBe(false);
    expect(result.hasNumber).toBe(false);
    expect(result.hasSpecialChar).toBe(false);
  });

  it('returns medium for password missing one requirement', () => {
    const result = validatePassword('Abcdefg1');
    expect(result.strength).toBe('medium');
    expect(result.hasMinLength).toBe(true);
    expect(result.hasUppercase).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSpecialChar).toBe(false);
  });

  it('returns strong for password with all requirements', () => {
    const result = validatePassword('Abcdefg1!');
    expect(result.strength).toBe('strong');
    expect(result.hasMinLength).toBe(true);
    expect(result.hasUppercase).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSpecialChar).toBe(true);
  });

  it('detects special characters', () => {
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'];
    specialChars.forEach((char) => {
      const result = validatePassword(`Pass1${char}word`);
      expect(result.hasSpecialChar).toBe(true);
    });
  });
});

describe('getPasswordError', () => {
  it('returns error for empty password', () => {
    expect(getPasswordError('')).toBe('Sifre gereklidir.');
  });

  it('returns error listing missing requirements', () => {
    const error = getPasswordError('abc');
    expect(error).toContain('en az 8 karakter');
    expect(error).toContain('en az 1 buyuk harf');
    expect(error).toContain('en az 1 rakam');
    expect(error).toContain('en az 1 ozel karakter');
  });

  it('returns undefined for valid password', () => {
    expect(getPasswordError('StrongPass123!')).toBeUndefined();
  });
});

describe('validateConfirmPassword', () => {
  it('returns error for empty confirm password', () => {
    expect(validateConfirmPassword('password', '')).toBe('Sifre tekrari gereklidir.');
  });

  it('returns error for mismatched passwords', () => {
    expect(validateConfirmPassword('password1', 'password2')).toBe('Sifreler eslesmedi.');
  });

  it('returns undefined for matching passwords', () => {
    expect(validateConfirmPassword('password', 'password')).toBeUndefined();
  });
});

describe('validateRegistrationForm', () => {
  const validFormData = {
    email: 'test@example.com',
    password: 'StrongPass123!',
    confirmPassword: 'StrongPass123!',
    acceptTerms: true,
    acceptKvkk: true,
  };

  it('returns no errors for valid form data', () => {
    const errors = validateRegistrationForm(validFormData);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('returns email error for invalid email', () => {
    const errors = validateRegistrationForm({
      ...validFormData,
      email: 'invalid',
    });
    expect(errors.email).toBeDefined();
  });

  it('returns password error for invalid password', () => {
    const errors = validateRegistrationForm({
      ...validFormData,
      password: 'weak',
      confirmPassword: 'weak',
    });
    expect(errors.password).toBeDefined();
  });

  it('returns confirmPassword error for mismatched passwords', () => {
    const errors = validateRegistrationForm({
      ...validFormData,
      confirmPassword: 'DifferentPass123!',
    });
    expect(errors.confirmPassword).toBeDefined();
  });

  it('returns acceptTerms error when not accepted', () => {
    const errors = validateRegistrationForm({
      ...validFormData,
      acceptTerms: false,
    });
    expect(errors.acceptTerms).toBe('Kullanim kosullarini kabul etmelisiniz.');
  });

  it('returns acceptKvkk error when not accepted', () => {
    const errors = validateRegistrationForm({
      ...validFormData,
      acceptKvkk: false,
    });
    expect(errors.acceptKvkk).toBe('KVKK aydinlatma metnini kabul etmelisiniz.');
  });

  it('returns multiple errors for multiple invalid fields', () => {
    const errors = validateRegistrationForm({
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      acceptKvkk: false,
    });
    expect(Object.keys(errors).length).toBeGreaterThanOrEqual(4);
  });
});

describe('hasValidationErrors', () => {
  it('returns false for empty errors object', () => {
    expect(hasValidationErrors({})).toBe(false);
  });

  it('returns true for errors object with errors', () => {
    expect(hasValidationErrors({ email: 'Error' })).toBe(true);
  });
});
