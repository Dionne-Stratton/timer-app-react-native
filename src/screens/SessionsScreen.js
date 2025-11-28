import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Platform,
  ActionSheetIOS,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store';
import { getSessionTotalDuration, formatTime } from '../types';
import { sessionSharingService } from '../services/sessionSharing';
import { useTheme } from '../theme';
import ProUpgradeModal from '../components/ProUpgradeModal';

export default function SessionsScreen({ navigation }) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const sessionTemplates = useStore((state) => state.sessionTemplates);
  const deleteSessionTemplate = useStore((state) => state.deleteSessionTemplate);
  const duplicateSessionTemplate = useStore((state) => state.duplicateSessionTemplate);
  const addSessionTemplate = useStore((state) => state.addSessionTemplate);
  const [refreshing, setRefreshing] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSessionName, setSelectedSessionName] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [proModalVisible, setProModalVisible] = useState(false);
  const [proModalLimitType, setProModalLimitType] = useState(null);
  const settings = useStore((state) => state.settings);
  

  useEffect(() => {
    // Load data on mount
    const initialize = useStore.getState().initialize;
    initialize();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await useStore.getState().initialize();
    setRefreshing(false);
  };

  const handleCreateSession = () => {
    // Check session limit for free users
    if (!settings.isProUser && sessionTemplates.length >= 5) {
      setProModalLimitType('sessions');
      setProModalVisible(true);
      return;
    }
    navigation.navigate('SessionBuilder', { sessionId: null });
  };

  const handleStartSession = (sessionId) => {
    // Navigate directly to RunSession from Sessions list, return to SessionsList
    navigation.navigate('RunSession', { 
      sessionId,
      returnTo: { screen: 'SessionsList' },
    });
  };

  const handleEditSession = (sessionId) => {
    navigation.navigate('SessionBuilder', { sessionId });
  };

  const handleDuplicateSession = async (sessionId) => {
    // Check session limit for free users
    if (!settings.isProUser && sessionTemplates.length >= 5) {
      setProModalLimitType('sessions');
      setProModalVisible(true);
      return;
    }
    await duplicateSessionTemplate(sessionId);
    // Refresh the list
    await useStore.getState().initialize();
  };

  const handleDeleteSession = (sessionId, sessionName) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${sessionName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSessionTemplate(sessionId);
          },
        },
      ]
    );
  };

  const handleShareSession = async (sessionId) => {
    // Check if user is Pro (export is Pro-only)
    if (!settings.isProUser) {
      setProModalLimitType('export');
      setProModalVisible(true);
      return;
    }
    
    const session = sessionTemplates.find((s) => s.id === sessionId);
    if (!session) {
      Alert.alert('Error', 'Session not found');
      return;
    }

    await sessionSharingService.exportSession(session);
  };

  const handleImportSession = async () => {
    const importedSession = await sessionSharingService.importSession();
    if (importedSession) {
      await addSessionTemplate(importedSession);
      // No need to call initialize() - addSessionTemplate already saves and updates the store
      Alert.alert('Success', 'Session imported successfully!');
    }
  };

  const handleSessionOptions = (sessionId, sessionName) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Start', 'Edit', 'Share', 'Duplicate', 'Delete'],
          destructiveButtonIndex: 5,
          cancelButtonIndex: 0,
          title: sessionName,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleStartSession(sessionId);
          } else if (buttonIndex === 2) {
            handleEditSession(sessionId);
          } else if (buttonIndex === 3) {
            handleShareSession(sessionId);
          } else if (buttonIndex === 4) {
            handleDuplicateSession(sessionId);
          } else if (buttonIndex === 5) {
            handleDeleteSession(sessionId, sessionName);
          }
        }
      );
    } else {
      // Android - use custom modal
      setSelectedSessionId(sessionId);
      setSelectedSessionName(sessionName);
      setOptionsModalVisible(true);
    }
  };

  const handleModalAction = (action) => {
    setOptionsModalVisible(false);
    if (!selectedSessionId) return;

    if (action === 'start') {
      handleStartSession(selectedSessionId);
    } else if (action === 'edit') {
      handleEditSession(selectedSessionId);
    } else if (action === 'share') {
      handleShareSession(selectedSessionId);
    } else if (action === 'duplicate') {
      handleDuplicateSession(selectedSessionId);
    } else if (action === 'delete') {
      handleDeleteSession(selectedSessionId, selectedSessionName);
    }
  };

  const styles = getStyles(colors, insets);

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) {
      return sessionTemplates;
    }
    const query = searchQuery.toLowerCase().trim();
    return sessionTemplates.filter((session) =>
      session.name.toLowerCase().includes(query)
    );
  }, [sessionTemplates, searchQuery]);

  const renderSessionItem = ({ item }) => {
    const totalDuration = getSessionTotalDuration(item);
    const blockCount = item.items ? item.items.length : 0;

    return (
      <TouchableOpacity
        style={styles.sessionItem}
        onPress={() => navigation.navigate('SessionPreview', { sessionId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.sessionContent}>
          <Text style={styles.sessionName}>{item.name}</Text>
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionDuration}>{formatTime(totalDuration)}</Text>
            <Text style={styles.sessionSeparator}>•</Text>
            <Text style={styles.sessionBlocks}>{blockCount} blocks</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={() => handleSessionOptions(item.id, item.name)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.optionsButtonText}>⋮</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const handleProModalUpgrade = () => {
    setProModalVisible(false);
    navigation.navigate('Settings', { screen: 'GoPro' });
  };

  return (
    <View style={styles.container}>
      {/* Free Plan Banner */}
      {!settings.isProUser && (
        <View style={styles.freeBanner}>
          <Text style={styles.freeBannerText}>Free plan: Up to 5 sessions.</Text>
        </View>
      )}
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, settings.isProUser && styles.searchContainerNoBanner]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={filteredSessions}
        renderItem={renderSessionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? 'No sessions match your search'
                : 'No sessions yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery.trim()
                ? 'Try adjusting your search'
                : 'Tap "+ New Session" to create one'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleCreateSession}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+ New Session</Text>
      </TouchableOpacity>

      {/* Options Modal for Android */}
      <Modal
        visible={optionsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{selectedSessionName}</Text>
            <Text style={styles.modalSubtitle}>Choose an action:</Text>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleModalAction('start')}
            >
              <Text style={styles.modalOptionText}>Start</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleModalAction('edit')}
            >
              <Text style={styles.modalOptionText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleModalAction('share')}
            >
              <Text style={styles.modalOptionText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleModalAction('duplicate')}
            >
              <Text style={styles.modalOptionText}>Duplicate</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalOption, styles.modalOptionDelete]}
              onPress={() => handleModalAction('delete')}
            >
              <Text style={[styles.modalOptionText, styles.modalOptionTextDelete]}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setOptionsModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        visible={proModalVisible}
        onClose={() => setProModalVisible(false)}
        limitType={proModalLimitType}
        onUpgrade={handleProModalUpgrade}
      />
    </View>
  );
}

const getStyles = (colors, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  freeBanner: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingTop: Math.max(insets?.top || 0, 8),
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  freeBannerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  searchContainerNoBanner: {
    paddingTop: Math.max(insets?.top || 0, 16),
  },
  searchInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  sessionItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
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
  sessionContent: {
    flex: 1,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDuration: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  sessionSeparator: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  sessionBlocks: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  optionsButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionsButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMedium,
  },
  modalOptionDelete: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  modalOptionTextDelete: {
    color: colors.error,
  },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
