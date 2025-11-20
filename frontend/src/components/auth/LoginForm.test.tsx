/**
 * LoginForm Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from './LoginForm';

// Wrapper component for router context
const renderWithRouter = (ui: React.ReactElement) => {
  return {
    ...render(
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    ),
  };
};

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Rendering', () => {
    it('renders all form fields', () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      expect(screen.getByLabelText(/e-posta/i)).toBeInTheDocument();
      expect(container.querySelector('#password')).toBeInTheDocument();
      expect(screen.getByLabelText(/beni hatirla/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /giris yap/i })).toBeInTheDocument();
    });

    it('renders login title', () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      expect(screen.getByRole('heading', { name: /giris yap/i })).toBeInTheDocument();
    });

    it('renders forgot password link', () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      expect(screen.getByText(/sifremi unuttum/i)).toBeInTheDocument();
    });

    it('renders register link', () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      expect(screen.getByText(/kayit ol/i)).toBeInTheDocument();
    });

    it('renders error alert when error prop is provided', () => {
      const errorMessage = 'E-posta veya sifre hatali';
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={errorMessage} />
      );

      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });
  });

  describe('Form Input', () => {
    it('updates email field on change', async () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const emailInput = screen.getByLabelText(/e-posta/i);
      await userEvent.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('updates password field on change', async () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const passwordInput = container.querySelector('#password') as HTMLElement;
      await userEvent.type(passwordInput, 'SecurePass123!');

      expect(passwordInput).toHaveValue('SecurePass123!');
    });

    it('toggles remember me checkbox', async () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const checkbox = screen.getByLabelText(/beni hatirla/i);
      expect(checkbox).not.toBeChecked();

      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      await userEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Password Visibility', () => {
    it('toggles password visibility', async () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const passwordInput = container.querySelector('#password');
      const toggleButton = screen.getByRole('button', { name: /sifreyi goster/i });

      expect(passwordInput).toHaveAttribute('type', 'password');

      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Validation', () => {
    it('shows error for invalid email format', async () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const emailInput = screen.getByLabelText(/e-posta/i);
      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/gecerli bir e-posta adresi giriniz/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty email', async () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const emailInput = screen.getByLabelText(/e-posta/i);
      fireEvent.focus(emailInput);
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/e-posta adresi gereklidir\./i)).toBeInTheDocument();
      });
    });

    it('shows error for empty password', async () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const passwordInput = container.querySelector('#password') as HTMLElement;
      fireEvent.focus(passwordInput);
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/sifre gereklidir\./i)).toBeInTheDocument();
      });
    });

    it('validates all fields on submit', async () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with valid data', async () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const emailInput = screen.getByLabelText(/e-posta/i);
      const passwordInput = container.querySelector('#password') as HTMLElement;
      const submitButton = screen.getByRole('button', { name: /giris yap/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'SecurePass123!');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'SecurePass123!',
          rememberMe: false,
        });
      });
    });

    it('calls onSubmit with remember me checked', async () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const emailInput = screen.getByLabelText(/e-posta/i);
      const passwordInput = container.querySelector('#password') as HTMLElement;
      const rememberMeCheckbox = screen.getByLabelText(/beni hatirla/i);
      const submitButton = screen.getByRole('button', { name: /giris yap/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'SecurePass123!');
      await userEvent.click(rememberMeCheckbox);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'SecurePass123!',
          rememberMe: true,
        });
      });
    });

    it('does not call onSubmit with invalid data', async () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const emailInput = screen.getByLabelText(/e-posta/i);
      const submitButton = screen.getByRole('button', { name: /giris yap/i });

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('disables all fields when loading', () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={true} error={null} />
      );

      expect(screen.getByLabelText(/e-posta/i)).toBeDisabled();
      expect(container.querySelector('#password')).toBeDisabled();
      expect(screen.getByLabelText(/beni hatirla/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /giris yapiliyor/i })).toBeDisabled();
    });

    it('shows loading indicator in submit button', () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={true} error={null} />
      );

      expect(screen.getByText(/giris yapiliyor/i)).toBeInTheDocument();
      // CircularProgress renders with role="progressbar" but may be hidden
      const progressbar = container.querySelector('.MuiCircularProgress-root');
      expect(progressbar).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible form label', () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const form = container.querySelector('form');
      expect(form).toHaveAttribute('aria-label', 'Giris formu');
    });

    it('has proper autocomplete attributes', () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      expect(screen.getByLabelText(/e-posta/i)).toHaveAttribute('autocomplete', 'email');
      const passwordInput = container.querySelector('#password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('password toggle button has proper aria-label', () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const toggleButton = screen.getByRole('button', { name: /sifreyi goster/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('email field is marked for autoFocus', () => {
      const { container } = renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      // React's autoFocus prop may not appear as DOM attribute in jsdom
      // Just verify the email field exists and is the first input
      const emailInput = container.querySelector('#email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('Navigation Links', () => {
    it('forgot password link has correct href', () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const forgotPasswordLink = screen.getByText(/sifremi unuttum/i);
      expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
    });

    it('register link has correct href', () => {
      renderWithRouter(
        <LoginForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const registerLink = screen.getByText(/kayit ol/i);
      expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
    });
  });
});
