/**
 * MPVP — Notification Store (Zustand)
 * Tracks unread notification count for tab badge.
 */
import { create } from 'zustand';
import type { NotificationState } from '@/types/store.types';

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,

  setUnreadCount: (n: number) => set({ unreadCount: n }),
  increment: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  decrement: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  reset: () => set({ unreadCount: 0 }),
}));
