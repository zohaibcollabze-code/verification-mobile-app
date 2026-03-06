/**
 * MPVP — Inspection Store (Zustand + MMKV Cache)
 * Manages inspection drafts, photos, GPS, and schema snapshots.
 * Drafts persist to local cache for offline support.
 */
import { create } from 'zustand';
import type { InspectionState, InspectionDraft, PhotoItem, Step1Data, Step2Data, Step3Data, GPSData } from '@/types/store.types';
import type { FindingsSchema } from '@/types/schema.types';
import { cacheDraft, getCachedDraft, clearCachedDraft } from '@/services/storage/localCache';

import type { RequestModel } from '@/services/api/types/requestTypes';

/** Create a blank draft for a new inspection */
function createBlankDraft(requestId: string, assignment: RequestModel): InspectionDraft {
  return {
    requestId,
    assignment,
    step1: { totalTransactionsToDate: null },
    step2: {
      totalInspectionsTillDate: null,
      thisInspectionNumber: null,
      inspectionDate: null,
      previousInspectionStatus: '',
      scopeOfInspection: '',
      inspectionType: null,
      inspectorDetail: '',
    },
    step3: {
      findingData: { 'overall_inspection_status_1772527935838': 'satisfactory' },
      overallStatus: null,
      remarks: '',
    },
    photos: [],
    gps: null,
    schemaSnapshot: assignment.contractType?.findingsSchema || [],
    lastSavedAt: null,
  };
}

/** Persist draft to local cache */
function persistDraft(draft: InspectionDraft): void {
  const updated = { ...draft, lastSavedAt: new Date().toISOString() };
  cacheDraft(draft.requestId, updated);
}

/**
 * IMPORTANT: getDraft is NOT a selector — it's a standalone function.
 * Call it like: useInspectionStore.getState().getDraft(id)
 * or from within actions. Never use it in a useStore selector.
 */
export const useInspectionStore = create<InspectionState>((set, get) => ({
  drafts: {},
  currentRequestId: null,

  getDraft: (requestId: string): InspectionDraft => {
    const state = get();
    if (state.drafts[requestId]) {
      return state.drafts[requestId];
    }
    // Try loading from cache
    const cached = getCachedDraft(requestId);
    if (cached) {
      return cached;
    }
    // Return blank draft (Note: this should ideally not be called without an assignment)
    return createBlankDraft(requestId, null as any);
  },

  initDraft: (requestId: string, assignment: RequestModel) => {
    const existing = getCachedDraft(requestId);
    if (existing) {
      const updated = { ...existing, assignment };
      set((s) => ({ drafts: { ...s.drafts, [requestId]: updated }, currentRequestId: requestId }));
      persistDraft(updated);
    } else {
      const draft = createBlankDraft(requestId, assignment);
      set((s) => ({ drafts: { ...s.drafts, [requestId]: draft }, currentRequestId: requestId }));
      persistDraft(draft);
    }
  },

  updateStep1: (requestId: string, data: Partial<Step1Data>) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft) return s;
      const updated = { ...draft, step1: { ...draft.step1, ...data } };
      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  updateStep2: (requestId: string, data: Partial<Step2Data>) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft) return s;
      const updated = { ...draft, step2: { ...draft.step2, ...data } };
      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  updateStep3: (requestId: string, data: Partial<Step3Data>) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft) return s;
      
      const currentFindingData = draft.step3?.findingData || {};
      const newFindingData = data.findingData 
        ? { ...currentFindingData, ...data.findingData }
        : currentFindingData;

      const updated: InspectionDraft = {
        ...draft,
        step3: {
          ...draft.step3,
          ...data,
          findingData: newFindingData,
        },
      };

      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  updateAssignment: (requestId: string, assignment: RequestModel) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft) return s;
      const updated = { ...draft, assignment };
      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  addPhoto: (requestId: string, photo: PhotoItem) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft) return s;
      const updated = { ...draft, photos: [...draft.photos, photo] };
      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  updatePhoto: (requestId: string, photoId: string, updates: Partial<PhotoItem>) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft) return s;
      const photos = draft.photos.map((p) => (p.id === photoId ? { ...p, ...updates } : p));
      const updated = { ...draft, photos };
      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  removePhoto: (requestId: string, photoId: string) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft) return s;
      const photos = draft.photos.filter((p) => p.id !== photoId);
      const updated = { ...draft, photos };
      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  setGPS: (requestId: string, gps: GPSData) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft) return s;
      const updated = { ...draft, gps };
      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  updateSchemaSnapshot: (requestId: string, schema: FindingsSchema) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft) return s;
      const updated = { ...draft, schemaSnapshot: schema };
      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  clearDraft: (requestId: string) => {
    clearCachedDraft(requestId);
    set((s) => {
      const { [requestId]: _, ...rest } = s.drafts;
      return { drafts: rest, currentRequestId: null };
    });
  },

  updateFromPrevious: (requestId: string, data: Partial<InspectionDraft>) => {
    set((s) => {
      const draft = s.drafts[requestId];
      if (!draft || !data) return s;
      const updated = { ...draft, ...data };
      persistDraft(updated);
      return { drafts: { ...s.drafts, [requestId]: updated } };
    });
  },

  setCurrentRequestId: (id: string | null) => {
    set({ currentRequestId: id });
  },
}));
