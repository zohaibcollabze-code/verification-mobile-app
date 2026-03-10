import { db } from './index';
import type { InspectionPhoto } from './types';

export function savePhoto(photo: Omit<InspectionPhoto, 'id'>): void {
  try {
    db.runSync(
      `INSERT OR REPLACE INTO inspection_photos (
        localId,
        inspectionLocalId,
        fieldId,
        localUri,
        serverUri,
        uploadStatus,
        createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        photo.localId,
        photo.inspectionLocalId,
        photo.fieldId,
        photo.localUri,
        photo.serverUri,
        photo.uploadStatus,
        photo.createdAt,
      ],
    );
  } catch (error) {
    console.error('[DB] Failed to save photo', error);
    throw error;
  }
}

export function getPhotosByInspection(inspectionLocalId: string): InspectionPhoto[] {
  try {
    return db.getAllSync<InspectionPhoto>(
      `SELECT * FROM inspection_photos
       WHERE inspectionLocalId = ?
       ORDER BY datetime(createdAt) ASC;`,
      [inspectionLocalId],
    );
  } catch (error) {
    console.error('[DB] Failed to fetch photos for inspection', error);
    throw error;
  }
}

export function getPendingPhotos(inspectionLocalId: string): InspectionPhoto[] {
  try {
    return db.getAllSync<InspectionPhoto>(
      `SELECT * FROM inspection_photos
       WHERE inspectionLocalId = ?
         AND uploadStatus != 'uploaded'
       ORDER BY datetime(createdAt) ASC;`,
      [inspectionLocalId],
    );
  } catch (error) {
    console.error('[DB] Failed to fetch pending photos', error);
    throw error;
  }
}

export function markPhotoUploaded(localId: string, serverUri: string): void {
  try {
    db.runSync(
      `UPDATE inspection_photos
       SET serverUri = ?, uploadStatus = 'uploaded', localUri = NULL
       WHERE localId = ?;`,
      [serverUri, localId],
    );
  } catch (error) {
    console.error('[DB] Failed to mark photo uploaded', error);
    throw error;
  }
}

export function markPhotoFailed(localId: string): void {
  try {
    db.runSync(
      `UPDATE inspection_photos
       SET uploadStatus = 'failed'
       WHERE localId = ?;`,
      [localId],
    );
  } catch (error) {
    console.error('[DB] Failed to mark photo failed', error);
    throw error;
  }
}
