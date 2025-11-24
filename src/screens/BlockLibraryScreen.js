import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStore from '../store';
import { BlockType, getBlockTimingSummary, getBlockTypeColor, BUILT_IN_CATEGORIES } from '../types';
import { useTheme } from '../theme';
import ProUpgradeModal from '../components/ProUpgradeModal';

export default function BlockLibraryScreen({ navigation }) {
  const colors = useTheme();
  const blockTemplates = useStore((state) => state.blockTemplates);
  const settings = useStore((state) => state.settings);
  const deleteBlockTemplate = useStore((state) => state.deleteBlockTemplate);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null); // null = all categories
  const [proModalVisible, setProModalVisible] = useState(false);
  
  // Filter to only activities (rest/transition are not in library)
  const activities = useMemo(() => {
    return blockTemplates.filter(block => block.type === BlockType.ACTIVITY);
  }, [blockTemplates]);
  
  // Get all available categories (built-in + custom)
  const allCategories = useMemo(() => {
    const categories = new Set(BUILT_IN_CATEGORIES);
    if (settings.isProUser) {
      settings.customCategories?.forEach(cat => categories.add(cat));
    }
    // Also include categories from existing activities
    activities.forEach(activity => {
      if (activity.category) {
        categories.add(activity.category);
      }
    });
    return Array.from(categories).sort();
  }, [activities, settings.customCategories, settings.isProUser]);

  useEffect(() => {
    // Load data on mount
    const initialize = useStore.getState().initialize;
    initialize();
  }, []);

  const handleDelete = (blockId, blockLabel) => {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to delete "${blockLabel}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBlockTemplate(blockId);
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await useStore.getState().initialize();
    setRefreshing(false);
  };

  const styles = getStyles(colors);

  // Filter activities based on search query and selected category
  const filteredBlocks = useMemo(() => {
    return activities.filter((block) => {
      // Filter by category
      if (selectedCategory !== null) {
        const blockCategory = block.category || 'Uncategorized';
        if (blockCategory !== selectedCategory) {
          return false;
        }
      }
      
      // Filter by search query (case-insensitive)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return block.label.toLowerCase().includes(query);
      }
      
      return true;
    });
  }, [activities, searchQuery, selectedCategory]);

  const renderBlockItem = ({ item }) => {
    const blockTypeColor = getBlockTypeColor(item.type, colors);
    const category = item.category || 'Uncategorized';
    
    return (
      <TouchableOpacity
        style={[styles.blockItem, { borderLeftWidth: 4, borderLeftColor: blockTypeColor }]}
        onPress={() => navigation.navigate('BlockEdit', { blockId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.blockContent}>
          <Text style={styles.blockLabel}>{item.label}</Text>
          <View style={styles.blockMeta}>
            <Text style={styles.blockCategory}>{category}</Text>
            <Text style={styles.blockTiming}>{getBlockTimingSummary(item)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.label)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Category Filter Buttons */}
      <View style={styles.filterWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedCategory === null && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedCategory === null && styles.filterButtonTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {allCategories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterButton,
              selectedCategory === category && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === category && styles.filterButtonTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredBlocks}
        renderItem={renderBlockItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== null
                ? 'No activities match your filters'
                : 'No activities yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory !== null
                ? 'Try adjusting your search or filters'
                : 'Tap "+ New Activity" to create one'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          // Check activity limit for free users
          const activities = blockTemplates.filter(b => b.type === BlockType.ACTIVITY);
          if (!settings.isProUser && activities.length >= 20) {
            setProModalVisible(true);
            return;
          }
          navigation.navigate('BlockEdit', { blockId: null });
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+ New Activity</Text>
      </TouchableOpacity>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        visible={proModalVisible}
        onClose={() => setProModalVisible(false)}
        limitType="activities"
        onUpgrade={() => {
          setProModalVisible(false);
          navigation.getParent()?.navigate('Settings', { screen: 'GoPro' });
        }}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  freeBanner: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  freeBannerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  searchInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterWrapper: {
    paddingVertical: 8,
    maxHeight: 50,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    height: 40,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    height: 32,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.textLight,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  blockItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    paddingLeft: 12, // Account for border
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  blockContent: {
    flex: 1,
  },
  blockLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  blockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  blockCategory: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  blockTiming: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});
