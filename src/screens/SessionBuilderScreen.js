import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import ProUpgradeModal from '../components/ProUpgradeModal';
import Toast from '../components/Toast';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SessionBuilderScreen({ navigation, route }) {
  const { sessionId: routeSessionId } = route.params || {};
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const sessionTemplates = useStore((state) => state.sessionTemplates);
  const settings = useStore((state) => state.settings);
  const addSessionTemplate = useStore((state) => state.addSessionTemplate);
  const updateSessionTemplate = useStore((state) => state.updateSessionTemplate);
  const getSessionDraft = useStore((state) => state.getSessionDraft);
  const saveSessionDraft = useStore((state) => state.saveSessionDraft);
  const updateSessionDraft = useStore((state) => state.updateSessionDraft);
  const deleteSessionDraft = useStore((state) => state.deleteSessionDraft);
  const [proModalVisible, setProModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const saveTimeoutRef = useRef(null);
  const hasUnsavedChangesRef = useRef(false);
  const lastSavedRef = useRef(null); // Track last saved state to prevent redundant saves
  const isLoadingFromStoreRef = useRef(false); // Flag to prevent autosave during store reload

  // Generate a sessionId for new sessions (if null/undefined)
  // For new sessions, we need to generate an ID and store it in route params
  // Use a ref to persist the generated ID across remounts
  const generatedSessionIdRef = useRef(null);
  
  // Determine the sessionId - use route param if provided, otherwise generate/store one
  let sessionId = routeSessionId;
  
  if (sessionId === null || sessionId === undefined) {
    // For new sessions, check if there's a draft we can use
    // (This handles the case where the component remounted)
    const allDrafts = useStore.getState().sessionDrafts || {};
    const draftEntries = Object.entries(allDrafts);
    
    // Find a draft that doesn't have a corresponding saved session
    const unsavedDraft = draftEntries.find(([draftId, draft]) => {
      return !sessionTemplates.find(s => s.id === draftId);
    });
    
    if (unsavedDraft) {
      // Use the existing draft's sessionId
      sessionId = unsavedDraft[0];
    } else {
      // Generate a new sessionId
      if (!generatedSessionIdRef.current) {
        generatedSessionIdRef.current = generateId();
      }
      sessionId = generatedSessionIdRef.current;
    }
  }

  // Update route params in useEffect to avoid setState during render
  useEffect(() => {
    if (sessionId && sessionId !== routeSessionId) {
      navigation.setParams({ sessionId });
    }
  }, [sessionId, routeSessionId, navigation]);

  const existingSession =
    sessionId !== null && sessionId !== undefined
      ? sessionTemplates.find((s) => s.id === sessionId)
      : null;

  const isEditing = !!existingSession;

  // For unsaved sessions, check if there's a draft in the store
  const sessionDraft = sessionId && !existingSession ? getSessionDraft(sessionId) : null;

  // Initialize state from existing session or draft
  const [sessionName, setSessionName] = useState(
    existingSession?.name || sessionDraft?.name || 'New Session'
  );
  const [items, setItems] = useState(() => {
    if (existingSession?.items) {
      return [...existingSession.items];
    }
    if (sessionDraft?.items) {
      return [...sessionDraft.items];
    }
    return [];
  });
  const [scheduledDaysOfWeek, setScheduledDaysOfWeek] = useState(
    existingSession?.scheduledDaysOfWeek || sessionDraft?.scheduledDaysOfWeek || []
  );

  // Initialize lastSavedRef when component first loads with an existing session
  // This prevents false "changes detected" on initial load
  useEffect(() => {
    if (isEditing && existingSession) {
      lastSavedRef.current = {
        name: sessionName,
        items: items.map(item => ({ ...item })),
        scheduledDaysOfWeek: scheduledDaysOfWeek,
      };
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft whenever items, sessionName, or scheduledDaysOfWeek changes (for NEW sessions only)
  useEffect(() => {
    if (sessionId && !existingSession) {
      // This is an unsaved session - save to draft
      // Make sure to save a deep copy of items to avoid reference issues
      saveSessionDraft(sessionId, {
        name: sessionName,
        items: items.map(item => ({ ...item })), // Deep copy
        scheduledDaysOfWeek: scheduledDaysOfWeek,
      });
    }
  }, [sessionId, existingSession, sessionName, items, scheduledDaysOfWeek, saveSessionDraft]);

  // Autosave for existing sessions (with debounced toast notifications)
  useEffect(() => {
    // Skip autosave if we're currently loading from store (prevents infinite loop)
    if (isLoadingFromStoreRef.current) {
      return;
    }
    
    // Only autosave when editing an existing session
    if (isEditing && sessionId && sessionName.trim() && items.length > 0) {
      // Create a snapshot of current state for comparison
      const currentState = {
        name: sessionName.trim(),
        items: items.map(item => ({ ...item })),
        scheduledDaysOfWeek: scheduledDaysOfWeek,
      };
      
      // Check if state has actually changed by comparing with last saved state
      const lastSaved = lastSavedRef.current;
      if (lastSaved) {
        const nameChanged = lastSaved.name !== currentState.name;
        const scheduledChanged = JSON.stringify(lastSaved.scheduledDaysOfWeek) !== JSON.stringify(currentState.scheduledDaysOfWeek);
        const itemsChanged = JSON.stringify(lastSaved.items) !== JSON.stringify(currentState.items);
        
        // Only save if something actually changed
        if (!nameChanged && !scheduledChanged && !itemsChanged) {
          return; // No changes, skip save
        }
      }
      
      // Save the session
      updateSessionTemplate(sessionId, currentState);
      
      // Update last saved ref
      lastSavedRef.current = currentState;
      
      // Mark that we have unsaved changes (for navigation away toast)
      hasUnsavedChangesRef.current = true;
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Show toast after 1.5 seconds of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        setToastVisible(true);
        hasUnsavedChangesRef.current = false;
      }, 1500);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isEditing, sessionId, sessionName, items, scheduledDaysOfWeek, updateSessionTemplate]);
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

  // Handle updates from BlockEditScreen when editing unsaved items
  // Use a separate useEffect to watch for params changes
  useEffect(() => {
    const { updatedBlockId, updatedBlockData, updateAll } = route.params || {};
    
    if (updatedBlockId && updatedBlockData) {
      // Use functional update to ensure we have the latest items state
      setItems((currentItems) => {
        // Restore from draft if items is empty (component remounted)
        let updatedItems = currentItems.length > 0 ? [...currentItems] : [];
        
        if (updatedItems.length === 0 && sessionId && !existingSession) {
          const draft = getSessionDraft(sessionId);
          if (draft?.items) {
            updatedItems = [...draft.items];
          }
        }
        
        const index = updatedItems.findIndex((item) => item.id === updatedBlockId);
        
        if (index === -1) {
          // Item not found - try to restore from draft one more time
          if (sessionId && !existingSession) {
            const draft = getSessionDraft(sessionId);
            if (draft?.items) {
              updatedItems = [...draft.items];
              const retryIndex = updatedItems.findIndex((item) => item.id === updatedBlockId);
              if (retryIndex === -1) {
                console.warn('BlockEditScreen: Item not found even after restoring from draft', updatedBlockId);
                return updatedItems; // Return draft items even if update fails
              }
              // Use retryIndex for the update below
              const originalItem = updatedItems[retryIndex];
              const originalTemplateId = originalItem?.templateId;
              const originalLabel = originalItem?.label;
              if (updateAll) {
                updatedItems.forEach((item, idx) => {
                  let isMatching = false;
                  if (item.id === updatedBlockId) {
                    isMatching = true;
                  } else if (item.type === BlockType.ACTIVITY && originalTemplateId) {
                    isMatching = item.templateId === originalTemplateId;
                  } else {
                    isMatching = item.label === originalLabel;
                  }
                  if (isMatching) {
                    updatedItems[idx] = { ...item, ...updatedBlockData, id: item.id, templateId: item.templateId };
                  }
                });
              } else {
                updatedItems[retryIndex] = { ...updatedItems[retryIndex], ...updatedBlockData, id: updatedItems[retryIndex].id, templateId: updatedItems[retryIndex].templateId };
              }
              return updatedItems;
            }
          }
          console.warn('BlockEditScreen: Item not found in items array', updatedBlockId);
          return currentItems;
        }
        
        if (updateAll) {
          // Update all matching instances
          const originalItem = updatedItems[index];
          const originalTemplateId = originalItem?.templateId;
          const originalLabel = originalItem?.label;
          
          updatedItems.forEach((item, idx) => {
            let isMatching = false;
            if (item.id === updatedBlockId) {
              isMatching = true;
            } else if (item.type === BlockType.ACTIVITY && originalTemplateId) {
              isMatching = item.templateId === originalTemplateId;
            } else {
              isMatching = item.label === originalLabel;
            }
            
            if (isMatching) {
              updatedItems[idx] = {
                ...item,
                ...updatedBlockData,
                id: item.id,
                templateId: item.templateId,
              };
            }
          });
        } else {
          // Update only the one item
          updatedItems[index] = {
            ...updatedItems[index],
            ...updatedBlockData,
            id: updatedItems[index].id,
            templateId: updatedItems[index].templateId,
          };
        }
        
        // Auto-save draft immediately after updating
        if (sessionId && !existingSession) {
          saveSessionDraft(sessionId, {
            name: sessionName,
            items: updatedItems.map(item => ({ ...item })),
            scheduledDaysOfWeek: scheduledDaysOfWeek,
          });
        }
        
        return updatedItems;
      });
      
      // Clear the params to prevent re-processing
      navigation.setParams({ updatedBlockId: undefined, updatedBlockData: undefined, updateAll: undefined });
    }
  }, [route.params?.updatedBlockId, route.params?.updatedBlockData, route.params?.updateAll, navigation, sessionId, existingSession, getSessionDraft, sessionName, scheduledDaysOfWeek, saveSessionDraft]);

  // Reload session from store when screen comes back into focus (e.g., after editing a block)
  // But only if the session exists in the store (has been saved at least once)
  // Skip this if we just processed params (to avoid overwriting unsaved changes)
  useFocusEffect(
    React.useCallback(() => {
      // Only reload from store if there are no pending params to process
      const { updatedBlockId } = route.params || {};
      if (updatedBlockId) {
        // Params are being processed by the useEffect above, don't reload from store
        return;
      }
      
      // If no params to process, reload from store (only if session exists)
      if (sessionId) {
        const currentSession = sessionTemplates.find((s) => s.id === sessionId);
        if (currentSession) {
          // Set flag to prevent autosave during reload
          isLoadingFromStoreRef.current = true;
          
          // Session exists in store - update local state with latest from store
          const newItems = currentSession.items ? [...currentSession.items] : [];
          const newName = currentSession.name || 'New Session';
          const newScheduled = currentSession.scheduledDaysOfWeek || [];
          
          setItems(newItems);
          setSessionName(newName);
          setScheduledDaysOfWeek(newScheduled);
          
          // Update last saved ref to match what we just loaded (prevents false "changes" on initial load)
          lastSavedRef.current = {
            name: newName,
            items: newItems.map(item => ({ ...item })),
            scheduledDaysOfWeek: newScheduled,
          };
          
          // Reset the unsaved changes flag since we just loaded
          hasUnsavedChangesRef.current = false;
          
          // Clear flag after a brief delay to allow state updates to complete
          setTimeout(() => {
            isLoadingFromStoreRef.current = false;
          }, 100);
        } else {
          // Session doesn't exist in store - restore from draft for unsaved sessions
          const draft = getSessionDraft(sessionId);
          if (draft) {
            setItems(draft.items ? [...draft.items] : []);
            setSessionName(draft.name || 'New Session');
            setScheduledDaysOfWeek(draft.scheduledDaysOfWeek || []);
            lastSavedRef.current = null; // Clear last saved for unsaved sessions
          }
        }
      }
      
      // Cleanup function - show toast when navigating away if there were unsaved changes
      return () => {
        // Screen is losing focus - show toast if there were unsaved changes
        if (hasUnsavedChangesRef.current && isEditing) {
          setToastVisible(true);
          hasUnsavedChangesRef.current = false;
        }
        // Clear timeout when navigating away
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }, [sessionId, sessionTemplates, route.params?.updatedBlockId, getSessionDraft, isEditing])
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        // Only show Save button for new sessions (not when editing existing sessions)
        isEditing ? null : (
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        )
      ),
    });
  }, [isEditing, sessionName, items, scheduledDaysOfWeek]);

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
          scheduledDaysOfWeek: scheduledDaysOfWeek,
        });
      } else {
        // Check session limit for free users when creating new session
        if (!settings.isProUser && sessionTemplates.length >= 5) {
          setProModalVisible(true);
          return;
        }
        const newSession = await addSessionTemplate({
          name: sessionName.trim(),
          items,
          scheduledDaysOfWeek: scheduledDaysOfWeek,
        });
        // Delete the draft now that it's been saved
        if (sessionId) {
          deleteSessionDraft(sessionId);
        }
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save session. Please try again.');
      console.error(error);
    }
  };
  
  const handleProModalUpgrade = () => {
    setProModalVisible(false);
    navigation.getParent()?.navigate('Settings', { screen: 'GoPro' });
  };

  const handleAddBlock = (blockInstance) => {
    const newItems = [...items, blockInstance];
    setItems(newItems);
    // Only save draft for new sessions (autosave handles existing sessions)
    if (!isEditing) {
      saveDraftNow(newItems);
    }
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
            // Only save draft for new sessions (autosave handles existing sessions)
            if (!isEditing) {
              saveDraftNow(newItems);
            }
          },
        },
      ]
    );
  };

  const handleDuplicateItem = (index) => {
    const item = items[index];
    // Explicitly copy all fields to ensure nothing is missed
    const duplicated = {
      id: generateId(), // New ID for the duplicate
      templateId: item.templateId || null, // Keep the same templateId if it exists
      label: item.label || '',
      type: item.type || BlockType.ACTIVITY,
      category: item.category || null,
      mode: item.mode || BlockMode.DURATION,
      durationSeconds: item.durationSeconds || 0,
      reps: item.reps || 0,
      perRepSeconds: item.perRepSeconds || 0,
      notes: item.notes || null,
    };
    const newItems = [...items];
    newItems.splice(index + 1, 0, duplicated);
    setItems(newItems);
    // Only save draft for new sessions (autosave handles existing sessions)
    if (!isEditing) {
      saveDraftNow(newItems);
    }
  };

  const handleEditItem = (index) => {
    const item = items[index];
    // Navigate to BlockEditScreen with session context
    // blockInstanceId is the id of the BlockInstance in the session
    // sessionId identifies which session we're editing (use generated ID if null)
    // blockIndex is the position in the session
    // blockInstanceData is the item data itself - needed for unsaved items (like duplicates)
    navigation.navigate('BlockEdit', {
      blockInstanceId: item.id,
      sessionId: sessionId, // This will be the generated ID for new sessions
      blockIndex: index,
      blockInstanceData: item, // Pass the item data directly for unsaved items
    });
  };

  // Helper function to save draft immediately
  const saveDraftNow = (itemsToSave) => {
    if (sessionId && !existingSession) {
      saveSessionDraft(sessionId, {
        name: sessionName,
        items: itemsToSave.map(item => ({ ...item })),
        scheduledDaysOfWeek: scheduledDaysOfWeek,
      });
    }
  };

  const handleMoveUp = (index) => {
    if (index > 0) {
      const newItems = [...items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      setItems(newItems);
      // Only save draft for new sessions (autosave handles existing sessions)
      if (!isEditing) {
        saveDraftNow(newItems);
      }
    }
  };

  const handleMoveDown = (index) => {
    if (index < items.length - 1) {
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      setItems(newItems);
      // Only save draft for new sessions (autosave handles existing sessions)
      if (!isEditing) {
        saveDraftNow(newItems);
      }
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
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.duplicateButton]}
            onPress={() => handleDuplicateItem(index)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="copy-outline" size={18} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteItem(index)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={colors.errorText} />
          </TouchableOpacity>
      </View>
    </View>
  );
};

  const totalDuration = getSessionTotalDuration({ items });
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {/* Toast Notification - positioned at top near session name */}
      <Toast 
        message="Changes Saved" 
        visible={toastVisible} 
        onHide={() => setToastVisible(false)} 
      />
      
      <ScrollView 
        style={styles.content} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 + Math.max(insets.bottom, 0) }}
      >
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
          navigation={navigation}
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
      
      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        visible={proModalVisible}
        onClose={() => setProModalVisible(false)}
        limitType="sessions"
        onUpgrade={handleProModalUpgrade}
      />
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
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
    justifyContent: 'center',
    alignItems: 'center',
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
