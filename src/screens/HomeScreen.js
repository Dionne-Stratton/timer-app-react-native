import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store';
import { getSessionTotalDuration, formatTime } from '../types';
import {
  getISOWeekday,
  getDateDisplayString,
  calculateCurrentStreak,
  calculateLongestStreak,
  getThisWeekHistory,
} from '../utils/history';
import { useTheme } from '../theme';

export default function HomeScreen() {
  const navigation = useNavigation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  
  const sessionTemplates = useStore((state) => state.sessionTemplates);
  const sessionHistory = useStore((state) => state.sessionHistory);
  
  // Get today's ISO weekday (1=Monday ... 7=Sunday)
  const todayWeekday = getISOWeekday(new Date());
  
  // Calculate streaks
  const currentStreak = calculateCurrentStreak(sessionHistory);
  const longestStreak = calculateLongestStreak(sessionHistory);
  
  // Get this week's history
  const thisWeekHistory = getThisWeekHistory(sessionHistory);
  const sessionsThisWeek = thisWeekHistory.length;
  const minutesThisWeek = Math.round(
    thisWeekHistory.reduce((sum, entry) => sum + entry.totalDurationSeconds, 0) / 60
  );
  
  // Quick Start logic - returns array of sessions
  const getQuickStartSessions = () => {
    // 1. Find sessions scheduled for today
    const scheduledToday = sessionTemplates.filter(session => {
      return session.scheduledDaysOfWeek && session.scheduledDaysOfWeek.includes(todayWeekday);
    });
    
    // Scenario A: One or more scheduled sessions
    if (scheduledToday.length > 0) {
      // Sort alphabetically for consistent display
      scheduledToday.sort((a, b) => a.name.localeCompare(b.name));
      return scheduledToday.map(session => ({ session, reason: 'scheduled' }));
    }
    
    // Scenario B: No scheduled sessions - fall back to most recently completed
    if (sessionHistory.length > 0) {
      // Find most recent entry whose session still exists
      for (const entry of sessionHistory) {
        if (entry.sessionId) {
          const session = sessionTemplates.find(s => s.id === entry.sessionId);
          if (session) {
            return [{ session, reason: 'lastUsed' }];
          }
        }
      }
    }
    
    return [];
  };
  
  const quickStartSessions = getQuickStartSessions();
  const hasScheduledSessions = quickStartSessions.length > 0 && quickStartSessions[0].reason === 'scheduled';
  
  // Get recent activity (last 5 entries)
  const recentActivity = sessionHistory
    .slice()
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 5);
  
  const handleQuickStart = (sessionId) => {
    if (!sessionId) return;
    
    // Navigate directly to RunSession, with returnTo to come back to Home
    navigation.navigate('Sessions', {
      screen: 'RunSession',
      params: { 
        sessionId,
        returnTo: { tab: 'Home' },
      },
    });
  };
  
  const handleCreateSession = () => {
    navigation.navigate('Sessions', {
      screen: 'SessionBuilder',
      params: { sessionId: null },
    });
  };
  
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Start Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Start</Text>
          {quickStartSessions.length > 0 ? (
            <View>
              {quickStartSessions.map((item) => (
                <TouchableOpacity
                  key={item.session.id}
                  style={styles.quickStartButton}
                  onPress={() => handleQuickStart(item.session.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickStartButtonText}>
                    Quick start: {item.session.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.quickStartSubtext}>
                {hasScheduledSessions 
                  ? `Today's scheduled session${quickStartSessions.length > 1 ? 's' : ''}`
                  : "Last used session"}
              </Text>
            </View>
          ) : sessionTemplates.length === 0 ? (
            <View>
              <Text style={styles.emptyText}>
                No sessions yet. Create one in the Sessions tab to get started.
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateSession}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>Create a Session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No quick-start session available. Create and schedule a session to enable Quick Start.
            </Text>
          )}
        </View>
        
        {/* Streaks Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Streaks</Text>
          {sessionHistory.length === 0 ? (
            <Text style={styles.emptyText}>
              No sessions completed yet. Your streak will appear here once you finish your first session.
            </Text>
          ) : (
            <View>
              <View style={styles.streakRow}>
                <Text style={styles.streakLabel}>Current streak:</Text>
                <Text style={styles.streakValue}>{currentStreak} day{currentStreak !== 1 ? 's' : ''}</Text>
              </View>
              {currentStreak === 0 && (
                <Text style={styles.streakHint}>Start today to begin a new streak.</Text>
              )}
              <View style={styles.streakRow}>
                <Text style={styles.streakLabel}>Longest streak:</Text>
                <Text style={styles.streakValue}>{longestStreak} day{longestStreak !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.cardSubtext}>A day counts if you complete at least one session.</Text>
            </View>
          )}
        </View>
        
        {/* This Week Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Sessions completed</Text>
              <Text style={styles.statValue}>{sessionsThisWeek}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total time</Text>
              <Text style={styles.statValue}>{minutesThisWeek} min</Text>
            </View>
          </View>
          {sessionsThisWeek === 0 && (
            <Text style={styles.cardSubtext}>Start a session to begin your week.</Text>
          )}
        </View>
        
        {/* Recent Activity Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          {recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>
              No sessions completed yet. Your recent sessions will appear here after you finish one.
            </Text>
          ) : (
            <View style={styles.activityList}>
              {recentActivity.map((entry) => (
                <View key={entry.id} style={styles.activityRow}>
                  <Text style={styles.activityDate}>
                    {getDateDisplayString(entry.completedAt)}
                  </Text>
                  <Text style={styles.activitySeparator}>·</Text>
                  <Text style={styles.activityName} numberOfLines={1}>
                    {entry.sessionName}
                  </Text>
                  <Text style={styles.activitySeparator}>·</Text>
                  <Text style={styles.activityDuration}>
                    {Math.round(entry.totalDurationSeconds / 60)} min
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: Math.max(insets?.top || 0, 16),
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  cardSubtext: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
  },
  quickStartButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStartButtonSpacing: {
    marginBottom: 12,
  },
  quickStartButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  quickStartSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  createButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  streakHint: {
    fontSize: 14,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  activityList: {
    gap: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  activityDate: {
    fontSize: 14,
    color: colors.textSecondary,
    minWidth: 60,
  },
  activitySeparator: {
    fontSize: 14,
    color: colors.textTertiary,
    marginHorizontal: 8,
  },
  activityName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  activityDuration: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
});
