/**
 * PAVMP — Token Manager
 * Centralized token management using expo-secure-store.
 * Single interface for reading, writing, refreshing, and clearing auth tokens.
 */
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearSecureStorage,
} from '../storage/secureStorage';
import { AppException } from '../../utils/exceptions';
import { authEvents } from '../../utils/authEvents';
import { API_BASE_URL } from '@/config/environment';

const BASE_URL = API_BASE_URL;
const REFRESH_MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Store both access and refresh tokens after a successful login or refresh.
 */
export const storeTokens = async (accessToken: string, refreshToken?: string): Promise<void> => {
  await setAccessToken(accessToken);
  if (refreshToken) {
    await setRefreshToken(refreshToken);
  }
};

/**
 * Retrieve the current access token.
 * Throws if no token exists so callers can redirect to login.
 */
export async function getToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new AppException('Not authenticated', 'NO_TOKEN');
  }
  return token;
}

/**
 * Refresh the access token using the stored refresh token.
 * Uses plain fetch (not axios) to avoid circular dependency with apiClient.
 * On failure, clears tokens and emits logout event.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearSecureStorage();
    authEvents.emitLogout();
    throw new AppException('No refresh token available', 'NO_REFRESH_TOKEN');
  }

  for (let attempt = 1; attempt <= REFRESH_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Refresh failed with status ${response.status}`);
      }

      const body = await response.json();

      if (body.success && body.data?.accessToken) {
        const newAccessToken = body.data.accessToken;
        const newRefreshToken = body.data.refreshToken || refreshToken;
        await storeTokens(newAccessToken, newRefreshToken);
        return newAccessToken;
      }

      throw new Error('Refresh response missing accessToken');
    } catch (error) {
      if (__DEV__) {
        console.warn(`[tokenManager] Refresh attempt ${attempt} failed:`, error);
      }
      if (attempt < REFRESH_MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
        continue;
      }
      await clearSecureStorage();
      authEvents.emitLogout();
      throw new AppException('Session expired. Please log in again.', 'SESSION_EXPIRED');
    }
  }

  // Should never reach here
  await clearSecureStorage();
  authEvents.emitLogout();
  throw new AppException('Session expired. Please log in again.', 'SESSION_EXPIRED');
}

/**
 * Clear all stored tokens (logout).
 */
export async function clearTokens(): Promise<void> {
  await clearSecureStorage();
}
