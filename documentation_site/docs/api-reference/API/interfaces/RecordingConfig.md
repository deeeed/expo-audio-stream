[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

Whether to automatically resume recording after an interruption (default is false)

#### Defined in

[src/ExpoAudioStream.types.ts:288](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L288)

***

### channels?

> `optional` **channels**: `1` \| `2`

Number of audio channels (1 for mono, 2 for stereo)

#### Defined in

[src/ExpoAudioStream.types.ts:236](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L236)

***

### compression?

> `optional` **compression**: `object`

Configuration for audio compression

#### bitrate?

> `optional` **bitrate**: `number`

Bitrate for compression in bits per second

#### enabled

> **enabled**: `boolean`

Enable audio compression

#### format

> **format**: `"opus"` \| `"aac"`

Format for compression (aac or opus)

#### Defined in

[src/ExpoAudioStream.types.ts:278](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L278)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

Enable audio processing (default is false)

#### Defined in

[src/ExpoAudioStream.types.ts:260](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L260)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

Encoding type for the recording (pcm_32bit, pcm_16bit, pcm_8bit)

#### Defined in

[src/ExpoAudioStream.types.ts:239](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L239)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

Feature options to extract during audio processing

#### Defined in

[src/ExpoAudioStream.types.ts:269](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L269)

***

### filename?

> `optional` **filename**: `string`

Optional filename for the recording (uses UUID if not provided)

#### Defined in

[src/ExpoAudioStream.types.ts:296](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L296)

***

### interval?

> `optional` **interval**: `number`

Interval in milliseconds at which to emit recording data

#### Defined in

[src/ExpoAudioStream.types.ts:242](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L242)

***

### intervalAnalysis?

> `optional` **intervalAnalysis**: `number`

Interval in milliseconds at which to emit analysis data

#### Defined in

[src/ExpoAudioStream.types.ts:245](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L245)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

iOS-specific configuration

#### Defined in

[src/ExpoAudioStream.types.ts:263](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L263)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

Keep the device awake while recording (default is false)

#### Defined in

[src/ExpoAudioStream.types.ts:248](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L248)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

Configuration for the notification

#### Defined in

[src/ExpoAudioStream.types.ts:257](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L257)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

Callback function to handle audio features extraction results

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:275](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L275)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

Callback function to handle audio stream data

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:272](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L272)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

Optional callback to handle recording interruptions

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:291](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L291)

***

### outputDirectory?

> `optional` **outputDirectory**: `string`

Optional directory path where output files will be saved

#### Defined in

[src/ExpoAudioStream.types.ts:294](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L294)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Sample rate for recording in Hz (16000, 44100, or 48000)

#### Defined in

[src/ExpoAudioStream.types.ts:233](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L233)

***

### segmentDurationMs?

> `optional` **segmentDurationMs**: `number`

Duration of each segment in milliseconds for analysis (default: 100)

#### Defined in

[src/ExpoAudioStream.types.ts:266](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L266)

***

### showNotification?

> `optional` **showNotification**: `boolean`

Show a notification during recording (default is false)

#### Defined in

[src/ExpoAudioStream.types.ts:251](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L251)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

Show waveform in the notification (Android only, when showNotification is true)

#### Defined in

[src/ExpoAudioStream.types.ts:254](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L254)
