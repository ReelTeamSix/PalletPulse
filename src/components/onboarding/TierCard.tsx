// TierCard Component - Research-backed pricing tier card for onboarding
// Based on conversion optimization research from Orbix Studio, Smashing Magazine, and RevenueCat
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '@/src/constants/spacing';
import { fontFamily } from '@/src/constants/fonts';

export type TierType = 'free' | 'starter' | 'pro';

export interface TierFeature {
  text: string;
  included: boolean;
}

export interface TierCardProps {
  tier: TierType;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  features: TierFeature[];
  monthlyPrice: number | null;
  annualPrice: number | null;
  badge?: 'most_popular' | 'best_value' | null;
  isSelected: boolean;
  onSelect: () => void;
}

// Calculate annual savings percentage
function calculateSavings(monthly: number, annual: number): number {
  const yearlyIfMonthly = monthly * 12;
  const savings = ((yearlyIfMonthly - annual) / yearlyIfMonthly) * 100;
  return Math.round(savings);
}

export function TierCard({
  tier,
  title,
  subtitle,
  icon,
  features,
  monthlyPrice,
  annualPrice,
  badge,
  isSelected,
  onSelect,
}: TierCardProps) {
  const isPaid = monthlyPrice !== null && monthlyPrice > 0;
  const savingsPercent = monthlyPrice && annualPrice
    ? calculateSavings(monthlyPrice, annualPrice)
    : 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        badge === 'most_popular' && styles.cardPopular,
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Badge */}
      {badge && (
        <View style={[
          styles.badge,
          badge === 'most_popular' ? styles.badgePopular : styles.badgeBestValue,
        ]}>
          <Text style={styles.badgeText}>
            {badge === 'most_popular' ? 'MOST POPULAR' : 'BEST VALUE'}
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            {feature.included ? (
              <Ionicons name="checkmark" size={16} color={colors.profit} style={styles.featureIcon} />
            ) : (
              <View style={styles.emptyCircle} />
            )}
            <Text style={[
              styles.featureText,
              !feature.included && styles.featureTextDisabled,
            ]}>
              {feature.text}
            </Text>
          </View>
        ))}
      </View>

      {/* Pricing */}
      {isPaid ? (
        <View style={styles.pricing}>
          <View style={styles.priceToggle}>
            <View style={styles.priceOption}>
              <Text style={styles.priceAmount}>${monthlyPrice?.toFixed(2)}</Text>
              <Text style={styles.pricePeriod}>/mo</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={[styles.priceOption, styles.priceOptionHighlighted]}>
              <View style={styles.priceWithBadge}>
                <Text style={[styles.priceAmount, styles.priceAmountHighlighted]}>
                  ${annualPrice?.toFixed(2)}
                </Text>
                <Text style={[styles.pricePeriod, styles.pricePeriodHighlighted]}>/yr</Text>
              </View>
              {savingsPercent > 0 && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>Save {savingsPercent}%</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.trialText}>Try FREE for 7 days · No credit card</Text>
        </View>
      ) : (
        <View style={styles.pricing}>
          <Text style={styles.freeText}>FREE FOREVER</Text>
        </View>
      )}

      {/* Selection indicator */}
      <View style={[styles.selectionIndicator, isSelected && styles.selectionIndicatorActive]}>
        {isSelected && (
          <Ionicons name="checkmark" size={14} color={colors.background} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F8FBFF',
  },
  cardPopular: {
    borderColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgePopular: {
    backgroundColor: colors.primary,
  },
  badgeBestValue: {
    backgroundColor: colors.profit,
  },
  badgeText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as any,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as any,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginLeft: 36 + spacing.sm, // iconContainer width + margin
  },
  features: {
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featureIcon: {
    width: 20,
    marginRight: spacing.sm,
  },
  emptyCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.textDisabled,
    marginRight: spacing.sm,
    marginLeft: 3,
  },
  featureText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    flex: 1,
  },
  featureTextDisabled: {
    color: colors.textDisabled,
    fontFamily: fontFamily.regular,
  },
  pricing: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  priceOption: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priceOptionHighlighted: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priceDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  priceWithBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as any,
    fontFamily: fontFamily.bold,
    color: colors.textSecondary,
  },
  priceAmountHighlighted: {
    color: colors.textPrimary,
  },
  pricePeriod: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  pricePeriodHighlighted: {
    color: colors.textPrimary,
  },
  savingsBadge: {
    backgroundColor: colors.profit,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  savingsText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as any,
    fontFamily: fontFamily.semibold,
    color: colors.background,
  },
  trialText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  freeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as any,
    fontFamily: fontFamily.bold,
    color: colors.profit,
    paddingVertical: spacing.sm,
  },
  selectionIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicatorActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});

export default TierCard;
