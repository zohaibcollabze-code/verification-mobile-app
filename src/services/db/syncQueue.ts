import { db } from './index';
import type { SyncQueueItem } from './types';

const BACKOFF_SECONDS = [10, 30, 120, 300];

function getBackoff(attempts: number): number {
  const index = Math.min(attempts, BACKOFF_SECONDS.length - 1);
  return BACKOFF_SECONDS[index];
}

function now(): string {
  return new Date().toISOString();
}

export function addToQueue(inspectionLocalId: string): void {
  try {
    db.runSync(
      `INSERT OR IGNORE INTO sync_queue (
        inspectionLocalId,
        queuedAt,
        attemptCount,
        lastAttemptAt,
        lastError,
        nextRetryAt
      ) VALUES (?, ?, 0, NULL, NULL, NULL);`,
      [inspectionLocalId, now()],
    );
  } catch (error) {
    console.error('[DB] Failed to add to sync queue', error);
    throw error;
  }
}

export function getDueItems(): SyncQueueItem[] {
  try {
    return db.getAllSync<SyncQueueItem>(
      `SELECT * FROM sync_queue
       WHERE nextRetryAt IS NULL OR datetime(nextRetryAt) <= datetime(?)
       ORDER BY datetime(queuedAt) ASC;`,
      [now()],
    );
  } catch (error) {
    console.error('[DB] Failed to load due sync items', error);
    throw error;
  }
}

export function recordAttempt(inspectionLocalId: string, error?: string): void {
  try {
    const item = db.getFirstSync<SyncQueueItem>(
      `SELECT attemptCount FROM sync_queue WHERE inspectionLocalId = ?;`,
      [inspectionLocalId],
    );
    const attempts = (item?.attemptCount ?? 0) + 1;
    const retryDelay = getBackoff(attempts - 1);
    const nextRetry = new Date(Date.now() + retryDelay * 1000).toISOString();

    db.runSync(
      `UPDATE sync_queue
       SET attemptCount = ?, lastAttemptAt = ?, lastError = ?, nextRetryAt = ?
       WHERE inspectionLocalId = ?;`,
      [attempts, now(), error ?? null, nextRetry, inspectionLocalId],
    );
  } catch (err) {
    console.error('[DB] Failed to record sync attempt', err);
    throw err;
  }
}

export function removeFromQueue(inspectionLocalId: string): void {
  try {
    db.runSync(`DELETE FROM sync_queue WHERE inspectionLocalId = ?;`, [inspectionLocalId]);
  } catch (error) {
    console.error('[DB] Failed to remove from sync queue', error);
    throw error;
  }
}
