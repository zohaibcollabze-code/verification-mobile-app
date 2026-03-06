/**
 * MPVP — React Query Key Factory
 * Use these exact keys in all useQuery / invalidateQueries calls.
 */

export const queryKeys = {
  assignments: {
    active: ['assignments', 'active'] as const,
    detail: (id: string) => ['assignments', id] as const,
  },
  history: (filter: string, search: string) => ['history', filter, search] as const,
  notifications: {
    list: ['notifications', 'list'] as const,
    count: ['notifications', 'count'] as const,
  },
} as const;
