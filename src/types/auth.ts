import { Inspector, ApiResponse } from './api.types';

export type { ApiResponse };
export type User = Inspector;

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
