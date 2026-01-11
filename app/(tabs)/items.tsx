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
import { useItemsStore } from '@/src/stores/items-store';
import { usePalletsStore } from '@/src/stores/pallets-store';
import { ItemCard } from '@/src/features/items';
import { Item } from '@/src/types/database';

export default function ItemsScreen() {
  const router = useRouter();
  const { items, isLoading, error, fetchItems } = useItemsStore();
  const { getPalletById } = usePalletsStore();

  // Fetch items on mount
  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = () => {
    router.push('/items/new');
  };

  const handleItemPress = (item: Item) => {
    router.push(`/items/${item.id}`);
  };

  const handleRefresh = () => {
    fetchItems();
  };

  const renderItemCard = ({ item }: { item: Item }) => {
    // Get pallet name if item belongs to a pallet
    const pallet = item.pallet_id ? getPalletById(item.pallet_id) : null;

    return (
      <ItemCard
        item={item}
        onPress={() => handleItemPress(item)}
        showPalletBadge={!!pallet}
        palletName={pallet?.name}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.placeholder}>
      <FontAwesome name="cube" size={48} color={colors.neutral} />
      <Text style={styles.placeholderTitle}>No items yet</Text>
      <Text style={styles.placeholderText}>
        Tap the + button to add your first item. Items from pallets and individual finds will appear here.
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

  // Calculate summary stats
  const soldCount = items.filter(i => i.status === 'sold').length;
  const listedCount = items.filter(i => i.status === 'listed').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Items</Text>
        <Text style={styles.subtitle}>
          {items.length > 0
            ? `${items.length} item${items.length === 1 ? '' : 's'} • ${listedCount} listed • ${soldCount} sold`
            : 'All your inventory items'}
        </Text>
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      ) : error && items.length === 0 ? (
        renderErrorState()
      ) : items.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={items}
          renderItem={renderItemCard}
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

      <Pressable style={styles.fab} onPress={handleAddItem}>
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
