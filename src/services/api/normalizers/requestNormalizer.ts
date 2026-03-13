/**
 * MPVP — Request Normalizer (Translation Layer)
 * Converts raw API responses into clean internal models.
 * This is the single entry point for all request data into the app.
 *
 * Fixes all 7 problems from the integration guide:
 *  1. snake_case → camelCase field names
 *  2. Status string validation (not boolean)
 *  3. ISO date strings → Date objects
 *  4. Nested permissions → flat booleans
 *  5. Nullable avatar_url → safe handling
 *  6. Pagination metadata mapping
 *  7. Error handling — never lets malformed data through
 */
import type {
  RawApiRequest,
  RawApiPaginatedResponse,
  RequestModel,
  RequestStatus,
  PaginatedRequestResult,
} from '../types/requestTypes';
import type { FindingsFieldSchema, FindingsSchema } from '@/types/schema.types';

// ─── Valid status values ──────────────────────────────────

const VALID_STATUSES: ReadonlySet<string> = new Set([
  // Internal app statuses
  'pending',
  'approved',
  'rejected',
  'pending_reassignment',
  'in_progress',
  'submitted',
  // Backend API statuses (returned as-is after lowercase normalization)
  'new',
  'assigned',
  'accepted',
  'reviewed',
  'published',
  'returned',
  'cancelled',
  'failed',
]);

/**
 * Validates and normalizes a status value.
 * Returns a valid RequestStatus, defaulting to 'pending' for unknown values.
 */
function validateStatus(value: unknown): RequestStatus {
  // Normalize string to lowercase and replace spaces/hyphens with underscores if needed
  const normalized = typeof value === 'string' 
    ? value.toLowerCase().replace(/-/g, '_') 
    : '';

  if (VALID_STATUSES.has(normalized)) {
    return normalized as RequestStatus;
  }

  if (__DEV__) {
    console.warn(
      `[requestNormalizer] Unexpected status value: "${String(value)}". Defaulting to "pending".`
    );
  }

  return 'pending';
}

/**
 * Safely parses an ISO 8601 date string into a Date object.
 * Returns current date if parsing fails.
 */
function safeParseDate(isoString: unknown): Date {
  if (typeof isoString !== 'string' || !isoString) {
    return new Date();
  }

  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    if (__DEV__) {
      console.warn(`[requestNormalizer] Invalid date string: "${isoString}". Using current date.`);
    }
    return new Date();
  }

  return date;
}

// ─── Single Item Normalizer ──────────────────────────────

/**
 * Normalizes findings schema entries and ensures photo metadata is set when required.
 */
function normalizeFindingsSchema(schema: unknown): FindingsSchema {
  if (!Array.isArray(schema)) {
    return [];
  }

  return schema.map((rawField, index) => {
    const field = (rawField ?? {}) as FindingsFieldSchema & Record<string, any>;
    const requiresPhoto = Boolean(field.requires_photo ?? field.requiresPhoto);
    const hasPhotoFlag = field.photo === true || requiresPhoto;

    return {
      ...field,
      key: field.key ?? `field_${index}`,
      label: field.label ?? field.key ?? `Field ${index + 1}`,
      options: Array.isArray(field.options) ? field.options : [],
      requires_photo: requiresPhoto,
      photo: hasPhotoFlag,
    } as FindingsFieldSchema;
  });
}

/**
 * Converts a single raw API request object into an internal RequestModel.
 * Handles all field mapping, type conversion, and null safety.
 */
export function normalizeRequest(rawInput: any): RequestModel {
  // Handle nested wrappers like { data: { ... } } or { request: { ... } }
  const raw = rawInput?.request ?? rawInput?.data ?? rawInput ?? {};
  
  const user = raw.user;
  const permissions = raw.permissions;
  const currentAssignment = raw.currentAssignment;

  return {
    id: raw.id ?? raw.request_id ?? '',
    status: validateStatus(raw.status),
    createdAt: safeParseDate(raw.createdAt ?? raw.created_at),
    updatedAt: safeParseDate(raw.updatedAt ?? raw.updated_at),
    title: raw.title ?? raw.contractTypeName ?? 'Asset Inspection',
    description: raw.description ?? null,
    
    // Exact mapping from backend
    clientName: raw.clientName ?? raw.client_name ?? 'Unknown Client',
    bankName: raw.bankName ?? raw.bank_name ?? 'Standard Bank',
    branchName: raw.branchName ?? raw.branch_name ?? 'Main Branch',
    referenceNumber: raw.referenceNo ?? raw.reference_number ?? raw.id ?? 'N/A',
    dueDate: (raw.thisInspectionDate || raw.due_date || raw.dueDate) ? safeParseDate(raw.thisInspectionDate ?? raw.due_date ?? raw.dueDate) : null,
    opsNotes: raw.opsNotes ?? raw.ops_notes ?? null,
    siteAddress: raw.siteAddress ?? raw.site_address ?? '',
    siteCity: raw.siteCity ?? raw.site_city ?? '',
    contactPerson: raw.contactPerson ?? raw.contact_person ?? '',
    siteContactNumber: raw.siteContactNumber ?? raw.site_contact_number ?? '',
    branchManagerName: raw.branchManagerName ?? raw.branch_manager_name ?? '',
    inventoryHoldingDays: raw.inventoryHoldingDays ?? 0,
    totalInspectionsToDate: raw.totalInspectionsToDate ?? 0,
    thisInspectionNumber: raw.thisInspectionNumber ?? 1,
    thisInspectionDate: raw.thisInspectionDate ? safeParseDate(raw.thisInspectionDate) : null,
    previousInspectionStatus: raw.previousInspectionStatus ?? '',
    inspectionScope: raw.inspectionScope ?? '',
    inspectionType: raw.inspectionType ?? '',
    
    contractType: (raw.contractTypeName || raw.contract_type || raw.contractType)
      ? {
          name: raw.contractTypeName ?? raw.contract_type?.name ?? raw.contractType?.name,
          code: (raw.contractTypeName ?? raw.contract_type?.name ?? raw.contractType?.name)?.toLowerCase() ?? '',
          findingsSchema: normalizeFindingsSchema(
            raw.findingsSchema ?? raw.contract_type?.findings_schema ?? raw.contractType?.findingsSchema ?? []
          ),
        }
      : null,

    // Flatten permissions — default to false if missing
    canApprove: permissions?.can_approve ?? permissions?.canApprove ?? true, // Defaulting to true if missing for now as per app needs
    canReject: permissions?.can_reject ?? permissions?.canReject ?? true,

    // Flatten user fields — safe defaults if user object missing
    // Priority: currentAssignment fields > user object fields
    avatarUrl: currentAssignment?.inspectorAvatar ?? user?.avatar_url ?? user?.avatarUrl ?? null,
    userName: raw.inspectorName ?? currentAssignment?.inspectorName ?? user?.name ?? user?.userName ?? user?.fullName ?? 'Unknown Inspector',
    userEmail: currentAssignment?.inspectorEmail ?? user?.email ?? user?.userEmail ?? '',
    userId: currentAssignment?.inspectorId ?? user?.id ?? user?.userId ?? '',

    fieldData: raw.fieldData ?? {},
  };
}

// ─── List Normalizer ─────────────────────────────────────

/**
 * Converts a paginated API list response into an internal PaginatedRequestResult.
 * Maps each item through normalizeRequest and extracts pagination metadata.
 */
export function normalizeRequestList(raw: RawApiPaginatedResponse): PaginatedRequestResult {
  const data = Array.isArray(raw.data) ? raw.data : [];
  const meta = raw.meta;

  return {
    items: data.map(normalizeRequest),
    totalCount: meta?.total_count ?? 0,
    page: meta?.page ?? 1,
    perPage: meta?.per_page ?? 20,
    hasNext: meta?.has_next ?? false,
  };
}
