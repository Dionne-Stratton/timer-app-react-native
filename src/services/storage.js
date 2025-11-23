import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  BLOCK_TEMPLATES: '@timer_app:block_templates',
  SESSION_TEMPLATES: '@timer_app:session_templates',
  SETTINGS: '@timer_app:settings',
  SESSION_HISTORY: '@timer_app:session_history',
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  preCountdownSeconds: 3,
  warningSecondsBeforeEnd: 10,
  enableSounds: true,
  enableVibration: true,
  keepScreenAwakeDuringSession: true,
  historyRetention: 'unlimited',
  themeMode: 'system', // 'light', 'dark', or 'system'
  customCategories: [], // Pro feature - custom category names
  isProUser: false, // Toggle for testing Pro features
};

/**
 * Storage abstraction layer
 * This allows swapping storage implementations without changing the rest of the app
 */
export const storageService = {
  // Block Templates
  async loadBlockTemplates() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BLOCK_TEMPLATES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading block templates:', error);
      return [];
    }
  },

  async saveBlockTemplates(templates) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BLOCK_TEMPLATES,
        JSON.stringify(templates)
      );
      return true;
    } catch (error) {
      console.error('Error saving block templates:', error);
      return false;
    }
  },

  // Session Templates
  async loadSessionTemplates() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TEMPLATES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading session templates:', error);
      return [];
    }
  },

  async saveSessionTemplates(sessions) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SESSION_TEMPLATES,
        JSON.stringify(sessions)
      );
      return true;
    } catch (error) {
      console.error('Error saving session templates:', error);
      return false;
    }
  },

  // Settings
  async loadSettings() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings)
      );
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  },

  // Session History
  async loadSessionHistory() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading session history:', error);
      return [];
    }
  },

  async saveSessionHistory(history) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SESSION_HISTORY,
        JSON.stringify(history)
      );
      return true;
    } catch (error) {
      console.error('Error saving session history:', error);
      return false;
    }
  },
};

