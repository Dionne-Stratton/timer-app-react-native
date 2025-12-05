import { create } from "zustand";
import { storageService } from "../services/storage";
import { generateId } from "../utils/id";
import { BlockType, BlockMode, getSessionTotalDuration } from "../types";

/**
 * Zustand store for global app state
 * Handles BlockTemplates, SessionTemplates, Settings, and running session state
 */
const useStore = create((set, get) => ({
  // Initial state
  blockTemplates: [],
  sessionTemplates: [],
  sessionHistory: [],
  sessionDrafts: {}, // Map of sessionId -> draft session data (for unsaved sessions)
  settings: {
    preCountdownSeconds: 3,
    warningSecondsBeforeEnd: 10,
    enableSounds: true,
    enableVibration: true,
    keepScreenAwakeDuringSession: true,
    historyRetention: "unlimited",
    themeMode: "system",
    customCategories: [],
    isProUser: false,
    defaultSaveToLibrary: true,
    // NEW: which cue pack to use for spoken/music cues
    // "female" | "male" | "music"
    audioCuePack: "music",
  },

  // Running session state
  runningSession: null,
  currentIndex: 0,
  remainingSeconds: 0,
  isRunning: false,
  elapsedSecondsInSession: 0,
  isPreCountdown: false,
  preCountdownRemaining: 0,
  isSessionComplete: false,

  // Initialize store - load data from storage
  initialize: async () => {
    const [blockTemplates, sessionTemplates, settings, sessionHistory] =
      await Promise.all([
        storageService.loadBlockTemplates(),
        storageService.loadSessionTemplates(),
        storageService.loadSettings(),
        storageService.loadSessionHistory(),
      ]);

    set({
      blockTemplates,
      sessionTemplates,
      settings,
      sessionHistory,
    });

    // Enforce history retention on app startup
    await get().enforceHistoryRetention();
  },

  // Block Templates actions
  addBlockTemplate: async (template) => {
    const newTemplate = {
      ...template,
      id: generateId(),
    };
    const updated = [...get().blockTemplates, newTemplate];
    set({ blockTemplates: updated });
    await storageService.saveBlockTemplates(updated);
    return newTemplate;
  },

  updateBlockTemplate: async (id, updates) => {
    const updated = get().blockTemplates.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    set({ blockTemplates: updated });
    await storageService.saveBlockTemplates(updated);
  },

  deleteBlockTemplate: async (id) => {
    const updated = get().blockTemplates.filter((t) => t.id !== id);
    set({ blockTemplates: updated });
    await storageService.saveBlockTemplates(updated);
  },

  deleteAllBlockTemplates: async () => {
    set({ blockTemplates: [] });
    await storageService.saveBlockTemplates([]);
  },

  // Session Templates actions
  addSessionTemplate: async (session) => {
    const newSession = {
      ...session,
      id: generateId(),
      items: session.items || [],
    };
    const updated = [...get().sessionTemplates, newSession];
    set({ sessionTemplates: updated });
    await storageService.saveSessionTemplates(updated);
    return newSession;
  },

  updateSessionTemplate: async (id, updates) => {
    const updated = get().sessionTemplates.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    set({ sessionTemplates: updated });
    await storageService.saveSessionTemplates(updated);
  },

  deleteSessionTemplate: async (id) => {
    const updated = get().sessionTemplates.filter((s) => s.id !== id);
    set({ sessionTemplates: updated });
    await storageService.saveSessionTemplates(updated);
  },

  deleteAllSessionTemplates: async () => {
    set({ sessionTemplates: [] });
    await storageService.saveSessionTemplates([]);
  },

  duplicateSessionTemplate: async (id) => {
    const session = get().sessionTemplates.find((s) => s.id === id);
    if (!session) return null;

    const duplicated = {
      ...session,
      id: generateId(),
      name: `${session.name} (Copy)`,
      items: session.items.map((item) => ({
        ...item,
        id: generateId(),
      })),
    };

    const updated = [...get().sessionTemplates, duplicated];
    set({ sessionTemplates: updated });
    await storageService.saveSessionTemplates(updated);
    return duplicated;
  },

  // Session Drafts actions (for unsaved sessions)
  getSessionDraft: (sessionId) => {
    return get().sessionDrafts[sessionId] || null;
  },

  saveSessionDraft: (sessionId, draftData) => {
    const drafts = { ...get().sessionDrafts };
    drafts[sessionId] = {
      ...draftData,
      sessionId, // Ensure sessionId is included
    };
    set({ sessionDrafts: drafts });
  },

  updateSessionDraft: (sessionId, updates) => {
    const drafts = { ...get().sessionDrafts };
    if (drafts[sessionId]) {
      drafts[sessionId] = {
        ...drafts[sessionId],
        ...updates,
      };
      set({ sessionDrafts: drafts });
    }
  },

  deleteSessionDraft: (sessionId) => {
    const drafts = { ...get().sessionDrafts };
    delete drafts[sessionId];
    set({ sessionDrafts: drafts });
  },

  // Settings actions
  updateSettings: async (updates) => {
    const updated = { ...get().settings, ...updates };
    set({ settings: updated });
    await storageService.saveSettings(updated);

    // If historyRetention changed, enforce it immediately
    if (updates.historyRetention !== undefined) {
      get().enforceHistoryRetention();
    }
  },

  // History retention enforcement
  enforceHistoryRetention: async () => {
    const { sessionHistory, settings } = get();

    // Free users: 30 days retention (override their setting)
    // Pro users: use their selected retention setting
    const effectiveRetention = settings.isProUser
      ? settings.historyRetention
      : "30days";

    if (effectiveRetention === "unlimited") {
      return;
    }

    const now = new Date();
    let cutoffDate;

    switch (effectiveRetention) {
      case "30days":
        cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case "3months":
        cutoffDate = new Date(now);
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        cutoffDate = new Date(now);
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case "12months":
        cutoffDate = new Date(now);
        cutoffDate.setMonth(now.getMonth() - 12);
        break;
      default:
        return;
    }

    const cutoffTime = cutoffDate.getTime();
    const filtered = sessionHistory.filter((entry) => {
      const entryTime = new Date(entry.completedAt).getTime();
      return entryTime >= cutoffTime;
    });

    if (filtered.length !== sessionHistory.length) {
      set({ sessionHistory: filtered });
      await storageService.saveSessionHistory(filtered);
    }
  },

  // Session History actions
  addSessionHistoryEntry: async (entry) => {
    const newEntry = {
      ...entry,
      id: generateId(),
    };
    const updated = [...get().sessionHistory, newEntry];
    set({ sessionHistory: updated });
    await storageService.saveSessionHistory(updated);

    // Enforce retention after adding entry
    await get().enforceHistoryRetention();

    return newEntry;
  },

  deleteAllHistory: async () => {
    set({ sessionHistory: [] });
    await storageService.saveSessionHistory([]);
  },

  // Running session actions
  startSession: (sessionId) => {
    const session = get().sessionTemplates.find((s) => s.id === sessionId);
    if (!session || !session.items || session.items.length === 0) {
      return false;
    }

    const firstBlock = session.items[0];
    const remainingSeconds = getBlockDuration(firstBlock);

    set({
      runningSession: session,
      currentIndex: 0,
      remainingSeconds,
      isRunning: false,
      elapsedSecondsInSession: 0,
      isPreCountdown: get().settings.preCountdownSeconds > 0,
      preCountdownRemaining: get().settings.preCountdownSeconds,
    });

    return true;
  },

  startPreCountdown: () => {
    set({
      isPreCountdown: true,
      preCountdownRemaining: get().settings.preCountdownSeconds,
    });
  },

  tickPreCountdown: () => {
    const { preCountdownRemaining } = get();
    if (preCountdownRemaining > 0) {
      set({ preCountdownRemaining: preCountdownRemaining - 1 });
    } else {
      set({ isPreCountdown: false, isRunning: true });
    }
  },

  startTimer: () => {
    set({ isRunning: true });
  },

  pauseTimer: () => {
    set({ isRunning: false });
  },

  tickTimer: () => {
    const {
      runningSession,
      currentIndex,
      remainingSeconds,
      elapsedSecondsInSession,
    } = get();

    if (!runningSession || !runningSession.items) return;

    if (remainingSeconds > 0) {
      set({
        remainingSeconds: remainingSeconds - 1,
        elapsedSecondsInSession: elapsedSecondsInSession + 1,
      });
    } else {
      // Move to next block
      const nextIndex = currentIndex + 1;
      if (nextIndex < runningSession.items.length) {
        const nextBlock = runningSession.items[nextIndex];
        set({
          currentIndex: nextIndex,
          remainingSeconds: getBlockDuration(nextBlock),
        });
      } else {
        // Session complete - create history entry
        const { runningSession } = get();
        if (runningSession) {
          const totalDuration = getSessionTotalDuration(runningSession);
          const now = new Date().toISOString(); // UTC timestamp

          get().addSessionHistoryEntry({
            sessionId: runningSession.id,
            sessionName: runningSession.name,
            completedAt: now,
            totalDurationSeconds: totalDuration,
          });
        }

        set({
          isRunning: false,
          isSessionComplete: true,
        });
      }
    }
  },

  nextBlock: () => {
    const { runningSession, currentIndex } = get();
    if (!runningSession || !runningSession.items) return false;

    const nextIndex = currentIndex + 1;
    if (nextIndex < runningSession.items.length) {
      const nextBlock = runningSession.items[nextIndex];
      set({
        currentIndex: nextIndex,
        remainingSeconds: getBlockDuration(nextBlock),
      });
      return true;
    }
    return false;
  },

  previousBlock: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      const { runningSession } = get();
      const prevBlock = runningSession.items[currentIndex - 1];
      set({
        currentIndex: currentIndex - 1,
        remainingSeconds: getBlockDuration(prevBlock),
      });
      return true;
    }
    return false;
  },

  stopSession: () => {
    set({
      runningSession: null,
      currentIndex: 0,
      remainingSeconds: 0,
      isRunning: false,
      elapsedSecondsInSession: 0,
      isPreCountdown: false,
      preCountdownRemaining: 0,
      isSessionComplete: false,
    });
  },
}));

// Helper function to get block duration
function getBlockDuration(block) {
  if (block.mode === BlockMode.DURATION) {
    return block.durationSeconds || 0;
  } else if (block.mode === BlockMode.REPS) {
    return (block.reps || 0) * (block.perRepSeconds || 0);
  }
  return 0;
}

export default useStore;
