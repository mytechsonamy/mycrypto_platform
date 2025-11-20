export interface JwtPayload {
  sub: string; // User ID
  email: string;
  type: 'access' | 'refresh' | 'email_verification';
  jti?: string; // JWT ID for refresh tokens
  iat?: number;
  exp?: number;
}