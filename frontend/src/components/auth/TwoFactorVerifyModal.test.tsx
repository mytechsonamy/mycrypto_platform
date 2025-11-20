/**
 * Two-Factor Verify Modal Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TwoFactorVerifyModal from './TwoFactorVerifyModal';
import authReducer from '../../store/slices/authSlice';

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
  challengeToken: 'test-challenge-token',
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

// Render with provider
const renderWithProvider = (ui: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      {ui}
    </Provider>
  );
};

describe('TwoFactorVerifyModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders modal when open', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    expect(screen.getByText('Iki Faktorlu Dogrulama')).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} open={false} />);

    expect(screen.queryByText('Iki Faktorlu Dogrulama')).not.toBeInTheDocument();
  });

  it('displays countdown timer', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    expect(screen.getByText(/Kalan sure: 5:00/)).toBeInTheDocument();
  });

  it('shows instructions for TOTP code', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    expect(
      screen.getByText(/Authenticator uygulamanizda goruntulenen/i)
    ).toBeInTheDocument();
  });

  it('has code input field', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    expect(codeInput).toBeInTheDocument();
  });

  it('allows numeric input for TOTP code', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    expect(codeInput).toHaveValue('123456');
  });

  it('limits TOTP code to 6 digits', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '12345678' } });

    expect(codeInput).toHaveValue('123456');
  });

  it('strips non-numeric characters from TOTP code', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '12a3b4c' } });

    expect(codeInput).toHaveValue('1234');
  });

  it('shows backup code toggle link', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    expect(screen.getByText('Yedek kod kullan')).toBeInTheDocument();
  });

  it('switches to backup code input when toggle is clicked', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const toggleLink = screen.getByText('Yedek kod kullan');
    fireEvent.click(toggleLink);

    expect(screen.getByLabelText('Yedek kod')).toBeInTheDocument();
    expect(screen.getByText('Authenticator kodu kullan')).toBeInTheDocument();
  });

  it('shows backup code instructions when in backup mode', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const toggleLink = screen.getByText('Yedek kod kullan');
    fireEvent.click(toggleLink);

    expect(
      screen.getByText(/Yedek kodlarinizdan birini girin/i)
    ).toBeInTheDocument();
  });

  it('has cancel button', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    expect(screen.getByText('Iptal')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const cancelButton = screen.getByText('Iptal');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('has verify button', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    expect(screen.getByText('Dogrula')).toBeInTheDocument();
  });

  it('disables verify button when code is incomplete', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const verifyButton = screen.getByText('Dogrula');
    expect(verifyButton).toBeDisabled();

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '123' } });

    expect(verifyButton).toBeDisabled();
  });

  it('enables verify button when code is partially complete', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '12345' } });

    // Button should still be disabled with 5 digits
    const verifyButton = screen.getByText('Dogrula');
    expect(verifyButton).toBeDisabled();
  });

  it('closes modal when timer expires', async () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    // Advance timers by 5 minutes
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('clears code when switching between modes', () => {
    renderWithProvider(<TwoFactorVerifyModal {...defaultProps} />);

    const codeInput = screen.getByLabelText('Dogrulama kodu');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    const toggleLink = screen.getByText('Yedek kod kullan');
    fireEvent.click(toggleLink);

    const backupInput = screen.getByLabelText('Yedek kod');
    expect(backupInput).toHaveValue('');
  });
});
