[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / WebRecordingOptions

# Interface: WebRecordingOptions

## Properties

### skipFinalConsolidation?

> `optional` **skipFinalConsolidation**: `boolean`

Web-specific option to skip the final audio data consolidation process.
When true, it will:
- Skip the time-consuming process of concatenating all audio chunks
- Return immediately with the compressed audio (if compression is enabled)
- Improve performance when stopping large recordings
- Useful when only the compressed audio is needed (e.g., when not using transcription)

#### Default

```ts
false
```

#### Defined in

[src/ExpoAudioStream.types.ts:252](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L252)
