import { db } from './index';
import type { AssignmentActionRecord, AssignmentCacheRecord } from './types';
import type { RequestModel } from '@/services/api/types/requestTypes';

const ACCEPT_ACTION = 'accept';
const REJECT_ACTION = 'reject';

type AssignmentActionType = typeof ACCEPT_ACTION | typeof REJECT_ACTION;

interface CachedAssignment {
  assignment: RequestModel;
  schemaSnapshot: string | null;
  pendingAcceptance: boolean;
  updatedAt: string;
}

function now(): string {
  return new Date().toISOString();
}

function mapCacheRecord(row: AssignmentCacheRecord): CachedAssignment | null {
  if (!row?.payload) return null;
  try {
    const assignment = JSON.parse(row.payload) as RequestModel;
    return {
      assignment,
      schemaSnapshot: row.schemaSnapshot,
      pendingAcceptance: !!row.pendingAcceptance,
      updatedAt: row.updatedAt,
    };
  } catch (error) {
    console.warn('[DB] Failed to parse assignment cache payload', error);
    return null;
  }
}

export function saveAssignment(assignment: RequestModel, schemaSnapshot?: string | null): void {
  try {
    const existing = getAssignmentRecord(assignment.id);
    const payload = JSON.stringify(assignment);
    const snapshot = schemaSnapshot ?? existing?.schemaSnapshot ?? null;
    const pendingAcceptance = existing?.pendingAcceptance ?? 0;
    db.runSync(
      `INSERT OR REPLACE INTO assignments_cache (
        assignmentId,
        payload,
        schemaSnapshot,
        pendingAcceptance,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?);`,
      [assignment.id, payload, snapshot, pendingAcceptance, now()],
    );
  } catch (error) {
    console.error('[DB] Failed to save assignment cache', error);
    throw error;
  }
}

export function saveSchemaSnapshot(assignmentId: string, schemaSnapshot: string): void {
  try {
    const existing = getAssignmentRecord(assignmentId);
    if (!existing) return;
    db.runSync(
      `UPDATE assignments_cache SET schemaSnapshot = ?, updatedAt = ? WHERE assignmentId = ?;`,
      [schemaSnapshot, now(), assignmentId],
    );
  } catch (error) {
    console.error('[DB] Failed to update schema snapshot', error);
    throw error;
  }
}

export function getAssignment(assignmentId: string): CachedAssignment | null {
  const record = getAssignmentRecord(assignmentId);
  return record ? mapCacheRecord(record) : null;
}

export function getAllAssignments(): CachedAssignment[] {
  try {
    const rows = db.getAllSync<AssignmentCacheRecord>(`SELECT * FROM assignments_cache ORDER BY datetime(updatedAt) DESC;`);
    return rows.map(mapCacheRecord).filter(Boolean) as CachedAssignment[];
  } catch (error) {
    console.error('[DB] Failed to load assignment cache', error);
    throw error;
  }
}

function getAssignmentRecord(assignmentId: string): AssignmentCacheRecord | null {
  try {
    const row = db.getFirstSync<AssignmentCacheRecord>(
      `SELECT * FROM assignments_cache WHERE assignmentId = ? LIMIT 1;`,
      [assignmentId],
    );
    return row ?? null;
  } catch (error) {
    console.error('[DB] Failed to load assignment cache record', error);
    throw error;
  }
}

export function setPendingAcceptance(assignmentId: string, pending: boolean): void {
  try {
    db.runSync(
      `UPDATE assignments_cache SET pendingAcceptance = ?, updatedAt = ? WHERE assignmentId = ?;`,
      [pending ? 1 : 0, now(), assignmentId],
    );
  } catch (error) {
    console.error('[DB] Failed to update pending acceptance flag', error);
    throw error;
  }
}

export function queueAssignmentAction(assignmentId: string, action: AssignmentActionType, payload?: Record<string, any>): void {
  try {
    const queuedPayload = payload ? JSON.stringify(payload) : null;
    db.runSync(
      `INSERT OR REPLACE INTO assignment_actions (
        assignmentId,
        action,
        payload,
        queuedAt,
        attemptCount,
        lastAttemptAt,
        lastError,
        nextRetryAt
      ) VALUES (?, ?, ?, ?, COALESCE((SELECT attemptCount FROM assignment_actions WHERE assignmentId = ? AND action = ?), 0), NULL, NULL, NULL);`,
      [assignmentId, action, queuedPayload, now(), assignmentId, action],
    );
  } catch (error) {
    console.error('[DB] Failed to queue assignment action', error);
    throw error;
  }
}

export function getQueuedActions(): AssignmentActionRecord[] {
  try {
    return db.getAllSync<AssignmentActionRecord>(
      `SELECT * FROM assignment_actions
       WHERE nextRetryAt IS NULL OR datetime(nextRetryAt) <= datetime(?)
       ORDER BY datetime(queuedAt) ASC;`,
      [now()],
    );
  } catch (error) {
    console.error('[DB] Failed to load assignment actions', error);
    throw error;
  }
}

export function recordAssignmentActionAttempt(assignmentId: string, action: AssignmentActionType, errorMessage?: string): void {
  try {
    const existing = db.getFirstSync<AssignmentActionRecord>(
      `SELECT attemptCount FROM assignment_actions WHERE assignmentId = ? AND action = ? LIMIT 1;`,
      [assignmentId, action],
    );
    const attempts = (existing?.attemptCount ?? 0) + 1;
    const retryDelaySeconds = Math.min(300, Math.pow(2, attempts) * 5);
    const nextRetry = new Date(Date.now() + retryDelaySeconds * 1000).toISOString();
    db.runSync(
      `UPDATE assignment_actions
       SET attemptCount = ?, lastAttemptAt = ?, lastError = ?, nextRetryAt = ?
       WHERE assignmentId = ? AND action = ?;`,
      [attempts, now(), errorMessage ?? null, nextRetry, assignmentId, action],
    );
  } catch (error) {
    console.error('[DB] Failed to record assignment action attempt', error);
    throw error;
  }
}

export function removeAssignmentAction(assignmentId: string, action: AssignmentActionType): void {
  try {
    db.runSync(`DELETE FROM assignment_actions WHERE assignmentId = ? AND action = ?;`, [assignmentId, action]);
  } catch (error) {
    console.error('[DB] Failed to remove assignment action', error);
    throw error;
  }
}

export function clearAssignmentCache(): void {
  try {
    db.runSync(`DELETE FROM assignments_cache;`);
  } catch (error) {
    console.error('[DB] Failed to clear assignments cache', error);
    throw error;
  }
}

export { CachedAssignment };
export type { AssignmentActionType };
