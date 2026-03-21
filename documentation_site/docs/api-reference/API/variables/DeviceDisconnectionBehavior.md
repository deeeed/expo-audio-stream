[**@siteed/audio-studio**](../README.md)

***

[@siteed/audio-studio](../README.md) / DeviceDisconnectionBehavior

# Variable: DeviceDisconnectionBehavior

> `const` **DeviceDisconnectionBehavior**: `object`

Defined in: [src/AudioStudio.types.ts:333](https://github.com/deeeed/audiolab/blob/04fe6f706d372e3ced0f83b796923c490bebd64d/packages/audio-studio/src/AudioStudio.types.ts#L333)

Defines how recording should behave when a device becomes unavailable

## Type declaration

### FALLBACK

> `readonly` **FALLBACK**: `"fallback"` = `'fallback'`

Switch to default device and continue recording

### PAUSE

> `readonly` **PAUSE**: `"pause"` = `'pause'`

Pause recording when device disconnects
