import * as Haptics from 'expo-haptics';
import { audioService } from './audio';

/**
 * Cue service for audio and haptic feedback
 */
export const cueService = {
  /**
   * Trigger "almost done" cue (for blocks > 15s when reaching warning time)
   */
  async almostDone(enableSounds, enableVibration) {
    if (enableSounds) {
      try {
        await audioService.playWarning();
      } catch (error) {
        console.error('Error playing warning sound:', error);
      }
    }
    
    if (enableVibration) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Error triggering haptic:', error);
      }
    }
  },

  /**
   * Trigger "block complete" cue
   */
  async blockComplete(enableSounds, enableVibration) {
    if (enableSounds) {
      try {
        await audioService.playBlockComplete();
      } catch (error) {
        console.error('Error playing block complete sound:', error);
      }
    }
    
    if (enableVibration) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error('Error triggering haptic:', error);
      }
    }
  },

  /**
   * Trigger "session complete" cue
   */
  async sessionComplete(enableSounds, enableVibration) {
    if (enableSounds) {
      try {
        await audioService.playSessionComplete();
      } catch (error) {
        console.error('Error playing session complete sound:', error);
      }
    }
    
    if (enableVibration) {
      try {
        // Celebratory haptic pattern
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 100);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 200);
      } catch (error) {
        console.error('Error triggering haptic:', error);
      }
    }
  },
};

