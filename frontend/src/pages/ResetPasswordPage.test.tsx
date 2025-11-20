/**
 * ResetPasswordPage Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import ResetPasswordPage from './ResetPasswordPage';
import authReducer, { ExtendedAuthState } from '../store/slices/authSlice';

// Create a mock store
const createMockStore = (initialState: Partial<ExtendedAuthState> = {}) => {
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
    ...initialState,
  };

  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: defaultState,
    },
  });
};

const renderWithProviders = (
  ui: React.ReactElement,
  store = createMockStore(),
  initialEntries = ['/reset-password?token=valid-token']
) => {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/reset-password" element={ui} />
          <Route path="/forgot-password" element={<div>Forgot Password</div>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('ResetPasswordPage', () => {
  describe('With valid token', () => {
    it('renders the reset password form', () => {
      const { container } = renderWithProviders(<ResetPasswordPage />);

      expect(screen.getByText('Yeni Sifre Belirle')).toBeInTheDocument();
      expect(container.querySelector('#newPassword')).toBeInTheDocument();
      expect(container.querySelector('#confirmPassword')).toBeInTheDocument();
    });

    it('shows loading state from store', () => {
      const store = createMockStore({
        passwordReset: {
          requestLoading: false,
          requestSuccess: false,
          requestError: null,
          confirmLoading: true,
          confirmSuccess: false,
          confirmError: null,
        },
      });

      renderWithProviders(<ResetPasswordPage />, store);

      expect(screen.getByRole('button', { name: /sifre degistiriliyor/i })).toBeDisabled();
    });

    it('shows error from store', () => {
      const store = createMockStore({
        passwordReset: {
          requestLoading: false,
          requestSuccess: false,
          requestError: null,
          confirmLoading: false,
          confirmSuccess: false,
          confirmError: 'Gecersiz sifre sifirlama baglantisi.',
        },
      });

      renderWithProviders(<ResetPasswordPage />, store);

      expect(screen.getByText('Gecersiz sifre sifirlama baglantisi.')).toBeInTheDocument();
    });

    it('shows success state from store', () => {
      const store = createMockStore({
        passwordReset: {
          requestLoading: false,
          requestSuccess: false,
          requestError: null,
          confirmLoading: false,
          confirmSuccess: true,
          confirmError: null,
        },
      });

      renderWithProviders(<ResetPasswordPage />, store);

      expect(screen.getByText('Sifre Degistirildi')).toBeInTheDocument();
    });

    it('dispatches confirmPasswordReset on form submit', async () => {
      const store = createMockStore();
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      const { container } = renderWithProviders(<ResetPasswordPage />, store);

      const passwordInput = container.querySelector('#newPassword') as HTMLInputElement;
      const confirmPasswordInput = container.querySelector('#confirmPassword') as HTMLInputElement;

      fireEvent.change(passwordInput, { target: { value: 'Test123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Test123!' } });

      fireEvent.click(screen.getByRole('button', { name: /sifreyi degistir/i }));

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Without token', () => {
    it('shows invalid link error', () => {
      renderWithProviders(
        <ResetPasswordPage />,
        createMockStore(),
        ['/reset-password']
      );

      expect(screen.getByText('Gecersiz Baglanti')).toBeInTheDocument();
      expect(screen.getByText(/sifre sifirlama baglantisi gecersiz veya eksik/i)).toBeInTheDocument();
    });

    it('shows link to request new reset', () => {
      renderWithProviders(
        <ResetPasswordPage />,
        createMockStore(),
        ['/reset-password']
      );

      expect(screen.getByRole('link', { name: /yeni sifirlama istegi gonder/i })).toBeInTheDocument();
    });

    it('shows link to login', () => {
      renderWithProviders(
        <ResetPasswordPage />,
        createMockStore(),
        ['/reset-password']
      );

      expect(screen.getByRole('link', { name: /giris sayfasina don/i })).toBeInTheDocument();
    });
  });
});
