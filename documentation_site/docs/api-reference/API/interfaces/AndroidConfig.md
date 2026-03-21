[**@siteed/audio-studio**](../README.md)

***

[@siteed/audio-studio](../README.md) / AndroidConfig

# Interface: AndroidConfig

Defined in: [src/AudioStudio.types.ts:254](https://github.com/deeeed/audiolab/blob/04fe6f706d372e3ced0f83b796923c490bebd64d/packages/audio-studio/src/AudioStudio.types.ts#L254)

Android platform specific configuration options

## Properties

### audioFocusStrategy?

> `optional` **audioFocusStrategy**: `"background"` \| `"interactive"` \| `"communication"` \| `"none"`

Defined in: [src/AudioStudio.types.ts:265](https://github.com/deeeed/audiolab/blob/04fe6f706d372e3ced0f83b796923c490bebd64d/packages/audio-studio/src/AudioStudio.types.ts#L265)

Audio focus strategy for handling interruptions and background behavior

- `'background'`: Continue recording when app loses focus (voice recorders, transcription apps)
- `'interactive'`: Pause when losing focus, resume when gaining (music apps, games)
- `'communication'`: Maintain priority for real-time communication (video calls, voice chat)
- `'none'`: No automatic audio focus management (custom handling)

#### Default

```ts
'background' when keepAwake=true, 'interactive' otherwise
```
