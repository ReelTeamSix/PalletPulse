// Quick Actions - Card-style action buttons for dashboard
// 3 buttons: Add Pallet, Add Item, Analytics
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
}

interface QuickActionsProps {
  onAddPallet: () => void;
  onAddItem: () => void;
  onViewAnalytics: () => void;
}

export function QuickActions({
  onAddPallet,
  onAddItem,
  onViewAnalytics,
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: 'add-pallet',
      label: 'Add Pallet',
      icon: 'add-circle',
      iconBgColor: colors.primary,
      iconColor: colors.background,
      onPress: onAddPallet,
    },
    {
      id: 'add-item',
      label: 'Add Item',
      icon: 'cube-outline',
      iconBgColor: colors.profit,
      iconColor: colors.background,
      onPress: onAddItem,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'bar-chart',
      iconBgColor: '#9333EA', // Purple to match insight card
      iconColor: colors.background,
      onPress: onViewAnalytics,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flash" size={16} color={colors.textSecondary} />
        <Text style={styles.headerText}>QUICK ACTIONS</Text>
      </View>
      <View style={styles.actionsRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: action.iconBgColor }]}>
              <Ionicons name={action.icon} size={24} color={action.iconColor} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
