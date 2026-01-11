import { StyleSheet, View, Text, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Button } from '@/src/components/ui';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleMarkAsSold = () => {
    // Mark as sold will be implemented in Phase 7
  };

  const handleEdit = () => {
    // Edit functionality will be implemented in Phase 6
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Item Details',
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.photoSection}>
            <View style={styles.photoPlaceholder}>
              <FontAwesome name="camera" size={48} color={colors.neutral} />
              <Text style={styles.photoPlaceholderText}>No photos</Text>
            </View>
          </View>

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Item #{id?.slice(0, 8)}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Listed</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Item details and pricing</Text>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Listing Price</Text>
              <Text style={styles.priceValue}>$0.00</Text>
            </View>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Allocated Cost</Text>
              <Text style={styles.priceValue}>$0.00</Text>
            </View>
            <View style={[styles.priceCard, styles.profitCard]}>
              <Text style={styles.priceLabel}>Est. Profit</Text>
              <Text style={[styles.priceValue, styles.profitText]}>$0.00</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Condition</Text>
                <Text style={styles.detailValue}>New</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Retail Price</Text>
                <Text style={styles.detailValue}>$0.00</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>1</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Storage Location</Text>
                <Text style={styles.detailValue}>Not set</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source</Text>
                <Text style={styles.detailValue}>Pallet</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Listed Date</Text>
                <Text style={styles.detailValue}>Not set</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>
                No description added yet.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Edit Item"
            onPress={handleEdit}
            variant="outline"
            style={styles.editButton}
          />
          <Button
            title="Mark as Sold"
            onPress={handleMarkAsSold}
            style={styles.soldButton}
          />
        </View>
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
    paddingBottom: 100,
  },
  photoSection: {
    height: 250,
    backgroundColor: colors.surface,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: fontSize.md,
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: colors.statusListed,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  priceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  profitCard: {
    backgroundColor: colors.profit + '15',
  },
  priceLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  profitText: {
    color: colors.profit,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  descriptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  editButton: {
    flex: 1,
  },
  soldButton: {
    flex: 1,
  },
});
