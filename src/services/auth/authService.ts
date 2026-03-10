import apiClient from '../api/apiClient';
import { LoginRequest, ApiResponse, LoginResponse } from '../../types/auth';
import { setAccessToken, setRefreshToken, setUserData, clearSecureStorage, getRefreshToken, setBackupRefreshToken } from '../storage/secureStorage';

export const authService = {
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', request);
    const data = response.data.data!;
    
    // Save tokens and user data using wrapper
    if (data.accessToken) {
      await setAccessToken(data.accessToken);
    }
    if (data.refreshToken) {
      await Promise.all([
        setRefreshToken(data.refreshToken),
        setBackupRefreshToken(data.refreshToken),
      ]);
    }
    await setUserData(JSON.stringify(data.user));

    if (__DEV__) {
      const storedRefresh = await getRefreshToken();
      console.log('[authService] login token debug', {
        receivedAccess: Boolean(data.accessToken),
        receivedRefresh: Boolean(data.refreshToken),
        storedRefreshPresent: Boolean(storedRefresh),
      });
    }

    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API failed, but clearing local state anyway');
    } finally {
      await clearSecureStorage();
    }
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> => {
    try {
      const response = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (__DEV__) {
        console.log('[authService] changePassword success:', response.data);
      }
    } catch (error) {
      console.error('[authService] changePassword failed', error);
      throw error;
    }
  },

  refreshToken: async (): Promise<string> => {
    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
    const newToken = response.data.data?.accessToken;
    if (newToken) {
      await setAccessToken(newToken);
      return newToken;
    }
    throw new Error('Refresh failed: No token in response');
  }
};
