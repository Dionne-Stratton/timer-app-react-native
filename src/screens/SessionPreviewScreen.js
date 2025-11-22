import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import useStore from '../store';
import {
  BlockType,
  getBlockTimingSummary,
  getSessionTotalDuration,
  formatTime,
} from '../types';

export default function SessionPreviewScreen({ navigation, route }) {
  const { sessionId } = route.params || {};
  const sessionTemplates = useStore((state) => state.sessionTemplates);
  const deleteSessionTemplate = useStore((state) => state.deleteSessionTemplate);
  const session = sessionTemplates.find((s) => s.id === sessionId);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Session not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalDuration = getSessionTotalDuration(session);

  const typeLabels = {
    [BlockType.ACTIVITY]: 'Activity',
    [BlockType.REST]: 'Rest',
    [BlockType.TRANSITION]: 'Transition',
  };

  const renderBlockItem = ({ item, index }) => (
    <View style={styles.blockItem}>
      <View style={styles.blockIndex}>
        <Text style={styles.blockIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.blockContent}>
        <Text style={styles.blockLabel}>{item.label}</Text>
        <View style={styles.blockMeta}>
          <Text style={styles.blockType}>
            {typeLabels[item.type] || item.type}
          </Text>
          <Text style={styles.blockTiming}>{getBlockTimingSummary(item)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sessionName}>{session.name}</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Duration</Text>
              <Text style={styles.summaryValue}>{formatTime(totalDuration)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Blocks</Text>
              <Text style={styles.summaryValue}>{session.items?.length || 0}</Text>
            </View>
          </View>
        </View>

        {/* Blocks List */}
        <View style={styles.blocksSection}>
          <Text style={styles.sectionTitle}>Session Blocks</Text>
          {!session.items || session.items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No blocks in this session</Text>
            </View>
          ) : (
            <FlatList
              data={session.items}
              renderItem={renderBlockItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.actionButtonText, styles.backButtonText]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('SessionBuilder', { sessionId })}
        >
          <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
            Alert.alert(
              'Delete Session',
              `Are you sure you want to delete "${session.name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteSessionTemplate(sessionId);
                    navigation.goBack();
                  },
                },
              ]
            );
          }}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.playButton]}
          onPress={() => navigation.navigate('RunSession', { sessionId })}
          disabled={!session.items || session.items.length === 0}
        >
          <Text
            style={[
              styles.actionButtonText,
              styles.playButtonText,
              (!session.items || session.items.length === 0) && styles.actionButtonTextDisabled,
            ]}
          >
            ▶ Start
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sessionName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A7C9E',
  },
  blocksSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  blockItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  blockIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A7C9E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blockIndexText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  blockContent: {
    flex: 1,
  },
  blockLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  blockMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  blockType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  blockTiming: {
    fontSize: 14,
    color: '#4A7C9E',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    color: '#666',
  },
  editButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4A7C9E',
  },
  editButtonText: {
    color: '#4A7C9E',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff5252',
  },
  deleteButtonText: {
    color: '#ff5252',
  },
  playButton: {
    backgroundColor: '#4A7C9E',
  },
  playButtonText: {
    color: '#fff',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});

