// Notifications Store - Zustand store for in-app notifications
import { create } from 'zustand';

import { supabase } from '@/src/lib/supabase';
import { setBadgeCount } from '@/src/lib/notifications';
import type { Notification, NotificationType } from '@/src/types/database';

interface NotificationsState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;

  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  clearError: () => void;

  // Selectors
  getUnreadCount: () => number;
  getNotificationsByType: (type: NotificationType) => Notification[];
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  isLoading: false,
  error: null,
  unreadCount: 0,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ notifications: [], isLoading: false, unreadCount: 0 });
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const notifications = (data || []) as Notification[];
      const unreadCount = notifications.filter(n => !n.is_read).length;

      set({ notifications, isLoading: false, unreadCount });

      // Update app badge
      await setBadgeCount(unreadCount);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
      set({ error: message, isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;

      set(state => {
        const notifications = state.notifications.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        );
        const unreadCount = notifications.filter(n => !n.is_read).length;

        // Update badge
        setBadgeCount(unreadCount);

        return { notifications, unreadCount };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark notification as read';
      set({ error: message });
    }
  },

  markAllAsRead: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.map(n => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        })),
        unreadCount: 0,
      }));

      // Clear badge
      await setBadgeCount(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark all as read';
      set({ error: message });
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => {
        const notifications = state.notifications.filter(n => n.id !== id);
        const unreadCount = notifications.filter(n => !n.is_read).length;

        setBadgeCount(unreadCount);

        return { notifications, unreadCount };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete notification';
      set({ error: message });
    }
  },

  deleteAllNotifications: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      set({ notifications: [], unreadCount: 0 });
      await setBadgeCount(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete all notifications';
      set({ error: message });
    }
  },

  clearError: () => set({ error: null }),

  getUnreadCount: () => get().unreadCount,

  getNotificationsByType: (type: NotificationType) => {
    return get().notifications.filter(n => n.type === type);
  },
}));
