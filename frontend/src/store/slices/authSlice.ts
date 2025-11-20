/**
 * Redux slice for authentication state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, RegisterRequest, User, VerificationState, LoginRequest, TokenState, PasswordResetState, TwoFactorState, TwoFactorSetupData } from '../../types/auth.types';
import {
  register as registerApi,
  verifyEmail as verifyEmailApi,
  resendVerificationEmail as resendVerificationApi,
  login as loginApi,
  logout as logoutApi,
  requestPasswordReset as requestPasswordResetApi,
  confirmPasswordReset as confirmPasswordResetApi,
  setup2FA as setup2FAApi,
  verifySetup2FA as verifySetup2FAApi,
  verify2FA as verify2FAApi,
  get2FAStatus as get2FAStatusApi,
  regenerateBackupCodes as regenerateBackupCodesApi,
  disable2FA as disable2FAApi,
} from '../../api/authApi';

// Extended auth state with verification and tokens
export interface ExtendedAuthState extends AuthState {
  verification: VerificationState;
  tokens: TokenState;
  isAuthenticated: boolean;
  loginSuccess: boolean;
  passwordReset: PasswordResetState;
  logoutLoading: boolean;
  twoFactor: TwoFactorState;
}

// Initial state
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
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    expiresIn: null,
  },
  isAuthenticated: !!localStorage.getItem('accessToken'),
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
    loading: false,
    error: null,
  },
};

/**
 * Async thunk for user registration
 */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await registerApi(data, data.recaptchaToken);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Kayit sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for email verification
 */
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await verifyEmailApi(token);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        // Check for specific error types
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('expired') || errorMessage.includes('suresi')) {
          return rejectWithValue('expired');
        }
        if (errorMessage.includes('invalid') || errorMessage.includes('gecersiz')) {
          return rejectWithValue('invalid');
        }
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Dogrulama sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for resending verification email
 */
export const resendVerification = createAsyncThunk(
  'auth/resendVerification',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await resendVerificationApi(email);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('E-posta gonderimi sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for user login
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (data: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await loginApi(data);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Giris sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for user logout
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const response = await logoutApi();
      // Clear tokens from localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return response;
    } catch (error) {
      // Even if API call fails, we should clear local state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Cikis sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for requesting password reset
 */
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await requestPasswordResetApi(email);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Sifre sifirlama istegi sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for confirming password reset
 */
export const confirmPasswordReset = createAsyncThunk(
  'auth/confirmPasswordReset',
  async (
    { token, newPassword, confirmPassword }: { token: string; newPassword: string; confirmPassword: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await confirmPasswordResetApi(token, newPassword, confirmPassword);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Sifre degistirme sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for initiating 2FA setup
 */
export const setup2FA = createAsyncThunk(
  'auth/setup2FA',
  async (_, { rejectWithValue }) => {
    try {
      const response = await setup2FAApi();
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('2FA kurulumu sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for verifying 2FA setup
 */
export const verifySetup2FA = createAsyncThunk(
  'auth/verifySetup2FA',
  async ({ setupToken, code }: { setupToken: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await verifySetup2FAApi(setupToken, code);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('2FA dogrulama sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for verifying 2FA during login
 */
export const verify2FA = createAsyncThunk(
  'auth/verify2FA',
  async ({ challengeToken, code }: { challengeToken: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await verify2FAApi(challengeToken, code);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('2FA dogrulama sirasinda bir hata olustu.');
    }
  }
);

/**
 * Async thunk for getting 2FA status
 */
export const get2FAStatus = createAsyncThunk(
  'auth/get2FAStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await get2FAStatusApi();
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('2FA durumu alinirken bir hata olustu.');
    }
  }
);

/**
 * Async thunk for regenerating backup codes
 */
export const regenerateBackupCodes = createAsyncThunk(
  'auth/regenerateBackupCodes',
  async (password: string, { rejectWithValue }) => {
    try {
      const response = await regenerateBackupCodesApi(password);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Yedek kodlar yenilenirken bir hata olustu.');
    }
  }
);

/**
 * Async thunk for disabling 2FA
 */
export const disable2FA = createAsyncThunk(
  'auth/disable2FA',
  async ({ password, code }: { password: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await disable2FAApi(password, code);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('2FA devre disi birakilirken bir hata olustu.');
    }
  }
);

/**
 * Auth slice
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clear error state
    clearError: (state) => {
      state.error = null;
    },
    // Reset registration state
    resetRegistration: (state) => {
      state.registrationSuccess = false;
      state.error = null;
    },
    // Set user (for session restoration)
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    // Logout
    logout: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
      state.registrationSuccess = false;
      state.verification = {
        status: 'idle',
        error: null,
        resendLoading: false,
        resendSuccess: false,
        resendError: null,
      };
    },
    // Set verification to pending (after registration)
    setVerificationPending: (state) => {
      state.verification.status = 'pending';
      state.verification.error = null;
    },
    // Reset verification state
    resetVerification: (state) => {
      state.verification = {
        status: 'idle',
        error: null,
        resendLoading: false,
        resendSuccess: false,
        resendError: null,
      };
    },
    // Clear resend success
    clearResendSuccess: (state) => {
      state.verification.resendSuccess = false;
      state.verification.resendError = null;
    },
    // Reset login state
    resetLogin: (state) => {
      state.loginSuccess = false;
      state.error = null;
    },
    // Clear tokens (for logout)
    clearTokens: (state) => {
      state.tokens = {
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
      };
      state.isAuthenticated = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    // Reset password reset request state
    resetPasswordResetRequest: (state) => {
      state.passwordReset.requestLoading = false;
      state.passwordReset.requestSuccess = false;
      state.passwordReset.requestError = null;
    },
    // Reset password reset confirm state
    resetPasswordResetConfirm: (state) => {
      state.passwordReset.confirmLoading = false;
      state.passwordReset.confirmSuccess = false;
      state.passwordReset.confirmError = null;
    },
    // Reset all password reset state
    resetPasswordResetState: (state) => {
      state.passwordReset = {
        requestLoading: false,
        requestSuccess: false,
        requestError: null,
        confirmLoading: false,
        confirmSuccess: false,
        confirmError: null,
      };
    },
    // Set 2FA challenge token (from login response)
    set2FAChallengeToken: (state, action: PayloadAction<string>) => {
      state.twoFactor.challengeToken = action.payload;
    },
    // Clear 2FA challenge token
    clear2FAChallengeToken: (state) => {
      state.twoFactor.challengeToken = null;
    },
    // Reset 2FA state
    reset2FAState: (state) => {
      state.twoFactor = {
        isEnabled: false,
        setupData: null,
        backupCodes: null,
        challengeToken: null,
        status: null,
        loading: false,
        error: null,
      };
    },
    // Clear 2FA error
    clear2FAError: (state) => {
      state.twoFactor.error = null;
    },
    // Clear backup codes
    clearBackupCodes: (state) => {
      state.twoFactor.backupCodes = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register pending
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registrationSuccess = false;
      })
      // Register fulfilled
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.registrationSuccess = true;
        // User is not fully authenticated until email is verified
        // Store user data for verification page
        if (action.payload.data) {
          state.user = {
            id: action.payload.data.id,
            email: action.payload.data.email,
            isEmailVerified: action.payload.data.emailVerified,
            createdAt: action.payload.data.createdAt,
          };
        } else if (action.payload.email) {
          // Backward compatibility with legacy mock response
          state.user = {
            id: action.payload.userId || '',
            email: action.payload.email,
            isEmailVerified: false,
            createdAt: new Date().toISOString(),
          };
        }
      })
      // Register rejected
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Kayit basarisiz oldu.';
        state.registrationSuccess = false;
      })
      // Verify email pending
      .addCase(verifyEmail.pending, (state) => {
        state.verification.status = 'verifying';
        state.verification.error = null;
      })
      // Verify email fulfilled
      .addCase(verifyEmail.fulfilled, (state) => {
        state.verification.status = 'success';
        state.verification.error = null;
        // Update user email verification status if user exists
        if (state.user) {
          state.user.isEmailVerified = true;
        }
      })
      // Verify email rejected
      .addCase(verifyEmail.rejected, (state, action) => {
        state.verification.status = 'error';
        state.verification.error = action.payload as string || 'Dogrulama basarisiz oldu.';
      })
      // Resend verification pending
      .addCase(resendVerification.pending, (state) => {
        state.verification.resendLoading = true;
        state.verification.resendSuccess = false;
        state.verification.resendError = null;
      })
      // Resend verification fulfilled
      .addCase(resendVerification.fulfilled, (state) => {
        state.verification.resendLoading = false;
        state.verification.resendSuccess = true;
        state.verification.resendError = null;
      })
      // Resend verification rejected
      .addCase(resendVerification.rejected, (state, action) => {
        state.verification.resendLoading = false;
        state.verification.resendSuccess = false;
        state.verification.resendError = action.payload as string || 'E-posta gonderimi basarisiz oldu.';
      })
      // Login pending
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.loginSuccess = false;
      })
      // Login fulfilled
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.loginSuccess = true;
        state.isAuthenticated = true;

        // Store tokens
        const { access_token, refresh_token, expires_in, user } = action.payload.data;
        state.tokens = {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
        };

        // Store user info
        state.user = {
          id: user.id,
          email: user.email,
          isEmailVerified: user.email_verified,
          createdAt: new Date().toISOString(),
        };

        // Persist tokens to localStorage
        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('refreshToken', refresh_token);
      })
      // Login rejected
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Giris basarisiz oldu.';
        state.loginSuccess = false;
        state.isAuthenticated = false;
      })
      // Logout pending
      .addCase(logoutUser.pending, (state) => {
        state.logoutLoading = true;
      })
      // Logout fulfilled
      .addCase(logoutUser.fulfilled, (state) => {
        state.logoutLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.tokens = {
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
        };
        state.loginSuccess = false;
        state.error = null;
      })
      // Logout rejected
      .addCase(logoutUser.rejected, (state) => {
        state.logoutLoading = false;
        // Even if API fails, clear local state
        state.user = null;
        state.isAuthenticated = false;
        state.tokens = {
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
        };
        state.loginSuccess = false;
      })
      // Request password reset pending
      .addCase(requestPasswordReset.pending, (state) => {
        state.passwordReset.requestLoading = true;
        state.passwordReset.requestSuccess = false;
        state.passwordReset.requestError = null;
      })
      // Request password reset fulfilled
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.passwordReset.requestLoading = false;
        state.passwordReset.requestSuccess = true;
        state.passwordReset.requestError = null;
      })
      // Request password reset rejected
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.passwordReset.requestLoading = false;
        state.passwordReset.requestSuccess = false;
        state.passwordReset.requestError = action.payload as string || 'Sifre sifirlama istegi basarisiz oldu.';
      })
      // Confirm password reset pending
      .addCase(confirmPasswordReset.pending, (state) => {
        state.passwordReset.confirmLoading = true;
        state.passwordReset.confirmSuccess = false;
        state.passwordReset.confirmError = null;
      })
      // Confirm password reset fulfilled
      .addCase(confirmPasswordReset.fulfilled, (state) => {
        state.passwordReset.confirmLoading = false;
        state.passwordReset.confirmSuccess = true;
        state.passwordReset.confirmError = null;
      })
      // Confirm password reset rejected
      .addCase(confirmPasswordReset.rejected, (state, action) => {
        state.passwordReset.confirmLoading = false;
        state.passwordReset.confirmSuccess = false;
        state.passwordReset.confirmError = action.payload as string || 'Sifre degistirme basarisiz oldu.';
      })
      // Setup 2FA pending
      .addCase(setup2FA.pending, (state) => {
        state.twoFactor.loading = true;
        state.twoFactor.error = null;
      })
      // Setup 2FA fulfilled
      .addCase(setup2FA.fulfilled, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.setupData = action.payload.data;
      })
      // Setup 2FA rejected
      .addCase(setup2FA.rejected, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.error = action.payload as string || '2FA kurulumu basarisiz oldu.';
      })
      // Verify setup 2FA pending
      .addCase(verifySetup2FA.pending, (state) => {
        state.twoFactor.loading = true;
        state.twoFactor.error = null;
      })
      // Verify setup 2FA fulfilled
      .addCase(verifySetup2FA.fulfilled, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.backupCodes = action.payload.data.backupCodes;
        state.twoFactor.isEnabled = true;
        state.twoFactor.setupData = null;
      })
      // Verify setup 2FA rejected
      .addCase(verifySetup2FA.rejected, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.error = action.payload as string || '2FA dogrulama basarisiz oldu.';
      })
      // Verify 2FA pending
      .addCase(verify2FA.pending, (state) => {
        state.twoFactor.loading = true;
        state.twoFactor.error = null;
      })
      // Verify 2FA fulfilled
      .addCase(verify2FA.fulfilled, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.challengeToken = null;
        state.isAuthenticated = true;
        state.loginSuccess = true;

        // Store tokens
        const { access_token, refresh_token, expires_in, user } = action.payload.data;
        state.tokens = {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
        };

        // Store user info
        state.user = {
          id: user.id,
          email: user.email,
          isEmailVerified: user.email_verified,
          createdAt: new Date().toISOString(),
        };

        // Persist tokens to localStorage
        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('refreshToken', refresh_token);
      })
      // Verify 2FA rejected
      .addCase(verify2FA.rejected, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.error = action.payload as string || '2FA dogrulama basarisiz oldu.';
      })
      // Get 2FA status pending
      .addCase(get2FAStatus.pending, (state) => {
        state.twoFactor.loading = true;
        state.twoFactor.error = null;
      })
      // Get 2FA status fulfilled
      .addCase(get2FAStatus.fulfilled, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.isEnabled = action.payload.data.isEnabled;
        state.twoFactor.status = {
          enabledAt: action.payload.data.enabledAt,
          backupCodesRemaining: action.payload.data.backupCodesRemaining,
        };
      })
      // Get 2FA status rejected
      .addCase(get2FAStatus.rejected, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.error = action.payload as string || '2FA durumu alinamadi.';
      })
      // Regenerate backup codes pending
      .addCase(regenerateBackupCodes.pending, (state) => {
        state.twoFactor.loading = true;
        state.twoFactor.error = null;
      })
      // Regenerate backup codes fulfilled
      .addCase(regenerateBackupCodes.fulfilled, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.backupCodes = action.payload.data.backupCodes;
        if (state.twoFactor.status) {
          state.twoFactor.status.backupCodesRemaining = action.payload.data.backupCodes.length;
        }
      })
      // Regenerate backup codes rejected
      .addCase(regenerateBackupCodes.rejected, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.error = action.payload as string || 'Yedek kodlar yenilenemedi.';
      })
      // Disable 2FA pending
      .addCase(disable2FA.pending, (state) => {
        state.twoFactor.loading = true;
        state.twoFactor.error = null;
      })
      // Disable 2FA fulfilled
      .addCase(disable2FA.fulfilled, (state) => {
        state.twoFactor.loading = false;
        state.twoFactor.isEnabled = false;
        state.twoFactor.status = null;
        state.twoFactor.backupCodes = null;
      })
      // Disable 2FA rejected
      .addCase(disable2FA.rejected, (state, action) => {
        state.twoFactor.loading = false;
        state.twoFactor.error = action.payload as string || '2FA devre disi birakma basarisiz oldu.';
      });
  },
});

// Export actions
export const {
  clearError,
  resetRegistration,
  setUser,
  logout,
  setVerificationPending,
  resetVerification,
  clearResendSuccess,
  resetLogin,
  clearTokens,
  resetPasswordResetRequest,
  resetPasswordResetConfirm,
  resetPasswordResetState,
  set2FAChallengeToken,
  clear2FAChallengeToken,
  reset2FAState,
  clear2FAError,
  clearBackupCodes,
} = authSlice.actions;

// Export reducer
export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: ExtendedAuthState }) => state.auth;
export const selectAuthLoading = (state: { auth: ExtendedAuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: ExtendedAuthState }) => state.auth.error;
export const selectRegistrationSuccess = (state: { auth: ExtendedAuthState }) => state.auth.registrationSuccess;
export const selectUser = (state: { auth: ExtendedAuthState }) => state.auth.user;
export const selectVerification = (state: { auth: ExtendedAuthState }) => state.auth.verification;
export const selectVerificationStatus = (state: { auth: ExtendedAuthState }) => state.auth.verification.status;
export const selectVerificationError = (state: { auth: ExtendedAuthState }) => state.auth.verification.error;
export const selectResendLoading = (state: { auth: ExtendedAuthState }) => state.auth.verification.resendLoading;
export const selectResendSuccess = (state: { auth: ExtendedAuthState }) => state.auth.verification.resendSuccess;
export const selectLoginSuccess = (state: { auth: ExtendedAuthState }) => state.auth.loginSuccess;
export const selectIsAuthenticated = (state: { auth: ExtendedAuthState }) => state.auth.isAuthenticated;
export const selectTokens = (state: { auth: ExtendedAuthState }) => state.auth.tokens;
export const selectLogoutLoading = (state: { auth: ExtendedAuthState }) => state.auth.logoutLoading;
export const selectPasswordReset = (state: { auth: ExtendedAuthState }) => state.auth.passwordReset;
export const selectPasswordResetRequestLoading = (state: { auth: ExtendedAuthState }) => state.auth.passwordReset.requestLoading;
export const selectPasswordResetRequestSuccess = (state: { auth: ExtendedAuthState }) => state.auth.passwordReset.requestSuccess;
export const selectPasswordResetRequestError = (state: { auth: ExtendedAuthState }) => state.auth.passwordReset.requestError;
export const selectPasswordResetConfirmLoading = (state: { auth: ExtendedAuthState }) => state.auth.passwordReset.confirmLoading;
export const selectPasswordResetConfirmSuccess = (state: { auth: ExtendedAuthState }) => state.auth.passwordReset.confirmSuccess;
export const selectPasswordResetConfirmError = (state: { auth: ExtendedAuthState }) => state.auth.passwordReset.confirmError;

// 2FA selectors
export const selectTwoFactor = (state: { auth: ExtendedAuthState }) => state.auth.twoFactor;
export const select2FAEnabled = (state: { auth: ExtendedAuthState }) => state.auth.twoFactor.isEnabled;
export const select2FASetupData = (state: { auth: ExtendedAuthState }) => state.auth.twoFactor.setupData;
export const select2FABackupCodes = (state: { auth: ExtendedAuthState }) => state.auth.twoFactor.backupCodes;
export const select2FAChallengeToken = (state: { auth: ExtendedAuthState }) => state.auth.twoFactor.challengeToken;
export const select2FAStatus = (state: { auth: ExtendedAuthState }) => state.auth.twoFactor.status;
export const select2FALoading = (state: { auth: ExtendedAuthState }) => state.auth.twoFactor.loading;
export const select2FAError = (state: { auth: ExtendedAuthState }) => state.auth.twoFactor.error;
