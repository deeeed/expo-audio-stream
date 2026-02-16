# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]


## [1.7.0] - 2026-02-16

### Added
- Properly emit final chunk of audio data on Android (#293)
- Improved memory monitoring

### Changed
- Upgrade to Expo SDK 54 (React Native 0.81, React 19.1) (#305)


## [1.6.0] - 2025-07-31

### Added
- implement comprehensive Storybook setup for React Native and Web
- upgrade Storybook to v9.0.8 and establish UI development (#273)

### Changed
- release 0.7.0
- update api references for v2.17.0
- release @siteed/expo-audio-studio@2.17.0
- update api references for v2.16.2
- release @siteed/expo-audio-studio@2.16.2
- release @siteed/expo-audio-studio@2.16.1
- lockfile update
- update api references for v2.16.0
- release @siteed/expo-audio-studio@2.16.0
- update expo and expo-router versions in package.json and yarn.lock to 53.0.20 and 5.1.4 respectively
- update api references for v2.15.0
- release @siteed/expo-audio-studio@2.15.0
- update api references for v2.14.9
- release @siteed/expo-audio-studio@2.14.9
- release @siteed/expo-audio-studio@2.14.8
- release @siteed/expo-audio-studio@2.14.7
- release @siteed/expo-audio-studio@2.14.6
- release @siteed/expo-audio-studio@2.14.5
- release @siteed/expo-audio-studio@2.14.4
- add mandatory TypeScript validation to agent memory system
- add AI agent memory system to prevent implementation mistakes
- lockfile update
- update api references for v2.14.3
- release @siteed/expo-audio-studio@2.14.3
- update to latest expo
- changelog
- remove analysis bit depth logging for cleaner debug output
- release 0.6.0

### Fixed
- fix OutOfMemoryError by tracking stream position correctly
-  fix(expo-audio-studio): fix Android audio analysis accumulation showing 0 bytes
- resolve Storybook bundling conflicts in normal app mode
- resolve TypeScript Jest globals errors in Storybook validation test


## [1.5.1] - 2025-06-11

### Changed
- release @siteed/expo-audio-studio@2.14.2
- add performance and file size documentation
- add file size collection e2e tests
- remove invalid detox values

### Fixed
- Fix duration returning 0 when primary output is disabled (#244)


## [1.5.0] - 2025-06-11

### Added
- implement native integration testing framework for sherpa-onnx.rn (#252)

### Changed
- release @siteed/expo-audio-studio@2.14.0

### Fixed
- invalid type exports
- audio focus strategy implementation for Android background recording (#267)
- docs: fix comment formatting in OutputConfig interface for clarity
- fix iOS TurboModule architecture compatibility (#254)
- prevent UninitializedPropertyAccessException crash in developer menu (#250)
- return compression info when primary output is disabled (issue #244) (#249)
- Buffer size calculation and document duplicate emission fix for … (#248)


## [1.4.0] - 2025-05-26

### Added
- update @siteed/design-system to version 0.51.0 and refactor recording configuration (#245)

### Changed
- enhance contribution guidelines with Test-Driven Development practices



## [1.3.0] - 2025-05-15

### Added
- Add Web Audio Test Page and Enhance Audio Chunk Handling (#240)
- clean up redundant code and improve stability (#238)

### Changed
- update api references for v2.9.0
- release @siteed/expo-audio-studio@2.9.0
- remove unused compression logic and clean up blob creation
- update bug report template to remove default label and add stale issue workflow
- create version.h file for Essentia versioning
- update logging instructions for AudioRecorderProvider setup
- mark native code quality improvement as complete
- release @siteed/expo-audio-studio@2.8.6
- update Android module configuration and prevent plugin conflicts
- release @siteed/expo-audio-studio@2.8.5
- remove exports field from package.json
- lockfile update
- release @siteed/expo-audio-studio@2.8.4
- update deps
- add custom config plugin to set Metro server port
- roadmap
- remove unused dependencies
- enhance bug report template with required fields and validation workflow
- release @siteed/expo-audio-studio@2.8.3
- update plugin configuration to use ESM format and streamline build process
- release @siteed/expo-audio-studio@2.8.2
- update TypeScript configurations for dual module support and enhance CommonJS compatibility
- release @siteed/expo-audio-studio@2.8.1
- bump expo version to 53.0.7 in package.json and yarn.lock
- update EAS configuration for Android build and add local production build script


## [1.2.0] - 2025-05-04

### Changed
- add Git LFS setup scripts and contributing guidelines for ONNX model management
- update dependencies for expo, react, and react-native to latest versions; enhance rollup configuration

## [1.0.1] - 2025-05-04

### Changed
- add debugging instructions for Audio Playground on Android and iOS

### Fixed
- improve thread safety and resource management in AudioNotificationManager and AudioStreamManager
- Enhance iOS Background Audio Recording and Audio Format Conversion (#228)


## [1.0.0] - 2025-05-03

### Added
- prepare expo plugin for expo 53 update (#225)
- Update AudioPlayground branding and enhance app distribution (#224)

### Changed
- update api references for v2.6.3
- release @siteed/expo-audio-studio@2.6.3


## [0.12.3] - 2025-05-02

### Changed
- add Prettier, update linting, and introduce cleanup scripts (#222)

## [0.12.2] - 2025-05-02

### Changed
- implement changelog management in deployment script and add changelog helper script for better version tracking

## [0.12.1] - 2053-05-02

### Added
- Initial release of AudioPlayground
- Core audio recording and playback functionality
- Basic UI for audio controls
- Support for iOS and Android platforms
- Web export capability












[unreleased]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@1.7.0...HEAD
[1.7.0]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@1.6.0...audio-playground@1.7.0
[1.6.0]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@1.5.1...audio-playground@1.6.0
[1.5.1]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@1.5.0...audio-playground@1.5.1
[1.5.0]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@1.4.0...audio-playground@1.5.0
[1.4.0]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@1.3.0...audio-playground@1.4.0
[1.3.0]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@1.2.0...audio-playground@1.3.0
[1.2.0]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@1.0.1...audio-playground@1.2.0
[1.0.1]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@1.0.0...audio-playground@1.0.1
[1.0.0]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@0.12.3...audio-playground@1.0.0
[0.12.3]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@0.12.2...audio-playground@0.12.3
[0.12.2]: https://github.com/deeeed/expo-audio-stream/compare/audio-playground@0.12.1...audio-playground@0.12.2
[0.12.1]: https://github.com/deeeed/expo-audio-stream/releases/tag/audio-playground@0.12.1
