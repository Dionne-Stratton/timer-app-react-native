import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { BlockType, getBlockTypeColor } from '../types';
import { generateId } from '../utils/id';
import { useTheme } from '../theme';

export default function AddRestTransitionModal({ visible, type, onClose, onAdd }) {
  const colors = useTheme();
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const styles = getStyles(colors);

  const handleAdd = () => {
    const durationSeconds = minutes * 60 + seconds;
    if (durationSeconds <= 0) {
      Alert.alert('Validation Error', 'Duration must be greater than 0 seconds.');
      return;
    }

    const blockInstance = {
      id: generateId(),
      templateId: null, // Rest/Transition are not from templates
      label: type === BlockType.REST ? 'Rest' : 'Transition',
      type: type,
      category: null, // Rest/Transition don't have categories
      mode: 'duration',
      durationSeconds: durationSeconds,
    };

    onAdd(blockInstance);
    
    // Reset form
    setMinutes(0);
    setSeconds(30);
    onClose();
  };

  const typeLabel = type === BlockType.REST ? 'Rest' : 'Transition';
  const typeColor = getBlockTypeColor(type, colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add {typeLabel}</Text>
          
          <Text style={styles.label}>Duration *</Text>
          <View style={styles.durationContainer}>
            <View style={styles.durationInputGroup}>
              <TextInput
                style={styles.durationInput}
                value={minutes.toString()}
                onChangeText={(text) => setMinutes(parseInt(text) || 0)}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={colors.textTertiary}
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
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={styles.durationLabel}>sec</Text>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: typeColor }]}
              onPress={handleAdd}
            >
              <Text style={[styles.modalButtonText, { color: colors.textLight }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors) => StyleSheet.create({
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
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  durationInputGroup: {
    flex: 1,
  },
  durationInput: {
    backgroundColor: colors.background,
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
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

