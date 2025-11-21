/**
 * Tests for authSlice verification actions
 */

import authReducer, {
  verifyEmail,
  resendVerification,
  setVerificationPending,
  resetVerification,
  clearResendSuccess,
  ExtendedAuthState,
} from './authSlice';
import { configureStore } from '@reduxjs/toolkit';
import * as authApi from '../../api/authApi';

// Mock the API
jest.mock('../../api/authApi');

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('authSlice - verification', () => {
  const initialState: ExtendedAuthState = {
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

  describe('reducers', () => {
    it('should set verification to pending', () => {
      const state = authReducer(initialState, setVerificationPending());
      expect(state.verification.status).toBe('pending');
      expect(state.verification.error).toBeNull();
    });

    it('should reset verification state', () => {
      const modifiedState: ExtendedAuthState = {
        ...initialState,
        verification: {
          status: 'success',
          error: 'some error',
          resendLoading: true,
          resendSuccess: true,
          resendError: 'resend error',
        },
      };

      const state = authReducer(modifiedState, resetVerification());
      expect(state.verification).toEqual({
        status: 'idle',
        error: null,
        resendLoading: false,
        resendSuccess: false,
        resendError: null,
      });
    });

    it('should clear resend success', () => {
      const modifiedState: ExtendedAuthState = {
        ...initialState,
        verification: {
          ...initialState.verification,
          resendSuccess: true,
          resendError: 'error',
        },
      };

      const state = authReducer(modifiedState, clearResendSuccess());
      expect(state.verification.resendSuccess).toBe(false);
      expect(state.verification.resendError).toBeNull();
    });
  });

  describe('verifyEmail thunk', () => {
    it('should set status to verifying on pending', () => {
      const action = { type: verifyEmail.pending.type };
      const state = authReducer(initialState, action);
      expect(state.verification.status).toBe('verifying');
      expect(state.verification.error).toBeNull();
    });

    it('should set status to success on fulfilled', () => {
      const action = {
        type: verifyEmail.fulfilled.type,
        payload: { success: true, message: 'Verified' },
      };
      const state = authReducer(initialState, action);
      expect(state.verification.status).toBe('success');
      expect(state.verification.error).toBeNull();
    });

    it('should update user isEmailVerified on success', () => {
      const stateWithUser: ExtendedAuthState = {
        ...initialState,
        user: {
          id: '123',
          email: 'test@example.com',
          isEmailVerified: false,
          createdAt: new Date().toISOString(),
        },
      };

      const action = {
        type: verifyEmail.fulfilled.type,
        payload: { success: true, message: 'Verified' },
      };
      const state = authReducer(stateWithUser, action);
      expect(state.user?.isEmailVerified).toBe(true);
    });

    it('should set status to error on rejected', () => {
      const action = {
        type: verifyEmail.rejected.type,
        payload: 'invalid',
      };
      const state = authReducer(initialState, action);
      expect(state.verification.status).toBe('error');
      expect(state.verification.error).toBe('invalid');
    });
  });

  describe('resendVerification thunk', () => {
    it('should set resendLoading to true on pending', () => {
      const action = { type: resendVerification.pending.type };
      const state = authReducer(initialState, action);
      expect(state.verification.resendLoading).toBe(true);
      expect(state.verification.resendSuccess).toBe(false);
      expect(state.verification.resendError).toBeNull();
    });

    it('should set resendSuccess to true on fulfilled', () => {
      const action = {
        type: resendVerification.fulfilled.type,
        payload: { success: true, message: 'Sent' },
      };
      const state = authReducer(initialState, action);
      expect(state.verification.resendLoading).toBe(false);
      expect(state.verification.resendSuccess).toBe(true);
      expect(state.verification.resendError).toBeNull();
    });

    it('should set resendError on rejected', () => {
      const action = {
        type: resendVerification.rejected.type,
        payload: 'Failed to send',
      };
      const state = authReducer(initialState, action);
      expect(state.verification.resendLoading).toBe(false);
      expect(state.verification.resendSuccess).toBe(false);
      expect(state.verification.resendError).toBe('Failed to send');
    });
  });

  describe('async thunks integration', () => {
    let store: ReturnType<typeof configureStore<{ auth: ExtendedAuthState }>>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          auth: authReducer,
        },
      });
      jest.clearAllMocks();
    });

    it('should dispatch verifyEmail and handle success', async () => {
      mockedAuthApi.verifyEmail.mockResolvedValue({
        success: true,
        message: 'Verified',
      });

      await store.dispatch(verifyEmail('valid-token') as unknown as Parameters<typeof store.dispatch>[0]);

      const state = store.getState().auth;
      expect(state.verification.status).toBe('success');
      expect(mockedAuthApi.verifyEmail).toHaveBeenCalledWith('valid-token');
    });

    it('should dispatch verifyEmail and handle error', async () => {
      mockedAuthApi.verifyEmail.mockRejectedValue(new Error('Invalid token'));

      await store.dispatch(verifyEmail('invalid-token') as unknown as Parameters<typeof store.dispatch>[0]);

      const state = store.getState().auth;
      expect(state.verification.status).toBe('error');
      expect(state.verification.error).toBe('invalid');
    });

    it('should dispatch verifyEmail and handle expired error', async () => {
      mockedAuthApi.verifyEmail.mockRejectedValue(new Error('Token has expired'));

      await store.dispatch(verifyEmail('expired-token') as unknown as Parameters<typeof store.dispatch>[0]);

      const state = store.getState().auth;
      expect(state.verification.status).toBe('error');
      expect(state.verification.error).toBe('expired');
    });

    it('should dispatch resendVerification and handle success', async () => {
      mockedAuthApi.resendVerificationEmail.mockResolvedValue({
        success: true,
        message: 'Sent',
      });

      await store.dispatch(resendVerification('test@example.com') as unknown as Parameters<typeof store.dispatch>[0]);

      const state = store.getState().auth;
      expect(state.verification.resendSuccess).toBe(true);
      expect(mockedAuthApi.resendVerificationEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should dispatch resendVerification and handle error', async () => {
      mockedAuthApi.resendVerificationEmail.mockRejectedValue(
        new Error('Rate limited')
      );

      await store.dispatch(resendVerification('test@example.com') as unknown as Parameters<typeof store.dispatch>[0]);

      const state = store.getState().auth;
      expect(state.verification.resendError).toBe('Rate limited');
    });
  });
});
