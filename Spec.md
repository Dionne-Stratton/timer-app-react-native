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
- **expo-audio** for audio cues (replaced expo-av)
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

### **BlockTemplate (Reusable Activity)**

Represents a reusable activity in the user’s Library.
_Rest_ and _Transition_ are no longer templates and are created only inside sessions.

Each BlockTemplate has:

- `id: string`
- `label: string`
- `type: "activity"`
- `mode: "duration" | "reps"`
- Timing fields:

  - If `duration`:

    - `durationSeconds: number`

  - If `reps`:

    - `reps: number`
    - `perRepSeconds: number`

- **category: string | null**

  - One of the built-in categories OR a custom user-created category (Pro)

- Optional metadata:

  - `color: string`
  - `icon: string`
  - `notes: string`

---

# 🎨 **BUILT-IN ACTIVITY CATEGORIES (FREE TIER)**

These categories are always available to every user:

1. `"Exercise"`
2. `"Study"`
3. `"Work"`
4. `"Household"`
5. `"Creative"`
6. `"Uncategorized"`

These appear as the standard selectable chips in the Activity Editor.

---

# 🌟 **CUSTOM CATEGORIES (PRO FEATURE)**

Free users:

- Cannot create custom categories.
- Can only choose from the built-in category list.
- When importing a session containing a custom category:

  - The imported block’s category is mapped to `"Uncategorized"`.

Pro users:

- May create **unlimited custom categories**.
- Custom categories are stored in Settings:

  ```
  customCategories: string[]
  ```

- Custom categories appear **below a divider** in the category picker.
- Can rename or delete custom categories.

  - Deleting a custom category prompts to reassign affected activities.

Pro import behavior:

- If an imported block has a category not recognized:

  - Automatically add it to `customCategories`.

---

# 📚 **UPDATED LIBRARY BEHAVIOR**

The Library contains **Activities only**, not rest/transition.

Library screen shows:

- Label
- Category
- Timing summary
- Search + category filter

“Add Activity” opens Activity Editor.

---

# 📝 **UPDATED ACTIVITY EDITOR (CATEGORIES INTEGRATED)**

Fields:

- Label
- Category picker:

  - Built-ins always available
  - Custom categories displayed beneath a divider (Pro)
  - “+ Add Category” button (Pro only)

- Mode: duration or reps
- Timing inputs
- Notes (optional)

If not Pro:

- “+ Add Category” button shows lock state and cannot be tapped.

---

# 🔁 **UPDATED SESSION BUILDER (REST & TRANSITION CHANGES)**

When adding a block:

### 1. Add Activity

- Opens Library modal to select from Activity templates.

### 2. Add Rest

- Opens quick form for duration only.
- Creates BlockInstance with:

  - `type: "rest"`
  - `category: null`

### 3. Add Transition

- Same flow, but:

  - `type: "transition"`

Rest and transition are **not saved to Library**.

---

# 📤 **UPDATED EXPORT/IMPORT LOGIC**

### Export

- Each BlockInstance exports its `category` string unchanged.

### Import (Free)

- If category is built-in → keep it.
- If category is custom → map to `"Uncategorized"`.

### Import (Pro)

- If category is built-in → keep it.
- If category is not known → auto-add to `customCategories`.

---

# ⚙️ **UPDATED SETTINGS DATA MODEL**

Add:

```
customCategories: string[]     // Pro only
isProUser: boolean             // monetization to be added later
```

Free users have `customCategories = []`.

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

Editable list of blocks with up/down arrows for reordering.
Add from library or create custom.
Shows total duration and block count.

**Features:**

- **Autosave**: Changes to existing sessions are automatically saved with toast notifications
- **Icon Controls**: Edit (pencil), Duplicate (copy), and Delete (close) icons for quick actions
- **Floating Add Buttons**: Add Activity, Add Rest, and Add Transition buttons float at bottom with proper scroll padding

---

## **4.4 Run Session Screen**

Handles:

- pre-countdown
- per-block countdown
- audio cues, haptics
- play/pause
- prev/next block
- "skip"
- completion modal
- **Full-screen mode**: Bottom navigation hidden during session run
- **Back button handler**: Device back button stops session (same as Stop button)
- **Safe area support**: Proper spacing to prevent overlap with system UI

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

### Scenario A — One or more scheduled sessions

- If exactly one scheduled session: Show one button for that session
- If multiple scheduled sessions: Show a separate button for each scheduled session (sorted alphabetically)
- Always show scheduled sessions, even if already completed today

### Scenario B — No scheduled sessions

Use most recently completed session (only if its SessionTemplate still exists).

### If nothing applies

Show a placeholder:

> “No quick-start session available. Create and schedule a session to enable Quick Start.”

### UI

- One or more buttons: **"Quick start: {SessionName}"** (one button per scheduled session)
- Subtext:

  - "Today's scheduled session" (or "Today's scheduled sessions" if multiple)
  - or "Last used session" (when no scheduled sessions)

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

# **12. Pricing & Plans (Free vs Pro)**

## **12.1 Overview**

The app uses a two-tier model:

- **Free Tier**
- **Pro Tier** (unlocks all advanced functionality)

Users may upgrade via in-app purchases through the App Store / Play Store.
Pro may be purchased as a monthly subscription, yearly subscription, or lifetime one-time unlock.

## **12.2 Free Tier — Features & Limits**

The Free tier provides a fully functional timer app with reasonable limits designed for casual users.

Free Tier Includes

✔ Create sessions and run them normally
✔ Create/save activities (up to limit)
✔ Access all built-in categories
✔ Rest & Transition blocks (unlimited)
✔ Session history (last 30 days)
✔ Home dashboard (Quick Start, Streaks, Weekly Stats, Activity Feed)
✔ Import sessions shared by Pro users
✔ Background notifications
✔ All timing features (countdown, warning, sounds, vibration)

Free Tier Limits

To keep free usage generous but encourage upgrades:

Sessions Limit

Maximum: 5 saved sessions

If user tries to create a 6th session:
→ Show Pro upsell modal
→ Explain: “Free plan allows up to 5 sessions.”

Activity Library Limit

Maximum: 20 saved activities

Rest and transitions do not count toward this number.

If the user attempts to add the 21st activity, show Pro upsell.

Categories

Only built-in categories available:

Exercise

Study

Work

Household

Creative

Uncategorized

Custom categories are locked.

History Retention

Only keeps last 30 days of session history

Streaks and stats calculated only from this window

## **12.3 Pro Tier — Features**

Pro unlocks advanced capability intended for trainers, tutors, therapists, coaches, and power users.

Pro Unlocks
Unlimited Sessions

No limit on how many sessions a user may create/store.

Unlimited Activities

No limit on saved activities in the Library.

Custom Categories

Create unlimited new categories

Rename/delete categories

Used in Activity Editor and filters

Imported sessions with custom categories auto-add them into the user’s category list

Full History

Unlimited session history retention

Streaks and stats reflect full usage

Option to export history in future versions (not required now)

Export Sessions

Pro users may export/share sessions via:

JSON file

Device share sheet

AirDrop

Messaging apps

Email, etc.

Import remains free so clients/students can receive.

Priority Features (for future expansion)

Reserved for Pro tier (not required for v1, but structurally defined):

Cloud backup & sync

Analytics / performance stats

Client/Student mode

Templates gallery

Notes per block

Multi-device sync

These do not need implementation now — this section simply future-proofs Pro.

## **12.4 Pro Pricing**

Subscription Options

$0.99 / month

$9.99 / year
(approx. 17% discount vs monthly; recommended default)

Lifetime Unlock

$14.99 one-time purchase

Includes all current and future Pro features permanently

Users may upgrade from:

Monthly → Yearly

Yearly → Lifetime
Store rules manage pro-rated pricing.

## **12.5 Upgrade Advertising (UI Requirements)**

In-app Upgrade Screen

Provide a dedicated “Go Pro” screen accessible via:

Settings

When hitting limits (sessions, activities)

When attempting to create custom categories

This screen should include:

Title: “Timer Pro”

Features list (bulleted)

Comparison table (Free vs Pro)

Prices (Monthly, Yearly, Lifetime)

One button per purchase option

Subtle Labels

On the Sessions screen:

“Free plan: Up to 5 sessions.”

On the Activities screen:

“Free plan: Up to 20 activities.”

These are unobtrusive text (small, gray), to avoid surprise limits.

## **12.6 Import/Export Behavior Under Pricing System**

Import

Remains free for all users.

Free users: custom categories imported are mapped to "Uncategorized"

Pro users: custom categories auto-added to their list

Export

Locked behind Pro.

If a free user tries to export:
→ Show Pro upsell modal.

## **12.7 Data Model Additions**

Extend Settings:
isProUser: boolean // updated by purchase/restore logic
customCategories: string[] // only editable in Pro

No other core data models require changes for monetization.

## **12.8 Handling Exceeding Limits**

Sessions Limit (5)

When a free user tries to create the 6th session:

Block creation

Show Pro upgrade modal

Activity Limit (20)

When a free user tries to save the 21st Activity:

Block creation

Show Pro upgrade modal

Custom Category Creation

When a free user taps “Add Category”:

Show Pro upgrade modal instead of opening creation screen

## **12.9 Restore Purchases**

Provide a “Restore Purchases” button in Settings for:

iOS users (required by Apple)

Android users (optional but recommended)

## **12.10 Offline Behavior**

Purchases should be cached locally via persistent storage so Pro features remain available offline once unlocked.

---

# **13. Downgrade Behavior (When Pro Expires or Subscription is Canceled)**

This section defines what happens when a user who previously had Pro features (via subscription, yearly plan, or lifetime) loses access to Pro.

The downgrade model MUST:

- **Never delete existing data**
- **Never break user flows for viewing or running sessions**
- **Only restrict creation or editing of items beyond Free limits**
- **Maintain trust and transparency**

This behavior matches the standard used by major productivity apps (Notion, Todoist, TickTick).

---

## **13.1 General Principles**

1. **Users never lose data because of a downgrade.**
   All sessions, activities, categories, and history remain intact.

2. **Users may always RUN any session**, even if it exceeds Free limits.

3. **Users may VIEW all existing activities and sessions**, regardless of count.

4. **Only creation or editing actions beyond the Free tier limits are blocked.**

5. **Custom categories remain visible**, but cannot be edited or used for new items unless the user upgrades again.

6. **Upsell prompts appear only when users attempt actions that require Pro.**

---

## **13.2 Behavior When User Has More Items Than Free Limits Allow**

If the user downgrades and currently has:

- More than **5 sessions**
- More than **20 activities**
- One or more **custom categories**
- History older than 30 days

The app behaves as follows:

---

## **13.2.1 Sessions Over Limit**

Free limit: **5 sessions**

If user has more than 5 sessions:

- ✔ User can **view** all sessions
- ✔ User can **run** all sessions
- ✔ User can **delete** sessions
- ❌ User **cannot create new sessions**
- ❌ User **cannot duplicate sessions**

Attempting to create a new session triggers:

**Modal:**

> “You’ve reached the session limit for the free plan (5).
> Upgrade to Pro for unlimited sessions.”

A small banner appears at top of Sessions screen:

> “Free plan: You can run your existing sessions but can create up to 5.”

---

## **13.2.2 Activities Over Limit**

Free limit: **20 activities**

If user has more than 20 saved activities:

- ✔ User can **view** all activities
- ✔ User can **use** existing activities in sessions
- ✔ User can **delete** activities
- ❌ User **cannot create new activities**
- ❌ User **cannot duplicate existing activities**

Attempting to add a new Activity triggers:

**Modal:**

> “Free plan allows up to 20 saved activities.
> Upgrade to Pro for unlimited activity creation.”

A small banner appears on Activity Library:

> “Free plan: Up to 20 saved activities.”

---

## **13.2.3 Custom Categories After Downgrade**

Free users have **0 custom categories**.

When downgrading:

- ✔ Existing custom categories remain **visible**
- ✔ Activities keep their custom category labels
- ❌ User cannot create new custom categories
- ❌ User cannot rename or delete custom categories
- ❌ User cannot assign a custom category to new activities

In the Activity Editor:

- The custom categories appear **with a lock icon**
- Selecting them triggers the Pro upgrade modal

**Modal:**

> “Custom categories are a Pro feature.”

---

## **13.2.4 History After Downgrade**

Free tier retains **30 days** of history.

When downgrading:

- ✔ Existing older history remains viewable until retention enforcement triggers
- ❌ New history beyond 30 days should auto-prune based on setting

Retention enforcement should occur:

- When adding a new history entry
- When user modifies history retention setting
- When app loads (optional)

---

## **13.3 Editing Restrictions After Downgrade**

### **Sessions that use custom categories**

Users may run those sessions normally.

Editing the session is allowed except:

- Editing an Activity inside the session that uses a custom category
- Adding new blocks that exceed activity/session limits

If an edit action touches a Pro feature, show the upgrade modal.

---

### **Activities that use custom categories**

User may view and use them in sessions.

But:

- Editing the Activity’s name, mode, category, or timing opens Pro modal
- Deleting is still allowed

---

## **13.4 Import/Export After Downgrade**

### **Import**

Remains **free**.
Imported custom categories map to:

- `"Uncategorized"` for Free users
- Auto-add to `customCategories` for Pro users (even if previously downgraded)

### **Export**

Locked behind Pro.
Attempting to export opens Pro modal.

---

## **13.5 UI Indicators for Over-Limit Settings**

When user is Free and over the limits:

### Sessions screen:

Small gray text:

> “Free plan: Up to 5 saved sessions.”

### Activities screen:

> “Free plan: Up to 20 saved activities.”

### Category picker:

Custom categories shown with lock icons:

```
Grammar Review 🔒
Client – Sarah 🔒
PT – Knee Mobility 🔒
```

---

## **13.6 State Model Changes**

No model changes needed beyond:

```
isProUser: boolean
```

But the UI must respond to `isProUser` toggling _at runtime_.

---

## **13.7 Summary of Downgrade Rules**

**Users never lose data.**

Free users may:

- View/run everything
- Delete anything
- Import sessions
- Interact with older custom categories (as read-only)

Free users may NOT:

- Create > 5 sessions
- Create > 20 activities
- Create/edit custom categories
- Export sessions
- Use custom categories when creating/editing activities
- Keep unlimited history

This ensures:

- No data loss
- No surprise punishments
- Very clear Pro value
- Maximum long-term goodwill

---

# **14. Empty State for Entire Home Screen**

If no sessions + no history:

- Quick Start → "Create a session"
- Streaks → placeholder
- This Week → zeros
- Recent Activity → placeholder

---

# **15. Visual / UX Notes**

- Vertical scrolling cards
- Rounded corners, padded cards
- Works with light/dark mode
- Make key numbers prominent
- Icon buttons for Edit, Duplicate, Delete in Session Builder
- Toast notifications for autosave feedback
- Safe area handling for all screens
- Bottom tab bar hidden during RunSession screen

---

# **16. Suggested Implementation Milestones**

Milestone 1: Data + Builder
Milestone 2: Run Session
Milestone 3: Notifications + Sharing
Milestone 4: Home Dashboard & History
Milestone 5: Pro/Free Tier System
