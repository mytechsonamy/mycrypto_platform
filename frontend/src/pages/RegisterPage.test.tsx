/**
 * Tests for RegisterPage and RegisterForm components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ToastContainer } from 'react-toastify';
import RegisterPage from './RegisterPage';
import RegisterForm from '../components/auth/RegisterForm';
import authReducer from '../store/slices/authSlice';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  ToastContainer: () => null,
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock authApi to control async behavior
const mockRegister = jest.fn();
jest.mock('../api/authApi', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
}));

// Mock useRecaptcha hook
const mockExecuteRecaptcha = jest.fn();
jest.mock('../hooks/useRecaptcha', () => ({
  useRecaptcha: () => ({
    executeRecaptcha: mockExecuteRecaptcha,
    isLoaded: true,
    error: null,
  }),
}));

// Helper to create test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState,
  });
};

// Helper to render with providers
const renderWithProviders = (
  component: React.ReactElement,
  { store = createTestStore() } = {}
) => {
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          {component}
          <ToastContainer />
        </BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('RegisterForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all form fields', () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      expect(screen.getByLabelText(/e-posta adresi/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^sifre$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sifre tekrari/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/kullanim kosullarini kabul ediyorum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/kvkk aydinlatma metnini kabul ediyorum/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      expect(screen.getByRole('button', { name: /kayit ol/i })).toBeInTheDocument();
    });

    it('renders login link', () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      expect(screen.getByText(/giris yapin/i)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows email error for invalid format', async () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const emailInput = screen.getByLabelText(/e-posta adresi/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/gecerli bir e-posta adresi giriniz/i)).toBeInTheDocument();
      });
    });

    it('shows email error when empty', async () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const emailInput = screen.getByLabelText(/e-posta adresi/i);
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/e-posta adresi gereklidir/i)).toBeInTheDocument();
      });
    });

    it('shows password validation errors', async () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const passwordInput = screen.getByLabelText(/^sifre$/i);
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        // The error message contains all requirements
        expect(screen.getByText(/sifre.*icermelidir/i)).toBeInTheDocument();
      });
    });

    it('shows confirm password mismatch error', async () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const passwordInput = screen.getByLabelText(/^sifre$/i);
      const confirmInput = screen.getByLabelText(/sifre tekrari/i);

      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'DifferentPass123!' } });
      fireEvent.blur(confirmInput);

      await waitFor(() => {
        expect(screen.getByText(/sifreler eslesmedi/i)).toBeInTheDocument();
      });
    });

    it('shows terms checkbox error when not checked', async () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      // Submit without checking terms
      const submitButton = screen.getByRole('button', { name: /kayit ol/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/kullanim kosullarini kabul etmelisiniz/i)).toBeInTheDocument();
      });
    });

    it('shows KVKK checkbox error when not checked', async () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      // Submit without checking KVKK
      const submitButton = screen.getByRole('button', { name: /kayit ol/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/kvkk aydinlatma metnini kabul etmelisiniz/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Strength Indicator', () => {
    it('shows password strength indicator when typing', async () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const passwordInput = screen.getByLabelText(/^sifre$/i);
      fireEvent.change(passwordInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText(/zayif/i)).toBeInTheDocument();
      });
    });

    it('shows strong indicator for valid password', async () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const passwordInput = screen.getByLabelText(/^sifre$/i);
      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });

      await waitFor(() => {
        expect(screen.getByText(/guclu/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with valid data', async () => {
      const user = userEvent.setup();
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      // Fill in form
      await user.type(screen.getByLabelText(/e-posta adresi/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^sifre$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/sifre tekrari/i), 'StrongPass123!');
      await user.click(screen.getByLabelText(/kullanim kosullarini kabul ediyorum/i));
      await user.click(screen.getByLabelText(/kvkk aydinlatma metnini kabul ediyorum/i));

      // Submit
      await user.click(screen.getByRole('button', { name: /kayit ol/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!',
          acceptTerms: true,
          acceptKvkk: true,
        });
      });
    });

    it('does not call onSubmit with invalid data', async () => {
      const user = userEvent.setup();
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      // Submit without filling form
      await user.click(screen.getByRole('button', { name: /kayit ol/i }));

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('disables submit button when loading', () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={true} error={null} />
      );

      const submitButton = screen.getByRole('button', { name: /kayit yapiliyor/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows loading spinner when loading', () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={true} error={null} />
      );

      expect(screen.getByText(/kayit yapiliyor/i)).toBeInTheDocument();
    });

    it('disables all inputs when loading', () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={true} error={null} />
      );

      expect(screen.getByLabelText(/e-posta adresi/i)).toBeDisabled();
      expect(screen.getByLabelText(/^sifre$/i)).toBeDisabled();
      expect(screen.getByLabelText(/sifre tekrari/i)).toBeDisabled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      const passwordInput = screen.getByLabelText(/^sifre$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Get all toggle buttons and use the first one (for password field)
      const toggleButtons = screen.getAllByLabelText(/sifreyi goster/i);
      await user.click(toggleButtons[0]);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Accessibility', () => {
    it('has proper form aria labels', () => {
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      expect(screen.getByLabelText(/kayit formu/i)).toBeInTheDocument();
    });

    it('form can be navigated with keyboard', async () => {
      const user = userEvent.setup();
      render(
        <RegisterForm onSubmit={mockOnSubmit} loading={false} error={null} />
      );

      // Email input has autoFocus, so it should already be focused
      const emailInput = screen.getByLabelText(/e-posta adresi/i);
      expect(emailInput).toHaveFocus();

      // Tab should move to password field
      await user.tab();
      expect(screen.getByLabelText(/^sifre$/i)).toHaveFocus();
    });
  });
});

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock that never resolves (to test loading state)
    mockRegister.mockImplementation(() => new Promise(() => {}));
    // Default reCAPTCHA mock that returns a token
    mockExecuteRecaptcha.mockResolvedValue('mock-recaptcha-token');
  });

  it('renders RegisterForm', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByLabelText(/kayit formu/i)).toBeInTheDocument();
  });

  describe('reCAPTCHA Integration', () => {
    it('executes reCAPTCHA on form submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      // Fill in form
      await user.type(screen.getByLabelText(/e-posta adresi/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^sifre$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/sifre tekrari/i), 'StrongPass123!');
      await user.click(screen.getByLabelText(/kullanim kosullarini kabul ediyorum/i));
      await user.click(screen.getByLabelText(/kvkk aydinlatma metnini kabul ediyorum/i));

      // Submit
      await user.click(screen.getByRole('button', { name: /kayit ol/i }));

      // Check reCAPTCHA was executed with correct action
      await waitFor(() => {
        expect(mockExecuteRecaptcha).toHaveBeenCalledWith('register');
      });
    });

    it('includes reCAPTCHA token in registration call', async () => {
      // Mock successful response
      mockRegister.mockResolvedValueOnce({
        success: true,
        message: 'Kayit basarili.',
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          emailVerified: false,
          createdAt: new Date().toISOString(),
        },
      });

      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      // Fill in form
      await user.type(screen.getByLabelText(/e-posta adresi/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^sifre$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/sifre tekrari/i), 'StrongPass123!');
      await user.click(screen.getByLabelText(/kullanim kosullarini kabul ediyorum/i));
      await user.click(screen.getByLabelText(/kvkk aydinlatma metnini kabul ediyorum/i));

      // Submit
      await user.click(screen.getByRole('button', { name: /kayit ol/i }));

      // Check that register was called with the recaptcha token
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            password: 'StrongPass123!',
          }),
          'mock-recaptcha-token'
        );
      });
    });

    it('handles reCAPTCHA execution failure gracefully', async () => {
      const { toast } = require('react-toastify');
      // Mock reCAPTCHA failure
      mockExecuteRecaptcha.mockRejectedValueOnce(new Error('reCAPTCHA failed'));

      // Mock successful registration even without token
      mockRegister.mockResolvedValueOnce({
        success: true,
        message: 'Kayit basarili.',
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          emailVerified: false,
          createdAt: new Date().toISOString(),
        },
      });

      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      // Fill in form
      await user.type(screen.getByLabelText(/e-posta adresi/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^sifre$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/sifre tekrari/i), 'StrongPass123!');
      await user.click(screen.getByLabelText(/kullanim kosullarini kabul ediyorum/i));
      await user.click(screen.getByLabelText(/kvkk aydinlatma metnini kabul ediyorum/i));

      // Submit
      await user.click(screen.getByRole('button', { name: /kayit ol/i }));

      // Should show warning but still attempt registration
      await waitFor(() => {
        expect(toast.warn).toHaveBeenCalledWith(
          expect.stringContaining('reCAPTCHA'),
          expect.any(Object)
        );
      });

      // Should still call register (graceful fallback)
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled();
      });
    });

    it('handles 403 bot detection error', async () => {
      const { toast } = require('react-toastify');
      // Mock 403 error response
      mockRegister.mockRejectedValueOnce(new Error('Bot algilandi. Lutfen tekrar deneyin.'));

      const user = userEvent.setup();
      renderWithProviders(<RegisterPage />);

      // Fill in form
      await user.type(screen.getByLabelText(/e-posta adresi/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^sifre$/i), 'StrongPass123!');
      await user.type(screen.getByLabelText(/sifre tekrari/i), 'StrongPass123!');
      await user.click(screen.getByLabelText(/kullanim kosullarini kabul ediyorum/i));
      await user.click(screen.getByLabelText(/kvkk aydinlatma metnini kabul ediyorum/i));

      // Submit
      await user.click(screen.getByRole('button', { name: /kayit ol/i }));

      // Check error toast was shown for bot detection
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Bot algilandi. Lutfen tekrar deneyin.',
          expect.any(Object)
        );
      });
    });
  });

  it('dispatches registerUser action on form submit', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<RegisterPage />);

    // Fill in form
    await user.type(screen.getByLabelText(/e-posta adresi/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^sifre$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/sifre tekrari/i), 'StrongPass123!');
    await user.click(screen.getByLabelText(/kullanim kosullarini kabul ediyorum/i));
    await user.click(screen.getByLabelText(/kvkk aydinlatma metnini kabul ediyorum/i));

    // Submit
    await user.click(screen.getByRole('button', { name: /kayit ol/i }));

    // Check loading state was set
    await waitFor(() => {
      const state = store.getState();
      expect(state.auth.loading).toBe(true);
    });
  });

  it('handles successful registration', async () => {
    // Mock successful response
    mockRegister.mockResolvedValueOnce({
      success: true,
      message: 'Kayit basarili. Lutfen e-posta adresinizi dogrulayin.',
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        emailVerified: false,
        createdAt: new Date().toISOString(),
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    // Fill in form
    await user.type(screen.getByLabelText(/e-posta adresi/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^sifre$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/sifre tekrari/i), 'StrongPass123!');
    await user.click(screen.getByLabelText(/kullanim kosullarini kabul ediyorum/i));
    await user.click(screen.getByLabelText(/kvkk aydinlatma metnini kabul ediyorum/i));

    // Submit
    await user.click(screen.getByRole('button', { name: /kayit ol/i }));

    // Check navigation to verify-email
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email');
    });
  });

  it('handles registration error', async () => {
    const { toast } = require('react-toastify');
    // Mock error response
    mockRegister.mockRejectedValueOnce(new Error('Bu e-posta adresi zaten kayitli.'));

    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    // Fill in form
    await user.type(screen.getByLabelText(/e-posta adresi/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^sifre$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/sifre tekrari/i), 'StrongPass123!');
    await user.click(screen.getByLabelText(/kullanim kosullarini kabul ediyorum/i));
    await user.click(screen.getByLabelText(/kvkk aydinlatma metnini kabul ediyorum/i));

    // Submit
    await user.click(screen.getByRole('button', { name: /kayit ol/i }));

    // Check error toast was shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Bu e-posta adresi zaten kayitli.',
        expect.any(Object)
      );
    });
  });

  it('navigates to verify-email on successful registration', async () => {
    const store = createTestStore({
      auth: {
        user: null,
        loading: false,
        error: null,
        registrationSuccess: true,
      },
    });

    renderWithProviders(<RegisterPage />, { store });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email');
    });
  });
});
