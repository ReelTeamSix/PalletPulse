import { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/src/constants/colors';
import { spacing, fontSize, borderRadius } from '@/src/constants/spacing';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { PalletCard } from '@/src/features/pallets';
import { Pallet } from '@/src/types/database';

export default function PalletsScreen() {
  const router = useRouter();
  const { pallets, isLoading, error, fetchPallets } = usePalletsStore();

  // Fetch pallets on mount
  useEffect(() => {
    fetchPallets();
  }, []);

  const handleAddPallet = () => {
    router.push('/pallets/new');
  };

  const handlePalletPress = (pallet: Pallet) => {
    router.push(`/pallets/${pallet.id}`);
  };

  const handleRefresh = () => {
    fetchPallets();
  };

  const renderPalletCard = ({ item }: { item: Pallet }) => (
    <PalletCard
      pallet={item}
      itemCount={0} // TODO: Get from items store when available
      totalProfit={0} // TODO: Calculate from items when available
      onPress={() => handlePalletPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.placeholder}>
      <FontAwesome name="archive" size={48} color={colors.neutral} />
      <Text style={styles.placeholderTitle}>No pallets yet</Text>
      <Text style={styles.placeholderText}>
        Tap the + button to add your first pallet and start tracking your inventory.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.placeholder}>
      <FontAwesome name="exclamation-circle" size={48} color={colors.loss} />
      <Text style={styles.placeholderTitle}>Something went wrong</Text>
      <Text style={styles.placeholderText}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pallets</Text>
        <Text style={styles.subtitle}>
          {pallets.length > 0
            ? `${pallets.length} pallet${pallets.length === 1 ? '' : 's'}`
            : 'Manage your pallet inventory'}
        </Text>
      </View>

      {isLoading && pallets.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading pallets...</Text>
        </View>
      ) : error && pallets.length === 0 ? (
        renderErrorState()
      ) : pallets.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={pallets}
          renderItem={renderPalletCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

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
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
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
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
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
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
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
