TIMER APP – FULL PRODUCT & TECH SPEC (FOR EXPO REACT NATIVE)

Goal
Build a cross-platform (Android + iOS) React Native app using Expo that lets users:

- Create reusable “activity” blocks (exercises, rests, transitions, study blocks, etc.).
- Assemble these into ordered “sessions” (playlists).
- Run sessions as timers with audio/vibration cues and background-safe notifications.
- Share individual sessions via export/import so a trainer can send a workout to a client.

The app must be fully usable offline and must not depend on any backend.

---

1. Tech Stack & Libraries

Use Expo-managed workflow.

Core stack:

- React Native with Expo
- Navigation: React Navigation
- State management: Zustand (or similar lightweight global store)
- Persistence: AsyncStorage (@react-native-async-storage/async-storage)
- Notifications: expo-notifications (local notifications)
- Audio: expo-av (for sound effects)
- Haptics: expo-haptics (for vibration feedback)
- File import/export:

  - expo-document-picker for import
  - expo-sharing (or expo’s Sharing API) for export

- Optionally: expo-keep-awake for preventing screen sleep during a running session

The app must run on both Android and iOS.

---

2. Core Concepts & Data Model (Conceptual)

All data is local. No backend.

a) BlockTemplate (reusable building block / “activity”)

Represents an activity, rest, or transition that users can reuse in multiple sessions.

Each BlockTemplate has:

- id: string (unique identifier)
- label: string (e.g., “Bicep curls”, “Hamstring stretch”, “Short rest”)
- type: string enum, one of:

  - "activity"
  - "rest"
  - "transition"

- mode: string enum, one of:

  - "duration" – single block of time
  - "reps" – a set number of reps with approx seconds per rep

Timing fields:

- If mode = "duration":

  - durationSeconds: number

- If mode = "reps":

  - reps: number
  - perRepSeconds: number

Optional metadata (for UI only):

- color: string (e.g., hex or theme key)
- icon: string (name from chosen icon set)
- notes: string (free text description)

b) BlockInstance (block as used inside a session)

Represents a block inside a specific session. It is essentially a snapshot of a template, with optional per-session overrides.

Each BlockInstance has:

- id: string (unique identifier for this instance)
- templateId: optional string (id of BlockTemplate it came from; may be null if custom)
- label: string (copied from template by default; can be overridden for this session)
- type: "activity" | "rest" | "transition"
- mode: "duration" | "reps"
- durationSeconds: number (if mode is duration)
- reps: number (if mode is reps)
- perRepSeconds: number (if mode is reps)

c) SessionTemplate (playlist/session)

Represents a full session the user can run.

Each SessionTemplate has:

- id: string
- name: string (e.g., “Leg Day A”, “Morning Stretch”, “Pomodoro 25/5”)
- items: ordered array of BlockInstance
- tags: optional array of strings (e.g., ["exercise", "stretch", "study"])

For v1, no “group/repeat pattern” object is required; users can repeat blocks manually.

d) Settings

Store a simple global settings object:

- preCountdownSeconds: number (default 3; options 0, 3, 5)
- warningSecondsBeforeEnd: number (default 10)
- enableSounds: boolean (default true)
- enableVibration: boolean (default true)
- keepScreenAwakeDuringSession: boolean (default true)

---

3. Storage & Backend Requirements

- The app must be fully functional offline.
- No backend, no remote APIs, no user accounts, no authentication in v1.
- All data stored locally using AsyncStorage:

  - BlockTemplates
  - SessionTemplates
  - Settings
  - (Optional) Session history later

Implement a small storage abstraction service (not direct AsyncStorage calls everywhere) with functions like:

- loadBlockTemplates / saveBlockTemplates
- loadSessionTemplates / saveSessionTemplates
- loadSettings / saveSettings

The rest of the app should only talk to this storage layer, not AsyncStorage directly. This keeps open the option to swap storage (e.g., MMKV or SQLite) or add sync later.

---

4. Screens & Flows

4.1 Home / Sessions Screen

Purpose: Entry point listing all saved sessions.

Features:

- Display a list of SessionTemplates as cards.

  - Show name.
  - Show computed total duration (sum of block durations).
  - Show number of blocks.

- User actions:

  - Tap a session card: navigate to Run Session screen for that session.
  - Session options:

    - Edit (opens Session Builder)
    - Duplicate (creates a new session with same items, new id)
    - Delete

- Global actions:

  - “+ New Session” button: creates a new empty SessionTemplate and opens Session Builder.
  - Access to Settings (e.g., gear icon).
  - Access to “Import Session” feature (see sharing section).

    4.2 Block Library Screen (“Activities”)

Purpose: Manage reusable activity blocks.

Features:

- List all BlockTemplates.
- Each item shows:

  - label
  - type (activity/rest/transition)
  - summary of timing (e.g., “45s” or “10 reps × 5s”)

- Actions:

  - Tap to edit template.
  - Delete template.
  - “+ New Activity” button to create a new BlockTemplate.

Create/Edit BlockTemplate form:

- Fields:

  - Name/Label (required)
  - Type: activity/rest/transition
  - Mode: duration or reps
  - If duration: input minutes/seconds → convert to durationSeconds
  - If reps: input reps and seconds per rep
  - Optional: color, icon, notes

- Validation:

  - Required fields must be filled
  - durationSeconds > 0
  - reps > 0 and perRepSeconds > 0 where applicable

    4.3 Session Builder Screen

Purpose: Build or edit sessions (playlists).

Layout:

- Top:

  - Session name (editable)
  - Display total duration and number of blocks

- Middle:

  - Draggable list of BlockInstances (use a draggable FlatList)
  - Each item shows:

    - label
    - type
    - timing summary

  - Per-item actions:

    - Edit (label and timing overrides)
    - Duplicate block
    - Delete block

- Bottom / prominent button:

  - “Add Block” button

“Add Block” flow:

- On press, open a modal/bottom sheet with:

  - Tab or options:

    - “From Library” – list BlockTemplates with search/filter
    - “Custom Block” – create a session-only block not added to library

- When adding from library:

  - Copy label, type, mode, and timing fields from BlockTemplate into a new BlockInstance.

- When adding custom:

  - Show a small inline form similar to BlockTemplate form but only used for this session; create a BlockInstance without templateId.

Reordering:

- Use drag handle on each item; drag-and-drop changes the order in the session’s items array.

Saving:

- Provide a “Save Session” action:

  - Validate there is at least one block.
  - Persist SessionTemplate via the storage layer.
  - Return user to Home or allow immediate “Start Session” option.

    4.4 Run Session Screen

Purpose: Execute a session as a timer sequence with cues and controls.

State needed for a running session:

- currentSessionId (or the SessionTemplate object directly)
- flatItems: the array of BlockInstances (no grouping in v1)
- currentIndex: index into flatItems
- remainingSeconds: countdown for the active block
- isRunning: boolean
- totalSessionSeconds: sum of all block times (for progress)
- elapsedSecondsInSession: for overall progress

Time for a block:

- If mode = duration: use durationSeconds.
- If mode = reps: use totalBlockTime = reps × perRepSeconds.

UI:

- Top:

  - Session name
  - Overall progress indicator: percentage or simple bar

- Main area:

  - Large current block label
  - Subtext: type + summary (e.g., “Activity • 10 reps × 5s (~50s)”)
  - Big countdown timer (MM:SS)
  - Below: “Next: [Next block label]” (if any)

- Bottom controls:

  - Play / Pause button
  - Previous block button
  - Next block button
  - Optional “Skip block” button (can be same as Next, just labeled clearly)

Flow:

- When user taps “Start session” from Home or Session Builder:

  - Navigate to Run Session.
  - Show a pre-countdown of preCountdownSeconds (e.g., 3…2…1…).
  - After countdown, start first block’s timer and schedule notifications (see notifications section).

- Timer behavior:

  - Use a 1-second tick while the app is foregrounded.
  - On each tick, if isRunning:

    - Decrement remainingSeconds.
    - If block duration is above a threshold (e.g., 15s) and remainingSeconds equals warningSecondsBeforeEnd, trigger “almost done” cue (sound + haptic) if enabled.
    - When remainingSeconds reaches 0:

      - Trigger “block complete” cue.
      - Move to next block:

        - Increment currentIndex.
        - If there’s a next block, set remainingSeconds to its calculated length.
        - If no more blocks, mark session complete, show completion UI, and stop timers.

- Controls:

  - Pause:

    - Stop decrementing remainingSeconds.
    - Cancel future notifications and reschedule them on resume.

  - Resume:

    - Restart in-app countdown and reschedule notifications.

  - Next:

    - Immediately mark current block as completed and jump to next block.
    - Reset remainingSeconds to new block’s time.
    - Update notifications.

  - Previous:

    - Jump back to previous block (or restart current), set remainingSeconds accordingly.
    - Update notifications.

Session completion:

- When the last block finishes:

  - Play a distinct “session complete” sound (if sounds enabled).
  - Trigger a more “celebratory” haptic (if enabled).
  - Show a modal or screen: “Session complete.”
  - Optionally show summary (total time, number of blocks).

---

5. Notifications & Background Behavior

Requirements:

- Session must continue logically even if user switches to another app or locks the screen.
- Users must receive cues at block transitions and, optionally, near block end, via local notifications.

Strategy:

- When the session starts (after the pre-countdown) and any time the timing changes (pause/resume/skip), recalculate a schedule of upcoming block start/end times based on current time.
- Use expo-notifications to schedule local notifications for these events.

Scheduling:

For each remaining block:

- Calculate:

  - Block start time (relative to “now” + accumulated offsets)
  - Block end time

- Schedule notifications at:

  - Block start (optional message like: “Next: [Block label] starting now”)
  - Block end (or just at the moment of transition, depending on design)

- For blocks with duration >= warningSecondsBeforeEnd, optionally:

  - Schedule an “almost done” notification warningSecondsBeforeEnd seconds before block end.

Pause/Resume/Skip:

- On pause:

  - Cancel all scheduled notifications for the current session run.

- On resume:

  - Recalculate schedule from the new “now” moment with updated remainingSeconds and block queue.
  - Reschedule notifications accordingly.

- On Next/Previous:

  - Update currentIndex, remainingSeconds.
  - Cancel and reschedule relevant notifications.

All of this must work purely with local notifications (no backend).

---

6. Audio & Haptics

Use expo-av and expo-haptics.

Global settings:

- enableSounds: boolean
- enableVibration: boolean

Sound cues:

- Pre-countdown: optional ticks (optional for v1).
- “Almost done” cue:

  - Short sound when remainingSeconds hits warningSecondsBeforeEnd for eligible blocks.

- “Block complete / next block” cue:

  - Distinct short sound when moving from one block to the next.

- “Session complete” cue:

  - More distinct sound.

Haptic cues:

- “Almost done”: short vibration.
- “Block complete”: medium vibration.
- “Session complete”: stronger or patterned vibration.

Implementation detail:

- Ensure these cues are gated by the global settings (if sounds/vibration are disabled, don’t play/trigger).

---

7. Session Sharing (Trainer → Client) – No Backend

The app must allow a trainer to build a session and share it with a client, without requiring any server.

Implement **file-based export/import**.

7.1 Export (Share Session)

From a session’s options menu, provide a “Share Session” action.

Behavior:

- Serialize the chosen SessionTemplate, including all of its BlockInstances, into a JSON object.
- Wrap this serialized JSON into a small file with a custom extension, for example:

  - .bztimer or .session.json

- Use Expo’s Sharing API (expo-sharing or similar) to open the OS-level share sheet and allow the user to send this file via:

  - Email
  - Messaging apps
  - AirDrop
  - Cloud drives, etc.

Ensure:

- The exported JSON includes all fields required to reconstruct the session on another device.
- IDs inside the JSON can be reused or replaced; on import we will assign a new local id if necessary.

  7.2 Import (Client)

Provide an “Import Session” entry point in the app (for example, in a menu or on the Home screen).

Behavior:

- When user selects “Import Session”:

  - Open a document picker (via expo-document-picker).
  - Let user choose a compatible session file (e.g., .bztimer or .session.json).

- Read and parse the JSON contained in the file.
- Validate that the JSON matches the expected SessionTemplate shape:

  - Must have a name and items array.
  - Each item must have valid mode and timing fields.

- If valid:

  - Show a confirmation dialog summarizing:

    - Session name
    - Number of blocks
    - Total duration

  - On confirmation:

    - Assign a new id for the SessionTemplate (to avoid collisions).
    - Save it into local Sessions list.

- If invalid:

  - Show a user-friendly error (e.g., “Could not import session. The file format is not recognized.”)

Notes:

- No backend is involved; all sharing relies on moving small files between devices and local import.
- It is acceptable if, for v1, the user must manually pick the file via the document picker. Auto “open with app” associations can be considered later.

Optional (if time allows):

- Add “Copy as text” / “Import from text”:

  - Export: show a text blob (e.g., JSON string) for copying to clipboard.
  - Import: screen where user can paste the text, then parse and import the session.

---

8. Settings Screen

Provide a simple Settings screen accessible (e.g., from Home via gear icon) with:

- Pre-countdown length:

  - Options: 0, 3, 5 seconds

- Warning time before block end:

  - Default 10 seconds

- Enable sounds:

  - Toggle on/off

- Enable vibration:

  - Toggle on/off

- Keep screen awake during session:

  - Toggle on/off (use expo-keep-awake when enabled)

Persist settings via the storage layer.

---

9. State Management

Use Zustand (or similar) for global state.

Global store should handle:

- BlockTemplates array
- SessionTemplates array
- Settings object
- Current running session state:

  - currentSessionId / session reference
  - currentIndex
  - remainingSeconds
  - isRunning
  - elapsedSecondsInSession
  - any additional flags needed

Store must integrate with the storage layer for persistence:

- On app start, load BlockTemplates, SessionTemplates, and Settings into store.
- After any modification, save updated data via the storage service.

---

10. Non-Functional Requirements

- Must run on both Android and iOS via Expo.
- Must be fully functional offline once installed.
- UX must be clear and simple; the primary user flows:

  - Create activities (BlockTemplates)
  - Build session from activities
  - Run session with cues
  - Share session via file export/import

- Performance: The expected number of blocks/sessions is small; no special optimization beyond normal best practices is required.
- Accessibility:

  - Text should be legible.
  - Buttons tappable with reasonable size.
  - Consider appropriate contrast and simple layout.

---

11. Suggested Implementation Milestones (Optional for Cursor)

Milestone 1 – Data & Builder:

- Implement data models in store (BlockTemplates, SessionTemplates, Settings).
- Implement storage layer with AsyncStorage.
- Build Block Library screen (create/edit/delete).
- Build Session Builder screen (add blocks from library, custom block, reorder, save).

Milestone 2 – Run Session (foreground):

- Implement Run Session screen with:

  - Pre-countdown
  - Per-block countdown
  - Play/pause/next/previous
  - In-app audio/haptic cues

- Integrate settings for countdown and cues.

Milestone 3 – Notifications & Sharing:

- Implement local notifications scheduling and rescheduling on pause/skip using expo-notifications.
- Implement Settings screen UI and persistence.
- Implement file-based export/import for SessionTemplates using expo-sharing and expo-document-picker.
