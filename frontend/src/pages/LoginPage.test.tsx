/**
 * LoginPage Container Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ToastContainer } from 'react-toastify';
import LoginPage from './LoginPage';
import authReducer, { ExtendedAuthState } from '../store/slices/authSlice';

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Helper to create store with custom initial state
const createTestStore = (initialState?: Partial<ExtendedAuthState>) => {
  const defaultState: ExtendedAuthState = {
    user: null,
    loading: false,
    error: null,
    registrationSuccess: false,
    verification: {
      status: 'idle',
      error: null,
      resendLoading: false,
      resendSuccess: false,
      resendError: null,
    },
    tokens: {
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
    },
    isAuthenticated: false,
    loginSuccess: false,
    passwordReset: {
      requestLoading: false,
      requestSuccess: false,
      requestError: null,
      confirmLoading: false,
      confirmSuccess: false,
      confirmError: null,
    },
    logoutLoading: false,
    twoFactor: {
      isEnabled: false,
      setupData: null,
      backupCodes: null,
      challengeToken: null,
      status: null,
      error: null,
      loading: false,
    },
  };

  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: { ...defaultState, ...initialState },
    },
  });
};

// Wrapper component with all providers
const renderWithProviders = (
  ui: React.ReactElement,
  initialState?: Partial<ExtendedAuthState>
) => {
  const store = createTestStore(initialState);

  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          {ui}
          <ToastContainer />
        </BrowserRouter>
      </Provider>
    ),
    store,
  };
};

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('renders login form', () => {
      const { container } = renderWithProviders(<LoginPage />);

      expect(screen.getByRole('heading', { name: /giriş yap/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/e-posta/i)).toBeInTheDocument();
      expect(container.querySelector('#password')).toBeInTheDocument();
    });

    it('renders in a centered container', () => {
      renderWithProviders(<LoginPage />);

      const container = screen.getByRole('main');
      expect(container).toHaveAttribute('class', expect.stringContaining('MuiContainer'));
    });
  });

  describe('Authentication Redirect', () => {
    it('redirects to dashboard if already authenticated', () => {
      renderWithProviders(<LoginPage />, {
        isAuthenticated: true,
        tokens: {
          accessToken: 'test-token',
          refreshToken: 'test-refresh',
          expiresIn: 900,
        },
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('does not redirect if not authenticated', () => {
      renderWithProviders(<LoginPage />, {
        isAuthenticated: false,
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('dispatches login action on form submit', async () => {
      const { store, container } = renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/e-posta/i);
      const passwordInput = container.querySelector('#password') as HTMLElement;
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'SecurePass123!');
      await userEvent.click(submitButton);

      // Check that loading state is set
      await waitFor(() => {
        const state = store.getState().auth;
        expect(state.loading).toBe(true);
      });
    });
  });

  describe('Remember Me', () => {
    it('stores email in localStorage when remember me is checked', async () => {
      const { container } = renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/e-posta/i);
      const passwordInput = container.querySelector('#password') as HTMLElement;
      const rememberMeCheckbox = screen.getByLabelText(/beni hatırla/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'SecurePass123!');
      await userEvent.click(rememberMeCheckbox);
      await userEvent.click(submitButton);

      expect(localStorage.getItem('rememberMe')).toBe('true');
      expect(localStorage.getItem('rememberedEmail')).toBe('test@example.com');
    });

    it('removes email from localStorage when remember me is unchecked', async () => {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberedEmail', 'old@example.com');

      const { container } = renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/e-posta/i);
      const passwordInput = container.querySelector('#password') as HTMLElement;
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'SecurePass123!');
      await userEvent.click(submitButton);

      expect(localStorage.getItem('rememberMe')).toBeNull();
      expect(localStorage.getItem('rememberedEmail')).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('passes loading state to LoginForm', () => {
      renderWithProviders(<LoginPage />, {
        loading: true,
      });

      expect(screen.getByRole('button', { name: /giriş yapılıyor/i })).toBeDisabled();
      expect(screen.getByLabelText(/e-posta/i)).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('passes error to LoginForm', () => {
      const errorMessage = 'E-posta veya şifre hatalı';
      renderWithProviders(<LoginPage />, {
        error: errorMessage,
      });

      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });
  });

  describe('Successful Login', () => {
    it('redirects to dashboard on successful login', async () => {
      renderWithProviders(<LoginPage />, {
        loginSuccess: true,
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });
  });
});
