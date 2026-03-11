import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { InspectionRecord, InspectionPhoto } from '@/services/db/types';
import * as InspectionsDB from '@/services/db/inspections';
import * as PhotosDB from '@/services/db/photos';
import * as SyncQueueDB from '@/services/db/syncQueue';
import type { RequestModel } from '@/services/api/types/requestTypes';
import type { FindingsFieldSchema } from '@/types/schema.types';
import { useNetworkStore } from '@/stores/networkStore';
import { runSync } from '@/services/sync/syncEngine';
import { deleteLocalPhoto } from '@/services/photos/photoService';

interface GPSData {
  latitude: number;
  longitude: number;
  isMocked?: boolean;
  rawCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface InspectionStoreState {
  activeInspection: InspectionRecord | null;
  photos: InspectionPhoto[];
  assignment: RequestModel | null;
  gps: GPSData | null;
  isLoading: boolean;
  error: string | null;

  initDraft: (assignmentId: string, inspectorId: string, schema: FindingsFieldSchema[], assignment?: RequestModel | null) => Promise<void>;
  updateField: (fieldId: string, value: any) => void;
  addPhoto: (fieldId: string, localUri: string) => void;
  removePhoto: (photoLocalId: string) => void;
  updatePhotoField: (photoLocalId: string, fieldId: string) => void;
  setGPS: (gps: GPSData) => void;
  acceptInspection: () => void;
  submitInspection: () => void;
  clearActive: () => void;
  getFormData: () => Record<string, any>;
  getSchema: () => FindingsFieldSchema[];
}

function serializeFormData(data: Record<string, any>): string {
  return JSON.stringify(data ?? {});
}

function parseFormData(record?: InspectionRecord | null): Record<string, any> {
  if (!record?.formData) return {};
  try {
    return JSON.parse(record.formData);
  } catch {
    return {};
  }
}

export const useInspectionStore = create<InspectionStoreState>((set, get) => ({
  activeInspection: null,
  photos: [],
  assignment: null,
  gps: null,
  isLoading: false,
  error: null,

  initDraft: async (assignmentId, inspectorId, schema, assignment) => {
    set({ isLoading: true, error: null });
    try {
      let existing = InspectionsDB.getByAssignmentId(assignmentId);
      if (!existing) {
        const localId = uuidv4();
        const now = new Date().toISOString();
        existing = {
          id: null,
          localId,
          serverId: null,
          assignmentId,
          inspectorId,
          status: 'draft',
          syncStatus: 'pending_upload',
          formData: '{}',
          schemaSnapshot: JSON.stringify(schema),
          submittedAt: null,
          cachedAt: now,
          updatedAt: now,
        };
        InspectionsDB.saveInspection(existing);
      }

      const photos = PhotosDB.getPhotosByInspection(existing.localId);
      set({ activeInspection: existing, photos, assignment: assignment ?? null, gps: null, isLoading: false });
    } catch (error) {
      console.error('[InspectionStore] initDraft failed', error);
      set({ error: 'Failed to initialize inspection', isLoading: false });
    }
  },

  updateField: (fieldId, value) => {
    const state = get();
    if (!state.activeInspection) return;
    const formData = parseFormData(state.activeInspection);
    formData[fieldId] = value;
    const serialized = serializeFormData(formData);
    InspectionsDB.updateFormData(state.activeInspection.localId, serialized);
    set({ activeInspection: { ...state.activeInspection, formData: serialized } });
  },

  addPhoto: (fieldId, localUri) => {
    const state = get();
    if (!state.activeInspection) return;
    const localId = uuidv4();
    const photo: Omit<InspectionPhoto, 'id'> = {
      localId,
      inspectionLocalId: state.activeInspection.localId,
      fieldId,
      localUri,
      serverUri: null,
      uploadStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    PhotosDB.savePhoto(photo);
    set({ photos: [...state.photos, { id: null, ...photo }] });
  },

  acceptInspection: () => {
    const state = get();
    if (!state.activeInspection) return;
    InspectionsDB.updateStatus(state.activeInspection.localId, 'accepted', 'pending_upload');
    set({ activeInspection: { ...state.activeInspection, status: 'accepted', syncStatus: 'pending_upload', updatedAt: new Date().toISOString() } });
  },

  submitInspection: () => {
    const state = get();
    if (!state.activeInspection) return;
    const now = new Date().toISOString();
    InspectionsDB.updateStatus(state.activeInspection.localId, 'submitted', 'pending_upload');
    InspectionsDB.saveInspection({ ...state.activeInspection, status: 'submitted', syncStatus: 'pending_upload', updatedAt: now, submittedAt: now } as Omit<InspectionRecord, 'id'>);
    SyncQueueDB.addToQueue(state.activeInspection.localId);
    set({
      activeInspection: { ...state.activeInspection, status: 'submitted', syncStatus: 'pending_upload', submittedAt: now, updatedAt: now },
    });
    if (useNetworkStore.getState().isOnline) {
      runSync();
    }
  },

  removePhoto: (photoLocalId) => {
    const state = get();
    if (!state.activeInspection) return;
    const photo = state.photos.find(p => p.localId === photoLocalId);
    if (photo?.localUri) {
      deleteLocalPhoto(photo.localUri).catch(err => console.warn('[InspectionStore] Failed to delete local photo', err));
    }
    PhotosDB.deletePhoto(photoLocalId);
    set({ photos: state.photos.filter(p => p.localId !== photoLocalId) });
  },

  updatePhotoField: (photoLocalId, fieldId) => {
    const state = get();
    PhotosDB.updatePhotoField(photoLocalId, fieldId);
    set({ photos: state.photos.map(p => p.localId === photoLocalId ? { ...p, fieldId } : p) });
  },

  setGPS: (gps) => {
    set({ gps });
  },

  clearActive: () => {
    set({ activeInspection: null, photos: [], assignment: null, gps: null });
  },

  getFormData: () => {
    const state = get();
    return parseFormData(state.activeInspection);
  },

  getSchema: () => {
    const state = get();
    if (!state.activeInspection?.schemaSnapshot) return [];
    try {
      return JSON.parse(state.activeInspection.schemaSnapshot);
    } catch {
      return [];
    }
  },
}));
