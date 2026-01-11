import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Your PalletPulse overview</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total Profit</Text>
        <Text style={styles.heroValue}>$0.00</Text>
        <Text style={styles.heroSubtext}>All time</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <FontAwesome name="archive" size={24} color={colors.primary} />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Pallets</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome name="cube" size={24} color={colors.primary} />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
        <View style={styles.statCard}>
          <FontAwesome name="check-circle" size={24} color={colors.profit} />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Sold</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <Pressable
          style={styles.actionCard}
          onPress={() => router.push('/pallets/new')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
            <FontAwesome name="plus" size={20} color={colors.primary} />
          </View>
          <Text style={styles.actionTitle}>Add Pallet</Text>
          <Text style={styles.actionSubtitle}>Start tracking a new pallet</Text>
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push('/items/new')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.profit + '15' }]}>
            <FontAwesome name="cube" size={20} color={colors.profit} />
          </View>
          <Text style={styles.actionTitle}>Add Item</Text>
          <Text style={styles.actionSubtitle}>Log an individual find</Text>
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/pallets')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.warning + '15' }]}>
            <FontAwesome name="list" size={20} color={colors.warning} />
          </View>
          <Text style={styles.actionTitle}>View Pallets</Text>
          <Text style={styles.actionSubtitle}>Manage your inventory</Text>
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/analytics')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.statusListed + '15' }]}>
            <FontAwesome name="bar-chart" size={20} color={colors.statusListed} />
          </View>
          <Text style={styles.actionTitle}>Analytics</Text>
          <Text style={styles.actionSubtitle}>View your performance</Text>
        </Pressable>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Recent activity and insights will appear here as you add pallets and items.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.profit,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroLabel: {
    fontSize: fontSize.md,
    color: colors.background,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.background,
    marginBottom: spacing.xs,
  },
  heroSubtext: {
    fontSize: fontSize.sm,
    color: colors.background,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  placeholder: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
