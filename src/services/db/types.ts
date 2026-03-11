export interface InspectionRecord {
  id: number | null;
  localId: string;
  serverId: string | null;
  assignmentId: string;
  inspectorId: string;
  status: 'draft' | 'accepted' | 'submitted';
  syncStatus: 'pending_upload' | 'synced' | 'conflict' | 'server_deleted';
  formData: string;
  schemaSnapshot: string;
  submittedAt: string | null;
  cachedAt: string;
  updatedAt: string;
}

export interface InspectionPhoto {
  id: number | null;
  localId: string;
  inspectionLocalId: string;
  fieldId: string;
  localUri: string | null;
  serverUri: string | null;
  uploadStatus: 'pending' | 'uploaded' | 'failed';
  createdAt: string;
}

export interface SyncQueueItem {
  id: number | null;
  inspectionLocalId: string;
  queuedAt: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  nextRetryAt: string | null;
}

export interface AssignmentCacheRecord {
  assignmentId: string;
  payload: string;
  schemaSnapshot: string | null;
  pendingAcceptance: number;
  updatedAt: string;
}

export interface AssignmentActionRecord {
  id: number | null;
  assignmentId: string;
  action: 'accept' | 'reject';
  payload: string | null;
  queuedAt: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  nextRetryAt: string | null;
}
