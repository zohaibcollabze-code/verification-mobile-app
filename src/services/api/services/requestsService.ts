/**
 * MPVP — Requests Service
 * Thin service layer for the requests domain.
 * Each function builds the URL, calls the API client with the appropriate normalizer,
 * and returns typed results.
 */
import apiClient from '../apiClient';
import { normalizeRequest, normalizeRequestList } from '../normalizers/requestNormalizer';
import type { ApiResponse } from '../../../types/api.types';
import type {
  RawApiRequest,
  RawApiPaginatedResponse,
  RequestModel,
  PaginatedRequestResult,
} from '../types/requestTypes';

/**
 * Fetch a paginated list of requests.
 */
export async function fetchRequests(
  page: number = 1,
  perPage: number = 20,
  status?: string,
): Promise<PaginatedRequestResult> {
  const params: Record<string, string | number> = { page, limit: perPage };
  if (status) {
    params.status = status;
  }

  const response = await apiClient.get<ApiResponse<RawApiPaginatedResponse>>('/requests', { params });
  const raw = response.data.data;

  if (!raw) {
    return { items: [], totalCount: 0, page: 1, perPage: 20, hasNext: false };
  }

  // Handle the case where the API returns a flat data array with separate pagination
  // vs. the nested { data, meta } structure
  const rawPayload: RawApiPaginatedResponse = {
    data: Array.isArray(raw) ? (raw as unknown as RawApiRequest[]) : (raw.data ?? []),
    meta: Array.isArray(raw) ? null : (raw.meta ?? null),
  };

  // If pagination comes from the top-level response, map it to meta
  if (!rawPayload.meta && response.data.pagination) {
    rawPayload.meta = {
      total_count: response.data.pagination.total,
      page: response.data.pagination.page,
      per_page: response.data.pagination.limit,
      has_next: response.data.pagination.page < response.data.pagination.total_pages,
    };
  }

  return normalizeRequestList(rawPayload);
}

/**
 * Fetch a single request by ID.
 */
export async function fetchRequestById(id: string): Promise<RequestModel> {
  const response = await apiClient.get<ApiResponse<RawApiRequest>>(`/requests/${id}`);
  return normalizeRequest(response.data.data!);
}

/**
 * Approve a request. Returns the updated model.
 */
export async function approveRequest(id: string): Promise<RequestModel> {
  const response = await apiClient.post<ApiResponse<RawApiRequest>>(`/requests/${id}/accept`, {});
  return normalizeRequest(response.data.data!);
}

/**
 * Reject a request with a reason. Returns the updated model.
 */
export async function rejectRequest(id: string, reason: string): Promise<RequestModel> {
  const response = await apiClient.post<ApiResponse<RawApiRequest>>(`/requests/${id}/reject`, { reason });
  return normalizeRequest(response.data.data!);
}
