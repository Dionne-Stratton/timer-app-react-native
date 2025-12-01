import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getBlockDurationSeconds } from "../types";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Notification service for scheduling and managing session notifications
 */
export const notificationService = {
  // Storage for notification IDs (optional, for debugging/cancellation)
  notificationIds: [],

  /**
   * Request permissions (must be called before scheduling)
   */
  async requestPermissions() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.notificationIds = [];
  },

  /**
   * Helper: schedule a notification at a specific time (ms timestamp)
   */
  async scheduleAt(content, whenMs) {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      // Important: use a Date directly, not { date: ... }
      trigger: new Date(whenMs),
    });
    return id;
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

    if (!session || !session.items || session.items.length === 0) return;
    if (currentIndex < 0 || currentIndex >= session.items.length) return;

    // Request permissions if not already granted
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn("Notification permissions not granted");
      return;
    }

    const now = Date.now();
    const notificationIds = [];

    const currentBlock = session.items[currentIndex];
    if (!currentBlock) return;

    const currentBlockDuration = getBlockDurationSeconds(currentBlock) || 0;

    // Normalize remainingSeconds so we don't schedule in the past
    let safeRemaining =
      typeof remainingSeconds === "number"
        ? remainingSeconds
        : currentBlockDuration;

    if (safeRemaining <= 0 || safeRemaining > currentBlockDuration) {
      // If timer state is weird (0 / negative / too large), assume full block left
      safeRemaining = currentBlockDuration;
    }

    // This is when the *current* block ends (in ms)
    let currentTime = now + safeRemaining * 1000;

    // Loop through current and future blocks
    for (let i = currentIndex; i < session.items.length; i++) {
      const block = session.items[i];
      const blockDuration = getBlockDurationSeconds(block) || 0;
      const isLastBlock = i === session.items.length - 1;

      if (i === currentIndex) {
        // ---- CURRENT BLOCK ----
        const blockEndTime = currentTime;

        if (isLastBlock) {
          // Last block: schedule session complete
          const completeId = await this.scheduleAt(
            {
              title: "Session Complete! 🎉",
              body: `Completed: ${session.name}`,
              sound: true,
            },
            blockEndTime
          );
          notificationIds.push(completeId);
        } else {
          // Not last block: schedule "block complete" + "next block starting"
          const nextBlock = session.items[i + 1];

          const endId = await this.scheduleAt(
            {
              title: "Block Complete",
              body: `Finished: ${block.label}`,
              sound: true,
            },
            blockEndTime
          );
          notificationIds.push(endId);

          const startId = await this.scheduleAt(
            {
              title: "Next Block",
              body: `${nextBlock.label} starting now`,
              sound: true,
            },
            blockEndTime
          );
          notificationIds.push(startId);
        }

        // "Almost done" warning for current block
        if (
          blockDuration > 15 &&
          warningSecondsBeforeEnd > 0 &&
          safeRemaining > warningSecondsBeforeEnd
        ) {
          const warningTime = blockEndTime - warningSecondsBeforeEnd * 1000;
          if (warningTime > now) {
            const warningId = await this.scheduleAt(
              {
                title: "Almost Done",
                body: `${block.label} - ${warningSecondsBeforeEnd} seconds remaining`,
                sound: true,
              },
              warningTime
            );
            notificationIds.push(warningId);
          }
        }

        // Move timeline forward: end of current block is the start of next block
        currentTime = blockEndTime;
      } else {
        // ---- FUTURE BLOCKS ----
        const blockStartTime = currentTime;
        const blockEndTime = blockStartTime + blockDuration * 1000;

        // Next block start notification
        const startId = await this.scheduleAt(
          {
            title: "Next Block",
            body: `${block.label} starting now`,
            sound: true,
          },
          blockStartTime
        );
        notificationIds.push(startId);

        if (isLastBlock) {
          // Last block: session complete at its end
          const completeId = await this.scheduleAt(
            {
              title: "Session Complete! 🎉",
              body: `Completed: ${session.name}`,
              sound: true,
            },
            blockEndTime
          );
          notificationIds.push(completeId);
        } else {
          // Not last: block complete notification
          const endId = await this.scheduleAt(
            {
              title: "Block Complete",
              body: `Finished: ${block.label}`,
              sound: true,
            },
            blockEndTime
          );
          notificationIds.push(endId);
        }

        // "Almost done" warning for future block
        if (blockDuration > 15 && warningSecondsBeforeEnd > 0) {
          const warningTime = blockEndTime - warningSecondsBeforeEnd * 1000;
          if (warningTime > now) {
            const warningId = await this.scheduleAt(
              {
                title: "Almost Done",
                body: `${block.label} - ${warningSecondsBeforeEnd} seconds remaining`,
                sound: true,
              },
              warningTime
            );
            notificationIds.push(warningId);
          }
        }

        // Advance timeline
        currentTime = blockEndTime;
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
