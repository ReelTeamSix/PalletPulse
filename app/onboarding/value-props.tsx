// Value Props Carousel - Show key features before commitment
// Research: Progressive disclosure, 1 concept per card, skippable
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '@/src/constants/spacing';
import { shadows } from '@/src/constants/shadows';

const { width } = Dimensions.get('window');

interface ValueProp {
  icon: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  title: string;
  description: string;
  highlight: string;
  highlightBg: string;
  highlightColor: string;
}

const VALUE_PROPS: ValueProp[] = [
  {
    icon: 'cash-outline',
    iconBgColor: colors.successBackground,
    iconColor: colors.profit,
    title: 'Track Every Sale',
    description: 'Log your sales and see profit instantly. No more guessing if you made money on your inventory.',
    highlight: 'Know your real profit',
    highlightBg: colors.successBackground,
    highlightColor: colors.profit,
  },
  {
    icon: 'layers-outline',
    iconBgColor: colors.primaryLight,
    iconColor: colors.primary,
    title: 'Manage Inventory',
    description: 'Track items from pallet to sale. See what\'s listed, sold, and sitting too long.',
    highlight: 'Never lose track',
    highlightBg: colors.successBackground,
    highlightColor: colors.profit,
  },
  {
    icon: 'trending-up-outline',
    iconBgColor: colors.warningBackground,
    iconColor: colors.warning,
    title: 'Make Smarter Decisions',
    description: 'See which sources give you the best ROI. Double down on what works.',
    highlight: 'Data-driven flipping',
    highlightBg: colors.successBackground,
    highlightColor: colors.profit,
  },
];

export default function ValuePropsScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < VALUE_PROPS.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.push('/onboarding/quick-setup');
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/quick-setup');
  };

  const isLastSlide = currentIndex === VALUE_PROPS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {VALUE_PROPS.map((prop, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.slideContent}>
              <View style={[styles.iconContainer, { backgroundColor: prop.iconBgColor }]}>
                <Ionicons name={prop.icon} size={52} color={prop.iconColor} />
              </View>
              <Text style={styles.title}>{prop.title}</Text>
              <Text style={styles.description}>{prop.description}</Text>
              <View style={[styles.highlightContainer, { backgroundColor: prop.highlightBg }]}>
                <Ionicons name="checkmark-circle" size={20} color={prop.highlightColor} />
                <Text style={[styles.highlight, { color: prop.highlightColor }]}>{prop.highlight}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Progress Dots */}
      <View style={styles.pagination}>
        {VALUE_PROPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Navigation Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Continue' : 'Next'}
          </Text>
          <Ionicons
            name={isLastSlide ? 'checkmark' : 'arrow-forward'}
            size={20}
            color={colors.background}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium as any,
  },
  carousel: {
    flex: 1,
  },
  slide: {
    width: width,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  slideContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as any,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  highlightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  highlight: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    color: colors.profit,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    ...shadows.md,
  },
  nextButtonText: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as any,
  },
});
