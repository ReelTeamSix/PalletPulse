import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';

export default function PalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const handleAddItem = () => {
    router.push({ pathname: '/items/new', params: { palletId: id } });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Pallet Details',
          headerBackTitle: 'Pallets',
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Pallet #{id?.slice(0, 8)}</Text>
            <Text style={styles.subtitle}>Pallet details and items</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>$0.00</Text>
              <Text style={styles.statLabel}>Cost</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, styles.profitText]}>$0.00</Text>
              <Text style={styles.statLabel}>Profit</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>0%</Text>
              <Text style={styles.statLabel}>ROI</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items (0)</Text>
            <View style={styles.placeholder}>
              <FontAwesome name="cube" size={48} color={colors.neutral} />
              <Text style={styles.placeholderText}>
                No items yet. Add items to this pallet to start tracking.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Supplier</Text>
                <Text style={styles.detailValue}>Not set</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source Type</Text>
                <Text style={styles.detailValue}>Not set</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purchase Date</Text>
                <Text style={styles.detailValue}>Not set</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Unprocessed</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <Pressable style={styles.fab} onPress={handleAddItem}>
          <FontAwesome name="plus" size={24} color={colors.background} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.lg,
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
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  profitText: {
    color: colors.profit,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  placeholder: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: colors.statusUnprocessed,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
