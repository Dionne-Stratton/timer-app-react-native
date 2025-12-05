// src/services/cues.js
import { Audio } from "expo-av";
import { Vibration } from "react-native";

// Map logical cue names to your sound files
const soundAssets = {
  // 10-second warning (or "you're almost done")
  almostDone: require("../../assets/sounds/almost_done.mp3"),
  // Block finished / "here comes the next one"
  blockComplete: require("../../assets/sounds/next_block.mp3"),
  // Whole session complete
  sessionComplete: require("../../assets/sounds/session_complete.mp3"),
};

const loadedSounds = {};
let isAudioConfigured = false;

async function ensureAudioModeConfigured() {
  if (isAudioConfigured) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    isAudioConfigured = true;
  } catch (err) {
    console.warn("Failed to configure audio mode", err);
  }
}

async function loadSound(key) {
  if (loadedSounds[key]) return loadedSounds[key];

  const sound = new Audio.Sound();
  await sound.loadAsync(soundAssets[key]);
  loadedSounds[key] = sound;
  return sound;
}

async function playCue(name, enableSounds, enableVibration, vibrationPattern) {
  try {
    if (enableSounds) {
      await ensureAudioModeConfigured();
      const sound = await loadSound(name);
      // replayAsync restarts from the beginning each time
      await sound.replayAsync();
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
    console.warn(`Error playing cue "${name}"`, err);
  }
}

export const cueService = {
  // Called when you’re at warningSecondsBeforeEnd (e.g. 10s)
  async almostDone(enableSounds, enableVibration) {
    await playCue("almostDone", enableSounds, enableVibration, 60);
  },

  // Called when the block finishes and you move to the next one
  async blockComplete(enableSounds, enableVibration) {
    await playCue(
      "blockComplete",
      enableSounds,
      enableVibration,
      [0, 80, 80, 80] // vibrate, pause, vibrate, pause, vibrate
    );
  },

  // Called when the entire session is complete
  async sessionComplete(enableSounds, enableVibration) {
    await playCue(
      "sessionComplete",
      enableSounds,
      enableVibration,
      [0, 120, 80, 120] // slightly longer celebratory pattern
    );
  },
};
