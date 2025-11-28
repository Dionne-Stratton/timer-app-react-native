import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  BackHandler,
  Linking,
} from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
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
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const lastWarningTime = useRef(null);
  const prevIndexRef = useRef(0);

  // Function to navigate back when a session ends or is stopped
  const navigateBack = () => {
    // 1) Always clean up the Sessions stack so RunSession isn't left on top
    navigation.reset({
      index: 0,
      routes: [{ name: "SessionsList" }],
    });

    // 2) If this run was started from a specific tab (e.g. Home via Quick Start),
    //    switch back to that tab after resetting the stack
    if (returnTo?.tab) {
      const parentNav = navigation.getParent();
      if (parentNav) {
        setTimeout(() => {
          parentNav.navigate(returnTo.tab);
        }, 0);
      }
    }
  };

  // Check if screen was navigated to without a valid session - navigate back immediately
  useEffect(() => {
    if (!sessionId && !runningSession) {
      navigation.popToTop();
    }
  }, [sessionId, runningSession, navigation]);

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
  const hasScheduledNotifications = useRef(false);
  const lastScheduledIndex = useRef(-1);
  useEffect(() => {
    if (runningSession && !isPreCountdown && isRunning && !isSessionComplete) {
      if (
        !hasScheduledNotifications.current ||
        currentIndex !== lastScheduledIndex.current
      ) {
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
      hasScheduledNotifications.current = false;
      lastScheduledIndex.current = -1;
    }

    return () => {
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
      lastWarningTime.current = null;
      cueService.blockComplete(settings.enableSounds, settings.enableVibration);
      prevIndexRef.current = currentIndex;

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
      if (!preCountdownInterval.current) {
        preCountdownInterval.current = setInterval(() => {
          tickPreCountdown();
        }, 1000);
      }
    } else if (isPreCountdown && preCountdownRemaining === 0) {
      if (preCountdownInterval.current) {
        clearInterval(preCountdownInterval.current);
        preCountdownInterval.current = null;
      }
      const timeoutId = setTimeout(() => {
        tickPreCountdown();
      }, 1000);
      return () => clearTimeout(timeoutId);
    } else {
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

  // Handle device back button - stop the session
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (runningSession && !isSessionComplete) {
          handleStopSession();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [runningSession, isSessionComplete, handleStopSession]);

  const handleComplete = () => {
    notificationService.cancelAllNotifications();
    setShowCompleteModal(false);
    stopSession();
    navigateBack();
  };

  const handleTogglePause = () => {
    if (isRunning) {
      pauseTimer();
      notificationService.cancelAllNotifications();
    } else {
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

  const styles = getStyles(insets);

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

  const hasNotes =
    currentBlock && typeof currentBlock.notes === "string"
      ? currentBlock.notes.trim().length > 0
      : false;
  const hasUrl =
    currentBlock && typeof currentBlock.url === "string"
      ? currentBlock.url.trim().length > 0
      : false;
  const hasInstructions = hasNotes || hasUrl;

  const handleOpenUrl = async () => {
    if (!hasUrl) return;
    const url = currentBlock.url.trim();
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Invalid link", "Unable to open this URL.");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong trying to open the link.");
      console.error(err);
    }
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
    <View style={styles.container}>
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

        {/* Instructions button (notes / URL) */}
        {hasInstructions && (
          <TouchableOpacity
            style={styles.instructionsButton}
            onPress={() => setShowInstructionsModal(true)}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#fff"
            />
            <Text style={styles.instructionsButtonText}>View instructions</Text>
          </TouchableOpacity>
        )}

        {nextBlockItem && (
          <View style={styles.nextBlockContainer}>
            <Text style={styles.nextBlockLabel}>
              Next: {nextBlockItem.label}
            </Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View
        style={[
          styles.controls,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
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

      {/* Instructions Modal */}
      <Modal
        visible={showInstructionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInstructionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.instructionsModalContent}>
            <Text style={styles.instructionsTitle}>{currentBlock.label}</Text>

            {hasNotes && (
              <View style={styles.instructionsSection}>
                <Text style={styles.instructionsSectionLabel}>Notes</Text>
                <Text style={styles.instructionsNotesText}>
                  {currentBlock.notes}
                </Text>
              </View>
            )}

            {hasUrl && (
              <View style={styles.instructionsSection}>
                <Text style={styles.instructionsSectionLabel}>Link</Text>
                <TouchableOpacity onPress={handleOpenUrl}>
                  <Text style={styles.instructionsLinkText}>
                    {currentBlock.url}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.instructionsCloseButton}
              onPress={() => setShowInstructionsModal(false)}
            >
              <Text style={styles.instructionsCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#1a1a1a",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: Math.max(insets.top, 16),
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
      marginBottom: 24,
    },
    timerContainer: {
      alignItems: "center",
      marginBottom: 20,
    },
    timerText: {
      fontSize: 80,
      fontWeight: "bold",
      color: "#4A7C9E",
      fontFamily: "monospace",
    },
    instructionsButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: "#3a3a3a",
      marginBottom: 20,
    },
    instructionsButtonText: {
      color: "#fff",
      marginLeft: 8,
      fontSize: 14,
      fontWeight: "600",
    },
    nextBlockContainer: {
      marginTop: 8,
    },
    nextBlockLabel: {
      fontSize: 18,
      color: "#999",
      textAlign: "center",
    },
    controls: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: 16,
      paddingHorizontal: 16,
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
    // Instructions modal styling
    instructionsModalContent: {
      backgroundColor: "#2a2a2a",
      borderRadius: 16,
      padding: 24,
      minWidth: 280,
      maxWidth: "90%",
    },
    instructionsTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: "#fff",
      marginBottom: 16,
      textAlign: "center",
    },
    instructionsSection: {
      marginBottom: 16,
    },
    instructionsSectionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: "#ccc",
      marginBottom: 6,
      textTransform: "uppercase",
    },
    instructionsNotesText: {
      fontSize: 16,
      color: "#fff",
      lineHeight: 22,
    },
    instructionsLinkText: {
      fontSize: 16,
      color: "#4da6ff",
      textDecorationLine: "underline",
    },
    instructionsCloseButton: {
      marginTop: 8,
      alignSelf: "center",
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: "#4A7C9E",
    },
    instructionsCloseButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
  });
