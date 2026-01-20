import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import { useNotificationsStore } from '@/src/stores/notifications-store';
import type { Notification, NotificationType } from '@/src/types/database';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

// Map notification types to icons and colors
const notificationConfig: Record<NotificationType, { icon: string; color: string }> = {
  stale_inventory: { icon: 'time-outline', color: colors.warning },
  pallet_milestone: { icon: 'trophy-outline', color: colors.profit },
  weekly_summary: { icon: 'stats-chart-outline', color: colors.primary },
  subscription_reminder: { icon: 'card-outline', color: colors.warning },
  limit_warning: { icon: 'alert-circle-outline', color: colors.loss },
  system: { icon: 'information-circle-outline', color: colors.textSecondary },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
}

function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const config = notificationConfig[notification.type] || notificationConfig.system;

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.is_read && styles.unreadItem,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.itemIconContainer, { backgroundColor: `${config.color}15` }]}>
        <Ionicons name={config.icon as any} size={20} color={config.color} />
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemTitleRow}>
          <Text
            style={[styles.itemTitle, !notification.is_read && styles.unreadText]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {!notification.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.itemBody} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.itemTimestamp}>{formatTimeAgo(notification.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

interface NotificationSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationSheet({ visible, onClose }: NotificationSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
  } = useNotificationsStore();

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Close sheet
    onClose();

    // Navigate based on type
    const data = notification.data as {
      itemId?: string;
      palletId?: string;
    } | null;

    switch (notification.type) {
      case 'stale_inventory':
        router.push('/(tabs)/inventory');
        break;
      case 'pallet_milestone':
        if (data?.palletId) {
          router.push(`/pallets/${data.palletId}`);
        }
        break;
      case 'weekly_summary':
        router.push('/(tabs)/analytics');
        break;
      case 'subscription_reminder':
      case 'limit_warning':
        router.push('/(tabs)/settings');
        break;
      default:
        break;
    }
  }, [markAsRead, onClose, router]);

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            deleteAllNotifications();
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off-outline" size={40} color={colors.textDisabled} />
      </View>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        You're all caught up!
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={markAllAsRead}
                >
                  <Ionicons name="checkmark-done-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
              {notifications.length > 0 && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleClearAll}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.loss} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Notifications List */}
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem
                notification={item}
                onPress={() => handleNotificationPress(item)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              notifications.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SHEET_HEIGHT,
    minHeight: 300,
    ...shadows.xl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  unreadItem: {
    backgroundColor: `${colors.primary}08`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  itemBody: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  itemTimestamp: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
