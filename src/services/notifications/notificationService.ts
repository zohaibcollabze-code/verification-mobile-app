import apiClient from '../api/apiClient';
import { AppNotification, PaginatedResponse, ApiResponse } from '../../types/api.types';

const DEFAULT_LIMIT = 15;

export const notificationService = {
  /**
   * Fetches the list of notifications for the current inspector.
   * Endpoint: GET /notifications
   */
  getNotifications: async (params: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Promise<PaginatedResponse<AppNotification>> => {
    const requestParams = {
      page: params.page ?? 1,
      limit: params.limit ?? DEFAULT_LIMIT,
      unreadOnly: params.unreadOnly,
    };

    const response = await apiClient.get<ApiResponse<AppNotification[]>>('/notifications', { params: requestParams });
    const { data, pagination } = response.data;
    const camelTotalPages = (pagination as any)?.totalPages;
    const totalPages = pagination?.total_pages ?? (typeof camelTotalPages === 'number' ? camelTotalPages : 1);
    return {
      data: data || [],
      total: pagination?.total || 0,
      page: pagination?.page || requestParams.page,
      limit: pagination?.limit || requestParams.limit,
      total_pages: totalPages,
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
