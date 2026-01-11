import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Button } from '@/src/components/ui';

export default function NewItemScreen() {
  const { palletId } = useLocalSearchParams<{ palletId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCancel = () => {
    router.dismiss();
  };

  const handleSave = () => {
    // Form submission will be implemented in Phase 6
    router.dismiss();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: palletId ? 'Add Item to Pallet' : 'Add Item',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>New Item</Text>
            <Text style={styles.subtitle}>
              {palletId
                ? 'Add an item from your pallet'
                : 'Add an individual item (thrift, garage sale, etc.)'}
            </Text>
          </View>

          {palletId && (
            <View style={styles.palletBadge}>
              <Text style={styles.palletBadgeText}>
                Adding to Pallet #{palletId.slice(0, 8)}
              </Text>
            </View>
          )}

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Item Information</Text>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                Form fields will be implemented in Phase 6:
              </Text>
              <View style={styles.fieldList}>
                <Text style={styles.fieldItem}>- Item Name</Text>
                <Text style={styles.fieldItem}>- Description</Text>
                <Text style={styles.fieldItem}>- Photos (1-10 based on tier)</Text>
                <Text style={styles.fieldItem}>- Condition</Text>
                <Text style={styles.fieldItem}>- Quantity</Text>
                <Text style={styles.fieldItem}>- Barcode (optional)</Text>
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.placeholder}>
              <View style={styles.fieldList}>
                <Text style={styles.fieldItem}>- Retail Price</Text>
                <Text style={styles.fieldItem}>- Listing Price</Text>
                {!palletId && (
                  <Text style={styles.fieldItem}>- Purchase Cost</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Organization</Text>
            <View style={styles.placeholder}>
              <View style={styles.fieldList}>
                <Text style={styles.fieldItem}>- Storage Location</Text>
                {!palletId && (
                  <>
                    <Text style={styles.fieldItem}>- Source Type</Text>
                    <Text style={styles.fieldItem}>- Source Name (optional)</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Button
            title="Cancel"
            onPress={handleCancel}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title="Save Item"
            onPress={handleSave}
            style={styles.saveButton}
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
    padding: spacing.lg,
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
  palletBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  palletBadgeText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  formSection: {
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
    padding: spacing.lg,
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  fieldList: {
    gap: spacing.xs,
  },
  fieldItem: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
