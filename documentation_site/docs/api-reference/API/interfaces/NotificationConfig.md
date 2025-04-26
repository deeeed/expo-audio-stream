[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / NotificationConfig

# Interface: NotificationConfig

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:299](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L299)

=======
>>>>>>> origin/main
## Properties

### android?

> `optional` **android**: `object`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:310](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L310)

=======
>>>>>>> origin/main
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

> `optional` **priority**: `"min"` \| `"low"` \| `"default"` \| `"high"` \| `"max"`

Priority of the notification (affects how it's displayed)

#### waveform?

> `optional` **waveform**: [`WaveformConfig`](WaveformConfig.md)

Configuration for the waveform visualization in the notification

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:310](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L310)

>>>>>>> origin/main
***

### icon?

> `optional` **icon**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:307](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L307)

Icon to be displayed in the notification (resource name or URI)

=======
Icon to be displayed in the notification (resource name or URI)

#### Defined in

[src/ExpoAudioStream.types.ts:307](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L307)

>>>>>>> origin/main
***

### ios?

> `optional` **ios**: `object`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:340](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L340)

=======
>>>>>>> origin/main
iOS-specific notification configuration

#### categoryIdentifier?

> `optional` **categoryIdentifier**: `string`

Identifier for the notification category (used for grouping similar notifications)

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:340](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L340)

>>>>>>> origin/main
***

### text?

> `optional` **text**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:304](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L304)

Main text content of the notification

=======
Main text content of the notification

#### Defined in

[src/ExpoAudioStream.types.ts:304](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L304)

>>>>>>> origin/main
***

### title?

> `optional` **title**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:301](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L301)

Title of the notification
=======
Title of the notification

#### Defined in

[src/ExpoAudioStream.types.ts:301](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L301)
>>>>>>> origin/main
