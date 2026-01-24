import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';
import { useNotificationsStore } from '@/src/stores/notifications-store';
import type { Notification, NotificationType } from '@/src/types/database';

const SWIPE_THRESHOLD = 80;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;

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
  onDismiss: () => void;
}

function NotificationItem({ notification, onPress, onDismiss }: NotificationItemProps) {
  const config = notificationConfig[notification.type] || notificationConfig.system;
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative dx)
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe past threshold - dismiss
          Animated.timing(translateX, {
            toValue: -500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDismiss());
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.swipeContainer}>
      {/* Delete background */}
      <View style={styles.deleteBackground}>
        <Ionicons name="trash-outline" size={20} color={colors.background} />
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
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
      </Animated.View>
    </View>
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
    markAsRead,
    deleteNotification,
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

  const handleDismiss = useCallback((notificationId: string) => {
    deleteNotification(notificationId);
  }, [deleteNotification]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {/* Glow effect like ConfirmationModal */}
      <View style={styles.emptyIconGlow} />
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off-outline" size={36} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        You&apos;re all caught up!
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
          </View>

          {/* Notifications List */}
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem
                notification={item}
                onPress={() => handleNotificationPress(item)}
                onDismiss={() => handleDismiss(item.id)}
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
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SHEET_HEIGHT,
    minHeight: 320,
    ...shadows.xl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
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
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: colors.loss,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  unreadItem: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  itemIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
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
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  itemBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  itemTimestamp: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconGlow: {
    position: 'absolute',
    top: -8,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    opacity: 0.8,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.card,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
