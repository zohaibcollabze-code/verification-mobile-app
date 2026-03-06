import apiClient from '../api/apiClient';
import { LoginRequest, ApiResponse, LoginResponse } from '../../types/auth';
import { setAccessToken, setRefreshToken, setUserData, clearSecureStorage } from '../storage/secureStorage';

export const authService = {
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', request);
    const data = response.data.data!;
    
    // Save tokens and user data using wrapper
    if (data.accessToken) {
      await setAccessToken(data.accessToken);
    }
    if (data.refreshToken) {
      await setRefreshToken(data.refreshToken);
    }
    await setUserData(JSON.stringify(data.user));
    
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
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
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
