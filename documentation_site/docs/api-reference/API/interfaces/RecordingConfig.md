[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / RecordingConfig

# Interface: RecordingConfig

Defined in: [src/ExpoAudioStream.types.ts:294](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L294)

## Properties

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:358](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L358)

Whether to automatically resume recording after an interruption (default is false)

***

### channels?

> `optional` **channels**: `1` \| `2`

Defined in: [src/ExpoAudioStream.types.ts:299](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L299)

Number of audio channels (1 for mono, 2 for stereo)

***

### compression?

> `optional` **compression**: `object`

Defined in: [src/ExpoAudioStream.types.ts:344](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L344)

Configuration for audio compression

#### bitrate?

> `optional` **bitrate**: `number`

Bitrate for compression in bits per second

#### enabled

> **enabled**: `boolean`

Enable audio compression

#### format

> **format**: `"aac"` \| `"opus"`

Format for compression
- 'aac': Advanced Audio Coding - supported on all platforms
- 'opus': Opus encoding - supported on Android and Web; on iOS will automatically fall back to AAC

***

### deviceDisconnectionBehavior?

> `optional` **deviceDisconnectionBehavior**: [`DeviceDisconnectionBehaviorType`](../type-aliases/DeviceDisconnectionBehaviorType.md)

Defined in: [src/ExpoAudioStream.types.ts:372](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L372)

How to handle device disconnection during recording

***

### deviceId?

> `optional` **deviceId**: `string`

Defined in: [src/ExpoAudioStream.types.ts:369](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L369)

ID of the device to use for recording (if not specified, uses default)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:323](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L323)

Enable audio processing (default is false)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

Defined in: [src/ExpoAudioStream.types.ts:302](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L302)

Encoding type for the recording (pcm_32bit, pcm_16bit, pcm_8bit)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

Defined in: [src/ExpoAudioStream.types.ts:335](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L335)

Feature options to extract during audio processing

***

### filename?

> `optional` **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:366](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L366)

Optional filename for the recording (uses UUID if not provided)

***

### interval?

> `optional` **interval**: `number`

Defined in: [src/ExpoAudioStream.types.ts:305](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L305)

Interval in milliseconds at which to emit recording data

***

### intervalAnalysis?

> `optional` **intervalAnalysis**: `number`

Defined in: [src/ExpoAudioStream.types.ts:308](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L308)

Interval in milliseconds at which to emit analysis data

***

### bufferDurationSeconds?

> `optional` **bufferDurationSeconds**: `number`

Defined in: [src/ExpoAudioStream.types.ts:371](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L371)

Buffer duration in seconds. If not set, we use default buffer AVAudioFrameCount of 1024.

***

### skipFileWriting?

> `optional` **skipFileWriting**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:369](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L369)

When true, only emits audio data without writing to file

***



### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:326](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L326)

iOS-specific configuration

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:311](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L311)

Keep the device awake while recording (default is false)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:320](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L320)

Configuration for the notification

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:341](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L341)

Callback function to handle audio features extraction results

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:338](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L338)

Callback function to handle audio stream data

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

Defined in: [src/ExpoAudioStream.types.ts:361](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L361)

Optional callback to handle recording interruptions

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

***

### outputDirectory?

> `optional` **outputDirectory**: `string`

Defined in: [src/ExpoAudioStream.types.ts:364](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L364)

Optional directory path where output files will be saved

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Defined in: [src/ExpoAudioStream.types.ts:296](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L296)

Sample rate for recording in Hz (16000, 44100, or 48000)

***

### segmentDurationMs?

> `optional` **segmentDurationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:332](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L332)

Duration of each segment in milliseconds for analysis (default: 100)

***

### showNotification?

> `optional` **showNotification**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:314](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L314)

Show a notification during recording (default is false)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:317](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L317)

Show waveform in the notification (Android only, when showNotification is true)

***

### web?

> `optional` **web**: [`WebConfig`](WebConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:329](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L329)

Web-specific configuration options
