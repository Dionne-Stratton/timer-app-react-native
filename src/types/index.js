/**
 * BlockTemplate - Reusable building block / "activity"
 */
export const BlockType = {
  ACTIVITY: 'activity',
  REST: 'rest',
  TRANSITION: 'transition',
};

export const BlockMode = {
  DURATION: 'duration',
  REPS: 'reps',
};

/**
 * Built-in activity categories (always available)
 */
export const BUILT_IN_CATEGORIES = [
  'Exercise',
  'Study',
  'Work',
  'Household',
  'Creative',
  'Uncategorized',
];

/**
 * @typedef {Object} BlockTemplate
 * @property {string} id - Unique identifier
 * @property {string} label - Display name (e.g., "Bicep curls")
 * @property {string} type - Always "activity" (rest/transition are not templates)
 * @property {string} mode - One of BlockMode enum
 * @property {string|null} category - Category name (built-in or custom, null for uncategorized)
 * @property {number} [durationSeconds] - Required if mode is "duration"
 * @property {number} [reps] - Required if mode is "reps"
 * @property {number} [perRepSeconds] - Required if mode is "reps"
 * @property {string} [color] - Optional hex color or theme key
 * @property {string} [icon] - Optional icon name
 * @property {string} [notes] - Optional free text description
 */

/**
 * BlockInstance - Block as used inside a session
 * Essentially a snapshot of a template with optional per-session overrides
 */
/**
 * @typedef {Object} BlockInstance
 * @property {string} id - Unique identifier for this instance
 * @property {string|null} [templateId] - ID of BlockTemplate it came from (null if custom)
 * @property {string} label - Display name
 * @property {string} type - One of BlockType enum ("activity", "rest", or "transition")
 * @property {string|null} category - Category name (for activities only, null for rest/transition)
 * @property {string} mode - One of BlockMode enum
 * @property {number} [durationSeconds] - Required if mode is "duration"
 * @property {number} [reps] - Required if mode is "reps"
 * @property {number} [perRepSeconds] - Required if mode is "reps"
 */

/**
 * SessionTemplate - Playlist/session
 */
/**
 * @typedef {Object} SessionTemplate
 * @property {string} id - Unique identifier
 * @property {string} name - Display name (e.g., "Leg Day A")
 * @property {BlockInstance[]} items - Ordered array of BlockInstances
 * @property {string[]} [tags] - Optional array of tags
 * @property {number[]} [scheduledDaysOfWeek] - ISO weekday indices (1=Monday ... 7=Sunday)
 */

/**
 * Settings - Global app settings
 */
/**
 * @typedef {Object} Settings
 * @property {number} preCountdownSeconds - Pre-countdown length (0, 3, or 5)
 * @property {number} warningSecondsBeforeEnd - Warning time before block end (default 10)
 * @property {boolean} enableSounds - Enable sound cues
 * @property {boolean} enableVibration - Enable haptic feedback
 * @property {boolean} keepScreenAwakeDuringSession - Keep screen awake during sessions
 * @property {string} historyRetention - History retention setting ("unlimited" | "3months" | "6months" | "12months")
 */

/**
 * SessionHistoryEntry - History log entry for completed sessions
 */
/**
 * @typedef {Object} SessionHistoryEntry
 * @property {string} id - Unique identifier
 * @property {string|null} sessionId - ID of SessionTemplate that was run (null if deleted)
 * @property {string} sessionName - Snapshot of session name at completion time
 * @property {string} completedAt - ISO timestamp in UTC
 * @property {number} totalDurationSeconds - Total duration in seconds (planned duration)
 */

/**
 * Helper function to calculate total duration of a block
 * @param {BlockInstance|BlockTemplate} block
 * @returns {number} Total duration in seconds
 */
export function getBlockDurationSeconds(block) {
  if (block.mode === BlockMode.DURATION) {
    return block.durationSeconds || 0;
  } else if (block.mode === BlockMode.REPS) {
    return (block.reps || 0) * (block.perRepSeconds || 0);
  }
  return 0;
}

/**
 * Helper function to get timing summary string for display
 * @param {BlockInstance|BlockTemplate} block
 * @returns {string} Display string (e.g., "45s" or "10 reps × 5s")
 */
export function getBlockTimingSummary(block) {
  if (block.mode === BlockMode.DURATION) {
    const seconds = block.durationSeconds || 0;
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  } else if (block.mode === BlockMode.REPS) {
    return `${block.reps || 0} reps × ${block.perRepSeconds || 0}s`;
  }
  return '';
}

/**
 * Helper function to calculate total duration of a session
 * @param {SessionTemplate} session
 * @returns {number} Total duration in seconds
 */
export function getSessionTotalDuration(session) {
  if (!session || !session.items) return 0;
  return session.items.reduce((total, item) => {
    return total + getBlockDurationSeconds(item);
  }, 0);
}

/**
 * Format seconds to MM:SS string
 * @param {number} seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get the color for a block type
 * @param {string} blockType - One of BlockType enum values
 * @param {object} colors - Theme colors object
 * @returns {string} Color hex code
 */
export function getBlockTypeColor(blockType, colors) {
  switch (blockType) {
    case BlockType.ACTIVITY:
      return colors.blockActivity;
    case BlockType.REST:
      return colors.blockRest;
    case BlockType.TRANSITION:
      return colors.blockTransition;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get the background tint for a block type
 * @param {string} blockType - One of BlockType enum values
 * @param {object} colors - Theme colors object
 * @returns {string} Background tint rgba string
 */
export function getBlockTypeTint(blockType, colors) {
  switch (blockType) {
    case BlockType.ACTIVITY:
      return colors.blockActivityTint;
    case BlockType.REST:
      return colors.blockRestTint;
    case BlockType.TRANSITION:
      return colors.blockTransitionTint;
    default:
      return 'transparent';
  }
}

