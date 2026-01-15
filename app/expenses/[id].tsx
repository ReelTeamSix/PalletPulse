import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { useExpensesStore } from '@/src/stores/expenses-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { Button } from '@/src/components/ui';
import {
  formatExpenseAmount,
  formatExpenseDate,
  getCategoryLabel,
  getCategoryColor,
} from '@/src/features/expenses';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { expenses, getExpenseById, deleteExpense, fetchExpenses, isLoading } = useExpensesStore();
  const { getPalletById } = usePalletsStore();
  const [receiptViewerVisible, setReceiptViewerVisible] = useState(false);

  // Fetch expenses if not loaded
  useEffect(() => {
    if (expenses.length === 0) {
      fetchExpenses();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Only run on mount

  const expense = useMemo(() => {
    if (!id) return null;
    return getExpenseById(id);
  }, [id, expenses]); // eslint-disable-line react-hooks/exhaustive-deps -- getExpenseById is stable

  // Get all linked pallets from pallet_ids array (Phase 8D multi-pallet support)
  const linkedPallets = useMemo(() => {
    if (!expense) return [];
    // Check pallet_ids array first, fallback to legacy pallet_id
    const palletIds = expense.pallet_ids?.length
      ? expense.pallet_ids
      : (expense.pallet_id ? [expense.pallet_id] : []);
    return palletIds
      .map(id => getPalletById(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
  }, [expense]); // eslint-disable-line react-hooks/exhaustive-deps -- getPalletById is stable

  const handleEdit = () => {
    router.push({ pathname: '/expenses/edit', params: { id } });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this ${formatExpenseAmount(expense?.amount || 0)} expense? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            const result = await deleteExpense(id);
            if (result.success) {
              router.back();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const handlePalletPress = (palletId: string) => {
    router.push(`/pallets/${palletId}`);
  };

  if (!expense) {
    return (
      <>
        <Stack.Screen options={{ title: 'Expense' }} />
        <View style={styles.centered}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={styles.notFoundText}>Expense not found</Text>
          )}
        </View>
      </>
    );
  }

  const categoryColor = getCategoryColor(expense.category);
  const categoryLabel = getCategoryLabel(expense.category);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Expense Details',
          headerRight: () => (
            <Pressable onPress={handleEdit} style={styles.headerButton}>
              <FontAwesome name="edit" size={20} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        {/* Amount Header */}
        <View style={styles.amountCard}>
          <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />
          <View style={styles.amountContent}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>{formatExpenseAmount(expense.amount)}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
              <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatExpenseDate(expense.expense_date)}</Text>
          </View>

          {expense.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValueWrap}>{expense.description}</Text>
            </View>
          )}

          {linkedPallets.length > 0 ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {linkedPallets.length === 1 ? 'Linked Pallet' : 'Linked Pallets'}
              </Text>
              <View style={styles.palletsContainer}>
                {linkedPallets.map((pallet) => (
                  <Pressable
                    key={pallet.id}
                    style={styles.palletLink}
                    onPress={() => handlePalletPress(pallet.id)}
                  >
                    <FontAwesome name="cube" size={14} color={colors.primary} style={styles.palletIcon} />
                    <Text style={styles.palletLinkText}>{pallet.name}</Text>
                    <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Linked Pallet</Text>
              <Text style={styles.detailValueMuted}>Not linked to any pallet</Text>
            </View>
          )}
        </View>

        {/* Receipt Photo */}
        {expense.receipt_photo_path && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receipt</Text>
            <Pressable
              style={styles.receiptContainer}
              onPress={() => setReceiptViewerVisible(true)}
            >
              <Image
                source={{ uri: expense.receipt_photo_path }}
                style={styles.receiptThumbnail}
                resizeMode="cover"
              />
              <View style={styles.receiptOverlay}>
                <FontAwesome name="search-plus" size={20} color={colors.background} />
                <Text style={styles.receiptOverlayText}>Tap to view</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValueSmall}>
              {new Date(expense.created_at).toLocaleString()}
            </Text>
          </View>
          {expense.updated_at !== expense.created_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Updated</Text>
              <Text style={styles.detailValueSmall}>
                {new Date(expense.updated_at).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <View style={styles.actionSection}>
          <Button
            title="Delete Expense"
            onPress={handleDelete}
            variant="outline"
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>

      {/* Receipt Viewer Modal */}
      <Modal
        visible={receiptViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptViewerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setReceiptViewerVisible(false)}
        >
          <View style={styles.modalContent}>
            <Pressable
              style={styles.closeButton}
              onPress={() => setReceiptViewerVisible(false)}
            >
              <FontAwesome name="times" size={24} color={colors.background} />
            </Pressable>
            {expense.receipt_photo_path && (
              <Image
                source={{ uri: expense.receipt_photo_path }}
                style={styles.fullReceiptImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  headerButton: {
    padding: spacing.sm,
  },
  amountCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  categoryIndicator: {
    width: 6,
  },
  amountContent: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryBadgeText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
  },
  detailValueWrap: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  detailValueMuted: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  detailValueSmall: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  palletsContainer: {
    flex: 1,
    gap: spacing.sm,
  },
  palletLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  palletIcon: {
    marginRight: spacing.xs,
  },
  palletLinkText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  receiptContainer: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  receiptThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  receiptOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  receiptOverlayText: {
    color: colors.background,
    fontSize: fontSize.sm,
  },
  actionSection: {
    marginTop: spacing.md,
  },
  deleteButton: {
    borderColor: colors.loss,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: spacing.md,
  },
  fullReceiptImage: {
    width: '90%',
    height: '80%',
  },
});
