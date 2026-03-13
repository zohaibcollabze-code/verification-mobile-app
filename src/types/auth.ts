import { Inspector, ApiResponse } from './api.types';

export type { ApiResponse };
export type User = Inspector;

// Error codes for exhaustive error handling
export enum AuthErrorCode {
  NO_TOKEN = 'NO_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE_SHAPE = 'INVALID_RESPONSE_SHAPE',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
}

// Typed error class for authentication system
export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly isAuthError = true;

  constructor(code: AuthErrorCode, message: string, cause?: Error) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.cause = cause;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }

  // Helper to check if an error is an AuthError
  static isAuthError(error: any): error is AuthError {
    return error?.isAuthError === true;
  }
}

// Token data types
export interface StoredRefreshData {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export interface AccessTokenData {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

// Auth state machine discriminated union
export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticating' }
  | { status: 'authenticated'; user: User; accessToken: AccessTokenData; refreshToken: StoredRefreshData }
  | { status: 'refreshing'; user: User; accessToken: AccessTokenData; refreshToken: StoredRefreshData }
  | { status: 'error'; error: AuthError };

// Auth actions for useReducer
export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: User; accessToken: AccessTokenData; refreshToken: StoredRefreshData }
  | { type: 'LOGIN_FAILURE'; error: AuthError }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; accessToken: AccessTokenData; refreshToken: StoredRefreshData }
  | { type: 'REFRESH_FAILURE'; error: AuthError }
  | { type: 'LOGOUT' };

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  requiresPasswordChange: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}
