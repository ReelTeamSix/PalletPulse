// Mark Item as Sold Screen
import { useEffect, useMemo, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { useItemsStore } from '@/src/stores/items-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { Button, Input } from '@/src/components/ui';
import {
  formatCondition,
  getConditionColor,
  calculateItemProfit,
} from '@/src/features/items/schemas/item-form-schema';
import {
  saleFormSchema,
  SaleFormData,
  getDefaultSaleFormValues,
  SALES_CHANNEL_SUGGESTIONS,
  getPriceWarning,
  calculateDiscount,
  formatSaleDate,
} from '@/src/features/sales/schemas/sale-form-schema';
import {
  formatCurrency,
  formatProfit,
  formatROI,
  getROIColor,
  calculateItemROIFromValues,
} from '@/src/lib/profit-utils';

export default function SellItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, getItemById, markAsSold, isLoading, fetchItems } = useItemsStore();
  const { getPalletById, pallets } = usePalletsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChannelSuggestions, setShowChannelSuggestions] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch items if not loaded
  useEffect(() => {
    if (items.length === 0) {
      fetchItems();
    }
  }, []);

  const item = useMemo(() => {
    if (!id) return null;
    return getItemById(id);
  }, [id, items]);

  const pallet = useMemo(() => {
    if (!item?.pallet_id) return null;
    return getPalletById(item.pallet_id);
  }, [item, pallets]);

  // Calculate cost allocation for pallet items
  const palletItems = pallet ? useItemsStore.getState().getItemsByPallet(pallet.id) : [];
  const palletItemCount = palletItems.length || 1;
  const calculatedAllocatedCost = pallet && pallet.purchase_cost
    ? (pallet.purchase_cost + (pallet.sales_tax || 0)) / palletItemCount
    : null;

  // Use stored allocated_cost if available, otherwise calculate from pallet, otherwise use purchase_cost
  const effectiveCost = item
    ? (item.allocated_cost ?? calculatedAllocatedCost ?? item.purchase_cost ?? 0)
    : 0;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(saleFormSchema),
    defaultValues: getDefaultSaleFormValues(item?.listing_price),
  });

  // Watch sale price for live calculations
  const salePrice = watch('sale_price');
  const salesChannel = watch('sales_channel');

  // Calculate profit preview
  const previewProfit = calculateItemProfit(salePrice, effectiveCost, null);
  const previewROI = calculateItemROIFromValues(salePrice, effectiveCost, null);
  const profitFormatted = formatProfit(previewProfit);
  const roiColor = getROIColor(previewROI);

  // Price warning if very different from listing
  const priceWarning = item?.listing_price ? getPriceWarning(salePrice || 0, item.listing_price) : null;
  const discount = item?.listing_price ? calculateDiscount(salePrice || 0, item.listing_price) : null;

  // Filter channel suggestions
  const filteredChannels = SALES_CHANNEL_SUGGESTIONS.filter(
    (channel) =>
      !salesChannel ||
      channel.toLowerCase().includes(salesChannel.toLowerCase())
  );

  const onSubmit = async (data: { sale_price: number; sale_date: string; sales_channel?: string | null; buyer_notes?: string | null }) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      const result = await markAsSold(
        id,
        data.sale_price,
        data.sale_date,
        data.sales_channel ?? undefined,
        data.buyer_notes ?? undefined
      );

      if (result.success) {
        router.back();
      } else {
        Alert.alert('Error', result.error || 'Failed to mark item as sold');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !item) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={48} color={colors.loss} />
            <Text style={styles.errorTitle}>Item Not Found</Text>
            <Text style={styles.errorText}>
              This item may have been deleted or doesn't exist.
            </Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  if (item.status === 'sold') {
    return (
      <>
        <Stack.Screen options={{ title: 'Already Sold' }} />
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <FontAwesome name="check-circle" size={48} color={colors.profit} />
            <Text style={styles.errorTitle}>Already Sold</Text>
            <Text style={styles.errorText}>
              This item has already been marked as sold.
            </Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  const conditionColor = getConditionColor(item.condition);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Mark as Sold',
          headerBackTitle: 'Cancel',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          bounces={true}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {/* Item Summary */}
          <View style={styles.itemSummary}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.itemMeta}>
              <View style={[styles.conditionBadge, { backgroundColor: conditionColor }]}>
                <Text style={styles.conditionText}>{formatCondition(item.condition)}</Text>
              </View>
              {item.quantity > 1 && (
                <Text style={styles.quantity}>Qty: {item.quantity}</Text>
              )}
            </View>
            <View style={styles.priceInfo}>
              {item.listing_price !== null && (
                <Text style={styles.listingPrice}>
                  Listed at: {formatCurrency(item.listing_price)}
                </Text>
              )}
              <Text style={styles.costInfo}>
                Cost: {formatCurrency(effectiveCost)}
              </Text>
            </View>
          </View>

          {/* Sale Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sale Details</Text>

            <Controller
              control={control}
              name="sale_price"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sale Price *</Text>
                  <View style={styles.currencyInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.currencyInput}
                      value={value?.toString() || ''}
                      onChangeText={(text) => {
                        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
                        onChange(isNaN(num) ? 0 : num);
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  {errors.sale_price && (
                    <Text style={styles.errorText}>{errors.sale_price.message}</Text>
                  )}
                  {priceWarning && (
                    <View style={styles.warningContainer}>
                      <FontAwesome name="exclamation-triangle" size={14} color={colors.warning} />
                      <Text style={styles.warningText}>{priceWarning}</Text>
                    </View>
                  )}
                  {discount && discount.amount > 0 && !priceWarning && (
                    <Text style={styles.discountText}>
                      {discount.percentage.toFixed(0)}% discount from listing price
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="sale_date"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sale Date</Text>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="YYYY-MM-DD"
                    keyboardType="default"
                    error={errors.sale_date?.message}
                  />
                  <Text style={styles.helperText}>
                    Format: YYYY-MM-DD (e.g., {new Date().toISOString().split('T')[0]})
                  </Text>
                </View>
              )}
            />

            <Controller
              control={control}
              name="sales_channel"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sales Channel</Text>
                  <Input
                    value={value || ''}
                    onChangeText={(text) => {
                      onChange(text);
                      setShowChannelSuggestions(true);
                    }}
                    onFocus={() => setShowChannelSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowChannelSuggestions(false), 200)}
                    placeholder="Where did you sell it?"
                    error={errors.sales_channel?.message}
                  />
                  {showChannelSuggestions && filteredChannels.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                      >
                        {filteredChannels.map((channel) => (
                          <Pressable
                            key={channel}
                            style={[
                              styles.suggestionChip,
                              value === channel && styles.suggestionChipSelected,
                            ]}
                            onPress={() => {
                              onChange(channel);
                              setShowChannelSuggestions(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.suggestionChipText,
                                value === channel && styles.suggestionChipTextSelected,
                              ]}
                            >
                              {channel}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="buyer_notes"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Buyer Notes (optional)</Text>
                  <Input
                    value={value || ''}
                    onChangeText={onChange}
                    placeholder="Any notes about the sale..."
                    multiline
                    numberOfLines={3}
                    error={errors.buyer_notes?.message}
                  />
                </View>
              )}
            />
          </View>

          {/* Profit Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profit Preview</Text>
            <View style={styles.profitPreviewCard}>
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Sale Price</Text>
                <Text style={styles.profitValue}>{formatCurrency(salePrice || 0)}</Text>
              </View>
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Cost</Text>
                <Text style={styles.profitValue}>- {formatCurrency(effectiveCost)}</Text>
              </View>
              <View style={styles.profitDivider} />
              <View style={styles.profitRow}>
                <Text style={styles.profitLabelBold}>Net Profit</Text>
                <Text style={[styles.profitValueBold, { color: profitFormatted.color }]}>
                  {profitFormatted.value}
                </Text>
              </View>
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>ROI</Text>
                <Text style={[styles.profitValue, { color: roiColor }]}>
                  {formatROI(previewROI)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
            disabled={isSubmitting}
          />
          <Button
            title={isSubmitting ? 'Saving...' : 'Confirm Sale'}
            onPress={handleSubmit(onSubmit)}
            style={styles.confirmButton}
            disabled={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200, // Extra padding for keyboard
    flexGrow: 1,
  },
  itemSummary: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  itemName: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  conditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  conditionText: {
    fontSize: fontSize.xs,
    color: colors.background,
    fontWeight: '500',
  },
  quantity: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  priceInfo: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  listingPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  costInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  currencyInput: {
    flex: 1,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  discountText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  suggestionsContainer: {
    marginTop: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  suggestionChipText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  suggestionChipTextSelected: {
    color: colors.background,
  },
  profitPreviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  profitLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  profitLabelBold: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  profitValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  profitValueBold: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  profitDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
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
  confirmButton: {
    flex: 1,
  },
});
