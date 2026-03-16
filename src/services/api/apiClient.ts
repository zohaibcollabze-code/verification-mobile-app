import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AppException } from '../../utils/exceptions';
import { ApiResponse } from '../../types/api.types';
import { ErrorHandler } from '../../utils/errorHandler';
import { getAccessToken, setAccessToken, clearSecureStorage } from '../storage/secureStorage';
import { refreshAccessToken } from '../auth/tokenManager';
import { authEvents } from '../../utils/authEvents';
import { API_BASE_URL } from '@/config/environment';
import { useNetworkStore } from '@/stores/networkStore';

const BASE_URL = API_BASE_URL;

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Inject Token & Offline Guard
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Offline Guard: Prevent non-GET requests when offline
    const isOnline = useNetworkStore.getState().isOnline;
    if (!isOnline && config.method?.toLowerCase() !== 'get') {
      throw new AppException('Network unavailable. Action queued for sync.', 'OFFLINE_ERROR');
    }

    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Data and Errors
apiClient.interceptors.response.use(
  (response: AxiosResponse): any => {
    const apiResponse = response.data as ApiResponse<any>;
    const originalRequest = response.config as any;
    
    // Validate response shape as per guide rule #7
    if (apiResponse.success === undefined) {
      throw new AppException('Invalid response shape from server', 'INVALID_RESPONSE_SHAPE');
    }

    if (!apiResponse.success) {
      if (apiResponse.code === 'INVALID_TOKEN' && !originalRequest?._retry) {
        // Business level unauthorized: Trigger refresh flow
        return handleRefreshFlow(originalRequest);
      }
      const error = new AppException(apiResponse.error || 'Unknown error occurred', apiResponse.code || 'UNKNOWN_ERROR');
      ErrorHandler.logError('API Business Error', error);
      throw error;
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 and token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      return handleRefreshFlow(originalRequest);
    }

    // Debug: Log full server response for 400 errors in development
    if (__DEV__ && error.response?.status === 400 && error.response?.data) {
      console.log('[apiClient] 400 Server Response:', JSON.stringify(error.response.data, null, 2));
    }

    // For VALIDATION_ERROR with details, surface the specific validation messages to the user
    const responseData = error.response?.data;
    if (responseData?.code === 'VALIDATION_ERROR' && Array.isArray(responseData.details) && responseData.details.length > 0) {
      const detailMsg = responseData.details.join('\n');
      ErrorHandler.logError('API Validation Error', error);
      throw new AppException(detailMsg, 'VALIDATION_ERROR');
    }

    // Map errors as per rule #2
    const handledError = ErrorHandler.handle(error);
    ErrorHandler.logError('API Client Network Error', error);
    throw new AppException(handledError.message, handledError.code);
  }
);

let isRefreshing = false;
let refreshSubscribers: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

function subscribeTokenRefresh(resolve: (token: string) => void, reject: (error: any) => void) {
  refreshSubscribers.push({ resolve, reject });
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(error: any) {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
}

/**
 * Shared logic for token refresh to avoid duplication.
 * Triggered on both HTTP 401 and Business-level INVALID_TOKEN.
 */
async function handleRefreshFlow(originalRequest: any) {
  // If refresh already in progress, queue this request
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh(
        (token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          originalRequest._retry = true;
          // Use apiClient instead of axios to maintain baseURL and interceptors
          resolve(apiClient(originalRequest));
        },
        (error) => reject(error)
      );
    });
  }

  isRefreshing = true;

  try {
    // Use the robust refresh logic from tokenManager (handles backup tokens, retries, etc.)
    const newToken = await refreshAccessToken();
    
    onRefreshed(newToken);
    isRefreshing = false;

    // Retry the original request for the triggering caller
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    originalRequest._retry = true;
    return apiClient(originalRequest);
  } catch (refreshError: any) {
    isRefreshing = false;
    
    // Log the actual underlying reason for the refresh failure
    console.error('[Refresh] Token rotation failed:', refreshError.message || refreshError);
    
    // Map to a user-friendly error if it isn't already an AppException
    const appError = refreshError instanceof AppException 
      ? refreshError 
      : new AppException('Session expired. Please log in again.', 'INVALID_TOKEN');
    
    // Notify all queued subscribers that the session is dead
    onRefreshFailed(appError);
    
    // Note: tokenManager already handles clearSecureStorage() and authEvents.emitLogout() on terminal failure
    
    return Promise.reject(appError);
  }
}

export default apiClient;
