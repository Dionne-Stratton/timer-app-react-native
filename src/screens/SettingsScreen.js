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
import useStore from '../store';

export default function SettingsScreen({ navigation }) {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);

  const handlePreCountdownChange = (seconds) => {
    updateSettings({ preCountdownSeconds: seconds });
  };

  const handleWarningSecondsChange = (seconds) => {
    updateSettings({ warningSecondsBeforeEnd: seconds });
  };

  const handleToggle = (key) => {
    updateSettings({ [key]: !settings[key] });
  };

  const handleImportSession = () => {
    // Navigate to import screen or show import dialog
    navigation.navigate('ImportSession');
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
        trackColor={{ false: '#ddd', true: '#6200ee' }}
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          onPress={() => Alert.alert(
            'Import Session',
            'Import session functionality will be available in the session options menu on the Home screen.',
            [{ text: 'OK' }]
          )}
        >
          <Text style={styles.actionButtonText}>Import Session</Text>
        </TouchableOpacity>
        <Text style={styles.actionDescription}>
          Import a session file (.bztimer or .session.json) from the session options menu
        </Text>
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
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
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
    color: '#6200ee',
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
    backgroundColor: '#6200ee',
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
});
