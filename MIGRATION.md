# Migration Guide

## Repo Rename: `expo-audio-stream` → `audio-suite`

This monorepo has been renamed from `expo-audio-stream` to `audio-suite` to better reflect its scope.
GitHub automatically redirects all old URLs, so existing links and git remotes will continue to work.

---

## Package Renames

### `@siteed/expo-audio-studio` → `@siteed/audio-studio`

The main audio processing package has been renamed. The old package is still published as a **compatibility shim** — it re-exports everything from `@siteed/audio-studio` so existing projects keep working. However, you should migrate at your earliest convenience as the shim will stop receiving updates eventually.

**Migrate:**

```bash
# Remove old package
yarn remove @siteed/expo-audio-studio

# Install new package
yarn add @siteed/audio-studio
```

Then update your imports:

```ts
// Before
import { AudioRecorder, useAudioRecorder } from '@siteed/expo-audio-studio'

// After
import { AudioRecorder, useAudioRecorder } from '@siteed/audio-studio'
```

No other changes required — the API is identical.

---

### `expo-audio-stream` → `@siteed/audio-stream`

The lightweight streaming package has been republished under the `@siteed` scope.
The old unscoped package (`expo-audio-stream`) is no longer maintained.

```bash
yarn remove expo-audio-stream
yarn add @siteed/audio-stream
```

---

### `expo-audio-ui` → `@siteed/audio-ui`

```bash
yarn remove expo-audio-ui
yarn add @siteed/audio-ui
```

---

## No Breaking API Changes

All package renames are cosmetic — the APIs, types, and native module behavior are unchanged.
If you encounter any issues after migrating, please [open an issue](https://github.com/deeeed/audio-suite/issues).

---

## Why the Rename?

What started as a simple audio streaming library for Expo has grown into a full audio processing SDK:

- **`@siteed/audio-stream`** — lightweight cross-platform audio streaming
- **`@siteed/audio-studio`** — full audio processing: recording, analysis, waveform, trimming, transcription
- **`@siteed/audio-ui`** — UI components: waveform visualizer, spectrogram, audio player
- **`react-native-essentia`** — audio feature extraction (MFCC, mel-spectrogram, etc.)
- **`sherpa-onnx.rn`** — on-device speech recognition & TTS via Sherpa-ONNX

The name `audio-suite` captures this better. The "expo" prefix is also being phased out as the packages work with bare React Native projects.
