import { Platform } from 'react-native';
import apiClient from '@/services/api/apiClient';
import { useNetworkStore } from '@/stores/networkStore';
import * as InspectionsDB from '@/services/db/inspections';
import * as PhotosDB from '@/services/db/photos';
import * as SyncQueueDB from '@/services/db/syncQueue';
import * as AssignmentActionsDB from '@/services/db/assignments';
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
    const assignmentActions = AssignmentActionsDB.getQueuedActions();
    for (const action of assignmentActions) {
      const success = await syncAssignmentAction(action);
      if (!success) {
        allSucceeded = false;
      }
    }

    const items = SyncQueueDB.getDueItems();
    if (!items.length && !assignmentActions.length) {
      networkState.setSyncStatus('idle');
      isSyncing = false;
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
    const inspection = InspectionsDB.getByLocalId(inspectionLocalId);
    if (!inspection) {
      SyncQueueDB.removeFromQueue(inspectionLocalId);
      return true;
    }

    const allPhotos = PhotosDB.getPhotosByInspection(inspectionLocalId);
    const formDataJson = JSON.parse(inspection.formData || '{}');

    // Build Multipart Payload matching findingsService logic
    const formData = new FormData();
    formData.append('findingData', JSON.stringify(formDataJson));
    formData.append('overallStatus', formDataJson.overall_inspection_status || 'satisfactory');
    
    if (inspection.gpsLatitude && inspection.gpsLongitude) {
      formData.append('gpsLatitude', inspection.gpsLatitude.toString());
      formData.append('gpsLongitude', inspection.gpsLongitude.toString());
    }

    // Attach all photos to their respective fields
    for (const photo of allPhotos) {
      if (photo.localUri) {
        const filename = `${photo.fieldId || 'general'}_${Date.now()}.jpg`;
        // @ts-ignore
        formData.append(photo.fieldId || 'general', {
          uri: photo.localUri,
          name: filename,
          type: 'image/jpeg',
        });
      }
    }

    const response = await apiClient.post(`/inspections/${inspection.assignmentId}/submit-findings`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });

    if (response.status === 200 || response.status === 201) {
      const serverId = response.data?.data?.id ?? response.data?.id;
      if (serverId) {
        InspectionsDB.markSynced(inspectionLocalId, serverId);
      }
      SyncQueueDB.removeFromQueue(inspectionLocalId);
      
      // Clean up local photos after successful sync
      for (const photo of allPhotos) {
        if (photo.localUri) {
          try {
            await deleteLocalPhoto(photo.localUri);
          } catch (e) {
            console.warn('[SyncEngine] Failed to delete synced local photo', e);
          }
        }
      }
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('[SyncEngine] Sync failed for', inspectionLocalId, error?.message);
    const status = error?.response?.status;
    
    if (status === 409) {
      // Resource conflict, usually already submitted
      InspectionsDB.markConflict(inspectionLocalId);
      SyncQueueDB.removeFromQueue(inspectionLocalId);
      return false;
    }
    
    if (status === 404) {
      // Assignment or resource not found on server
      InspectionsDB.markServerDeleted(inspectionLocalId);
      SyncQueueDB.removeFromQueue(inspectionLocalId);
      return false;
    }

    // Record attempt for retry later
    SyncQueueDB.recordAttempt(inspectionLocalId, error?.message || 'Sync failed');
    return false;
  }
}

async function syncAssignmentAction(action: any): Promise<boolean> {
  try {
    const endpoint = action.action === 'accept' 
      ? `/requests/${action.assignmentId}/accept`
      : `/requests/${action.assignmentId}/reject`;
    
    const payload = action.payload ? JSON.parse(action.payload) : {};
    
    const response = await apiClient.post(endpoint, payload);
    
    if (response.status === 200 || response.status === 201) {
      AssignmentActionsDB.removeAssignmentAction(action.assignmentId, action.action);
      AssignmentActionsDB.setPendingAcceptance(action.assignmentId, false);
      return true;
    }
    
    return false;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404 || status === 409) {
      // Terminal failure for this action
      AssignmentActionsDB.removeAssignmentAction(action.assignmentId, action.action);
      return false;
    }
    
    AssignmentActionsDB.recordAssignmentActionAttempt(
      action.assignmentId,
      action.action,
      error?.message || 'Action sync failed'
    );
    return false;
  }
}
