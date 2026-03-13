# OFFLINE_MODE_IMPLEMENTATION.md
## Complete Offline-First System — End-to-End Architecture & Implementation Reference

---

## Table of Contents

1. [System Overview & Data Flow](#1-system-overview--data-flow)
2. [SQLite Schema — Full Table Definitions](#2-sqlite-schema--full-table-definitions)
3. [Connectivity Layer — Monitor & Probe](#3-connectivity-layer--monitor--probe)
4. [Assignments List — Online Fetch & Offline Cache](#4-assignments-list--online-fetch--offline-cache)  *(Lines 28–65)*
5. [Assignment Detail — Schema Snapshot & CTA Bootstrap](#5-assignment-detail--schema-snapshot--cta-bootstrap)  *(Lines 36–47)*
6. [Accept / Reject — Optimistic Queue & Replay](#6-accept--reject--optimistic-queue--replay)  *(Lines 42–47)*
7. [Inspection Form — Data Entry, Photos & Immediate Persistence](#7-inspection-form--data-entry-photos--immediate-persistence)  *(Lines 48–54)*
8. [Submission & Sync Queue Entry](#8-submission--sync-queue-entry)  *(Lines 55–64)*
9. [Sync Engine — runSync() Full Orchestration](#9-sync-engine--runsync-full-orchestration)
10. [API Client — Authenticated Axios Wrapper](#10-api-client--authenticated-axios-wrapper)
11. [Error Handler — Mapping & Redacted Logging](#11-error-handler--mapping--redacted-logging)
12. [User-Facing Error States & UI Surfaces](#12-user-facing-error-states--ui-surfaces)  *(Lines 102–149)*
13. [Conflict Resolution Screen](#13-conflict-resolution-screen)  *(Lines 125–132)*
14. [Network Store — Global Sync State](#14-network-store--global-sync-state)
15. [End-to-End Scenario Walkthroughs](#15-end-to-end-scenario-walkthroughs)
16. [Implementation Checklist](#16-implementation-checklist)

---

## 1. System Overview & Data Flow

The system is architected around a single principle: **the device is always the primary source of truth during a session.** The server is the eventual destination, never a blocking dependency.

### Data Flow Diagram

```
USER ACTION
     |
     v
PRESENTATION LAYER (Screen Components)
     |  reads from / dispatches to
     v
NETWORK STORE (Zustand / Redux)
     |  isOnline, syncStatus, pendingCount, conflictCount
     v
DOMAIN LAYER (Assignment Service / Inspection Service)
     |  business rules, validation, lifecycle management
     v
+--------------------------------------------+
|              INFRASTRUCTURE LAYER          |
|                                            |
|  +-------------+      +-----------------+  |
|  |  API CLIENT |      |  SQLITE ENGINE  |  |
|  |  (Axios)    |      |  (Local Store)  |  |
|  +------+------+      +--------+--------+  |
|         |                      |            |
|         v                      v            |
|  +-------------+      +-----------------+  |
|  | ERROR       |      |  FILE SYSTEM    |  |
|  | HANDLER     |      |  (Photos)       |  |
|  +-------------+      +-----------------+  |
+--------------------------------------------+
     |
     v
SYNC ENGINE (runSync)
     |  processes sync_queue on connectivity restore
     v
REMOTE API SERVER
```

### Key Invariants

- No user action is ever blocked by a network call.
- Every write to the API is mirrored to SQLite first.
- `sync_queue` is the single source of all pending server work.
- All errors are classified before reaching any consumer.
- The user always sees the current sync state via the `OfflineBanner`.

---

## 2. SQLite Schema — Full Table Definitions

All tables must be created with `IF NOT EXISTS`. Migrations increment a `schema_version` in a `meta` table.

### `assignments_cache`

```sql
CREATE TABLE IF NOT EXISTS assignments_cache (
  id                  TEXT PRIMARY KEY,       -- server assignment UUID
  raw_json            TEXT NOT NULL,          -- full serialized Assignment object
  schema_snapshot     TEXT,                   -- JSON schema for the inspection form
  schema_version      INTEGER DEFAULT 0,      -- schema version at time of cache
  status              TEXT NOT NULL           -- 'available' | 'accepted' | 'rejected'
                      CHECK(status IN ('available','accepted','rejected')),
  pending_acceptance  INTEGER DEFAULT 0,      -- 1 = accept/reject queued offline
  conflict_flag       INTEGER DEFAULT 0,      -- 1 = 409 conflict detected
  server_deleted      INTEGER DEFAULT 0,      -- 1 = 404 received, skip retries
  cached_at           TEXT NOT NULL,          -- ISO-8601 timestamp
  expires_at          TEXT                    -- optional TTL for cache invalidation
);

CREATE INDEX IF NOT EXISTS idx_assignments_status
  ON assignments_cache(status);
```

### `assignment_actions`

```sql
CREATE TABLE IF NOT EXISTS assignment_actions (
  id              TEXT PRIMARY KEY,   -- client UUID
  assignment_id   TEXT NOT NULL,
  action_type     TEXT NOT NULL       -- 'accept' | 'reject'
                  CHECK(action_type IN ('accept','reject')),
  payload         TEXT,               -- optional JSON body
  created_at      TEXT NOT NULL,
  attempted_at    TEXT,
  attempt_count   INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'pending'
                  CHECK(status IN ('pending','synced','failed')),
  error_code      TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments_cache(id)
);

CREATE INDEX IF NOT EXISTS idx_actions_status
  ON assignment_actions(status, created_at);
```

### `inspections`

```sql
CREATE TABLE IF NOT EXISTS inspections (
  id                TEXT PRIMARY KEY,       -- client UUID
  assignment_id     TEXT NOT NULL,
  form_data         TEXT NOT NULL,          -- JSON of all field values
  schema_version    INTEGER NOT NULL,       -- schema version used for this form
  status            TEXT DEFAULT 'draft'
                    CHECK(status IN (
                      'draft','submitted','syncing',
                      'synced','conflict','failed'
                    )),
  conflict_flag     INTEGER DEFAULT 0,
  server_deleted    INTEGER DEFAULT 0,
  retry_count       INTEGER DEFAULT 0,
  next_retry_at     TEXT,                   -- ISO-8601, NULL = eligible immediately
  last_attempted_at TEXT,
  synced_at         TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  FOREIGN KEY (assignment_id) REFERENCES assignments_cache(id)
);

CREATE INDEX IF NOT EXISTS idx_inspections_status
  ON inspections(status, created_at);

CREATE INDEX IF NOT EXISTS idx_inspections_retry
  ON inspections(status, next_retry_at);
```

### `inspection_photos`

```sql
CREATE TABLE IF NOT EXISTS inspection_photos (
  id              TEXT PRIMARY KEY,     -- client UUID
  inspection_id   TEXT NOT NULL,
  field_key       TEXT NOT NULL,        -- form field this photo belongs to
  local_path      TEXT NOT NULL,        -- encrypted file path on device
  remote_url      TEXT,                 -- populated after successful upload
  mime_type       TEXT NOT NULL,
  file_size_bytes INTEGER,
  checksum        TEXT,                 -- SHA-256 of original file
  status          TEXT DEFAULT 'pending'
                  CHECK(status IN ('pending','uploaded','failed','too_large')),
  retry_count     INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id)
);

CREATE INDEX IF NOT EXISTS idx_photos_inspection
  ON inspection_photos(inspection_id, status);
```

### `sync_queue`

```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id              TEXT PRIMARY KEY,   -- client UUID
  entity_type     TEXT NOT NULL       -- 'inspection' | 'action'
                  CHECK(entity_type IN ('inspection','action')),
  entity_id       TEXT NOT NULL,      -- FK to inspections.id or assignment_actions.id
  priority        INTEGER DEFAULT 10, -- lower = higher priority (actions=1, inspections=10)
  status          TEXT DEFAULT 'pending'
                  CHECK(status IN ('pending','processing','done','failed')),
  retry_count     INTEGER DEFAULT 0,
  next_retry_at   TEXT,
  last_error      TEXT,
  enqueued_at     TEXT NOT NULL,
  processed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_eligible
  ON sync_queue(status, priority, next_retry_at, enqueued_at);
```

### `audit_log`

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id            TEXT PRIMARY KEY,
  event_type    TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  metadata      TEXT,               -- JSON, no PII, no bodies, no tokens
  occurred_at   TEXT NOT NULL
);
```

---

## 3. Connectivity Layer — Monitor & Probe

The connectivity layer provides the authoritative `isOnline` signal used by the entire application. It combines passive OS-level events with active reachability probing.

### ConnectivityMonitor Logic

```
ConnectivityMonitor:

  PROPERTIES:
    isOnline: boolean = false
    networkQuality: 'good' | 'slow' | 'offline' = 'offline'
    listeners: Set<(isOnline, quality) => void>
    probeTimer: Timer | null
    probeInProgress: boolean = false

  ON INIT:
    SUBSCRIBE to platform NetInfo / Network events
    RUN initialProbe()

  ON platform event (online transition detected):
    IF probeInProgress: RETURN
    RUN scheduleProbe(delay = 1000ms)  -- small debounce

  ON platform event (offline detected):
    CANCEL pending probe timer
    SET isOnline = false
    SET networkQuality = 'offline'
    NOTIFY all listeners

  FUNCTION initialProbe():
    result = await runProbe()
    SET isOnline = result.success
    SET networkQuality = result.quality
    NOTIFY all listeners

  FUNCTION runProbe():
    SET probeInProgress = true
    TRY:
      startTime = Date.now()
      response = await GET /health (timeout: 5000ms, no auth header, no retry)
      duration = Date.now() - startTime
      IF response.status === 200:
        quality = duration > 3000 ? 'slow' : 'good'
        RETURN { success: true, quality }
      ELSE:
        RETURN { success: false, quality: 'offline' }
    CATCH:
      RETURN { success: false, quality: 'offline' }
    FINALLY:
      SET probeInProgress = false

  FUNCTION scheduleProbe(delay):
    CLEAR probeTimer
    probeTimer = setTimeout(async () => {
      result = await runProbe()
      IF result.success AND NOT isOnline:
        SET isOnline = true
        SET networkQuality = result.quality
        NOTIFY all listeners
        TRIGGER runSync()
      ELSE IF NOT result.success AND isOnline:
        SET isOnline = false
        SET networkQuality = 'offline'
        NOTIFY all listeners
      ELSE IF result.quality !== networkQuality:
        SET networkQuality = result.quality
        NOTIFY all listeners  -- quality change only
    }, delay)
```

---

## 4. Assignments List — Online Fetch & Offline Cache

*(Lines 28-65)*

The assignments list screen is the entry point of the offline flow. Its behavior is fully bifurcated based on connectivity state at mount time.

### Screen Mount Logic

```
AssignmentsListScreen.onMount():

  isOnline = ConnectivityMonitor.isOnline

  IF isOnline:
    SHOW loading skeleton
    result = await AssignmentService.fetchAndSeed()
    IF result.success:
      assignments = await SQLite.query(
        "SELECT * FROM assignments_cache ORDER BY cached_at DESC"
      )
      RENDER list with fresh data
    ELSE:
      LOG error
      FALLBACK to offline path

  IF NOT isOnline (or fallback):
    assignments = await SQLite.query(
      "SELECT * FROM assignments_cache
       WHERE server_deleted = 0
       ORDER BY cached_at DESC"
    )
    RENDER list from cache
    SHOW OfflineBanner (state: 'offline')
    SHOW manual "Sync Now" button

  SUBSCRIBE to ConnectivityMonitor
  ON isOnline transition to true:
    CALL runSync()
    REFRESH list from SQLite after sync completes
```

### AssignmentService.fetchAndSeed()

```
fetchAndSeed():

  TRY:
    response = await ApiClient.get('/assignments')
    assignments = response.data

    WITHIN SQLite transaction:
      FOR EACH assignment in assignments:
        existing = SQLite.get('assignments_cache', assignment.id)

        IF existing AND existing.pending_acceptance = 1:
          -- Do NOT overwrite local optimistic state
          -- Only update non-status fields (name, address, etc.)
          SQLite.update('assignments_cache', assignment.id, {
            raw_json: merge(existing.raw_json, assignment, preserveLocalStatus: true),
            schema_snapshot: assignment.schema,
            schema_version: assignment.schemaVersion,
            cached_at: NOW()
          })
        ELSE:
          SQLite.upsert('assignments_cache', {
            id: assignment.id,
            raw_json: JSON.stringify(assignment),
            schema_snapshot: JSON.stringify(assignment.schema),
            schema_version: assignment.schemaVersion,
            status: assignment.status,
            cached_at: NOW(),
            expires_at: NOW() + 24h
          })

    RETURN { success: true }

  CATCH error:
    classified = ErrorHandler.handle(error)
    RETURN { success: false, error: classified }
```

### Badge State Derivation

Each assignment row derives its badge from the SQLite record, not the API:

```
deriveBadgeState(assignment):

  IF assignment.conflict_flag = 1:
    RETURN { type: 'conflict', label: 'Conflict', icon: 'warning', color: 'amber' }

  IF assignment.server_deleted = 1:
    RETURN { type: 'deleted', label: 'Removed', color: 'gray' }

  IF assignment.pending_acceptance = 1:
    RETURN { type: 'pending', label: 'Sync Pending', color: 'blue' }

  SWITCH assignment.status:
    'available' => { type: 'available', label: 'New',      color: 'green' }
    'accepted'  => { type: 'accepted',  label: 'Accepted', color: 'teal' }
    'rejected'  => { type: 'rejected',  label: 'Rejected', color: 'red' }
```

---

## 5. Assignment Detail — Schema Snapshot & CTA Bootstrap

*(Lines 36-47)*

The assignment detail screen must be able to bootstrap the inspection form even when offline. This is only possible if the schema was cached during the last online session.

### Detail Screen Load Logic

```
AssignmentDetailScreen.onMount(assignmentId):

  record = await SQLite.get('assignments_cache', assignmentId)

  IF record IS NULL:
    SHOW error: "Assignment not found"
    RETURN

  -- Attempt live refresh if online
  IF ConnectivityMonitor.isOnline:
    freshResult = await ApiClient.get('/assignments/' + assignmentId)
    IF freshResult.success:
      UPDATE SQLite record with fresh data and schema
      record = freshResult.data

  -- Derive CTA availability
  hasSchema = record.schema_snapshot IS NOT NULL
  hasPendingInspection = SQLite.exists(
    "SELECT id FROM inspections
     WHERE assignment_id = ? AND status IN ('draft','submitted')",
    assignmentId
  )

  IF NOT hasSchema AND NOT ConnectivityMonitor.isOnline:
    SHOW MissingSchemaOfflineState    -- See Section 12
    DISABLE start inspection CTA
    RETURN

  IF hasPendingInspection:
    SHOW "Continue Inspection" CTA -> navigate to InspectionFormScreen
  ELSE:
    SHOW "Start Inspection" CTA -> CREATE new inspection, navigate to form
```

### Schema Snapshot Versioning

When the server updates a schema, the version number increments. When an inspection is started, the schema version is locked to the inspection record.

```
bootstrapInspection(assignmentId):

  assignment = SQLite.get('assignments_cache', assignmentId)
  schema = JSON.parse(assignment.schema_snapshot)

  -- Check for existing draft
  existingDraft = SQLite.getFirst(
    "SELECT * FROM inspections
     WHERE assignment_id = ? AND status = 'draft'",
    assignmentId
  )

  IF existingDraft:
    IF existingDraft.schema_version !== assignment.schema_version:
      SHOW warning: "Form has been updated. Some fields may have changed."
      -- Do not discard draft, let user decide
    RETURN existingDraft

  -- Create new inspection
  newInspection = {
    id: UUID(),
    assignment_id: assignmentId,
    form_data: initializeFormData(schema),
    schema_version: assignment.schema_version,
    status: 'draft',
    created_at: NOW(),
    updated_at: NOW()
  }

  SQLite.insert('inspections', newInspection)
  RETURN newInspection
```

---

## 6. Accept / Reject — Optimistic Queue & Replay

*(Lines 42-47)*

Accept and reject actions must feel instant to the user regardless of connectivity. The system applies the action locally first, then syncs when possible.

### Action Execution Logic

```
AssignmentService.performAction(assignmentId, actionType):
  -- actionType: 'accept' | 'reject'

  WITHIN SQLite transaction:
    -- 1. Optimistically update local state
    SQLite.update('assignments_cache', assignmentId, {
      status: actionType === 'accept' ? 'accepted' : 'rejected',
      pending_acceptance: 1
    })

    -- 2. Record the action for replay
    actionId = UUID()
    SQLite.insert('assignment_actions', {
      id: actionId,
      assignment_id: assignmentId,
      action_type: actionType,
      payload: JSON.stringify({ assignmentId }),
      created_at: NOW(),
      status: 'pending'
    })

    -- 3. Enqueue with high priority (priority = 1)
    SQLite.insert('sync_queue', {
      id: UUID(),
      entity_type: 'action',
      entity_id: actionId,
      priority: 1,
      status: 'pending',
      enqueued_at: NOW()
    })

  -- 4. Attempt immediate sync if online
  IF ConnectivityMonitor.isOnline:
    runSync()  -- non-blocking, fire and forget

  RETURN { success: true, optimistic: true }
```

### Action Replay in Sync Engine

```
syncAssignmentActions(actions):

  allSucceeded = true

  FOR EACH action in actions (ordered by created_at ASC):
    endpoint = action.action_type === 'accept'
      ? POST /assignments/{id}/accept
      : POST /assignments/{id}/reject

    result = await ApiClient.post(endpoint, action.payload)

    IF result.success:
      WITHIN SQLite transaction:
        SQLite.update('assignment_actions', action.id, {
          status: 'synced', attempted_at: NOW()
        })
        SQLite.update('assignments_cache', action.assignment_id, {
          pending_acceptance: 0
        })
        SQLite.delete('sync_queue WHERE entity_id = ?', action.id)

    ELSE IF result.error.code === 'NOT_FOUND':
      -- Assignment no longer exists server-side
      SQLite.update('assignment_actions', action.id, {
        status: 'failed', error_code: 'NOT_FOUND'
      })
      SQLite.update('assignments_cache', action.assignment_id, {
        server_deleted: 1, pending_acceptance: 0
      })
      SQLite.delete('sync_queue WHERE entity_id = ?', action.id)

    ELSE IF result.error.code === 'CONFLICT':
      -- Action already applied server-side, treat as success
      SQLite.update('assignment_actions', action.id, { status: 'synced' })
      SQLite.update('assignments_cache', action.assignment_id, {
        pending_acceptance: 0
      })

    ELSE:
      -- Transient failure: increment retry, keep in queue
      SQLite.update('assignment_actions', action.id, {
        attempt_count: action.attempt_count + 1,
        attempted_at: NOW()
      })
      allSucceeded = false

  RETURN { allSucceeded }
  -- allSucceeded = false -> NetworkStore sets syncErrorBadge = true
```

---

## 7. Inspection Form — Data Entry, Photos & Immediate Persistence

*(Lines 48-54)*

The inspection form must never lose data. Every field change is written to SQLite immediately. Photos are saved to the filesystem and indexed in `inspection_photos` before control returns to the user.

### Field Change Handler

```
InspectionFormService.updateField(inspectionId, fieldKey, value):

  -- 300ms debounce per field, immediate flush on blur
  DEBOUNCED:
    WITHIN SQLite transaction:
      inspection = SQLite.get('inspections', inspectionId)
      formData = JSON.parse(inspection.form_data)
      formData[fieldKey] = value
      SQLite.update('inspections', inspectionId, {
        form_data: JSON.stringify(formData),
        updated_at: NOW()
      })
```

### Photo Save Handler

```
InspectionFormService.savePhoto(inspectionId, fieldKey, fileUri):

  TRY:
    -- 1. Read file and compute checksum
    fileBuffer = await readFile(fileUri)
    checksum = SHA256(fileBuffer)
    mimeType = detectMimeType(fileBuffer)
    fileSizeBytes = fileBuffer.length

    -- 2. Validate size before saving
    IF fileSizeBytes > MAX_PHOTO_BYTES:
      RETURN { success: false, error: 'FILE_TOO_LARGE' }

    -- 3. Encrypt and write to app-sandboxed directory
    encryptedBuffer = encrypt(fileBuffer, deviceKey)
    localPath = appDirectory + '/photos/' + UUID() + '.enc'
    await writeFile(localPath, encryptedBuffer)

    -- 4. Record in SQLite atomically
    photoId = UUID()
    WITHIN SQLite transaction:
      SQLite.insert('inspection_photos', {
        id: photoId,
        inspection_id: inspectionId,
        field_key: fieldKey,
        local_path: localPath,
        mime_type: mimeType,
        file_size_bytes: fileSizeBytes,
        checksum: checksum,
        status: 'pending',
        created_at: NOW()
      })
      inspection = SQLite.get('inspections', inspectionId)
      formData = JSON.parse(inspection.form_data)
      formData[fieldKey] = { photoId, localPath, status: 'pending' }
      SQLite.update('inspections', inspectionId, {
        form_data: JSON.stringify(formData),
        updated_at: NOW()
      })

    RETURN { success: true, photoId, localPath }

  CATCH error:
    LOG audit_log: { event_type: 'PHOTO_SAVE_ERROR', entity_id: inspectionId }
    RETURN { success: false, error: 'SAVE_FAILED' }
```

---

## 8. Submission & Sync Queue Entry

*(Lines 55-64)*

Submission marks an inspection as ready for server delivery. It does not send anything to the network directly — it delegates entirely to the sync engine.

### Submission Logic

```
InspectionService.submit(inspectionId):

  inspection = SQLite.get('inspections', inspectionId)

  -- Validate all required fields against schema
  assignment = SQLite.get('assignments_cache', inspection.assignment_id)
  schema = JSON.parse(assignment.schema_snapshot)
  validationResult = validateFormData(inspection.form_data, schema)

  IF NOT validationResult.valid:
    RETURN { success: false, errors: validationResult.errors }

  WITHIN SQLite transaction:
    SQLite.update('inspections', inspectionId, {
      status: 'submitted',
      updated_at: NOW()
    })
    SQLite.insert('sync_queue', {
      id: UUID(),
      entity_type: 'inspection',
      entity_id: inspectionId,
      priority: 10,
      status: 'pending',
      enqueued_at: NOW()
    })

  SHOW toast: "Inspection saved. Will submit when online."

  IF ConnectivityMonitor.isOnline:
    runSync()  -- non-blocking

  RETURN { success: true }
```

---

## 9. Sync Engine — runSync() Full Orchestration

*(src/services/sync/syncEngine.ts lines 13-158)*

`runSync()` is the single function responsible for draining the `sync_queue`. It is called automatically on connectivity restore and manually via "Sync Now". It is idempotent and re-entrant safe.

### runSync() Master Orchestration

```
runSync():

  IF SyncEngine.isRunning:
    LOG: 'Sync already in progress, skipping'
    RETURN

  SET SyncEngine.isRunning = true
  NetworkStore.setSyncStatus('syncing')
  OfflineBanner.setState('syncing')

  TRY:
    -- 1. Verify connectivity with active probe
    probe = await ConnectivityMonitor.runProbe()
    IF NOT probe.success:
      THROW { code: 'NO_CONNECTIVITY' }

    -- 2. Ensure valid auth token
    tokenResult = await TokenManager.ensureValidToken()
    IF NOT tokenResult.success:
      THROW { code: 'AUTH_FAILURE' }

    -- 3. Adjust batch size based on network quality
    batchSize = probe.quality === 'slow' ? 1 : 5

    -- 4. Phase 1: Process assignment actions (priority = 1, always first)
    actionQueueItems = SQLite.query(`
      SELECT sq.*, aa.*
      FROM sync_queue sq
      JOIN assignment_actions aa ON aa.id = sq.entity_id
      WHERE sq.entity_type = 'action'
        AND sq.status = 'pending'
        AND (sq.next_retry_at IS NULL OR sq.next_retry_at <= datetime('now'))
      ORDER BY sq.priority ASC, sq.enqueued_at ASC
    `)

    actionResult = await syncAssignmentActions(actionQueueItems)
    IF NOT actionResult.allSucceeded:
      NetworkStore.setSyncErrorBadge(true)

    -- 5. Phase 2: Upload pending photos (skip on slow network)
    IF probe.quality !== 'slow':
      photoItems = SQLite.query(`
        SELECT ip.*, i.assignment_id
        FROM inspection_photos ip
        JOIN inspections i ON i.id = ip.inspection_id
        WHERE ip.status = 'pending'
          AND i.status IN ('submitted', 'syncing')
        ORDER BY ip.created_at ASC
      `)
      FOR EACH photo in photoItems:
        await syncPhoto(photo)

    -- 6. Phase 3: Submit inspection payloads
    inspectionQueueItems = SQLite.query(`
      SELECT sq.*, i.*
      FROM sync_queue sq
      JOIN inspections i ON i.id = sq.entity_id
      WHERE sq.entity_type = 'inspection'
        AND sq.status = 'pending'
        AND (sq.next_retry_at IS NULL OR sq.next_retry_at <= datetime('now'))
      ORDER BY sq.enqueued_at ASC
      LIMIT ?
    `, batchSize)

    FOR EACH item in inspectionQueueItems:
      await syncInspection(item)

    -- 7. Check if queue is now empty
    remainingCount = SQLite.count(
      "SELECT COUNT(*) FROM sync_queue WHERE status = 'pending'"
    )

    IF remainingCount > 0:
      setTimeout(() => runSync(), 1000)  -- process next batch
    ELSE:
      NetworkStore.setSyncStatus('synced')
      OfflineBanner.setState('all_synced')
      NetworkStore.setLastSyncedAt(NOW())
      EMIT syncComplete

  CATCH error:
    IF error.code === 'NO_CONNECTIVITY':
      OfflineBanner.setState('offline')
    ELSE IF error.code === 'AUTH_FAILURE':
      NetworkStore.setSyncStatus('auth_error')
      DISPATCH authFailure to app state
    ELSE:
      NetworkStore.setSyncStatus('error')
      LOG audit_log: { event_type: 'SYNC_CYCLE_ERROR', metadata: { code: error.code } }

  FINALLY:
    SET SyncEngine.isRunning = false
```

### syncPhoto(photo)

```
syncPhoto(photo):

  TRY:
    encryptedBuffer = await readFile(photo.local_path)
    fileBuffer = decrypt(encryptedBuffer, deviceKey)

    -- Verify checksum integrity before transmitting
    computedChecksum = SHA256(fileBuffer)
    IF computedChecksum !== photo.checksum:
      THROW { code: 'INTEGRITY_ERROR' }

    result = await ApiClient.post('/photos/upload', {
      file: fileBuffer,
      mimeType: photo.mime_type,
      inspectionId: photo.inspection_id,
      fieldKey: photo.field_key,
      clientPhotoId: photo.id
    })

    IF result.success:
      WITHIN SQLite transaction:
        SQLite.update('inspection_photos', photo.id, {
          status: 'uploaded',
          remote_url: result.data.url
        })
        -- Replace local path reference in form_data with remote URL
        inspection = SQLite.get('inspections', photo.inspection_id)
        formData = JSON.parse(inspection.form_data)
        formData[photo.field_key] = {
          photoId: photo.id,
          remoteUrl: result.data.url,
          status: 'uploaded'
        }
        SQLite.update('inspections', photo.inspection_id, {
          form_data: JSON.stringify(formData),
          updated_at: NOW()
        })

    ELSE IF result.error.httpStatus === 413:
      SQLite.update('inspection_photos', photo.id, { status: 'too_large' })
      markInspectionFailed(photo.inspection_id, 'PHOTO_TOO_LARGE')

    ELSE IF result.error.retryable:
      IF photo.retry_count >= 3:
        SQLite.update('inspection_photos', photo.id, { status: 'failed' })
        markInspectionFailed(photo.inspection_id, 'PHOTO_UPLOAD_FAILED')
      ELSE:
        SQLite.update('inspection_photos', photo.id, {
          retry_count: photo.retry_count + 1
        })

    ELSE:
      SQLite.update('inspection_photos', photo.id, { status: 'failed' })
      markInspectionFailed(photo.inspection_id, 'PHOTO_UPLOAD_ERROR')

  CATCH { code: 'INTEGRITY_ERROR' }:
    LOG security event: { event_type: 'PHOTO_INTEGRITY_FAILURE', entity_id: photo.id }
    SQLite.update('inspection_photos', photo.id, { status: 'failed' })
    markInspectionFailed(photo.inspection_id, 'PHOTO_INTEGRITY_ERROR')
```

### syncInspection(item)

```
syncInspection(item):

  -- Block submission if photos still pending
  pendingPhotos = SQLite.count(
    "SELECT COUNT(*) FROM inspection_photos
     WHERE inspection_id = ? AND status = 'pending'", item.id
  )
  IF pendingPhotos > 0:
    LOG: 'Inspection blocked, photos pending', item.id
    RETURN

  failedPhotos = SQLite.count(
    "SELECT COUNT(*) FROM inspection_photos
     WHERE inspection_id = ? AND status IN ('failed','too_large')", item.id
  )
  IF failedPhotos > 0:
    markInspectionFailed(item.id, 'PHOTO_UPLOAD_FAILED')
    RETURN

  -- Build payload — form_data already has remote URLs substituted by syncPhoto
  payload = {
    clientInspectionId: item.id,
    assignmentId: item.assignment_id,
    formData: JSON.parse(item.form_data),
    schemaVersion: item.schema_version,
    submittedAt: item.updated_at
  }

  SQLite.update('inspections', item.id, { status: 'syncing' })
  SQLite.update('sync_queue WHERE entity_id = ?', item.id, { status: 'processing' })

  result = await ApiClient.post('/inspections', payload, {
    headers: { 'X-Idempotency-Key': item.id }
  })

  IF result.success:
    WITHIN SQLite transaction:
      SQLite.update('inspections', item.id, {
        status: 'synced', synced_at: NOW()
      })
      SQLite.update('sync_queue WHERE entity_id = ?', item.id, {
        status: 'done', processed_at: NOW()
      })
    SCHEDULE deferred cleanup: delete encrypted photo blobs after 48h

  ELSE IF result.error.httpStatus === 409:
    SQLite.update('inspections', item.id, {
      status: 'conflict', conflict_flag: 1
    })
    SQLite.update('assignments_cache', item.assignment_id, { conflict_flag: 1 })
    SQLite.update('sync_queue WHERE entity_id = ?', item.id, {
      status: 'failed', last_error: 'CONFLICT'
    })
    NetworkStore.incrementConflictCount()

  ELSE IF result.error.httpStatus === 404:
    SQLite.update('inspections', item.id, {
      status: 'failed', server_deleted: 1
    })
    SQLite.update('sync_queue WHERE entity_id = ?', item.id, {
      status: 'failed', last_error: 'ASSIGNMENT_NOT_FOUND'
    })
    -- server_deleted = 1: never retried

  ELSE IF result.error.retryable:
    newRetryCount = item.retry_count + 1
    IF newRetryCount >= 5:
      markInspectionFailed(item.id, result.error.code)
    ELSE:
      backoffSeconds = [30, 120, 600, 1800][newRetryCount - 1] ?? 1800
      SQLite.update('inspections', item.id, {
        status: 'submitted',
        retry_count: newRetryCount,
        next_retry_at: NOW() + backoffSeconds,
        last_attempted_at: NOW()
      })
      SQLite.update('sync_queue WHERE entity_id = ?', item.id, {
        status: 'pending',
        retry_count: newRetryCount,
        next_retry_at: NOW() + backoffSeconds,
        last_error: result.error.code
      })
    NetworkStore.setSyncErrorBadge(true)

  ELSE:
    markInspectionFailed(item.id, result.error.code)
    NetworkStore.setSyncErrorBadge(true)


markInspectionFailed(inspectionId, reason):
  SQLite.update('inspections', inspectionId, {
    status: 'failed', updated_at: NOW()
  })
  SQLite.update('sync_queue WHERE entity_id = ?', inspectionId, {
    status: 'failed', last_error: reason
  })
  LOG audit_log: {
    event_type: 'INSPECTION_SYNC_FAILED',
    entity_id: inspectionId,
    metadata: { reason }
  }
  NetworkStore.setSyncErrorBadge(true)
```

---

## 10. API Client — Authenticated Axios Wrapper

*(src/services/api/apiClient.ts lines 1-116)*

The API client is the only point of contact between the application and the network. All requests flow through it without exception.

### ApiClient Request Interceptor

```
REQUEST INTERCEPTOR (applied to every outgoing request):

  1. Read access token from secure storage
  2. IF token missing: THROW AppException('NO_AUTH_TOKEN')
  3. ATTACH: Authorization: Bearer <token>
  4. ATTACH: X-Request-ID: UUID()
  5. ATTACH: X-Client-Version: appVersion
  6. IF config.idempotencyKey provided:
       ATTACH: X-Idempotency-Key: config.idempotencyKey
  7. SET timeout per request type:
       auth requests:    10,000ms
       media uploads:    60,000ms
       all others:       30,000ms
```

### ApiClient Response Interceptor

```
RESPONSE INTERCEPTOR - SUCCESS (2xx):

  1. Validate response envelope:
     expected shape: { success: true, data: {...} }
     IF shape invalid: THROW AppException('INVALID_RESPONSE_SHAPE')
     NOTE: INVALID_RESPONSE_SHAPE is non-retryable — malformed payload
           must NOT enter the offline retry queue
  2. RETURN response.data

RESPONSE INTERCEPTOR - ERROR:

  IF Axios ECONNABORTED (timeout):
    THROW AppException('TIMEOUT', retryable: true)

  IF no response received (network error):
    THROW AppException('NETWORK_ERROR', retryable: true)

  IF SSL / certificate error:
    LOG security audit event
    THROW AppException('SSL_ERROR', retryable: false)

  IF response.status === 401:
    IF request.meta.refreshAttempted === true:
      THROW AppException('AUTH_EXPIRED', retryable: false)
    tokenResult = await TokenManager.refresh()
    IF tokenResult.success:
      SET request.meta.refreshAttempted = true
      RETRY original request with new token
    ELSE:
      THROW AppException('AUTH_EXPIRED', retryable: false)

  SWITCH response.status:
    400  => THROW AppException('BAD_REQUEST',       retryable: false)
    403  => THROW AppException('FORBIDDEN',         retryable: false)
    404  => THROW AppException('NOT_FOUND',         retryable: false)
    409  => THROW AppException('CONFLICT',          retryable: false, detail: response.data)
    413  => THROW AppException('PAYLOAD_TOO_LARGE', retryable: false)
    422  => THROW AppException('VALIDATION_ERROR',  retryable: false, detail: response.data.errors)
    429  => THROW AppException('RATE_LIMITED',      retryable: true)
    500  => THROW AppException('SERVER_ERROR',      retryable: true)
    502,
    503,
    504  => THROW AppException('SERVER_UNAVAILABLE',retryable: true)
    DEFAULT => THROW AppException('UNKNOWN_ERROR',  retryable: false)


AppException shape:
{
  code:        string,          -- e.g. 'NETWORK_ERROR', 'CONFLICT'
  httpStatus:  number | null,
  retryable:   boolean,
  userMessage: string,          -- human-readable, no internals
  detail:      any | null       -- server error body (never logged)
}
```

### Token Manager

```
TokenManager.ensureValidToken():

  token = readFromSecureStorage('accessToken')
  expiry = readFromSecureStorage('accessTokenExpiry')

  IF token AND expiry > NOW() + 60s:
    RETURN { success: true }   -- valid, no refresh needed

  RETURN await TokenManager.refresh()


TokenManager.refresh():

  -- Prevent stampede: only one refresh in flight at a time
  IF TokenManager.refreshInProgress:
    AWAIT TokenManager.refreshPromise
    RETURN TokenManager.lastRefreshResult

  SET TokenManager.refreshInProgress = true
  TokenManager.refreshPromise = (async () => {
    TRY:
      refreshToken = readFromSecureStorage('refreshToken')
      IF NOT refreshToken:
        RETURN { success: false, reason: 'NO_REFRESH_TOKEN' }

      response = await axios.post('/auth/refresh',
        { refreshToken },
        { timeout: 10000 }  -- no auth header on refresh request
      )

      WRITE response.data.accessToken to secure storage
      WRITE response.data.refreshToken to secure storage (if rotated)
      WRITE response.data.expiresAt to secure storage

      RETURN { success: true }

    CATCH error:
      classified = ErrorHandler.handle(error)
      IF classified.code === 'NETWORK_ERROR' OR 'TIMEOUT':
        RETURN { success: false, reason: 'NETWORK_ERROR' }
        -- Network failure: do NOT log out user
      ELSE:
        CLEAR all tokens from secure storage
        RETURN { success: false, reason: 'REFRESH_TOKEN_INVALID' }
        -- Token rejected: force re-auth

    FINALLY:
      SET TokenManager.refreshInProgress = false
  })()

  TokenManager.lastRefreshResult = await TokenManager.refreshPromise
  RETURN TokenManager.lastRefreshResult
```

---

## 11. Error Handler — Mapping & Redacted Logging

*(src/utils/errorHandler.ts lines 1-118)*

The error handler is the centralized mapping layer between raw Axios/network errors and typed `AppException` objects.

### ErrorHandler.handle(error)

```
ErrorHandler.handle(rawError):

  IF rawError instanceof AppException:
    logRedactedDiagnostic(rawError)
    RETURN rawError

  IF rawError.code === 'ERR_NETWORK' OR message === 'Network Error':
    exception = AppException('NETWORK_ERROR', null, retryable: true,
      userMessage: "No internet connection. Your data is saved.")
    logRedactedDiagnostic(exception)
    RETURN exception

  IF rawError.code === 'ECONNABORTED':
    exception = AppException('TIMEOUT', null, retryable: true,
      userMessage: "Request timed out. Will retry automatically.")
    logRedactedDiagnostic(exception)
    RETURN exception

  IF rawError.code CONTAINS 'CERT' OR 'SSL':
    exception = AppException('SSL_ERROR', null, retryable: false,
      userMessage: "Secure connection failed. Check your network.")
    logSecurityEvent(exception)
    RETURN exception

  IF rawError.response:
    exception = mapHttpStatus(rawError.response.status, rawError.response.data)
    logRedactedDiagnostic(exception)
    RETURN exception

  exception = AppException('UNKNOWN_ERROR', null, retryable: false,
    userMessage: "An unexpected error occurred.")
  logRedactedDiagnostic(exception)
  RETURN exception


logRedactedDiagnostic(exception):
  SQLite.insert('audit_log', {
    id: UUID(),
    event_type: 'API_ERROR',
    metadata: JSON.stringify({
      code:         exception.code,
      http_status:  exception.httpStatus,
      retryable:    exception.retryable,
      request_id:   currentRequest?.headers['X-Request-ID'],
      endpoint:     currentRequest?.url,   -- path only, no query params
      method:       currentRequest?.method,
      duration_ms:  elapsed,
      network_type: ConnectivityMonitor.networkType,
      app_version:  appVersion
      -- NEVER INCLUDE: response body, request body, tokens, user data, PII
    }),
    occurred_at: NOW()
  })
```

---

## 12. User-Facing Error States & UI Surfaces

*(Lines 102-149)*

### OfflineBanner State Machine

*(Lines 102-124)*

```
States:
  'hidden'
    | (isOnline = false)
    v
  'offline'       "You're offline. Changes will sync when you reconnect."
                  [amber background] [wifi-off icon]
                  [optional: "Sync Now" button if pendingCount > 0]
    | (isOnline = true, runSync triggered)
    v
  'syncing'       "Syncing your changes..."
                  [blue background] [spinner icon]
                  [progress: "X of Y items" if pendingCount > 1]
    | (sync_queue drained)
    v
  'all_synced'    "All changes synced"
                  [green background] [check icon]
                  [auto-dismiss after 3 seconds]
    v
  'hidden'

PARALLEL ERROR STATE (any state -> error):
  'sync_error'    "Sync error. Some items couldn't be submitted."
                  [red background] [alert icon]
                  [action: "View Details" -> PendingSubmissionsScreen]
  triggers when: NetworkStore.syncErrorBadge = true

RECOVERY:
  'sync_error' -> 'syncing' when manual retry is initiated
  'sync_error' -> 'all_synced' when all errors are resolved
```

### MissingSchemaOfflineState

*(Lines 135-149)*

```
Renders when:
  assignment.schema_snapshot IS NULL
  AND ConnectivityMonitor.isOnline = false

UI Elements:
  Icon:    cloud-off (48px, muted gray)
  Title:   "Form unavailable offline"
  Body:    "You need to connect to the internet at least once to
            download this inspection form before you can use it offline."

  If draft inspection exists for this assignment:
    Note:  "You have an unfinished inspection. Connect to continue."

  CTA (offline):
    "Will load when you reconnect"  [disabled, ghost style]

  CTA (online but schema failed):
    "Retry Loading Form"  [primary]  -> retry fetchAndSeed()
```

### Pending Submissions Screen

```
Sections:

1. "Sync Errors"  (inspections.status = 'failed')
   Per row:
     - Assignment name + inspection ID (truncated)
     - Created timestamp
     - Failure reason (human-mapped from last_error field)
     - Buttons:
         "Retry"           -> reset retry_count=0, next_retry_at=NULL, runSync()
         "Edit & Resubmit" -> (if CLIENT_ERROR) open InspectionFormScreen
         "Discard"         -> confirm dialog -> delete from inspections + sync_queue

2. "Waiting to Sync"  (inspections.status IN ['submitted','syncing'])
   Per row:
     - Assignment name
     - "Will sync automatically when online"
     - "Retry X of 5" indicator if retry_count > 0

3. "Pending Actions"  (assignment_actions.status = 'pending')
   Per row:
     - Assignment name
     - Action type label: "Accepted" / "Rejected"
     - "Will sync automatically"
     - Warning icon if attempt_count > 0
```

---

## 13. Conflict Resolution Screen

*(Lines 125-132)*

### ConflictResolutionScreen Logic

```
ConflictResolutionScreen(inspectionId):

  ON MOUNT:
    localInspection = SQLite.get('inspections', inspectionId)
    localFormData = JSON.parse(localInspection.form_data)

    IF NOT ConnectivityMonitor.isOnline:
      SHOW: "Connect to the internet to resolve this conflict."
      DISABLE all resolution actions
      RETURN

    serverResult = await ApiClient.get('/inspections/' + inspectionId + '/conflict')
    IF serverResult.success:
      serverFormData = serverResult.data.formData
      conflictFields = diffFormData(localFormData, serverFormData)
      RENDER: side-by-side comparison for each differing field
    ELSE:
      SHOW error: "Could not load server version. Try again."
      RETURN

  USER ACTIONS:

  "Keep My Version":
    SQLite.update('inspections', inspectionId, {
      conflict_flag: 0,
      status: 'submitted',
      retry_count: 0,
      next_retry_at: NULL
    })
    SQLite.update('assignments_cache', assignment_id, { conflict_flag: 0 })
    SQLite.upsert('sync_queue', {
      entity_id: inspectionId,
      status: 'pending',
      last_error: NULL,
      next_retry_at: NULL
    })
    NetworkStore.decrementConflictCount()
    runSync()

  "Use Server Version":
    SQLite.update('inspections', inspectionId, {
      status: 'synced',
      form_data: JSON.stringify(serverFormData),
      conflict_flag: 0,
      synced_at: NOW()
    })
    SQLite.update('assignments_cache', assignment_id, { conflict_flag: 0 })
    SQLite.delete('sync_queue WHERE entity_id = ?', inspectionId)
    NetworkStore.decrementConflictCount()

  "Edit Before Submitting":
    Navigate to InspectionFormScreen (pre-populated with local data)
    Conflict flag remains set until user re-submits successfully
```

---

## 14. Network Store — Global Sync State

```
NetworkStore shape:

  STATE:
    isOnline:         boolean
    networkQuality:   'good' | 'slow' | 'offline'
    syncStatus:       'idle' | 'syncing' | 'synced' | 'error' | 'auth_error'
    syncErrorBadge:   boolean       -- true if any item failed
    conflictCount:    number        -- unresolved conflicts
    pendingCount:     number        -- items in sync_queue with status 'pending'
    lastSyncedAt:     string | null -- ISO-8601

  ACTIONS:
    setOnlineStatus(isOnline, quality)  -- called by ConnectivityMonitor
    setSyncStatus(status)               -- called by SyncEngine
    setSyncErrorBadge(value: boolean)   -- called by SyncEngine on failure
    incrementConflictCount()            -- called on 409 detection
    decrementConflictCount()            -- called on conflict resolution
    refreshPendingCount()               -- re-queries SQLite sync_queue
    setLastSyncedAt(timestamp)          -- called on successful sync complete

  SUBSCRIPTIONS:
    ConnectivityMonitor.onChange    -> setOnlineStatus
    SyncEngine.onSyncComplete       -> setLastSyncedAt, refreshPendingCount
    SyncEngine.onSyncError          -> setSyncErrorBadge(true)
    SyncEngine.onConflict           -> incrementConflictCount
```

---

## 15. End-to-End Scenario Walkthroughs

### Scenario A — Full Offline Session (No Connection Throughout)

1. App opens. Probe to `/health` fails. `isOnline = false`.
2. `AssignmentsListScreen` renders from SQLite cache. `OfflineBanner` shows "offline".
3. User taps assignment. Detail loaded from `assignments_cache`. Schema found.
4. User taps "Accept". `performAction()` writes atomically: `assignment_actions` record + `sync_queue` entry (priority=1). Optimistic badge shows "Accepted + Sync Pending".
5. User taps "Start Inspection". `bootstrapInspection()` creates `inspections` record using `schema_snapshot`.
6. User fills form. Each field written to SQLite via debounced `updateField()`.
7. User attaches photo. `savePhoto()` encrypts file, writes to filesystem, inserts `inspection_photos`.
8. User submits. `validateFormData()` passes. `inspections.status` = `submitted`. `sync_queue` entry created. Toast: "Saved. Will submit when online."
9. Device stays offline. Everything persists safely in SQLite.

### Scenario B — Connectivity Restores After Offline Work

1. Scenario A complete. Wi-Fi reconnects.
2. NetInfo event fires. `scheduleProbe()` runs after 1s debounce.
3. Probe succeeds (180ms). `isOnline = true`. `runSync()` triggered.
4. `OfflineBanner` transitions to "syncing".
5. `runSync()` acquires lock. Probes again (confirmed). Token valid.
6. **Phase 1 — Actions:** Accept action dequeued. `POST /assignments/{id}/accept` -> 200. `assignment_actions.status = synced`. `assignments_cache.pending_acceptance = 0`. Sync queue item deleted.
7. **Phase 2 — Photos:** Photo dequeued. File decrypted, checksum verified. `POST /photos/upload` -> 201. `inspection_photos.status = uploaded`. `form_data` field updated with `remoteUrl`.
8. **Phase 3 — Inspections:** Inspection dequeued. All photos confirmed `uploaded`. Payload built. `POST /inspections` with `X-Idempotency-Key` -> 201. `inspections.status = synced`. Cleanup scheduled.
9. Queue empty. `OfflineBanner` transitions to "all_synced". Dismissed after 3s.

### Scenario C — 409 Conflict Detected

1. `POST /inspections` returns 409.
2. `syncInspection()`: `inspections.status = conflict`, `conflict_flag = 1`. Queue item status = `failed`. `assignments_cache.conflict_flag = 1`.
3. `NetworkStore.incrementConflictCount()`. Assignment row shows warning badge.
4. `OfflineBanner` shows sync error: "View Details".
5. User taps warning badge -> `ConflictResolutionScreen`.
6. App fetches server version. Side-by-side diff rendered.
7. User selects "Keep My Version". Record re-queued. `runSync()` called.
8. Server accepts with `force_overwrite` -> 200. Conflict resolved. Badge removed.

### Scenario D — Photo Upload Exhausts Retries

1. Sync cycle. Photo upload: server returns 500. `retry_count` = 1.
2. Next cycle: 500 again. `retry_count` = 2.
3. Next cycle: 500 again. `retry_count` = 3 (limit). `inspection_photos.status = failed`.
4. `markInspectionFailed('PHOTO_UPLOAD_FAILED')`. Sync error badge set.
5. User opens `PendingSubmissionsScreen`. Sees "Photo upload failed".
6. User taps "Retry". `retry_count` and `inspection_photos.retry_count` both reset to 0. `runSync()` called.
7. Upload succeeds this time. Inspection proceeds to submission normally.

### Scenario E — Token Expires Mid-Sync

1. Sync cycle processing batch of 3 inspections.
2. First inspection submits successfully.
3. Token expires between records 1 and 2.
4. Record 2 submission returns 401.
5. `ApiClient` intercepts: calls `TokenManager.refresh()`.
6. Refresh succeeds. New token stored.
7. `ApiClient` replays record 2 request with new token. 201 returned.
8. Record 3 uses the new token directly. 201 returned.
9. User sees no interruption. All 3 records synced.

---

## 16. Implementation Checklist

### SQLite Schema
- [ ] All five tables created with `IF NOT EXISTS`
- [ ] Composite indexes: `(status, created_at)` on `inspections`, `(status, priority, next_retry_at, enqueued_at)` on `sync_queue`
- [ ] `meta` table tracks schema_version with migration support
- [ ] All multi-table writes use explicit SQLite transactions
- [ ] No request/response bodies, tokens, or PII written to any table

### ConnectivityMonitor
- [ ] Passive listener + active HTTP probe (two-stage)
- [ ] Probe timeout: 5 seconds, dedicated `/health` endpoint, no auth
- [ ] Failed probe re-probes after 15 seconds
- [ ] Slow network (>3s probe) reduces batch size to 1 and defers photo uploads
- [ ] `runSync()` triggered automatically on confirmed online transition only

### Assignments List (Lines 28-65)
- [ ] Online: fetches `/assignments`, seeds `assignments_cache` in transaction
- [ ] Offline: reads from SQLite with `server_deleted = 0` filter
- [ ] `pending_acceptance = 1` records never overwritten on re-seed
- [ ] Badge state derived from SQLite fields (conflict, deleted, pending, status)
- [ ] Manual "Sync Now" calls `runSync()` and refreshes list after completion

### Assignment Detail (Lines 36-47)
- [ ] Schema loaded from `assignments_cache.schema_snapshot`
- [ ] `MissingSchemaOfflineState` shown when `schema_snapshot IS NULL` and offline
- [ ] CTA disabled when no schema and offline
- [ ] Schema version locked to inspection record at creation time
- [ ] Schema version mismatch warns user without discarding draft

### Accept / Reject (Lines 42-47)
- [ ] Optimistic local update applied before any network call
- [ ] `assignment_actions` + `sync_queue` written atomically in one transaction
- [ ] Actions assigned `priority = 1` (always synced before inspections)
- [ ] 409 on action treated as success (idempotent)
- [ ] 404 on action sets `server_deleted = 1`, clears `pending_acceptance`
- [ ] `allSucceeded = false` triggers `syncErrorBadge` in NetworkStore

### Inspection Form (Lines 48-54)
- [ ] Field changes: debounced 300ms write to SQLite, immediate flush on blur
- [ ] Photos: checksum computed before encryption
- [ ] Photos: encrypted with device key before filesystem write
- [ ] Photos: size validated before saving (reject above MAX_PHOTO_BYTES)
- [ ] Photos: `inspection_photos` record and `form_data` update written atomically

### Submission & Queue (Lines 55-64)
- [ ] Local schema validation runs before status set to `submitted`
- [ ] `inspections` status update + `sync_queue` insert written atomically
- [ ] User confirmation shown immediately (not contingent on sync success)
- [ ] `runSync()` called non-blocking if online

### Sync Engine (syncEngine.ts lines 13-158)
- [ ] `isRunning` re-entrancy guard active
- [ ] Active connectivity probe before each cycle (not passive listener alone)
- [ ] Auth token ensured before cycle begins
- [ ] Batch size: 5 (good network), 1 (slow network)
- [ ] Phase order enforced: actions (priority=1) -> photos -> inspections
- [ ] Photos fully uploaded before inspection payload submitted
- [ ] `X-Idempotency-Key` header on all inspection POST requests
- [ ] 409 -> `conflict` status, removed from queue, conflict count incremented
- [ ] 404 -> `server_deleted = 1`, queue item deleted, never retried
- [ ] Retryable errors -> exponential backoff via `next_retry_at` (30s/2m/10m/30m)
- [ ] `retry_count >= 5` -> `PERMANENTLY_FAILED` via `markInspectionFailed()`
- [ ] `markInspectionFailed()` always writes to `audit_log`

### API Client (apiClient.ts lines 1-116)
- [ ] Single Axios instance, no direct `fetch` calls in business logic
- [ ] Bearer token injected by request interceptor on every request
- [ ] `X-Request-ID` UUID attached to every request
- [ ] Timeout values set per type (10s auth / 30s default / 60s media)
- [ ] 401 triggers silent token refresh + one replay (marked `refreshAttempted`)
- [ ] `INVALID_RESPONSE_SHAPE` is non-retryable — never enters sync queue retry logic
- [ ] All errors returned as typed `AppException` with `retryable` boolean

### Error Handler (errorHandler.ts lines 1-118)
- [ ] All errors funnel through `ErrorHandler.handle()` before reaching consumers
- [ ] Every error carries `retryable` boolean and `userMessage`
- [ ] Redacted diagnostic written to `audit_log` for every error
- [ ] SSL errors logged as security events separately from standard errors
- [ ] No PII, request/response bodies, tokens, or stack traces in logs

### User-Facing Error States (Lines 102-149)
- [ ] `OfflineBanner` cycles: offline -> syncing -> all_synced -> hidden
- [ ] Sync error state shown with "View Details" link to PendingSubmissionsScreen
- [ ] `MissingSchemaOfflineState` shown with clear guidance text
- [ ] Conflict warning badge shown on assignment rows with `conflict_flag = 1`
- [ ] `PendingSubmissionsScreen` shows all `pending` and `failed` records
- [ ] Failed records show specific `last_error` reason (human-mapped)
- [ ] "Edit & Resubmit" available for `CLIENT_ERROR` failures only
- [ ] Manual "Retry" resets `retry_count = 0` and `next_retry_at = NULL`

### Conflict Resolution (Lines 125-132)
- [ ] Accessible via conflict badge tap on assignment row
- [ ] Server version fetched from `/inspections/{id}/conflict`
- [ ] Side-by-side diff rendered per conflicting field
- [ ] "Keep My Version" re-queues with conflict flag cleared
- [ ] "Use Server Version" marks local as `synced`, removes queue entry
- [ ] `NetworkStore.decrementConflictCount()` called on resolution
