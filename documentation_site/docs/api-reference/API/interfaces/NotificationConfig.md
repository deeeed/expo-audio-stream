[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / NotificationConfig

# Interface: NotificationConfig

Defined in: [src/ExpoAudioStream.types.ts:489](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L489)

## Properties

### android?

> `optional` **android**: `object`

Defined in: [src/ExpoAudioStream.types.ts:500](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L500)

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

#### showPauseResumeActions?

> `optional` **showPauseResumeActions**: `boolean`

Whether to show pause/resume actions in the notification (default: true)

#### waveform?

> `optional` **waveform**: [`WaveformConfig`](WaveformConfig.md)

Configuration for the waveform visualization in the notification

***

### icon?

> `optional` **icon**: `string`

Defined in: [src/ExpoAudioStream.types.ts:497](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L497)

Icon to be displayed in the notification (resource name or URI)

***

### ios?

> `optional` **ios**: `object`

Defined in: [src/ExpoAudioStream.types.ts:533](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L533)

iOS-specific notification configuration

#### categoryIdentifier?

> `optional` **categoryIdentifier**: `string`

Identifier for the notification category (used for grouping similar notifications)

***

### text?

> `optional` **text**: `string`

Defined in: [src/ExpoAudioStream.types.ts:494](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L494)

Main text content of the notification

***

### title?

> `optional` **title**: `string`

Defined in: [src/ExpoAudioStream.types.ts:491](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L491)

Title of the notification
