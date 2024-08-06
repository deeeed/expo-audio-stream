---
id: installation
title: Installation
sidebar_label: Installation
---

# Installation

## Installalling the library

To install `@siteed/expo-audio-stream`, add it to your project using npm or Yarn:

```bash
npm install @siteed/expo-audio-stream
# or
yarn add @siteed/expo-audio-stream
```

## Configuring with app.json

To ensure expo-audio-stream works correctly with Expo, you must add it as a plugin in your app.json configuration file.

```json
{
    "expo": {
        "plugins": ["@siteed/expo-audio-stream"]
    }
}
```

Make sure to run `npx expo prebuild` after adding the plugin to your app.json file.

## Requesting Permissions

To request microphone permissions in your Expo project, you can use the following method:

```tsx
import {
    ExpoAudioStreamModule,
} from '@siteed/expo-audio-stream'

const requestPermissions = async () => {
    const { granted } =
        await ExpoAudioStreamModule.requestPermissionsAsync()
    if (granted) {
        console.log('Microphone permissions granted')
    } else {
        console.log('Microphone permissions denied')
    }
}

requestPermissions();
```
