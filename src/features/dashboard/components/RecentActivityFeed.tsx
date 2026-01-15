import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { formatCurrency } from '@/src/lib/profit-utils';

export type ActivityType = 'sale' | 'listed' | 'pallet' | 'expense';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  value?: number;
  imageUri?: string;
  timestamp: Date;
}

interface RecentActivityFeedProps {
  activities: Activity[];
  onActivityPress: (activity: Activity) => void;
  onViewAll?: () => void;
}

const activityConfig: Record<ActivityType, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  valuePrefix: string;
}> = {
  sale: {
    icon: 'checkmark-circle',
    color: colors.profit,
    valuePrefix: '+',
  },
  listed: {
    icon: 'pricetag',
    color: colors.primary,
    valuePrefix: '',
  },
  pallet: {
    icon: 'cube',
    color: colors.warning,
    valuePrefix: '',
  },
  expense: {
    icon: 'receipt',
    color: colors.loss,
    valuePrefix: '-',
  },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function RecentActivityFeed({
  activities,
  onActivityPress,
  onViewAll,
}: RecentActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <View>
        <SectionHeader
          title="Recent Activity"
          actionLabel={onViewAll ? 'View All' : undefined}
          onAction={onViewAll}
        />
        <Card shadow="sm" padding="lg">
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={32} color={colors.textDisabled} />
            <Text style={styles.emptyText}>No recent activity</Text>
            <Text style={styles.emptySubtext}>Your sales and updates will appear here</Text>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader
        title="Recent Activity"
        actionLabel={onViewAll ? 'View All' : undefined}
        onAction={onViewAll}
      />
      <Card shadow="sm" padding={0}>
        {activities.map((activity, index) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            onPress={() => onActivityPress(activity)}
            isLast={index === activities.length - 1}
          />
        ))}
      </Card>
    </View>
  );
}

interface ActivityRowProps {
  activity: Activity;
  onPress: () => void;
  isLast: boolean;
}

function ActivityRow({ activity, onPress, isLast }: ActivityRowProps) {
  const config = activityConfig[activity.type];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
    >
      {activity.imageUri ? (
        <Image source={{ uri: activity.imageUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{activity.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{activity.subtitle}</Text>
      </View>

      <View style={styles.right}>
        {activity.value !== undefined && (
          <Text style={[styles.value, { color: config.color }]}>
            {config.valuePrefix}{formatCurrency(Math.abs(activity.value))}
          </Text>
        )}
        <Text style={styles.time}>{formatTimeAgo(activity.timestamp)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
});
