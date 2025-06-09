[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioDeviceManager

# Class: AudioDeviceManager

Defined in: [src/AudioDeviceManager.ts:78](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L78)

Class that provides a cross-platform API for managing audio input devices

EVENT API SPECIFICATION:
========================

Device Events (deviceChangedEvent):
```
{
  type: "deviceConnected" | "deviceDisconnected",
  deviceId: string
}
```

Recording Interruption Events (recordingInterruptedEvent):
```
{
  reason: "userPaused" | "userResumed" | "audioFocusLoss" | "audioFocusGain" |
          "deviceFallback" | "deviceSwitchFailed" | "phoneCall" | "phoneCallEnded",
  isPaused: boolean,
  timestamp: number
}
```

NOTE: Device events use "type" field, interruption events use "reason" field.
This is intentional to distinguish between different event categories.

## Constructors

### new AudioDeviceManager()

> **new AudioDeviceManager**(`options`?): [`AudioDeviceManager`](AudioDeviceManager.md)

Defined in: [src/AudioDeviceManager.ts:95](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L95)

#### Parameters

##### options?

###### logger?

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

#### Returns

[`AudioDeviceManager`](AudioDeviceManager.md)

## Methods

### addDeviceChangeListener()

> **addDeviceChangeListener**(`listener`): () => `void`

Defined in: [src/AudioDeviceManager.ts:336](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L336)

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

### cleanup()

> **cleanup**(): `void`

Defined in: [src/AudioDeviceManager.ts:450](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L450)

Clean up timeouts and listeners (useful for testing or cleanup)

#### Returns

`void`

***

### forceRefreshDevices()

> **forceRefreshDevices**(): `Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Defined in: [src/AudioDeviceManager.ts:477](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L477)

Force refresh devices without debouncing (for device events)

#### Returns

`Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Promise resolving to the updated device list (AudioDevice[])

***

### getAvailableDevices()

> **getAvailableDevices**(`options`?): `Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Defined in: [src/AudioDeviceManager.ts:207](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L207)

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

Defined in: [src/AudioDeviceManager.ts:239](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L239)

Get the currently selected audio input device

#### Returns

`Promise`\<`null` \| [`AudioDevice`](../interfaces/AudioDevice.md)\>

Promise resolving to the current device (conforming to AudioDevice) or null

***

### getLogger()

> **getLogger**(): `undefined` \| [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/AudioDeviceManager.ts:198](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L198)

Get the current logger instance

#### Returns

`undefined` \| [`ConsoleLike`](../type-aliases/ConsoleLike.md)

The logger instance or undefined if not set

***

### getRawDevices()

> **getRawDevices**(): [`AudioDevice`](../interfaces/AudioDevice.md)[]

Defined in: [src/AudioDeviceManager.ts:435](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L435)

Get the raw device list (including temporarily disconnected devices)

#### Returns

[`AudioDevice`](../interfaces/AudioDevice.md)[]

Array of all available devices from native layer

***

### getTemporarilyDisconnectedDeviceIds()

> **getTemporarilyDisconnectedDeviceIds**(): `ReadonlySet`\<`string`\>

Defined in: [src/AudioDeviceManager.ts:443](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L443)

Get the IDs of temporarily disconnected devices

#### Returns

`ReadonlySet`\<`string`\>

Set of device IDs that are temporarily hidden from UI

***

### initializeDeviceDetection()

> **initializeDeviceDetection**(): `void`

Defined in: [src/AudioDeviceManager.ts:176](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L176)

Initialize or reinitialize device detection
Useful for restarting device detection if initial setup failed

#### Returns

`void`

***

### initWithLogger()

> **initWithLogger**(`logger`): [`AudioDeviceManager`](AudioDeviceManager.md)

Defined in: [src/AudioDeviceManager.ts:159](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L159)

Initialize the device manager with a logger

#### Parameters

##### logger

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

A logger instance that implements the ConsoleLike interface

#### Returns

[`AudioDeviceManager`](AudioDeviceManager.md)

The manager instance for chaining

***

### markDeviceAsDisconnected()

> **markDeviceAsDisconnected**(`deviceId`, `notify`): `void`

Defined in: [src/AudioDeviceManager.ts:357](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L357)

Mark a device as temporarily disconnected (for UI filtering)

#### Parameters

##### deviceId

`string`

The ID of the device that was disconnected

##### notify

`boolean` = `true`

Whether to notify listeners immediately (default: true)

#### Returns

`void`

***

### markDeviceAsReconnected()

> **markDeviceAsReconnected**(`deviceId`): `void`

Defined in: [src/AudioDeviceManager.ts:394](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L394)

Mark a device as reconnected (remove from disconnected set)

#### Parameters

##### deviceId

`string`

The ID of the device that was reconnected

#### Returns

`void`

***

### notifyListeners()

> **notifyListeners**(): `void`

Defined in: [src/AudioDeviceManager.ts:780](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L780)

Notify all registered listeners about device changes.

#### Returns

`void`

***

### refreshDevices()

> **refreshDevices**(): `Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Defined in: [src/AudioDeviceManager.ts:502](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L502)

Refresh the list of available devices with debouncing and notify listeners.

#### Returns

`Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Promise resolving to the updated device list (AudioDevice[])

***

### resetToDefaultDevice()

> **resetToDefaultDevice**(): `Promise`\<`boolean`\>

Defined in: [src/AudioDeviceManager.ts:309](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L309)

Reset to the default audio input device

#### Returns

`Promise`\<`boolean`\>

Promise resolving to a boolean indicating success

***

### selectDevice()

> **selectDevice**(`deviceId`): `Promise`\<`boolean`\>

Defined in: [src/AudioDeviceManager.ts:273](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L273)

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

Defined in: [src/AudioDeviceManager.ts:168](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioDeviceManager.ts#L168)

Set the logger instance

#### Parameters

##### logger

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

A logger instance that implements the ConsoleLike interface

#### Returns

`void`
