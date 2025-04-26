[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / PreviewOptions

# Interface: PreviewOptions

<<<<<<< HEAD
Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:144](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L144)

=======
>>>>>>> origin/main
Options for generating a quick preview of audio waveform.
This is optimized for UI rendering with a specified number of points.

## Extends

- [`AudioRangeOptions`](AudioRangeOptions.md)

## Properties

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

<<<<<<< HEAD
Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:164](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L164)

=======
>>>>>>> origin/main
Optional configuration for decoding the audio file.
Defaults to:
- targetSampleRate: undefined (keep original)
- targetChannels: undefined (keep original)
- targetBitDepth: 16
- normalizeAudio: false

<<<<<<< HEAD
=======
#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:164](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L164)

>>>>>>> origin/main
***

### endTimeMs?

> `optional` **endTimeMs**: `number`

<<<<<<< HEAD
Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:137](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L137)

=======
>>>>>>> origin/main
End time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`endTimeMs`](AudioRangeOptions.md#endtimems)

<<<<<<< HEAD
=======
#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:137](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L137)

>>>>>>> origin/main
***

### fileUri

> **fileUri**: `string`

<<<<<<< HEAD
Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:146](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L146)

URI of the audio file to analyze

=======
URI of the audio file to analyze

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:146](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L146)

>>>>>>> origin/main
***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

<<<<<<< HEAD
Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:155](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L155)

Optional logger for debugging.

=======
Optional logger for debugging.

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:155](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L155)

>>>>>>> origin/main
***

### numberOfPoints?

> `optional` **numberOfPoints**: `number`

<<<<<<< HEAD
Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:151](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L151)

=======
>>>>>>> origin/main
Total number of points to generate for the preview.

#### Default

```ts
100
```

<<<<<<< HEAD
=======
#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:151](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L151)

>>>>>>> origin/main
***

### startTimeMs?

> `optional` **startTimeMs**: `number`

<<<<<<< HEAD
Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:135](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L135)

=======
>>>>>>> origin/main
Start time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`startTimeMs`](AudioRangeOptions.md#starttimems)
<<<<<<< HEAD
=======

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:135](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L135)
>>>>>>> origin/main
