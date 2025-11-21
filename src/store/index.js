import { create } from 'zustand';
import { storageService } from '../services/storage';
import { generateId } from '../utils/id';
import { BlockType, BlockMode } from '../types';

/**
 * Zustand store for global app state
 * Handles BlockTemplates, SessionTemplates, Settings, and running session state
 */
const useStore = create((set, get) => ({
  // Initial state
  blockTemplates: [],
  sessionTemplates: [],
  settings: {
    preCountdownSeconds: 3,
    warningSecondsBeforeEnd: 10,
    enableSounds: true,
    enableVibration: true,
    keepScreenAwakeDuringSession: true,
  },

  // Running session state
  runningSession: null,
  currentIndex: 0,
  remainingSeconds: 0,
  isRunning: false,
  elapsedSecondsInSession: 0,
  isPreCountdown: false,
  preCountdownRemaining: 0,

  // Initialize store - load data from storage
  initialize: async () => {
    const [blockTemplates, sessionTemplates, settings] = await Promise.all([
      storageService.loadBlockTemplates(),
      storageService.loadSessionTemplates(),
      storageService.loadSettings(),
    ]);

    set({
      blockTemplates,
      sessionTemplates,
      settings,
    });
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

  // Settings actions
  updateSettings: async (updates) => {
    const updated = { ...get().settings, ...updates };
    set({ settings: updated });
    await storageService.saveSettings(updated);
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
        // Session complete
        set({
          isRunning: false,
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

