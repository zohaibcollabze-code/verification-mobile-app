/**
 * MPVP — API Request/Response Type Definitions
 * All interfaces for backend communication.
 */
import type { FindingsSchema, InspectionOverallStatus } from './schema.types';

// ─── Enums & Unions ───────────────────────────────────────

export type AssignmentStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'PUBLISHED'
  | 'RETURNED';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  error: string | null;
  code: string | null;
}

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type InspectionType = 'Scheduled' | 'Surprise' | 'Follow-up';

export type NotificationType =
  | 'ASSIGNMENT_CREATED'
  | 'SUBMISSION_RETURNED'
  | 'DEADLINE_WARNING'
  | 'DEADLINE_EXPIRED'
  | 'SYSTEM_ALERT'
  | 'SYSTEM'
  | 'PROJECTS'
  | 'APPROVAL';

// ─── User / Inspector ─────────────────────────────────────

export interface Inspector {
  id: string;
  email: string;
  full_name: string;
  cnic_number: string;
  designation: string;
  employment_type: string;
  cities_covered: string[];
  bank_scope: string;
  assigned_bank_id: string | null;
  is_first_login: boolean;
  phone_number: string;
  profile_initials: string;
  profile_image?: string | null;

  /** Optional camelCase mirrors for compatibility with new endpoints */
  fullName?: string;
  phone?: string;
  cnicNumber?: string;
  seniority_level?: string;
  seniorityLevel?: string;
  employmentType?: string;
  citiesCovered?: string[];
  bankScope?: string;
  assignedBankId?: string | number | null;
  profilePictureUrl?: string | null;
}

export interface InspectorProfile {
  id: number | string;
  userId: number | string;
  email: string;
  fullName: string;
  phone: string;
  cnicNumber: string;
  designation: string;
  seniorityLevel: string;
  employmentType: string;
  citiesCovered: string[];
  bankScope: string;
  assignedBankId: number | string | null;
  isActive: boolean;
  createdAt: string;
  profilePictureUrl: string | null;
}

export type InspectorProfilePatchPayload = Partial<Pick<InspectorProfile,
  'fullName' |
  'phone' |
  'cnicNumber' |
  'designation' |
  'seniorityLevel' |
  'employmentType' |
  'citiesCovered' |
  'bankScope' |
  'assignedBankId' |
  'profilePictureUrl'
>>;

// ─── Contract Type ────────────────────────────────────────

export interface ContractType {
  id: string;
  name: string;
  code: string;
  findings_schema: FindingsSchema;
}

// ─── Assignment ───────────────────────────────────────────

export interface CurrentAssignment {
  id: string;
  inspector_id: string;
  accepted_at: string | null;
  rejected_at: string | null;
  assigned_at: string;
}

export interface Assignment {
  id: string;
  reference_number: string;
  status: AssignmentStatus;
  priority: Priority;
  client_name: string;
  contact_person: string;
  contact_phone: string;
  site_address: string;
  branch_name: string;
  contract_type: ContractType;
  transaction_size: string;
  goods_description: string;
  consumption_cycle: string;
  written_offer_date: string;
  declaration_date: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string;
  days_remaining: number;
  ops_notes: string | null;
  rejection_reason: string | null;
  job_response_deadline: string | null;
  cnic_number?: string;
  current_assignment?: CurrentAssignment;
}

// ─── Auth ─────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Inspector;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface FirstLoginPasswordRequest {
  newPassword: string;
}

// ─── Upload ───────────────────────────────────────────────

export interface UploadUrlRequest {
  filename: string;
  mimeType: string;
}

export interface UploadUrlResponse {
  presignedUrl: string;
  attachmentId: string;
  s3Key: string;
}

// ─── Submission ───────────────────────────────────────────

export interface SubmissionPayload {
  finding_data: Record<string, string | number | null>;
  findings_schema_snapshot: FindingsSchema;
  overall_status: InspectionOverallStatus;
  gps_latitude: number;
  gps_longitude: number;
  photo_attachment_ids: string[];
  total_transactions_to_date: number | null;
  total_inspections_till_date: number | null;
  this_inspection_number: number | null;
  inspection_date: string | null;
  previous_inspection_status: string;
  scope_of_inspection: string;
  inspection_type: InspectionType | null;
  inspector_detail: string;
  remarks: string;
}

// ─── Notifications ────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  assignment_id: string | null;
  assignment_ref: string | null;
}

// ─── Post-Action Responses ───────────────────────────────

export interface JobActionResponse {
  success: boolean;
  status: AssignmentStatus;
  message?: string;
}

export interface InspectionSubmissionResult {
  success: boolean;
  submission_id: string;
  reference_number: string;
}

// ─── API Error ────────────────────────────────────────────

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── Paginated Response ───────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
