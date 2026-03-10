import { Platform } from 'react-native';
import apiClient from '@/services/api/apiClient';
import { useNetworkStore } from '@/stores/networkStore';
import * as InspectionsDB from '@/services/db/inspections';
import * as PhotosDB from '@/services/db/photos';
import * as SyncQueueDB from '@/services/db/syncQueue';
import type { InspectionPhoto } from '@/services/db/types';
import { deleteLocalPhoto } from '@/services/photos/photoService';

let isSyncing = false;

export async function runSync(): Promise<void> {
  const networkState = useNetworkStore.getState();
  if (!networkState.isOnline) {
    return;
  }
  if (isSyncing) {
    return;
  }

  isSyncing = true;
  networkState.setSyncStatus('syncing');
  let allSucceeded = true;

  try {
    const items = SyncQueueDB.getDueItems();
    if (!items.length) {
      networkState.setSyncStatus('idle');
      return;
    }

    for (const item of items) {
      const success = await syncSingleInspection(item.inspectionLocalId);
      if (!success) {
        allSucceeded = false;
      }
    }

    if (allSucceeded) {
      const timestamp = new Date().toISOString();
      networkState.setLastSyncedAt(timestamp);
      networkState.showSuccessBanner();
    } else {
      networkState.setSyncStatus('error');
    }
  } catch (error) {
    console.error('[SyncEngine] Unexpected sync failure', error);
    useNetworkStore.getState().setSyncStatus('error');
  } finally {
    isSyncing = false;
  }
}

async function syncSingleInspection(inspectionLocalId: string): Promise<boolean> {
  try {
    const pendingPhotos = PhotosDB.getPendingPhotos(inspectionLocalId);
    for (const photo of pendingPhotos) {
      const uploaded = await uploadSinglePhoto(photo);
      if (!uploaded) {
        SyncQueueDB.recordAttempt(inspectionLocalId, 'Photo upload failed');
        return false;
      }
    }

    const inspection = InspectionsDB.getByLocalId(inspectionLocalId);
    if (!inspection) {
      SyncQueueDB.removeFromQueue(inspectionLocalId);
      return true;
    }

    const allPhotos = PhotosDB.getPhotosByInspection(inspectionLocalId);
    const formData = JSON.parse(inspection.formData || '{}');
    replacePhotoUris(formData, allPhotos);

    const payload = {
      localId: inspection.localId,
      assignmentId: inspection.assignmentId,
      inspectorId: inspection.inspectorId,
      status: inspection.status,
      formData,
      submittedAt: inspection.submittedAt,
    };

    const response = await apiClient.post('/inspections', payload);
    if (response.status === 200 || response.status === 201) {
      const serverId = response.data?.data?.id ?? response.data?.id;
      if (serverId) {
        InspectionsDB.markSynced(inspectionLocalId, serverId);
      }
      SyncQueueDB.removeFromQueue(inspectionLocalId);
      for (const photo of allPhotos) {
        if (photo.localUri) {
          await deleteLocalPhoto(photo.localUri);
        }
      }
      return true;
    }

    return false;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 409) {
      InspectionsDB.markConflict(inspectionLocalId);
      SyncQueueDB.removeFromQueue(inspectionLocalId);
      return false;
    }
    if (status === 404) {
      InspectionsDB.markServerDeleted(inspectionLocalId);
      SyncQueueDB.removeFromQueue(inspectionLocalId);
      return false;
    }

    SyncQueueDB.recordAttempt(inspectionLocalId, error?.message || 'Sync failed');
    return false;
  }
}

async function uploadSinglePhoto(photo: InspectionPhoto): Promise<boolean> {
  if (!photo.localUri) {
    return true;
  }

  try {
    const formData = new FormData();
    formData.append('inspectionLocalId', photo.inspectionLocalId);
    formData.append('fieldId', photo.fieldId);
    formData.append('file', {
      uri: photo.localUri,
      type: 'image/jpeg',
      name: `photo_${photo.fieldId}_${Date.now()}.jpg`,
    } as any);

    const response = await apiClient.post('/inspections/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const serverUri = response.data?.data?.uri ?? response.data?.uri;
    if (serverUri) {
      PhotosDB.markPhotoUploaded(photo.localId, serverUri);
    }
    return true;
  } catch (error) {
    console.warn('[SyncEngine] Photo upload failed', error);
    PhotosDB.markPhotoFailed(photo.localId);
    return false;
  }
}

function replacePhotoUris(formData: any, photos: InspectionPhoto[]): void {
  if (!formData || typeof formData !== 'object') {
    return;
  }

  const serverUriMap = new Map<string, string>();
  photos.forEach((photo) => {
    if (photo.fieldId && photo.serverUri) {
      serverUriMap.set(photo.fieldId, photo.serverUri);
    }
  });

  const stack: any[] = [formData];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      current.forEach((item) => stack.push(item));
    } else if (current && typeof current === 'object') {
      Object.keys(current).forEach((key) => {
        if (typeof current[key] === 'string' && current[key].startsWith('file://')) {
          const mapped = serverUriMap.get(key);
          if (mapped) {
            current[key] = mapped;
          }
        } else if (typeof current[key] === 'object') {
          stack.push(current[key]);
        }
      });
    }
  }
}
