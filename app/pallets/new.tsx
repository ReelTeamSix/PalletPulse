import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { Button } from '@/src/components/ui';

export default function NewPalletScreen() {
  const router = useRouter();

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/pallets');
    }
  };

  const handleSave = () => {
    // Form submission will be implemented in Phase 5
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/pallets');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Pallet',
          headerBackTitle: 'Cancel',
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>New Pallet</Text>
            <Text style={styles.subtitle}>Enter pallet details to start tracking</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Pallet Information</Text>

            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                Form fields will be implemented in Phase 5:
              </Text>
              <View style={styles.fieldList}>
                <Text style={styles.fieldItem}>- Pallet Name</Text>
                <Text style={styles.fieldItem}>- Supplier</Text>
                <Text style={styles.fieldItem}>- Source Type</Text>
                <Text style={styles.fieldItem}>- Purchase Cost</Text>
                <Text style={styles.fieldItem}>- Sales Tax</Text>
                <Text style={styles.fieldItem}>- Purchase Date</Text>
                <Text style={styles.fieldItem}>- Photo (optional)</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={handleCancel}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title="Save Pallet"
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
