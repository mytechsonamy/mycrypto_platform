/**
 * LogoutButton Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import LogoutButton from './LogoutButton';
import authReducer, { ExtendedAuthState } from '../../store/slices/authSlice';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Create a mock store
const createMockStore = (initialState: Partial<ExtendedAuthState> = {}) => {
  const defaultState: ExtendedAuthState = {
    user: { id: '1', email: 'test@example.com', isEmailVerified: true, createdAt: '' },
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
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      expiresIn: 900,
    },
    isAuthenticated: true,
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
  store = createMockStore()
) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  );
};

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders button variant correctly', () => {
    renderWithProviders(<LogoutButton />);
    expect(screen.getByRole('button', { name: /cikis yap/i })).toBeInTheDocument();
  });

  it('renders icon variant correctly', () => {
    renderWithProviders(<LogoutButton variant="icon" />);
    expect(screen.getByRole('button', { name: /cikis yap/i })).toBeInTheDocument();
  });

  it('opens confirmation dialog when clicked', () => {
    renderWithProviders(<LogoutButton />);

    fireEvent.click(screen.getByRole('button', { name: /cikis yap/i }));

    expect(screen.getByText('Cikis yapmak istediginizden emin misiniz?')).toBeInTheDocument();
  });

  it('closes dialog when cancel is clicked', () => {
    renderWithProviders(<LogoutButton />);

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /cikis yap/i }));
    expect(screen.getByText('Cikis yapmak istediginizden emin misiniz?')).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /iptal/i }));

    // Dialog should be closed
    expect(screen.queryByText('Cikis yapmak istediginizden emin misiniz?')).not.toBeInTheDocument();
  });

  it('skips confirmation dialog when showConfirmation is false', async () => {
    renderWithProviders(<LogoutButton showConfirmation={false} />);

    fireEvent.click(screen.getByRole('button', { name: /cikis yap/i }));

    // Should not show dialog
    expect(screen.queryByText('Cikis yapmak istediginizden emin misiniz?')).not.toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    const store = createMockStore({ logoutLoading: true });
    renderWithProviders(<LogoutButton />, store);

    expect(screen.getByRole('button', { name: /cikis yapiliyor/i })).toBeDisabled();
  });

  it('calls onLogoutSuccess callback when provided', async () => {
    const onLogoutSuccess = jest.fn();
    renderWithProviders(<LogoutButton onLogoutSuccess={onLogoutSuccess} showConfirmation={false} />);

    fireEvent.click(screen.getByRole('button', { name: /cikis yap/i }));

    await waitFor(() => {
      expect(onLogoutSuccess).toHaveBeenCalled();
    });
  });

  it('navigates to login on successful logout', async () => {
    renderWithProviders(<LogoutButton showConfirmation={false} />);

    fireEvent.click(screen.getByRole('button', { name: /cikis yap/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('is accessible with proper ARIA labels', () => {
    renderWithProviders(<LogoutButton />);

    const button = screen.getByRole('button', { name: /cikis yap/i });
    expect(button).toHaveAttribute('aria-label');
  });
});
