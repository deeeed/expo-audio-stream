[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioDeviceManager

# Class: AudioDeviceManager

Defined in: [src/AudioDeviceManager.ts:54](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L54)

Class that provides a cross-platform API for managing audio input devices

## Constructors

### new AudioDeviceManager()

> **new AudioDeviceManager**(`options`?): [`AudioDeviceManager`](AudioDeviceManager.md)

Defined in: [src/AudioDeviceManager.ts:66](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L66)

#### Parameters

##### options?

###### logger?

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

#### Returns

[`AudioDeviceManager`](AudioDeviceManager.md)

## Methods

### addDeviceChangeListener()

> **addDeviceChangeListener**(`listener`): () => `void`

Defined in: [src/AudioDeviceManager.ts:265](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L265)

Register a listener for device changes

#### Parameters

##### listener

(`devices`) => `void`

Function to call when devices change (receives AudioDevice[])

#### Returns

`Function`

Function to remove the listener

##### Returns

`void`

***

### getAvailableDevices()

> **getAvailableDevices**(`options`?): `Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Defined in: [src/AudioDeviceManager.ts:136](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L136)

Get all available audio input devices

#### Parameters

##### options?

Optional settings to force refresh the device list. Can include a refresh flag.

###### refresh?

`boolean`

#### Returns

`Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Promise resolving to an array of audio devices conforming to AudioDevice interface

***

### getCurrentDevice()

> **getCurrentDevice**(): `Promise`\<`null` \| [`AudioDevice`](../interfaces/AudioDevice.md)\>

Defined in: [src/AudioDeviceManager.ts:168](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L168)

Get the currently selected audio input device

#### Returns

`Promise`\<`null` \| [`AudioDevice`](../interfaces/AudioDevice.md)\>

Promise resolving to the current device (conforming to AudioDevice) or null

***

### initWithLogger()

> **initWithLogger**(`logger`): [`AudioDeviceManager`](AudioDeviceManager.md)

Defined in: [src/AudioDeviceManager.ts:118](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L118)

Initialize the device manager with a logger

#### Parameters

##### logger

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

A logger instance that implements the ConsoleLike interface

#### Returns

[`AudioDeviceManager`](AudioDeviceManager.md)

The manager instance for chaining

***

### refreshDevices()

> **refreshDevices**(): `Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Defined in: [src/AudioDeviceManager.ts:285](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L285)

Refresh the list of available devices with debouncing and notify listeners.

#### Returns

`Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Promise resolving to the updated device list (AudioDevice[])

***

### resetToDefaultDevice()

> **resetToDefaultDevice**(): `Promise`\<`boolean`\>

Defined in: [src/AudioDeviceManager.ts:238](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L238)

Reset to the default audio input device

#### Returns

`Promise`\<`boolean`\>

Promise resolving to a boolean indicating success

***

### selectDevice()

> **selectDevice**(`deviceId`): `Promise`\<`boolean`\>

Defined in: [src/AudioDeviceManager.ts:202](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L202)

Select a specific audio input device for recording

#### Parameters

##### deviceId

`string`

The ID of the device to select

#### Returns

`Promise`\<`boolean`\>

Promise resolving to a boolean indicating success

***

### setLogger()

> **setLogger**(`logger`): `void`

Defined in: [src/AudioDeviceManager.ts:127](https://github.com/deeeed/expo-audio-stream/blob/fc32bf3efef3f8f402e17ca4f3940494e467e904/packages/expo-audio-studio/src/AudioDeviceManager.ts#L127)

Set the logger instance

#### Parameters

##### logger

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

A logger instance that implements the ConsoleLike interface

#### Returns

`void`
