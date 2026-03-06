import { useState, useCallback } from 'react';
import { notificationService } from '../services/notifications/notificationService';
import { AppNotification, PaginatedResponse } from '../types/api.types';
import { useNotificationStore } from '../stores/notificationStore';
import { ErrorHandler } from '../utils/errorHandler';

export const useNotifications = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const fetchNotifications = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationService.getNotifications({ page, limit: 20 });
      if (!response || !Array.isArray(response.data)) {
        throw new Error('Invalid response from notifications service');
      }

      if (page === 1) {
        setNotifications(response.data);
      } else {
        setNotifications((prev) => [...prev, ...response.data]);
      }
      
      // Calculate unread count for the store
      const unread = response.data.filter(n => !n.read).length;
      if (page === 1) setUnreadCount(unread);
      
      return response;
    } catch (err) {
      const mappedError = ErrorHandler.handle(err);
      setError(mappedError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      useNotificationStore.getState().decrement();
    } catch (err) {
      ErrorHandler.logError('Failed to mark notification as read', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
      useNotificationStore.getState().reset();
    } catch (err) {
      ErrorHandler.logError('Failed to mark all as read', err);
    }
  }, []);

  return {
    loading,
    error,
    notifications,
    fetchNotifications,
    markAsRead,
    markAllRead,
  };
};
