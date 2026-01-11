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
  getUniqueSalesChannels,
  getPriceWarning,
  calculateDiscount,
  formatSaleDate,
  PLATFORM_OPTIONS,
  PLATFORM_PRESETS,
  calculatePlatformFee,
  calculateNetProfit,
  getSalesChannelFromPlatform,
} from '@/src/features/sales/schemas/sale-form-schema';
import type { SalesPlatform } from '@/src/types/database';
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
  const [isShipped, setIsShipped] = useState(false); // For platforms with shipped rates
  const [manualFeeOverride, setManualFeeOverride] = useState(false); // Allow manual fee entry
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

  // Watch form values for live calculations
  const salePrice = watch('sale_price');
  const salesChannel = watch('sales_channel');
  const platform = watch('platform');
  const platformFee = watch('platform_fee');
  const shippingCost = watch('shipping_cost');

  // Get platform config for display
  const platformConfig = platform ? PLATFORM_PRESETS[platform] : null;

  // Auto-calculate platform fee when platform or sale price changes
  useEffect(() => {
    if (platform && !manualFeeOverride) {
      const autoFee = calculatePlatformFee(salePrice || 0, platform, isShipped);
      setValue('platform_fee', autoFee);
    }
  }, [platform, salePrice, isShipped, manualFeeOverride, setValue]);

  // Auto-fill sales channel from platform
  useEffect(() => {
    if (platform && !salesChannel) {
      const channelName = getSalesChannelFromPlatform(platform);
      if (channelName) {
        setValue('sales_channel', channelName);
      }
    }
  }, [platform, setValue]);

  // Calculate profit preview with all costs
  const actualPlatformFee = platformFee ?? 0;
  const actualShippingCost = shippingCost ?? 0;
  const previewProfit = calculateNetProfit(
    salePrice || 0,
    effectiveCost,
    actualPlatformFee,
    actualShippingCost
  );
  const previewROI = effectiveCost > 0
    ? ((previewProfit / effectiveCost) * 100)
    : previewProfit > 0 ? 100 : 0;
  const profitFormatted = formatProfit(previewProfit);
  const roiColor = getROIColor(previewROI);

  // Price warning if very different from listing
  const priceWarning = item?.listing_price ? getPriceWarning(salePrice || 0, item.listing_price) : null;
  const discount = item?.listing_price ? calculateDiscount(salePrice || 0, item.listing_price) : null;

  // Get all sales channels (from past sales + defaults)
  const allChannels = useMemo(() => getUniqueSalesChannels(items), [items]);

  // Filter channel suggestions based on input
  const filteredChannels = allChannels.filter(
    (channel) =>
      !salesChannel ||
      channel.toLowerCase().includes(salesChannel.toLowerCase())
  );

  const onSubmit = async (data: SaleFormData) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      const result = await markAsSold(id, {
        sale_price: data.sale_price,
        sale_date: data.sale_date,
        sales_channel: data.sales_channel ?? undefined,
        buyer_notes: data.buyer_notes ?? undefined,
        platform: data.platform ?? undefined,
        platform_fee: data.platform_fee ?? undefined,
        shipping_cost: data.shipping_cost ?? undefined,
      });

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

            {/* Platform Selection */}
            <Controller
              control={control}
              name="platform"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sales Platform</Text>
                  <View style={styles.platformGrid}>
                    {PLATFORM_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.platformOption,
                          value === option.value && styles.platformOptionSelected,
                        ]}
                        onPress={() => {
                          onChange(option.value);
                          setManualFeeOverride(false); // Reset manual override on platform change
                        }}
                      >
                        <Text
                          style={[
                            styles.platformOptionLabel,
                            value === option.value && styles.platformOptionLabelSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.platformOptionDesc,
                            value === option.value && styles.platformOptionDescSelected,
                          ]}
                        >
                          {option.description}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            />

            {/* Shipped Toggle (for FB/OfferUp) */}
            {platformConfig?.hasShippedRate && (
              <View style={styles.inputGroup}>
                <View style={styles.toggleRow}>
                  <View>
                    <Text style={styles.inputLabel}>Was this item shipped?</Text>
                    <Text style={styles.helperText}>
                      {isShipped
                        ? `${((platformConfig.rateShipped || 0) * 100).toFixed(1)}% fee for shipped items`
                        : `${(platformConfig.rate * 100).toFixed(1)}% fee for local pickup`}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.toggle, isShipped && styles.toggleActive]}
                    onPress={() => setIsShipped(!isShipped)}
                  >
                    <View style={[styles.toggleThumb, isShipped && styles.toggleThumbActive]} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Platform Fee (auto-calculated or manual) */}
            {platform && (
              <Controller
                control={control}
                name="platform_fee"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputGroup}>
                    <View style={styles.feeHeaderRow}>
                      <Text style={styles.inputLabel}>Platform Fee</Text>
                      {!platformConfig?.isManual && (
                        <Pressable onPress={() => setManualFeeOverride(!manualFeeOverride)}>
                          <Text style={styles.overrideLink}>
                            {manualFeeOverride ? 'Auto-calculate' : 'Override'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    <View style={styles.currencyInputContainer}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={[
                          styles.currencyInput,
                          !manualFeeOverride && !platformConfig?.isManual && styles.inputDisabled,
                        ]}
                        value={value?.toFixed(2) || '0.00'}
                        onChangeText={(text) => {
                          const num = parseFloat(text.replace(/[^0-9.]/g, ''));
                          onChange(isNaN(num) ? 0 : num);
                          setManualFeeOverride(true);
                        }}
                        keyboardType="decimal-pad"
                        editable={manualFeeOverride || platformConfig?.isManual}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    {!manualFeeOverride && !platformConfig?.isManual && (
                      <Text style={styles.helperText}>
                        Auto-calculated: {platformConfig?.description}
                      </Text>
                    )}
                  </View>
                )}
              />
            )}

            {/* Shipping Cost */}
            <Controller
              control={control}
              name="shipping_cost"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Shipping Cost (paid by you)</Text>
                  <View style={styles.currencyInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.currencyInput}
                      value={value?.toString() || ''}
                      onChangeText={(text) => {
                        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
                        onChange(isNaN(num) ? null : num);
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Only enter shipping costs you paid (not buyer-paid shipping)
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
                <Text style={styles.profitLabel}>Item Cost</Text>
                <Text style={styles.profitValueRed}>- {formatCurrency(effectiveCost)}</Text>
              </View>
              {actualPlatformFee > 0 && (
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>
                    Platform Fee {platform ? `(${PLATFORM_PRESETS[platform]?.name})` : ''}
                  </Text>
                  <Text style={styles.profitValueRed}>- {formatCurrency(actualPlatformFee)}</Text>
                </View>
              )}
              {actualShippingCost > 0 && (
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Shipping Cost</Text>
                  <Text style={styles.profitValueRed}>- {formatCurrency(actualShippingCost)}</Text>
                </View>
              )}
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
  profitValueRed: {
    fontSize: fontSize.md,
    color: colors.loss,
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
  // Platform selection styles
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  platformOption: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '30%',
  },
  platformOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  platformOptionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  platformOptionLabelSelected: {
    color: colors.background,
  },
  platformOptionDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  platformOptionDescSelected: {
    color: colors.background,
    opacity: 0.8,
  },
  // Toggle styles
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Fee header styles
  feeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  overrideLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: colors.surface,
  },
});
