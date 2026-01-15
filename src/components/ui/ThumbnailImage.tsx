import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';
import { borderRadius } from '@/src/constants/spacing';

interface ThumbnailImageProps {
  uri?: string | null;
  size?: number;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackColor?: string;
}

export function ThumbnailImage({
  uri,
  size = 56,
  fallbackIcon = 'cube-outline',
  fallbackColor = colors.textDisabled,
}: ThumbnailImageProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: borderRadius.md },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: borderRadius.md },
      ]}
    >
      <Ionicons name={fallbackIcon} size={size * 0.5} color={fallbackColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface,
  },
  fallback: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
