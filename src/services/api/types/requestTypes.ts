import type { FindingsSchema } from '@/types/schema.types';
/**
 * MPVP — Request Type Definitions
 * Raw API shapes (snake_case) and internal app models (camelCase).
 * The normalizer converts between these two layers.
 */

// ─── Request Status ───────────────────────────────────────
export type RequestStatus =
  | 'pending' | 'approved' | 'rejected' | 'pending_reassignment' | 'in_progress' | 'submitted'
  | 'new' | 'assigned' | 'accepted' | 'reviewed' | 'published' | 'returned' | 'cancelled' | 'failed';

// ─── Raw API Types (mirror the API exactly) ──────────────

export interface RawApiUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface RawApiPermissions {
  can_approve: boolean;
  can_reject: boolean;
}

export interface RawApiContractType {
  id: string;
  name: string;
  code: string;
  findings_schema: any[]; // Using any[] for raw, will type in RequestModel
}

export interface RawApiRequest {
  id: string;
  referenceNo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  description?: string | null;
  clientName: string;
  bankId?: string;
  bankName?: string;
  contractTypeId: string;
  contractTypeName: string;
  findingsSchema?: any[];
  siteAddress: string;
  siteCity: string;
  inspectorName?: string;
  contactPerson?: string;
  siteContactNumber?: string;
  branchManagerName?: string;
  inventoryHoldingDays?: number;
  totalInspectionsToDate?: number;
  thisInspectionNumber?: number;
  thisInspectionDate?: string;
  previousInspectionStatus?: string;
  inspectionScope?: string;
  inspectionType?: string;
  isUrgent?: boolean;
  urgencyReason?: string | null;
  noticeOfDeliveryUrl?: string | null;
  noticeOfDeliveryPublicId?: string | null;
  writtenOfferUrl?: string | null;
  writtenOfferPublicId?: string | null;
  fieldData?: Record<string, any>;
  currentAssignment?: {
    inspectorId: string;
    inspectorName: string;
    inspectorEmail: string;
    assignedAt: string;
    acceptedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
  } | null;
}

export interface RawApiMeta {
  total_count: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

export interface RawApiPaginatedResponse {
  data: RawApiRequest[];
  meta: RawApiMeta | null;
}

export interface RawApiErrorBody {
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ─── Internal App Models (clean, camelCase) ──────────────

export interface RequestModel {
  id: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  description: string | null;
  clientName: string;
  bankName: string;
  branchName: string;
  referenceNumber: string;
  dueDate: Date | null;
  opsNotes: string | null;
  siteAddress: string;
  siteCity: string;
  contactPerson: string;
  siteContactNumber: string;
  branchManagerName: string;
  inventoryHoldingDays: number;
  totalInspectionsToDate: number;
  thisInspectionNumber: number;
  thisInspectionDate: Date | null;
  previousInspectionStatus: string;
  inspectionScope: string;
  inspectionType: string;
  isUrgent: boolean;
  urgencyReason: string | null;
  noticeOfDeliveryUrl: string | null;
  noticeOfDeliveryPublicId: string | null;
  writtenOfferUrl: string | null;
  writtenOfferPublicId: string | null;
  canApprove: boolean;
  canReject: boolean;
  avatarUrl: string | null;
  userName: string;
  userEmail: string;
  userId: string;
  fieldData: Record<string, any>;
  contractType: {
    name: string;
    code: string;
    findingsSchema: FindingsSchema;
  } | null;
}

export interface PaginatedRequestResult {
  items: RequestModel[];
  totalCount: number;
  page: number;
  perPage: number;
  hasNext: boolean;
}
