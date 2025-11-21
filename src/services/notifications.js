import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getBlockDurationSeconds } from '../types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Notification service for scheduling and managing session notifications
 */
export const notificationService = {
  // Storage for notification IDs
  notificationIds: [],

  /**
   * Request permissions (must be called before scheduling)
   */
  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.notificationIds = [];
  },

  /**
   * Schedule notifications for a running session
   * @param {Object} session - SessionTemplate object
   * @param {number} currentIndex - Current block index
   * @param {number} remainingSeconds - Remaining seconds in current block
   * @param {number} warningSecondsBeforeEnd - Warning time before block end
   */
  async scheduleSessionNotifications(
    session,
    currentIndex,
    remainingSeconds,
    warningSecondsBeforeEnd
  ) {
    // Cancel existing notifications
    await this.cancelAllNotifications();

    if (!session || !session.items) return;

    // Request permissions if not already granted
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return;
    }

    const now = Date.now();
    let currentTime = now + (remainingSeconds * 1000); // Current block end time
    const notificationIds = [];

    // Schedule notifications for remaining blocks
    for (let i = currentIndex; i < session.items.length; i++) {
      const block = session.items[i];
      const blockDuration = getBlockDurationSeconds(block);
      
      // Skip if we're past the start of this block
      if (i === currentIndex) {
        // We're in this block - schedule end and next block start
        const blockEndTime = currentTime;
        const nextBlockStartTime = blockEndTime;

        // Schedule block end notification (if not last block)
        if (i < session.items.length - 1) {
          const endId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Block Complete',
              body: `Finished: ${block.label}`,
              sound: true,
            },
            trigger: {
              date: new Date(blockEndTime),
            },
          });
          notificationIds.push(endId);

          // Schedule next block start notification
          const nextBlock = session.items[i + 1];
          const startId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Next Block',
              body: `${nextBlock.label} starting now`,
              sound: true,
            },
            trigger: {
              date: new Date(nextBlockStartTime),
            },
          });
          notificationIds.push(startId);
        } else {
          // Last block - schedule session complete
          const completeId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Session Complete! 🎉',
              body: `Completed: ${session.name}`,
              sound: true,
            },
            trigger: {
              date: new Date(blockEndTime),
            },
          });
          notificationIds.push(completeId);
        }

        // Schedule "almost done" warning if block is long enough
        if (blockDuration > 15 && remainingSeconds > warningSecondsBeforeEnd) {
          const warningTime = currentTime - (warningSecondsBeforeEnd * 1000);
          if (warningTime > now) {
            const warningId = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Almost Done',
                body: `${block.label} - ${warningSecondsBeforeEnd} seconds remaining`,
                sound: true,
              },
              trigger: {
                date: new Date(warningTime),
              },
            });
            notificationIds.push(warningId);
          }
        }

        // Move to next block
        currentTime += blockDuration * 1000;
      } else {
        // Future blocks
        const blockStartTime = currentTime;
        const blockEndTime = currentTime + (blockDuration * 1000);

        // Schedule block start notification
        const startId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Next Block',
            body: `${block.label} starting now`,
            sound: true,
          },
          trigger: {
            date: new Date(blockStartTime),
          },
        });
        notificationIds.push(startId);

        // Schedule block end notification (if not last block)
        if (i < session.items.length - 1) {
          const endId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Block Complete',
              body: `Finished: ${block.label}`,
              sound: true,
            },
            trigger: {
              date: new Date(blockEndTime),
            },
          });
          notificationIds.push(endId);
        } else {
          // Last block - schedule session complete
          const completeId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Session Complete! 🎉',
              body: `Completed: ${session.name}`,
              sound: true,
            },
            trigger: {
              date: new Date(blockEndTime),
            },
          });
          notificationIds.push(completeId);
        }

        // Schedule "almost done" warning if block is long enough
        if (blockDuration > 15) {
          const warningTime = blockEndTime - (warningSecondsBeforeEnd * 1000);
          const warningId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Almost Done',
              body: `${block.label} - ${warningSecondsBeforeEnd} seconds remaining`,
              sound: true,
            },
            trigger: {
              date: new Date(warningTime),
            },
          });
          notificationIds.push(warningId);
        }

        // Move to next block
        currentTime += blockDuration * 1000;
      }
    }

    this.notificationIds = notificationIds;
  },

  /**
   * Reschedule notifications after pause/resume or skip
   * This recalculates all notifications from the current state
   */
  async rescheduleNotifications(
    session,
    currentIndex,
    remainingSeconds,
    warningSecondsBeforeEnd
  ) {
    await this.scheduleSessionNotifications(
      session,
      currentIndex,
      remainingSeconds,
      warningSecondsBeforeEnd
    );
  },
};

