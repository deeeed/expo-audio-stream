[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / RecordingConfig

# Interface: RecordingConfig

Defined in: [src/ExpoAudioStream.types.ts:378](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L378)

## Properties

### android?

> `optional` **android**: [`AndroidConfig`](AndroidConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:427](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L427)

Android-specific configuration

***

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:456](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L456)

Whether to automatically resume recording after an interruption (default is false)

***

### bufferDurationSeconds?

> `optional` **bufferDurationSeconds**: `number`

Defined in: [src/ExpoAudioStream.types.ts:486](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L486)

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

Defined in: [src/ExpoAudioStream.types.ts:383](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L383)

Number of audio channels (1 for mono, 2 for stereo)

***

### deviceDisconnectionBehavior?

> `optional` **deviceDisconnectionBehavior**: [`DeviceDisconnectionBehaviorType`](../type-aliases/DeviceDisconnectionBehaviorType.md)

Defined in: [src/ExpoAudioStream.types.ts:470](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L470)

How to handle device disconnection during recording

***

### deviceId?

> `optional` **deviceId**: `string`

Defined in: [src/ExpoAudioStream.types.ts:467](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L467)

ID of the device to use for recording (if not specified, uses default)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:421](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L421)

Enable audio processing (default is false)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

Defined in: [src/ExpoAudioStream.types.ts:400](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L400)

Encoding type for the recording.

Platform limitations:
- `pcm_8bit`: Android only (iOS/Web will fallback to `pcm_16bit` with warning)
- `pcm_16bit`: All platforms (recommended for cross-platform compatibility)
- `pcm_32bit`: All platforms

The library will automatically validate and adjust the encoding based on
platform capabilities. A warning will be logged if fallback is required.

#### Default

```ts
'pcm_16bit'
```

#### See

 - [EncodingType](../type-aliases/EncodingType.md)
 - [Platform Limitations](https://github.com/deeeed/expo-audio-stream/blob/main/packages/expo-audio-studio/docs/PLATFORM_LIMITATIONS.md)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

Defined in: [src/ExpoAudioStream.types.ts:436](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L436)

Feature options to extract during audio processing

***

### filename?

> `optional` **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:464](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L464)

Optional filename for the recording (uses UUID if not provided)

***

### interval?

> `optional` **interval**: `number`

Defined in: [src/ExpoAudioStream.types.ts:403](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L403)

Interval in milliseconds at which to emit recording data (minimum: 10ms)

***

### intervalAnalysis?

> `optional` **intervalAnalysis**: `number`

Defined in: [src/ExpoAudioStream.types.ts:406](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L406)

Interval in milliseconds at which to emit analysis data (minimum: 10ms)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:424](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L424)

iOS-specific configuration

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:409](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L409)

Keep the device awake while recording (default is false)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:418](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L418)

Configuration for the notification

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:442](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L442)

Callback function to handle audio features extraction results

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:439](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L439)

Callback function to handle audio stream data

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

Defined in: [src/ExpoAudioStream.types.ts:459](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L459)

Optional callback to handle recording interruptions

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

***

### output?

> `optional` **output**: [`OutputConfig`](OutputConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:453](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L453)

Configuration for audio output files

Examples:
- Primary only (default): `{ primary: { enabled: true } }`
- Compressed only: `{ primary: { enabled: false }, compressed: { enabled: true, format: 'aac' } }`
- Both outputs: `{ compressed: { enabled: true } }`
- Streaming only: `{ primary: { enabled: false } }`

***

### outputDirectory?

> `optional` **outputDirectory**: `string`

Defined in: [src/ExpoAudioStream.types.ts:462](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L462)

Optional directory path where output files will be saved

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Defined in: [src/ExpoAudioStream.types.ts:380](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L380)

Sample rate for recording in Hz (16000, 44100, or 48000)

***

### segmentDurationMs?

> `optional` **segmentDurationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:433](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L433)

Duration of each segment in milliseconds for analysis (default: 100)

***

### showNotification?

> `optional` **showNotification**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:412](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L412)

Show a notification during recording (default is false)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:415](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L415)

Show waveform in the notification (Android only, when showNotification is true)

***

### web?

> `optional` **web**: [`WebConfig`](WebConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:430](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L430)

Web-specific configuration options
