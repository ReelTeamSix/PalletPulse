import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';
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
        actionLabel={onViewAll ? 'See All' : undefined}
        onAction={onViewAll}
      />
      <View style={styles.activityList}>
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={() => onActivityPress(activity)}
          />
        ))}
      </View>
    </View>
  );
}

interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
}

function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const config = activityConfig[activity.type];
  const isProfit = activity.type === 'sale' && activity.value !== undefined && activity.value >= 0;
  const isLoss = activity.type === 'sale' && activity.value !== undefined && activity.value < 0;
  const showStatusText = activity.type === 'pallet';

  return (
    <Card shadow="sm" padding="md" style={styles.activityCard} onPress={onPress}>
      {activity.imageUri ? (
        <Image source={{ uri: activity.imageUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{activity.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{activity.subtitle}</Text>
      </View>

      <View style={styles.rightContent}>
        {activity.value !== undefined && (
          <Text style={[
            styles.value,
            isProfit && styles.valueProfit,
            isLoss && styles.valueLoss,
            activity.type !== 'sale' && { color: colors.textPrimary },
          ]}>
            {config.valuePrefix}{formatCurrency(Math.abs(activity.value))}
          </Text>
        )}
        {showStatusText && (
          <Text style={styles.statusText}>Added</Text>
        )}
        <Text style={styles.time}>{formatTimeAgo(activity.timestamp)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  activityList: {
    gap: spacing.sm,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  rightContent: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    marginBottom: 2,
  },
  valueProfit: {
    color: colors.profit,
  },
  valueLoss: {
    color: colors.loss,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  time: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textDisabled,
  },
});
