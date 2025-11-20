/**
 * ResetPasswordForm Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResetPasswordForm from './ResetPasswordForm';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ResetPasswordForm', () => {
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
    it('renders the form with password fields', () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      expect(container.querySelector('#newPassword')).toBeInTheDocument();
      expect(container.querySelector('#confirmPassword')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sifreyi degistir/i })).toBeInTheDocument();
    });

    it('renders header and description', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      expect(screen.getByText('Yeni Sifre Belirle')).toBeInTheDocument();
      expect(screen.getByText(/hesabiniz icin yeni bir sifre belirleyin/i)).toBeInTheDocument();
    });

    it('renders back to login link', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      expect(screen.getByText(/giris sayfasina don/i)).toBeInTheDocument();
    });
  });

  describe('Password visibility toggle', () => {
    it('toggles new password visibility', () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = container.querySelector('#newPassword') as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButtons = screen.getAllByRole('button', { name: /sifreyi goster/i });
      fireEvent.click(toggleButtons[0]);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('toggles confirm password visibility', () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const confirmPasswordInput = container.querySelector('#confirmPassword') as HTMLInputElement;
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      const toggleButtons = screen.getAllByRole('button', { name: /sifreyi goster/i });
      fireEvent.click(toggleButtons[1]);

      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Form validation', () => {
    it('shows error for empty password on blur', async () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = container.querySelector('#newPassword') as HTMLInputElement;
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/sifre gereklidir/i)).toBeInTheDocument();
      });
    });

    it('shows error for weak password', async () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = container.querySelector('#newPassword') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/en az 8 karakter/i)).toBeInTheDocument();
      });
    });

    it('shows password strength indicator', async () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = container.querySelector('#newPassword') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'Test123!' } });

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /sifre guc gostergesi/i })).toBeInTheDocument();
      });
    });

    it('shows error for mismatched passwords', async () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = container.querySelector('#newPassword') as HTMLInputElement;
      const confirmPasswordInput = container.querySelector('#confirmPassword') as HTMLInputElement;

      fireEvent.change(passwordInput, { target: { value: 'Test123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } });
      fireEvent.blur(confirmPasswordInput);

      await waitFor(() => {
        expect(screen.getByText(/sifreler eslesmedi/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty confirm password', async () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const confirmPasswordInput = container.querySelector('#confirmPassword') as HTMLInputElement;
      fireEvent.blur(confirmPasswordInput);

      await waitFor(() => {
        expect(screen.getByText(/sifre tekrari gereklidir/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('calls onSubmit with valid passwords', async () => {
      const onSubmit = jest.fn();
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} onSubmit={onSubmit} />);

      const passwordInput = container.querySelector('#newPassword') as HTMLInputElement;
      const confirmPasswordInput = container.querySelector('#confirmPassword') as HTMLInputElement;

      fireEvent.change(passwordInput, { target: { value: 'Test123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Test123!' } });

      fireEvent.click(screen.getByRole('button', { name: /sifreyi degistir/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          newPassword: 'Test123!',
          confirmPassword: 'Test123!',
        });
      });
    });

    it('does not call onSubmit with invalid passwords', async () => {
      const onSubmit = jest.fn();
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} onSubmit={onSubmit} />);

      const passwordInput = container.querySelector('#newPassword') as HTMLInputElement;
      const confirmPasswordInput = container.querySelector('#confirmPassword') as HTMLInputElement;

      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'weak' } });

      fireEvent.click(screen.getByRole('button', { name: /sifreyi degistir/i }));

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('does not call onSubmit with mismatched passwords', async () => {
      const onSubmit = jest.fn();
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} onSubmit={onSubmit} />);

      const passwordInput = container.querySelector('#newPassword') as HTMLInputElement;
      const confirmPasswordInput = container.querySelector('#confirmPassword') as HTMLInputElement;

      fireEvent.change(passwordInput, { target: { value: 'Test123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } });

      fireEvent.click(screen.getByRole('button', { name: /sifreyi degistir/i }));

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading state', () => {
    it('shows loading indicator when loading', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} loading={true} />);

      expect(screen.getByRole('button', { name: /sifre degistiriliyor/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sifre degistiriliyor/i })).toBeDisabled();
    });

    it('disables password inputs when loading', () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} loading={true} />);

      expect(container.querySelector('#newPassword')).toBeDisabled();
      expect(container.querySelector('#confirmPassword')).toBeDisabled();
    });
  });

  describe('Error state', () => {
    it('displays error message', () => {
      renderWithRouter(
        <ResetPasswordForm {...defaultProps} error="Gecersiz sifre sifirlama baglantisi." />
      );

      expect(screen.getByText('Gecersiz sifre sifirlama baglantisi.')).toBeInTheDocument();
    });
  });

  describe('Success state', () => {
    it('shows success message when success is true', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} success={true} />);

      expect(screen.getByText('Sifre Degistirildi')).toBeInTheDocument();
      expect(screen.getByText(/sifreniz basariyla degistirildi/i)).toBeInTheDocument();
    });

    it('shows login button on success', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} success={true} />);

      expect(screen.getByRole('link', { name: /giris yap/i })).toBeInTheDocument();
    });

    it('hides form fields on success', () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} success={true} />);

      expect(container.querySelector('#newPassword')).not.toBeInTheDocument();
      expect(container.querySelector('#confirmPassword')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labeling', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const form = screen.getByRole('form', { name: /sifre sifirlama formu/i });
      expect(form).toBeInTheDocument();
    });

    it('has proper input fields', () => {
      const { container } = renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const passwordInput = container.querySelector('#newPassword');
      const confirmPasswordInput = container.querySelector('#confirmPassword');

      expect(passwordInput).toBeInTheDocument();
      expect(confirmPasswordInput).toBeInTheDocument();
    });

    it('has proper button labeling', () => {
      renderWithRouter(<ResetPasswordForm {...defaultProps} />);

      const button = screen.getByRole('button', { name: /sifreyi degistir/i });
      expect(button).toHaveAttribute('aria-label');
    });
  });
});
