import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('inspector_offline.db');

export function initDB(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      localId TEXT UNIQUE NOT NULL,
      serverId TEXT,
      assignmentId TEXT NOT NULL,
      inspectorId TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      syncStatus TEXT DEFAULT 'pending_upload',
      formData TEXT DEFAULT '{}',
      schemaSnapshot TEXT DEFAULT '{}',
      submittedAt TEXT,
      cachedAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inspection_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      localId TEXT UNIQUE NOT NULL,
      inspectionLocalId TEXT NOT NULL,
      fieldId TEXT NOT NULL,
      localUri TEXT,
      serverUri TEXT,
      uploadStatus TEXT DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(inspectionLocalId) REFERENCES inspections(localId)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspectionLocalId TEXT UNIQUE NOT NULL,
      queuedAt TEXT NOT NULL,
      attemptCount INTEGER DEFAULT 0,
      lastAttemptAt TEXT,
      lastError TEXT,
      nextRetryAt TEXT,
      FOREIGN KEY(inspectionLocalId) REFERENCES inspections(localId)
    );

    CREATE TABLE IF NOT EXISTS assignments_cache (
      assignmentId TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      schemaSnapshot TEXT,
      pendingAcceptance INTEGER DEFAULT 0,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignment_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignmentId TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT,
      queuedAt TEXT NOT NULL,
      attemptCount INTEGER DEFAULT 0,
      lastAttemptAt TEXT,
      lastError TEXT,
      nextRetryAt TEXT,
      UNIQUE(assignmentId, action)
    );
  `);
}
