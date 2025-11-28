# Cadence Studio - Find your rhythm. Shape your life. 
- React Native Expo

A cross-platform mobile timer application built with React Native and Expo. Create reusable activity blocks, assemble them into sessions, and run them with audio/vibration cues and background-safe notifications. Fully offline-capable with no backend dependencies.

## 📱 Features

### Core Functionality
- **Activity Library**: Create and manage reusable activity blocks with categories (Exercise, Study, Work, Household, Creative, and custom categories for Pro users)
- **Session Builder**: Assemble activities, rest periods, and transitions into ordered sessions with custom scheduling
  - **Autosave**: Changes to existing sessions are automatically saved with toast notifications
  - **Icon Controls**: Edit (pencil), Duplicate (copy), and Delete (close) icons for quick actions
- **Timer System**: Run sessions with pre-countdown, block countdown, and completion tracking
  - **Full-screen Mode**: Bottom navigation hidden during session run
  - **Back Button Handler**: Device back button stops session (same as Stop button)
  - **Safe Area Support**: Proper spacing to prevent overlap with system UI
- **Session History**: Track completed sessions with streaks, weekly stats, and recent activity
- **Quick Start**: Multiple buttons for all sessions scheduled on the same day (one button per session)
- **Search & Filter**: Search sessions by name and filter activities by category

### User Experience
- **Audio & Haptic Feedback**: Sound cues and vibration for block transitions and completion
- **Background Notifications**: Local notifications keep you informed even when the app is in the background
- **Session Sharing**: Export and import sessions via `.bztimer` files (Pro feature for export)
- **History Management**: Automatic retention policies (unlimited, 3/6/12 months) with manual controls
- **Dark Mode Support**: Full dark mode with system preference detection (Light, Dark, or System)
- **Pro Features**: 
  - Custom categories for activities (Free tier uses built-in categories only)
  - Unlimited sessions (Free: 5 max)
  - Unlimited activities (Free: 20 max)
  - Full history retention (Free: 30 days)
  - Session export capability
- **Toast Notifications**: Visual feedback for autosave actions
- **Safe Area Handling**: Proper spacing on all screens to prevent system UI overlap

### Data Management
- **Fully Offline**: All data stored locally using AsyncStorage
- **No Backend Required**: Complete offline functionality
- **Data Persistence**: Automatic saving of sessions, blocks, settings, and history
- **Import/Export**: Share sessions between devices via file export/import

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for development) OR
- Development build (for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd timer-app-react-native
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on your device**
   - **iOS**: Scan the QR code with Camera app (iOS 13+) or Expo Go app
   - **Android**: Scan the QR code with Expo Go app
   - **Web**: Press `w` in the terminal (limited functionality)

### Development Builds

For production builds or to use native modules not available in Expo Go:

```bash
# iOS
expo build:ios

# Android
expo build:android
```

## 📁 Project Structure

```
timer-app-react-native/
├── App.js                 # Root component with SafeAreaProvider
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── babel.config.js       # Babel configuration
│
├── src/
│   ├── components/       # Reusable components
│   │   ├── AddBlockModal.js      # Modal for adding activities from library
│   │   ├── AddRestTransitionModal.js  # Quick form for rest/transition blocks
│   │   ├── ProUpgradeModal.js    # Modal for Pro upgrade prompts
│   │   └── Toast.js               # Toast notification component
│   │
│   ├── navigation/       # Navigation configuration
│   │   └── AppNavigator.js
│   │
│   ├── screens/          # Screen components
│   │   ├── HomeScreen.js          # Dashboard with Quick Start, Streaks, Stats
│   │   ├── SessionsScreen.js      # Session list and management
│   │   ├── SessionBuilderScreen.js # Create/edit sessions
│   │   ├── SessionPreviewScreen.js # Preview before starting
│   │   ├── RunSessionScreen.js     # Main timer screen
│   │   ├── BlockLibraryScreen.js   # Activity block library
│   │   ├── BlockEditScreen.js      # Create/edit blocks
│   │   ├── SettingsScreen.js       # App settings
│   │   └── GoProScreen.js          # Pro upgrade screen
│   │
│   ├── services/         # Business logic services
│   │   ├── storage.js           # AsyncStorage abstraction
│   │   ├── audio.js              # Audio cue playback
│   │   ├── cues.js                # Audio + haptic feedback
│   │   ├── notifications.js       # Local notifications
│   │   └── sessionSharing.js      # Export/import sessions
│   │
│   ├── store/            # Zustand state management
│   │   └── index.js
│   │
│   ├── theme/            # Theme and styling
│   │   ├── themes.js    # Light and dark color palettes
│   │   └── index.js     # Theme configuration and useTheme hook
│   │
│   ├── types/            # Type definitions and utilities
│   │   └── index.js
│   │
│   └── utils/            # Utility functions
│       ├── id.js         # ID generation
│       └── history.js    # History calculations (streaks, weeks)
│
└── Spec.md              # Detailed product specification
```

## 🎨 Theme System

The app uses a centralized theme system for easy customization. All colors are defined in `src/theme/`:

```javascript
import { useTheme } from '../theme';

const colors = useTheme();
// Use in styles
backgroundColor: colors.primary
color: colors.text
```

The theme system supports:
- **Light and Dark modes** with system preference detection
- **Block type colors**: Activity (Royal Blue `#3A86FF`), Rest (Teal Green `#43AA8B`), Transition (Orange `#F3722C`)
- **Centralized color palette** in `src/theme/themes.js` for easy customization

To change the app's color scheme, update the values in `src/theme/themes.js`.

## 📊 Data Models

### BlockTemplate
Reusable activity block (only "activity" type):
- Label, category (built-in or custom for Pro users), mode (duration/reps)
- Timing configuration (duration or reps × seconds per rep)
- Optional notes
- **Note**: Rest and Transition blocks are created only within sessions, not saved to library

### SessionTemplate
Ordered collection of blocks with:
- Name, blocks array (activities, rest periods, transitions)
- Optional scheduled days of week (for Quick Start on Home screen)

### SessionHistoryEntry
Completed session record with:
- Session ID/name snapshot
- Completion timestamp (UTC)
- Total duration

### Settings
Global app configuration:
- Pre-countdown length (0/3/5 seconds)
- Warning time before block end
- Audio/vibration toggles
- Screen wake lock
- History retention policy
- Theme mode (Light, Dark, or System)
- Pro features toggle (for testing custom categories)
- Default "Save to Library" preference for custom activities
- Custom categories (Pro users only)

## 🔧 Key Technologies

- **React Native** - Mobile framework
- **Expo** - Development platform and tooling
- **React Navigation** - Navigation (Bottom Tabs + Stack)
- **Zustand** - Lightweight state management
- **AsyncStorage** - Local data persistence
- **expo-notifications** - Local notifications
- **expo-audio** - Audio playback (replaced expo-av)
- **expo-haptics** - Vibration feedback
- **expo-keep-awake** - Prevent screen sleep
- **expo-document-picker** - File import
- **expo-sharing** - File export

## 📱 Navigation Structure

```
Bottom Tab Navigator
├── Home (Dashboard)
│   ├── Quick Start
│   ├── Streaks
│   ├── This Week Stats
│   └── Recent Activity
│
├── Sessions (Stack)
│   ├── Sessions List
│   ├── Session Builder
│   ├── Session Preview
│   └── Run Session
│
├── Library (Stack)
│   ├── Block Library
│   └── Block Edit
│
└── Settings
```

## 🎯 Usage Guide

### Creating a Session

1. Navigate to **Sessions** tab
2. Tap **"+ New Session"**
3. Enter session name
4. Optionally select scheduled days for Quick Start (appears on Home screen)
5. Add blocks to your session:
   - **"+ Add Activity"**: Choose from library or create custom activity (option to save to library)
   - **"+ Add Rest"**: Quick form to add rest period (not saved to library)
   - **"+ Add Transition"**: Quick form to add transition (not saved to library)
6. Reorder blocks using up/down arrows
7. Edit, duplicate, or delete blocks using icon buttons
8. Tap **Save** (for new sessions) or changes auto-save (for existing sessions)

### Running a Session

1. From Sessions list, tap a session (or use Quick Start from Home)
2. Review session details in preview screen
3. Tap **"Start Session"**
4. Wait for pre-countdown (if enabled)
5. Timer runs automatically with audio/haptic cues
6. Use controls to pause, skip blocks, or stop
7. Session completes automatically when all blocks finish
8. **Note**: Bottom navigation is hidden during session run. Use device back button to stop session.

### Managing Activities

1. Navigate to **Library** tab
2. View all saved activities (filter by category or search by name)
3. Tap **"+ New Activity"** to create new activity
4. Select category (built-in or custom for Pro users)
5. Tap an activity to edit
6. Use delete button to remove activities
7. **Note**: Rest and Transition blocks are created only in sessions, not in the library

### Sharing Sessions

1. From Sessions list, tap the three dots (⋮) on a session
2. Select **"Share"** (Pro feature - Free users will see upgrade prompt)
3. Choose export method (save to device, share via app, etc.)
4. File is saved as `.bztimer` format
5. **Note**: Custom categories are preserved for Pro users; Free users will see custom categories mapped to "Uncategorized"

### Importing Sessions

1. Navigate to **Settings** tab
2. Tap **"Import Session"** (or use import in Sessions tab)
3. Select a `.bztimer` file
4. Session is imported and added to your library

## ⚙️ Settings

Accessible from the **Settings** tab:

- **Pre-countdown**: Set countdown length before session starts (0, 3, or 5 seconds)
- **Warning Time**: Seconds before block end to show warning
- **Audio & Haptic**: Toggle sound cues and vibration
- **Screen Wake**: Keep screen awake during sessions
- **Appearance**: Theme mode (Light, Dark, or System preference)
- **History Retention**: Auto-delete history older than 3/6/12 months (or unlimited)
- **Manage History**: Delete all history manually
- **Pro Features**: Toggle to enable custom categories (for testing)
- **Default Save to Library**: Toggle for "Save to Library" default in custom activity form
- **Manage Activities**: Delete all activities from library
- **Manage Sessions**: Delete all sessions

## 🔄 State Management

The app uses Zustand for global state management. Key state includes:

- `blockTemplates` - All saved activity blocks
- `sessionTemplates` - All saved sessions
- `sessionHistory` - Completed session records
- `settings` - App configuration
- Running session state (current block, timer, etc.)

All state is automatically persisted to AsyncStorage and loaded on app startup.

## 📝 Development

### Adding New Features

1. Follow the existing code structure
2. Use the theme system for colors (`src/theme/colors.js`)
3. Add new screens to `src/screens/`
4. Update navigation in `src/navigation/AppNavigator.js`
5. Add state management in `src/store/index.js` if needed
6. Update storage service in `src/services/storage.js` for new data types

### Code Style

- Use functional components with hooks
- Follow React Native best practices
- Use centralized theme colors
- Keep components focused and reusable
- Add comments for complex logic

### Testing

Currently manual testing. For development:
- Use Expo Go for quick iteration
- Test on both iOS and Android
- Verify offline functionality
- Test notification behavior in background

## 🐛 Known Limitations

- Expo Go has limitations with some native modules (e.g., react-native-reanimated)
- Drag-and-drop reordering replaced with up/down buttons for Expo Go compatibility
- Some file system operations use legacy Expo APIs

## 📄 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines if applicable]

## 📧 Support

[Add support contact information if applicable]

---

Built with ❤️ using React Native and Expo

