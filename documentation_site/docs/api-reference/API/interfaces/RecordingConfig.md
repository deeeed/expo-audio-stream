[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / RecordingConfig

# Interface: RecordingConfig

Defined in: [src/ExpoAudioStream.types.ts:347](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L347)

## Properties

### android?

> `optional` **android**: [`AndroidConfig`](AndroidConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:382](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L382)

Android-specific configuration

***

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:411](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L411)

Whether to automatically resume recording after an interruption (default is false)

***

### bufferDurationSeconds?

> `optional` **bufferDurationSeconds**: `number`

Defined in: [src/ExpoAudioStream.types.ts:441](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L441)

Buffer duration in seconds. Controls the size of audio buffers
used during recording. Smaller values reduce latency but increase
CPU usage. Larger values improve efficiency but increase latency.

Platform Notes:
- iOS/macOS: Minimum effective 0.1s, uses accumulation below
- Android: Respects all sizes within hardware limits
- Web: Fully configurable

Default: undefined (uses platform default ~23ms at 44.1kHz)
Recommended: 0.01 - 0.5 seconds
Optimal iOS: >= 0.1 seconds

***

### channels?

> `optional` **channels**: `1` \| `2`

Defined in: [src/ExpoAudioStream.types.ts:352](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L352)

Number of audio channels (1 for mono, 2 for stereo)

***

### deviceDisconnectionBehavior?

> `optional` **deviceDisconnectionBehavior**: [`DeviceDisconnectionBehaviorType`](../type-aliases/DeviceDisconnectionBehaviorType.md)

Defined in: [src/ExpoAudioStream.types.ts:425](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L425)

How to handle device disconnection during recording

***

### deviceId?

> `optional` **deviceId**: `string`

Defined in: [src/ExpoAudioStream.types.ts:422](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L422)

ID of the device to use for recording (if not specified, uses default)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:376](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L376)

Enable audio processing (default is false)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

Defined in: [src/ExpoAudioStream.types.ts:355](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L355)

Encoding type for the recording (pcm_32bit, pcm_16bit, pcm_8bit)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

Defined in: [src/ExpoAudioStream.types.ts:391](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L391)

Feature options to extract during audio processing

***

### filename?

> `optional` **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:419](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L419)

Optional filename for the recording (uses UUID if not provided)

***

### interval?

> `optional` **interval**: `number`

Defined in: [src/ExpoAudioStream.types.ts:358](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L358)

Interval in milliseconds at which to emit recording data (minimum: 10ms)

***

### intervalAnalysis?

> `optional` **intervalAnalysis**: `number`

Defined in: [src/ExpoAudioStream.types.ts:361](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L361)

Interval in milliseconds at which to emit analysis data (minimum: 10ms)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:379](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L379)

iOS-specific configuration

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:364](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L364)

Keep the device awake while recording (default is false)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:373](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L373)

Configuration for the notification

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:397](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L397)

Callback function to handle audio features extraction results

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:394](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L394)

Callback function to handle audio stream data

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

Defined in: [src/ExpoAudioStream.types.ts:414](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L414)

Optional callback to handle recording interruptions

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

***

### output?

> `optional` **output**: [`OutputConfig`](OutputConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:408](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L408)

Configuration for audio output files

Examples:
- Primary only (default): `{ primary: { enabled: true } }`
- Compressed only: `{ primary: { enabled: false }, compressed: { enabled: true, format: 'aac' } }`
- Both outputs: `{ compressed: { enabled: true } }`
- Streaming only: `{ primary: { enabled: false } }`

***

### outputDirectory?

> `optional` **outputDirectory**: `string`

Defined in: [src/ExpoAudioStream.types.ts:417](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L417)

Optional directory path where output files will be saved

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Defined in: [src/ExpoAudioStream.types.ts:349](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L349)

Sample rate for recording in Hz (16000, 44100, or 48000)

***

### segmentDurationMs?

> `optional` **segmentDurationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:388](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L388)

Duration of each segment in milliseconds for analysis (default: 100)

***

### showNotification?

> `optional` **showNotification**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:367](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L367)

Show a notification during recording (default is false)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:370](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L370)

Show waveform in the notification (Android only, when showNotification is true)

***

### web?

> `optional` **web**: [`WebConfig`](WebConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:385](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L385)

Web-specific configuration options
