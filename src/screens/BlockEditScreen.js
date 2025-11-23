import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import useStore from '../store';
import { BlockType, BlockMode, getBlockTypeColor, BUILT_IN_CATEGORIES } from '../types';
import { generateId } from '../utils/id';
import { useTheme } from '../theme';

export default function BlockEditScreen({ navigation, route }) {
  const { blockId } = route.params || {};
  const colors = useTheme();
  const blockTemplates = useStore((state) => state.blockTemplates);
  const settings = useStore((state) => state.settings);
  const addBlockTemplate = useStore((state) => state.addBlockTemplate);
  const updateBlockTemplate = useStore((state) => state.updateBlockTemplate);
  const updateSettings = useStore((state) => state.updateSettings);

  const isEditing = blockId !== null && blockId !== undefined;
  const existingBlock = isEditing
    ? blockTemplates.find((b) => b.id === blockId)
    : null;

  const [label, setLabel] = useState(existingBlock?.label || '');
  const [category, setCategory] = useState(existingBlock?.category || 'Uncategorized');
  const [mode, setMode] = useState(existingBlock?.mode || BlockMode.DURATION);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Get all available categories
  const allCategories = React.useMemo(() => {
    const categories = [...BUILT_IN_CATEGORIES];
    if (settings.isProUser && settings.customCategories) {
      categories.push(...settings.customCategories);
    }
    return categories;
  }, [settings.customCategories, settings.isProUser]);
  const [minutes, setMinutes] = useState(
    existingBlock?.mode === BlockMode.DURATION
      ? Math.floor((existingBlock.durationSeconds || 0) / 60)
      : 0
  );
  const [seconds, setSeconds] = useState(
    existingBlock?.mode === BlockMode.DURATION
      ? (existingBlock.durationSeconds || 0) % 60
      : 30
  );
  const [reps, setReps] = useState(existingBlock?.reps || 10);
  const [perRepSeconds, setPerRepSeconds] = useState(
    existingBlock?.perRepSeconds || 5
  );
  const [notes, setNotes] = useState(existingBlock?.notes || '');
  const styles = getStyles(colors);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [label, category, mode, minutes, seconds, reps, perRepSeconds, notes, styles]);

  const handleSave = async () => {
    // Validation
    if (!label.trim()) {
      Alert.alert('Validation Error', 'Please enter a name for this activity.');
      return;
    }

    let durationSeconds = 0;
    if (mode === BlockMode.DURATION) {
      durationSeconds = minutes * 60 + seconds;
      if (durationSeconds <= 0) {
        Alert.alert(
          'Validation Error',
          'Duration must be greater than 0 seconds.'
        );
        return;
      }
    } else if (mode === BlockMode.REPS) {
      if (reps <= 0) {
        Alert.alert('Validation Error', 'Number of reps must be greater than 0.');
        return;
      }
      if (perRepSeconds <= 0) {
        Alert.alert(
          'Validation Error',
          'Seconds per rep must be greater than 0.'
        );
        return;
      }
    }

    const blockData = {
      label: label.trim(),
      type: BlockType.ACTIVITY, // Always activity for templates
      category: category === 'Uncategorized' ? null : category,
      mode,
      ...(mode === BlockMode.DURATION
        ? { durationSeconds }
        : { reps, perRepSeconds }),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    try {
      if (isEditing) {
        await updateBlockTemplate(blockId, blockData);
      } else {
        await addBlockTemplate(blockData);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save activity. Please try again.');
      console.error(error);
    }
  };

  const handleAddCategory = () => {
    if (!settings.isProUser) {
      Alert.alert('Pro Feature', 'Custom categories are only available for Pro users. Enable Pro features in Settings to unlock this.');
      return;
    }
    setShowAddCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Validation Error', 'Please enter a category name.');
      return;
    }
    const trimmedName = newCategoryName.trim();
    if (BUILT_IN_CATEGORIES.includes(trimmedName)) {
      Alert.alert('Validation Error', 'This category already exists as a built-in category.');
      return;
    }
    if (settings.customCategories?.includes(trimmedName)) {
      Alert.alert('Validation Error', 'This category already exists.');
      return;
    }
    
    const updatedCategories = [...(settings.customCategories || []), trimmedName];
    updateSettings({ customCategories: updatedCategories });
    setCategory(trimmedName);
    setNewCategoryName('');
    setShowAddCategoryModal(false);
  };

  const renderModeButton = (blockMode, label) => (
    <TouchableOpacity
      style={[
        styles.modeButton,
        mode === blockMode && styles.modeButtonActive,
      ]}
      onPress={() => setMode(blockMode)}
    >
      <Text
        style={[
          styles.modeButtonText,
          mode === blockMode && styles.modeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* Name/Label */}
        <View style={styles.section}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g., Bicep curls"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryContainer}>
            {allCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
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
              disabled
            >
              <Text style={[styles.addCategoryButtonText, styles.addCategoryButtonTextDisabled]}>
                🔒 + Add Category (Pro)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Mode *</Text>
          <View style={styles.modeButtonContainer}>
            {renderModeButton(BlockMode.DURATION, 'Duration')}
            {renderModeButton(BlockMode.REPS, 'Reps')}
          </View>
        </View>

        {/* Duration Input */}
        {mode === BlockMode.DURATION && (
          <View style={styles.section}>
            <Text style={styles.label}>Duration *</Text>
            <View style={styles.durationContainer}>
              <View style={styles.durationInputGroup}>
                <TextInput
                  style={styles.durationInput}
                  value={minutes.toString()}
                  onChangeText={(text) => setMinutes(parseInt(text) || 0)}
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Text style={styles.durationLabel}>min</Text>
              </View>
              <View style={styles.durationInputGroup}>
                <TextInput
                  style={styles.durationInput}
                  value={seconds.toString()}
                  onChangeText={(text) => {
                    const val = parseInt(text) || 0;
                    setSeconds(Math.min(59, Math.max(0, val)));
                  }}
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Text style={styles.durationLabel}>sec</Text>
              </View>
            </View>
          </View>
        )}

        {/* Reps Input */}
        {mode === BlockMode.REPS && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Number of Reps *</Text>
              <TextInput
                style={styles.input}
                value={reps.toString()}
                onChangeText={(text) => setReps(parseInt(text) || 0)}
                placeholder="10"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Seconds per Rep *</Text>
              <TextInput
                style={styles.input}
                value={perRepSeconds.toString()}
                onChangeText={(text) => setPerRepSeconds(parseFloat(text) || 0)}
                placeholder="5"
                keyboardType="decimal-pad"
              />
              <Text style={styles.hint}>
                Estimated time per rep (e.g., 5 seconds)
              </Text>
            </View>
          </>
        )}

        {/* Notes (Optional) */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes or instructions..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>
      
      {/* Add Category Modal */}
      <Modal
        visible={showAddCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Category</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category name"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveCategory}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
    ...Platform.select({
      android: {
        paddingVertical: 12,
      },
    }),
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
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
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textLight,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextSave: {
    color: colors.textLight,
  },
  modeButtonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  durationContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  durationInputGroup: {
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
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});
