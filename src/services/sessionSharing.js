import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { generateId } from '../utils/id';
import { getSessionTotalDuration, formatTime, BUILT_IN_CATEGORIES } from '../types';
import useStore from '../store';

/**
 * Session sharing service for export/import
 */
export const sessionSharingService = {
  /**
   * Export a session to a file and share it
   * @param {Object} session - SessionTemplate to export
   */
  async exportSession(session) {
    try {
      // Check if user is Pro (export is Pro-only)
      const settings = useStore.getState().settings;
      if (!settings.isProUser) {
        Alert.alert(
          'Export Sessions (Pro)',
          'Exporting sessions is a Pro feature. Upgrade to share your sessions with others.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      if (!session) {
        Alert.alert('Error', 'No session selected');
        return false;
      }

      // Serialize session to JSON
      const sessionJson = JSON.stringify(session, null, 2);
      
      // Create file with .bztimer extension
      const fileName = `${session.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.bztimer`;
      
      // Use cacheDirectory which is more accessible for sharing
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      // Write file (default encoding is UTF-8)
      await FileSystem.writeAsStringAsync(fileUri, sessionJson);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return false;
      }

      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Failed to create session file');
        return false;
      }

      // Share file
      const result = await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share Session',
        UTI: 'public.json',
      });

      // Some share targets return null but still succeed
      // Only treat as error if result exists and action was dismissed
      if (result === null) {
        // Share succeeded but no result object returned
        return true;
      }

      // Check if user dismissed the share dialog
      return result.action !== Sharing.SharingAction.dismissedAction;
    } catch (error) {
      console.error('Error exporting session:', error);
      
      // Don't show error if sharing actually worked (even if result was null)
      // Check if the error is about result.action being null
      if (error.message && error.message.includes("Cannot read property 'action'")) {
        // Sharing likely succeeded but returned null
        return true;
      }
      
      // More specific error message
      let errorMessage = 'Failed to export session. Please try again.';
      if (error.message) {
        if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please grant file access permissions.';
        } else if (error.message.includes('URI')) {
          errorMessage = 'File path error. Please try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      Alert.alert('Error', errorMessage);
      return false;
    }
  },

  /**
   * Import a session from a file
   * @returns {Object|null} Imported session or null if cancelled/error
   */
  async importSession() {
    try {
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result || result.type === 'cancel' || result.canceled) {
        return null;
      }

      // Get file URI - handle both old and new API formats
      let fileUri = null;
      
      // New API format: result.assets is an array (expo-document-picker >= 11.0)
      // The URI is in result.assets[0].uri
      if (result.assets && Array.isArray(result.assets) && result.assets.length > 0) {
        fileUri = result.assets[0].uri;
      }
      // Old API format: result.uri exists directly (expo-document-picker < 11.0)
      else if (result.uri) {
        fileUri = result.uri;
      }
      // Alternative locations for fallback
      else if (result.fileUri) {
        fileUri = result.fileUri;
      }
      else if (result.file && result.file.uri) {
        fileUri = result.file.uri;
      }

      // Validate that we have a file URI
      if (!fileUri || typeof fileUri !== 'string') {
        console.error('DocumentPicker result:', JSON.stringify(result, null, 2));
        Alert.alert('Error', 'Failed to access selected file. The file URI was not provided.');
        return null;
      }

      // Verify file exists before reading
      let fileInfo;
      try {
        fileInfo = await FileSystem.getInfoAsync(fileUri);
      } catch (infoError) {
        console.error('Error checking file info:', infoError);
        // Continue anyway - getInfoAsync might not be available on all platforms
        fileInfo = { exists: true };
      }

      if (fileInfo && !fileInfo.exists) {
        Alert.alert('Error', 'Selected file could not be found. Please try again.');
        return null;
      }

      // Read file content
      let fileContent;
      try {
        fileContent = await FileSystem.readAsStringAsync(fileUri);
      } catch (readError) {
        console.error('Error reading file:', readError);
        console.error('File URI:', fileUri);
        throw new Error(`Failed to read file: ${readError.message || 'Unknown error'}`);
      }

      // Parse JSON
      let session;
      try {
        session = JSON.parse(fileContent);
      } catch (parseError) {
        Alert.alert(
          'Invalid File',
          'The selected file does not appear to be a valid session file.'
        );
        return null;
      }

      // Validate session structure
      if (!this.validateSession(session)) {
        Alert.alert(
          'Invalid Session',
          'The selected file does not contain a valid session format.'
        );
        return null;
      }

      // Show confirmation dialog with session details
      const totalDuration = getSessionTotalDuration(session);
      const blockCount = session.items ? session.items.length : 0;

      return new Promise((resolve) => {
        Alert.alert(
          'Import Session',
          `Session: ${session.name}\nBlocks: ${blockCount}\nDuration: ${formatTime(totalDuration)}\n\nImport this session?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(null),
            },
            {
              text: 'Import',
              onPress: () => {
                const settings = useStore.getState().settings;
                const updateSettings = useStore.getState().updateSettings;
                const isProUser = settings.isProUser || false;
                const customCategories = settings.customCategories || [];
                
                // Process categories for each block
                const processedItems = session.items.map((item) => {
                  const processedItem = {
                    ...item,
                    id: generateId(),
                  };
                  
                  // Handle category field (only for activities)
                  if (item.category && item.type === 'activity') {
                    const category = item.category;
                    
                    if (BUILT_IN_CATEGORIES.includes(category)) {
                      // Built-in category - keep it
                      processedItem.category = category;
                    } else {
                      // Custom category
                      if (isProUser) {
                        // Pro: auto-add to customCategories if not already there
                        if (!customCategories.includes(category)) {
                          updateSettings({
                            customCategories: [...customCategories, category],
                          });
                        }
                        processedItem.category = category;
                      } else {
                        // Free: map to "Uncategorized"
                        processedItem.category = null; // Will display as "Uncategorized"
                      }
                    }
                  } else {
                    // Rest/Transition or no category - set to null
                    processedItem.category = null;
                  }
                  
                  return processedItem;
                });
                
                // Assign new ID to avoid conflicts
                const importedSession = {
                  ...session,
                  id: generateId(),
                  items: processedItems,
                };
                resolve(importedSession);
              },
            },
          ]
        );
      });
    } catch (error) {
      console.error('Error importing session:', error);
      if (error.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Error', 'Failed to import session. Please try again.');
      }
      return null;
    }
  },

  /**
   * Validate that an object is a valid SessionTemplate
   * @param {Object} session - Object to validate
   * @returns {boolean} True if valid
   */
  validateSession(session) {
    if (!session || typeof session !== 'object') {
      return false;
    }

    // Must have name
    if (!session.name || typeof session.name !== 'string') {
      return false;
    }

    // Must have items array
    if (!Array.isArray(session.items)) {
      return false;
    }

    // Validate each item
    for (const item of session.items) {
      if (!item.label || typeof item.label !== 'string') {
        return false;
      }
      if (!item.type || !['activity', 'rest', 'transition'].includes(item.type)) {
        return false;
      }
      if (!item.mode || !['duration', 'reps'].includes(item.mode)) {
        return false;
      }

      // Validate timing fields based on mode
      if (item.mode === 'duration') {
        if (typeof item.durationSeconds !== 'number' || item.durationSeconds <= 0) {
          return false;
        }
      } else if (item.mode === 'reps') {
        if (
          typeof item.reps !== 'number' ||
          item.reps <= 0 ||
          typeof item.perRepSeconds !== 'number' ||
          item.perRepSeconds <= 0
        ) {
          return false;
        }
      }
    }

    return true;
  },
};

