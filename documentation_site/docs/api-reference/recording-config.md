---
id: recording-config
title: Recording Configuration
sidebar_label: Recording Configuration
---

The recording configuration specifies the settings used for audio recording on different platforms. Below are the default settings for Android, iOS, and web platforms:

- On Android: 16kHz sample rate, 16-bit depth, 1 channel.
- On IOS: 48kHz sample rate, 16-bit depth, 1 channel.
- On the web, default configuration is 44.1kHz sample rate, 32-bit depth, 1 channel.

> **Note on iOS Recording**: The library now automatically detects and adapts to the hardware's actual sample rate on both iOS devices and simulators. This means you can specify any supported sample rate (e.g., 16kHz, 44.1kHz, 48kHz) in your configuration, and the library will:
> 
> 1. Capture audio at the hardware's native sample rate (typically 44.1kHz on simulators)
> 2. Perform high-quality resampling to match your requested sample rate
> 3. Deliver the final recording at your specified configuration
> 
> This automatic adaptation prevents crashes that previously occurred when the requested sample rate didn't match the hardware capabilities, especially in simulators.

```tsx
export interface RecordingConfig {
    sampleRate?: SampleRate // Sample rate for recording (16000, 44100, or 48000 Hz)
    channels?: 1 | 2 // Number of audio channels (1 for mono, 2 for stereo)
    encoding?: EncodingType // Encoding type for the recording (pcm_32bit, pcm_16bit, pcm_8bit)
    interval?: number // Interval in milliseconds at which to emit recording data

    // Device and notification settings
    keepAwake?: boolean // Continue recording when app is in background. On iOS, requires both 'audio' and 'processing' background modes (default is true)
    showNotification?: boolean // Show a notification during recording (default is false)
    showWaveformInNotification?: boolean // Show waveform in the notification (Android only)
    notification?: NotificationConfig // Configuration for the notification

    // Audio processing settings
    enableProcessing?: boolean // Enable audio processing (default is false)
    pointsPerSecond?: number // Number of data points to extract per second of audio (default is 10)
    algorithm?: AmplitudeAlgorithm // Algorithm to use for amplitude computation (default is "rms")
    features?: AudioFeaturesOptions // Feature options to extract (default is empty)

    // Platform specific configuration
    ios?: IOSConfig // iOS-specific configuration
    web?: WebConfig // Web-specific configuration

    // Compression settings
    compression?: {
        enabled: boolean
        format: 'aac' | 'opus'  // Available compression formats
        bitrate?: number
    }

    // Output configuration
    outputDirectory?: string // Custom directory for saving recordings (uses app default if not specified)
    filename?: string // Custom filename for the recording (uses UUID if not specified)

    // Interruption handling
    autoResumeAfterInterruption?: boolean // Whether to automatically resume after interruption
    onRecordingInterrupted?: (_: RecordingInterruptionEvent) => void // Callback for interruption events

    // Callback functions
    onAudioStream?: (_: AudioDataEvent) => Promise<void> // Callback function to handle audio stream
    onAudioAnalysis?: (_: AudioAnalysisEvent) => Promise<void> // Callback function to handle audio features
}

```

## Platform-Specific Architecture

### Web

On the web, the recording utilizes the `AudioWorkletProcessor` for handling audio data. The `AudioWorkletProcessor` allows for real-time audio processing directly in the browser, making it a powerful tool for web-based audio applications.

### Android

On Android, the recording is managed using Android's native `AudioRecord` API along with `AudioFormat` and `MediaRecorder`. These classes are part of the Android framework and provide low-level access to audio hardware, allowing for high-quality audio recording.

### iOS

On iOS, the recording is managed using `AVAudioEngine` and related classes from the `AVFoundation` framework. The implementation uses a sophisticated audio handling approach that:
- Automatically detects and adapts to the hardware's native sample rate
- Handles sample rate mismatches between iOS audio session and actual hardware capabilities
- Performs high-quality resampling to match the requested configuration
- Works reliably on both physical devices and simulators regardless of the requested sample rate
- Supports both 16-bit and 32-bit PCM formats
- Maintains audio quality through intermediate Float32 format when necessary

## Platform Differences

### Android and iOS

On Android and iOS, the library attempts to record audio in the specified format. On iOS, the audio is automatically resampled to match the requested configuration using AVAudioConverter, ensuring high-quality output even when the hardware sample rate differs from the target rate.

### Web

On the web, the default configuration is typically higher, with a 44.1kHz sample rate and 32-bit depth. This ensures better sound quality, but it can lead to issues when resampling is required to lower settings.

## Recording Process 

To start recording, you use the `startRecording` function which accepts a `RecordingConfig` object. The output of this function is a `StartRecordingResult`.

```tsx
export interface StartRecordingResult {
    fileUri: string
    mimeType: string
    channels?: number
    bitDepth?: BitDepth
    sampleRate?: SampleRate
    compression?: {
        compressedFileUri: string
        size: number
        mimeType: string
        bitrate: number
        format: string
    }
}
```

## Zero-Latency Recording

The library provides a `prepareRecording` method that can significantly reduce the latency between a user action and the actual start of recording. This is particularly useful for time-sensitive applications where any delay in starting audio capture could be problematic.

### How it Works

When using the standard `startRecording` function, there's an inherent delay caused by several initialization steps:

1. Requesting user permissions (if not already granted)
2. Setting up audio sessions
3. Allocating memory for audio buffers
4. Initializing hardware resources
5. Configuring encoders and audio processing pipelines

The `prepareRecording` method decouples these initialization steps from the actual recording start, allowing your application to pre-initialize all necessary resources in advance.

### Using prepareRecording

```tsx
import { useAudioRecorder, useSharedAudioRecorder } from '@siteed/expo-audio-studio';

// With individual recorder hook
const { 
  prepareRecording, 
  startRecording, 
  stopRecording 
} = useAudioRecorder();

// Or with shared recorder context
const { 
  prepareRecording, 
  startRecording, 
  stopRecording 
} = useSharedAudioRecorder();

// Prepare recording during component mounting or any appropriate initialization phase
useEffect(() => {
  const prepare = async () => {
    await prepareRecording({
      sampleRate: 44100,
      channels: 1,
      encoding: 'pcm_16bit',
      // Add any other recording configuration options
    });
    console.log('Recording resources prepared and ready');
  };
  
  prepare();
}, []);

// Later, when the user triggers recording, it starts with minimal latency
const handleRecordButton = async () => {
  await startRecording({
    // Use the same configuration as in prepareRecording
    sampleRate: 44100,
    channels: 1,
    encoding: 'pcm_16bit',
  });
};
```

### Key Benefits

- **Eliminates perceptible lag** between user action and recording start
- **Improves user experience** for time-sensitive applications
- **Consistent behavior** across all supported platforms
- **Maintains audio quality** while reducing startup latency

### Implementation Notes

1. Call `prepareRecording` as early as possible, such as during screen loading
2. Use identical configuration for both `prepareRecording` and `startRecording`
3. The preparation state persists until recording starts or the app is terminated
4. If `startRecording` is called without prior preparation, it performs normal initialization
5. Resources are automatically released when recording starts or when the component is unmounted

### Example: Capture Time-Critical Audio

This example demonstrates how to implement a voice command system where capturing the beginning of speech is critical:

```tsx
function VoiceCommandScreen() {
  const { 
    prepareRecording, 
    startRecording, 
    stopRecording,
    isRecording 
  } = useSharedAudioRecorder();
  
  // Prepare audio resources when screen loads
  useEffect(() => {
    const prepareAudio = async () => {
      await prepareRecording({
        sampleRate: 16000, // Optimized for speech
        channels: 1,
        encoding: 'pcm_16bit',
        enableProcessing: true,
        features: {
          energy: true,
          rms: true,
        }
      });
    };
    
    prepareAudio();
    
    return () => {
      // Clean up if needed
      if (isRecording) {
        stopRecording();
      }
    };
  }, []);
  
  return (
    <View style={styles.container}>
      <Text style={styles.instructions}>
        Press and hold to capture voice command
      </Text>
      
      <Pressable
        onPressIn={() => startRecording({
          sampleRate: 16000,
          channels: 1,
          encoding: 'pcm_16bit',
          enableProcessing: true,
          features: {
            energy: true,
            rms: true,
          }
        })}
        onPressOut={stopRecording}
        style={({ pressed }) => [
          styles.recordButton,
          { backgroundColor: pressed || isRecording ? 'red' : 'blue' }
        ]}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'Recording...' : 'Press to Record'}
        </Text>
      </Pressable>
    </View>
  );
}
```

## Web Memory Optimization {#web-memory-optimization}

On the web platform, audio recording can consume significant memory, especially for longer recordings. The library offers a memory optimization option to reduce memory usage by controlling how uncompressed audio data is stored.

### Web Configuration Options

```tsx
interface WebConfig {
    /**
     * Whether to store uncompressed audio data for WAV generation (web only)
     * 
     * Default: true (for backward compatibility)
     */
    storeUncompressedAudio?: boolean
}
```

### Memory Usage Control

The `storeUncompressedAudio` option lets you control how audio data is handled in memory:

- **When true (default)**: All PCM chunks are stored in memory during recording, enabling WAV file generation when compression is disabled. This provides maximum flexibility but can use significant memory for long recordings.

- **When false**: Only compressed audio is kept (if compression is enabled), significantly reducing memory usage. This is ideal for long recordings where memory constraints are a concern.

### Example Usage

```tsx
const { startRecording } = useAudioRecorder();

// Memory-efficient recording for long sessions
await startRecording({
  sampleRate: 44100,
  channels: 1,
  compression: {
    enabled: true,  // Enable compression to ensure audio is captured
    format: 'opus',
    bitrate: 64000
  },
  web: {
    storeUncompressedAudio: false  // Only store compressed data
  }
});
```

### Platform Behavior

- **Web**: The `storeUncompressedAudio` setting controls in-memory storage of PCM data
- **iOS/Android**: This setting has no effect, as these platforms always write directly to files rather than storing in memory

## Compression Settings {#compression-settings}

The library supports real-time audio compression alongside the raw PCM recording. This dual-stream approach allows you to capture both high-quality uncompressed audio and smaller compressed files simultaneously.

### Configuration Options

```tsx
compression: {
    enabled: boolean      // Whether to enable compression
    format: 'aac' | 'opus' // Compression format to use
    bitrate?: number      // Optional bitrate in bits per second
}
```

### Supported Formats

- **AAC (Advanced Audio Coding)**:
  - High-quality lossy compression
  - Excellent for voice and music
  - Widely supported on all platforms
  - Recommended bitrate: 64000-256000 bps

- **Opus**:
  - Modern, high-efficiency codec
  - Superior quality at low bitrates
  - Excellent for speech compression
  - Recommended bitrate: 16000-96000 bps

### Example: Enabling Compression

```tsx
const { startRecording } = useAudioRecorder();

// Configure recording with compression
await startRecording({
  sampleRate: 44100,
  channels: 1,
  encoding: 'pcm_16bit',
  // Compression settings
  compression: {
    enabled: true,
    format: 'aac',
    bitrate: 128000 // 128 kbps
  }
});
```

### Accessing Compressed Files

When recording with compression enabled, both the raw PCM file and the compressed file are available in the recording result:

```tsx
const { stopRecording } = useAudioRecorder();

const handleStopRecording = async () => {
  const result = await stopRecording();
  
  // Access the uncompressed WAV file
  console.log('Uncompressed file:', result.fileUri);
  console.log('Uncompressed size:', result.size, 'bytes');
  
  // Access the compressed file
  if (result.compression) {
    console.log('Compressed file:', result.compression.compressedFileUri);
    console.log('Compressed size:', result.compression.size, 'bytes');
    console.log('Compression format:', result.compression.format);
    console.log('Bitrate:', result.compression.bitrate, 'bps');
  }
};
```

### Platform Considerations

- **iOS**: 
  - AAC is supported and recommended
  - Opus format is **not supported** on iOS - if requested, the library will automatically fall back to AAC format and emit a warning
  - Files are written directly to disk rather than stored in memory
- **Android**: 
  - Both AAC and Opus are supported
  - Files are written directly to disk rather than stored in memory
- **Web**: 
  - Opus is supported
  - AAC support depends on browser
  - Data is stored in memory during recording unless `storeUncompressedAudio: false` is set

### Streaming Compressed Audio

You can also access the compressed audio data in real-time during recording using the `onAudioStream` callback:

```tsx
await startRecording({
  // ... other config options
  compression: {
    enabled: true,
    format: 'opus',
    bitrate: 64000
  },
  onAudioStream: async (event) => {
    // Raw PCM audio data
    console.log('Raw data size:', event.eventDataSize);
    
    // Compressed audio chunk (if compression is enabled)
    if (event.compression?.data) {
      console.log('Compressed chunk size:', 
        typeof event.compression.data === 'string' 
          ? event.compression.data.length 
          : event.compression.data.size
      );
    }
  }
});
```

## Example Usage

```tsx
import { useAudioRecorder } from '@siteed/expo-audio-studio';

const config = {
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_16bit',
    interval: 500,
    enableProcessing: true,
    keepAwake: true,
    showNotification: true,
    compression: {
        enabled: true,
        format: 'aac',
        bitrate: 128000
    },
    pointsPerSecond: 1000,
    algorithm: 'rms',
    features: { energy: true, rms: true },
    autoResumeAfterInterruption: true,
    onAudioStream: async (event) => {
        console.log('Audio data:', event);
    },
    onAudioAnalysis: async (data) => {
        console.log('Processing:', data);
    },
    onRecordingInterrupted: (event) => {
        console.log('Recording interrupted:', event);
    }
};

const {
    startRecording,
    stopRecording,
    isRecording,
    durationMs,
    size,
} = useAudioRecorder({ debug: true });

const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (granted) {
        const result = await startRecording(config);
        console.log('Recording started with config:', result);
    }
};

const handleStop = async () => {
    const result = await stopRecording();
    console.log('Recording stopped with result:', result);
};
```

## Recording Interruption Handling

The library provides robust handling of recording interruptions that may occur during audio capture. These interruptions can happen for various reasons such as incoming phone calls or audio focus changes.

### Interruption Types

The `RecordingInterruptionEvent` includes the following possible reasons for interruption:

```tsx
type RecordingInterruptionReason =
    | 'audioFocusLoss'    // Another app has taken audio focus
    | 'audioFocusGain'    // Audio focus has been regained
    | 'phoneCall'         // An incoming phone call has interrupted recording
    | 'phoneCallEnded'    // The interrupting phone call has ended
```

### Handling Interruptions

You can handle interruptions in two ways:

1. **Automatic Resume**: Set `autoResumeAfterInterruption: true` in your config to automatically resume recording after an interruption ends.

2. **Manual Handling**: Use the `onRecordingInterrupted` callback to implement custom interruption handling:

```tsx
const config = {
    // ... other config options ...
    autoResumeAfterInterruption: false,
    onRecordingInterrupted: (event) => {
        const { reason, isPaused } = event;
        
        switch (reason) {
            case 'phoneCall':
                console.log('Recording paused due to phone call');
                break;
            case 'phoneCallEnded':
                console.log('Phone call ended, can resume recording');
                break;
            case 'audioFocusLoss':
                console.log('Audio focus lost to another app');
                break;
            case 'audioFocusGain':
                console.log('Audio focus regained');
                break;
        }
        
        console.log('Recording is currently paused:', isPaused);
    }
};
```

### Platform Behavior

- **iOS**: 
  - Interruptions are handled through the AVAudioSession system
  - Phone call handling is enabled by default (can be disabled via `enablePhoneStateHandling: false`)
- **Android**: 
  - Interruptions are managed via AudioManager focus changes
  - Phone call handling is enabled by default (can be disabled via `enablePhoneStateHandling: false`)
- **Web**: 
  - Interruptions are handled through the Web Audio API's state changes
  - Phone call handling is not supported

## Background Recording on iOS

When setting `keepAwake: true` for iOS background recording:

- **Required**: The `audio` background mode
  - This is essential for accessing the microphone in the background
  - Without this, iOS will suspend your audio session when backgrounded
  
- **Recommended**: The `processing` background mode
  - Provides additional background execution time for audio processing
  - Helpful for longer recordings or when using audio analysis features

### iOS Configuration

In your `app.config.ts` or plugin configuration:

```typescript
iosBackgroundModes: {
  useAudio: true,     // REQUIRED for background recording
  useProcessing: true // RECOMMENDED for better performance
}
```

The key takeaway: `useAudio: true` is required for any background recording to work.

## Troubleshooting Background Recording

If recording stops when your app moves to the background despite having `keepAwake: true`:

- **iOS**: Verify your app has the "audio" background mode in Info.plist (required)
  - Adding the "processing" background mode is also recommended
- **Android**: Check that your app has the required foreground service permissions

Example iOS Info.plist configuration:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
  <string>processing</string> <!-- recommended but optional -->
  <!-- other background modes -->
</array>
```

## Example Usage

```tsx
import { useAudioRecorder } from '@siteed/expo-audio-studio';

const config = {
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_16bit',
    interval: 500,
    enableProcessing: true,
    keepAwake: true,
    showNotification: true,
    compression: {
        enabled: true,
        format: 'aac',
        bitrate: 128000
    },
    pointsPerSecond: 1000,
    algorithm: 'rms',
    features: { energy: true, rms: true },
    autoResumeAfterInterruption: true,
    onAudioStream: async (event) => {
        console.log('Audio data:', event);
    },
    onAudioAnalysis: async (data) => {
        console.log('Processing:', data);
    },
    onRecordingInterrupted: (event) => {
        console.log('Recording interrupted:', event);
    }
};

const {
    startRecording,
    stopRecording,
    isRecording,
    durationMs,
    size,
} = useAudioRecorder({ debug: true });

const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (granted) {
        const result = await startRecording(config);
        console.log('Recording started with config:', result);
    }
};

const handleStop = async () => {
    const result = await stopRecording();
    console.log('Recording stopped with result:', result);
};
```
