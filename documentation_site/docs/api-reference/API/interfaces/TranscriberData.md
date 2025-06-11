[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TranscriberData

# Interface: TranscriberData

Defined in: [src/ExpoAudioStream.types.ts:115](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L115)

## Properties

### chunks

> **chunks**: [`Chunk`](Chunk.md)[]

Defined in: [src/ExpoAudioStream.types.ts:127](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L127)

Array of transcribed text chunks with timestamps

***

### endTime

> **endTime**: `number`

Defined in: [src/ExpoAudioStream.types.ts:125](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L125)

End time of the transcription in milliseconds

***

### id

> **id**: `string`

Defined in: [src/ExpoAudioStream.types.ts:117](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L117)

Unique identifier for the transcription

***

### isBusy

> **isBusy**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:119](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L119)

Indicates if the transcriber is currently processing

***

### startTime

> **startTime**: `number`

Defined in: [src/ExpoAudioStream.types.ts:123](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L123)

Start time of the transcription in milliseconds

***

### text

> **text**: `string`

Defined in: [src/ExpoAudioStream.types.ts:121](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L121)

Complete transcribed text
