/**
 * Tests for PasswordStrengthIndicator component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { PasswordValidation } from '../../types/auth.types';

describe('PasswordStrengthIndicator', () => {
  const weakValidation: PasswordValidation = {
    hasMinLength: false,
    hasUppercase: false,
    hasNumber: true,
    hasSpecialChar: false,
    strength: 'weak',
  };

  const mediumValidation: PasswordValidation = {
    hasMinLength: true,
    hasUppercase: true,
    hasNumber: true,
    hasSpecialChar: false,
    strength: 'medium',
  };

  const strongValidation: PasswordValidation = {
    hasMinLength: true,
    hasUppercase: true,
    hasNumber: true,
    hasSpecialChar: true,
    strength: 'strong',
  };

  it('renders nothing when show is false', () => {
    const { container } = render(
      <PasswordStrengthIndicator validation={weakValidation} show={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders when show is true', () => {
    render(
      <PasswordStrengthIndicator validation={weakValidation} show={true} />
    );

    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('displays weak strength correctly', () => {
    render(
      <PasswordStrengthIndicator validation={weakValidation} show={true} />
    );

    expect(screen.getByText(/zayif/i)).toBeInTheDocument();
  });

  it('displays medium strength correctly', () => {
    render(
      <PasswordStrengthIndicator validation={mediumValidation} show={true} />
    );

    expect(screen.getByText(/orta/i)).toBeInTheDocument();
  });

  it('displays strong strength correctly', () => {
    render(
      <PasswordStrengthIndicator validation={strongValidation} show={true} />
    );

    expect(screen.getByText(/guclu/i)).toBeInTheDocument();
  });

  it('shows all requirement labels', () => {
    render(
      <PasswordStrengthIndicator validation={weakValidation} show={true} />
    );

    expect(screen.getByText(/en az 8 karakter/i)).toBeInTheDocument();
    expect(screen.getByText(/en az 1 buyuk harf/i)).toBeInTheDocument();
    expect(screen.getByText(/en az 1 rakam/i)).toBeInTheDocument();
    expect(screen.getByText(/en az 1 ozel karakter/i)).toBeInTheDocument();
  });

  it('has proper aria label', () => {
    render(
      <PasswordStrengthIndicator validation={weakValidation} show={true} />
    );

    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      'Sifre guc gostergesi'
    );
  });
});
