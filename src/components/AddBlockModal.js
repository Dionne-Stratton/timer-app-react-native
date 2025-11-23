import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import useStore from '../store';
import { BlockType, BlockMode, getBlockTimingSummary, getBlockTypeColor, BUILT_IN_CATEGORIES } from '../types';
import { generateId } from '../utils/id';
import { useTheme } from '../theme';

export default function AddBlockModal({ visible, onClose, onAddBlock }) {
  const colors = useTheme();
  const blockTemplates = useStore((state) => state.blockTemplates);
  const settings = useStore((state) => state.settings);
  const addBlockTemplate = useStore((state) => state.addBlockTemplate);
  const [tab, setTab] = useState('library'); // 'library' or 'custom'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);

  // Custom block form state
  const [customLabel, setCustomLabel] = useState('');
  const [customType, setCustomType] = useState(BlockType.ACTIVITY);
  const [customMode, setCustomMode] = useState(BlockMode.DURATION);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [customSeconds, setCustomSeconds] = useState(30);
  const [customReps, setCustomReps] = useState(10);
  const [customPerRepSeconds, setCustomPerRepSeconds] = useState(5);
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  // Filter to only activities (rest/transition are not in library)
  const activities = blockTemplates.filter(template => template.type === BlockType.ACTIVITY);
  
  // Get all available categories (built-in + custom)
  const allCategories = React.useMemo(() => {
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
  
  const filteredTemplates = activities.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.label.toLowerCase().includes(searchQuery.toLowerCase());
    // Filter by category
    if (filterCategory !== null) {
      const templateCategory = template.category || 'Uncategorized';
      if (templateCategory !== filterCategory) {
        return false;
      }
    }
    return matchesSearch;
  });

  const handleAddFromLibrary = (template) => {
    const blockInstance = {
      id: generateId(),
      templateId: template.id,
      label: template.label,
      type: template.type,
      category: template.category || null, // Include category from template
      mode: template.mode,
      ...(template.mode === BlockMode.DURATION
        ? { durationSeconds: template.durationSeconds }
        : {
            reps: template.reps,
            perRepSeconds: template.perRepSeconds,
          }),
    };
    onAddBlock(blockInstance);
    onClose();
  };

  const handleAddCustom = async () => {
    if (!customLabel.trim()) {
      Alert.alert('Validation Error', 'Please enter a name for this block.');
      return;
    }

    let durationSeconds = 0;
    if (customMode === BlockMode.DURATION) {
      durationSeconds = customMinutes * 60 + customSeconds;
      if (durationSeconds <= 0) {
        Alert.alert(
          'Validation Error',
          'Duration must be greater than 0 seconds.'
        );
        return;
      }
    } else if (customMode === BlockMode.REPS) {
      if (customReps <= 0 || customPerRepSeconds <= 0) {
        Alert.alert(
          'Validation Error',
          'Reps and seconds per rep must be greater than 0.'
        );
        return;
      }
    }

    let templateId = null;
    
    // If save to library is checked, save the block as a template first
    if (saveToLibrary) {
      const template = {
        label: customLabel.trim(),
        type: customType,
        mode: customMode,
        ...(customMode === BlockMode.DURATION
          ? { durationSeconds }
          : {
              reps: customReps,
              perRepSeconds: customPerRepSeconds,
            }),
      };
      const savedTemplate = await addBlockTemplate(template);
      templateId = savedTemplate.id;
    }

    const blockInstance = {
      id: generateId(),
      templateId: templateId, // Will be null if not saved to library
      label: customLabel.trim(),
      type: customType,
      mode: customMode,
      ...(customMode === BlockMode.DURATION
        ? { durationSeconds }
        : {
            reps: customReps,
            perRepSeconds: customPerRepSeconds,
          }),
    };

    onAddBlock(blockInstance);
    
    // Reset form
    setCustomLabel('');
    setCustomType(BlockType.ACTIVITY);
    setCustomMode(BlockMode.DURATION);
    setCustomMinutes(0);
    setCustomSeconds(30);
    setCustomReps(10);
    setCustomPerRepSeconds(5);
    setSaveToLibrary(false);
    
    onClose();
  };

  const renderLibraryItem = ({ item }) => {
    const blockTypeColor = getBlockTypeColor(item.type, colors);
    const category = item.category || 'Uncategorized';

    return (
      <TouchableOpacity
        style={[styles.libraryItem, { borderLeftWidth: 4, borderLeftColor: blockTypeColor }]}
        onPress={() => handleAddFromLibrary(item)}
      >
        <View style={styles.libraryItemContent}>
          <Text style={styles.libraryItemLabel}>{item.label}</Text>
          <View style={styles.libraryItemMeta}>
            <Text style={styles.libraryItemCategory}>{category}</Text>
            <Text style={styles.libraryItemTiming}>
              {getBlockTimingSummary(item)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = getStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Block</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, tab === 'library' && styles.tabActive]}
            onPress={() => setTab('library')}
          >
            <Text
              style={[styles.tabText, tab === 'library' && styles.tabTextActive]}
            >
              From Library
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'custom' && styles.tabActive]}
            onPress={() => setTab('custom')}
          >
            <Text
              style={[styles.tabText, tab === 'custom' && styles.tabTextActive]}
            >
              Custom Block
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'library' ? (
          <View style={styles.libraryContent}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search activities..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={styles.filterWrapper}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    filterCategory === null && styles.filterButtonActive,
                  ]}
                  onPress={() => setFilterCategory(null)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filterCategory === null && styles.filterButtonTextActive,
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
                      filterCategory === category && styles.filterButtonActive,
                    ]}
                    onPress={() => setFilterCategory(category)}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        filterCategory === category && styles.filterButtonTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <FlatList
              data={filteredTemplates}
              renderItem={renderLibraryItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No activities found</Text>
                  <Text style={styles.emptySubtext}>
                    Try a different search or create a custom block
                  </Text>
                </View>
              }
            />
          </View>
        ) : (
          <ScrollView 
            style={styles.customContentScroll} 
            contentContainerStyle={styles.customContent}
          >
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="e.g., Custom exercise"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.label}>Type *</Text>
            <View style={styles.buttonRow}>
              {Object.values(BlockType).map((type) => {
                const blockTypeColor = getBlockTypeColor(type, colors);
                const isActive = customType === type;
                
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      isActive && { backgroundColor: blockTypeColor, borderColor: blockTypeColor },
                    ]}
                    onPress={() => setCustomType(type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        isActive && { color: colors.textLight },
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Mode *</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  customMode === BlockMode.DURATION && styles.modeButtonActive,
                ]}
                onPress={() => setCustomMode(BlockMode.DURATION)}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    customMode === BlockMode.DURATION &&
                      styles.modeButtonTextActive,
                  ]}
                >
                  Duration
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  customMode === BlockMode.REPS && styles.modeButtonActive,
                ]}
                onPress={() => setCustomMode(BlockMode.REPS)}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    customMode === BlockMode.REPS &&
                      styles.modeButtonTextActive,
                  ]}
                >
                  Reps
                </Text>
              </TouchableOpacity>
            </View>

            {customMode === BlockMode.DURATION ? (
              <View>
                <Text style={styles.label}>Duration *</Text>
                <View style={styles.durationRow}>
                  <View style={styles.durationGroup}>
                    <TextInput
                      style={styles.durationInput}
                      value={customMinutes.toString()}
                      onChangeText={(text) =>
                        setCustomMinutes(parseInt(text) || 0)
                      }
                      placeholder="0"
                      keyboardType="numeric"
                    />
                    <Text style={styles.durationLabel}>min</Text>
                  </View>
                  <View style={styles.durationGroup}>
                    <TextInput
                      style={styles.durationInput}
                      value={customSeconds.toString()}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        setCustomSeconds(Math.min(59, Math.max(0, val)));
                      }}
                      placeholder="30"
                      keyboardType="numeric"
                    />
                    <Text style={styles.durationLabel}>sec</Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Number of Reps *</Text>
                <TextInput
                  style={styles.input}
                  value={customReps.toString()}
                  onChangeText={(text) => setCustomReps(parseInt(text) || 0)}
                  placeholder="10"
                  keyboardType="numeric"
                />
                <Text style={styles.label}>Seconds per Rep *</Text>
                <TextInput
                  style={styles.input}
                  value={customPerRepSeconds.toString()}
                  onChangeText={(text) =>
                    setCustomPerRepSeconds(parseFloat(text) || 0)
                  }
                  placeholder="5"
                  keyboardType="decimal-pad"
                />
              </>
            )}

            {/* Save to Library Toggle */}
            <View style={styles.saveToLibraryContainer}>
              <View style={styles.saveToLibraryContent}>
                <Text style={styles.saveToLibraryLabel}>Save to Library</Text>
                <Text style={styles.saveToLibraryDescription}>
                  Save this block to your activity library for future use
                </Text>
              </View>
              <Switch
                value={saveToLibrary}
                onValueChange={setSaveToLibrary}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textLight}
              />
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddCustom}
            >
              <Text style={styles.addButtonText}>Add to Session</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeButton: {
    padding: 8,
    minWidth: 60,
  },
  closeButtonText: {
    color: colors.primary,
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  libraryContent: {
    flex: 1,
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
    minHeight: 56,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    minHeight: 40,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
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
    paddingTop: 8,
  },
  libraryItem: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    paddingLeft: 12, // Account for border
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  libraryItemContent: {
    flex: 1,
  },
  libraryItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  libraryItemMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  libraryItemCategory: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  libraryItemTiming: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  customContentScroll: {
    flex: 1,
  },
  customContent: {
    padding: 16,
  },
  saveToLibraryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 24,
    marginBottom: 16,
  },
  saveToLibraryContent: {
    flex: 1,
    marginRight: 12,
  },
  saveToLibraryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  saveToLibraryDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.purpleLight,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.primary,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.purpleLight,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
    color: colors.primary,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  durationGroup: {
    flex: 1,
  },
  durationInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    color: colors.text,
  },
  durationLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  addButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
  },
});

