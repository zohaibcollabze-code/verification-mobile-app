/**
 * MPVP — Secure Storage Wrappers
 * JWT tokens MUST use expo-secure-store only (never AsyncStorage or MMKV).
 * §14 Rule 1: Token Storage
 */
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'mpvp_access_token';
const REFRESH_TOKEN_KEY = 'mpvp_refresh_token';
const USER_KEY = 'mpvp_user_data';
const REFRESH_TOKEN_BACKUP_KEY = 'mpvp_refresh_token_backup';

/** Store the access token securely */
export async function setAccessToken(token: string): Promise<void> {
  if (typeof token !== 'string') {
    console.error('SecureStore: Access token must be a string', token);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

/** Retrieve the access token */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

/** Store the refresh token securely */
export async function setRefreshToken(token: string): Promise<void> {
  if (typeof token !== 'string') {
    console.error('SecureStore: Refresh token must be a string', token);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

/** Retrieve the refresh token */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/** Store a backup refresh token (last known good) */
export async function setBackupRefreshToken(token: string | null): Promise<void> {
  if (!token) {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_BACKUP_KEY);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_BACKUP_KEY, token);
}

/** Retrieve backup refresh token */
export async function getBackupRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_BACKUP_KEY);
}

/** Store serialized user data */
export async function setUserData(userData: string): Promise<void> {
  if (typeof userData !== 'string') {
    console.error('SecureStore: User data must be a string', userData);
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, userData);
}

/** Retrieve serialized user data */
export async function getUserData(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_KEY);
}

/** Clear ALL secure storage on logout */
export async function clearSecureStorage(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_BACKUP_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
