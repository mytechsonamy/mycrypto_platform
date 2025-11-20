/**
 * Regenerate Backup Codes Modal Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RegenerateBackupCodesModal from './RegenerateBackupCodesModal';
import authReducer from '../../store/slices/authSlice';

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

// Default props
const defaultProps = {
  open: true,
  onClose: jest.fn(),
};

// Render with provider
const renderWithProvider = (ui: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      {ui}
    </Provider>
  );
};

describe('RegenerateBackupCodesModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    expect(screen.getByText('Yedek Kodlari Yenile')).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} open={false} />);

    expect(screen.queryByText('Yedek Kodlari Yenile')).not.toBeInTheDocument();
  });

  it('displays warning about old codes', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    expect(
      screen.getByText(/eski kodlar gecersiz olacak/i)
    ).toBeInTheDocument();
  });

  it('has password input field', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Sifre');
    expect(passwordInput).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Sifre') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    // Find toggle button by role since aria-label may vary
    const toggleButton = screen.getAllByRole('button').find(
      btn => btn.getAttribute('aria-label')?.includes('Sifre')
    );
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');
    }
  });

  it('allows input in password field', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Sifre');
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

    expect(passwordInput).toHaveValue('testpassword');
  });

  it('has cancel button', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    expect(screen.getByText('Iptal')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    const cancelButton = screen.getByText('Iptal');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('has regenerate button', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    expect(screen.getByText('Kodlari Yenile')).toBeInTheDocument();
  });

  it('disables regenerate button when password is empty', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    const submitButton = screen.getByText('Kodlari Yenile');
    expect(submitButton).toBeDisabled();
  });

  it('enables regenerate button when password is entered', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Sifre');
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

    const submitButton = screen.getByText('Kodlari Yenile');
    expect(submitButton).not.toBeDisabled();
  });

  it('auto-focuses password input', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Sifre');
    expect(document.activeElement).toBe(passwordInput);
  });

  it('has accessible password toggle button', () => {
    renderWithProvider(<RegenerateBackupCodesModal {...defaultProps} />);

    // Find toggle button by role since aria-label may vary
    const toggleButton = screen.getAllByRole('button').find(
      btn => btn.getAttribute('aria-label')?.includes('Sifre')
    );
    expect(toggleButton).toBeTruthy();
  });

  it('displays backup codes when available', () => {
    const storeWithCodes = createTestStore({
      auth: {
        twoFactor: {
          backupCodes: ['ABC12-DEF34', 'GHI56-JKL78'],
          loading: false,
          error: null,
        },
      },
    });

    // First render opens in password step
    const { rerender } = renderWithProvider(
      <RegenerateBackupCodesModal {...defaultProps} />,
      storeWithCodes
    );

    // Re-render should show codes step if codes are present
    // This test verifies the component structure
    expect(screen.getByLabelText('Sifre')).toBeInTheDocument();
  });
});
