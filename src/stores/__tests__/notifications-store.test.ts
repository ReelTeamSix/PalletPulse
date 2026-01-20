// Notifications Store Tests
import { useNotificationsStore } from '../notifications-store';
import { supabase } from '@/src/lib/supabase';
import type { Notification } from '@/src/types/database';

// Mock Supabase
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

// Mock notifications library
jest.mock('@/src/lib/notifications', () => ({
  setBadgeCount: jest.fn(),
}));

const mockNotification: Notification = {
  id: 'notif-1',
  user_id: 'user-123',
  type: 'stale_inventory',
  title: 'Stale Inventory Alert',
  body: 'You have 3 items listed for over 30 days',
  data: null,
  is_read: false,
  created_at: '2024-01-15T10:00:00Z',
  read_at: null,
};

const mockNotification2: Notification = {
  id: 'notif-2',
  user_id: 'user-123',
  type: 'pallet_milestone',
  title: 'Milestone Reached!',
  body: 'Pallet #3 has reached 50% ROI',
  data: { palletId: 'pallet-3' },
  is_read: true,
  created_at: '2024-01-14T10:00:00Z',
  read_at: '2024-01-14T12:00:00Z',
};

const mockNotification3: Notification = {
  id: 'notif-3',
  user_id: 'user-123',
  type: 'weekly_summary',
  title: 'Weekly Summary',
  body: 'You sold 5 items this week for $250 profit',
  data: null,
  is_read: false,
  created_at: '2024-01-13T10:00:00Z',
  read_at: null,
};

describe('NotificationsStore', () => {
  beforeEach(() => {
    useNotificationsStore.setState({
      notifications: [],
      isLoading: false,
      error: null,
      unreadCount: 0,
    });
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct initial state', () => {
      const state = useNotificationsStore.getState();

      expect(state.notifications).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('fetchNotifications', () => {
    it('should fetch notifications and calculate unread count', async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: [mockNotification, mockNotification2, mockNotification3],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      await useNotificationsStore.getState().fetchNotifications();

      const state = useNotificationsStore.getState();
      expect(state.notifications).toHaveLength(3);
      expect(state.unreadCount).toBe(2); // notif-1 and notif-3 are unread
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle no authenticated user', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      await useNotificationsStore.getState().fetchNotifications();

      const state = useNotificationsStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });

    it('should handle fetch error', async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      await useNotificationsStore.getState().fetchNotifications();

      const state = useNotificationsStore.getState();
      expect(state.error).toBe('Database error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and update unread count', async () => {
      // Set initial state with notifications
      useNotificationsStore.setState({
        notifications: [mockNotification, mockNotification2, mockNotification3],
        unreadCount: 2,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({ eq: mockEq });

      await useNotificationsStore.getState().markAsRead('notif-1');

      const state = useNotificationsStore.getState();
      const updatedNotif = state.notifications.find(n => n.id === 'notif-1');
      expect(updatedNotif?.is_read).toBe(true);
      expect(updatedNotif?.read_at).not.toBeNull();
      expect(state.unreadCount).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      // Set initial state with notifications
      useNotificationsStore.setState({
        notifications: [mockNotification, mockNotification2, mockNotification3],
        unreadCount: 2,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ eq: mockEq2 });

      await useNotificationsStore.getState().markAllAsRead();

      const state = useNotificationsStore.getState();
      expect(state.notifications.every(n => n.is_read)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification and update unread count', async () => {
      // Set initial state with notifications
      useNotificationsStore.setState({
        notifications: [mockNotification, mockNotification2, mockNotification3],
        unreadCount: 2,
      });

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });
      mockDelete.mockReturnValue({ eq: mockEq });

      await useNotificationsStore.getState().deleteNotification('notif-1');

      const state = useNotificationsStore.getState();
      expect(state.notifications).toHaveLength(2);
      expect(state.notifications.find(n => n.id === 'notif-1')).toBeUndefined();
      expect(state.unreadCount).toBe(1); // Only notif-3 is unread now
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications', async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      // Set initial state with notifications
      useNotificationsStore.setState({
        notifications: [mockNotification, mockNotification2, mockNotification3],
        unreadCount: 2,
      });

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });
      mockDelete.mockReturnValue({ eq: mockEq });

      await useNotificationsStore.getState().deleteAllNotifications();

      const state = useNotificationsStore.getState();
      expect(state.notifications).toHaveLength(0);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', () => {
      useNotificationsStore.setState({
        notifications: [mockNotification, mockNotification2, mockNotification3],
        unreadCount: 2,
      });

      const count = useNotificationsStore.getState().getUnreadCount();
      expect(count).toBe(2);
    });
  });

  describe('getNotificationsByType', () => {
    it('should filter notifications by type', () => {
      useNotificationsStore.setState({
        notifications: [mockNotification, mockNotification2, mockNotification3],
        unreadCount: 2,
      });

      const staleNotifs = useNotificationsStore
        .getState()
        .getNotificationsByType('stale_inventory');

      expect(staleNotifs).toHaveLength(1);
      expect(staleNotifs[0].id).toBe('notif-1');

      const milestoneNotifs = useNotificationsStore
        .getState()
        .getNotificationsByType('pallet_milestone');

      expect(milestoneNotifs).toHaveLength(1);
      expect(milestoneNotifs[0].id).toBe('notif-2');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useNotificationsStore.setState({ error: 'Some error' });

      useNotificationsStore.getState().clearError();

      expect(useNotificationsStore.getState().error).toBeNull();
    });
  });
});
