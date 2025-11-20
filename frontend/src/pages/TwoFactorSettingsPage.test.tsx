/**
 * Two-Factor Settings Page Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import TwoFactorSettingsPage from './TwoFactorSettingsPage';
import authReducer from '../store/slices/authSlice';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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

// Base auth state
const baseAuthState = {
  user: null,
  loading: false,
  error: null,
  registrationSuccess: false,
  verification: {
    status: 'idle' as const,
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
};

describe('TwoFactorSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page title', () => {
    renderWithProviders(<TwoFactorSettingsPage />);

    expect(
      screen.getByText('Iki Faktorlu Kimlik Dogrulama')
    ).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    const storeWithLoading = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: false,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: null,
          loading: true,
          error: null,
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithLoading);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays disabled status when 2FA is not enabled', async () => {
    const storeWithDisabled = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: false,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: {
            enabledAt: null,
            backupCodesRemaining: 0,
          },
          loading: false,
          error: null,
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithDisabled);

    // Wait for component to render after status fetch
    await screen.findByText('Devre Disi');
    expect(screen.getByText("2FA'yi Etkinlestir")).toBeInTheDocument();
  });

  it('displays enabled status when 2FA is enabled', () => {
    const storeWithEnabled = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: true,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: {
            enabledAt: '2024-01-15T10:30:00Z',
            backupCodesRemaining: 8,
          },
          loading: false,
          error: null,
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithEnabled);

    expect(screen.getByText('Etkin')).toBeInTheDocument();
    expect(screen.getByText('Yedek Kodlari Yenile')).toBeInTheDocument();
    expect(screen.getByText("2FA'yi Devre Disi Birak")).toBeInTheDocument();
  });

  it('shows backup codes remaining count', () => {
    const storeWithEnabled = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: true,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: {
            enabledAt: '2024-01-15T10:30:00Z',
            backupCodesRemaining: 8,
          },
          loading: false,
          error: null,
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithEnabled);

    expect(screen.getByText(/Kalan yedek kod: 8/)).toBeInTheDocument();
  });

  it('shows warning when backup codes are low', () => {
    const storeWithLowCodes = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: true,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: {
            enabledAt: '2024-01-15T10:30:00Z',
            backupCodesRemaining: 2,
          },
          loading: false,
          error: null,
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithLowCodes);

    expect(
      screen.getByText(/Kalan yedek kod sayiniz dusuk/i)
    ).toBeInTheDocument();
  });

  it('navigates to setup page when enable button is clicked', () => {
    const storeWithDisabled = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: false,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: {
            enabledAt: null,
            backupCodesRemaining: 0,
          },
          loading: false,
          error: null,
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithDisabled);

    const enableButton = screen.getByText("2FA'yi Etkinlestir");
    fireEvent.click(enableButton);

    expect(mockNavigate).toHaveBeenCalledWith('/settings/2fa/setup');
  });

  it('opens regenerate modal when regenerate button is clicked', () => {
    const storeWithEnabled = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: true,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: {
            enabledAt: '2024-01-15T10:30:00Z',
            backupCodesRemaining: 8,
          },
          loading: false,
          error: null,
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithEnabled);

    const regenerateButton = screen.getByText('Yedek Kodlari Yenile');
    fireEvent.click(regenerateButton);

    // Modal should open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens disable modal when disable button is clicked', () => {
    const storeWithEnabled = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: true,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: {
            enabledAt: '2024-01-15T10:30:00Z',
            backupCodesRemaining: 8,
          },
          loading: false,
          error: null,
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithEnabled);

    const disableButton = screen.getByText("2FA'yi Devre Disi Birak");
    fireEvent.click(disableButton);

    // Modal should open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays error message when there is an error', async () => {
    const storeWithError = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: false,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: {
            enabledAt: null,
            backupCodesRemaining: 0,
          },
          loading: false,
          error: '2FA durumu alinamadi.',
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithError);

    await screen.findByText('2FA durumu alinamadi.');
  });

  it('displays info message for enabling 2FA', async () => {
    const storeWithDisabled = createTestStore({
      auth: {
        ...baseAuthState,
        twoFactor: {
          isEnabled: false,
          setupData: null,
          backupCodes: null,
          challengeToken: null,
          status: {
            enabledAt: null,
            backupCodesRemaining: 0,
          },
          loading: false,
          error: null,
        },
      },
    });

    renderWithProviders(<TwoFactorSettingsPage />, storeWithDisabled);

    await screen.findByText(/hesabiniza ek bir guvenlik katmani ekler/i);
  });
});
