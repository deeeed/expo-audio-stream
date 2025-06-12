[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AndroidConfig

# Interface: AndroidConfig

Defined in: [src/ExpoAudioStream.types.ts:242](https://github.com/deeeed/expo-audio-stream/blob/e496f5dd1024dfffefc22b133ee7e25a9e09a3b7/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L242)

Android platform specific configuration options

## Properties

### audioFocusStrategy?

> `optional` **audioFocusStrategy**: `"background"` \| `"interactive"` \| `"communication"` \| `"none"`

Defined in: [src/ExpoAudioStream.types.ts:253](https://github.com/deeeed/expo-audio-stream/blob/e496f5dd1024dfffefc22b133ee7e25a9e09a3b7/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L253)

Audio focus strategy for handling interruptions and background behavior

- `'background'`: Continue recording when app loses focus (voice recorders, transcription apps)
- `'interactive'`: Pause when losing focus, resume when gaining (music apps, games)
- `'communication'`: Maintain priority for real-time communication (video calls, voice chat)
- `'none'`: No automatic audio focus management (custom handling)

#### Default

```ts
'background' when keepAwake=true, 'interactive' otherwise
```
