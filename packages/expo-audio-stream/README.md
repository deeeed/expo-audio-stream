# @siteed/expo-audio-stream

> ## ⚠️ Package Renamed
> 
> **This package has been renamed to [@siteed/expo-audio-studio](https://www.npmjs.com/package/@siteed/expo-audio-studio) to better reflect its expanded capabilities beyond just audio streaming.**
>
> While this package will continue to work as a compatibility wrapper, we recommend migrating to the new package name for future updates and improvements.
>
> ```bash
> # Install the new package
> npm install @siteed/expo-audio-studio
> 
> # or with yarn
> yarn add @siteed/expo-audio-studio
> ```
>
> **All imports should be updated from:**
> ```typescript
> import { ... } from '@siteed/expo-audio-stream';
> ```
> **To:**
> ```typescript
> import { ... } from '@siteed/expo-audio-studio';
> ```
>
> The API remains identical, so this is the only change required.

[![kandi X-Ray](https://kandi.openweaver.com/badges/xray.svg)](https://kandi.openweaver.com/typescript/siteed/expo-audio-stream)
[![Version](https://img.shields.io/npm/v/@siteed/expo-audio-stream.svg)](https://www.npmjs.com/package/@siteed/expo-audio-stream)
[![Dependency Status](https://img.shields.io/npm/dt/@siteed/expo-audio-stream.svg)](https://www.npmjs.com/package/@siteed/expo-audio-stream)
[![License](https://img.shields.io/npm/l/@siteed/expo-audio-stream.svg)](https://www.npmjs.com/package/@siteed/expo-audio-stream)

<div align="center">
  <p align="center">
    <strong>This package now serves as a compatibility wrapper for @siteed/expo-audio-studio.</strong>
  </p>

  <div style="display: flex; justify-content: center; gap: 20px; margin: 30px 0;">
    <div>
      <h3>iOS Demo</h3>
      <img src="../../docs/ios.gif" alt="iOS Demo" width="280" />
    </div>
    <div>
      <h3>Android Demo</h3>
      <img src="../../docs/android.gif" alt="Android Demo" width="280" />
    </div>
  </div>

  <a href="https://deeeed.github.io/expo-audio-stream/playground" style="text-decoration:none;">
    <div style="display:inline-block; padding:10px 20px; background-color:#007bff; color:white; border-radius:5px; font-size:16px;">
      Try it in the Playground
    </div>
  </a>
</div>

**Give it a GitHub star 🌟, if you found this repo useful.**
[![GitHub stars](https://img.shields.io/github/stars/deeeed/expo-audio-stream.svg?style=social&label=Star&maxAge=2592000)](https://github.com/deeeed/expo-audio-stream)

## Why the name change?

The library has evolved significantly beyond its initial focus on audio streaming. It now provides a comprehensive suite of audio tools including:

- Advanced audio recording capabilities
- Audio analysis and feature extraction
- Waveform visualization
- Audio trimming and manipulation
- Mel spectrogram generation
- And much more

The new name, "Audio Studio," better represents this expanded functionality as a complete audio processing toolkit.

## Migration

The migration process is simple:

1. Install the new package: `yarn add @siteed/expo-audio-studio`
2. Update your imports to use the new package name
3. That's it! The API remains identical

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<sub>Created by [Arthur Breton](https://siteed.net) • See more projects at [siteed.net](https://siteed.net)</sub>
