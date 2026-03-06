/**
 * MPVP — useRequests Hook
 * Encapsulates all state management for the paginated requests list.
 * Handles initial load, pagination, pull-to-refresh, in-place updates,
 * error state, and loading state.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchRequests,
  approveRequest,
  rejectRequest,
} from '../services/api/services/requestsService';
import type {
  RequestModel,
  PaginatedRequestResult,
} from '../services/api/types/requestTypes';
import { ErrorHandler } from '../utils/errorHandler';

export function useRequests() {
  const [data, setData] = useState<PaginatedRequestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [page, setPage] = useState(1);

  // Track abort controller for request cancellation
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Load a specific page of requests.
   * Page 1 replaces data; subsequent pages append with deduplication.
   */
  const load = useCallback(async (targetPage: number) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await fetchRequests(targetPage);

      setData((prev) => {
        if (targetPage === 1 || !prev) {
          return result;
        }

        // Append with deduplication by ID
        const existingIds = new Set(prev.items.map((item) => item.id));
        const newItems = result.items.filter((item) => !existingIds.has(item.id));

        return {
          ...result,
          items: [...prev.items, ...newItems],
        };
      });
    } catch (err: any) {
      // Ignore abort errors
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
        return;
      }
      const mapped = ErrorHandler.handle(err);
      setError(mapped);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Pull-to-refresh: reset to page 1 and reload.
   */
  const refresh = useCallback(() => {
    setPage(1);
    load(1);
  }, [load]);

  /**
   * Infinite scroll: load next page if available and not already loading.
   */
  const loadMore = useCallback(() => {
    if (!data?.hasNext || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage);
  }, [data?.hasNext, loading, page, load]);

  /**
   * In-place update of a single item after approve/reject.
   * Replaces the matching item by ID without a full reload.
   */
  const updateItem = useCallback((updated: RequestModel) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      };
    });
  }, []);

  // Initial load on mount
  useEffect(() => {
    load(1);
  }, [load]);

  // Cleanup: abort on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    loadMore,
    updateItem,
  };
}
