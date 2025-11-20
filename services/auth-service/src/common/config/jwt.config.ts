import { registerAs } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * JWT Configuration Module
 * Handles loading RSA keys for RS256 JWT signing
 * Supports both file-based keys (development) and environment variable keys (production)
 */
export const jwtConfig = registerAs('jwt', () => {
  const algorithm = process.env.JWT_ALGORITHM || 'RS256';
  const accessTokenExpiry = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
  const refreshTokenExpiry = process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d';
  const emailVerificationExpiry =
    process.env.JWT_EMAIL_VERIFICATION_EXPIRY || '24h';

  let privateKey: string;
  let publicKey: string;

  // Load RSA keys based on algorithm
  if (algorithm === 'RS256') {
    privateKey = loadPrivateKey();
    publicKey = loadPublicKey();
  } else if (algorithm === 'HS256') {
    // Fallback to secret for backwards compatibility
    privateKey = process.env.JWT_SECRET || 'dev-secret-min-32-characters-long';
    publicKey = privateKey;
  } else {
    throw new Error(
      `Unsupported JWT algorithm: ${algorithm}. Supported: RS256, HS256`,
    );
  }

  return {
    algorithm,
    privateKey,
    publicKey,
    signOptions: {
      algorithm,
      expiresIn: accessTokenExpiry,
    },
    accessTokenExpiry,
    refreshTokenExpiry,
    emailVerificationExpiry,
  };
});

/**
 * Load private key from file or environment variable
 * @returns Private key in PEM format
 * @throws Error if key cannot be loaded
 */
function loadPrivateKey(): string {
  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
  const privateKeyEnv = process.env.JWT_PRIVATE_KEY;

  // Try environment variable first
  if (privateKeyEnv) {
    return privateKeyEnv.replace(/\\n/g, '\n');
  }

  // Try file path
  if (privateKeyPath) {
    try {
      const absolutePath = path.isAbsolute(privateKeyPath)
        ? privateKeyPath
        : path.join(process.cwd(), privateKeyPath);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(
          `Private key file not found at: ${absolutePath}. ` +
            `Generate with: openssl genrsa -out private.pem 4096`,
        );
      }

      return fs.readFileSync(absolutePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to load private key from ${privateKeyPath}: ${error.message}`,
      );
    }
  }

  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    const devKeyPath = path.join(process.cwd(), 'keys', 'private.pem');
    try {
      if (fs.existsSync(devKeyPath)) {
        return fs.readFileSync(devKeyPath, 'utf-8');
      }
    } catch (error) {
      // Continue to error handling below
    }
  }

  throw new Error(
    'JWT private key not found. Set JWT_PRIVATE_KEY_PATH or JWT_PRIVATE_KEY ' +
      'environment variable. Generate keys with: openssl genrsa -out private.pem 4096',
  );
}

/**
 * Load public key from file or environment variable
 * @returns Public key in PEM format
 * @throws Error if key cannot be loaded
 */
function loadPublicKey(): string {
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;
  const publicKeyEnv = process.env.JWT_PUBLIC_KEY;

  // Try environment variable first
  if (publicKeyEnv) {
    return publicKeyEnv.replace(/\\n/g, '\n');
  }

  // Try file path
  if (publicKeyPath) {
    try {
      const absolutePath = path.isAbsolute(publicKeyPath)
        ? publicKeyPath
        : path.join(process.cwd(), publicKeyPath);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(
          `Public key file not found at: ${absolutePath}. ` +
            `Generate with: openssl rsa -in private.pem -pubout -out public.pem`,
        );
      }

      return fs.readFileSync(absolutePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to load public key from ${publicKeyPath}: ${error.message}`,
      );
    }
  }

  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    const devKeyPath = path.join(process.cwd(), 'keys', 'public.pem');
    try {
      if (fs.existsSync(devKeyPath)) {
        return fs.readFileSync(devKeyPath, 'utf-8');
      }
    } catch (error) {
      // Continue to error handling below
    }
  }

  throw new Error(
    'JWT public key not found. Set JWT_PUBLIC_KEY_PATH or JWT_PUBLIC_KEY ' +
      'environment variable. Generate keys with: openssl rsa -in private.pem -pubout -out public.pem',
  );
}
