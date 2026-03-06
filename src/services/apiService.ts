/**
 * MPVP — API Service Layer
 * Repository Pattern for Assignments, Notifications, and Inspections.
 * Standardized data fetching with Axios and technical error handling.
 */
import apiClient from './api/apiClient';
import { 
  Assignment, 
  AppNotification, 
  JobActionResponse,
  InspectionSubmissionResult 
} from '@/types/api.types';
import type { InspectionDraft } from '@/types/store.types';

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

/**
 * Assignments Repository
 */
export const AssignmentsAPI = {
  /** Get all active assignments for the current inspector */
  getAllActive: async (): Promise<Assignment[]> => {
    const { data } = await apiClient.get<Assignment[]>('/assignments/active');
    return data;
  },

  /** Get assignment history */
  getHistory: async (): Promise<Assignment[]> => {
    const { data } = await apiClient.get<Assignment[]>('/assignments/history');
    return data;
  },

  /** Get specific assignment details */
  getById: async (id: string): Promise<Assignment> => {
    const { data } = await apiClient.get<Assignment>(`/assignments/${id}`);
    return data;
  },

  /** Accept or Reject a job offer */
  respond: async (id: string, action: 'ACCEPT' | 'REJECT', reason?: string): Promise<JobActionResponse> => {
    const { data } = await apiClient.post<JobActionResponse>(`/assignments/${id}/respond`, {
      action,
      reason,
    });
    return data;
  },
};

/**
 * Notifications Repository
 */
export const NotificationsAPI = {
  /** Get all notifications */
  getAll: async (): Promise<AppNotification[]> => {
    const { data } = await apiClient.get<AppNotification[]>('/notifications');
    return data;
  },

  /** Mark a notification as read */
  markRead: async (id: string): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read`);
  },

  /** Mark all as read */
  markAllRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all');
  },
};

/**
 * Inspections Repository
 */
export const InspectionsAPI = {
  /** Submit a completed inspection draft */
  submit: async (draft: InspectionDraft): Promise<InspectionSubmissionResult> => {
    const { data } = await apiClient.post<InspectionSubmissionResult>('/inspections/submit', draft);
    return data;
  },

  /** Upload photo evidence */
  uploadPhoto: async (requestId: string, formData: FormData): Promise<{ id: string; url: string }> => {
    const { data } = await apiClient.post(`/inspections/${requestId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
