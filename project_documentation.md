# Verification Project Documentation

## Overview
The Verification Project is a React Native mobile application developed using Expo, TypeScript, and NativeWind (TailwindCSS for React Native). It is designed for field agents performing Islamic finance verification inspections. The app supports dynamic theming with light and dark modes, offline capabilities, secure authentication, structured multi-step inspection workflows, assignment management, notification system, and user profile management. The app integrates various Expo modules for image handling, location services, secure storage, and local authentication to ensure a robust field agent experience.

## Architecture
- **Framework**: React Native with Expo SDK
- **Language**: TypeScript for type safety
- **State Management**: Zustand for global state management (auth, theme, notifications, inspection drafts)
- **Styling**: NativeWind for utility-first styling, with dynamic color themes
- **Navigation**: React Navigation with stack and tab navigators
- **Image Handling**: Expo Image Picker for camera/gallery access, Expo Image Manipulator for image processing
- **Authentication**: Expo Local Authentication and Expo Secure Store for secure login and data storage
- **Location Services**: Expo Location for GPS functionality
- **Notifications**: Custom notification store with unread count
- **Offline Support**: Offline banner component to indicate connectivity status
- **Build and Deployment**: Expo for cross-platform builds (iOS, Android, Web)

## Dependencies
The app uses the following key dependencies from package.json:
- **@expo-google-fonts/inter**: For Inter font support
- **@expo/metro-runtime**: Metro bundler runtime
- **@expo/vector-icons**: Ionicons for UI icons
- **@react-navigation/bottom-tabs**: Bottom tab navigation
- **@react-navigation/native**: Core navigation
- **@react-navigation/native-stack**: Stack navigation
- **axios**: HTTP client for API requests
- **expo**: Core Expo SDK
- **expo-font**: Font loading
- **expo-image**: Image display and caching
- **expo-image-manipulator**: Image editing
- **expo-image-picker**: Camera and gallery access
- **expo-local-authentication**: Biometric/PIN authentication
- **expo-location**: GPS location services
- **expo-screen-capture**: Screen capture detection
- **expo-secure-store**: Secure key-value storage
- **expo-status-bar**: Status bar styling
- **expo-system-ui**: System UI integration
- **nativewind**: TailwindCSS for React Native
- **react**: React library
- **react-dom**: React DOM for web
- **react-native**: React Native framework
- **react-native-css-interop**: CSS interop for NativeWind
- **react-native-gesture-handler**: Gesture handling
- **react-native-reanimated**: Animations
- **react-native-safe-area-context**: Safe area handling
- **react-native-screens**: Screen optimization
- **react-native-svg**: SVG support
- **react-native-web**: Web platform support
- **react-native-worklets**: Worklet support for animations
- **tailwindcss**: TailwindCSS
- **zustand**: State management

Dev dependencies include Babel, TypeScript, PostCSS, etc.

## Key Features
- **Authentication**: Login with username/password, force password change on first login, biometric/PIN support
- **Assignment Management**: View active assignments, accept/reject assignments, detailed assignment views
- **Inspection Workflow**: Multi-step inspection form with client details, inspection details, findings, photos, review, and submission
- **Dynamic Theming**: Light and dark mode switching with persistent theme state
- **Notifications**: In-app notifications with unread count badge
- **History**: View completed inspections
- **Profile Management**: User profile, password change
- **Offline Mode**: Banner indicating offline status (though functionality is basic)
- **Image Capture and Management**: Camera/gallery picker, image manipulation, photo storage in inspections
- **Location Services**: GPS for inspection locations (if implemented)
- **Secure Storage**: Sensitive data stored securely
- **Animations**: Smooth transitions and animations using Reanimated

## Screens and Functionalities

### LoginScreen
**Description**: The initial screen for user authentication. Users enter their username and password to log in.

**Functionality**:
- Displays a login form with username and password inputs.
- Validates inputs and calls authentication API.
- On success, navigates to main tabs.
- On failure, shows error messages.
- Supports biometric/PIN authentication if enabled.
- Handles loading states during login.
- Redirects to force password change if it's the user's first login.

**Components Used**:
- Custom Input components for username and password.
- Button for login action.
- ActivityIndicator for loading.
- Error text display.

**Props**: None (default export component).

**State**:
- Local state for username, password, loading, error.
- Uses useAuthStore for authentication state.

**Methods**:
- handleLogin: Validates inputs, calls auth API, handles response.
- useEffect for biometric auth prompt.

**UI Elements**:
- Logo and branding.
- Form fields with placeholders.
- Login button.
- Error messages.
- Loading spinner.

**Navigation**: On success, navigates to MainTabs.

### AssignmentsScreen
**Description**: Displays a list of active assignments for the field agent.

**Functionality**:
- Fetches assignments from API or mock data.
- Displays assignments in a scrollable list.
- Each assignment shows title, description, status, date.
- Allows tapping to view details or accept/reject.
- Pull-to-refresh for updating list.
- Filters or searches if implemented (basic list).

**Components Used**:
- AssignmentCard: Displays individual assignment info.
- FlatList for scrolling.
- RefreshControl for pull-to-refresh.

**Props**: None.

**State**:
- assignments array from useAssignmentsStore or mock.
- refreshing state for pull-to-refresh.

**Methods**:
- fetchAssignments: Loads data.
- onRefresh: Handles refresh.
- onPressAssignment: Navigates to AssignmentDetail.

**UI Elements**:
- Header with title.
- List of cards.
- Empty state if no assignments.

**Navigation**: To AssignmentDetailScreen on tap.

### AssignmentDetailScreen
**Description**: Detailed view of a single assignment.

**Functionality**:
- Displays full assignment details: title, description, location, dates, requirements.
- Shows client info, inspection type.
- Buttons to accept/reject assignment.
- If accepted, enables navigation to inspection form.
- Displays status (pending, accepted, rejected).

**Components Used**:
- Text components for details.
- Button for actions.
- Map view if location is shown (not implemented).

**Props**: route params with assignment id.

**State**:
- assignment data from store or mock.

**Methods**:
- handleAccept: Calls API to accept, updates store.
- handleReject: Calls API to reject, updates store.

**UI Elements**:
- Header with back button.
- Detail sections.
- Action buttons.

**Navigation**: To AcceptRejectScreen or InspectionNavigator.

### AcceptRejectScreen
**Description**: Screen for accepting or rejecting an assignment with reason.

**Functionality**:
- Shows assignment summary.
- Radio buttons or picker for accept/reject.
- Text input for reason if rejecting.
- Submit button to confirm.

**Components Used**:
- RadioGroup or Picker.
- Input for reason.
- Button.

**Props**: route params.

**State**:
- selected action, reason.

**Methods**:
- handleSubmit: Calls API, navigates back.

**UI Elements**:
- Form with options and input.

### HistoryScreen
**Description**: Displays completed inspections history.

**Functionality**:
- Lists past assignments/inspections.
- Shows status, date, client.
- Tap to view details (similar to AssignmentDetail but read-only).

**Components Used**:
- FlatList with HistoryCard.

**Props**: None.

**State**:
- history array from store.

**Methods**:
- fetchHistory.

**UI Elements**:
- List view.

### NotificationsScreen
**Description**: Displays in-app notifications.

**Functionality**:
- Lists notifications with title, message, date.
- Marks as read on tap.
- Unread count in tab badge.

**Components Used**:
- FlatList with NotificationItem.

**Props**: None.

**State**:
- notifications from useNotificationStore.

**Methods**:
- markAsRead.

**UI Elements**:
- List with badges for unread.

### ProfileScreen
**Description**: User profile management.

**Functionality**:
- Displays user info: name, email, role.
- Options to change password, view settings.
- Theme toggle if not in settings.

**Components Used**:
- ProfileCard, Button.

**Props**: None.

**State**:
- user from authStore.

**Methods**:
- handleChangePassword: Navigates to ChangePasswordScreen.

**UI Elements**:
- Profile info, buttons.

**Navigation**: To ChangePasswordScreen.

### ChangePasswordScreen
**Description**: Allows users to change their password.

**Functionality**:
- Form with current password, new password, confirm.
- Validates passwords.
- Calls API to change.

**Components Used**:
- Input fields.
- Button.

**Props**: None.

**State**:
- form data, errors.

**Methods**:
- handleSubmit.

**UI Elements**:
- Form.

### ForcePasswordChangeScreen
**Description**: Forced password change on first login.

**Functionality**:
- Similar to ChangePassword but mandatory.
- No current password required.

**Components Used**:
- Similar to ChangePassword.

**Props**: None.

**State**:
- Similar.

**Methods**:
- Similar.

**UI Elements**:
- Form with message.

## Inspection Workflow Screens

The inspection is a multi-step process managed by InspectionNavigator.

### InspectionNavigator
**Description**: Navigator for the inspection steps, with progress indicator.

**Functionality**:
- Stack navigator for Step1 to Step4, Review, Success.
- Displays step progress bar.
- Handles navigation between steps.
- Saves drafts in store.

**Components Used**:
- StepIndicator for progress.
- Screens: Step1ClientDetails, etc.

**Props**: route params with requestId.

**State**:
- current step from store.

**Methods**:
- onNext, onBack: Navigation logic.

**UI Elements**:
- Progress bar, step screens.

### Step1ClientDetails
**Description**: Collects client details for the inspection.

**Functionality**:
- Displays assignment info.
- Input for total transactions to date.
- Saves to draft store.

**Components Used**:
- Input, Button.

**Props**:
- onNext: () => void
- onBack: () => void
- requestId: string

**State**:
- step1 data from store.

**Methods**:
- updateStep1: Saves input.

**UI Elements**:
- Title, subtitle, card with input, buttons.

### Step2InspectionDetails
**Description**: Collects inspection details.

**Functionality**:
- Inputs for inspection date, location, type.
- Saves to store.

**Components Used**:
- DatePicker, Input, Picker.

**Props**: Similar to Step1.

**State**: Similar.

**Methods**: Similar.

**UI Elements**: Similar.

### Step3Findings
**Description**: Records findings from inspection.

**Functionality**:
- List of findings with status (compliant, non-compliant).
- Add/edit findings.
- Saves array of findings.

**Components Used**:
- FindingItem, Button.

**Props**: Similar.

**State**:
- findings array.

**Methods**:
- addFinding, updateFinding.

**UI Elements**:
- List, add button, status colors.

### Step4Photos
**Description**: Captures photos for the inspection.

**Functionality**:
- Camera/gallery picker.
- Displays selected photos.
- Allows deletion.
- Saves photo URIs.

**Components Used**:
- ImagePicker, FlatList for photos.

**Props**: Similar.

**State**:
- photos array.

**Methods**:
- pickImage, removePhoto.

**UI Elements**:
- Photo grid, add button.

### ReviewScreen
**Description**: Review all entered data before submission.

**Functionality**:
- Displays summary of all steps.
- Edit buttons to go back to steps.
- Submit button to finalize.

**Components Used**:
- ReviewCard for each section.

**Props**:
- onNext: () => void
- onBack: () => void
- requestId: string

**State**:
- draft data.

**Methods**:
- handleSubmit: Calls API.

**UI Elements**:
- Cards with summaries, buttons.

### SuccessScreen
**Description**: Success confirmation after submission.

**Functionality**:
- Animated success icon and message.
- Shows reference number.
- Button to navigate back.

**Components Used**:
- Animated views, Text.

**Props**:
- reference: string
- navigation: any

**State**:
- Animation values.

**Methods**:
- useEffect for animations.

**UI Elements**:
- Animated checkmark, title, button.

## Components

### Button
**Description**: Custom button component.

**Props**:
- title: string
- onPress: () => void
- variant: 'primary' | 'secondary'
- disabled: boolean

**Functionality**:
- Renders TouchableOpacity with text.
- Handles press, disabled state.
- Styles based on variant and colors.

### Input
**Description**: Custom text input.

**Props**:
- value: string
- onChangeText: (text: string) => void
- placeholder: string
- secureTextEntry: boolean

**Functionality**:
- TextInput with styling.
- Error display.

### AppButton, AppInput (similar)

### ErrorBoundary
**Description**: Catches and displays errors.

**Functionality**:
- Wraps children, shows error UI on crash.

### ToastProvider
**Description**: Manages toast notifications.

**Functionality**:
- Context for showing toasts.

### OfflineBanner
**Description**: Shows offline status.

**Functionality**:
- Displays banner if offline.

## Constants

### colors.ts
**Description**: Defines color themes.

**Exports**:
- useColors: Hook returning colors based on theme.
- Colors: Legacy static dark colors.

**Colors Include**:
- bgScreen, bgCard, textPrimary, etc.
- Light and dark palettes.

## Hooks

### useScreenProtection
**Description**: Prevents screen capture.

**Functionality**:
- Uses Expo Screen Capture to disable screenshots.

## Navigation

### AppNavigator
**Description**: Root navigator.

**Functionality**:
- Handles auth state.
- Shows splash, login, or main tabs.
- Theme integration.

**Navigators**:
- RootStack: Login, MainTabs, etc.
- Tab: Assignments, History, Notifications, Profile.

## Stores (Zustand)

### useAuthStore
**State**:
- isAuthenticated: boolean
- user: User object
- isLoading: boolean

**Actions**:
- login, logout, initialize

### useThemeStore
**State**:
- themeMode: 'light' | 'dark'

**Actions**:
- toggleTheme

### useNotificationStore
**State**:
- notifications: array
- unreadCount: number

**Actions**:
- addNotification, markRead

### useInspectionStore
**State**:
- drafts: Record<string, Draft>

**Actions**:
- updateStep1, updateStep2, etc., saveDraft

## Other Files

### index.ts
**Description**: App entry point.

**Functionality**:
- Registers root component.

### global.css
**Description**: Global styles for NativeWind.

### metro.config.js
**Description**: Metro bundler config.

### tailwind.config.js
**Description**: Tailwind config.

### tsconfig.json
**Description**: TypeScript config.

### package.json
**Description**: Dependencies and scripts.

### Assets
- Fonts: Ionicons.ttf
- Icons: android-icon-*.png
- Favicon: favicon.png

### islamic-finance-web/
- Separate web app for Islamic finance, with Vite, React, etc.

## Conclusion
This documentation covers the entire functionality of the Verification Project in detail, including all screens, components, stores, and features. The app is designed for efficient field inspections with a focus on usability, security, and theming.
