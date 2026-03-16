import { db } from './index';
import type { InspectionRecord } from './types';

function now(): string {
  return new Date().toISOString();
}

export function saveInspection(record: Omit<InspectionRecord, 'id'>): void {
  try {
    db.runSync(
      `INSERT OR REPLACE INTO inspections (
        localId,
        serverId,
        assignmentId,
        inspectorId,
        status,
        syncStatus,
        formData,
        schemaSnapshot,
        submittedAt,
        cachedAt,
        updatedAt,
        gpsLatitude,
        gpsLongitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.localId,
        record.serverId,
        record.assignmentId,
        record.inspectorId,
        record.status,
        record.syncStatus,
        record.formData,
        record.schemaSnapshot,
        record.submittedAt,
        record.cachedAt,
        record.updatedAt,
        record.gpsLatitude,
        record.gpsLongitude,
      ],
    );
  } catch (error) {
    console.error('[DB] Failed to save inspection', error);
    throw error;
  }
}

export function updateFormData(localId: string, formData: string): void {
  try {
    db.runSync(
      `UPDATE inspections
       SET formData = ?, updatedAt = ?
       WHERE localId = ?;`,
      [formData, now(), localId],
    );
  } catch (error) {
    console.error('[DB] Failed to update form data', error);
    throw error;
  }
}

export function updateSchemaSnapshot(localId: string, schemaSnapshot: string): void {
  try {
    db.runSync(
      `UPDATE inspections
       SET schemaSnapshot = ?, updatedAt = ?
       WHERE localId = ?;`,
      [schemaSnapshot, now(), localId],
    );
  } catch (error) {
    console.error('[DB] Failed to update schema snapshot', error);
    throw error;
  }
}

export function updateStatus(
  localId: string,
  status: InspectionRecord['status'],
  syncStatus: InspectionRecord['syncStatus'],
): void {
  try {
    db.runSync(
      `UPDATE inspections
       SET status = ?, syncStatus = ?, updatedAt = ?
       WHERE localId = ?;`,
      [status, syncStatus, now(), localId],
    );
  } catch (error) {
    console.error('[DB] Failed to update status', error);
    throw error;
  }
}

export function markSynced(localId: string, serverId: string): void {
  try {
    db.runSync(
      `UPDATE inspections
       SET syncStatus = 'synced', serverId = ?, updatedAt = ?
       WHERE localId = ?;`,
      [serverId, now(), localId],
    );
  } catch (error) {
    console.error('[DB] Failed to mark synced', error);
    throw error;
  }
}

export function markConflict(localId: string): void {
  try {
    db.runSync(
      `UPDATE inspections SET syncStatus = 'conflict', updatedAt = ? WHERE localId = ?;`,
      [now(), localId],
    );
  } catch (error) {
    console.error('[DB] Failed to mark conflict', error);
    throw error;
  }
}

export function markServerDeleted(localId: string): void {
  try {
    db.runSync(
      `UPDATE inspections SET syncStatus = 'server_deleted', updatedAt = ? WHERE localId = ?;`,
      [now(), localId],
    );
  } catch (error) {
    console.error('[DB] Failed to mark server deleted', error);
    throw error;
  }
}

export function getByLocalId(localId: string): InspectionRecord | null {
  try {
    const row = db.getFirstSync<InspectionRecord>(
      `SELECT * FROM inspections WHERE localId = ? LIMIT 1;`,
      [localId],
    );
    return row ?? null;
  } catch (error) {
    console.error('[DB] Failed to fetch inspection by localId', error);
    throw error;
  }
}

export function getByAssignmentId(assignmentId: string): InspectionRecord | null {
  try {
    const row = db.getFirstSync<InspectionRecord>(
      `SELECT * FROM inspections
       WHERE assignmentId = ?
       ORDER BY datetime(updatedAt) DESC
       LIMIT 1;`,
      [assignmentId],
    );
    return row ?? null;
  } catch (error) {
    console.error('[DB] Failed to fetch inspection by assignmentId', error);
    throw error;
  }
}

export function getAllPendingUploads(): InspectionRecord[] {
  try {
    return db.getAllSync<InspectionRecord>(
      `SELECT * FROM inspections WHERE syncStatus = 'pending_upload' ORDER BY datetime(updatedAt) ASC;`,
    );
  } catch (error) {
    console.error('[DB] Failed to fetch pending uploads', error);
    throw error;
  }
}
