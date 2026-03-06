import apiClient from '../api/apiClient';
import { AppNotification, PaginatedResponse, ApiResponse } from '../../types/api.types';

export const notificationService = {
  /**
   * Fetches the list of notifications for the current inspector.
   * Endpoint: GET /notifications
   */
  getNotifications: async (params: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Promise<PaginatedResponse<AppNotification>> => {
    const response = await apiClient.get<ApiResponse<AppNotification[]>>('/notifications', { params });
    const { data, pagination } = response.data;
    return {
      data: data || [],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 20,
      total_pages: pagination?.total_pages || 1,
    };
  },

  /**
   * Marks a specific notification as read.
   * Endpoint: PATCH /notifications/:id/read
   */
  markAsRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  /**
   * Marks all notifications as read.
   * Endpoint: PATCH /notifications/read-all
   */
  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  }
};
