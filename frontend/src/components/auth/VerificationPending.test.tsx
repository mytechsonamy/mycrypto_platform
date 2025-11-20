/**
 * Tests for VerificationPending component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerificationPending from './VerificationPending';

describe('VerificationPending', () => {
  const defaultProps = {
    email: 'test@example.com',
    onResend: jest.fn(),
    resendLoading: false,
    resendSuccess: false,
    resendError: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the pending verification message', () => {
    render(<VerificationPending {...defaultProps} />);

    expect(screen.getByText('E-posta Dogrulamasi')).toBeInTheDocument();
    expect(screen.getByText(/Dogrulama baglantisi e-posta adresinize gonderildi/)).toBeInTheDocument();
  });

  it('displays the user email when provided', () => {
    render(<VerificationPending {...defaultProps} />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('pre-fills email input with user email', () => {
    render(<VerificationPending {...defaultProps} />);

    const emailInput = screen.getByLabelText(/E-posta Adresi/i);
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('calls onResend when clicking resend button with valid email', async () => {
    render(<VerificationPending {...defaultProps} />);

    const resendButton = screen.getByRole('button', { name: /Dogrulama e-postasini tekrar gonder/i });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(defaultProps.onResend).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows validation error for invalid email', async () => {
    render(<VerificationPending {...defaultProps} email={null} />);

    const emailInput = screen.getByLabelText(/E-posta Adresi/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'invalid-email');

    const resendButton = screen.getByRole('button', { name: /Dogrulama e-postasini tekrar gonder/i });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText(/Gecerli bir e-posta adresi girin/)).toBeInTheDocument();
    });
    expect(defaultProps.onResend).not.toHaveBeenCalled();
  });

  it('shows validation error for empty email', async () => {
    render(<VerificationPending {...defaultProps} email={null} />);

    const resendButton = screen.getByRole('button', { name: /Dogrulama e-postasini tekrar gonder/i });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText(/E-posta adresi gereklidir/)).toBeInTheDocument();
    });
    expect(defaultProps.onResend).not.toHaveBeenCalled();
  });

  it('shows loading state when resendLoading is true', () => {
    render(<VerificationPending {...defaultProps} resendLoading={true} />);

    expect(screen.getByText('Gonderiliyor...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dogrulama e-postasini tekrar gonder/i })).toBeDisabled();
  });

  it('shows success message when resendSuccess is true', () => {
    render(<VerificationPending {...defaultProps} resendSuccess={true} />);

    expect(screen.getByText('Dogrulama e-postasi yeniden gonderildi.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dogrulama e-postasini tekrar gonder/i })).toBeDisabled();
  });

  it('shows error message when resendError is present', () => {
    render(
      <VerificationPending {...defaultProps} resendError="Bir hata olustu" />
    );

    expect(screen.getByText('Bir hata olustu')).toBeInTheDocument();
  });

  it('has accessible elements', () => {
    render(<VerificationPending {...defaultProps} />);

    // Check for proper heading
    expect(screen.getByRole('heading', { name: /E-posta Dogrulamasi/i })).toBeInTheDocument();

    // Check for accessible region
    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-labelledby',
      'verification-pending-title'
    );

    // Check for accessible buttons
    expect(screen.getByRole('button', { name: /Dogrulama e-postasini tekrar gonder/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kayit sayfasina geri don/i })).toBeInTheDocument();
  });

  it('disables email input when loading', () => {
    render(<VerificationPending {...defaultProps} resendLoading={true} />);

    const emailInput = screen.getByLabelText(/E-posta Adresi/i);
    expect(emailInput).toBeDisabled();
  });

  it('has a link to go back to registration', () => {
    render(<VerificationPending {...defaultProps} />);

    const backLink = screen.getByRole('link', { name: /Geri Don/i });
    expect(backLink).toHaveAttribute('href', '/register');
  });
});
