/**
 * Authentication API client
 * Integrates with real backend API at /api/v1/auth
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  RegisterRequest,
  RegisterResponse,
  ApiErrorResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  PasswordResetResponse,
  PasswordResetConfirmResponse,
  TwoFactorSetupResponse,
  TwoFactorVerifySetupResponse,
  TwoFactorVerifyResponse,
  TwoFactorStatusResponse,
  TwoFactorRegenerateCodesResponse,
  TwoFactorDisableResponse,
  LoginResponseWith2FA,
} from '../types/auth.types';

// API base URL - configured via environment variables
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor for adding auth tokens
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Map HTTP status codes and backend errors to user-friendly Turkish messages
 */
const mapErrorToMessage = (error: AxiosError<ApiErrorResponse>): string => {
  if (!error.response) {
    // Network error - no response received
    return 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
  }

  const { status, data } = error.response;

  // Handle specific error codes
  switch (status) {
    case 400:
      // Validation errors
      if (data?.errors && data.errors.length > 0) {
        // Return the first validation error
        return data.errors[0].message || 'Geçersiz veri girdiniz.';
      }
      return data?.message || 'Geçersiz istek. Lütfen bilgilerinizi kontrol edin.';

    case 409:
      // Conflict - email already exists
      return 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya başka bir e-posta kullanın.';

    case 422:
      // Unprocessable entity
      return data?.message || 'İşlem yapılamadı. Lütfen bilgilerinizi kontrol edin.';

    case 429:
      // Too many requests
      return 'Çok fazla istek gönderdiniz. Lütfen bir süre bekleyin.';

    case 500:
    case 502:
    case 503:
      // Server errors
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';

    default:
      return data?.message || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }
};

// Flag to use mock responses during development (set to false for real API)
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API === 'true';

// Mock delay to simulate network latency
const mockDelay = (ms: number = 1000): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Register a new user
 * @param data - Registration data
 * @param recaptchaToken - Optional reCAPTCHA v3 token for bot protection
 */
export const register = async (
  data: RegisterRequest,
  recaptchaToken?: string
): Promise<RegisterResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(1500);

    // Mock validation - simulate backend validation
    if (data.email === 'existing@example.com') {
      throw new Error('Bu e-posta adresi zaten kayıtlı.');
    }

    // Mock success response
    return {
      success: true,
      message: 'Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın.',
      data: {
        id: 'mock-user-id-' + Date.now(),
        email: data.email,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      },
    };
  }

  try {
    // Build headers with optional reCAPTCHA token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (recaptchaToken) {
      headers['X-Recaptcha-Token'] = recaptchaToken;
    }

    const response = await apiClient.post<RegisterResponse>(
      '/auth/register',
      {
        email: data.email,
        password: data.password,
      },
      { headers }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      // Handle bot detection (403) with specific message
      if (axiosError.response?.status === 403) {
        throw new Error('Bot algılandı. Lütfen tekrar deneyin.');
      }

      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
  }
};

/**
 * Verify email with token
 */
export const verifyEmail = async (token: string): Promise<{ success: boolean; message: string }> => {
  if (USE_MOCK_API) {
    await mockDelay(1000);
    return {
      success: true,
      message: 'E-posta adresiniz başarıyla doğrulandı.',
    };
  }

  const response = await apiClient.post('/auth/verify-email', { token });
  return response.data;
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  if (USE_MOCK_API) {
    await mockDelay(1000);
    return {
      success: true,
      message: 'Doğrulama e-postası yeniden gönderildi.',
    };
  }

  const response = await apiClient.post('/auth/resend-verification', { email });
  return response.data;
};

/**
 * Login user
 * @param data - Login credentials
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(1500);

    // Mock validation - simulate backend validation
    if (data.email === 'locked@example.com') {
      const error = new Error('Hesabınız kilitlendi. Lütfen daha sonra deneyin.') as Error & { status?: number };
      error.status = 403;
      throw error;
    }

    if (data.email !== 'test@example.com' || data.password !== 'Test123!') {
      const error = new Error('E-posta veya şifre hatalı') as Error & { status?: number };
      error.status = 401;
      throw error;
    }

    // Mock success response
    return {
      success: true,
      data: {
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        token_type: 'Bearer',
        expires_in: 900,
        user: {
          id: 'mock-user-id-123',
          email: data.email,
          email_verified: true,
        },
      },
    };
  }

  try {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email: data.email,
      password: data.password,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const status = axiosError.response?.status;

      // Handle specific status codes for login
      if (status === 401) {
        throw new Error('E-posta veya şifre hatalı');
      }
      if (status === 403) {
        throw new Error('Hesabınız kilitlendi. Lütfen daha sonra deneyin.');
      }
      if (status === 429) {
        throw new Error('Çok fazla deneme. Lütfen bekleyin.');
      }

      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.');
  }
};

/**
 * Logout user
 * Invalidates the current session on the backend
 */
export const logout = async (): Promise<LogoutResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(500);
    return {
      success: true,
      message: 'Başarıyla çıkış yapıldı.',
    };
  }

  try {
    const response = await apiClient.post<LogoutResponse>('/auth/logout');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('Çıkış sırasında bir hata oluştu.');
  }
};

/**
 * Request password reset
 * Sends a password reset email to the user
 */
export const requestPasswordReset = async (email: string): Promise<PasswordResetResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(1000);

    // Always return success for security (don't reveal if email exists)
    return {
      success: true,
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
    };
  }

  try {
    const response = await apiClient.post<PasswordResetResponse>(
      '/auth/password-reset/request',
      { email }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const status = axiosError.response?.status;

      // Handle rate limiting
      if (status === 429) {
        throw new Error('Çok fazla istek gönderdiniz. Lütfen bir süre bekleyin.');
      }

      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('Şifre sıfırlama isteği sırasında bir hata oluştu.');
  }
};

/**
 * Confirm password reset
 * Resets the password using the token from email
 */
export const confirmPasswordReset = async (
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<PasswordResetConfirmResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(1000);

    // Simulate token validation
    if (token === 'expired-token') {
      throw new Error('Şifre sıfırlama bağlantısının süresi dolmuş. Lütfen yeni bir istek gönderin.');
    }
    if (token === 'invalid-token') {
      throw new Error('Geçersiz şifre sıfırlama bağlantısı.');
    }

    return {
      success: true,
      message: 'Şifreniz başarıyla değiştirildi.',
    };
  }

  try {
    const response = await apiClient.post<PasswordResetConfirmResponse>(
      '/auth/password-reset/confirm',
      {
        token,
        newPassword,
        confirmPassword,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const status = axiosError.response?.status;

      // Handle specific status codes
      if (status === 400 || status === 422) {
        const message = axiosError.response?.data?.message;
        if (message?.toLowerCase().includes('expired') || message?.toLowerCase().includes('suresi')) {
          throw new Error('Şifre sıfırlama bağlantısının süresi dolmuş. Lütfen yeni bir istek gönderin.');
        }
        if (message?.toLowerCase().includes('invalid') || message?.toLowerCase().includes('gecersiz')) {
          throw new Error('Geçersiz şifre sıfırlama bağlantısı.');
        }
      }

      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('Şifre değiştirme sırasında bir hata oluştu.');
  }
};

/**
 * Initialize 2FA setup
 * Returns QR code and secret for authenticator app
 */
export const setup2FA = async (): Promise<TwoFactorSetupResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(1000);
    return {
      success: true,
      data: {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        setupToken: 'mock-setup-token-' + Date.now(),
      },
    };
  }

  try {
    const response = await apiClient.post<TwoFactorSetupResponse>('/auth/2fa/setup');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('2FA kurulumu sırasında bir hata oluştu.');
  }
};

/**
 * Verify 2FA setup with code from authenticator
 * Returns backup codes on success
 */
export const verifySetup2FA = async (
  setupToken: string,
  code: string
): Promise<TwoFactorVerifySetupResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(1000);

    if (code !== '123456') {
      throw new Error('Geçersiz doğrulama kodu.');
    }

    return {
      success: true,
      data: {
        backupCodes: [
          'ABC12-DEF34', 'GHI56-JKL78', 'MNO90-PQR12',
          'STU34-VWX56', 'YZA78-BCD90', 'EFG12-HIJ34',
          'KLM56-NOP78', 'QRS90-TUV12', 'WXY34-ZAB56',
          'CDE78-FGH90',
        ],
      },
    };
  }

  try {
    const response = await apiClient.post<TwoFactorVerifySetupResponse>(
      '/auth/2fa/verify-setup',
      { setupToken, code }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const status = axiosError.response?.status;

      if (status === 400 || status === 401) {
        throw new Error('Geçersiz doğrulama kodu. Lütfen tekrar deneyin.');
      }

      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('2FA doğrulama sırasında bir hata oluştu.');
  }
};

/**
 * Verify 2FA code during login
 * Returns tokens on success
 */
export const verify2FA = async (
  challengeToken: string,
  code: string
): Promise<TwoFactorVerifyResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(1000);

    if (code !== '123456' && !code.includes('-')) {
      throw new Error('Gecersiz dogrulama kodu.');
    }

    return {
      success: true,
      data: {
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        token_type: 'Bearer',
        expires_in: 900,
        user: {
          id: 'mock-user-id-123',
          email: 'test@example.com',
          email_verified: true,
        },
      },
    };
  }

  try {
    const response = await apiClient.post<TwoFactorVerifyResponse>(
      '/auth/2fa/verify',
      { challengeToken, code }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const status = axiosError.response?.status;

      if (status === 400 || status === 401) {
        throw new Error('Geçersiz doğrulama kodu. Lütfen tekrar deneyin.');
      }
      if (status === 429) {
        throw new Error('Çok fazla deneme. Lütfen bekleyin.');
      }

      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('2FA doğrulama sırasında bir hata oluştu.');
  }
};

/**
 * Get current 2FA status
 */
export const get2FAStatus = async (): Promise<TwoFactorStatusResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(500);
    return {
      success: true,
      data: {
        isEnabled: false,
        enabledAt: null,
        backupCodesRemaining: 0,
      },
    };
  }

  try {
    const response = await apiClient.get<TwoFactorStatusResponse>('/auth/2fa/status');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('2FA durumu alınırken bir hata oluştu.');
  }
};

/**
 * Regenerate backup codes
 */
export const regenerateBackupCodes = async (
  password: string
): Promise<TwoFactorRegenerateCodesResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(1000);

    if (password !== 'Test123!') {
      throw new Error('Geçersiz şifre.');
    }

    return {
      success: true,
      data: {
        backupCodes: [
          'NEW12-ABC34', 'NEW56-DEF78', 'NEW90-GHI12',
          'NEW34-JKL56', 'NEW78-MNO90', 'NEW12-PQR34',
          'NEW56-STU78', 'NEW90-VWX12', 'NEW34-YZA56',
          'NEW78-BCD90',
        ],
      },
    };
  }

  try {
    const response = await apiClient.post<TwoFactorRegenerateCodesResponse>(
      '/auth/2fa/backup-codes/regenerate',
      { password }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const status = axiosError.response?.status;

      if (status === 401) {
        throw new Error('Geçersiz şifre.');
      }

      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('Yedek kodlar yenilenirken bir hata oluştu.');
  }
};

/**
 * Disable 2FA
 */
export const disable2FA = async (
  password: string,
  code: string
): Promise<TwoFactorDisableResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(1000);

    if (password !== 'Test123!' || code !== '123456') {
      throw new Error('Geçersiz şifre veya doğrulama kodu.');
    }

    return {
      success: true,
      message: '2FA başarıyla devre dışı bırakıldı.',
    };
  }

  try {
    const response = await apiClient.post<TwoFactorDisableResponse>(
      '/auth/2fa/disable',
      { password, code }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const status = axiosError.response?.status;

      if (status === 401) {
        throw new Error('Geçersiz şifre veya doğrulama kodu.');
      }

      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('2FA devre dışı bırakılırken bir hata oluştu.');
  }
};

/**
 * Login with 2FA support
 * Returns either tokens or challengeToken for 2FA
 */
export const loginWith2FA = async (data: LoginRequest): Promise<LoginResponseWith2FA> => {
  if (USE_MOCK_API) {
    await mockDelay(1500);

    // Mock validation
    if (data.email === 'locked@example.com') {
      throw new Error('Hesabınız kilitlendi. Lütfen daha sonra deneyin.');
    }

    // Mock user with 2FA enabled
    if (data.email === '2fa@example.com' && data.password === 'Test123!') {
      return {
        success: true,
        requires2FA: true,
        challengeToken: 'mock-challenge-token-' + Date.now(),
        data: {
          access_token: '',
          refresh_token: '',
          token_type: 'Bearer',
          expires_in: 0,
          user: {
            id: '',
            email: data.email,
            email_verified: true,
          },
        },
      };
    }

    // Validate test user credentials
    if (data.email !== 'test@example.com' || data.password !== 'Test123!') {
      throw new Error('E-posta veya şifre hatalı');
    }

    // Mock success response without 2FA
    return {
      success: true,
      data: {
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        token_type: 'Bearer',
        expires_in: 900,
        user: {
          id: 'mock-user-id-123',
          email: data.email,
          email_verified: true,
        },
      },
    };
  }

  try {
    const response = await apiClient.post<LoginResponseWith2FA>('/auth/login', {
      email: data.email,
      password: data.password,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const status = axiosError.response?.status;

      if (status === 401) {
        throw new Error('E-posta veya şifre hatalı');
      }
      if (status === 403) {
        throw new Error('Hesabınız kilitlendi. Lütfen daha sonra deneyin.');
      }
      if (status === 429) {
        throw new Error('Çok fazla deneme. Lütfen bekleyin.');
      }

      throw new Error(mapErrorToMessage(axiosError));
    }
    throw new Error('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
  }
};

export default {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  setup2FA,
  verifySetup2FA,
  verify2FA,
  get2FAStatus,
  regenerateBackupCodes,
  disable2FA,
  loginWith2FA,
};
