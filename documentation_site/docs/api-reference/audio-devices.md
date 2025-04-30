---
id: audio-devices
title: Audio Device Detection & Selection
sidebar_label: Audio Devices
---

# Audio Device Detection & Selection

The `@siteed/expo-audio-studio` library provides a comprehensive API for detecting, examining, and selecting audio input devices across iOS, Android, and web platforms.

## Overview

This API allows you to:

1. Enumerate all available audio input devices on the device
2. View detailed device capabilities (sample rates, channels, bit depths)
3. Select a specific device for recording
4. Handle device disconnection gracefully

## Core Types

### AudioDevice

The `AudioDevice` interface represents an audio input device:

```typescript
interface AudioDevice {
  id: string;                     // Unique device identifier 
  name: string;                   // Human-readable device name
  type: string;                   // Device type (builtin_mic, bluetooth, usb, wired, etc.)
  isDefault: boolean;             // Whether this is the system default device
  capabilities: AudioDeviceCapabilities;
  isAvailable: boolean;           // Whether device is currently available
}
```

### AudioDeviceCapabilities

The `AudioDeviceCapabilities` interface provides information about what a device supports:

```typescript
interface AudioDeviceCapabilities {
  sampleRates: number[];          // Supported sample rates
  channelCounts: number[];        // Supported channel counts
  bitDepths: number[];            // Supported bit depths
  hasEchoCancellation?: boolean;  // Echo cancellation support
  hasNoiseSuppression?: boolean;  // Noise suppression support
  hasAutomaticGainControl?: boolean; // AGC support
}
```

### DeviceDisconnectionBehavior

Defines how recording should behave when a device becomes unavailable:

```typescript
const DeviceDisconnectionBehavior = {
  PAUSE: 'pause',                // Pause recording when device disconnects
  FALLBACK: 'fallback'           // Switch to default device and continue recording
} as const;

type DeviceDisconnectionBehaviorType = 
  typeof DeviceDisconnectionBehavior[keyof typeof DeviceDisconnectionBehavior];
```

## React Hook: useAudioDevices

The easiest way to integrate audio device detection and selection is with the `useAudioDevices` hook:

```typescript
import { useAudioDevices } from '@siteed/expo-audio-studio';

function MyComponent() {
  const {
    devices,             // Array of available devices
    currentDevice,       // Currently selected device
    loading,             // Loading state
    error,               // Error state
    selectDevice,        // Function to select a device
    resetToDefaultDevice, // Function to reset to default device
    refreshDevices,      // Function to refresh the device list
  } = useAudioDevices();

  // Example: Select the first device
  const handleSelectFirstDevice = () => {
    if (devices.length > 0) {
      selectDevice(devices[0].id);
    }
  };

  return (
    <View>
      {loading ? (
        <Text>Loading devices...</Text>
      ) : (
        <View>
          <Text>Available devices: {devices.length}</Text>
          <Text>Current device: {currentDevice?.name || 'None'}</Text>
          
          {devices.map(device => (
            <TouchableOpacity
              key={device.id}
              onPress={() => selectDevice(device.id)}
            >
              <Text>{device.name} ({device.type})</Text>
            </TouchableOpacity>
          ))}
          
          <Button title="Refresh Devices" onPress={refreshDevices} />
          <Button title="Reset to Default" onPress={resetToDefaultDevice} />
        </View>
      )}
    </View>
  );
}
```

## AudioDeviceSelector Component

For a ready-to-use UI component, you can use the `AudioDeviceSelector`:

```typescript
import { AudioDeviceSelector } from '@siteed/expo-audio-studio';

function MyRecordingScreen() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
  
  const handleDeviceSelected = (device) => {
    console.log('Selected device:', device.name);
    setSelectedDeviceId(device.id);
  };
  
  return (
    <View>
      <Text>Select Recording Device:</Text>
      <AudioDeviceSelector
        value={selectedDeviceId}
        onDeviceSelected={handleDeviceSelected}
        showCapabilities={true}
        showRefreshButton={true}
      />
    </View>
  );
}
```

## Using with Recording

To use a specific audio device with recording, include the `deviceId` in your recording configuration:

```typescript
import { useAudioRecorder, useAudioDevices } from '@siteed/expo-audio-studio';

function RecordingComponent() {
  const { devices, currentDevice } = useAudioDevices();
  const { startRecording, stopRecording } = useAudioRecorder();
  
  const startRecordingWithDevice = async () => {
    if (currentDevice) {
      await startRecording({
        sampleRate: 44100,
        channels: 1,
        encoding: 'pcm_16bit',
        // Use the selected device for recording
        deviceId: currentDevice.id,
        // Handle device disconnection
        deviceDisconnectionBehavior: 'fallback',
      });
    }
  };
  
  return (
    <View>
      <AudioDeviceSelector showCapabilities={true} />
      
      <Button title="Start Recording" onPress={startRecordingWithDevice} />
      <Button title="Stop Recording" onPress={stopRecording} />
    </View>
  );
}
```

## Low-Level API

For advanced use cases, you can directly access the `AudioDeviceManager`:

```typescript
import { audioDeviceManager } from '@siteed/expo-audio-studio';

// Get all available devices
const devices = await audioDeviceManager.getAvailableDevices();

// Get all available devices with forced refresh (useful when Bluetooth devices aren't showing up)
// NOTE: For most cases, use refreshDevices() instead as it includes debouncing and listener notifications
const refreshedDevices = await audioDeviceManager.getAvailableDevices({ refresh: true });

// Get the current device
const currentDevice = await audioDeviceManager.getCurrentDevice();

// Select a specific device
const success = await audioDeviceManager.selectDevice('device-id-here');

// Reset to the default device
await audioDeviceManager.resetToDefaultDevice();

// PREFERRED METHOD: Force refresh of device detection with debouncing and listener notifications
const updatedDevices = await audioDeviceManager.refreshDevices();

// Listen for device changes
const removeListener = audioDeviceManager.addDeviceChangeListener((devices) => {
  console.log('Devices changed:', devices);
});

// Remove the listener when done
removeListener();
```

## Platform Considerations

### iOS

- Full support for device enumeration and selection
- Detailed device capabilities
- Automatic handling of device disconnection
- Special handling for Bluetooth devices may require using the `refresh` option when devices aren't showing up

### Android

- Basic support for default device (full implementation coming soon)
- Device selection will be fully supported in a future update

### Web

- Uses the MediaDevices API for device enumeration
- Support varies by browser:
  - Chrome & Firefox: Full support for device enumeration and selection
  - Safari: Limited device information due to privacy restrictions
  - All browsers: Requires user permission to access microphone
- Provides fallbacks for privacy-restricted environments

## Best Practices

1. **Always check for device availability**
   ```typescript
   if (devices.length === 0) {
     // Show message about no available devices
   }
   ```

2. **Handle loading and error states**
   ```typescript
   if (loading) {
     return <LoadingIndicator />;
   }
   
   if (error) {
     return <Text>Error: {error.message}</Text>;
   }
   ```

3. **Use deviceDisconnectionBehavior for robustness**
   ```typescript
   await startRecording({
     // ... other options
     deviceDisconnectionBehavior: 'fallback', // Switch to default device if selected device disconnects
   });
   ```

4. **Force refresh if Bluetooth devices aren't detected**
   ```typescript
   // If Bluetooth device isn't showing up, use the preferred refreshDevices method
   const refreshDevices = async () => {
     // This method includes debouncing and notifies all listeners
     const devices = await audioDeviceManager.refreshDevices();
     setDevices(devices);
   };
   
   // Add a refresh button in your UI
   <Button title="Refresh Devices" onPress={refreshDevices} />

   // Only use the direct approach if you need more control:
   // const devices = await audioDeviceManager.getAvailableDevices({ refresh: true });
   ```

5. **Refresh devices periodically**
   ```