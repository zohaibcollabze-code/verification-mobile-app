import apiClient from '../api/apiClient';
import { Inspector, ApiResponse } from '../../types/api.types';
import { InspectorPermissions } from '../../utils/permissions';

export const profileService = {
  /**
   * Fetches the current inspector's profile profile.
   * Endpoint: GET /inspectors/me/profile
   */
  getProfile: async (): Promise<Inspector> => {
    const response = await apiClient.get<ApiResponse<Inspector>>('/inspectors/me/profile');
    return response.data.data!;
  },

  /**
   * Updates specific fields of the inspector's profile.
   * Santizes input to only allow patchable fields (§3.2).
   * Endpoint: PATCH /inspectors/me/profile
   */
  updateProfile: async (data: Partial<Inspector>): Promise<Inspector> => {
    const sanitizedData = InspectorPermissions.sanitizeProfilePatch(data);
    const response = await apiClient.patch<ApiResponse<Inspector>>('/inspectors/me/profile', sanitizedData);
    return response.data.data!;
  }
};
