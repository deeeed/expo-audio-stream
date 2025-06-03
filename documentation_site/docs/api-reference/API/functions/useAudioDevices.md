[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / useAudioDevices

# Function: useAudioDevices()

> **useAudioDevices**(): `object`

Defined in: [src/hooks/useAudioDevices.ts:9](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/hooks/useAudioDevices.ts#L9)

React hook for managing audio input devices

## Returns

`object`

### currentDevice

> **currentDevice**: `null` \| [`AudioDevice`](../interfaces/AudioDevice.md)

### devices

> **devices**: [`AudioDevice`](../interfaces/AudioDevice.md)[]

### error

> **error**: `null` \| `Error`

### loading

> **loading**: `boolean`

### refreshDevices()

> **refreshDevices**: () => `Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

#### Returns

`Promise`\<[`AudioDevice`](../interfaces/AudioDevice.md)[]\>

### resetToDefaultDevice()

> **resetToDefaultDevice**: () => `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>

### selectDevice()

> **selectDevice**: (`deviceId`) => `Promise`\<`boolean`\>

#### Parameters

##### deviceId

`string`

#### Returns

`Promise`\<`boolean`\>
