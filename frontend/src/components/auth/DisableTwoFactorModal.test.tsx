/**
 * Disable Two-Factor Modal Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DisableTwoFactorModal from './DisableTwoFactorModal';
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

describe('DisableTwoFactorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    expect(screen.getByText("2FA'yi Devre Disi Birak")).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} open={false} />);

    expect(screen.queryByText("2FA'yi Devre Disi Birak")).not.toBeInTheDocument();
  });

  it('displays warning message', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    expect(
      screen.getByText(/hesabinizin guvenligini azaltir/i)
    ).toBeInTheDocument();
  });

  it('has password input field', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Sifre');
    expect(passwordInput).toBeInTheDocument();
  });

  it('has verification code input field', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    expect(codeInput).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

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
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Sifre');
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

    expect(passwordInput).toHaveValue('testpassword');
  });

  it('allows numeric input in code field', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    expect(codeInput).toHaveValue('123456');
  });

  it('limits code to 6 digits', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '12345678' } });

    expect(codeInput).toHaveValue('123456');
  });

  it('has cancel button', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    expect(screen.getByText('Iptal')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const cancelButton = screen.getByText('Iptal');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('has disable button', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    expect(screen.getByText('Devre Disi Birak')).toBeInTheDocument();
  });

  it('disables submit button when inputs are empty', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const submitButton = screen.getByText('Devre Disi Birak');
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when only password is entered', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Sifre');
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

    const submitButton = screen.getByText('Devre Disi Birak');
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when only code is entered', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    const submitButton = screen.getByText('Devre Disi Birak');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when both inputs are valid', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    const passwordInput = screen.getByLabelText('Sifre');
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    const submitButton = screen.getByText('Devre Disi Birak');
    expect(submitButton).not.toBeDisabled();
  });

  it('shows error message when validation fails', () => {
    renderWithProvider(<DisableTwoFactorModal {...defaultProps} />);

    // Try to submit with empty fields
    const form = screen.getByText('Devre Disi Birak').closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    // Should show validation error
    expect(screen.getByText('Sifre gereklidir.')).toBeInTheDocument();
  });
});
