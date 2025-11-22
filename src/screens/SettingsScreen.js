import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import useStore from '../store';
import { sessionSharingService } from '../services/sessionSharing';

export default function SettingsScreen({ navigation }) {
  const [safeAreaKey, setSafeAreaKey] = React.useState(0);
  const insets = useSafeAreaInsets();
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const addSessionTemplate = useStore((state) => state.addSessionTemplate);
  const deleteAllHistory = useStore((state) => state.deleteAllHistory);
  
  // Force recalculation when screen comes back into focus (after modal closes)
  useFocusEffect(
    React.useCallback(() => {
      // Force re-render to recalculate safe areas after returning from modal
      setSafeAreaKey(prev => prev + 1);
      return () => {};
    }, [])
  );

  const handlePreCountdownChange = (seconds) => {
    updateSettings({ preCountdownSeconds: seconds });
  };

  const handleWarningSecondsChange = (seconds) => {
    updateSettings({ warningSecondsBeforeEnd: seconds });
  };

  const handleToggle = (key) => {
    updateSettings({ [key]: !settings[key] });
  };

  const handleImportSession = async () => {
    const importedSession = await sessionSharingService.importSession();
    // Force re-render to recalculate safe areas after modal closes
    setSafeAreaKey(prev => prev + 1);
    if (importedSession) {
      await addSessionTemplate(importedSession);
      // No need to call initialize() - addSessionTemplate already saves and updates the store
      Alert.alert('Success', 'Session imported successfully!');
    }
  };

  const handleHistoryRetentionChange = (retention) => {
    updateSettings({ historyRetention: retention });
  };

  const handleDeleteAllHistory = () => {
    Alert.alert(
      'Delete All History',
      'This will permanently delete all session history, including streaks and statistics. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllHistory();
            Alert.alert('Success', 'All history has been deleted.');
          },
        },
      ]
    );
  };

  const renderSettingSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderToggleSetting = (label, description, value, onToggle) => (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#ddd', true: '#4A7C9E' }}
        thumbColor="#fff"
      />
    </View>
  );

  const renderOptionSetting = (label, description, options, currentValue, onSelect) => (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              currentValue === option.value && styles.optionButtonActive,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.optionButtonText,
                currentValue === option.value && styles.optionButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderNumberSetting = (label, description, value, onValueChange, min = 0, max = 60) => (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      <View style={styles.numberInputContainer}>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => {
            if (value > min) {
              onValueChange(value - 1);
            }
          }}
          disabled={value <= min}
        >
          <Text style={[styles.numberButtonText, value <= min && styles.numberButtonTextDisabled]}>−</Text>
        </TouchableOpacity>
        <Text style={styles.numberValue}>{value}</Text>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => {
            if (value < max) {
              onValueChange(value + 1);
            }
          }}
          disabled={value >= max}
        >
          <Text style={[styles.numberButtonText, value >= max && styles.numberButtonTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View key={safeAreaKey} style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
      {/* Pre-countdown Settings */}
      {renderSettingSection('Pre-countdown', (
        <View>
          {renderOptionSetting(
            'Pre-countdown Length',
            'Countdown before session starts (0, 3, or 5 seconds)',
            [
              { label: '0s', value: 0 },
              { label: '3s', value: 3 },
              { label: '5s', value: 5 },
            ],
            settings.preCountdownSeconds,
            handlePreCountdownChange
          )}
        </View>
      ))}

      {/* Warning Settings */}
      {renderSettingSection('Warning', (
        <View>
          {renderNumberSetting(
            'Warning Time',
            'Seconds before block end to show warning (0-60)',
            settings.warningSecondsBeforeEnd,
            handleWarningSecondsChange,
            0,
            60
          )}
        </View>
      ))}

      {/* Audio & Haptic Settings */}
      {renderSettingSection('Audio & Haptic Feedback', (
        <View>
          {renderToggleSetting(
            'Enable Sounds',
            'Play sound cues for block transitions and completion',
            settings.enableSounds,
            () => handleToggle('enableSounds')
          )}
          {renderToggleSetting(
            'Enable Vibration',
            'Use haptic feedback for block transitions',
            settings.enableVibration,
            () => handleToggle('enableVibration')
          )}
        </View>
      ))}

      {/* Session Settings */}
      {renderSettingSection('Session', (
        <View>
          {renderToggleSetting(
            'Keep Screen Awake',
            'Prevent screen from sleeping during a session',
            settings.keepScreenAwakeDuringSession,
            () => handleToggle('keepScreenAwakeDuringSession')
          )}
        </View>
      ))}

      {/* Import/Export Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Sharing</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleImportSession}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>Import Session</Text>
        </TouchableOpacity>
        <Text style={styles.actionDescription}>
          Import a session file (.bztimer) from your device storage
        </Text>
      </View>

      {/* History Retention Section */}
      {renderSettingSection('History Retention', (
        <View>
          {renderOptionSetting(
            'Keep History For',
            'Automatically delete history older than selected period',
            [
              { label: 'Unlimited', value: 'unlimited' },
              { label: '3 months', value: '3months' },
              { label: '6 months', value: '6months' },
              { label: '12 months', value: '12months' },
            ],
            settings.historyRetention || 'unlimited',
            handleHistoryRetentionChange
          )}
        </View>
      ))}

      {/* Delete History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage History</Text>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeleteAllHistory}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete All History
          </Text>
        </TouchableOpacity>
        <Text style={styles.actionDescription}>
          Permanently delete all session history. This will reset your streaks and statistics.
        </Text>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonActive: {
    backgroundColor: '#4A7C9E',
    borderColor: '#4A7C9E',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  numberButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A7C9E',
  },
  numberButtonTextDisabled: {
    color: '#ccc',
  },
  numberValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#4A7C9E',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff5252',
  },
  deleteButtonText: {
    color: '#ff5252',
  },
});
