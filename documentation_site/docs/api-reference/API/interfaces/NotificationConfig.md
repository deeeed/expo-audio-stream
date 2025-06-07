[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / NotificationConfig

# Interface: NotificationConfig

Defined in: [src/ExpoAudioStream.types.ts:444](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L444)

## Properties

### android?

> `optional` **android**: `object`

Defined in: [src/ExpoAudioStream.types.ts:455](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L455)

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

Defined in: [src/ExpoAudioStream.types.ts:452](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L452)

Icon to be displayed in the notification (resource name or URI)

***

### ios?

> `optional` **ios**: `object`

Defined in: [src/ExpoAudioStream.types.ts:485](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L485)

iOS-specific notification configuration

#### categoryIdentifier?

> `optional` **categoryIdentifier**: `string`

Identifier for the notification category (used for grouping similar notifications)

***

### text?

> `optional` **text**: `string`

Defined in: [src/ExpoAudioStream.types.ts:449](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L449)

Main text content of the notification

***

### title?

> `optional` **title**: `string`

Defined in: [src/ExpoAudioStream.types.ts:446](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L446)

Title of the notification
