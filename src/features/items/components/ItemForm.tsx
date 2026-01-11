// ItemForm Component - Form for creating and editing items
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  LayoutChangeEvent,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Button, PhotoPicker, PhotoItem } from '@/src/components/ui';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import {
  itemFormSchema,
  ItemFormData,
  ITEM_CONDITION_OPTIONS,
  ITEM_STATUS_OPTIONS,
  getUniqueStorageLocations,
  getUniqueItemSourceNames,
} from '../schemas/item-form-schema';
import { Item, SalesPlatform } from '@/src/types/database';
import { PLATFORM_PRESETS } from '@/src/features/sales/schemas/sale-form-schema';
import { formatCurrency } from '@/src/lib/profit-utils';
import { useItemsStore } from '@/src/stores/items-store';
import { usePalletsStore } from '@/src/stores/pallets-store';

interface ItemFormProps {
  initialValues?: Partial<ItemFormData>;
  onSubmit: (data: ItemFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  item?: Item; // For editing
  palletId?: string | null; // Pre-selected pallet
  photos?: PhotoItem[]; // Current photos
  onPhotosChange?: (photos: PhotoItem[]) => void; // Photo update callback
  maxPhotos?: number; // Max photos allowed (tier-based)
}

export function ItemForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Item',
  item,
  palletId,
  photos = [],
  onPhotosChange,
  maxPhotos = 5,
}: ItemFormProps) {
  const [showStorageSuggestions, setShowStorageSuggestions] = useState(false);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showPalletPicker, setShowPalletPicker] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<PhotoItem[]>(photos);

  // Sync localPhotos when photos prop changes (e.g., after async load in edit mode)
  useEffect(() => {
    if (photos.length > 0 && localPhotos.length === 0) {
      setLocalPhotos(photos);
    }
  }, [photos]);

  // Text state for price fields to allow decimal input
  const [retailPriceText, setRetailPriceText] = useState(
    item?.retail_price?.toString() ?? initialValues?.retail_price?.toString() ?? ''
  );
  const [listingPriceText, setListingPriceText] = useState(
    item?.listing_price?.toString() ?? initialValues?.listing_price?.toString() ?? ''
  );
  const [purchaseCostText, setPurchaseCostText] = useState(
    item?.purchase_cost?.toString() ?? initialValues?.purchase_cost?.toString() ?? ''
  );
  // Sale fields text state (for sold items)
  const [salePriceText, setSalePriceText] = useState(
    item?.sale_price?.toString() ?? ''
  );
  const [platformFeeText, setPlatformFeeText] = useState(
    item?.platform_fee?.toString() ?? ''
  );
  const [shippingCostText, setShippingCostText] = useState(
    item?.shipping_cost?.toString() ?? ''
  );
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [saleDetailsSectionY, setSaleDetailsSectionY] = useState<number | null>(null);

  // Refs for auto-scrolling to Sale Details section
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledToSaleDetails = useRef(false);

  const { items } = useItemsStore();
  const { pallets, getPalletById } = usePalletsStore();

  // Get pallet info if linking to one
  const linkedPallet = useMemo(() => {
    const id = item?.pallet_id ?? palletId ?? initialValues?.pallet_id;
    return id ? getPalletById(id) : null;
  }, [item?.pallet_id, palletId, initialValues?.pallet_id, pallets]);

  // Get unique values from existing items for autocomplete
  const uniqueStorageLocations = useMemo(() => getUniqueStorageLocations(items), [items]);
  const uniqueSourceNames = useMemo(() => getUniqueItemSourceNames(items), [items]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: item?.name ?? initialValues?.name ?? '',
      description: item?.description ?? initialValues?.description ?? null,
      quantity: item?.quantity ?? initialValues?.quantity ?? 1,
      condition: item?.condition ?? initialValues?.condition ?? 'used_good',
      retail_price: item?.retail_price ?? initialValues?.retail_price ?? null,
      listing_price: item?.listing_price ?? initialValues?.listing_price ?? null,
      purchase_cost: item?.purchase_cost ?? initialValues?.purchase_cost ?? null,
      storage_location: item?.storage_location ?? initialValues?.storage_location ?? null,
      status: item?.status ?? initialValues?.status ?? 'unlisted',
      barcode: item?.barcode ?? initialValues?.barcode ?? null,
      source_name: item?.source_name ?? initialValues?.source_name ?? null,
      notes: item?.notes ?? initialValues?.notes ?? null,
      pallet_id: item?.pallet_id ?? palletId ?? initialValues?.pallet_id ?? null,
      // Sale fields
      sale_price: item?.sale_price ?? null,
      sale_date: item?.sale_date ?? null,
      platform: item?.platform ?? null,
      platform_fee: item?.platform_fee ?? null,
      shipping_cost: item?.shipping_cost ?? null,
    } as ItemFormData,
  });

  const watchStorageLocation = watch('storage_location');
  const watchSourceName = watch('source_name');
  const watchCondition = watch('condition');
  const watchPalletId = watch('pallet_id') as string | null | undefined;
  const watchStatus = watch('status');
  const watchPlatform = watch('platform') as SalesPlatform | null | undefined;

  // Get selected pallet (from form value)
  const selectedPallet = useMemo(() => {
    return watchPalletId ? getPalletById(watchPalletId) : null;
  }, [watchPalletId, pallets, getPalletById]);

  // Check if pallet was pre-selected (came from pallet detail screen)
  const isPalletPreSelected = !!palletId;

  // Check if this is a pallet item (either pre-selected or user-selected)
  const isPalletItem = !!selectedPallet || !!linkedPallet;

  // Filter suggestions based on current input
  const filteredStorageSuggestions = uniqueStorageLocations.filter(
    (s) => !watchStorageLocation || s.toLowerCase().includes(watchStorageLocation.toLowerCase())
  );

  const filteredSourceSuggestions = uniqueSourceNames.filter(
    (s) => !watchSourceName || s.toLowerCase().includes(watchSourceName.toLowerCase())
  );

  // Handle photo changes
  const handlePhotosChange = (newPhotos: PhotoItem[]) => {
    setLocalPhotos(newPhotos);
    onPhotosChange?.(newPhotos);
  };

  // Auto-scroll to Sale Details section when editing a sold item
  useEffect(() => {
    if (
      item?.status === 'sold' &&
      saleDetailsSectionY !== null &&
      !hasScrolledToSaleDetails.current &&
      scrollViewRef.current
    ) {
      // Small delay to ensure layout is complete
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: saleDetailsSectionY - 100, // Offset to show some context above
          animated: true,
        });
        hasScrolledToSaleDetails.current = true;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [item?.status, saleDetailsSectionY]);

  // Handle Sale Details section layout to get its position
  const handleSaleDetailsLayout = (event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    setSaleDetailsSectionY(y);
  };

  // Sync all text states to form values before submit
  // This ensures values are captured even if user didn't blur the field
  const syncTextStatesToForm = () => {
    const retailNum = parseFloat(retailPriceText) || null;
    const listingNum = parseFloat(listingPriceText) || null;
    const purchaseNum = parseFloat(purchaseCostText) || null;

    setValue('retail_price', retailNum);
    setValue('listing_price', listingNum);
    setValue('purchase_cost', purchaseNum);

    // Sync sale fields if editing a sold item
    if (watchStatus === 'sold') {
      const saleNum = parseFloat(salePriceText) || null;
      const platformFeeNum = parseFloat(platformFeeText) || null;
      const shippingNum = parseFloat(shippingCostText) || null;
      setValue('sale_price', saleNum);
      setValue('platform_fee', platformFeeNum);
      setValue('shipping_cost', shippingNum);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Pallet Link Banner (when pre-selected) */}
        {isPalletPreSelected && linkedPallet && (
          <View style={styles.palletBanner}>
            <Text style={styles.palletBannerText}>
              Adding to: {linkedPallet.name}
            </Text>
          </View>
        )}

        {/* Pallet Selector (when NOT pre-selected and pallets exist) */}
        {!isPalletPreSelected && pallets.length > 0 && (
          <View style={styles.palletSelector}>
            <Text style={styles.label}>Link to Pallet (Optional)</Text>
            <Controller
              control={control}
              name="pallet_id"
              render={({ field: { onChange, value } }) => (
                <>
                  <Pressable
                    style={styles.palletPickerButton}
                    onPress={() => setShowPalletPicker(!showPalletPicker)}
                  >
                    <Text style={[
                      styles.palletPickerText,
                      !value && styles.palletPickerPlaceholder
                    ]}>
                      {selectedPallet ? selectedPallet.name : 'Individual Item (No Pallet)'}
                    </Text>
                    <Text style={styles.palletPickerArrow}>
                      {showPalletPicker ? '▲' : '▼'}
                    </Text>
                  </Pressable>
                  {showPalletPicker && (
                    <View style={styles.palletPickerDropdown}>
                      <Pressable
                        style={[
                          styles.palletOption,
                          !value && styles.palletOptionSelected
                        ]}
                        onPress={() => {
                          onChange(null);
                          setShowPalletPicker(false);
                        }}
                      >
                        <Text style={styles.palletOptionText}>Individual Item (No Pallet)</Text>
                        {!value && <Text style={styles.palletOptionCheck}>✓</Text>}
                      </Pressable>
                      {pallets.map((p) => (
                        <Pressable
                          key={p.id}
                          style={[
                            styles.palletOption,
                            value === p.id && styles.palletOptionSelected
                          ]}
                          onPress={() => {
                            onChange(p.id);
                            setShowPalletPicker(false);
                          }}
                        >
                          <Text style={styles.palletOptionText}>{p.name}</Text>
                          {value === p.id && <Text style={styles.palletOptionCheck}>✓</Text>}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}
            />
          </View>
        )}

        {/* Photos Section */}
        <Text style={styles.sectionTitle}>Photos</Text>
        <PhotoPicker
          photos={localPhotos}
          onPhotosChange={handlePhotosChange}
          maxPhotos={maxPhotos}
          disabled={isLoading}
        />

        {/* Basic Info Section */}
        <Text style={styles.sectionTitle}>Basic Info</Text>

        {/* Item Name */}
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Item Name *"
              placeholder="e.g., Nike Air Max, Kitchen Aid Mixer"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
              autoCapitalize="words"
            />
          )}
        />

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Description"
              placeholder="Color, size, model, notable features..."
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
              numberOfLines={2}
              inputStyle={styles.descriptionInput}
            />
          )}
        />

        {/* Quantity and Condition Row */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Controller
              control={control}
              name="quantity"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Quantity"
                  placeholder="1"
                  value={value?.toString() || '1'}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10) || 1;
                    onChange(num);
                  }}
                  onBlur={onBlur}
                  error={errors.quantity?.message}
                  keyboardType="number-pad"
                />
              )}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Condition</Text>
            <Controller
              control={control}
              name="condition"
              render={({ field: { onChange, value } }) => (
                <View style={styles.conditionPicker}>
                  <Pressable
                    style={styles.conditionButton}
                    onPress={() => {
                      // Cycle through conditions
                      const currentIndex = ITEM_CONDITION_OPTIONS.findIndex(o => o.value === value);
                      const nextIndex = (currentIndex + 1) % ITEM_CONDITION_OPTIONS.length;
                      onChange(ITEM_CONDITION_OPTIONS[nextIndex].value);
                    }}
                  >
                    <Text style={styles.conditionButtonText}>
                      {ITEM_CONDITION_OPTIONS.find(o => o.value === value)?.label || 'Select'}
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        </View>

        {/* Condition Options (scrollable) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.conditionScroll}
          contentContainerStyle={styles.conditionScrollContent}
        >
          {ITEM_CONDITION_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.conditionChip,
                watchCondition === option.value && styles.conditionChipSelected,
              ]}
              onPress={() => setValue('condition', option.value)}
            >
              <Text
                style={[
                  styles.conditionChipText,
                  watchCondition === option.value && styles.conditionChipTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Pricing Section */}
        <Text style={styles.sectionTitle}>Pricing</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Controller
              control={control}
              name="retail_price"
              render={({ field: { onChange, onBlur } }) => (
                <Input
                  label="Retail Price"
                  placeholder="MSRP"
                  value={retailPriceText}
                  onChangeText={(text) => {
                    // Allow digits and one decimal point
                    const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setRetailPriceText(cleaned);
                  }}
                  onBlur={() => {
                    const num = parseFloat(retailPriceText) || null;
                    onChange(num);
                    // Format to 2 decimal places if has value
                    if (num !== null) {
                      setRetailPriceText(num.toString());
                    }
                    onBlur();
                  }}
                  error={errors.retail_price?.message}
                  keyboardType="decimal-pad"
                  leftIcon="dollar"
                  hint="Original price"
                />
              )}
            />
          </View>
          <View style={styles.halfField}>
            <Controller
              control={control}
              name="listing_price"
              render={({ field: { onChange, onBlur } }) => (
                <Input
                  label="Listing Price"
                  placeholder="Your price"
                  value={listingPriceText}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setListingPriceText(cleaned);
                  }}
                  onBlur={() => {
                    const num = parseFloat(listingPriceText) || null;
                    onChange(num);
                    if (num !== null) {
                      setListingPriceText(num.toString());
                    }
                    onBlur();
                  }}
                  error={errors.listing_price?.message}
                  keyboardType="decimal-pad"
                  leftIcon="dollar"
                  hint="Asking price"
                />
              )}
            />
          </View>
        </View>

        {/* Purchase Cost (only for individual items) */}
        {!isPalletItem && (
          <Controller
            control={control}
            name="purchase_cost"
            render={({ field: { onChange, onBlur } }) => (
              <Input
                label="Purchase Cost"
                placeholder="What you paid"
                value={purchaseCostText}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setPurchaseCostText(cleaned);
                }}
                onBlur={() => {
                  const num = parseFloat(purchaseCostText) || null;
                  onChange(num);
                  if (num !== null) {
                    setPurchaseCostText(num.toString());
                  }
                  onBlur();
                }}
                error={errors.purchase_cost?.message}
                keyboardType="decimal-pad"
                leftIcon="dollar"
                hint="Cost for this item"
              />
            )}
          />
        )}

        {/* Organization Section */}
        <Text style={styles.sectionTitle}>Organization</Text>

        {/* Storage Location with autocomplete */}
        <View style={[styles.autocompleteContainer, { zIndex: 20 }]}>
          <Controller
            control={control}
            name="storage_location"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Storage Location"
                placeholder="e.g., Shelf A, Bin 3, Garage"
                value={value || ''}
                onChangeText={(text) => {
                  onChange(text);
                  setShowStorageSuggestions(true);
                }}
                onBlur={() => {
                  onBlur();
                  setTimeout(() => setShowStorageSuggestions(false), 200);
                }}
                onFocus={() => setShowStorageSuggestions(true)}
                error={errors.storage_location?.message}
                autoCapitalize="words"
              />
            )}
          />
          {showStorageSuggestions && filteredStorageSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              {filteredStorageSuggestions.slice(0, 4).map((suggestion) => (
                <Pressable
                  key={suggestion}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setValue('storage_location', suggestion);
                    setShowStorageSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Barcode */}
        <Controller
          control={control}
          name="barcode"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Barcode / SKU"
              placeholder="Scan or enter barcode"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.barcode?.message}
              autoCapitalize="none"
              hint="UPC, EAN, or custom SKU"
            />
          )}
        />

        {/* Source (only for individual items) */}
        {!isPalletItem && (
          <View style={[styles.autocompleteContainer, { zIndex: 10 }]}>
            <Controller
              control={control}
              name="source_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Source"
                  placeholder="e.g., Goodwill, Garage Sale, Estate Sale"
                  value={value || ''}
                  onChangeText={(text) => {
                    onChange(text);
                    setShowSourceSuggestions(true);
                  }}
                  onBlur={() => {
                    onBlur();
                    setTimeout(() => setShowSourceSuggestions(false), 200);
                  }}
                  onFocus={() => setShowSourceSuggestions(true)}
                  error={errors.source_name?.message}
                  autoCapitalize="words"
                  hint="Where you found this item"
                />
              )}
            />
            {showSourceSuggestions && filteredSourceSuggestions.length > 0 && (
              <View style={styles.suggestions}>
                {filteredSourceSuggestions.slice(0, 4).map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setValue('source_name', suggestion);
                      setShowSourceSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Notes"
              placeholder="Any additional notes..."
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.notes?.message}
              multiline
              numberOfLines={3}
              inputStyle={styles.notesInput}
            />
          )}
        />

        {/* Sale Details (editable when editing a sold item) - placed near save button */}
        {item?.status === 'sold' && (
          <View style={styles.saleDetailsSection} onLayout={handleSaleDetailsLayout}>
            <Text style={styles.saleDetailsTitle}>Sale Details</Text>

            {/* Status Selector - allows changing from sold back to listed */}
            <View style={styles.statusSelector}>
              <Text style={styles.label}>Status</Text>
              <Controller
                control={control}
                name="status"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Pressable
                      style={styles.statusPickerButton}
                      onPress={() => setShowStatusPicker(!showStatusPicker)}
                    >
                      <Text style={styles.statusPickerText}>
                        {ITEM_STATUS_OPTIONS.find(o => o.value === value)?.label || value}
                      </Text>
                      <Text style={styles.statusPickerArrow}>
                        {showStatusPicker ? '▲' : '▼'}
                      </Text>
                    </Pressable>
                    {showStatusPicker && (
                      <View style={styles.statusPickerDropdown}>
                        {ITEM_STATUS_OPTIONS.map((option) => (
                          <Pressable
                            key={option.value}
                            style={[
                              styles.statusOption,
                              value === option.value && styles.statusOptionSelected
                            ]}
                            onPress={() => {
                              onChange(option.value);
                              setShowStatusPicker(false);
                            }}
                          >
                            <Text style={styles.statusOptionText}>{option.label}</Text>
                            {value === option.value && <Text style={styles.statusOptionCheck}>✓</Text>}
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </>
                )}
              />
              <Text style={styles.statusHint}>
                Change to "Listed" to undo the sale
              </Text>
            </View>

            {/* Only show sale fields if status is still 'sold' */}
            {watchStatus === 'sold' && (
              <>
                {/* Sale Price */}
                <Controller
                  control={control}
                  name="sale_price"
                  render={({ field: { onChange, onBlur } }) => (
                    <Input
                      label="Sale Price"
                      placeholder="Final sale price"
                      value={salePriceText}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        setSalePriceText(cleaned);
                      }}
                      onBlur={() => {
                        const num = parseFloat(salePriceText) || null;
                        onChange(num);
                        if (num !== null) {
                          setSalePriceText(num.toString());
                        }
                        onBlur();
                      }}
                      error={errors.sale_price?.message}
                      keyboardType="decimal-pad"
                      leftIcon="dollar"
                    />
                  )}
                />

                {/* Platform Selector */}
                <View style={styles.platformSelector}>
                  <Text style={styles.label}>Sales Platform</Text>
                  <Controller
                    control={control}
                    name="platform"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Pressable
                          style={styles.platformPickerButton}
                          onPress={() => setShowPlatformPicker(!showPlatformPicker)}
                        >
                          <Text style={[
                            styles.platformPickerText,
                            !value && styles.platformPickerPlaceholder
                          ]}>
                            {value ? PLATFORM_PRESETS[value]?.name || value : 'Select platform'}
                          </Text>
                          <Text style={styles.platformPickerArrow}>
                            {showPlatformPicker ? '▲' : '▼'}
                          </Text>
                        </Pressable>
                        {showPlatformPicker && (
                          <ScrollView style={styles.platformPickerDropdown} nestedScrollEnabled>
                            {Object.entries(PLATFORM_PRESETS).map(([key, preset]) => (
                              <Pressable
                                key={key}
                                style={[
                                  styles.platformOption,
                                  value === key && styles.platformOptionSelected
                                ]}
                                onPress={() => {
                                  onChange(key as SalesPlatform);
                                  setShowPlatformPicker(false);
                                }}
                              >
                                <View style={styles.platformOptionContent}>
                                  <Text style={styles.platformOptionText}>{preset.name}</Text>
                                  <Text style={styles.platformOptionDesc}>{preset.description}</Text>
                                </View>
                                {value === key && <Text style={styles.platformOptionCheck}>✓</Text>}
                              </Pressable>
                            ))}
                          </ScrollView>
                        )}
                      </>
                    )}
                  />
                </View>

                {/* Platform Fee and Shipping Row */}
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Controller
                      control={control}
                      name="platform_fee"
                      render={({ field: { onChange, onBlur } }) => (
                        <Input
                          label="Platform Fee"
                          placeholder="0.00"
                          value={platformFeeText}
                          onChangeText={(text) => {
                            const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                            setPlatformFeeText(cleaned);
                          }}
                          onBlur={() => {
                            const num = parseFloat(platformFeeText) || null;
                            onChange(num);
                            if (num !== null) {
                              setPlatformFeeText(num.toString());
                            }
                            onBlur();
                          }}
                          error={errors.platform_fee?.message}
                          keyboardType="decimal-pad"
                          leftIcon="dollar"
                        />
                      )}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Controller
                      control={control}
                      name="shipping_cost"
                      render={({ field: { onChange, onBlur } }) => (
                        <Input
                          label="Shipping Cost"
                          placeholder="0.00"
                          value={shippingCostText}
                          onChangeText={(text) => {
                            const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                            setShippingCostText(cleaned);
                          }}
                          onBlur={() => {
                            const num = parseFloat(shippingCostText) || null;
                            onChange(num);
                            if (num !== null) {
                              setShippingCostText(num.toString());
                            }
                            onBlur();
                          }}
                          error={errors.shipping_cost?.message}
                          keyboardType="decimal-pad"
                          leftIcon="dollar"
                        />
                      )}
                    />
                  </View>
                </View>

                {/* Sale Date */}
                <Controller
                  control={control}
                  name="sale_date"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Sale Date"
                      placeholder="YYYY-MM-DD"
                      value={value || ''}
                      onChangeText={onChange}
                      hint="Date format: YYYY-MM-DD"
                    />
                  )}
                />
              </>
            )}
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            onPress={onCancel}
            variant="outline"
            style={styles.cancelButton}
            disabled={isLoading}
          />
          <Button
            title={submitLabel}
            onPress={() => {
              syncTextStatesToForm();
              handleSubmit((data) => onSubmit(data as ItemFormData))();
            }}
            style={styles.submitButton}
            loading={isLoading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2, // Extra padding so buttons can scroll above keyboard
  },
  palletBanner: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  palletBannerText: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  saleDetailsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.profit,
  },
  saleDetailsTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.profit,
    marginBottom: spacing.sm,
  },
  saleDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  saleDetailItem: {
    minWidth: '45%',
    marginBottom: spacing.xs,
  },
  saleDetailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  saleDetailValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  palletSelector: {
    marginBottom: spacing.md,
  },
  palletPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  palletPickerText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  palletPickerPlaceholder: {
    color: colors.textSecondary,
  },
  palletPickerArrow: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  palletPickerDropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: 200,
  },
  palletOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  palletOptionSelected: {
    backgroundColor: colors.primary + '10',
  },
  palletOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  palletOptionCheck: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  descriptionInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  conditionPicker: {
    marginBottom: spacing.sm,
  },
  conditionButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  conditionButtonText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  conditionScroll: {
    marginBottom: spacing.md,
  },
  conditionScrollContent: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  conditionChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conditionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  conditionChipText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  conditionChipTextSelected: {
    color: colors.background,
    fontWeight: '600',
  },
  autocompleteContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  suggestions: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  suggestionItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  // Status picker styles
  statusSelector: {
    marginBottom: spacing.md,
  },
  statusPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statusPickerText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  statusPickerArrow: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusPickerDropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusOptionSelected: {
    backgroundColor: colors.primary + '10',
  },
  statusOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  statusOptionCheck: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  statusHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  // Platform picker styles
  platformSelector: {
    marginBottom: spacing.md,
  },
  platformPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  platformPickerText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  platformPickerPlaceholder: {
    color: colors.textSecondary,
  },
  platformPickerArrow: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  platformPickerDropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: 300,
  },
  platformOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  platformOptionSelected: {
    backgroundColor: colors.primary + '10',
  },
  platformOptionContent: {
    flex: 1,
  },
  platformOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  platformOptionDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  platformOptionCheck: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
