/**
 * ForgotPasswordPage Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import ForgotPasswordPage from './ForgotPasswordPage';
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
    twoFactor: {
      isEnabled: false,
      setupData: null,
      backupCodes: null,
      challengeToken: null,
      status: null,
      error: null,
      loading: false,
    },
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
  store = createMockStore()
) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  );
};

describe('ForgotPasswordPage', () => {
  it('renders the forgot password form', () => {
    renderWithProviders(<ForgotPasswordPage />);

    expect(screen.getByText('Sifremi Unuttum')).toBeInTheDocument();
    expect(screen.getByLabelText(/e-posta/i)).toBeInTheDocument();
  });

  it('shows loading state from store', () => {
    const store = createMockStore({
      passwordReset: {
        requestLoading: true,
        requestSuccess: false,
        requestError: null,
        confirmLoading: false,
        confirmSuccess: false,
        confirmError: null,
      },
    });

    renderWithProviders(<ForgotPasswordPage />, store);

    expect(screen.getByRole('button', { name: /gonderiliyor/i })).toBeDisabled();
  });

  it('shows error from store', () => {
    const store = createMockStore({
      passwordReset: {
        requestLoading: false,
        requestSuccess: false,
        requestError: 'Cok fazla istek gonderdiniz.',
        confirmLoading: false,
        confirmSuccess: false,
        confirmError: null,
      },
    });

    renderWithProviders(<ForgotPasswordPage />, store);

    expect(screen.getByText('Cok fazla istek gonderdiniz.')).toBeInTheDocument();
  });

  it('shows success state from store', () => {
    const store = createMockStore({
      passwordReset: {
        requestLoading: false,
        requestSuccess: true,
        requestError: null,
        confirmLoading: false,
        confirmSuccess: false,
        confirmError: null,
      },
    });

    renderWithProviders(<ForgotPasswordPage />, store);

    expect(screen.getByText('E-posta Gonderildi')).toBeInTheDocument();
  });

  it('dispatches requestPasswordReset on form submit', async () => {
    const store = createMockStore();
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    renderWithProviders(<ForgotPasswordPage />, store);

    const emailInput = screen.getByLabelText(/e-posta/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /sifirlama baglantisi gonder/i }));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled();
    });
  });
});
