import React, { useState, useEffect } from "react";
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
} from "react-native";
import useStore from "../store";
import {
  BlockType,
  BlockMode,
  getBlockTypeColor,
  BUILT_IN_CATEGORIES,
} from "../types";
import { generateId } from "../utils/id";
import { useTheme } from "../theme";
import ProUpgradeModal from "../components/ProUpgradeModal";
import { Ionicons } from "@expo/vector-icons";

export default function BlockEditScreen({ navigation, route }) {
  const { blockId, blockInstanceId, sessionId, blockIndex, blockInstanceData } =
    route.params || {};
  const colors = useTheme();
  const blockTemplates = useStore((state) => state.blockTemplates);
  const sessionTemplates = useStore((state) => state.sessionTemplates);
  const settings = useStore((state) => state.settings);
  const addBlockTemplate = useStore((state) => state.addBlockTemplate);
  const updateBlockTemplate = useStore((state) => state.updateBlockTemplate);
  const updateSessionTemplate = useStore(
    (state) => state.updateSessionTemplate
  );
  const updateSettings = useStore((state) => state.updateSettings);

  // Determine if we're editing a library template or a session instance
  const isEditingLibraryTemplate = blockId !== null && blockId !== undefined;
  const isEditingSessionInstance =
    blockInstanceId !== null &&
    blockInstanceId !== undefined &&
    sessionId !== null &&
    sessionId !== undefined;

  // Get the existing block - either from library or from session
  // Use useMemo to recompute when dependencies change
  // If blockInstanceData is provided, use it (for unsaved items like duplicates)
  // Otherwise, look it up from the store
  const existingBlock = React.useMemo(() => {
    if (isEditingLibraryTemplate) {
      return blockTemplates.find((b) => b.id === blockId) || null;
    } else if (isEditingSessionInstance) {
      // First check if item data was passed directly (for unsaved items)
      if (blockInstanceData && blockInstanceData.id === blockInstanceId) {
        return blockInstanceData;
      }
      // Otherwise, look it up from the store
      const session = sessionTemplates.find((s) => s.id === sessionId);
      return (
        session?.items?.find((item) => item.id === blockInstanceId) || null
      );
    }
    return null;
  }, [
    isEditingLibraryTemplate,
    isEditingSessionInstance,
    blockId,
    blockInstanceId,
    sessionId,
    blockInstanceData,
    blockTemplates,
    sessionTemplates,
  ]);

  const isEditing = isEditingLibraryTemplate || isEditingSessionInstance;

  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Uncategorized");
  const [mode, setMode] = useState(BlockMode.DURATION);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [proModalVisible, setProModalVisible] = useState(false);

  // Custom category management state
  const [showCustomCategoryDropdown, setShowCustomCategoryDropdown] =
    useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  // Separate built-in and custom categories
  const builtInCategories = React.useMemo(() => {
    return [...BUILT_IN_CATEGORIES];
  }, []);

  const customCategories = React.useMemo(() => {
    return settings.customCategories || [];
  }, [settings.customCategories]);

  // Get all available categories (built-in + custom, with custom shown even if not Pro)
  const allCategories = React.useMemo(() => {
    return [...builtInCategories, ...customCategories];
  }, [builtInCategories, customCategories]);

  // Check if a category is custom (not built-in)
  const isCustomCategory = (cat) => {
    return !BUILT_IN_CATEGORIES.includes(cat);
  };

  // Filter to only activities (for checking category usage)
  const activities = blockTemplates.filter(
    (template) => template.type === BlockType.ACTIVITY
  );

  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [reps, setReps] = useState(10);
  const [perRepSeconds, setPerRepSeconds] = useState(5);
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");

  // Initialize and update state when existingBlock changes
  useEffect(() => {
    if (existingBlock) {
      setLabel(existingBlock.label || "");
      setCategory(existingBlock.category || "Uncategorized");
      setMode(existingBlock.mode || BlockMode.DURATION);
      if (existingBlock.mode === BlockMode.DURATION) {
        setMinutes(Math.floor((existingBlock.durationSeconds || 0) / 60));
        setSeconds((existingBlock.durationSeconds || 0) % 60);
      } else {
        setReps(existingBlock.reps || 10);
        setPerRepSeconds(existingBlock.perRepSeconds || 5);
      }
      setNotes(existingBlock.notes || "");
      setUrl(existingBlock.url || "");
    }
  }, [existingBlock]);
  const [showUpdateAllModal, setShowUpdateAllModal] = useState(false);
  const [pendingBlockData, setPendingBlockData] = useState(null);
  const styles = getStyles(colors);

  // Update header title based on context
  useEffect(() => {
    let title = "Add Activity";
    if (isEditingLibraryTemplate) {
      title = "Edit Activity";
    } else if (isEditingSessionInstance) {
      const blockTypeLabel =
        existingBlock?.type === BlockType.REST
          ? "Rest"
          : existingBlock?.type === BlockType.TRANSITION
          ? "Transition"
          : "Activity";
      title = `Edit ${blockTypeLabel}`;
    }

    navigation.setOptions({
      title,
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [
    isEditingLibraryTemplate,
    isEditingSessionInstance,
    existingBlock?.type,
    label,
    category,
    mode,
    minutes,
    seconds,
    reps,
    perRepSeconds,
    notes,
    styles,
  ]);

  const handleSave = async () => {
    // Check if editing a rest/transition block from session builder
    const isRestOrTransitionFromSession =
      isEditingSessionInstance &&
      (existingBlock?.type === BlockType.REST ||
        existingBlock?.type === BlockType.TRANSITION);

    // Validation - skip label validation for rest/transition blocks
    if (!isRestOrTransitionFromSession && !label.trim()) {
      Alert.alert("Validation Error", "Please enter a name for this activity.");
      return;
    }

    let durationSeconds = 0;
    if (mode === BlockMode.DURATION || isRestOrTransitionFromSession) {
      durationSeconds = minutes * 60 + seconds;
      if (durationSeconds <= 0) {
        Alert.alert(
          "Validation Error",
          "Duration must be greater than 0 seconds."
        );
        return;
      }
    } else if (mode === BlockMode.REPS) {
      if (reps <= 0) {
        Alert.alert(
          "Validation Error",
          "Number of reps must be greater than 0."
        );
        return;
      }
      if (perRepSeconds <= 0) {
        Alert.alert(
          "Validation Error",
          "Seconds per rep must be greater than 0."
        );
        return;
      }
    }

    const blockData = {
      // For rest/transition blocks from session, preserve original label and mode
      label: isRestOrTransitionFromSession
        ? existingBlock?.label
        : label.trim(),
      type: isEditingSessionInstance ? existingBlock?.type : BlockType.ACTIVITY, // Keep existing type for session instances
      category:
        isEditingSessionInstance && existingBlock?.type !== BlockType.ACTIVITY
          ? null // Rest and Transition don't have categories
          : category === "Uncategorized"
          ? null
          : category,
      // For rest/transition blocks from session, always use DURATION mode
      mode: isRestOrTransitionFromSession ? BlockMode.DURATION : mode,
      // For rest/transition blocks, only duration is allowed
      ...(isRestOrTransitionFromSession || mode === BlockMode.DURATION
        ? { durationSeconds }
        : { reps, perRepSeconds }),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(url.trim() ? { url: url.trim() } : {}),
    };

    try {
      if (isEditingLibraryTemplate) {
        // Editing a library template - normal flow
        await updateBlockTemplate(blockId, blockData);
        navigation.goBack();
      } else if (isEditingSessionInstance) {
        // Editing a session instance
        const session = sessionTemplates.find((s) => s.id === sessionId);

        // If session doesn't exist in store (unsaved session), handle via navigation params
        if (!session) {
          // Session doesn't exist in store - this is an unsaved session
          // Navigate back to SessionBuilder with params
          // The draft system will handle restoring the items
          navigation.replace("SessionBuilder", {
            sessionId: sessionId,
            updatedBlockId: blockInstanceId,
            updatedBlockData: blockData,
            updateAll: false,
          });
          return;
        }

        // Check if this activity appears multiple times in the session
        // We need to check based on what we're matching:
        // - For activities with templateId: match by templateId
        // - For rest/transition or activities without templateId: match by original label
        const originalTemplateId = existingBlock?.templateId;
        const originalLabel = existingBlock?.label;

        const matchingInstances = session.items.filter((item) => {
          if (item.id === blockInstanceId) return false; // Don't count the one we're editing

          // For activities with templateId, match by templateId
          if (item.type === BlockType.ACTIVITY && originalTemplateId) {
            return item.templateId === originalTemplateId;
          }

          // For rest/transition, or activities without templateId, match by original label
          return item.label === originalLabel;
        });

        if (matchingInstances.length > 0) {
          // Multiple instances found - ask user what to do
          setPendingBlockData(blockData);
          setShowUpdateAllModal(true);
        } else {
          // Only one instance - just update it
          await updateSessionInstance(blockData, false);
        }
      } else {
        // Creating new library template
        // Check activity limit for free users when creating new activity
        const activities = blockTemplates.filter(
          (b) => b.type === BlockType.ACTIVITY
        );
        if (!settings.isProUser && activities.length >= 20) {
          setProModalVisible(true);
          return;
        }
        await addBlockTemplate(blockData);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save. Please try again.");
      console.error(error);
    }
  };

  const updateSessionInstance = async (blockData, updateAll) => {
    try {
      let session = sessionTemplates.find((s) => s.id === sessionId);

      // If session doesn't exist in store yet (unsaved session), pass data back via navigation
      if (!session) {
        // Session doesn't exist in store - this means it's a new/unsaved session
        // Navigate back to SessionBuilder with params
        // The draft system will handle restoring the items
        navigation.navigate("SessionBuilder", {
          sessionId: sessionId,
          updatedBlockId: blockInstanceId,
          updatedBlockData: blockData,
          updateAll: updateAll,
        });
        return;
      }

      const updatedItems = [...session.items];

      // Store original values for matching (use existingBlock which was loaded at start)
      const originalTemplateId = existingBlock?.templateId;
      const originalLabel = existingBlock?.label;

      if (updateAll) {
        // Update all matching instances in the session
        updatedItems.forEach((item, idx) => {
          // Check if this is a matching instance
          let isMatching = false;

          if (item.id === blockInstanceId) {
            // The one being edited - always update
            isMatching = true;
          } else if (item.type === BlockType.ACTIVITY && originalTemplateId) {
            // Activities with templateId - match by templateId
            isMatching = item.templateId === originalTemplateId;
          } else {
            // Rest/transition or activities without templateId - match by original label
            isMatching = item.label === originalLabel;
          }

          if (isMatching) {
            updatedItems[idx] = {
              ...item,
              ...blockData,
              // Preserve id and templateId
              id: item.id,
              templateId: item.templateId,
            };
          }
        });
      } else {
        // Update only the one instance being edited
        const index = updatedItems.findIndex(
          (item) => item.id === blockInstanceId
        );
        if (index !== -1) {
          updatedItems[index] = {
            ...updatedItems[index],
            ...blockData,
            // Preserve id and templateId
            id: updatedItems[index].id,
            templateId: updatedItems[index].templateId,
          };
        }
      }

      await updateSessionTemplate(sessionId, { items: updatedItems });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to update session. Please try again.");
      console.error(error);
    }
  };

  const handleUpdateAll = async () => {
    setShowUpdateAllModal(false);
    if (pendingBlockData) {
      const session = sessionTemplates.find((s) => s.id === sessionId);
      if (!session) {
        // Session doesn't exist in store - handle via navigation params
        navigation.navigate("SessionBuilder", {
          sessionId: sessionId,
          updatedBlockId: blockInstanceId,
          updatedBlockData: pendingBlockData,
          updateAll: true,
          restoreFromRef: true, // Signal to restore items from ref
        });
        setPendingBlockData(null);
        return;
      }
      await updateSessionInstance(pendingBlockData, true);
      setPendingBlockData(null);
    }
  };

  const handleUpdateOne = async () => {
    setShowUpdateAllModal(false);
    if (pendingBlockData) {
      const session = sessionTemplates.find((s) => s.id === sessionId);
      if (!session) {
        // Session doesn't exist in store - handle via navigation params
        navigation.navigate("SessionBuilder", {
          sessionId: sessionId,
          updatedBlockId: blockInstanceId,
          updatedBlockData: pendingBlockData,
          updateAll: false,
          restoreFromRef: true, // Signal to restore items from ref
        });
        setPendingBlockData(null);
        return;
      }
      await updateSessionInstance(pendingBlockData, false);
      setPendingBlockData(null);
    }
  };

  const handleAddCategory = () => {
    if (!settings.isProUser) {
      setProModalVisible(true);
      return;
    }
    setShowAddCategoryModal(true);
  };

  const handleCategorySelect = (cat) => {
    // If it's a custom category and user is not Pro, show Pro modal
    if (isCustomCategory(cat) && !settings.isProUser) {
      setProModalVisible(true);
      return;
    }
    setCategory(cat);
  };

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Validation Error", "Please enter a category name.");
      return;
    }
    const trimmedName = newCategoryName.trim();
    if (BUILT_IN_CATEGORIES.includes(trimmedName)) {
      Alert.alert(
        "Validation Error",
        "This category already exists as a built-in category."
      );
      return;
    }
    if (settings.customCategories?.includes(trimmedName)) {
      Alert.alert("Validation Error", "This category already exists.");
      return;
    }

    const updatedCategories = [
      ...(settings.customCategories || []),
      trimmedName,
    ];
    updateSettings({ customCategories: updatedCategories });
    setCategory(trimmedName);
    setNewCategoryName("");
    setShowAddCategoryModal(false);
  };

  const handleEditCategory = (categoryName) => {
    // Check if any activities use this category
    const activitiesUsingCategory = activities.filter(
      (activity) => (activity.category || "Uncategorized") === categoryName
    );

    if (activitiesUsingCategory.length > 0) {
      Alert.alert(
        "Edit Category",
        `Editing this category will update all ${
          activitiesUsingCategory.length
        } activit${
          activitiesUsingCategory.length === 1 ? "y" : "ies"
        } using it. Continue?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Continue",
            onPress: () => {
              setEditingCategory(categoryName);
              setEditCategoryName(categoryName);
              setShowEditCategoryModal(true);
            },
          },
        ]
      );
    } else {
      // No activities using it, proceed directly
      setEditingCategory(categoryName);
      setEditCategoryName(categoryName);
      setShowEditCategoryModal(true);
    }
  };

  const handleSaveEditCategory = async () => {
    if (!editCategoryName.trim()) {
      Alert.alert("Validation Error", "Category name cannot be empty.");
      return;
    }
    const trimmedName = editCategoryName.trim();

    // Check if new name already exists
    if (trimmedName === editingCategory) {
      setShowEditCategoryModal(false);
      setEditingCategory(null);
      setEditCategoryName("");
      return;
    }

    if (
      BUILT_IN_CATEGORIES.includes(trimmedName) ||
      customCategories.includes(trimmedName)
    ) {
      Alert.alert("Validation Error", "Category already exists.");
      return;
    }

    // Update category name in settings
    const updated = customCategories.map((cat) =>
      cat === editingCategory ? trimmedName : cat
    );
    updateSettings({ customCategories: updated });

    // Update all activities using this category
    const activitiesUsingCategory = activities.filter(
      (activity) => (activity.category || "Uncategorized") === editingCategory
    );
    for (const activity of activitiesUsingCategory) {
      await updateBlockTemplate(activity.id, { category: trimmedName });
    }

    // Update current category if it was the one being edited
    if (category === editingCategory) {
      setCategory(trimmedName);
    }

    setShowEditCategoryModal(false);
    setEditingCategory(null);
    setEditCategoryName("");
    // Keep dropdown open after editing
  };

  const handleDeleteCategory = (categoryName) => {
    // Check if any activities use this category
    const activitiesUsingCategory = activities.filter(
      (activity) => (activity.category || "Uncategorized") === categoryName
    );

    if (activitiesUsingCategory.length > 0) {
      Alert.alert(
        "Delete Category",
        `Deleting this category will make ${
          activitiesUsingCategory.length
        } activit${
          activitiesUsingCategory.length === 1 ? "y" : "ies"
        } uncategorized. Continue?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Remove category
              const updated = customCategories.filter(
                (cat) => cat !== categoryName
              );
              updateSettings({ customCategories: updated });

              // Update all activities to be uncategorized
              for (const activity of activitiesUsingCategory) {
                await updateBlockTemplate(activity.id, { category: null });
              }

              // If this category was selected, reset to Uncategorized
              if (category === categoryName) {
                setCategory("Uncategorized");
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Delete Category",
        `Are you sure you want to delete "${categoryName}"?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              const updated = customCategories.filter(
                (cat) => cat !== categoryName
              );
              updateSettings({ customCategories: updated });
              // If this category was selected, reset to Uncategorized
              if (category === categoryName) {
                setCategory("Uncategorized");
              }
            },
          },
        ]
      );
    }
    // Keep dropdown open after deleting
  };

  const renderModeButton = (blockMode, label) => (
    <TouchableOpacity
      style={[styles.modeButton, mode === blockMode && styles.modeButtonActive]}
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

  // Check if editing a rest/transition block from session builder
  const isRestOrTransitionFromSession =
    isEditingSessionInstance &&
    (existingBlock?.type === BlockType.REST ||
      existingBlock?.type === BlockType.TRANSITION);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* Name/Label - Hidden for rest/transition blocks from session builder */}
        {!isRestOrTransitionFromSession && (
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
        )}

        {/* Category Selection - Only for activities */}
        {(!isEditingSessionInstance ||
          existingBlock?.type === BlockType.ACTIVITY) && (
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryContainer}>
              {/* Custom Categories Dropdown - pill button */}
              {customCategories.length > 0 &&
                (() => {
                  const selectedCustomCategory = customCategories.find(
                    (cat) => category === cat
                  );
                  const displayText = selectedCustomCategory || "Custom";
                  return (
                    <View style={styles.customCategoryPillContainer}>
                      <TouchableOpacity
                        style={[
                          styles.categoryChip,
                          selectedCustomCategory && styles.categoryChipActive,
                        ]}
                        onPress={() =>
                          setShowCustomCategoryDropdown(
                            !showCustomCategoryDropdown
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            selectedCustomCategory &&
                              styles.categoryChipTextActive,
                          ]}
                        >
                          {displayText} {showCustomCategoryDropdown ? "▼" : "▶"}
                        </Text>
                      </TouchableOpacity>
                      {showCustomCategoryDropdown && (
                        <View style={styles.customCategoryDropdownAbsolute}>
                          {customCategories.map((cat, index) => (
                            <View
                              key={cat}
                              style={[
                                styles.customCategoryDropdownItem,
                                index === customCategories.length - 1 &&
                                  styles.customCategoryDropdownItemLast,
                              ]}
                            >
                              <TouchableOpacity
                                style={[
                                  styles.customCategoryDropdownItemContent,
                                  category === cat &&
                                    styles.customCategoryDropdownItemContentActive,
                                ]}
                                onPress={() => {
                                  setCategory(cat);
                                  setShowCustomCategoryDropdown(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.customCategoryDropdownItemText,
                                    category === cat &&
                                      styles.customCategoryDropdownItemTextActive,
                                  ]}
                                >
                                  {cat}
                                </Text>
                              </TouchableOpacity>
                              <View style={styles.customCategoryActions}>
                                <TouchableOpacity
                                  style={styles.customCategoryActionButton}
                                  onPress={() => handleEditCategory(cat)}
                                >
                                  <Text
                                    style={
                                      styles.customCategoryActionButtonText
                                    }
                                  >
                                    ✏️
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.customCategoryActionButton}
                                  onPress={() => handleDeleteCategory(cat)}
                                >
                                  <Text
                                    style={
                                      styles.customCategoryActionButtonText
                                    }
                                  >
                                    🗑️
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })()}
              {/* Built-in categories as chips */}
              {builtInCategories.map((cat) => {
                const isLocked = false; // Built-in categories are never locked
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => handleCategorySelect(cat)}
                    disabled={isLocked}
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
                style={[
                  styles.addCategoryButton,
                  styles.addCategoryButtonDisabled,
                ]}
                disabled
              >
                <Text
                  style={[
                    styles.addCategoryButtonText,
                    styles.addCategoryButtonTextDisabled,
                  ]}
                >
                  🔒 + Add Category (Pro)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Mode Selection - Hidden for rest/transition blocks from session builder */}
        {!isRestOrTransitionFromSession && (
          <View style={styles.section}>
            <Text style={styles.label}>Mode *</Text>
            <View style={styles.modeButtonContainer}>
              {renderModeButton(BlockMode.DURATION, "Duration")}
              {renderModeButton(BlockMode.REPS, "Reps")}
            </View>
          </View>
        )}

        {/* Duration Input - Always shown for rest/transition blocks, conditional for others */}
        {(mode === BlockMode.DURATION || isRestOrTransitionFromSession) && (
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

        {/* URL (Optional) - Only for activities */}
        {(!isEditingSessionInstance ||
          existingBlock?.type === BlockType.ACTIVITY) && (
          <View style={styles.section}>
            <Text style={styles.label}>URL (Optional)</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
        )}
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
                  setNewCategoryName("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveCategory}
              >
                <Text
                  style={[styles.modalButtonText, styles.modalButtonTextSave]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        visible={showEditCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditCategoryModal(false);
          setEditingCategory(null);
          setEditCategoryName("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Category</Text>
            <TextInput
              style={styles.modalInput}
              value={editCategoryName}
              onChangeText={setEditCategoryName}
              placeholder="Category name"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowEditCategoryModal(false);
                  setEditingCategory(null);
                  setEditCategoryName("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveEditCategory}
              >
                <Text
                  style={[styles.modalButtonText, styles.modalButtonTextSave]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        visible={proModalVisible}
        onClose={() => setProModalVisible(false)}
        limitType="customCategory"
      />

      {/* Update All Instances Modal */}
      <Modal
        visible={showUpdateAllModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowUpdateAllModal(false);
          setPendingBlockData(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update All Instances?</Text>
            {(() => {
              const session = sessionTemplates.find((s) => s.id === sessionId);
              if (!session) {
                return (
                  <Text style={styles.modalMessage}>
                    Do you want to update all instances in this session, or only
                    this one?
                  </Text>
                );
              }

              const matchingCount = session.items.filter((item) => {
                if (item.id === blockInstanceId) return false; // Don't count the one being edited
                if (
                  item.type === BlockType.ACTIVITY &&
                  existingBlock?.templateId
                ) {
                  return item.templateId === existingBlock.templateId;
                }
                return item.label === existingBlock?.label;
              }).length;

              const totalInstances = matchingCount + 1; // +1 for the one being edited
              const blockTypeLabel =
                existingBlock?.type === BlockType.ACTIVITY
                  ? "activity"
                  : existingBlock?.type === BlockType.REST
                  ? "rest"
                  : "transition";

              return (
                <>
                  <Text style={styles.modalMessage}>
                    This {blockTypeLabel} appears {totalInstances} time
                    {totalInstances > 1 ? "s" : ""} in this session.
                  </Text>
                  <Text style={styles.modalMessage}>
                    Do you want to update all instances in this session, or only
                    this one?
                  </Text>
                </>
              );
            })()}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowUpdateAllModal(false);
                  setPendingBlockData(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleUpdateOne}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  This One
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleUpdateAll}
              >
                <Text
                  style={[styles.modalButtonText, styles.modalButtonTextSave]}
                >
                  All Instances
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
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
      fontWeight: "600",
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
      flexDirection: "row",
      flexWrap: "wrap",
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
      fontWeight: "500",
      color: colors.textSecondary,
    },
    categoryChipTextActive: {
      color: colors.textLight,
      fontWeight: "600",
    },
    categoryChipLocked: {
      opacity: 0.7,
    },
    categoryChipTextLocked: {
      color: colors.textTertiary,
    },
    addCategoryButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    addCategoryButtonDisabled: {
      opacity: 0.5,
    },
    addCategoryButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
    },
    addCategoryButtonTextDisabled: {
      color: colors.textTertiary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      width: "80%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    modalMessage: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 22,
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
      flexDirection: "row",
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    modalButtonCancel: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonSecondary: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonSave: {
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    modalButtonTextSave: {
      color: colors.textLight,
    },
    modeButtonContainer: {
      flexDirection: "row",
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
      alignItems: "center",
    },
    modeButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.purpleLight,
    },
    modeButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    modeButtonTextActive: {
      color: colors.primary,
    },
    durationContainer: {
      flexDirection: "row",
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
      textAlign: "center",
      color: colors.text,
    },
    durationLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
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
      fontWeight: "600",
    },
    customCategoryPillContainer: {
      position: "relative",
    },
    customCategoryDropdownAbsolute: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: 4,
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 200,
      zIndex: 1000,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    customCategoryDropdownItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    customCategoryDropdownItemLast: {
      borderBottomWidth: 0,
    },
    customCategoryDropdownItemContent: {
      flex: 1,
      paddingVertical: 4,
    },
    customCategoryDropdownItemContentActive: {
      backgroundColor: colors.primaryLight,
    },
    customCategoryDropdownItemText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    customCategoryDropdownItemTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    customCategoryActions: {
      flexDirection: "row",
      gap: 8,
      marginLeft: 8,
    },
    customCategoryActionButton: {
      padding: 6,
      minWidth: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    customCategoryActionButtonText: {
      fontSize: 16,
    },
  });
