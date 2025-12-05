import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import useStore from "../store";
import { sessionSharingService } from "../services/sessionSharing";
import { useTheme } from "../theme";

// Warning time limits
const MIN_WARNING_SECONDS = 5;
const MAX_WARNING_SECONDS = 30;
const DEFAULT_WARNING_SECONDS = 10;

// Static preview sources (wrapping_up version so they’re long enough)
const WRAPPING_UP_FEMALE = require("../../assets/sounds/wrapping_up_female.mp3");
const WRAPPING_UP_MALE = require("../../assets/sounds/wrapping_up_male.mp3");
const WRAPPING_UP_MUSIC = require("../../assets/sounds/wrapping_up_music.mp3");

export default function SettingsScreen({ navigation }) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const addSessionTemplate = useStore((state) => state.addSessionTemplate);
  const deleteAllHistory = useStore((state) => state.deleteAllHistory);
  const deleteAllBlockTemplates = useStore(
    (state) => state.deleteAllBlockTemplates
  );
  const deleteAllSessionTemplates = useStore(
    (state) => state.deleteAllSessionTemplates
  );
  const blockTemplates = useStore((state) => state.blockTemplates);
  const sessionTemplates = useStore((state) => state.sessionTemplates);

  // ---- Audio cue pack & preview players ----
  // Fallback to "music" when the setting is missing so music behaves like the default
  const audioCuePack = settings.audioCuePack || "music";

  // One player per pack (local asset requires must be static)
  const femalePreviewPlayer = useAudioPlayer(WRAPPING_UP_FEMALE);
  const malePreviewPlayer = useAudioPlayer(WRAPPING_UP_MALE);
  const musicPreviewPlayer = useAudioPlayer(WRAPPING_UP_MUSIC);

  const playCuePreview = () => {
    if (!settings.enableSounds) {
      Alert.alert(
        "Sounds disabled",
        "Turn on “Enable Sounds” to preview audio cues."
      );
      return;
    }

    let player;
    if (audioCuePack === "female") {
      player = femalePreviewPlayer;
    } else if (audioCuePack === "male") {
      player = malePreviewPlayer;
    } else {
      player = musicPreviewPlayer;
    }

    try {
      // Always restart from the beginning
      if (player.seekTo) {
        player.seekTo(0);
      }
      player.play();
    } catch (e) {
      console.warn("Error playing cue preview", e);
      Alert.alert(
        "Playback error",
        "Unable to play the preview sound. Please try again."
      );
    }
  };

  const handlePreCountdownChange = (seconds) => {
    updateSettings({ preCountdownSeconds: seconds });
  };

  // Clamp input and stored value to [5, 30]
  const handleWarningSecondsChange = (seconds) => {
    const clamped = Math.min(
      MAX_WARNING_SECONDS,
      Math.max(MIN_WARNING_SECONDS, seconds)
    );
    updateSettings({ warningSecondsBeforeEnd: clamped });
  };

  const handleToggle = (key) => {
    updateSettings({ [key]: !settings[key] });
  };

  const handleImportSession = async () => {
    try {
      const importedSession = await sessionSharingService.importSession();

      if (!importedSession) {
        Alert.alert("Import cancelled", "No session was imported.");
        return;
      }

      await addSessionTemplate(importedSession);

      // Enforce history retention after import (in case imported session has history)
      await useStore.getState().enforceHistoryRetention();

      Alert.alert("Success", "Session imported successfully!");
    } catch (error) {
      console.error("handleImportSession error:", error);
      Alert.alert(
        "Error",
        "Something went wrong while importing the session. Please try again."
      );
    }
  };

  const handleHistoryRetentionChange = async (retention) => {
    updateSettings({ historyRetention: retention });
    // Enforce retention immediately when setting changes
    await useStore.getState().enforceHistoryRetention();
  };

  const handleThemeModeChange = (mode) => {
    updateSettings({ themeMode: mode });
  };

  const handleRestorePurchases = () => {
    // Dummy handler - will be replaced with real restore logic
    Alert.alert(
      "Restore Purchases",
      "This would restore your previous purchases. Restore functionality will be implemented later.",
      [{ text: "OK" }]
    );
  };

  const handleDeleteAllHistory = () => {
    Alert.alert(
      "Delete All History",
      "This will permanently delete all session history, including streaks and statistics. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            await deleteAllHistory();
            Alert.alert("Success", "All history has been deleted.");
          },
        },
      ]
    );
  };

  const handleDeleteAllBlocks = () => {
    const count = blockTemplates.length;
    if (count === 0) {
      Alert.alert("No Activities", "There are no activities to delete.");
      return;
    }

    Alert.alert(
      "Delete All Activities",
      `This will permanently delete all ${count} activity${
        count !== 1 ? "ies" : ""
      } from your library. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            await deleteAllBlockTemplates();
            Alert.alert(
              "Success",
              `All ${count} activit${
                count !== 1 ? "ies have" : "y has"
              } been deleted.`
            );
          },
        },
      ]
    );
  };

  const handleDeleteAllSessions = () => {
    const count = sessionTemplates.length;
    if (count === 0) {
      Alert.alert("No Sessions", "There are no sessions to delete.");
      return;
    }

    Alert.alert(
      "Delete All Sessions",
      `This will permanently delete all ${count} session${
        count !== 1 ? "s" : ""
      }. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            await deleteAllSessionTemplates();
            Alert.alert(
              "Success",
              `All ${count} session${
                count !== 1 ? "s have" : " has"
              } been deleted.`
            );
          },
        },
      ]
    );
  };

  // Normalize warning seconds for display (in case something older stored 0–60)
  const rawWarningSeconds =
    settings.warningSecondsBeforeEnd ?? DEFAULT_WARNING_SECONDS;
  const warningSeconds = Math.min(
    MAX_WARNING_SECONDS,
    Math.max(MIN_WARNING_SECONDS, rawWarningSeconds)
  );

  const styles = getStyles(colors, insets);

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
        trackColor={{ false: colors.switchInactive, true: colors.switchActive }}
        thumbColor={colors.textLight}
      />
    </View>
  );

  const renderOptionSetting = (
    label,
    description,
    options,
    currentValue,
    onSelect
  ) => (
    <View style={styles.settingRowOption}>
      <View style={[styles.settingContent, styles.settingContentOption]}>
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

  const renderNumberSetting = (
    label,
    description,
    value,
    onValueChange,
    min = 5,
    max = 30
  ) => (
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
          <Text
            style={[
              styles.numberButtonText,
              value <= min && styles.numberButtonTextDisabled,
            ]}
          >
            −
          </Text>
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
          <Text
            style={[
              styles.numberButtonText,
              value >= max && styles.numberButtonTextDisabled,
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Pre-countdown Settings */}
        {renderSettingSection(
          "Pre-countdown",
          <View>
            {renderOptionSetting(
              "Pre-countdown Length",
              "Countdown before session starts (0, 3, or 5 seconds)",
              [
                { label: "0s", value: 0 },
                { label: "3s", value: 3 },
                { label: "5s", value: 5 },
              ],
              settings.preCountdownSeconds,
              handlePreCountdownChange
            )}
          </View>
        )}

        {/* Warning Settings */}
        {renderSettingSection(
          "Warning",
          <View>
            {renderNumberSetting(
              "Warning Time",
              "Seconds before block end to play “Wrapping up” (5–30s)",
              warningSeconds,
              handleWarningSecondsChange,
              MIN_WARNING_SECONDS,
              MAX_WARNING_SECONDS
            )}
          </View>
        )}

        {/* Audio & Haptic Settings */}
        {renderSettingSection(
          "Audio & Haptic Feedback",
          <View>
            {renderToggleSetting(
              "Enable Sounds",
              "Play sound cues for transitions and completion",
              settings.enableSounds,
              () => handleToggle("enableSounds")
            )}
            {renderToggleSetting(
              "Enable Vibration",
              "Use haptic feedback for block transitions",
              settings.enableVibration,
              () => handleToggle("enableVibration")
            )}

            {/* Audio cue voice/style selection */}
            {renderOptionSetting(
              "Audio Cue Style",
              "Choose between male voice, female voice, or music cues",
              [
                { label: "Female", value: "female" },
                { label: "Male", value: "male" },
                { label: "Music", value: "music" },
              ],
              audioCuePack,
              (value) => updateSettings({ audioCuePack: value })
            )}

            {/* Preview button */}
            <View style={styles.previewRow}>
              <TouchableOpacity
                style={[
                  styles.previewButton,
                  !settings.enableSounds && styles.previewButtonDisabled,
                ]}
                onPress={playCuePreview}
                activeOpacity={0.8}
                disabled={!settings.enableSounds}
              >
                <Text
                  style={[
                    styles.previewButtonText,
                    !settings.enableSounds && styles.previewButtonTextDisabled,
                  ]}
                >
                  Play Preview
                </Text>
              </TouchableOpacity>
              <Text style={styles.previewHint}>
                Plays the “Wrapping up” cue with the selected style.
              </Text>
            </View>
          </View>
        )}

        {/* Session Settings */}
        {renderSettingSection(
          "Session",
          <View>
            {renderToggleSetting(
              "Keep Screen Awake",
              "Prevent screen from sleeping during a session",
              settings.keepScreenAwakeDuringSession,
              () => handleToggle("keepScreenAwakeDuringSession")
            )}
          </View>
        )}

        {/* Appearance Settings */}
        {renderSettingSection(
          "Appearance",
          <View>
            {renderOptionSetting(
              "Theme",
              "Choose light mode, dark mode, or follow system setting",
              [
                { label: "Light", value: "light" },
                { label: "Dark", value: "dark" },
                { label: "System", value: "system" },
              ],
              settings.themeMode || "system",
              handleThemeModeChange
            )}
          </View>
        )}

        {/* Pro Features Section */}
        {renderSettingSection(
          "Pro Features",
          <View>
            <TouchableOpacity
              style={styles.goProButton}
              onPress={() => navigation.navigate("GoPro")}
            >
              <Text style={styles.goProButtonText}>Go Pro</Text>
            </TouchableOpacity>
            <Text style={styles.settingDescription}>
              {settings.isProUser
                ? "Pro tier: Unlimited sessions, activities, custom categories, and full history retention."
                : "Free tier: Up to 5 sessions, 20 activities, built-in categories only, and 30 days history."}
            </Text>
            {renderToggleSetting(
              "Enable Pro Features (Developer)",
              "Toggle Pro features for testing",
              settings.isProUser || false,
              () => handleToggle("isProUser")
            )}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestorePurchases}
            >
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Session Sharing Section */}
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
        {renderSettingSection(
          "History Retention",
          <View>
            {renderOptionSetting(
              "Keep History For",
              "Automatically delete history older than selected period",
              [
                { label: "Unlimited", value: "unlimited" },
                { label: "3 months", value: "3months" },
                { label: "6 months", value: "6months" },
                { label: "12 months", value: "12months" },
              ],
              settings.historyRetention || "unlimited",
              handleHistoryRetentionChange
            )}
          </View>
        )}

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
            Permanently delete all session history. This will reset your streaks
            and statistics.
          </Text>
        </View>

        {/* Delete All Activities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Activities</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteAllBlocks}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              Delete All Activities ({blockTemplates.length})
            </Text>
          </TouchableOpacity>
          <Text style={styles.actionDescription}>
            Permanently delete all activities from your library. This cannot be
            undone.
          </Text>
        </View>

        {/* Delete All Sessions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Sessions</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDeleteAllSessions}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              Delete All Sessions ({sessionTemplates.length})
            </Text>
          </TouchableOpacity>
          <Text style={styles.actionDescription}>
            Permanently delete all sessions. This cannot be undone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingTop: Math.max(insets?.top || 0, 16),
      paddingBottom: 32,
    },
    section: {
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderMedium,
    },
    settingRowOption: {
      flexDirection: "column",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderMedium,
    },
    settingContent: {
      flex: 1,
      marginRight: 16,
      minWidth: 0,
    },
    settingContentOption: {
      marginRight: 0,
      marginBottom: 12,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    optionsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      width: "100%",
    },
    optionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    optionButtonTextActive: {
      color: colors.textLight,
    },
    numberInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    numberButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    numberButtonText: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.primary,
    },
    numberButtonTextDisabled: {
      color: colors.textTertiary,
    },
    numberValue: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      minWidth: 40,
      textAlign: "center",
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      marginBottom: 8,
    },
    actionButtonText: {
      color: colors.textLight,
      fontSize: 16,
      fontWeight: "600",
    },
    actionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 8,
    },
    deleteButton: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.error,
    },
    deleteButtonText: {
      color: colors.error,
    },
    goProButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: "center",
      marginBottom: 12,
    },
    goProButtonText: {
      color: colors.textLight,
      fontSize: 16,
      fontWeight: "600",
    },
    restoreButton: {
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 8,
    },
    restoreButtonText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },

    // Preview UI
    previewRow: {
      marginTop: 12,
    },
    previewButton: {
      alignSelf: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    previewButtonDisabled: {
      backgroundColor: colors.borderMedium,
    },
    previewButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textLight,
    },
    previewButtonTextDisabled: {
      color: colors.textLight,
      opacity: 0.7,
    },
    previewHint: {
      marginTop: 6,
      fontSize: 12,
      color: colors.textTertiary,
    },
  });
