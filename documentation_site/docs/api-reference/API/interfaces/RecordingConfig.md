[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / RecordingConfig

# Interface: RecordingConfig

Defined in: [src/ExpoAudioStream.types.ts:325](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L325)

## Properties

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:386](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L386)

Whether to automatically resume recording after an interruption (default is false)

***

### bufferDurationSeconds?

> `optional` **bufferDurationSeconds**: `number`

Defined in: [src/ExpoAudioStream.types.ts:416](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L416)

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

Defined in: [src/ExpoAudioStream.types.ts:330](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L330)

Number of audio channels (1 for mono, 2 for stereo)

***

### deviceDisconnectionBehavior?

> `optional` **deviceDisconnectionBehavior**: [`DeviceDisconnectionBehaviorType`](../type-aliases/DeviceDisconnectionBehaviorType.md)

Defined in: [src/ExpoAudioStream.types.ts:400](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L400)

How to handle device disconnection during recording

***

### deviceId?

> `optional` **deviceId**: `string`

Defined in: [src/ExpoAudioStream.types.ts:397](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L397)

ID of the device to use for recording (if not specified, uses default)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:354](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L354)

Enable audio processing (default is false)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

Defined in: [src/ExpoAudioStream.types.ts:333](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L333)

Encoding type for the recording (pcm_32bit, pcm_16bit, pcm_8bit)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

Defined in: [src/ExpoAudioStream.types.ts:366](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L366)

Feature options to extract during audio processing

***

### filename?

> `optional` **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:394](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L394)

Optional filename for the recording (uses UUID if not provided)

***

### interval?

> `optional` **interval**: `number`

Defined in: [src/ExpoAudioStream.types.ts:336](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L336)

Interval in milliseconds at which to emit recording data

***

### intervalAnalysis?

> `optional` **intervalAnalysis**: `number`

Defined in: [src/ExpoAudioStream.types.ts:339](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L339)

Interval in milliseconds at which to emit analysis data

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:357](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L357)

iOS-specific configuration

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:342](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L342)

Keep the device awake while recording (default is false)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:351](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L351)

Configuration for the notification

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:372](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L372)

Callback function to handle audio features extraction results

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:369](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L369)

Callback function to handle audio stream data

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

Defined in: [src/ExpoAudioStream.types.ts:389](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L389)

Optional callback to handle recording interruptions

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

***

### output?

> `optional` **output**: [`OutputConfig`](OutputConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:383](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L383)

Configuration for audio output files

Examples:
- Primary only (default): `{ primary: { enabled: true } }`
- Compressed only: `{ primary: { enabled: false }, compressed: { enabled: true, format: 'aac' } }`
- Both outputs: `{ compressed: { enabled: true } }`
- Streaming only: `{ primary: { enabled: false } }`

***

### outputDirectory?

> `optional` **outputDirectory**: `string`

Defined in: [src/ExpoAudioStream.types.ts:392](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L392)

Optional directory path where output files will be saved

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Defined in: [src/ExpoAudioStream.types.ts:327](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L327)

Sample rate for recording in Hz (16000, 44100, or 48000)

***

### segmentDurationMs?

> `optional` **segmentDurationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:363](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L363)

Duration of each segment in milliseconds for analysis (default: 100)

***

### showNotification?

> `optional` **showNotification**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:345](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L345)

Show a notification during recording (default is false)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:348](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L348)

Show waveform in the notification (Android only, when showNotification is true)

***

### web?

> `optional` **web**: [`WebConfig`](WebConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:360](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L360)

Web-specific configuration options
