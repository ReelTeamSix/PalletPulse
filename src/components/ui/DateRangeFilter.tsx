// DateRangeFilter - Elegant date range selection for expense/mileage filtering
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';

export type DateRangePreset =
  | 'all'
  | 'this_month'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'this_year'
  | 'custom';

export interface DateRange {
  start: Date | null;
  end: Date | null;
  preset: DateRangePreset;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  showTotal?: boolean;
  totalAmount?: number;
  totalLabel?: string;
  /** Hide the selected range label above pills (default: false) */
  compact?: boolean;
}

// Get quarter boundaries
function getQuarterDates(year: number, quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const quarters = {
    1: { startMonth: 0, endMonth: 2 },   // Jan-Mar
    2: { startMonth: 3, endMonth: 5 },   // Apr-Jun
    3: { startMonth: 6, endMonth: 8 },   // Jul-Sep
    4: { startMonth: 9, endMonth: 11 },  // Oct-Dec
  };
  const q = quarters[quarter];
  return {
    start: new Date(year, q.startMonth, 1),
    end: new Date(year, q.endMonth + 1, 0), // Last day of end month
  };
}

// Get current quarter (1-4)
function getCurrentQuarter(): 1 | 2 | 3 | 4 {
  const month = new Date().getMonth();
  if (month <= 2) return 1;
  if (month <= 5) return 2;
  if (month <= 8) return 3;
  return 4;
}

// Calculate date range from preset
export function getDateRangeFromPreset(preset: DateRangePreset): { start: Date | null; end: Date | null } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'all':
      return { start: null, end: null };

    case 'this_month':
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
      };

    case 'q1':
      return getQuarterDates(year, 1);

    case 'q2':
      return getQuarterDates(year, 2);

    case 'q3':
      return getQuarterDates(year, 3);

    case 'q4':
      return getQuarterDates(year, 4);

    case 'this_year':
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31),
      };

    default:
      return { start: null, end: null };
  }
}

// Format date range for display
function formatDateRange(range: DateRange): string {
  const year = new Date().getFullYear();

  if (range.preset === 'all') return 'All Time';
  if (range.preset === 'this_month') {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (range.preset === 'q1') return `Q1 ${year}`;
  if (range.preset === 'q2') return `Q2 ${year}`;
  if (range.preset === 'q3') return `Q3 ${year}`;
  if (range.preset === 'q4') return `Q4 ${year}`;
  if (range.preset === 'this_year') {
    return `${year}`;
  }
  if (range.preset === 'custom' && range.start && range.end) {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = range.start.toLocaleDateString('en-US', opts);
    const endStr = range.end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }
  return 'Select Range';
}

// Check if a quarter is the current quarter
function isCurrentQuarter(quarter: 1 | 2 | 3 | 4): boolean {
  return getCurrentQuarter() === quarter;
}

const PRESETS: { value: DateRangePreset; label: string; isCurrent?: boolean }[] = [
  { value: 'all', label: 'All' },
  { value: 'this_month', label: 'Month' },
  { value: 'q1', label: 'Q1', isCurrent: isCurrentQuarter(1) },
  { value: 'q2', label: 'Q2', isCurrent: isCurrentQuarter(2) },
  { value: 'q3', label: 'Q3', isCurrent: isCurrentQuarter(3) },
  { value: 'q4', label: 'Q4', isCurrent: isCurrentQuarter(4) },
  { value: 'this_year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];

export function DateRangeFilter({
  value,
  onChange,
  showTotal = false,
  totalAmount = 0,
  totalLabel = 'Total',
  compact = false,
}: DateRangeFilterProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart, setCustomStart] = useState<Date>(value.start || new Date());
  const [customEnd, setCustomEnd] = useState<Date>(value.end || new Date());
  const [editingDate, setEditingDate] = useState<'start' | 'end' | null>(null);
  // On Android, we need to track if the picker is showing separately
  const [showPicker, setShowPicker] = useState(false);

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setCustomStart(value.start || new Date());
      setCustomEnd(value.end || new Date());
      setEditingDate(null);
      setShowPicker(false);
      setShowCustomModal(true);
    } else {
      const { start, end } = getDateRangeFromPreset(preset);
      onChange({ start, end, preset });
    }
  };

  const handleCustomConfirm = () => {
    onChange({
      start: customStart,
      end: customEnd,
      preset: 'custom',
    });
    setShowCustomModal(false);
    setShowPicker(false);
    setEditingDate(null);
  };

  const handleDateButtonPress = (which: 'start' | 'end') => {
    setEditingDate(which);
    setShowPicker(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    // On Android, the picker closes automatically after selection or cancel
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed') {
      // User cancelled
      return;
    }

    if (date) {
      if (editingDate === 'start') {
        setCustomStart(date);
      } else if (editingDate === 'end') {
        setCustomEnd(date);
      }
    }
  };

  const handleModalClose = () => {
    setShowCustomModal(false);
    setShowPicker(false);
    setEditingDate(null);
  };

  const displayLabel = formatDateRange(value);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Selected range indicator - hidden in compact mode */}
      {!compact && (
        <View style={styles.selectedRow}>
          <View style={styles.selectedIndicator}>
            <FontAwesome name="calendar" size={14} color={colors.primary} />
            <Text style={styles.selectedText}>{displayLabel}</Text>
          </View>
          {showTotal && (
            <Text style={styles.totalText}>
              {totalLabel}: <Text style={styles.totalAmount}>${totalAmount.toFixed(2)}</Text>
            </Text>
          )}
        </View>
      )}

      {/* Preset pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsContainer}
      >
        {PRESETS.map((preset) => {
          const isActive = value.preset === preset.value;
          const showCurrentDot = preset.isCurrent && !isActive;

          return (
            <Pressable
              key={preset.value}
              style={[
                styles.presetPill,
                isActive && styles.presetPillActive,
                preset.isCurrent && !isActive && styles.presetPillCurrent,
              ]}
              onPress={() => handlePresetSelect(preset.value)}
            >
              <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                {preset.label}
              </Text>
              {showCurrentDot && <View style={styles.currentDot} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Custom date range modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleModalClose}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Custom Date Range</Text>

            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Pressable
                style={[styles.dateButton, editingDate === 'start' && styles.dateButtonActive]}
                onPress={() => handleDateButtonPress('start')}
              >
                <FontAwesome name="calendar-o" size={16} color={colors.textSecondary} />
                <Text style={styles.dateButtonText}>
                  {customStart.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </Pressable>
            </View>

            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>End Date</Text>
              <Pressable
                style={[styles.dateButton, editingDate === 'end' && styles.dateButtonActive]}
                onPress={() => handleDateButtonPress('end')}
              >
                <FontAwesome name="calendar-o" size={16} color={colors.textSecondary} />
                <Text style={styles.dateButtonText}>
                  {customEnd.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </Pressable>
            </View>

            {/* iOS: Show inline spinner picker */}
            {Platform.OS === 'ios' && editingDate && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={editingDate === 'start' ? customStart : customEnd}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleModalClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmButton}
                onPress={handleCustomConfirm}
              >
                <Text style={styles.confirmButtonText}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Android: DateTimePicker opens as native dialog OUTSIDE the modal */}
      {Platform.OS === 'android' && showPicker && editingDate && (
        <DateTimePicker
          value={editingDate === 'start' ? customStart : customEnd}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

// Helper to filter items by date range
export function isWithinDateRange(
  dateString: string,
  range: DateRange
): boolean {
  if (range.preset === 'all' || (!range.start && !range.end)) {
    return true;
  }

  const date = new Date(dateString);
  // Adjust for timezone - parse as local date
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (range.start && range.end) {
    const start = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
    const end = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
    return itemDate >= start && itemDate <= end;
  }

  return true;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  containerCompact: {
    marginBottom: spacing.xs,
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  totalText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  totalAmount: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  presetsContainer: {
    gap: spacing.xs,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full || 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  presetPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetPillCurrent: {
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  presetTextActive: {
    color: colors.background,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dateSection: {
    marginBottom: spacing.md,
  },
  dateLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  dateButtonText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  pickerContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    color: colors.background,
    fontWeight: '600',
  },
});
