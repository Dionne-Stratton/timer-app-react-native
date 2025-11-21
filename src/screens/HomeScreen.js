import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import useStore from '../store';
import { getSessionTotalDuration, formatTime } from '../types';

export default function HomeScreen({ navigation }) {
  const sessionTemplates = useStore((state) => state.sessionTemplates);
  const deleteSessionTemplate = useStore((state) => state.deleteSessionTemplate);
  const duplicateSessionTemplate = useStore((state) => state.duplicateSessionTemplate);
  const [refreshing, setRefreshing] = useState(false);

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
    navigation.navigate('SessionBuilder', { sessionId: null });
  };

  const handleStartSession = (sessionId) => {
    navigation.navigate('SessionPreview', { sessionId });
  };

  const handleEditSession = (sessionId) => {
    navigation.navigate('SessionBuilder', { sessionId });
  };

  const handleDuplicateSession = async (sessionId) => {
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

  const handleSessionOptions = (sessionId, sessionName) => {
    Alert.alert(
      sessionName,
      'Choose an action:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => handleEditSession(sessionId),
        },
        {
          text: 'Duplicate',
          onPress: () => handleDuplicateSession(sessionId),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteSession(sessionId, sessionName),
        },
      ]
    );
  };

  const renderSessionItem = ({ item }) => {
    const totalDuration = getSessionTotalDuration(item);
    const blockCount = item.items ? item.items.length : 0;

    return (
      <TouchableOpacity
        style={styles.sessionItem}
        onPress={() => handleStartSession(item.id)}
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

  return (
    <View style={styles.container}>
      <FlatList
        data={sessionTemplates}
        renderItem={renderSessionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sessions yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "+ New Session" to create one
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.activitiesButton}
          onPress={() => navigation.navigate('BlockLibrary')}
          activeOpacity={0.8}
        >
          <Text style={styles.activitiesButtonText}>Activities</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleCreateSession}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+ New Session</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sessionItem: {
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 6,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDuration: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '500',
  },
  sessionSeparator: {
    fontSize: 14,
    color: '#999',
  },
  sessionBlocks: {
    fontSize: 14,
    color: '#666',
  },
  optionsButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionsButtonText: {
    fontSize: 20,
    color: '#666',
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
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  footer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  activitiesButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  activitiesButtonText: {
    color: '#6200ee',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButton: {
    width: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#6200ee',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
