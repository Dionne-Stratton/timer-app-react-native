import { Audio } from 'expo-av';

/**
 * Audio service for timer cues
 * Note: Audio files can be added to assets/sounds/ folder later
 * For now, this is a placeholder that initializes audio mode
 */
export const audioService = {
  /**
   * Initialize audio mode
   */
  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  },

  /**
   * Play block complete sound
   * TODO: Add audio file to assets/sounds/block-complete.mp3
   */
  async playBlockComplete() {
    try {
      // Placeholder for audio file
      // In production, load from assets:
      // const { sound } = await Audio.Sound.createAsync(
      //   require('../../assets/sounds/block-complete.mp3')
      // );
      // await sound.playAsync();
      console.log('Block complete sound');
    } catch (error) {
      console.log('Audio playback failed');
    }
  },

  /**
   * Play session complete sound
   * TODO: Add audio file to assets/sounds/session-complete.mp3
   */
  async playSessionComplete() {
    try {
      // Placeholder for audio file
      console.log('Session complete sound');
    } catch (error) {
      console.log('Audio playback failed');
    }
  },

  /**
   * Play warning/almost done sound
   * TODO: Add audio file to assets/sounds/warning.mp3
   */
  async playWarning() {
    try {
      // Placeholder for audio file
      console.log('Warning sound');
    } catch (error) {
      console.log('Audio playback failed');
    }
  },
};

