# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [1.17.0] - 2025-02-18
### Changed
- feat(web): add audio interval analysis ([281b7e6](https://github.com/deeeed/expo-audio-stream/commit/281b7e6b1136afe0569450a9d1e3d5f01da7af28))
- feat(android): implement interval visualization android ([7e9678e](https://github.com/deeeed/expo-audio-stream/commit/7e9678e23b82d8fd3d032fb1d802c925dcff254a))
- feat(playground): implement intervalAnalysis and validate iOS settings (#126) ([3d35adf](https://github.com/deeeed/expo-audio-stream/commit/3d35adfcc68593c39a72a5e72b7ddf1e6ce6f1fd))
- feat(ios): Make it possible to set a different interval for the audio analysis (#125) ([10a914e](https://github.com/deeeed/expo-audio-stream/commit/10a914e853deb66f9c3dec1845cab4cfcd34c6da))
## [1.16.0] - 2025-02-17
### Changed
- fix(expo-audio-stream): prevent adding iOS background modes when disabled ([5c9d09c](https://github.com/deeeed/expo-audio-stream/commit/5c9d09c715ce008fe72177431224a10f5fd7a865))
- fix(ios): replace CallKit with AVAudioSession for phone call detection ([e3b664b](https://github.com/deeeed/expo-audio-stream/commit/e3b664ba6925c379b323ded5fc408154e5f092c6))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.15.1 ([cbc3d10](https://github.com/deeeed/expo-audio-stream/commit/cbc3d10661a415811f1fe46cb3acaf63451a9df9))
## [1.15.1] - 2025-02-17
### Changed
- fix: restore Opus compression support on iOS (#122) ([06614e6](https://github.com/deeeed/expo-audio-stream/commit/06614e6d96fa2a6af56edf0fd2e2b3966e13c8f7))
- feat: dont block while emitting audio analysis ([01d91d1](https://github.com/deeeed/expo-audio-stream/commit/01d91d1504ccda8ad3569980c79fcf4ae4526a76))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.15.0 ([f94c601](https://github.com/deeeed/expo-audio-stream/commit/f94c6016ba4ce968cafbf68644199405f5991d7f))
## [1.15.0] - 2025-02-15
### Changed
- fix(ios): improve audio recording interruption handling and auto-resume functionality (#119) ([7767dff](https://github.com/deeeed/expo-audio-stream/commit/7767dff09c7c8d2f2dc8558d24fd2419cb981f4d))
- fix(android): improve background recording and call interruption handling (#118) ([bf19fe9](https://github.com/deeeed/expo-audio-stream/commit/bf19fe92cadbcc080c27a8aa06ba9a2f6ca841b0))
## [1.14.2] - 2025-02-13
- fix: update STOP action to clear recording metadata ([3484f76](https://github.com/deeeed/expo-audio-stream/commit/3484f76331c0cc83e2384dd18a7f4555f5c5ce8d))
## [1.14.1] - 2025-02-12
- fix: enable background recording by default and improve audio playground (#114) ([2f60d5e](https://github.com/deeeed/expo-audio-stream/commit/2f60d5edd96ea6d0db7cf35614bc12dcd8d9c6ed))
## [1.14.0] - 2025-02-12
- fix: keepAwake issue on ios and auto resume after call (#113) ([ed8e184](https://github.com/deeeed/expo-audio-stream/commit/ed8e184c23ba26973cc9f716e1506d4d7ac4a73d))
## [1.13.2] - 2025-02-10
- fix: ensure foreground service starts within required timeframe ([60dad52](https://github.com/deeeed/expo-audio-stream/commit/60dad5237c11b9a60e6239701317d52c56625d6e))
## [1.13.1] - 2025-02-10
- readme update with latest demos
## [1.13.0] - 2025-02-09
- Audiodecode (#104) ([173f589](https://github.com/deeeed/expo-audio-stream/commit/173f589ebe8763f7361088d150bba1d4bd2c4154))
- fix: resolve background recording issues and improve status checking (#103) ([a174d50](https://github.com/deeeed/expo-audio-stream/commit/a174d50932b2ee4682f4bd6edb3eaa9a7d579bfc))
## [1.12.3] - 2025-02-08
- fix: infinite rerender issue ([54a6a84](https://github.com/deeeed/expo-audio-stream/commit/54a6a8414688c9fbf897c56503c0091dcaf55e26))
## [1.12.1] - 2025-02-01
- fix: improve audio recording interruption handling and consistency (#98) ([0fd5a146](https://github.com/deeeed/expo-audio-stream/pull/98))
## [1.12.0] - 2025-01-31
- feat: add call state checks before starting or resuming recording (#94) ([63e70a0](https://github.com/deeeed/expo-audio-stream/commit/63e70a09f70dd8e5798094b360cf7ec8de1275e9))
- feat: add custom filename and directory support for audio recordings (#92) ([2f30f9d](https://github.com/deeeed/expo-audio-stream/commit/2f30f9db2558c456f93f31b79b01cd54a57f392b))
- feat: enhance compressed recording info with file size (#90) ([47254aa](https://github.com/deeeed/expo-audio-stream/commit/47254aa8cb3ae1c01138ebebce1c1d8c65afd794))
## [1.11.3] - 2025-01-25
- disable duplicate notification alerts for audio stream (#82) ([12f9992](https://github.com/deeeed/expo-audio-stream/commit/12f999247cdd6b08753bcf1b481582a604826383))
- feat(deps): update expo packages and dependencies to latest patch versions (#81) ([3ed0526](https://github.com/deeeed/expo-audio-stream/commit/3ed0526545623530a10757f1bbd7f877a2c31296))
## [1.11.2] - 2025-01-22
- resources not cleanup properly on app kill (#80) ([7d522a5](https://github.com/deeeed/expo-audio-stream/commit/7d522a531e70065b99758aa3a4c669769fdbd110))
## [1.11.1] - 2025-01-22
- chore: force deployment of 1.11.1
## [1.11.0] - 2025-01-22
- feat(audio): add intelligent call interruption handling & compression improvements ([f8f6187](https://github.com/deeeed/expo-audio-stream/pull/78))
## [1.10.0] - 2025-01-14
- add support for pausing and resuming compressed recordings ([bc3f629](https://github.com/deeeed/expo-audio-stream/commit/bc3f6295d060396325e0f008ff00b3be9c8722cd))
- optimize notification channel settings ([daa075e](https://github.com/deeeed/expo-audio-stream/commit/daa075e668f8faf0b8d2849e18c37384bdd293b8))
## [1.9.2] - 2025-01-12
- ios bitrate verification to prevent invalid values ([035a180](https://github.com/deeeed/expo-audio-stream/commit/035a1800833264edcc59724aaa8a2e12d5c78dc2))
## [1.9.1] - 2025-01-12
- ios potentially missing compressed file info ([88a628c](https://github.com/deeeed/expo-audio-stream/commit/88a628c35f2bfd626a2a5de1eb6950efd814619d))
## [1.9.0] - 2025-01-11
- feat(web-audio): optimize memory usage and streaming performance for web audio recording (#75) ([7b93e12](https://github.com/deeeed/expo-audio-stream/commit/7b93e12aae4bc0599b06b48ca34a60f65587fc75))
## [1.8.0] - 2025-01-10
- feat(audio): implement audio compression support ([ff4e060](https://github.com/deeeed/expo-audio-stream/commit/ff4e060fef1061804c1cc0126d4344d2d50daa9a))
## [1.7.2] - 2025-01-07
- fix(audio-stream): correct WAV header handling in web audio recording ([9ba7de5](https://github.com/deeeed/expo-audio-stream/commit/9ba7de5b96ca4cc937dea261c80d3fda9c99e8f4))
## [1.7.1] - 2025-01-07
- update notification to avoid triggering new alerts (#71) ([32dcfc5](https://github.com/deeeed/expo-audio-stream/commit/32dcfc55daf3236babefc17016f329c177d466fd))
## [1.7.0] - 2025-01-05
- feat(playground): enhance app configuration and build setup for production deployment (#58) ([929d443](https://github.com/deeeed/expo-audio-stream/commit/929d443145378b1430d215db5c00b13758420e2b))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.6.1 ([084e8ad](https://github.com/deeeed/expo-audio-stream/commit/084e8adb91da7874c9e608b55d9c7b2ffd7a8327))
- fix(ios): improve audio resampling and duration tracking (#69) ([51bef49](https://github.com/deeeed/expo-audio-stream/commit/51bef493b8e167852c64b8c66a9f8a14cd34f99c))
- handle paused state in stopRecording (#68) ([15eac9b](https://github.com/deeeed/expo-audio-stream/commit/15eac9bfcc3203e4a5eb5f236286ed72aafde722))
- reset audio recording state properly on iOS and Android (#66) ([61e9c26](https://github.com/deeeed/expo-audio-stream/commit/61e9c261fb3a979be1894e537233d6e5a4fbdae4))
- total size doesnt reset on new recording android (#64) ([f7da57b](https://github.com/deeeed/expo-audio-stream/commit/f7da57ba9d6f25870c130c54a049ba4cfad1c444))
## [1.6.1] - 2024-12-11
- chore(expo-audio-stream): remove git commit step from publish script ([4a772ce](https://github.com/deeeed/expo-audio-stream/commit/4a772ce93bb7405d9b8e981f46bdf8941a71ecfe))
- chore: more publishing automation ([3693021](https://github.com/deeeed/expo-audio-stream/commit/369302107f9dca9dddd8ae68e6214481a39976ac))
- expo plugin files not published ([b88c446](https://github.com/deeeed/expo-audio-stream/commit/b88c44667013a901fccfe6f89dcb640ae2aae47f))
- chore(expo-audio-stream): improved build publish script ([ad65a69](https://github.com/deeeed/expo-audio-stream/commit/ad65a69011273e0eab1ac0f464fc3b009fc3433d))
- fix(expo-audio-stream): missing package files ([0901a1b](https://github.com/deeeed/expo-audio-stream/commit/0901a1bbbcce3111c9b5d61ade8caa48bcdd3613))
- feat(expo-audio-stream): opt in debug log for plugin config ([03a0a71](https://github.com/deeeed/expo-audio-stream/commit/03a0a7168bb4f77638de51c55a1ad19c713b52dc))
- fix(expo-audio-stream): include all build + sourcemaps files in the package
- fix(expo-audio-stream): missing plugin files ([e56254a](https://github.com/deeeed/expo-audio-stream/commit/e56254a4ffa1c015df3d300831ba0b392958b6c8))
- fix(expo-audio-stream): plugin deployment process and build system enhancements (#56) ([63fbeb8](https://github.com/deeeed/expo-audio-stream/commit/63fbeb82f56130dedeafa633e916f2ce0f8f1a67))
## [1.5.0] - 2024-12-10
- UNPUBLISHED because of a bug in the build system
## [1.4.0] - 2024-12-05
- chore: remove unusded dependencies ([ad81dd5](https://github.com/deeeed/expo-audio-stream/commit/ad81dd560c93dd1d04995a323a4ae72d4de20f3e))
## [1.3.1] - 2024-12-05
- feat(web): implement throttling and optimize event processing (#49) ([da28765](https://github.com/deeeed/expo-audio-stream/commit/da2876524c2c9d6e0a980fde40a0197b929d8a7f))
## [1.3.0] - 2024-11-28
### Added
- refactor(permissions): standardize permission status response structure across platforms (#44) ([7c9c800](https://github.com/deeeed/expo-audio-stream/commit/7c9c800d83b7cea3516643371484d5e1f3b99e4c))
- fix(web): add temporary worklet initialization patch for reanimated ([2afcf02](https://github.com/deeeed/expo-audio-stream/commit/2afcf02ddc982e18a419f0132bc42200f3fdebb1))
- feat: update expo-modules-core ([54ed5c5](https://github.com/deeeed/expo-audio-stream/commit/54ed5c59affa46fdf8cdc2e8048766247a4ed16c))
- feat: latest expo fixes ([9cc5ac3](https://github.com/deeeed/expo-audio-stream/commit/9cc5ac39751999e5b33e11c16355557143d68d10))
- feat: latest expo sdk ([258ef6c](https://github.com/deeeed/expo-audio-stream/commit/258ef6cf68e70c7855f696a01204f79b0793fdc0))
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
- Feature: `keepAwake` Continue recording when app is in background (default is true)
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

[unreleased]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.17.0...HEAD
[1.17.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.16.0...@siteed/expo-audio-stream@1.17.0
[1.16.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.15.1...@siteed/expo-audio-stream@1.16.0
[1.15.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.15.0...@siteed/expo-audio-stream@1.15.1
[1.15.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.14.2...@siteed/expo-audio-stream@1.15.0
[1.14.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.14.1...@siteed/expo-audio-stream@1.14.2
[1.14.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.14.0...@siteed/expo-audio-stream@1.14.1
[1.14.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.13.2...@siteed/expo-audio-stream@1.14.0
[1.13.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.13.1...@siteed/expo-audio-stream@1.13.2
[1.13.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.13.0...@siteed/expo-audio-stream@1.13.1
[1.13.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.12.3...@siteed/expo-audio-stream@1.13.0
[1.12.3]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.12.2...@siteed/expo-audio-stream@1.12.3
[1.12.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.12.1...@siteed/expo-audio-stream@1.12.2
[1.12.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.12.0...@siteed/expo-audio-stream@1.12.1
[1.12.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.11.6...@siteed/expo-audio-stream@1.12.0
[1.11.3]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.11.2...@siteed/expo-audio-stream@1.11.3
[1.11.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.11.1...@siteed/expo-audio-stream@1.11.2
[1.11.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.11.0...@siteed/expo-audio-stream@1.11.1
[1.11.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.10.0...@siteed/expo-audio-stream@1.11.0
[1.10.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.9.2...@siteed/expo-audio-stream@1.10.0
[1.9.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.9.1...@siteed/expo-audio-stream@1.9.2
[1.9.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.9.0...@siteed/expo-audio-stream@1.9.1
[1.9.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.8.0...@siteed/expo-audio-stream@1.9.0
[1.8.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.7.2...@siteed/expo-audio-stream@1.8.0
[1.7.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.7.1...@siteed/expo-audio-stream@1.7.2
[1.7.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.7.0...@siteed/expo-audio-stream@1.7.1
[1.7.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.6.1...@siteed/expo-audio-stream@1.7.0
[1.6.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.6.0...@siteed/expo-audio-stream@1.6.1
[1.5.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.4.0...@siteed/expo-audio-stream@1.5.0
[1.4.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.3.1...@siteed/expo-audio-stream@1.4.0
[1.3.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.3.0...@siteed/expo-audio-stream@1.3.1
[Unreleased]: https://github.com/deeeed/expo-audio-stream/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/deeeed/expo-audio-stream/releases/tag/v1.0.0
