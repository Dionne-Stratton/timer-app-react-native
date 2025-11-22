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
} from 'react-native';
import useStore from '../store';
import { BlockType, BlockMode } from '../types';
import { generateId } from '../utils/id';

export default function BlockEditScreen({ navigation, route }) {
  const { blockId } = route.params || {};
  const blockTemplates = useStore((state) => state.blockTemplates);
  const addBlockTemplate = useStore((state) => state.addBlockTemplate);
  const updateBlockTemplate = useStore((state) => state.updateBlockTemplate);

  const isEditing = blockId !== null && blockId !== undefined;
  const existingBlock = isEditing
    ? blockTemplates.find((b) => b.id === blockId)
    : null;

  const [label, setLabel] = useState(existingBlock?.label || '');
  const [type, setType] = useState(existingBlock?.type || BlockType.ACTIVITY);
  const [mode, setMode] = useState(existingBlock?.mode || BlockMode.DURATION);
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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [label, type, mode, minutes, seconds, reps, perRepSeconds, notes]);

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
      type,
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

  const renderTypeButton = (blockType, label) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        type === blockType && styles.typeButtonActive,
      ]}
      onPress={() => setType(blockType)}
    >
      <Text
        style={[
          styles.typeButtonText,
          type === blockType && styles.typeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

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
            placeholderTextColor="#999"
          />
        </View>

        {/* Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Type *</Text>
          <View style={styles.typeButtonContainer}>
            {renderTypeButton(BlockType.ACTIVITY, 'Activity')}
            {renderTypeButton(BlockType.REST, 'Rest')}
            {renderTypeButton(BlockType.TRANSITION, 'Transition')}
          </View>
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
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
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
  typeButtonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#4A7C9E',
    backgroundColor: '#f3e5f5',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#4A7C9E',
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
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#4A7C9E',
    backgroundColor: '#f3e5f5',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#4A7C9E',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  durationInputGroup: {
    flex: 1,
  },
  durationInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
  },
  durationLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
