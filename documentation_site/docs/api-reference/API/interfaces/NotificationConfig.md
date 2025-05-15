[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / NotificationConfig

# Interface: NotificationConfig

Defined in: [src/ExpoAudioStream.types.ts:375](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L375)

## Properties

### android?

> `optional` **android**: `object`

Defined in: [src/ExpoAudioStream.types.ts:386](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L386)

Android-specific notification configuration

#### accentColor?

> `optional` **accentColor**: `string`

Accent color for the notification (used for the app icon and buttons)

#### actions?

> `optional` **actions**: [`NotificationAction`](NotificationAction.md)[]

List of actions that can be performed from the notification

#### channelDescription?

> `optional` **channelDescription**: `string`

User-visible description of the notification channel

#### channelId?

> `optional` **channelId**: `string`

Unique identifier for the notification channel

#### channelName?

> `optional` **channelName**: `string`

User-visible name of the notification channel

#### lightColor?

> `optional` **lightColor**: `string`

Color of the notification LED (if device supports it)

#### notificationId?

> `optional` **notificationId**: `number`

Unique identifier for this notification

#### priority?

> `optional` **priority**: `"default"` \| `"min"` \| `"low"` \| `"high"` \| `"max"`

Priority of the notification (affects how it's displayed)

#### waveform?

> `optional` **waveform**: [`WaveformConfig`](WaveformConfig.md)

Configuration for the waveform visualization in the notification

***

### icon?

> `optional` **icon**: `string`

Defined in: [src/ExpoAudioStream.types.ts:383](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L383)

Icon to be displayed in the notification (resource name or URI)

***

### ios?

> `optional` **ios**: `object`

Defined in: [src/ExpoAudioStream.types.ts:416](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L416)

iOS-specific notification configuration

#### categoryIdentifier?

> `optional` **categoryIdentifier**: `string`

Identifier for the notification category (used for grouping similar notifications)

***

### text?

> `optional` **text**: `string`

Defined in: [src/ExpoAudioStream.types.ts:380](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L380)

Main text content of the notification

***

### title?

> `optional` **title**: `string`

Defined in: [src/ExpoAudioStream.types.ts:377](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L377)

Title of the notification
