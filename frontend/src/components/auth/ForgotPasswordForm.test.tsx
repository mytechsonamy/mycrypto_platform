/**
 * ForgotPasswordForm Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPasswordForm from './ForgotPasswordForm';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ForgotPasswordForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    loading: false,
    error: null,
    success: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial render', () => {
    it('renders the form with email field', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      expect(screen.getByLabelText(/e-posta/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sifirlama baglantisi gonder/i })).toBeInTheDocument();
    });

    it('renders header and description', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      expect(screen.getByText('Sifremi Unuttum')).toBeInTheDocument();
      expect(screen.getByText(/e-posta adresinizi girin/i)).toBeInTheDocument();
    });

    it('renders back to login link', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      expect(screen.getByText(/giris sayfasina don/i)).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('shows error for empty email on blur', async () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/e-posta/i);
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/e-posta adresi gereklidir/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/e-posta/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/gecerli bir e-posta adresi giriniz/i)).toBeInTheDocument();
      });
    });

    it('does not show error for valid email', async () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/e-posta/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.queryByText(/e-posta adresi gereklidir/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/gecerli bir e-posta adresi giriniz/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('calls onSubmit with valid email', async () => {
      const onSubmit = jest.fn();
      renderWithRouter(<ForgotPasswordForm {...defaultProps} onSubmit={onSubmit} />);

      const emailInput = screen.getByLabelText(/e-posta/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /sifirlama baglantisi gonder/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
      });
    });

    it('does not call onSubmit with invalid email', async () => {
      const onSubmit = jest.fn();
      renderWithRouter(<ForgotPasswordForm {...defaultProps} onSubmit={onSubmit} />);

      const emailInput = screen.getByLabelText(/e-posta/i);
      fireEvent.change(emailInput, { target: { value: 'invalid' } });

      fireEvent.click(screen.getByRole('button', { name: /sifirlama baglantisi gonder/i }));

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading state', () => {
    it('shows loading indicator when loading', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} loading={true} />);

      expect(screen.getByRole('button', { name: /gonderiliyor/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /gonderiliyor/i })).toBeDisabled();
    });

    it('disables email input when loading', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} loading={true} />);

      expect(screen.getByLabelText(/e-posta/i)).toBeDisabled();
    });
  });

  describe('Error state', () => {
    it('displays error message', () => {
      renderWithRouter(
        <ForgotPasswordForm {...defaultProps} error="Cok fazla istek gonderdiniz." />
      );

      expect(screen.getByText('Cok fazla istek gonderdiniz.')).toBeInTheDocument();
    });
  });

  describe('Success state', () => {
    it('shows success message when success is true', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} success={true} />);

      expect(screen.getByText('E-posta Gonderildi')).toBeInTheDocument();
      expect(screen.getByText(/sifre sifirlama baglantisi e-posta adresinize gonderildi/i)).toBeInTheDocument();
    });

    it('shows link back to login on success', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} success={true} />);

      expect(screen.getByRole('link', { name: /giris sayfasina don/i })).toBeInTheDocument();
    });

    it('hides form fields on success', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} success={true} />);

      expect(screen.queryByLabelText(/e-posta/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labeling', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const form = screen.getByRole('form', { name: /sifre sifirlama formu/i });
      expect(form).toBeInTheDocument();
    });

    it('has proper input labeling', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/e-posta/i);
      expect(emailInput).toBeInTheDocument();
    });

    it('has proper button labeling', () => {
      renderWithRouter(<ForgotPasswordForm {...defaultProps} />);

      const button = screen.getByRole('button', { name: /sifirlama baglantisi gonder/i });
      expect(button).toHaveAttribute('aria-label');
    });
  });
});
