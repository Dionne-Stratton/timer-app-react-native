import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
  Switch,
} from 'react-native';
import useStore from '../store';
import { BlockType, getBlockTimingSummary, getSessionTotalDuration, formatTime, getBlockTypeColor } from '../types';
import { generateId } from '../utils/id';
import { getISOWeekday } from '../utils/history';
import AddBlockModal from '../components/AddBlockModal';
import AddRestTransitionModal from '../components/AddRestTransitionModal';
import { useTheme } from '../theme';

export default function SessionBuilderScreen({ navigation, route }) {
  const { sessionId } = route.params || {};
  const colors = useTheme();
  const sessionTemplates = useStore((state) => state.sessionTemplates);
  const addSessionTemplate = useStore((state) => state.addSessionTemplate);
  const updateSessionTemplate = useStore((state) => state.updateSessionTemplate);

  const existingSession =
    sessionId !== null && sessionId !== undefined
      ? sessionTemplates.find((s) => s.id === sessionId)
      : null;

  const isEditing = !!existingSession;

  const [sessionName, setSessionName] = useState(
    existingSession?.name || 'New Session'
  );
  const [items, setItems] = useState(
    existingSession?.items ? [...existingSession.items] : []
  );
  const [scheduledDaysOfWeek, setScheduledDaysOfWeek] = useState(
    existingSession?.scheduledDaysOfWeek || []
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  // Day names for display (ISO: 1=Monday ... 7=Sunday)
  const weekdays = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 7, label: 'Sun' },
  ];

  const toggleDay = (dayValue) => {
    if (scheduledDaysOfWeek.includes(dayValue)) {
      setScheduledDaysOfWeek(scheduledDaysOfWeek.filter(d => d !== dayValue));
    } else {
      setScheduledDaysOfWeek([...scheduledDaysOfWeek, dayValue].sort());
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [sessionName, items]);

  const handleSave = async () => {
    if (!sessionName.trim()) {
      Alert.alert('Validation Error', 'Please enter a session name.');
      return;
    }

    if (items.length === 0) {
      Alert.alert(
        'Validation Error',
        'Please add at least one block to the session.'
      );
      return;
    }

    try {
      if (isEditing) {
        await updateSessionTemplate(sessionId, {
          name: sessionName.trim(),
          items,
          scheduledDaysOfWeek: scheduledDaysOfWeek.length > 0 ? scheduledDaysOfWeek : undefined,
        });
      } else {
        await addSessionTemplate({
          name: sessionName.trim(),
          items,
          scheduledDaysOfWeek: scheduledDaysOfWeek.length > 0 ? scheduledDaysOfWeek : undefined,
        });
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save session. Please try again.');
      console.error(error);
    }
  };

  const handleAddBlock = (blockInstance) => {
    setItems([...items, blockInstance]);
  };

  const handleDeleteItem = (index) => {
    Alert.alert(
      'Delete Block',
      `Are you sure you want to delete "${items[index].label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
          },
        },
      ]
    );
  };

  const handleDuplicateItem = (index) => {
    const item = items[index];
    const duplicated = {
      ...item,
      id: generateId(),
      templateId: item.templateId, // Keep the same templateId if it exists
    };
    const newItems = [...items];
    newItems.splice(index + 1, 0, duplicated);
    setItems(newItems);
  };

  const handleEditItem = (index) => {
    // For simplicity, we'll show a simple Alert with input simulation
    // In a real app, you'd use a modal with TextInput
    const item = items[index];
    Alert.alert(
      'Edit Block',
      'Block editing with label override will be implemented in the next milestone. For now, you can delete and re-add the block.',
      [{ text: 'OK' }]
    );
  };

  const handleMoveUp = (index) => {
    if (index > 0) {
      const newItems = [...items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      setItems(newItems);
    }
  };

  const handleMoveDown = (index) => {
    if (index < items.length - 1) {
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      setItems(newItems);
    }
  };

  const renderItem = ({ item, index }) => {
    const typeLabels = {
      [BlockType.ACTIVITY]: 'Activity',
      [BlockType.REST]: 'Rest',
      [BlockType.TRANSITION]: 'Transition',
    };
    const blockTypeColor = getBlockTypeColor(item.type, colors);

    return (
      <View style={[styles.blockItem, { borderLeftWidth: 4, borderLeftColor: blockTypeColor }]}>
        <View style={styles.blockContent}>
          <View style={styles.blockHeader}>
            <View style={[styles.blockIndex, { backgroundColor: blockTypeColor }]}>
              <Text style={styles.blockIndexText}>{index + 1}</Text>
            </View>
            <Text style={styles.blockLabel}>{item.label}</Text>
          </View>
          <View style={styles.blockMeta}>
            <Text style={[styles.blockType, { color: blockTypeColor }]}>
              {typeLabels[item.type] || item.type}
            </Text>
            <Text style={styles.blockTiming}>
              {getBlockTimingSummary(item)}
            </Text>
          </View>
        </View>
        <View style={styles.blockActions}>
          <View style={styles.reorderButtons}>
            <TouchableOpacity
              style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
              onPress={() => handleMoveUp(index)}
              disabled={index === 0}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.reorderButtonText, index === 0 && styles.reorderButtonTextDisabled]}>↑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reorderButton, index === items.length - 1 && styles.reorderButtonDisabled]}
              onPress={() => handleMoveDown(index)}
              disabled={index === items.length - 1}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.reorderButtonText, index === items.length - 1 && styles.reorderButtonTextDisabled]}>↓</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditItem(index)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.duplicateButton]}
            onPress={() => handleDuplicateItem(index)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.actionButtonText, styles.duplicateButtonText]}>Dup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteItem(index)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Del</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const totalDuration = getSessionTotalDuration({ items });
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Session Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Session Name *</Text>
          <TextInput
            style={styles.input}
            value={sessionName}
            onChangeText={setSessionName}
            placeholder="e.g., Leg Day A"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Scheduled Days */}
        <View style={styles.section}>
          <Text style={styles.label}>Schedule (Optional)</Text>
          <Text style={styles.description}>
            Select days of the week when this session should appear in Quick Start
          </Text>
          <View style={styles.daysContainer}>
            {weekdays.map((day) => {
              const isSelected = scheduledDaysOfWeek.includes(day.value);
              return (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonActive,
                  ]}
                  onPress={() => toggleDay(day.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextActive,
                    ]}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {scheduledDaysOfWeek.length > 0 && (
            <Text style={styles.scheduledHint}>
              Scheduled for {scheduledDaysOfWeek.map(d => weekdays.find(w => w.value === d)?.label).join(', ')}
            </Text>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Duration</Text>
            <Text style={styles.summaryValue}>
              {formatTime(totalDuration)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Number of Blocks</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
        </View>

        {/* Blocks List */}
        <View style={styles.blocksSection}>
          <Text style={styles.sectionTitle}>Blocks</Text>
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No blocks added yet</Text>
              <Text style={styles.emptySubtext}>
                Tap "Add Block" to get started
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Block Buttons */}
      <View style={styles.addButtonsContainer}>
        <TouchableOpacity
          style={[styles.addButton, styles.addActivityButton]}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Add Activity</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, styles.addRestButton]}
          onPress={() => setShowRestModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Add Rest</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, styles.addTransitionButton]}
          onPress={() => setShowTransitionModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Add Transition</Text>
        </TouchableOpacity>
      </View>

      {/* Add Activity Modal (Library) */}
      {showAddModal && (
        <AddBlockModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddBlock={handleAddBlock}
        />
      )}
      
      {/* Add Rest Modal */}
      {showRestModal && (
        <AddRestTransitionModal
          visible={showRestModal}
          type={BlockType.REST}
          onClose={() => setShowRestModal(false)}
          onAdd={handleAddBlock}
        />
      )}
      
      {/* Add Transition Modal */}
      {showTransitionModal && (
        <AddRestTransitionModal
          visible={showTransitionModal}
          type={BlockType.TRANSITION}
          onClose={() => setShowTransitionModal(false)}
          onAdd={handleAddBlock}
        />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayButtonTextActive: {
    color: colors.textLight,
  },
  scheduledHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
  blocksSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
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
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  blockIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  blockIndexText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
  },
  blockLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  blockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 32,
  },
  blockType: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  blockTiming: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  blockActions: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 4,
  },
  reorderButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.infoLight,
    minWidth: 32,
    alignItems: 'center',
  },
  reorderButtonDisabled: {
    backgroundColor: colors.background,
    opacity: 0.5,
  },
  reorderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
  },
  reorderButtonTextDisabled: {
    color: colors.textTertiary,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  duplicateButton: {
    backgroundColor: colors.infoLight,
  },
  duplicateButtonText: {
    color: colors.info,
  },
  deleteButton: {
    backgroundColor: colors.errorLight,
  },
  deleteButtonText: {
    color: colors.errorText,
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
  addButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addActivityButton: {
    backgroundColor: colors.primary,
  },
  addRestButton: {
    backgroundColor: getBlockTypeColor(BlockType.REST, colors),
  },
  addTransitionButton: {
    backgroundColor: getBlockTypeColor(BlockType.TRANSITION, colors),
  },
  addButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
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
