# Audio Input Device Detection and Selection

This document outlines the implementation plan for adding audio input device detection and selection capabilities to the expo-audio-studio module.

## Overview

The feature allows users to:
1. List all available audio input devices on their device
2. View detailed device capabilities (sample rates, channels, etc.)
3. Select a specific device for recording
4. Fall back gracefully when devices become unavailable

## Implementation Status

### Completed
- ✅ Cross-platform AudioDeviceManager class with singleton pattern
- ✅ React hook (useAudioDevices) for component integration
- ✅ AudioDeviceSelector UI component with device list and capabilities display
- ✅ **iOS: Device detection, selection, and fallback fully implemented and tested (Bluetooth HFP & Internal Mic)**
- ✅ Web implementation with MediaDevices API
- ✅ **Web: Device disconnection handling and fallback behavior tested.**
- ✅ User interface for device testing (AudioDeviceTest) with both web and native support
- ✅ Device selection integration with recording functionality
- ✅ Cross-platform audio device capabilities display
- ✅ Testing cross-browser compatibility for web implementation

### In Progress
- 🟡 Android implementation of device detection, selection, and fallback

### Needs Further Testing / Verification
- ⚠️ iOS: Verify functionality with additional device types (Bluetooth A2DP, wired headsets, USB mics).
- ⚠️ Web: Verify broader browser compatibility for disconnection/fallback.

## Architecture Principles

We have applied these architectural principles to our implementation:

1. **Separation of Concerns**: Device detection and management in a dedicated class
2. **Single Responsibility**: Each class has a single responsibility
3. **Minimum Modification**: Made minimal changes to existing files
4. **Consistent API**: Maintained consistent API across platforms
5. **Error Handling**: Provided clear error messages and recovery options
6. **Platform Abstraction**: Abstracted platform-specific implementations behind common interfaces

## API Design

### TypeScript Interface

```typescript
interface AudioDeviceCapabilities {
  sampleRates: number[];          // Supported sample rates
  channelCounts: number[];        // Supported channel counts
  bitDepths: number[];            // Supported bit depths
  hasEchoCancellation?: boolean;  // Echo cancellation support
  hasNoiseSuppression?: boolean;  // Noise suppression support
  hasAutomaticGainControl?: boolean; // AGC support
}

interface AudioDevice {
  id: string;                     // Unique device identifier 
  name: string;                   // Human-readable device name
  type: string;                   // Device type (builtin_mic, bluetooth, usb, wired, etc.)
  isDefault: boolean;             // Whether this is the system default device
  capabilities: AudioDeviceCapabilities;
  isAvailable: boolean;           // Whether device is currently available
}

// Defines how recording should behave when a device becomes unavailable
const DeviceDisconnectionBehavior = {
  PAUSE: 'pause',                // Pause recording when device disconnects
  FALLBACK: 'fallback'           // Switch to default device and continue recording
} as const;

// Type for DeviceDisconnectionBehavior values
type DeviceDisconnectionBehaviorType = typeof DeviceDisconnectionBehavior[keyof typeof DeviceDisconnectionBehavior];

// Module functions
function getAvailableInputDevices(options?: { refresh?: boolean }): Promise<AudioDevice[]>;
function getCurrentInputDevice(): Promise<AudioDevice | null>;
function selectInputDevice(deviceId: string): Promise<boolean>;
function resetToDefaultDevice(): Promise<boolean>;
// Primary method for refreshing device detection - includes debouncing and listener notifications
function refreshDevices(): Promise<AudioDevice[]>;

// Extended RecordingConfig
interface RecordingConfig {
  // ... existing properties
  deviceId?: string;              // ID of selected device (default if not specified)
  deviceDisconnectionBehavior?: DeviceDisconnectionBehaviorType; // How to handle device disconnection (default: PAUSE)
}

// Web-specific methods
private async getWebAudioDevices(): Promise<AudioDevice[]>;
private async checkMicrophonePermission(): Promise<PermissionState>;
private setupWebDeviceChangeListener(): void;
private isSafariOrIOS(): boolean;
private enhanceDevicesForSafari(devices: AudioDevice[]): AudioDevice[];
private mapWebDeviceToAudioDevice(device: MediaDeviceInfo): AudioDevice;
private inferDeviceType(deviceName: string): string;
```

### React Hook API (Implemented)

```typescript
function useAudioDevices() {
  // Returns audio device management state and functions
  return {
    devices,             // Array of available devices
    currentDevice,       // Currently selected device
    loading,             // Loading state
    error,               // Error state
    selectDevice,        // Function to select a device
    resetToDefaultDevice, // Function to reset to default device
    refreshDevices,      // Function to refresh the device list
  };
}
```

### AudioDeviceSelector Component (Implemented)

```typescript
interface AudioDeviceSelectorProps {
  value?: string;                        // Current selected device ID
  onDeviceSelected?: (device: AudioDevice) => void; // Called when selection changes
  disabled?: boolean;                    // Whether the selector is disabled
  showRefreshButton?: boolean;           // Whether to show the refresh button
  label?: string;                        // Custom label
  showCapabilities?: boolean;            // Whether to show device capabilities
  testID?: string;                       // Test ID for the component
}

function AudioDeviceSelector(props: AudioDeviceSelectorProps) {
  // Renders a UI component for selecting audio devices
}
```

## Implementation Architecture

### AudioDeviceManager Class (Implemented)

We've created a dedicated class to handle device detection and management:

```typescript
class AudioDeviceManager {
  // Properties
  private eventEmitter: EventEmitter;
  private currentDeviceId: string | null;
  private availableDevices: AudioDevice[];
  private deviceChangeListeners: Set<(devices: AudioDevice[]) => void>;
  private permissionState: PermissionState; // Added for web

  // Methods
  async getAvailableDevices(options?: { refresh?: boolean }): Promise<AudioDevice[]>;
  async getCurrentDevice(): Promise<AudioDevice | null>;
  async selectDevice(deviceId: string): Promise<boolean>;
  async resetToDefaultDevice(): Promise<boolean>;
  // Primary method for refreshing - includes debouncing and listener notifications
  async refreshDevices(): Promise<AudioDevice[]>;
  addDeviceChangeListener(listener: (devices: AudioDevice[]) => void): () => void;
  
  // Web-specific methods
  private async getWebAudioDevices(): Promise<AudioDevice[]>;
  private async checkMicrophonePermission(): Promise<PermissionState>;
  private setupWebDeviceChangeListener(): void;
  private isSafariOrIOS(): boolean;
  private enhanceDevicesForSafari(devices: AudioDevice[]): AudioDevice[];
  private mapWebDeviceToAudioDevice(device: MediaDeviceInfo): AudioDevice;
  private inferDeviceType(deviceName: string): string;
}

// Singleton instance for shared access
const audioDeviceManager = new AudioDeviceManager();
```

This separates device detection logic from recording logic:

- **AudioDeviceManager**: Handles device enumeration, selection and capabilities
- **AudioStreamManager**: Uses the selected device for recording
- **ExpoAudioStreamModule**: Exposes JavaScript APIs and delegates to managers

### Platform-Specific Implementation Details

#### iOS (Completed)
- ✅ **Device Enumeration:** Uses `AVAudioSession.availableInputs`.
- ✅ **Device Selection:** Uses `AVAudioSession.setPreferredInput`.
- ✅ **Capabilities:** Basic detection implemented.
- ✅ **Tap Installation:** Dynamically determines tap format based on `session.sampleRate` and `nodeFormat` details to handle varying hardware rates (e.g., 16kHz HFP vs 48kHz internal mic), preventing format mismatch crashes.
- ✅ **Resampling:** `processAudioBuffer` uses `AVAudioConverter` to resample audio to the user-requested `settings.sampleRate` if the hardware/tap rate differs.
- ✅ **Disconnection Handling:** Monitors `AVAudioSessionRouteChangeNotification` and uses a delegate (`AudioDeviceManagerDelegate`) to notify `AudioStreamManager`.
- ✅ **Fallback Behavior:** Implemented in `performFallbackAction` within `AudioStreamManager`. When triggered:
    1. Pauses the `AVAudioEngine`.
    2. Removes the existing audio tap.
    3. Selects the default input device via `AVAudioSession`.
    4. Updates `recordingSettings.deviceId`.
    5. Determines the correct `AVAudioFormat` for the *new* default device.
    6. Installs a **new** audio tap with the correct format.
    7. Prepares and restarts the `AVAudioEngine`.
    8. Sends notification to JS.

#### Web (Completed & Tested)
- ✅ Device enumeration using MediaDevices API.
- ✅ Device selection using `MediaStreamConstraints`.
- ✅ Permission handling with fallbacks.
- ✅ Browser-specific optimizations (Safari, Chrome, Firefox).
- ✅ Device change detection via `devicechange` event listener.
- ✅ Disconnection/Fallback behavior tested.

#### Android (Pending)
- ⬜️ Device enumeration using `AudioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)`.
- ⬜️ Device selection (Requires investigation - potentially using `setPreferredDevice` on `AudioRecord` or managing connections).
- ⬜️ Capability detection (e.g., `AudioDeviceInfo.getSampleRates()`, `getChannelCounts()`).
- ⬜️ Device disconnection events (Potentially using `BroadcastReceiver` for `ACTION_AUDIO_BECOMING_NOISY`, Bluetooth events, or USB events).
- ⬜️ **Fallback behavior**: Needs implementation similar to iOS (detect disconnection, pause/stop `AudioRecord`/`MediaRecorder`, select new device via `AudioManager`, re-initialize `AudioRecord`/`MediaRecorder` for the new device, restart recording).

## Web Implementation Details

The web implementation uses the MediaDevices API to enumerate and select audio input devices. Key features include:

1. **Permission Management**:
   - Checks and handles microphone permissions
   - Provides appropriate UI for denied permissions
   - Listens for permission changes

2. **Browser Compatibility**:
   - Special handling for Safari and privacy-restricted browsers
   - Enhanced device information when browser limitations apply
   - Fallbacks for browsers with limited device info

3. **Device Change Detection**:
   - Listens for devicechange events
   - Updates device list automatically when devices are added/removed
   - Intelligently handles device disconnections

4. **Type Detection**:
   - Infers device types based on name patterns
   - Identifies common device types (builtin, bluetooth, usb, etc.)
   - Creates consistent device types across platforms

## Testing Approach

We've developed a comprehensive testing approach for audio device detection and selection:

1. **Cross-Platform Test Component**:\n   - Created `AudioDeviceTest` component for interactive testing
   - Works on both web and native platforms
   - Displays detailed device capabilities

2. **Device Selection Testing**:
   - Allows selection between available devices
   - Shows real-time updates of device capabilities
   - Tests actual device selection with audio access

3. **Platform-Specific Testing**:
   - Web: Tests across major browsers (Chrome, Firefox, Safari)
   - iOS: Tested fallback (Bluetooth HFP -> Internal Mic). Needs testing with other device types (A2DP, Wired).
   - Android: Will test with various device types once implemented

4. **UI Components**:
   - Tests `AudioDeviceSelector` component under different conditions
   - Verifies proper display of device capabilities
   - Ensures responsive design for both web and mobile

## Remaining Work

### 1. Complete Android Implementation
- Create `AudioDeviceManager.kt` class
- Implement device type mapping
- Implement device capabilities detection
- Implement device enumeration
- Implement device selection
- Implement device disconnection detection
- Implement **fallback logic** similar to iOS: Detect disconnection, potentially pause/stop `AudioRecord`/`MediaRecorder`, select new device via `AudioManager`, re-initialize `AudioRecord`/`MediaRecorder` for the new device, restart recording.

### 2. Comprehensive Testing
- Complete testing with various audio device types (Bluetooth A2DP, wired, USB-C) on iOS.
- Complete testing with various audio device types (Bluetooth, wired, etc.) on Android.
- Complete verification of correct recording behavior with selected devices on Android.
- Perform regression testing on iOS and Web.

### 3. Documentation and Examples
- Add detailed documentation for the device detection API
- Create examples showcasing device selection in real applications
- Document platform-specific behavior and limitations
