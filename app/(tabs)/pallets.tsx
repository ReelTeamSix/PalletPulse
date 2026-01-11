import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';

export default function PalletsScreen() {
  const router = useRouter();

  const handleAddPallet = () => {
    router.push('/pallets/new');
  };

  const handlePalletPress = (id: string) => {
    router.push(`/pallets/${id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Pallets</Text>
        <Text style={styles.subtitle}>Manage your pallet inventory</Text>

        <View style={styles.placeholder}>
          <FontAwesome name="archive" size={48} color={colors.neutral} />
          <Text style={styles.placeholderTitle}>No pallets yet</Text>
          <Text style={styles.placeholderText}>
            Tap the + button to add your first pallet and start tracking your inventory.
          </Text>

          <Pressable
            style={styles.demoCard}
            onPress={() => handlePalletPress('demo-pallet-123')}
          >
            <View style={styles.demoCardContent}>
              <Text style={styles.demoCardTitle}>Demo Pallet (tap to view)</Text>
              <Text style={styles.demoCardSubtitle}>See how pallet details look</Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.fab} onPress={handleAddPallet}>
        <FontAwesome name="plus" size={24} color={colors.background} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoCardContent: {
    flex: 1,
  },
  demoCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  demoCardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
