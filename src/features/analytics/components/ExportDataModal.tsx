// Export Data Modal - Enhanced export modal for Analytics
// Allows users to export different data types to CSV format
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
import { fontFamily } from '@/src/constants/fonts';
import { shadows } from '@/src/constants/shadows';
import type { ExportType } from '../utils/csv-export';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'csv' | 'pdf';

export interface ExportDataModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (exportType: ExportType, format: ExportFormat) => Promise<void>;
  isExporting?: boolean;
  canExportPDF?: boolean;
  onUpgrade?: () => void;
}

interface ExportOptionConfig {
  type: ExportType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  iconColor: string;
  iconBgColor: string;
  pdfOnly?: boolean; // True if this export is PDF-only (requires Pro)
}

// ============================================================================
// Export Options Configuration
// ============================================================================

const EXPORT_OPTIONS: ExportOptionConfig[] = [
  {
    type: 'profit_loss',
    icon: 'document-text',
    label: 'Profit & Loss',
    description: 'Full financial statement for taxes',
    iconColor: '#22C55E', // Green
    iconBgColor: '#DCFCE7',
  },
  {
    type: 'analytics_summary',
    icon: 'analytics',
    label: 'Analytics Summary',
    description: 'Performance overview & rankings',
    iconColor: colors.primary,
    iconBgColor: colors.primaryLight,
    pdfOnly: true, // Requires Pro tier
  },
  {
    type: 'pallets',
    icon: 'cube',
    label: 'Pallets',
    description: 'All pallet data & inventory',
    iconColor: '#8B5CF6', // Purple
    iconBgColor: '#EDE9FE',
  },
  {
    type: 'items',
    icon: 'pricetag',
    label: 'Items',
    description: 'All items with profit data',
    iconColor: '#F97316', // Orange
    iconBgColor: '#FFEDD5',
  },
  {
    type: 'pallet_performance',
    icon: 'trophy',
    label: 'Pallet Performance',
    description: 'Analytics broken down by pallet',
    iconColor: '#14B8A6', // Teal
    iconBgColor: '#CCFBF1',
  },
  {
    type: 'type_comparison',
    icon: 'grid',
    label: 'Type Comparison',
    description: 'Analytics by source type',
    iconColor: '#EC4899', // Pink
    iconBgColor: '#FCE7F3',
  },
];

// ============================================================================
// Component
// ============================================================================

export function ExportDataModal({
  visible,
  onClose,
  onExport,
  isExporting = false,
  canExportPDF = false,
  onUpgrade,
}: ExportDataModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<ExportType | null>(null);
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');

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
            {EXPORT_OPTIONS.map((option) => {
              const isLocked = option.pdfOnly && !canExportPDF;
              return (
                <ExportOptionCard
                  key={option.type}
                  option={option}
                  selected={selectedType === option.type}
                  locked={isLocked}
                  onPress={() => {
                    if (isLocked && onUpgrade) {
                      onUpgrade();
                    } else {
                      setSelectedType(option.type);
                      // Auto-select PDF format for PDF-only exports
                      if (option.pdfOnly && canExportPDF) {
                        setFormat('pdf');
                      }
                    }
                  }}
                />
              );
            })}
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
                  <Ionicons name="lock-closed" size={12} color={colors.textDisabled} style={styles.lockIcon} />
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
  locked,
  onPress,
}: {
  option: ExportOptionConfig;
  selected: boolean;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.optionCard,
        selected && styles.optionCardSelected,
        locked && styles.optionCardLocked,
      ]}
      onPress={onPress}
    >
      <View style={[styles.optionIcon, { backgroundColor: locked ? colors.surface : option.iconBgColor }]}>
        <Ionicons name={option.icon} size={24} color={locked ? colors.textDisabled : option.iconColor} />
      </View>
      <View style={styles.optionContent}>
        <View style={styles.optionLabelRow}>
          <Text style={[styles.optionLabel, locked && styles.optionLabelLocked]}>{option.label}</Text>
          {locked && (
            <View style={styles.proBadge}>
              <Ionicons name="lock-closed" size={10} color="#8B5CF6" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
          {option.pdfOnly && !locked && (
            <View style={styles.pdfBadge}>
              <Text style={styles.pdfBadgeText}>PDF</Text>
            </View>
          )}
        </View>
        <Text style={[styles.optionDescription, locked && styles.optionDescriptionLocked]}>
          {option.description}
        </Text>
      </View>
      <Ionicons
        name={locked ? 'lock-closed' : 'chevron-forward'}
        size={20}
        color={selected ? colors.primary : colors.textDisabled}
      />
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
    fontFamily: fontFamily.bold,
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
    maxHeight: 350,
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
  optionCardLocked: {
    opacity: 0.7,
    backgroundColor: colors.surface,
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
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  optionLabelLocked: {
    color: colors.textDisabled,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  optionDescriptionLocked: {
    color: colors.textDisabled,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  pdfBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  pdfBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  formatSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  formatLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
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
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  formatOptionTextActive: {
    color: colors.background,
  },
  formatOptionTextLocked: {
    color: colors.textDisabled,
  },
  lockIcon: {
    marginLeft: spacing.xs,
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
    fontFamily: fontFamily.semibold,
    color: colors.background,
  },
});
