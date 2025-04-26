[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / RecordingConfig

# Interface: RecordingConfig

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:231](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L231)

=======
>>>>>>> origin/main
## Properties

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:288](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L288)

Whether to automatically resume recording after an interruption (default is false)

=======
Whether to automatically resume recording after an interruption (default is false)

#### Defined in

[src/ExpoAudioStream.types.ts:288](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L288)

>>>>>>> origin/main
***

### channels?

> `optional` **channels**: `1` \| `2`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:236](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L236)

Number of audio channels (1 for mono, 2 for stereo)

=======
Number of audio channels (1 for mono, 2 for stereo)

#### Defined in

[src/ExpoAudioStream.types.ts:236](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L236)

>>>>>>> origin/main
***

### compression?

> `optional` **compression**: `object`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:278](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L278)

=======
>>>>>>> origin/main
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

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:278](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L278)

>>>>>>> origin/main
***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:260](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L260)

Enable audio processing (default is false)

=======
Enable audio processing (default is false)

#### Defined in

[src/ExpoAudioStream.types.ts:260](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L260)

>>>>>>> origin/main
***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:239](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L239)

Encoding type for the recording (pcm_32bit, pcm_16bit, pcm_8bit)

=======
Encoding type for the recording (pcm_32bit, pcm_16bit, pcm_8bit)

#### Defined in

[src/ExpoAudioStream.types.ts:239](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L239)

>>>>>>> origin/main
***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:269](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L269)

Feature options to extract during audio processing

=======
Feature options to extract during audio processing

#### Defined in

[src/ExpoAudioStream.types.ts:269](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L269)

>>>>>>> origin/main
***

### filename?

> `optional` **filename**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:296](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L296)

Optional filename for the recording (uses UUID if not provided)

=======
Optional filename for the recording (uses UUID if not provided)

#### Defined in

[src/ExpoAudioStream.types.ts:296](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L296)

>>>>>>> origin/main
***

### interval?

> `optional` **interval**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:242](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L242)

Interval in milliseconds at which to emit recording data

=======
Interval in milliseconds at which to emit recording data

#### Defined in

[src/ExpoAudioStream.types.ts:242](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L242)

>>>>>>> origin/main
***

### intervalAnalysis?

> `optional` **intervalAnalysis**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:245](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L245)

Interval in milliseconds at which to emit analysis data

=======
Interval in milliseconds at which to emit analysis data

#### Defined in

[src/ExpoAudioStream.types.ts:245](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L245)

>>>>>>> origin/main
***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:263](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L263)

iOS-specific configuration

=======
iOS-specific configuration

#### Defined in

[src/ExpoAudioStream.types.ts:263](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L263)

>>>>>>> origin/main
***

### keepAwake?

> `optional` **keepAwake**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:248](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L248)

Keep the device awake while recording (default is false)

=======
Keep the device awake while recording (default is false)

#### Defined in

[src/ExpoAudioStream.types.ts:248](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L248)

>>>>>>> origin/main
***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:257](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L257)

Configuration for the notification

=======
Configuration for the notification

#### Defined in

[src/ExpoAudioStream.types.ts:257](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L257)

>>>>>>> origin/main
***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:275](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L275)

=======
>>>>>>> origin/main
Callback function to handle audio features extraction results

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:275](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L275)

>>>>>>> origin/main
***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:272](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L272)

=======
>>>>>>> origin/main
Callback function to handle audio stream data

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:272](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L272)

>>>>>>> origin/main
***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:291](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L291)

=======
>>>>>>> origin/main
Optional callback to handle recording interruptions

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:291](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L291)

>>>>>>> origin/main
***

### outputDirectory?

> `optional` **outputDirectory**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:294](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L294)

Optional directory path where output files will be saved

=======
Optional directory path where output files will be saved

#### Defined in

[src/ExpoAudioStream.types.ts:294](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L294)

>>>>>>> origin/main
***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:233](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L233)

Sample rate for recording in Hz (16000, 44100, or 48000)

=======
Sample rate for recording in Hz (16000, 44100, or 48000)

#### Defined in

[src/ExpoAudioStream.types.ts:233](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L233)

>>>>>>> origin/main
***

### segmentDurationMs?

> `optional` **segmentDurationMs**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:266](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L266)

Duration of each segment in milliseconds for analysis (default: 100)

=======
Duration of each segment in milliseconds for analysis (default: 100)

#### Defined in

[src/ExpoAudioStream.types.ts:266](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L266)

>>>>>>> origin/main
***

### showNotification?

> `optional` **showNotification**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:251](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L251)

Show a notification during recording (default is false)

=======
Show a notification during recording (default is false)

#### Defined in

[src/ExpoAudioStream.types.ts:251](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L251)

>>>>>>> origin/main
***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:254](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L254)

Show waveform in the notification (Android only, when showNotification is true)
=======
Show waveform in the notification (Android only, when showNotification is true)

#### Defined in

[src/ExpoAudioStream.types.ts:254](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L254)
>>>>>>> origin/main
