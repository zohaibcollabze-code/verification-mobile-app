/**
 * MPVP — Store Type Definitions
 * Zustand store shapes for auth, inspection drafts, and notifications.
 */
import type { Inspector, Assignment } from './api.types';
import type { RequestModel } from '@/services/api/types/requestTypes';
import type { FindingsSchema, InspectionOverallStatus } from './schema.types';

// ─── Auth Store ───────────────────────────────────────────

export interface AuthState {
  user: Inspector | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  reset: () => void;
  setAccessToken: (token: string) => void;
  setUser: (user: Inspector) => void;
}

export interface LoginResult {
  success: boolean;
  isFirstLogin?: boolean;
  error?: string;
  lockedUntil?: string;
}

// ─── Photo Item ───────────────────────────────────────────

export type PhotoUploadStatus = 'pending' | 'uploading' | 'confirmed' | 'failed';

export interface PhotoItem {
  id: string;
  localUri: string;
  attachmentId: string | null;
  s3Key: string | null;
  caption: string;
  remarks: string;
  fieldKey: string | null;
  uploadStatus: PhotoUploadStatus;
  uploadProgress: number;
  mimeType: 'image/jpeg' | 'image/png' | 'video/mp4' | 'video/quicktime';
  fileSizeBytes: number;
  isMocked?: boolean;
  rawCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ─── Inspection Draft ─────────────────────────────────────

export interface Step1Data {
  totalTransactionsToDate: number | null;
}

export interface Step2Data {
  totalInspectionsTillDate: number | null;
  thisInspectionNumber: number | null;
  inspectionDate: string | null;
  previousInspectionStatus: string;
  scopeOfInspection: string;
  inspectionType: 'Scheduled' | 'Surprise' | 'Follow-up' | null;
  inspectorDetail: string;
}

export interface Step3Data {
  findingData: Record<string, string | number | null>;
  overallStatus: InspectionOverallStatus | null;
  remarks: string;
}

export interface GPSData {
  latitude: number;
  longitude: number;
  isMocked?: boolean;
  rawCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface InspectionDraft {
  requestId: string;
  assignment: RequestModel | null;
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  photos: PhotoItem[];
  gps: GPSData | null;
  schemaSnapshot: FindingsSchema | null;
  lastSavedAt: string | null;
}

// ─── Inspection Store ─────────────────────────────────────

export interface InspectionState {
  drafts: Record<string, InspectionDraft>;
  currentRequestId: string | null;

  getDraft: (requestId: string) => InspectionDraft;
  initDraft: (requestId: string, assignment: RequestModel) => void;
  updateStep1: (requestId: string, data: Partial<Step1Data>) => void;
  updateStep2: (requestId: string, data: Partial<Step2Data>) => void;
  updateStep3: (requestId: string, data: Partial<Step3Data>) => void;
  updateAssignment: (requestId: string, assignment: RequestModel) => void;
  addPhoto: (requestId: string, photo: PhotoItem) => void;
  updatePhoto: (requestId: string, photoId: string, updates: Partial<PhotoItem>) => void;
  removePhoto: (requestId: string, photoId: string) => void;
  setGPS: (requestId: string, gps: GPSData) => void;
  updateSchemaSnapshot: (requestId: string, schema: FindingsSchema) => void;
  updateFromPrevious: (requestId: string, data: Partial<InspectionDraft>) => void;
  clearDraft: (requestId: string) => void;
  setCurrentRequestId: (id: string | null) => void;
}

// ─── Notification Store ───────────────────────────────────

export interface NotificationState {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}
