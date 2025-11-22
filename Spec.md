# ✅ **TIMER APP – FULL PRODUCT & TECH SPEC (FOR EXPO REACT NATIVE) — COMPLETE UPDATED VERSION**

_(Fully integrated — no missing fields, no TODOs, no dangling references.)_

---

# **Goal**

Build a cross-platform (Android + iOS) React Native app using Expo that lets users:

- Create reusable “activity” blocks (exercises, rests, transitions, study blocks, etc.).
- Assemble these into ordered “sessions” (playlists).
- Run sessions as timers with audio/vibration cues and background-safe notifications.
- Track a personal session history (for streaks, weekly stats, quick start, etc.).
- Share individual sessions via export/import so a trainer can send a workout to a client.
- Stay fully offline: **no backend**, no authentication, no external API.

---

# **1. Tech Stack & Libraries**

Use Expo-managed workflow.

### Core stack:

- **React Native with Expo**
- **React Navigation** (bottom tabs + stack navigators)
- **Zustand** or similarly lightweight global state library
- **AsyncStorage** (via `@react-native-async-storage/async-storage`) for all persistence
- **expo-notifications** for all local notification scheduling
- **expo-av** for audio cues
- **expo-haptics** for vibration cues
- **expo-keep-awake** to prevent screen sleep during running sessions (optional toggle)
- **expo-document-picker** for import
- **expo-sharing** for export

App must function fully offline.

---

# **2. Core Concepts & Data Model (Conceptual)**

All data is stored locally. No backend.

---

## **2.a) BlockTemplate (reusable “activity”)**

A reusable activity like an exercise, rest block, or study timer segment.

**Fields:**

- `id: string`
- `label: string`
- `type: "activity" | "rest" | "transition"`
- `mode: "duration" | "reps"`

If `mode = "duration"`:

- `durationSeconds: number`

If `mode = "reps"`:

- `reps: number`
- `perRepSeconds: number`

Optional UI metadata:

- `color?: string`
- `icon?: string`
- `notes?: string`

---

## **2.b) BlockInstance (block inside a specific session)**

A snapshot (with optional overrides) of a BlockTemplate used inside a session.

**Fields:**

- `id: string`
- `templateId?: string | null`
- `label: string`
- `type: "activity" | "rest" | "transition"`
- `mode: "duration" | "reps"`
- `durationSeconds: number`
- `reps: number`
- `perRepSeconds: number`

---

## **2.c) SessionTemplate (playlist/session)**

Represents a full session the user can run.

**Fields:**

- `id: string`
- `name: string`
- `items: BlockInstance[]`
- `tags?: string[]`

### **🔥 New Field — for Quick Start scheduling**

- `scheduledDaysOfWeek?: number[]`

  - ISO weekday indices: **1=Monday … 7=Sunday**
  - Allows a session to appear as “today’s session” on the Home screen.
  - Not enforced — user can start any session anytime.

---

## **2.d) Settings**

A simple global settings object stored locally.

**Fields:**

- `preCountdownSeconds: number` (0, 3, or 5; default: 3)
- `warningSecondsBeforeEnd: number` (default: 10)
- `enableSounds: boolean` (default: true)
- `enableVibration: boolean` (default: true)
- `keepScreenAwakeDuringSession: boolean` (default: true)

### **🔥 New Field — History Retention**

- `historyRetention: "unlimited" | "3months" | "6months" | "12months"`

  - Default: `"unlimited"`
  - Enforced immediately when changed, and after each new history entry.

---

## **2.e) SessionHistoryEntry**

Used for streaks, weekly stats, Quick Start fallback, and recent activity.

**Fields:**

- `id: string`
- `sessionId: string | null`
  (null if the session was later deleted)
- `sessionName: string`
  (snapshot at time of completion)
- `completedAt: string`
  ISO timestamp **in UTC**
- `totalDurationSeconds: number`

**When created:**
At exact moment final block ends — _not when user taps “Done”_.

**Not created if:**
User manually cancels the run early.

---

# **3. Storage & Persistence (AsyncStorage)**

All data is local.

Store arrays/objects in AsyncStorage via a small storage service:

- BlockTemplates → `loadBlockTemplates()` / `saveBlockTemplates()`
- SessionTemplates → `loadSessionTemplates()` / `saveSessionTemplates()`
- Settings → `loadSettings()` / `saveSettings()`
- SessionHistory → `loadSessionHistory()` / `saveSessionHistory()`

**Retention Enforcement**

When:

- user changes `historyRetention`, OR
- new history entry is added

Then:

- If `"unlimited"` → do nothing
- Otherwise → compute cutoff date and remove older entries
- Clearing old history naturally resets streaks, weekly stats, Quick Start fallback options, etc.

Also add manual controls:

- “Delete all history”
- Optional: “Delete history older than 6 months”

---

# **4. Screens & Flows**

---

## **4.1 Sessions Tab (List of sessions)**

This is the “Sessions” tab, separate from Home.

Displays all SessionTemplates with:

- name
- total duration
- number of blocks

Actions:

- tap → Run Session (or details screen)
- edit
- duplicate
- delete
- “+ New Session”
- “Import Session”

---

## **4.2 Block Library Tab (“Activities”)**

List + create + edit + delete BlockTemplates.

---

## **4.3 Session Builder Screen**

Editable list of blocks using a draggable list.
Add from library or create custom.
Shows total duration and block count.

---

## **4.4 Run Session Screen**

Handles:

- pre-countdown
- per-block countdown
- audio cues, haptics
- play/pause
- prev/next block
- “skip”
- completion modal

### **History creation**

When the final block ends:

- Immediately store a SessionHistoryEntry.
- Then apply history retention.

---

# **5. Notifications & Background Behavior**

Use expo-notifications.

During a run, schedule:

- next-block notifications
- “almost done” warnings
- block-end notifications

On pause or skip:

- cancel & recalc schedule

Must work in background and screen lock.

---

# **6. Audio & Haptics**

- “Almost done” cue
- “Block complete” cue
- “Session complete” cue
- All gated by Settings toggles

---

# **7. Session Sharing (Export & Import)**

### Export

- Serialize SessionTemplate into JSON
- Save as `.bztimer` (or `.json`)
- Use Expo Sharing to export

### Import

- Document picker → parse → validate → confirm → assign new id → save

---

# **8. Settings Screen**

Includes toggles + history retention UI:

- Retention choices
- Delete all history
- Optional manual prune button

---

# **9. State Management**

Zustand global store containing:

- blockTemplates
- sessionTemplates
- settings
- sessionHistory
- runningSession state (currentIndex, remainingSeconds, etc.)

Load all data at startup.

Save on modification.

---

# **10. Non-Functional Requirements**

- Offline-first
- Android + iOS
- Simple and clear UX
- Accessible
- Performant with small datasets

---

# **11. Home Screen (Dashboard) SPEC**

The Home screen is **read-only** + shortcuts.

Contains four cards:

1. **Quick Start**
2. **Streaks**
3. **This Week**
4. **Recent Activity**

---

## **11.1 Data Requirements**

Home uses:

- `SessionTemplates`
- `sessionHistory`
- **scheduledDaysOfWeek** from each session
- local current date/time

---

## **11.2 Card 1 — Quick Start**

### **Purpose**

Provide a one-tap jump straight into the most relevant session for today.

### **Logic**

1. Determine today’s weekday (ISO: 1=Mon … 7=Sun)
2. Gather all sessions where `scheduledDaysOfWeek` includes today

### Scenario A — Exactly one scheduled session

Use that session always (even if already completed today).

### Scenario B — Multiple scheduled sessions

1. Check today’s history entries
2. Remove scheduled sessions already completed
3. If ≥1 uncompleted → choose deterministically (alphabetical or by creation date)
4. If all completed → choose deterministic fallback among scheduled ones

### Scenario C — No scheduled sessions

Use most recently completed session (only if its SessionTemplate still exists).

### If nothing applies

Show a placeholder:

> “No quick-start session available. Create and schedule a session to enable Quick Start.”

### UI

- Large button: **“Quick start: {SessionName}”**
- Subtext:

  - “Today’s scheduled session”
  - or “Last used session”

Tap → Immediately:

- Switch to Sessions tab
- Navigate to RunSessionScreen
- Begin pre-countdown

---

## **11.3 Card 2 — Streaks**

### Definitions

- **Session day** = any date with ≥1 completed session
- **Current streak** = consecutive days **including today** with at least one session

  - If no session today → streak = 0

- **Longest streak** = largest consecutive chain across history

UI:

- “Current streak: X days”
- “Longest streak: Y days”

Empty state:

- “No sessions completed yet.”

---

## **11.4 Card 3 — This Week**

- Define week as **Monday–Sunday**
- Filter history entries into current week
- Count sessions + sum minutes

UI:

- “Sessions completed: X”
- “Total time: Y min”

---

## **11.5 Card 4 — Recent Activity**

Show last **3–5** entries from history:

Format:

- “Today · {SessionName} · {Minutes} min”
- “Yesterday · …”
- “Mar 5 · …”

Optional: rows non-interactive.

Empty state:

- “No recent activity yet.”

---

# **12. Empty State for Entire Home Screen**

If no sessions + no history:

- Quick Start → “Create a session”
- Streaks → placeholder
- This Week → zeros
- Recent Activity → placeholder

---

# **13. Visual / UX Notes**

- Vertical scrolling cards
- Rounded corners, padded cards
- Works with light/dark mode
- Make key numbers prominent

---

# **14. Suggested Implementation Milestones**

Milestone 1: Data + Builder
Milestone 2: Run Session
Milestone 3: Notifications + Sharing
Milestone 4: Home Dashboard & History
