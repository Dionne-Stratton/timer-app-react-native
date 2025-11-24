import React, { useState, useEffect } from 'react';
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
import ProUpgradeModal from './ProUpgradeModal';

export default function AddBlockModal({ visible, onClose, onAddBlock, navigation }) {
  const colors = useTheme();
  const blockTemplates = useStore((state) => state.blockTemplates);
  const settings = useStore((state) => state.settings);
  const addBlockTemplate = useStore((state) => state.addBlockTemplate);
  const updateSettings = useStore((state) => state.updateSettings);
  const [tab, setTab] = useState('library'); // 'library' or 'custom'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);

  // Custom block form state
  const [customLabel, setCustomLabel] = useState('');
  const [customCategory, setCustomCategory] = useState(BUILT_IN_CATEGORIES[0]);
  const [customMode, setCustomMode] = useState(BlockMode.DURATION);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [customSeconds, setCustomSeconds] = useState(30);
  const [customReps, setCustomReps] = useState(10);
  const [customPerRepSeconds, setCustomPerRepSeconds] = useState(5);
  const [saveToLibrary, setSaveToLibrary] = useState(settings.defaultSaveToLibrary ?? true);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [proModalVisible, setProModalVisible] = useState(false);
  const [proModalLimitType, setProModalLimitType] = useState(null);

  // Filter to only activities (rest/transition are not in library)
  const activities = blockTemplates.filter(template => template.type === BlockType.ACTIVITY);
  
  // Get all available categories (built-in + custom, with custom shown even if not Pro)
  const allCategories = React.useMemo(() => {
    const categories = [...BUILT_IN_CATEGORIES];
    // Show custom categories even for free users (they'll be locked)
    if (settings.customCategories) {
      categories.push(...settings.customCategories);
    }
    return categories;
  }, [settings.customCategories]);
  
  // Check if a category is custom (not built-in)
  const isCustomCategory = (cat) => {
    return !BUILT_IN_CATEGORIES.includes(cat);
  };
  
  const handleCategorySelect = (cat) => {
    // If it's a custom category and user is not Pro, show Pro modal
    if (isCustomCategory(cat) && !settings.isProUser) {
      setProModalLimitType('customCategory');
      setProModalVisible(true);
      return;
    }
    setCustomCategory(cat);
  };
  
  const handleAddCategory = () => {
    if (!settings.isProUser) {
      setProModalLimitType('customCategory');
      setProModalVisible(true);
      return;
    }
    setShowAddCategoryModal(true);
  };

  // Sync saveToLibrary with settings when modal opens or settings change
  useEffect(() => {
    setSaveToLibrary(settings.defaultSaveToLibrary ?? true);
  }, [visible, settings.defaultSaveToLibrary]);
  
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
      Alert.alert('Validation Error', 'Please enter a name for this activity.');
      return;
    }
    if (!customCategory) {
      Alert.alert('Validation Error', 'Please select a category for this activity.');
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
        
        // If save to library is checked, check activity limit for free users
        if (saveToLibrary) {
          // Check activity limit (20 max for free users)
          if (!settings.isProUser && activities.length >= 20) {
            setProModalLimitType('activities');
            setProModalVisible(true);
            return;
          }
          
          const template = {
            label: customLabel.trim(),
            type: BlockType.ACTIVITY,
            category: customCategory === 'Uncategorized' ? null : customCategory,
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
      type: BlockType.ACTIVITY,
      category: customCategory === 'Uncategorized' ? null : customCategory,
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
    setCustomCategory(BUILT_IN_CATEGORIES[0]);
    setCustomMode(BlockMode.DURATION);
    setCustomMinutes(0);
    setCustomSeconds(30);
    setCustomReps(10);
    setCustomPerRepSeconds(5);
    setSaveToLibrary(settings.defaultSaveToLibrary ?? true);
    
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
          <Text style={styles.headerTitle}>Add Activity</Text>
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
              Add Custom
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

            {/* Category Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryContainer}>
                {allCategories.map((cat) => {
                  const isCustom = isCustomCategory(cat);
                  const isLocked = isCustom && !settings.isProUser;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        customCategory === cat && styles.categoryChipActive,
                        isLocked && styles.categoryChipLocked,
                      ]}
                      onPress={() => handleCategorySelect(cat)}
                      disabled={isLocked}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          customCategory === cat && styles.categoryChipTextActive,
                          isLocked && styles.categoryChipTextLocked,
                        ]}
                      >
                        {cat}
                        {isLocked && ' 🔒'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {settings.isProUser && (
                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={handleAddCategory}
                >
                  <Text style={styles.addCategoryButtonText}>+ Add Category</Text>
                </TouchableOpacity>
              )}
              {!settings.isProUser && (
                <TouchableOpacity
                  style={[styles.addCategoryButton, styles.addCategoryButtonDisabled]}
                  onPress={handleAddCategory}
                >
                  <Text style={[styles.addCategoryButtonText, styles.addCategoryButtonTextDisabled]}>
                    🔒 + Add Category (Pro)
                  </Text>
                </TouchableOpacity>
              )}
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
                  Save this activity to your activity library for future use
                </Text>
              </View>
              <Switch
                value={saveToLibrary}
                onValueChange={(value) => {
                  setSaveToLibrary(value);
                  updateSettings({ defaultSaveToLibrary: value });
                }}
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

        {/* Add Category Modal */}
        <Modal
          visible={showAddCategoryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Custom Category</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Category Name"
                placeholderTextColor={colors.textTertiary}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoCapitalize="words"
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => {
                    setShowAddCategoryModal(false);
                    setNewCategoryName('');
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={() => {
                    if (!newCategoryName.trim()) {
                      Alert.alert('Validation Error', 'Category name cannot be empty.');
                      return;
                    }
                    const trimmedName = newCategoryName.trim();
                    if (BUILT_IN_CATEGORIES.includes(trimmedName) || settings.customCategories?.includes(trimmedName)) {
                      Alert.alert('Validation Error', 'Category already exists.');
                      return;
                    }
                    updateSettings({ customCategories: [...(settings.customCategories || []), trimmedName] });
                    setCustomCategory(trimmedName);
                    setNewCategoryName('');
                    setShowAddCategoryModal(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        visible={proModalVisible}
        onClose={() => setProModalVisible(false)}
        limitType={proModalLimitType}
        onUpgrade={() => {
          setProModalVisible(false);
          onClose();
          if (navigation) {
            navigation.getParent()?.navigate('Settings', { screen: 'GoPro' });
          }
        }}
      />
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipDisabled: {
    backgroundColor: colors.backgroundMedium,
    borderColor: colors.border,
    opacity: 0.7,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textLight,
    fontWeight: '600',
  },
  categoryChipLocked: {
    opacity: 0.7,
  },
  categoryChipTextLocked: {
    color: colors.textTertiary,
  },
  categoryChipTextDisabled: {
    color: colors.textTertiary,
  },
  addCategoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  addCategoryButtonDisabled: {
    opacity: 0.5,
  },
  addCategoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  addCategoryButtonTextDisabled: {
    color: colors.textTertiary,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.backgroundMedium,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
  },
});

