# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added

## [1.2.5] - 2024-11-12
### Added
- docs(license): add MIT license to all packages (6 files changed)
- fix(expo-audio-stream): return actual recording settings from startRecording on iOS #37

## [1.2.4] - 2024-11-05
### Changed
- Android minimum audio interval set to 10ms. 
- plugin setup do not include 'notification' config by default to prevent ios version mismatch.

### Fixed
- Remove frequently firing log statements on web.

## [1.2.0] - 2024-10-24
### Added
- Feature: Keep device awake during recording with `keepAwake` option
- Feature: Customizable recording notifications for Android and iOS
  - Android: Rich notification support with live waveform visualization
  - Android: Configurable notification actions, colors, and priorities
  - iOS: Integration with media player

## [1.1.17] - 2024-10-21
### Added
- Support bluetooth headset on ios
- Fixes: android not reading custom interval audio update

## [1.0.0] - 2024-04-01

### Added
- Initial release of @siteed/expo-audio-stream.
- Feature: Real-time audio streaming across iOS, Android, and web.
- Feature: Configurable intervals for audio buffer receipt.
- Feature: Automated microphone permissions setup in managed Expo projects.
- Feature: Background audio recording on iOS.
- Feature: Audio features extraction during recording.
- Feature: Consistent WAV PCM recording format across all platforms.

[Unreleased]: https://github.com/deeeed/expo-audio-stream/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/deeeed/expo-audio-stream/releases/tag/v1.0.0
