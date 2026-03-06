/**
 * MPVP — Local Cache (MMKV Wrappers)
 * Used for: drafts, schema cache, upload queue, app preferences.
 * NOTE: In development, we use a simple in-memory Map as MMKV fallback
 * since react-native-mmkv requires native modules.
 */

// In-memory storage for development / web compatibility
const memoryStore = new Map<string, string>();

/** Set a string value */
export function cacheSet(key: string, value: string): void {
  memoryStore.set(key, value);
}

/** Get a string value */
export function cacheGet(key: string): string | undefined {
  return memoryStore.get(key) ?? undefined;
}

/** Delete a key */
export function cacheDelete(key: string): void {
  memoryStore.delete(key);
}

/** Check if key exists */
export function cacheHas(key: string): boolean {
  return memoryStore.has(key);
}

/** Get all keys matching a prefix */
export function cacheGetKeysByPrefix(prefix: string): string[] {
  const keys: string[] = [];
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

/** Clear all cached data */
export function cacheClearAll(): void {
  memoryStore.clear();
}

// ─── Typed Helpers ────────────────────────────────────────

/** Cache JSON-serializable data */
export function cacheSetJSON<T>(key: string, value: T): void {
  cacheSet(key, JSON.stringify(value));
}

/** Retrieve and parse JSON data */
export function cacheGetJSON<T>(key: string): T | null {
  const raw = cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Schema Cache Helpers ─────────────────────────────────

import type { FindingsSchema } from '@/types/schema.types';

export function cacheSchema(requestId: string, schema: FindingsSchema): void {
  cacheSetJSON(`findings_schema_${requestId}`, schema);
}

export function getCachedSchema(requestId: string): FindingsSchema | null {
  return cacheGetJSON<FindingsSchema>(`findings_schema_${requestId}`);
}

// ─── Draft Cache Helpers ──────────────────────────────────

import type { InspectionDraft } from '@/types/store.types';

export function cacheDraft(requestId: string, draft: InspectionDraft): void {
  cacheSetJSON(`draft_${requestId}`, draft);
}

export function getCachedDraft(requestId: string): InspectionDraft | null {
  return cacheGetJSON<InspectionDraft>(`draft_${requestId}`);
}

export function clearCachedDraft(requestId: string): void {
  cacheDelete(`draft_${requestId}`);
}
