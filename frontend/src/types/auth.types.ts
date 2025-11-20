/**
 * Authentication related TypeScript types
 */

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptKvkk: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  acceptTerms: boolean;
  acceptKvkk: boolean;
  recaptchaToken?: string;
}

export interface RegisterResponseData {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: RegisterResponseData;
  // Legacy fields for backward compatibility with mock API
  userId?: string;
  email?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

export interface User {
  id: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  registrationSuccess: boolean;
}

export interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
  acceptKvkk?: string;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordValidation {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  strength: PasswordStrength;
}

// Email verification types
export type VerificationStatus = 'idle' | 'pending' | 'verifying' | 'success' | 'error';

export interface VerificationState {
  status: VerificationStatus;
  error: string | null;
  resendLoading: boolean;
  resendSuccess: boolean;
  resendError: string | null;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
}

// Login types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginUser {
  id: string;
  email: string;
  email_verified: boolean;
}

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: LoginUser;
}

export interface LoginResponse {
  success: boolean;
  data: LoginResponseData;
}

export interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
}

// Password Reset types
export interface ForgotPasswordFormData {
  email: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetConfirmResponse {
  success: boolean;
  message: string;
}

// Logout types
export interface LogoutResponse {
  success: boolean;
  message: string;
}

// Extended password reset state
export interface PasswordResetState {
  requestLoading: boolean;
  requestSuccess: boolean;
  requestError: string | null;
  confirmLoading: boolean;
  confirmSuccess: boolean;
  confirmError: string | null;
}

// Two-Factor Authentication types
export interface TwoFactorSetupData {
  secret: string;
  qrCode: string;
  setupToken: string;
}

export interface TwoFactorSetupResponse {
  success: boolean;
  data: TwoFactorSetupData;
}

export interface TwoFactorVerifySetupRequest {
  setupToken: string;
  code: string;
}

export interface TwoFactorVerifySetupResponse {
  success: boolean;
  data: {
    backupCodes: string[];
  };
}

export interface TwoFactorVerifyRequest {
  challengeToken: string;
  code: string;
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: LoginUser;
  };
}

export interface TwoFactorStatusResponse {
  success: boolean;
  data: {
    isEnabled: boolean;
    enabledAt: string | null;
    backupCodesRemaining: number;
  };
}

export interface TwoFactorRegenerateCodesResponse {
  success: boolean;
  data: {
    backupCodes: string[];
  };
}

export interface TwoFactorDisableRequest {
  password: string;
  code: string;
}

export interface TwoFactorDisableResponse {
  success: boolean;
  message: string;
}

export interface TwoFactorState {
  isEnabled: boolean;
  setupData: TwoFactorSetupData | null;
  backupCodes: string[] | null;
  challengeToken: string | null;
  status: {
    enabledAt: string | null;
    backupCodesRemaining: number;
  } | null;
  loading: boolean;
  error: string | null;
}

// Extended login response with 2FA challenge
export interface LoginResponseWith2FA extends LoginResponse {
  requires2FA?: boolean;
  challengeToken?: string;
}
