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
  getBackupRefreshToken,
  setBackupRefreshToken,
  clearSecureStorage,
} from '../storage/secureStorage';
import { AppException } from '../../utils/exceptions';
import { authEvents } from '../../utils/authEvents';
import { API_BASE_URL } from '@/config/environment';

const BASE_URL = API_BASE_URL;
const REFRESH_MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Checks if a JWT token is expired or will expire within the given threshold.
 * Uses manual base64 decoding to avoid external dependencies.
 */
export function isTokenExpiringSoon(token: string | null, thresholdMinutes: number = 5): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode payload (middle part)
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(payloadBase64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    const exp = payload.exp;

    if (!exp) return false; // If no exp claim, assume it doesn't expire or handle as valid

    const now = Math.floor(Date.now() / 1000);
    return exp - now < thresholdMinutes * 60;
  } catch (err) {
    console.error('[tokenManager] Failed to decode token', err);
    return true; // If we can't decode, assume it's invalid/expired to be safe
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Store both access and refresh tokens after a successful login or refresh.
 */
export const storeTokens = async (accessToken: string, refreshToken?: string): Promise<void> => {
  await setAccessToken(accessToken);
  if (refreshToken) {
    await setRefreshToken(refreshToken);
    await setBackupRefreshToken(refreshToken);
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
  let refreshToken = await getRefreshToken();
  if (!refreshToken) {
    const backup = await getBackupRefreshToken();
    if (backup) {
      refreshToken = backup;
      await setRefreshToken(backup);
    } else {
      await clearSecureStorage();
      authEvents.emitLogout();
      throw new AppException('No refresh token available', 'NO_REFRESH_TOKEN');
    }
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
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        
        // Terminal failures: Refresh token is invalid, expired, or revoked
        if (status === 401 || status === 403 || status === 400 || errorData.code === 'INVALID_REFRESH_TOKEN') {
          await clearSecureStorage();
          authEvents.emitLogout();
          throw new AppException('Session expired. Please log in again.', 'SESSION_EXPIRED');
        }
        
        throw new Error(`Refresh failed with status ${status}`);
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
      // If it's an AppException we threw (terminal), rethrow it
      if (error instanceof AppException && error.code === 'SESSION_EXPIRED') {
        throw error;
      }

      if (attempt === 1 && refreshToken) {
        const backup = await getBackupRefreshToken();
        if (backup && backup !== refreshToken) {
          refreshToken = backup;
          await setRefreshToken(backup);
          continue;
        }
      }
      
      if (__DEV__) {
        console.warn(`[tokenManager] Refresh attempt ${attempt} failed:`, error);
      }

      if (attempt < REFRESH_MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
        continue;
      }
      
      // If we've exhausted retries but it wasn't a terminal auth error, 
      // just throw the error without logging out. The app will retry on the next request.
      throw new AppException('Network error. Could not rotate token.', 'REFRESH_NETWORK_ERROR');
    }
  }

  throw new AppException('Token rotation failed after retries.', 'REFRESH_FAILED');
}

/**
 * Clear all stored tokens (logout).
 */
export async function clearTokens(): Promise<void> {
  await clearSecureStorage();
}
