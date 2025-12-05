// src/services/cues.js
import { createAudioPlayer } from "expo-audio";
import { Vibration } from "react-native";
import useStore from "../store";

// All available cue sources by voice type
const AUDIO_SOURCES = {
  music: {
    almostDone: require("../../assets/sounds/wrapping_up_music.mp3"),
    blockComplete: require("../../assets/sounds/next_music.mp3"),
    sessionComplete: require("../../assets/sounds/session_complete_music.mp3"),
  },
  male: {
    almostDone: require("../../assets/sounds/wrapping_up_male.mp3"),
    blockComplete: require("../../assets/sounds/next_male.mp3"),
    sessionComplete: require("../../assets/sounds/session_complete_male.mp3"),
  },
  female: {
    almostDone: require("../../assets/sounds/wrapping_up_female.mp3"),
    blockComplete: require("../../assets/sounds/next_female.mp3"),
    sessionComplete: require("../../assets/sounds/session_complete_female.mp3"),
  },
};

const DEFAULT_VOICE_TYPE = "music";

// Cache of audio players so we don't recreate them every time
// Key: `${voiceType}_${eventName}`
const playerCache = {};

/**
 * Read the current voice type from the Zustand store *every time*.
 * We support either:
 *   settings.audioCuePack        (e.g. "music" | "male" | "female")
 *   settings.soundCueVoiceType   (if you happened to name it that)
 */
function getCurrentVoiceType() {
  const state = useStore.getState();
  const settings = state?.settings || {};

  const type =
    settings.audioCuePack || settings.soundCueVoiceType || DEFAULT_VOICE_TYPE;

  if (type === "male" || type === "female" || type === "music") {
    return type;
  }

  return DEFAULT_VOICE_TYPE;
}

/**
 * Internal helper to get the source map for the current voice type.
 */
function getCurrentSources() {
  const voiceType = getCurrentVoiceType();
  return (
    AUDIO_SOURCES[voiceType] ||
    AUDIO_SOURCES[DEFAULT_VOICE_TYPE] ||
    AUDIO_SOURCES.music
  );
}

/**
 * Internal helper to get (or create) a player for a given event name:
 * "almostDone" | "blockComplete" | "sessionComplete"
 */
function getOrCreatePlayer(eventName) {
  const voiceType = getCurrentVoiceType();
  const sources = getCurrentSources();
  const source = sources[eventName];

  if (!source) {
    console.warn(
      `[cueService] No audio source for event "${eventName}" and voiceType "${voiceType}"`
    );
    return null;
  }

  const key = `${voiceType}_${eventName}`;

  if (!playerCache[key]) {
    playerCache[key] = createAudioPlayer(source);
  }

  return playerCache[key];
}

/**
 * Internal helper to play a cue + optional vibration.
 */
function playCueInternal(
  eventName,
  enableSounds,
  enableVibration,
  vibrationPattern
) {
  try {
    if (enableSounds) {
      const player = getOrCreatePlayer(eventName);
      if (player) {
        // Restart from the beginning each time
        try {
          player.stop?.();
        } catch (_) {
          // ignore
        }
        try {
          player.seekTo?.(0);
        } catch (_) {
          // ignore
        }
        player.play();
      }
    }

    if (enableVibration) {
      if (Array.isArray(vibrationPattern)) {
        Vibration.vibrate(vibrationPattern);
      } else if (typeof vibrationPattern === "number") {
        Vibration.vibrate(vibrationPattern);
      } else {
        Vibration.vibrate(80);
      }
    }
  } catch (err) {
    console.warn(`[cueService] Error playing cue "${eventName}"`, err);
  }
}

export const cueService = {
  // Called at (warningSecondsBeforeEnd + 1) seconds remaining
  // -> plays "wrapping up ..." clip
  almostDone(enableSounds, enableVibration) {
    playCueInternal("almostDone", enableSounds, enableVibration, 60);
  },

  // Called when the block finishes and we move to the next
  // -> plays "next" clip
  blockComplete(enableSounds, enableVibration) {
    playCueInternal(
      "blockComplete",
      enableSounds,
      enableVibration,
      [0, 80, 80, 80] // vibrate, pause, vibrate, pause, vibrate
    );
  },

  // Called when the entire session is complete
  // -> plays "session complete" clip
  sessionComplete(enableSounds, enableVibration) {
    playCueInternal(
      "sessionComplete",
      enableSounds,
      enableVibration,
      [0, 120, 80, 120] // slightly longer celebratory pattern
    );
  },

  // Optional: simple preview that always uses the *current* voice type
  // and the "wrapping up" line, no vibration.
  previewCurrentVoice() {
    playCueInternal("almostDone", true, false, null);
  },
};
