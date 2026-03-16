import apiClient from '../api/apiClient';
import { ApiResponse } from '../../types/api.types';
import { normalizeRequest, normalizeRequestList } from '../api/normalizers/requestNormalizer';
import { 
  RequestModel, 
  PaginatedRequestResult, 
  RawApiPaginatedResponse, 
  RawApiRequest 
} from '../api/types/requestTypes';

interface GetJobsParams {
  page?: number;
  limit?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export const jobsService = {
  getJobs: async (params: GetJobsParams = {}): Promise<PaginatedRequestResult> => {
    console.log('[jobsService.getJobs] params ->', params);
    const response = await apiClient.get<ApiResponse<RawApiPaginatedResponse>>('/requests', { params });
    console.log('[jobsService.getJobs] response <-', response.data);
    const raw = response.data.data;
    
    // Handle both nested {data, meta} and flat array responses
    const rawPayload: RawApiPaginatedResponse = {
      data: Array.isArray(raw) ? (raw as unknown as RawApiRequest[]) : (raw?.data ?? []),
      meta: Array.isArray(raw) ? null : (raw?.meta ?? null),
    };

    // Map top-level pagination if meta is missing
    if (!rawPayload.meta && response.data.pagination) {
      rawPayload.meta = {
        total_count: response.data.pagination.total,
        page: response.data.pagination.page,
        per_page: response.data.pagination.limit,
        has_next: response.data.pagination.page < response.data.pagination.total_pages,
      };
    }

    return normalizeRequestList(rawPayload);
  },

  getJobDetail: async (id: string): Promise<RequestModel> => {
    console.log('[jobsService.getJobDetail] request ->', id);
    const response = await apiClient.get<ApiResponse<RawApiRequest>>(`/requests/${id}`);
    console.log('[jobsService.getJobDetail] response <-', response.data);
    return normalizeRequest(response.data.data!);
  },

  acceptJob: async (id: string): Promise<void> => {
    console.log('[jobsService.acceptJob] request ->', id);
    const response = await apiClient.post(`/requests/${id}/accept`, {});
    console.log('[jobsService.acceptJob] response <-', response.data);
  },

  rejectJob: async (id: string, reason?: string): Promise<void> => {
    console.log('[jobsService.rejectJob] request ->', { id, reason });
    const response = await apiClient.post(`/requests/${id}/reject`, { reason });
    console.log('[jobsService.rejectJob] response <-', response.data);
  },

  getFindingsSchema: async (jobId: string): Promise<any> => {
    console.log('[jobsService.getFindingsSchema] request ->', jobId);
    const response = await apiClient.get<ApiResponse<any>>(`/inspections/${jobId}/findings-schema`);
    console.log('[jobsService.getFindingsSchema] response <-', response.data);
    return response.data.data;
  },

  submitFindings: async (jobId: string, findings: any): Promise<void> => {
    console.log('[jobsService.submitFindings] request ->', { jobId, findings });
    const response = await apiClient.post(`/inspections/${jobId}/submit-findings`, findings);
    console.log('[jobsService.submitFindings] response <-', response.data);
  }
};
