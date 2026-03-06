import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = 'https://verification-platform-server.vercel.app/api';
const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

export const API_BASE_URL = configuredBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

/**
 * Production is defined as pointing to the live backend (no localhost or staging hostnames)
 */
const PROD_HOST_PATTERN = /verification-platform-server\.vercel\.app/i;
export const IS_PRODUCTION_API = PROD_HOST_PATTERN.test(API_BASE_URL);
export const IS_DEV_MODE = __DEV__;
