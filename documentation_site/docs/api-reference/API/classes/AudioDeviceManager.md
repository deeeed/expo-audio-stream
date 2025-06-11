[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioDeviceManager

# Class: AudioDeviceManager

Defined in: [src/AudioDeviceManager.ts:78](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L78)

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

Defined in: [src/AudioDeviceManager.ts:96](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L96)

#### Parameters

##### options?

###### logger?

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

#### Returns

[`AudioDeviceManager`](AudioDeviceManager.md)

## Methods

### addDeviceChangeListener()

> **addDeviceChangeListener**(`listener`): () => `void`

Defined in: [src/AudioDeviceManager.ts:337](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L337)

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

Defined in: [src/AudioDeviceManager.ts:451](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L451)

Clean up timeouts and listeners (useful for testing or cleanup)

#### Returns

`void`

***

### forceRefreshDevices()

> **forceRefreshDevices**(): `Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Defined in: [src/AudioDeviceManager.ts:478](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L478)

Force refresh devices without debouncing (for device events)

#### Returns

`Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Promise resolving to the updated device list (AudioDevice[])

***

### getAvailableDevices()

> **getAvailableDevices**(`options`?): `Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Defined in: [src/AudioDeviceManager.ts:208](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L208)

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

Defined in: [src/AudioDeviceManager.ts:240](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L240)

Get the currently selected audio input device

#### Returns

`Promise`\<`null` \| [`AudioDevice`](../interfaces/AudioDevice.md)\>

Promise resolving to the current device (conforming to AudioDevice) or null

***

### getLogger()

> **getLogger**(): `undefined` \| [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/AudioDeviceManager.ts:199](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L199)

Get the current logger instance

#### Returns

`undefined` \| [`ConsoleLike`](../type-aliases/ConsoleLike.md)

The logger instance or undefined if not set

***

### getRawDevices()

> **getRawDevices**(): [`AudioDevice`](../interfaces/AudioDevice.md)[]

Defined in: [src/AudioDeviceManager.ts:436](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L436)

Get the raw device list (including temporarily disconnected devices)

#### Returns

[`AudioDevice`](../interfaces/AudioDevice.md)[]

Array of all available devices from native layer

***

### getTemporarilyDisconnectedDeviceIds()

> **getTemporarilyDisconnectedDeviceIds**(): `ReadonlySet`\<`string`\>

Defined in: [src/AudioDeviceManager.ts:444](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L444)

Get the IDs of temporarily disconnected devices

#### Returns

`ReadonlySet`\<`string`\>

Set of device IDs that are temporarily hidden from UI

***

### initializeDeviceDetection()

> **initializeDeviceDetection**(): `void`

Defined in: [src/AudioDeviceManager.ts:177](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L177)

Initialize or reinitialize device detection
Useful for restarting device detection if initial setup failed

#### Returns

`void`

***

### initWithLogger()

> **initWithLogger**(`logger`): [`AudioDeviceManager`](AudioDeviceManager.md)

Defined in: [src/AudioDeviceManager.ts:160](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L160)

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

Defined in: [src/AudioDeviceManager.ts:358](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L358)

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

Defined in: [src/AudioDeviceManager.ts:395](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L395)

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

Defined in: [src/AudioDeviceManager.ts:781](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L781)

Notify all registered listeners about device changes.

#### Returns

`void`

***

### refreshDevices()

> **refreshDevices**(): `Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Defined in: [src/AudioDeviceManager.ts:503](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L503)

Refresh the list of available devices with debouncing and notify listeners.

#### Returns

`Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

Promise resolving to the updated device list (AudioDevice[])

***

### resetToDefaultDevice()

> **resetToDefaultDevice**(): `Promise`\<`boolean`\>

Defined in: [src/AudioDeviceManager.ts:310](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L310)

Reset to the default audio input device

#### Returns

`Promise`\<`boolean`\>

Promise resolving to a boolean indicating success

***

### selectDevice()

> **selectDevice**(`deviceId`): `Promise`\<`boolean`\>

Defined in: [src/AudioDeviceManager.ts:274](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L274)

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

Defined in: [src/AudioDeviceManager.ts:169](https://github.com/deeeed/expo-audio-stream/blob/cf134fc47969a1847375db6ab9d66bb0b73aabc3/packages/expo-audio-studio/src/AudioDeviceManager.ts#L169)

Set the logger instance

#### Parameters

##### logger

[`ConsoleLike`](../type-aliases/ConsoleLike.md)

A logger instance that implements the ConsoleLike interface

#### Returns

`void`
