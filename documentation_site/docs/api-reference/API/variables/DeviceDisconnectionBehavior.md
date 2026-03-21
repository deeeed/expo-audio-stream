[**@siteed/audio-studio**](../README.md)

***

[@siteed/audio-studio](../README.md) / DeviceDisconnectionBehavior

# Variable: DeviceDisconnectionBehavior

> `const` **DeviceDisconnectionBehavior**: `object`

Defined in: [src/AudioStudio.types.ts:333](https://github.com/deeeed/audiolab/blob/290409aae8d1160e1952a5ee1961ce3864fbb0c8/packages/audio-studio/src/AudioStudio.types.ts#L333)

Defines how recording should behave when a device becomes unavailable

## Type declaration

### FALLBACK

> `readonly` **FALLBACK**: `"fallback"` = `'fallback'`

Switch to default device and continue recording

### PAUSE

> `readonly` **PAUSE**: `"pause"` = `'pause'`

Pause recording when device disconnects
