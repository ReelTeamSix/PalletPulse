import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import { typography } from '@/src/constants/typography';

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color?: string;
  onPress?: () => void;
}

export function MetricCard({
  icon,
  value,
  label,
  color = colors.primary,
  onPress,
}: MetricCardProps) {
  const content = (
    <>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Card shadow="sm" padding="md" style={styles.card} onPress={onPress}>
        {content}
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="md" style={styles.card}>
      {content}
    </Card>
  );
}

interface MetricGridProps {
  children: React.ReactNode;
}

export function MetricGrid({ children }: MetricGridProps) {
  return (
    <View style={styles.grid}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  value: {
    ...typography.metricValue,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.metricLabel,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
});
