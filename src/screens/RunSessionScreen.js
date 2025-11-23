import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../store";
import {
  BlockType,
  getBlockDurationSeconds,
  getBlockTimingSummary,
  getSessionTotalDuration,
  formatTime,
  getBlockTypeColor,
} from "../types";
import { useTheme } from "../theme";
import { cueService } from "../services/cues";
import { notificationService } from "../services/notifications";

export default function RunSessionScreen({ navigation, route }) {
  const { sessionId, returnTo } = route.params || {};
  const colors = useTheme();
  const sessionTemplates = useStore((state) => state.sessionTemplates);
  const settings = useStore((state) => state.settings);
  const runningSession = useStore((state) => state.runningSession);
  const currentIndex = useStore((state) => state.currentIndex);
  const remainingSeconds = useStore((state) => state.remainingSeconds);
  const isRunning = useStore((state) => state.isRunning);
  const elapsedSecondsInSession = useStore(
    (state) => state.elapsedSecondsInSession
  );
  const isPreCountdown = useStore((state) => state.isPreCountdown);
  const preCountdownRemaining = useStore(
    (state) => state.preCountdownRemaining
  );
  const isSessionComplete = useStore((state) => state.isSessionComplete);

  const startSession = useStore((state) => state.startSession);
  const tickPreCountdown = useStore((state) => state.tickPreCountdown);
  const startTimer = useStore((state) => state.startTimer);
  const pauseTimer = useStore((state) => state.pauseTimer);
  const tickTimer = useStore((state) => state.tickTimer);
  const nextBlock = useStore((state) => state.nextBlock);
  const previousBlock = useStore((state) => state.previousBlock);
  const stopSession = useStore((state) => state.stopSession);

  const timerInterval = useRef(null);
  const preCountdownInterval = useRef(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const lastWarningTime = useRef(null);
  const prevIndexRef = useRef(0);

  // Function to navigate back to the previous screen
  const navigateBack = () => {
    if (returnTo) {
      // Navigate to the specified return screen
      if (returnTo.tab) {
        // Navigate to a tab (e.g., 'Home')
        navigation.navigate(returnTo.tab);
      } else if (returnTo.screen) {
        // Navigate to a screen within the current stack
        navigation.navigate(returnTo.screen, returnTo.params || {});
      } else {
        // Fallback to goBack if returnTo is invalid
        navigation.goBack();
      }
    } else {
      // Default behavior: go back
      navigation.goBack();
    }
  };

  // Initialize session when screen loads
  useEffect(() => {
    if (sessionId && !runningSession) {
      const success = startSession(sessionId);
      if (!success) {
        Alert.alert("Error", "Failed to start session. Please try again.");
        navigateBack();
      } else {
        prevIndexRef.current = 0;
      }
    }
  }, [sessionId]);

  // Schedule notifications when session starts (after pre-countdown)
  // Only schedule once when session starts, not every second
  const hasScheduledNotifications = useRef(false);
  const lastScheduledIndex = useRef(-1);
  useEffect(() => {
    if (runningSession && !isPreCountdown && isRunning && !isSessionComplete) {
      // Only schedule if we haven't scheduled for this block index yet
      // Block transitions are handled by the separate block transition effect
      if (
        !hasScheduledNotifications.current ||
        currentIndex !== lastScheduledIndex.current
      ) {
        // Get current state from store to ensure we have the latest remainingSeconds
        const currentState = useStore.getState();
        notificationService.scheduleSessionNotifications(
          runningSession,
          currentIndex,
          currentState.remainingSeconds,
          settings.warningSecondsBeforeEnd
        );
        hasScheduledNotifications.current = true;
        lastScheduledIndex.current = currentIndex;
      }
    } else {
      // Reset flag when session stops or pauses
      hasScheduledNotifications.current = false;
      lastScheduledIndex.current = -1;
    }

    return () => {
      // Clean up notifications on unmount
      notificationService.cancelAllNotifications();
    };
  }, [
    runningSession,
    isPreCountdown,
    isRunning,
    currentIndex,
    isSessionComplete,
  ]);

  // Track block transitions for cues
  useEffect(() => {
    if (
      currentIndex !== prevIndexRef.current &&
      currentIndex > prevIndexRef.current &&
      !isPreCountdown &&
      runningSession
    ) {
      // Block transition happened (moved to next block)
      lastWarningTime.current = null;
      cueService.blockComplete(settings.enableSounds, settings.enableVibration);
      prevIndexRef.current = currentIndex;

      // Reschedule notifications for remaining blocks
      if (isRunning) {
        notificationService.rescheduleNotifications(
          runningSession,
          currentIndex,
          remainingSeconds,
          settings.warningSecondsBeforeEnd
        );
      }
    }
  }, [
    currentIndex,
    isPreCountdown,
    runningSession,
    isRunning,
    remainingSeconds,
  ]);

  // Track session completion
  useEffect(() => {
    if (isSessionComplete && !showCompleteModal) {
      handleSessionComplete();
    }
  }, [isSessionComplete]);

  // Keep screen awake during session
  useEffect(() => {
    if (runningSession && settings.keepScreenAwakeDuringSession) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }

    return () => {
      deactivateKeepAwake();
    };
  }, [runningSession, settings.keepScreenAwakeDuringSession]);

  // Handle pre-countdown
  useEffect(() => {
    if (isPreCountdown && preCountdownRemaining > 0) {
      // Start pre-countdown interval - tick every second
      if (!preCountdownInterval.current) {
        preCountdownInterval.current = setInterval(() => {
          tickPreCountdown();
        }, 1000);
      }
    } else if (isPreCountdown && preCountdownRemaining === 0) {
      // Pre-countdown just finished (showing "GO!")
      // Clear the interval and wait a moment before transitioning
      if (preCountdownInterval.current) {
        clearInterval(preCountdownInterval.current);
        preCountdownInterval.current = null;
      }
      // Show "GO!" for 1 second, then finish pre-countdown
      const timeoutId = setTimeout(() => {
        tickPreCountdown(); // This will set isPreCountdown to false and isRunning to true
      }, 1000);
      return () => clearTimeout(timeoutId);
    } else {
      // Pre-countdown finished, clear interval
      if (preCountdownInterval.current) {
        clearInterval(preCountdownInterval.current);
        preCountdownInterval.current = null;
      }
    }

    return () => {
      if (preCountdownInterval.current) {
        clearInterval(preCountdownInterval.current);
        preCountdownInterval.current = null;
      }
    };
  }, [isPreCountdown, preCountdownRemaining]);

  // Handle timer tick
  useEffect(() => {
    if (isRunning && !isPreCountdown && runningSession) {
      timerInterval.current = setInterval(() => {
        const currentBlock = runningSession.items[currentIndex];
        if (!currentBlock) return;

        const currentRemaining = useStore.getState().remainingSeconds;
        const blockDuration = getBlockDurationSeconds(currentBlock);

        // Check for "almost done" warning
        if (
          blockDuration > 15 &&
          currentRemaining === settings.warningSecondsBeforeEnd &&
          lastWarningTime.current !== currentRemaining
        ) {
          lastWarningTime.current = currentRemaining;
          cueService.almostDone(
            settings.enableSounds,
            settings.enableVibration
          );
        }

        // Tick the timer (this handles block transitions internally)
        tickTimer();
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    };
  }, [
    isRunning,
    isPreCountdown,
    runningSession,
    currentIndex,
    remainingSeconds,
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      if (preCountdownInterval.current) {
        clearInterval(preCountdownInterval.current);
        preCountdownInterval.current = null;
      }
    };
  }, []);

  const handleSessionComplete = () => {
    cueService.sessionComplete(settings.enableSounds, settings.enableVibration);
    setShowCompleteModal(true);
  };

  const handleStopSession = () => {
    Alert.alert("Stop Session", "Are you sure you want to stop this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop",
        style: "destructive",
        onPress: () => {
          notificationService.cancelAllNotifications();
          stopSession();
          navigateBack();
        },
      },
    ]);
  };

  const handleComplete = () => {
    notificationService.cancelAllNotifications();
    setShowCompleteModal(false);
    stopSession();
    navigateBack();
  };

  const handleTogglePause = () => {
    if (isRunning) {
      // Pause - cancel notifications
      pauseTimer();
      notificationService.cancelAllNotifications();
    } else {
      // Resume - reschedule notifications
      startTimer();
      lastWarningTime.current = null;
      if (runningSession) {
        notificationService.rescheduleNotifications(
          runningSession,
          currentIndex,
          remainingSeconds,
          settings.warningSecondsBeforeEnd
        );
      }
    }
  };

  const handleNext = () => {
    if (isRunning) {
      pauseTimer();
    }
    lastWarningTime.current = null;

    const hasNext = nextBlock();
    if (!hasNext) {
      handleSessionComplete();
    } else {
      cueService.blockComplete(settings.enableSounds, settings.enableVibration);

      // Reschedule notifications after skipping
      if (runningSession) {
        const newState = useStore.getState();
        notificationService.rescheduleNotifications(
          runningSession,
          newState.currentIndex,
          newState.remainingSeconds,
          settings.warningSecondsBeforeEnd
        );
      }

      if (!isRunning) {
        startTimer();
      }
    }
  };

  const handlePrevious = () => {
    if (isRunning) {
      pauseTimer();
    }
    lastWarningTime.current = null;

    const success = previousBlock();
    if (success) {
      // Reschedule notifications after going back
      if (runningSession) {
        const newState = useStore.getState();
        notificationService.rescheduleNotifications(
          runningSession,
          newState.currentIndex,
          newState.remainingSeconds,
          settings.warningSecondsBeforeEnd
        );
      }

      if (!isRunning) {
        startTimer();
      }
    }
  };

  if (
    !runningSession ||
    !runningSession.items ||
    runningSession.items.length === 0
  ) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No session loaded</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigateBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentBlock = runningSession.items[currentIndex];
  const nextBlockItem =
    currentIndex < runningSession.items.length - 1
      ? runningSession.items[currentIndex + 1]
      : null;

  const totalDuration = getSessionTotalDuration(runningSession);
  const progress =
    totalDuration > 0 ? (elapsedSecondsInSession / totalDuration) * 100 : 0;

  const typeLabels = {
    [BlockType.ACTIVITY]: "Activity",
    [BlockType.REST]: "Rest",
    [BlockType.TRANSITION]: "Transition",
  };

  // Pre-countdown screen
  if (isPreCountdown) {
    return (
      <View style={styles.container}>
        <View style={styles.preCountdownContainer}>
          <Text style={styles.preCountdownText}>
            {preCountdownRemaining > 0 ? preCountdownRemaining : "GO!"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.stopButton} onPress={handleStopSession}>
          <Text style={styles.stopButtonText}>Stop</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {runningSession.name}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Block {currentIndex + 1} of {runningSession.items.length}
          </Text>
        </View>
        <View style={styles.stopButton} />
      </View>

      {/* Main Timer Area */}
      <View style={styles.mainArea}>
        <Text style={styles.blockLabel}>{currentBlock.label}</Text>
        <Text
          style={[
            styles.blockSubtext,
            { color: getBlockTypeColor(currentBlock.type, colors) },
          ]}
        >
          {typeLabels[currentBlock.type] || currentBlock.type} •{" "}
          {getBlockTimingSummary(currentBlock)}
        </Text>

        <View style={styles.timerContainer}>
          <Text
            style={[
              styles.timerText,
              { color: getBlockTypeColor(currentBlock.type, colors) },
            ]}
          >
            {formatTime(remainingSeconds)}
          </Text>
        </View>

        {nextBlockItem && (
          <View style={styles.nextBlockContainer}>
            <Text style={styles.nextBlockLabel}>
              Next: {nextBlockItem.label}
            </Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.previousButton]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Text
            style={[
              styles.controlButtonText,
              currentIndex === 0 && styles.controlButtonTextDisabled,
            ]}
          >
            ← Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.playPauseButton]}
          onPress={handleTogglePause}
        >
          <Ionicons
            name={isRunning ? "pause" : "play"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.nextButton]}
          onPress={handleNext}
          disabled={currentIndex >= runningSession.items.length - 1}
        >
          <Text
            style={[
              styles.controlButtonText,
              currentIndex >= runningSession.items.length - 1 &&
                styles.controlButtonTextDisabled,
            ]}
          >
            Next →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Completion Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleComplete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.completeTitle}>🎉 Session Complete!</Text>
            <Text style={styles.completeText}>
              You completed {runningSession.name}
            </Text>
            <Text style={styles.completeSubtext}>
              {runningSession.items.length} blocks • {formatTime(totalDuration)}
            </Text>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleComplete}
            >
              <Text style={styles.completeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#2a2a2a",
  },
  stopButton: {
    padding: 8,
    minWidth: 60,
  },
  stopButtonText: {
    color: "#ff5252",
    fontSize: 16,
    fontWeight: "600",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  sessionName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#444",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4A7C9E",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#999",
  },
  mainArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  blockLabel: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  blockSubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 40,
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  timerText: {
    fontSize: 80,
    fontWeight: "bold",
    color: "#4A7C9E",
    fontFamily: "monospace",
  },
  nextBlockContainer: {
    marginTop: 20,
  },
  nextBlockLabel: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    backgroundColor: "#2a2a2a",
    gap: 12,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#3a3a3a",
  },
  previousButton: {
    backgroundColor: "#3a3a3a",
  },
  playPauseButton: {
    backgroundColor: "#4A7C9E",
  },
  nextButton: {
    backgroundColor: "#3a3a3a",
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  controlButtonTextDisabled: {
    color: "#666",
    opacity: 0.5,
  },
  preCountdownContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  preCountdownText: {
    fontSize: 120,
    fontWeight: "bold",
    color: "#4A7C9E",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    minWidth: 280,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  completeText: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  completeSubtext: {
    fontSize: 14,
    color: "#999",
    marginBottom: 24,
    textAlign: "center",
  },
  completeButton: {
    backgroundColor: "#4A7C9E",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#4A7C9E",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignSelf: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
