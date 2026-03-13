import apiClient from '../api/apiClient';
import type { ApiResponse } from '@/types/api.types';

export interface InspectorStatsResponse {
  totalAssignments?: number;
  inProgressAssignments?: number;
  completedAssignments?: number;
  slaHitRate?: number; // expressed as 0-100 percentage or 0-1 ratio
  averageTurnaroundHours?: number;
  pendingReviews?: number;
  [key: string]: number | undefined;
}

export async function getInspectorStats(): Promise<InspectorStatsResponse> {
  const { data } = await apiClient.get<ApiResponse<InspectorStatsResponse>>('/inspectors/me/stats');
  return data?.data ?? {};
}
