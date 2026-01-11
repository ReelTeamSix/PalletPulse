import { StyleSheet, View, Text } from 'react-native';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize } from '@/src/constants/spacing';

export default function ItemsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Items</Text>
      <Text style={styles.subtitle}>All your inventory items</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          All items from pallets and individual sources will appear here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
