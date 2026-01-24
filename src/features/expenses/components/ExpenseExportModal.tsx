// Expense Export Modal - Export modal for Expenses screen
// Allows users to export expenses, mileage, and P&L summary
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';

// ============================================================================
// Types
// ============================================================================

export type ExpenseExportType = 'expenses' | 'mileage' | 'profit_loss';
export type ExportFormat = 'csv' | 'pdf';

export interface ExpenseExportModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (exportType: ExpenseExportType, format: ExportFormat) => Promise<void>;
  isExporting?: boolean;
  canExportPDF?: boolean;
  onUpgrade?: () => void;
}

interface ExportOptionConfig {
  type: ExpenseExportType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  iconColor: string;
  iconBgColor: string;
}

// ============================================================================
// Export Options Configuration
// ============================================================================

const EXPORT_OPTIONS: ExportOptionConfig[] = [
  {
    type: 'expenses',
    icon: 'receipt',
    label: 'Expenses',
    description: 'All business expenses by category',
    iconColor: colors.loss,
    iconBgColor: colors.loss + '15',
  },
  {
    type: 'mileage',
    icon: 'car',
    label: 'Mileage Trips',
    description: 'All trips with deduction calculations',
    iconColor: colors.primary,
    iconBgColor: colors.primaryLight,
  },
  {
    type: 'profit_loss',
    icon: 'document-text',
    label: 'Profit & Loss Summary',
    description: 'Comprehensive tax-ready summary',
    iconColor: '#22C55E',
    iconBgColor: '#DCFCE7',
  },
];

// ============================================================================
// Component
// ============================================================================

export function ExpenseExportModal({
  visible,
  onClose,
  onExport,
  isExporting = false,
  canExportPDF = false,
  onUpgrade,
}: ExpenseExportModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<ExpenseExportType | null>(null);
  const [format, setFormat] = useState<ExportFormat>('csv');

  const handlePDFPress = () => {
    if (canExportPDF) {
      setFormat('pdf');
    } else if (onUpgrade) {
      onUpgrade();
    }
  };

  const handleExport = async () => {
    if (!selectedType) return;
    await onExport(selectedType, format);
  };

  const handleClose = () => {
    setSelectedType(null);
    setFormat('csv');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Export Data</Text>
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Export Options */}
          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsContainer}
            showsVerticalScrollIndicator={false}
          >
            {EXPORT_OPTIONS.map((option) => (
              <ExportOptionCard
                key={option.type}
                option={option}
                selected={selectedType === option.type}
                onPress={() => setSelectedType(option.type)}
              />
            ))}
          </ScrollView>

          {/* Format Selector */}
          <View style={styles.formatSection}>
            <Text style={styles.formatLabel}>FORMAT</Text>
            <View style={styles.formatToggle}>
              <Pressable
                style={[
                  styles.formatOption,
                  format === 'csv' && styles.formatOptionActive,
                ]}
                onPress={() => setFormat('csv')}
              >
                <Text
                  style={[
                    styles.formatOptionText,
                    format === 'csv' && styles.formatOptionTextActive,
                  ]}
                >
                  CSV
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.formatOption,
                  format === 'pdf' && canExportPDF && styles.formatOptionActive,
                  !canExportPDF && styles.formatOptionLocked,
                ]}
                onPress={handlePDFPress}
              >
                <Text
                  style={[
                    styles.formatOptionText,
                    format === 'pdf' && canExportPDF && styles.formatOptionTextActive,
                    !canExportPDF && styles.formatOptionTextLocked,
                  ]}
                >
                  PDF
                </Text>
                {!canExportPDF && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Generate Report Button */}
          <Pressable
            style={[
              styles.exportButton,
              (!selectedType || isExporting) && styles.exportButtonDisabled,
            ]}
            onPress={handleExport}
            disabled={!selectedType || isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color={colors.background} />
                <Text style={styles.exportButtonText}>Generate Report</Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// Export Option Card Component
// ============================================================================

function ExportOptionCard({
  option,
  selected,
  onPress,
}: {
  option: ExportOptionConfig;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={onPress}
    >
      <View style={[styles.optionIcon, { backgroundColor: option.iconBgColor }]}>
        <Ionicons name={option.icon} size={24} color={option.iconColor} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionLabel}>{option.label}</Text>
        <Text style={styles.optionDescription}>{option.description}</Text>
      </View>
      <View style={styles.radioOuter}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    maxHeight: '90%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsScroll: {
    maxHeight: 280,
  },
  optionsContainer: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.sm,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  formatSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  formatLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  formatToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  formatOption: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  formatOptionActive: {
    backgroundColor: colors.primary,
  },
  formatOptionLocked: {
    opacity: 0.7,
  },
  formatOptionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  formatOptionTextActive: {
    color: colors.background,
  },
  formatOptionTextLocked: {
    color: colors.textDisabled,
  },
  proBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.5,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  exportButtonDisabled: {
    backgroundColor: colors.primary + '60',
  },
  exportButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
});
