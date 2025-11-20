/**
 * Tests for VerifyEmailPage container component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { ExtendedAuthState } from '../store/slices/authSlice';
import VerifyEmailPage from './VerifyEmailPage';
import { toast } from 'react-toastify';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Helper to create a test store
const createTestStore = (initialState: Partial<ExtendedAuthState> = {}) => {
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

// Helper to render with providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    store = createTestStore(),
    route = '/verify-email',
    ...renderOptions
  } = {}
) => {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </Provider>,
    renderOptions
  );
};

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Without token', () => {
    it('shows pending state when no token is provided', async () => {
      renderWithProviders(<VerifyEmailPage />, { route: '/verify-email' });

      await waitFor(() => {
        expect(screen.getByText('E-posta Dogrulamasi')).toBeInTheDocument();
      });
    });

    it('shows email input for resend', async () => {
      renderWithProviders(<VerifyEmailPage />, { route: '/verify-email' });

      await waitFor(() => {
        expect(screen.getByLabelText(/E-posta Adresi/i)).toBeInTheDocument();
      });
    });

    it('pre-fills email when user is in state', async () => {
      const store = createTestStore({
        user: {
          id: '123',
          email: 'test@example.com',
          isEmailVerified: false,
          createdAt: new Date().toISOString(),
        },
      });

      renderWithProviders(<VerifyEmailPage />, { store, route: '/verify-email' });

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/E-posta Adresi/i);
        expect(emailInput).toHaveValue('test@example.com');
      });
    });
  });

  describe('With token', () => {
    it('shows processing state when token is provided', async () => {
      renderWithProviders(<VerifyEmailPage />, {
        route: '/verify-email?token=valid-token',
      });

      await waitFor(() => {
        expect(screen.getByText('Dogrulaniyor...')).toBeInTheDocument();
      });
    });

    it('dispatches verifyEmail action with token', async () => {
      const store = createTestStore();

      renderWithProviders(<VerifyEmailPage />, {
        store,
        route: '/verify-email?token=test-token',
      });

      // When token is present, it should show verifying state
      await waitFor(() => {
        const state = store.getState().auth;
        expect(state.verification.status).toBe('verifying');
      });
    });
  });

  describe('Verification states', () => {
    it('shows success state when verification succeeds', async () => {
      const store = createTestStore();

      // Start with verifying state
      store.dispatch({
        type: 'auth/verifyEmail/pending',
      });

      renderWithProviders(<VerifyEmailPage />, { store });

      // Dispatch success
      store.dispatch({
        type: 'auth/verifyEmail/fulfilled',
        payload: { success: true, message: 'Verified' },
      });

      await waitFor(() => {
        expect(screen.getByText('E-posta Dogrulandi!')).toBeInTheDocument();
      });
    });

    it('shows error state with invalid error type', async () => {
      const store = createTestStore();

      renderWithProviders(<VerifyEmailPage />, { store });

      // Dispatch error
      store.dispatch({
        type: 'auth/verifyEmail/rejected',
        payload: 'invalid',
      });

      await waitFor(() => {
        expect(screen.getByText('Gecersiz Baglanti')).toBeInTheDocument();
      });
    });

    it('shows error state with expired error type', async () => {
      const store = createTestStore();

      renderWithProviders(<VerifyEmailPage />, { store });

      // Dispatch error
      store.dispatch({
        type: 'auth/verifyEmail/rejected',
        payload: 'expired',
      });

      await waitFor(() => {
        expect(screen.getByText('Baglanti Suresi Doldu')).toBeInTheDocument();
      });
    });
  });

  describe('Resend verification', () => {
    it('shows loading state when resending', async () => {
      const store = createTestStore();

      renderWithProviders(<VerifyEmailPage />, { store });

      // Set pending state first
      store.dispatch({ type: 'auth/setVerificationPending' });

      // Dispatch resend pending
      store.dispatch({
        type: 'auth/resendVerification/pending',
      });

      await waitFor(() => {
        expect(screen.getByText('Gonderiliyor...')).toBeInTheDocument();
      });
    });

    it('shows success toast when resend succeeds', async () => {
      const store = createTestStore();

      renderWithProviders(<VerifyEmailPage />, { store });

      // Set pending state first
      store.dispatch({ type: 'auth/setVerificationPending' });

      // Dispatch resend success
      store.dispatch({
        type: 'auth/resendVerification/fulfilled',
        payload: { success: true, message: 'Sent' },
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Dogrulama e-postasi yeniden gonderildi.',
          expect.any(Object)
        );
      });
    });

    it('shows error toast when resend fails', async () => {
      const store = createTestStore();

      renderWithProviders(<VerifyEmailPage />, { store });

      // Set pending state first
      store.dispatch({ type: 'auth/setVerificationPending' });

      // Dispatch resend error
      store.dispatch({
        type: 'auth/resendVerification/rejected',
        payload: 'Resend failed',
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Resend failed',
          expect.any(Object)
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper document structure', async () => {
      renderWithProviders(<VerifyEmailPage />);

      await waitFor(() => {
        // Main container should be present
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });

    it('has accessible form elements', async () => {
      renderWithProviders(<VerifyEmailPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/E-posta Adresi/i);
        expect(emailInput).toHaveAttribute('type', 'email');
      });
    });
  });

  describe('Cleanup', () => {
    it('resets verification state on unmount', () => {
      const store = createTestStore();
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      const { unmount } = renderWithProviders(<VerifyEmailPage />, { store });
      unmount();

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth/resetVerification',
        })
      );
    });
  });
});
