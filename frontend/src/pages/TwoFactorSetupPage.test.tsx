/**
 * Two-Factor Setup Page Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import TwoFactorSetupPage from './TwoFactorSetupPage';
import authReducer from '../store/slices/authSlice';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Create test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState,
  });
};

// Render with providers
const renderWithProviders = (ui: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </Provider>
  );
};

describe('TwoFactorSetupPage', () => {
  it('renders page title', () => {
    renderWithProviders(<TwoFactorSetupPage />);

    expect(
      screen.getByText('Iki Faktorlu Kimlik Dogrulama Kurulumu')
    ).toBeInTheDocument();
  });

  it('displays stepper with three steps', () => {
    renderWithProviders(<TwoFactorSetupPage />);

    expect(screen.getByText('QR Kodu Tara')).toBeInTheDocument();
    expect(screen.getByText('Kodu Dogrula')).toBeInTheDocument();
    expect(screen.getByText('Yedek Kodlar')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    renderWithProviders(<TwoFactorSetupPage />);

    // Should show loading since setup is initiated
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays QR code when setup data is available', () => {
    const storeWithSetupData = createTestStore({
      auth: {
        twoFactor: {
          setupData: {
            qrCode: 'data:image/png;base64,testQR',
            secret: 'TESTSECRET123',
            setupToken: 'test-token',
          },
          loading: false,
          error: null,
          isEnabled: false,
          backupCodes: null,
          challengeToken: null,
          status: null,
        },
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
      },
    });

    renderWithProviders(<TwoFactorSetupPage />, storeWithSetupData);

    // QR code should be displayed
    expect(screen.getByAltText('2FA QR Kodu')).toBeInTheDocument();
    expect(screen.getByText('Devam Et')).toBeInTheDocument();
  });

  it('displays error alert when there is an error', () => {
    const storeWithError = createTestStore({
      auth: {
        twoFactor: {
          setupData: null,
          loading: false,
          error: '2FA kurulumu basarisiz oldu.',
          isEnabled: false,
          backupCodes: null,
          challengeToken: null,
          status: null,
        },
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
      },
    });

    renderWithProviders(<TwoFactorSetupPage />, storeWithError);

    expect(screen.getByText('2FA kurulumu basarisiz oldu.')).toBeInTheDocument();
  });

  it('has accessible heading', () => {
    renderWithProviders(<TwoFactorSetupPage />);

    const heading = screen.getByRole('heading', {
      name: 'Iki Faktorlu Kimlik Dogrulama Kurulumu',
    });
    expect(heading).toBeInTheDocument();
  });
});
