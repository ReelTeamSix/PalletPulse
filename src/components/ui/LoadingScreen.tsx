import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/src/constants/colors';

/**
 * Full-screen centered loading indicator
 * Use this for initial data loading on tab screens
 * Ensures consistent loading position across all screens
 */
export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
});
