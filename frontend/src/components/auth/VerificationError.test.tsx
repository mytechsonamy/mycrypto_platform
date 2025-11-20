/**
 * Tests for VerificationError component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerificationError from './VerificationError';

describe('VerificationError', () => {
  const defaultProps = {
    errorType: 'generic' as const,
    email: 'test@example.com',
    onResend: jest.fn(),
    resendLoading: false,
    resendSuccess: false,
    resendError: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error messages', () => {
    it('shows expired error message', () => {
      render(<VerificationError {...defaultProps} errorType="expired" />);

      expect(screen.getByText('Baglanti Suresi Doldu')).toBeInTheDocument();
      expect(
        screen.getByText(/Dogrulama baglantisinin suresi dolmus/)
      ).toBeInTheDocument();
    });

    it('shows invalid error message', () => {
      render(<VerificationError {...defaultProps} errorType="invalid" />);

      expect(screen.getByText('Gecersiz Baglanti')).toBeInTheDocument();
      expect(
        screen.getByText(/Gecersiz dogrulama baglantisi/)
      ).toBeInTheDocument();
    });

    it('shows generic error message', () => {
      render(<VerificationError {...defaultProps} errorType="generic" />);

      expect(screen.getByText('Dogrulama Hatasi')).toBeInTheDocument();
      expect(
        screen.getByText(/Dogrulama sirasinda bir hata olustu/)
      ).toBeInTheDocument();
    });
  });

  describe('Resend functionality', () => {
    it('pre-fills email input with user email', () => {
      render(<VerificationError {...defaultProps} />);

      const emailInput = screen.getByLabelText(/E-posta Adresi/i);
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('calls onResend when clicking resend button with valid email', async () => {
      render(<VerificationError {...defaultProps} />);

      const resendButton = screen.getByRole('button', { name: /Yeni dogrulama baglantisi gonder/i });
      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(defaultProps.onResend).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('shows validation error for invalid email', async () => {
      render(<VerificationError {...defaultProps} email={null} />);

      const emailInput = screen.getByLabelText(/E-posta Adresi/i);
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'invalid-email');

      const resendButton = screen.getByRole('button', { name: /Yeni dogrulama baglantisi gonder/i });
      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/Gecerli bir e-posta adresi girin/)).toBeInTheDocument();
      });
      expect(defaultProps.onResend).not.toHaveBeenCalled();
    });

    it('shows validation error for empty email', async () => {
      render(<VerificationError {...defaultProps} email={null} />);

      const resendButton = screen.getByRole('button', { name: /Yeni dogrulama baglantisi gonder/i });
      fireEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/E-posta adresi gereklidir/)).toBeInTheDocument();
      });
      expect(defaultProps.onResend).not.toHaveBeenCalled();
    });
  });

  describe('Loading and success states', () => {
    it('shows loading state when resendLoading is true', () => {
      render(<VerificationError {...defaultProps} resendLoading={true} />);

      expect(screen.getByText('Gonderiliyor...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Yeni dogrulama baglantisi gonder/i })).toBeDisabled();
    });

    it('shows success message when resendSuccess is true', () => {
      render(<VerificationError {...defaultProps} resendSuccess={true} />);

      expect(screen.getByText('Dogrulama e-postasi yeniden gonderildi.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Yeni dogrulama baglantisi gonder/i })).toBeDisabled();
    });

    it('shows error message when resendError is present', () => {
      render(
        <VerificationError {...defaultProps} resendError="Bir hata olustu" />
      );

      expect(screen.getByText('Bir hata olustu')).toBeInTheDocument();
    });

    it('disables email input when loading', () => {
      render(<VerificationError {...defaultProps} resendLoading={true} />);

      const emailInput = screen.getByLabelText(/E-posta Adresi/i);
      expect(emailInput).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible elements', () => {
      render(<VerificationError {...defaultProps} />);

      // Check for proper heading
      expect(screen.getByRole('heading', { name: /Dogrulama Hatasi/i })).toBeInTheDocument();

      // Check for accessible alert
      expect(screen.getByRole('alert')).toHaveAttribute(
        'aria-labelledby',
        'verification-error-title'
      );
    });

    it('has a link to go back to registration', () => {
      render(<VerificationError {...defaultProps} />);

      const backLink = screen.getByRole('link', { name: /Kayit sayfasina geri don/i });
      expect(backLink).toHaveAttribute('href', '/register');
    });

    it('hides decorative icon from screen readers', () => {
      const { container } = render(<VerificationError {...defaultProps} />);

      const hiddenIcon = container.querySelector('[aria-hidden="true"]');
      expect(hiddenIcon).toBeInTheDocument();
    });
  });
});
