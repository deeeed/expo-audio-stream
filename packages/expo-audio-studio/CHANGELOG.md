# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [2.18.1] - 2025-08-02
### Changed
- feat: improved memory monitoring ([55dfe16](https://github.com/deeeed/expo-audio-stream/commit/55dfe16d7e8c372392738d1441776a760e7ecdbe))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.18.0 ([cc80ac5](https://github.com/deeeed/expo-audio-stream/commit/cc80ac5fa7ece05fc9fae031f101163acce2aff4))
## [2.18.0] - 2025-08-01
### Changed
- feat(expo-audio-studio): optimize buffer size on android to prevent oom ([32fcb9b](https://github.com/deeeed/expo-audio-stream/commit/32fcb9b0a965669b3a37c9860998ae46a1d26cd8))
- fix(expo-audio-studio): invalid paused duration on android ([c107258](https://github.com/deeeed/expo-audio-stream/commit/c107258054ebdbc733298c84b8d84b0f9f416e6e))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.17.0 ([8a303b4](https://github.com/deeeed/expo-audio-stream/commit/8a303b4d96988b97604123d74daaa406d9ec517c))
## [2.17.0] - 2025-07-31
### Changed
- fix(expo-audio-studio): fix OutOfMemoryError by tracking stream position correctly ([b67e521](https://github.com/deeeed/expo-audio-stream/commit/b67e52142154d07873c5c1ec9c183d524d61e528))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.16.2 ([c4291a8](https://github.com/deeeed/expo-audio-stream/commit/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a))
## [2.16.2] - 2025-07-27
### Changed
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.16.1 ([c9614d4](https://github.com/deeeed/expo-audio-stream/commit/c9614d4ebf87d73c3c5b2f7d6e60492fd5e45e64))
## [2.16.1] - 2025-07-27
### Changed
-  fix(expo-audio-studio): fix Android audio analysis accumulation showing 0 bytes ([012d478](https://github.com/deeeed/expo-audio-stream/commit/012d478c372db12b9fcf4a49f567d6618eb499f1))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.16.0 ([34c8c0f](https://github.com/deeeed/expo-audio-stream/commit/34c8c0f2f587ecde9adf97c539289b128f0bccc1))
## [2.16.0] - 2025-07-27
### Changed
- feat(expo-audio-studio): optimize stop recording performance for long recording on android ([4553dc9](https://github.com/deeeed/expo-audio-stream/commit/4553dc9d2bd101a461f3f2eadfed63114f7d1b22))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.15.0 ([1af374a](https://github.com/deeeed/expo-audio-stream/commit/1af374ada18ec2cd4edeb151fc0e91e54f783b9e))
## [2.15.0] - 2025-07-15
### Changed
- feat(android): add showPauseResumeActions option to notification config ([7456153](https://github.com/deeeed/expo-audio-stream/commit/7456153beb3f5041bd0199595b29d6b62c6b4c8f))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.9 ([34ea510](https://github.com/deeeed/expo-audio-stream/commit/34ea5104fe661743627b2234f95382ba6980a44c))
## [2.14.9] - 2025-07-15
### Changed
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.8 ([4598073](https://github.com/deeeed/expo-audio-stream/commit/4598073062e05139bfa7d9ed80896c90359f0e18))
## [2.14.8] - 2025-07-15
### Changed
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.7 ([93c5a53](https://github.com/deeeed/expo-audio-stream/commit/93c5a53822b9115f0b3647e833320b5c7a6bd03f))
## [2.14.7] - 2025-07-15
### Changed
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.6 ([829a70e](https://github.com/deeeed/expo-audio-stream/commit/829a70e0ff8e077aa77197387f3a0b285e846fcd))
## [2.14.6] - 2025-07-15
### Changed
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.5 ([ee7e3ce](https://github.com/deeeed/expo-audio-stream/commit/ee7e3ce39696c8a806574a858473dd664d5ac435))
## [2.14.5] - 2025-07-15
### Changed
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.4 ([44848d7](https://github.com/deeeed/expo-audio-stream/commit/44848d7a0f62dcc2dd2fa6165dbe0ce965f95254))
## [2.14.4] - 2025-07-15
### Changed
-  fix(plugin): respect enableDeviceDetection configuration for Android permissions ([32647c8](https://github.com/deeeed/expo-audio-stream/commit/32647c8d80bd33406f7dcabcf2823beaf3ba3b62))
- fix(audio-studio): add missing Bluetooth_ADMIN permission for device detection ([5a56900](https://github.com/deeeed/expo-audio-stream/commit/5a5690025a3c2ac279b853e21470015935b9a469))
## [2.14.3] - 2025-06-12
### Changed
- refactor(AudioRecorderManager): remove analysis bit depth logging for cleaner debug output ([ddaf9e2](https://github.com/deeeed/expo-audio-stream/commit/ddaf9e25c0bf9bad1e3435b9ec08b3b4a27a6161))
## [2.14.2] - 2025-06-11
### Changed
- fix(ios): update compressed file size when primary output is disabled ([9f03ee0](https://github.com/deeeed/expo-audio-stream/commit/9f03ee0b18f1c079e5aaf13267e19f095ad3b7ea))
- feat(expo-audio-studio): add platform limitations validation and documentation ([7e062ff](https://github.com/deeeed/expo-audio-stream/commit/7e062ff837865b735f0cabdb9e2b755ce55a94c6))
- docs: reorg ([0251063](https://github.com/deeeed/expo-audio-stream/commit/0251063893c6464ec6410ec6e08866e12d3113a7))
## [2.14.1] - 2025-06-11
### Changed
- fix(android): Fix duration returning 0 when primary output is disabled (#244) ([38d6f50](https://github.com/deeeed/expo-audio-stream/commit/38d6f50c084a10329be33a0f1c123aa9f457c371))
## [2.14.0] - 2025-06-11
### Changed
- feat(expo-audio-studio): comprehensive cross-platform stop recording performance optimization ([b3ed474](https://github.com/deeeed/expo-audio-stream/commit/b3ed474d91994698fe082354621adc98e758557e))
## [2.13.2] - 2025-06-10
### Changed
- fix: invalid type exports ([18340ea](https://github.com/deeeed/expo-audio-stream/commit/18340eac9cfef39691637400fc6af811d5b004df))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.13.1 ([9ccce85](https://github.com/deeeed/expo-audio-stream/commit/9ccce858174254387aac44d30853c908707d8254))
## [2.13.1] - 2025-06-09
### Changed
- feat(investigation): resolve Issue #251 - comprehensive sub-100ms audio events analysis (#270) ([4813f1e](https://github.com/deeeed/expo-audio-stream/commit/4813f1ef05f3856b58ec8fde95b7b8909feb513d))
- fix(deps): update expo-modules-core peer dependency for Expo SDK 53 compatibility ([40b946f](https://github.com/deeeed/expo-audio-stream/commit/40b946f83eecd3fdcedfe7a2cbac62f1207a4ff0))
- docs: updated docs site ([8a01a97](https://github.com/deeeed/expo-audio-stream/commit/8a01a97ebee927a2dfa0a7cb40b11329410509d2))
## [2.13.0] - 2025-06-09
### Changed
- feat(expo-audio-studio): enhance device detection and management system ([97ceef0](https://github.com/deeeed/expo-audio-stream/commit/97ceef003ddb8eb5246cda8a5a00ddc75bf665a0))
## [2.12.3] - 2025-06-07
### Changed
- refactor(expo-audio-studio): adjust audio focus request timing in AudioRecorderManager ([317367c](https://github.com/deeeed/expo-audio-stream/commit/317367cb29fa09016aa73884f2f51e9cfdee1086))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.12.2 ([14db4eb](https://github.com/deeeed/expo-audio-stream/commit/14db4ebfdeb9181e82e810d61283738d41c40a1a))
## [2.12.2] - 2025-06-07
### Changed
- fix: audio focus strategy implementation for Android background recording (#267) ([5b7b7ed](https://github.com/deeeed/expo-audio-stream/commit/5b7b7eda86bbd65becbe6bab44a44cdf6a1fb17d))
## [2.12.1] - 2025-06-07
### Changed
- feat(playground): implement agent validation framework and enhance testing capabilities (#266) ([e7937e0](https://github.com/deeeed/expo-audio-stream/commit/e7937e0268f54f85ea2e0171b221f7ef29cc6248))
## [2.12.0] - 2025-06-07
### Changed
- fix(android): resolve PCM streaming duration calculation bug (Issue #263) (#265) ([a0c5500](https://github.com/deeeed/expo-audio-stream/commit/a0c550099fec9d6b0d486440819173d9d9275908))
- feat(expo-audio-studio): implement Android-only audioFocusStrategy (#264) ([cc77226](https://github.com/deeeed/expo-audio-stream/commit/cc7722605a5502a58b8236b610c9bdccf5f7f561))
- docs: fix comment formatting in OutputConfig interface for clarity ([07fac61](https://github.com/deeeed/expo-audio-stream/commit/07fac61245843c601709bb7576db6e48b2106cf7))
## [2.11.0] - 2025-06-05
### Changed
- refactor(expo-audio-studio): remove android/build.gradle and add device disconnection fallback tests ([36fe9a9](https://github.com/deeeed/expo-audio-stream/commit/36fe9a921505e136ea50406d4b664c597293ffd8))
- fix(expo-audio-studio): enforce 10ms minimum interval on both platforms (#262) ([035fc07](https://github.com/deeeed/expo-audio-stream/commit/035fc076334c169a2371527bad0ca60f222d10ee))
- fix(expo-audio-studio): add proper MediaCodec resource cleanup in AudioProcessor ([2b069b6](https://github.com/deeeed/expo-audio-stream/commit/2b069b6ae512f97fae80df1b8cb38bb3a14538e5))
- feat(expo-audio-studio): add audio format enhancement specification and tests ([ace22a2](https://github.com/deeeed/expo-audio-stream/commit/ace22a22cf6c94ec58ddd4f6cb44f77dd383d6bc))
- feat\!: Add M4A support with preferRawStream option (#261) ([c9faeb0](https://github.com/deeeed/expo-audio-stream/commit/c9faeb01cd5dcd7407f73a0f7e6d5822adb862a4))
## [2.10.6] - 2025-06-04
### Changed
- fix(expo-audio-studio): prevent durationMs returning 0 on iOS (#244) (#260) ([595e5d5](https://github.com/deeeed/expo-audio-stream/commit/595e5d56991c9fa88c2fa4e39efb197916cb8b84))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.5 ([d8c6e1d](https://github.com/deeeed/expo-audio-stream/commit/d8c6e1de72ccb0c8885a4f5f3326e3229d9dfd92))
## [2.10.5] - 2025-06-04
### Changed
- fix(expo-audio-studio): enable audio streaming when primary output is disabled on iOS (#259) ([1d2bb92](https://github.com/deeeed/expo-audio-stream/commit/1d2bb9280e7d596ed77de30b37e043fd7f8f8cc8))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.4 ([32f8c9e](https://github.com/deeeed/expo-audio-stream/commit/32f8c9ee1d65f52370798654be389de1569e851f))
## [2.10.4] - 2025-06-03
### Changed
- fix(expo-audio-studio): resolve Swift compilation scope error in AudioStreamManager (#256) ([b44bf3d](https://github.com/deeeed/expo-audio-stream/commit/b44bf3d6d85a3f953d84b024bba828163354a40b))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.3 ([5e23474](https://github.com/deeeed/expo-audio-stream/commit/5e23474f9d0b0bcf643098b85779d413d0dc9348))
## [2.10.3] - 2025-06-02
### Changed
- fix: prevent UninitializedPropertyAccessException crash in developer menu (#250) ([83c1fd7](https://github.com/deeeed/expo-audio-stream/commit/83c1fd75c9aa022eab1125df251700e3e87c4371))
- fix: return compression info when primary output is disabled (issue #244) (#249) ([31d97c1](https://github.com/deeeed/expo-audio-stream/commit/31d97c1f7602aaf62969d26cc2fc2b7984ab24cc))
## [2.10.2] - 2025-05-31
### Changed
- fix: Buffer size calculation and document duplicate emission fix for … (#248) ([204dde5](https://github.com/deeeed/expo-audio-stream/commit/204dde5137620e80c9a22a5a27a395a2149f33f0))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.1 ([0acbfc5](https://github.com/deeeed/expo-audio-stream/commit/0acbfc5b145b478cc913baf7fd798573d8c2f305))
## [2.10.1] - 2025-05-27
### Changed
- fix(useAudioRecorder): update intervalId type for better type safety ([dc0021a](https://github.com/deeeed/expo-audio-stream/commit/dc0021ae0dc2b1e31f61c1340529b655f85447fc))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.0 ([bb8418f](https://github.com/deeeed/expo-audio-stream/commit/bb8418f2156d531377247a6d4095112560ff975f))
## [2.10.0] - 2025-05-26
### Changed
- chore(expo-audio-studio): update @siteed/design-system to version 0.51.0 and refactor recording configuration (#245) ([6486c66](https://github.com/deeeed/expo-audio-stream/commit/6486c66d687093b5257fddcce575d932b6a6443b))
- feat(expo-audio-studio): add buffer duration control and skip file writing options ([bfdbcb8](https://github.com/deeeed/expo-audio-stream/commit/bfdbcb8bac7c0641d6bacfa9b6fc4e64c2621baa))
- docs: enhance contribution guidelines with Test-Driven Development practices ([2c04eff](https://github.com/deeeed/expo-audio-stream/commit/2c04eff1f6d6d3c567aad8f7d7174b7f1ad533aa))
- feat(expo-audio-studio): enhance testing framework and add instrumented tests (#242) ([6e823ec](https://github.com/deeeed/expo-audio-stream/commit/6e823ec79c77ff34441b5acf757fdbac0a974e46))
## [2.9.0] - 2025-05-15
### Changed
- refactor(WebRecorder): remove unused compression logic and clean up blob creation ([91f6bba](https://github.com/deeeed/expo-audio-stream/commit/91f6bba6a3afa9fe71811c2c67a5703b8751830c))
- feat: Add Web Audio Test Page and Enhance web Audio Chunk Handling (#240) ([0a3cce0](https://github.com/deeeed/expo-audio-stream/commit/0a3cce0362ecaae70566805625e5a2cbdc289291))
- docs: update README and documentation to highlight experimental advanced audio feature extraction capabilities and performance considerations ([57fc4de](https://github.com/deeeed/expo-audio-stream/commit/57fc4de3967292b20b2b62190b7fba566f352ffd))
- feat: clean up redundant code and improve stability (#238) ([1b01256](https://github.com/deeeed/expo-audio-stream/commit/1b01256c2b89a1089e1df21f3faf2908816ca54b))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.6 ([50a0fce](https://github.com/deeeed/expo-audio-stream/commit/50a0fce86524b9364329e111701bd056638d2849))
## [2.8.6] - 2025-05-11
### Changed
- chore(expo-audio-studio): update Android module configuration and prevent plugin conflicts ([7f696fb](https://github.com/deeeed/expo-audio-stream/commit/7f696fb4277f1747d1ba753397d2d6a97ea19abc))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.5 ([bece9b6](https://github.com/deeeed/expo-audio-stream/commit/bece9b6b43cb1a780d9786e376efdd93ef82446f))
## [2.8.5] - 2025-05-11
### Changed
- chore(expo-audio-studio): remove exports field from package.json ([9dd5029](https://github.com/deeeed/expo-audio-stream/commit/9dd5029d81fcc3a4d5b95ee5956beb8481f3950a))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.4 ([e86a373](https://github.com/deeeed/expo-audio-stream/commit/e86a373939ed3a371095cbfe09d664f2b4b16b9d))
## [2.8.4] - 2025-05-11
### Changed
- fix(expo-audio-studio): expo plugin setup ([78810c1](https://github.com/deeeed/expo-audio-stream/commit/78810c1682fc357ed79297971d53d61de88b901f))
## [2.8.3] - 2025-05-06
### Changed
- chore(expo-audio-studio): update plugin configuration to use ESM format and streamline build process ([97432eb](https://github.com/deeeed/expo-audio-stream/commit/97432eb2944f43e03a1464fdc166a49392582b08))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.2 ([255c802](https://github.com/deeeed/expo-audio-stream/commit/255c802feacec8e4ba21bf442381062620d9b5f0))
## [2.8.2] - 2025-05-06
### Changed
- chore(expo-audio-studio): update TypeScript configurations for dual module support and enhance CommonJS compatibility ([7377a5f](https://github.com/deeeed/expo-audio-stream/commit/7377a5fd3925a21d8628eb31b64c8c65102a1713))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.1 ([78721e4](https://github.com/deeeed/expo-audio-stream/commit/78721e41bbc9e4e999118474c887cca7b5420915))
## [2.8.1] - 2025-05-06
### Changed
- feat(expo-audio-studio): implement dual module format (ESM/CommonJS) to resolve module resolution issues (#235) ([58c5a94](https://github.com/deeeed/expo-audio-stream/commit/58c5a94ecf2fdcefa554b2f8664743730001e6d8))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.0 ([a879e93](https://github.com/deeeed/expo-audio-stream/commit/a879e93bb7b5d27ab5ee764c903e890550c8dda5))
## [2.8.0] - 2025-05-04
### Changed
- feat(playground): Version 1.0.1 with Audio Enhancements, App Updates, and Navigation Refactor (#229) ([868fca0](https://github.com/deeeed/expo-audio-stream/commit/868fca026119aea116a22670c2b6fe364b6df06c))
- chore: enhance publish script to include git push after documentation updates ([1b0b0db](https://github.com/deeeed/expo-audio-stream/commit/1b0b0db6cf40a6397e6d7438cb7543c93e67b143))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.7.0 ([fe19a2f](https://github.com/deeeed/expo-audio-stream/commit/fe19a2fa1af6033cfa025691f25a0e9bcd64b37c))
## [2.7.0] - 2025-05-04
### Changed
- fix: Enhance iOS Background Audio Recording and Audio Format Conversion (#228) ([c17169b](https://github.com/deeeed/expo-audio-stream/commit/c17169bf9275706abf287712acc30df2f1814ed7))
- chore(expo-audio-studio): improve build script for cjs esm conversion ([767dfbe](https://github.com/deeeed/expo-audio-stream/commit/767dfbe5da0f1550b689f6859e2e5fccf7f8141c))
## [2.6.3] - 2025-05-03
### Changed
- chore: update readme with store download information (#224) ([c404d86](https://github.com/deeeed/expo-audio-stream/commit/c404d860cdb1c4c4bbc3767214f56bf547acec33))
## [2.6.2] - 2025-05-01
### Changed
- fix(audio-studio): ensure foreground-only audio recording works with FOREGROUND_SERVICE #202 (#221) ([abc450c](https://github.com/deeeed/expo-audio-stream/commit/abc450cb73968cc260e430758df9b72e00f75ef7))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.6.1 ([9191a2c](https://github.com/deeeed/expo-audio-stream/commit/9191a2cec8e21cd03a0d5be59d823583d449d9c9))
## [2.6.1] - 2025-05-01
### Changed
- fix(expo-audio-studio): Resolve iOS HW Format Mismatch Crash and Enhance Logging (#220) ([4909f76](https://github.com/deeeed/expo-audio-stream/commit/4909f7646fcf682fcdaed84988b8d8e58b7b626c))
## [2.6.0] - 2025-05-01
### Changed
- fix(audio-studio): resolve web audio recording issue without compression #217 (#219) ([2daa373](https://github.com/deeeed/expo-audio-stream/commit/2daa373ec507550ffa4571699fb1c680e2df8f14))
## [2.5.0] - 2025-04-30
### Changed
- fix(ios): ensure complete audio data emission on recording stop/pause (#215) ([236e7aa](https://github.com/deeeed/expo-audio-stream/commit/236e7aa040d11626f06da9bbf5746cdcb6f2b457))
- feat(audio-device): Complete Android implementation for audio device API (#214) ([cedc8d2](https://github.com/deeeed/expo-audio-stream/commit/cedc8d2fbdd5317652ee31c70ee596ec946cf22e))
- feat(audio-device): Implement cross-platform audio device detection, selection, and fallback handling (#213) ([023b8a1](https://github.com/deeeed/expo-audio-stream/commit/023b8a1d9844bff9f57781860e38a53eb4684fda))
- feat: Add Zero-Latency Audio Recording with `prepareRecording` API (#211) ([30cb56c](https://github.com/deeeed/expo-audio-stream/commit/30cb56c07d14e7012bff9a4c4d458d5a49cf494e))
- docs: update api references for v2.4.1 ([b15daef](https://github.com/deeeed/expo-audio-stream/commit/b15daef29a631eb696d5a28422f9cf32b080027e))
- chore(sherpa-onnx-demo): Restructure WebAssembly Setup and Clean Up Assets (#208) ([7c2adff](https://github.com/deeeed/expo-audio-stream/commit/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba))
## [2.4.1] - 2025-04-08
### Changed
- feat(audio-stream): enhance background audio handling and permission checks (#200) ([60befbe](https://github.com/deeeed/expo-audio-stream/commit/60befbedc9d3cbcc1fc684254d812381e5905e43))
## [2.4.0] - 2025-04-03
### Changed
- fix(audio-stream): resolve iOS sample rate mismatch and enhance recording stability (#198) ([05bfc61](https://github.com/deeeed/expo-audio-stream/commit/05bfc6159e7f71fb1d70c3de24fa487cdfb73a62))
- feat(audio-stream): enhance Android permission handling for phone state and notifications (#196) ([63a259d](https://github.com/deeeed/expo-audio-stream/commit/63a259da2b175a5865895306c204b84a242f1c97))
## [2.3.1] - 2025-04-03
### Changed
- feat: no external crc32 libs (#195) ([394b3b3](https://github.com/deeeed/expo-audio-stream/commit/394b3b3bb04e3f969db2a502af85d69c0f955b97))
## [2.3.0] - 2025-03-29
### Changed
- fix: always generate a new UUID unless filename is provided (#182) ([f98a9a5](https://github.com/deeeed/expo-audio-stream/commit/f98a9a52393829e6c4a79aee3575fbfcc9416c19))
- refactor(audio-studio): introduce constants for silence threshold and WAV header size (#188) ([e8aa329](https://github.com/deeeed/expo-audio-stream/commit/e8aa3298bd6ba029d38898360b7df26b3fd5485f))
- docs: enhance installation and API reference documentation for phone call handling (#187) ([fcaece1](https://github.com/deeeed/expo-audio-stream/commit/fcaece18cf046d970b9659f3f12a19deb096bceb))
## [2.2.0] - 2025-03-28
### Changed
- refactor(audio-studio): implement platform-specific CRC32 handling ([b61a3d7](https://github.com/deeeed/expo-audio-stream/commit/b61a3d743914e66888ec6cc4cb8e010ff1992698))
- chore: update Expo dependencies and remove invalid design-system version ([16e5007](https://github.com/deeeed/expo-audio-stream/commit/16e50077690b55977c22fbcb08be75834146ff47))
- fix: linting issues ([741589d](https://github.com/deeeed/expo-audio-stream/commit/741589d60485a2d049e7adf529d3fd2b999fa098))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.1.1 ([1b17ac6](https://github.com/deeeed/expo-audio-stream/commit/1b17ac6e103f2ca50f29668b3ddaaf57a4b4b7d3))
## [2.1.1] - 2025-03-04
### Changed
- feat: Rename`@siteed/expo-audio-stream` to `@siteed/expo-audio-studio` (#160) ([1b99191](https://github.com/deeeed/expo-audio-stream/commit/1b9919143413a900aefed94c20fc9a8b0e6050d3))
## [2.1.0] - 2025-03-04
### Changed
- feat(docs): enhance audio processing documentation and examples (#158) ([26afd49](https://github.com/deeeed/expo-audio-stream/commit/26afd4938e1c626294f40b50a84fe15f5c2bb6a1))
- feat: Add Mel Spectrogram Extraction and Language Detection to Audio Processing (#157) ([4129dee](https://github.com/deeeed/expo-audio-stream/commit/4129dee87c27dd5a9911c85e3dbf045507876cc1))
- feat: enhance audio import functionality and decibel visualization (#156) ([2dbecc7](https://github.com/deeeed/expo-audio-stream/commit/2dbecc7bd0ea46edd80c2b0e28dd2a0525953362))
- feat(trim): Implement iOS trim support with custom filename and format improvements (#152) ([dd49be4](https://github.com/deeeed/expo-audio-stream/commit/dd49be42bccbf3ae6cced8c3662237e1668ec2de))
- feat: Add Sample Rate Control and Web Trimming Support to Expo Audio Stream (#151) ([9158eec](https://github.com/deeeed/expo-audio-stream/commit/9158eeccc10e25ac77ba3a99185b4dbc5abfb353))
- feat: Enhance audio trimming with optimized processing and detailed feedback (#150) ([41a6945](https://github.com/deeeed/expo-audio-stream/commit/41a694528d1e803dc0012948eec4edfdc336b4fc))
- feat(trim): add audio trimming functionality with visualization and preview (Android only) (#149) ([cba03dc](https://github.com/deeeed/expo-audio-stream/commit/cba03dc920eb8a1f111b45e8404a42e48076b7cd))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@2.0.1 ([c77cfc8](https://github.com/deeeed/expo-audio-stream/commit/c77cfc8b70f87a12bb19fa03b245cda7ed2496e1))
## [2.0.1] - 2025-02-27
### Changed
- refactor: update background mode handling for audio stream plugin ([e7e98cc](https://github.com/deeeed/expo-audio-stream/commit/e7e98cc60b7965770dcf25e9ae74cb356e1e7097))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@2.0.0 ([356d3f4](https://github.com/deeeed/expo-audio-stream/commit/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6))
## [2.0.0] - 2025-02-27
### Changed
- feat(playground): Enhance Audio Playground with Improved UX and Sample Audio Loading (#148) ([09d2794](https://github.com/deeeed/expo-audio-stream/commit/09d27940dcffa60e662c828742f4577bca5327f9))
- feat: Implement Enhanced Audio Transcription Workflow with Configurable Extraction and UI Updates (#147) ([c658c7e](https://github.com/deeeed/expo-audio-stream/commit/c658c7e8531dd731b01d9347bc7c744470a3b7b9))
- fix: audio recording reliability improvements and web IndexedDB management (#146) ([d4fa245](https://github.com/deeeed/expo-audio-stream/commit/d4fa245c46d487fe50c6454165efc2e1032ec126))
- feat(transcription): refactor and unify transcription services across platforms (#145) ([a94b905](https://github.com/deeeed/expo-audio-stream/commit/a94b90562fb2112f712f78c03ca6a5110d6b1401))
- feat(audio): enhance checksum verification and audio segment analysis (#143) ([49b6587](https://github.com/deeeed/expo-audio-stream/commit/49b65877d1fd9922f25b4892261c4fedf02ba3c3))
- feat(playground): implement cross-platform ONNX runtime with Silero VAD model (#142) ([4a94639](https://github.com/deeeed/expo-audio-stream/commit/4a9463995f1eadf6531a2b4d6d057e90da097920))
- feat(audio-analysis): enhance audio analysis and visualization capabilities (#141) ([ecf8f5d](https://github.com/deeeed/expo-audio-stream/commit/ecf8f5daf967bf27afb827c8cf6bca7510ce7b4e))
- android 15 (#140) ([5321a3c](https://github.com/deeeed/expo-audio-stream/commit/5321a3c805d22e6824fd11fee4290987d550bd06))
- refactor(audio): consolidate audio analysis APIs and migrate to segment-based processing (#139) ([5d45da8](https://github.com/deeeed/expo-audio-stream/commit/5d45da871ee1849898405ee4bf8bf8d296aebc48))
- feat: pcm player (#137) ([8db6f16](https://github.com/deeeed/expo-audio-stream/commit/8db6f16f13cbcf78fd4a8e412bb00689e47d5a72))
- feat(audio-stream): add extractAudioData API ([faf8915](https://github.com/deeeed/expo-audio-stream/commit/faf8915df3b18ea54ca7e562f61749d7cadf8bb4))
- feat(audio): improve audio trimming and waveform visualization (#136) ([ad5514b](https://github.com/deeeed/expo-audio-stream/commit/ad5514b412eedc7211cb200cc3747e8a83afbf88))
- feat(audio): enhance audio player with preview, trimming and feature analysis (#135) ([3f7eb9c](https://github.com/deeeed/expo-audio-stream/commit/3f7eb9cde7b314505d8ed3e4704c7b1321da6b15))
- feat: add web permission for microphone (#131) ([9a2ed7f](https://github.com/deeeed/expo-audio-stream/commit/9a2ed7f31ad41560d094a22d1248034cb2f5886d))
- refactor(audio): simplify amplitude analysis and remove redundant configuration (#133) ([5d64aa2](https://github.com/deeeed/expo-audio-stream/commit/5d64aa22299836cc9cb925d3e91f3d9470f3e856))
- feat: add full audio analysis with spectral features and time range controls (#132) ([5677dc3](https://github.com/deeeed/expo-audio-stream/commit/5677dc321f5a9ff4bea37fbbce3cb6ae3aad67f6))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.17.0 ([689aead](https://github.com/deeeed/expo-audio-stream/commit/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db))
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

[unreleased]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.18.1...HEAD
[2.18.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.18.0...@siteed/expo-audio-studio@2.18.1
[2.18.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.17.0...@siteed/expo-audio-studio@2.18.0
[2.17.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.16.2...@siteed/expo-audio-studio@2.17.0
[2.16.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.16.1...@siteed/expo-audio-studio@2.16.2
[2.16.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.16.0...@siteed/expo-audio-studio@2.16.1
[2.16.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.15.0...@siteed/expo-audio-studio@2.16.0
[2.15.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.9...@siteed/expo-audio-studio@2.15.0
[2.14.9]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.8...@siteed/expo-audio-studio@2.14.9
[2.14.8]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.7...@siteed/expo-audio-studio@2.14.8
[2.14.7]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.6...@siteed/expo-audio-studio@2.14.7
[2.14.6]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.5...@siteed/expo-audio-studio@2.14.6
[2.14.5]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.4...@siteed/expo-audio-studio@2.14.5
[2.14.4]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.3...@siteed/expo-audio-studio@2.14.4
[2.14.3]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.2...@siteed/expo-audio-studio@2.14.3
[2.14.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.1...@siteed/expo-audio-studio@2.14.2
[2.14.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.14.0...@siteed/expo-audio-studio@2.14.1
[2.14.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.13.2...@siteed/expo-audio-studio@2.14.0
[2.13.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.13.1...@siteed/expo-audio-studio@2.13.2
[2.13.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.13.0...@siteed/expo-audio-studio@2.13.1
[2.13.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.12.3...@siteed/expo-audio-studio@2.13.0
[2.12.3]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.12.2...@siteed/expo-audio-studio@2.12.3
[2.12.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.12.1...@siteed/expo-audio-studio@2.12.2
[2.12.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.12.0...@siteed/expo-audio-studio@2.12.1
[2.12.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.11.0...@siteed/expo-audio-studio@2.12.0
[2.11.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.10.6...@siteed/expo-audio-studio@2.11.0
[2.10.6]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.10.5...@siteed/expo-audio-studio@2.10.6
[2.10.5]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.10.4...@siteed/expo-audio-studio@2.10.5
[2.10.4]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.10.3...@siteed/expo-audio-studio@2.10.4
[2.10.3]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.10.2...@siteed/expo-audio-studio@2.10.3
[2.10.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.10.1...@siteed/expo-audio-studio@2.10.2
[2.10.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.10.0...@siteed/expo-audio-studio@2.10.1
[2.10.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.9.0...@siteed/expo-audio-studio@2.10.0
[2.9.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.8.6...@siteed/expo-audio-studio@2.9.0
[2.8.6]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.8.5...@siteed/expo-audio-studio@2.8.6
[2.8.5]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.8.4...@siteed/expo-audio-studio@2.8.5
[2.8.4]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.8.3...@siteed/expo-audio-studio@2.8.4
[2.8.3]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.8.2...@siteed/expo-audio-studio@2.8.3
[2.8.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.8.1...@siteed/expo-audio-studio@2.8.2
[2.8.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.8.0...@siteed/expo-audio-studio@2.8.1
[2.8.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.7.0...@siteed/expo-audio-studio@2.8.0
[2.7.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.6.3...@siteed/expo-audio-studio@2.7.0
[2.6.3]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.6.2...@siteed/expo-audio-studio@2.6.3
[2.6.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.6.1...@siteed/expo-audio-studio@2.6.2
[2.6.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.6.0...@siteed/expo-audio-studio@2.6.1
[2.6.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.5.0...@siteed/expo-audio-studio@2.6.0
[2.5.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.4.1...@siteed/expo-audio-studio@2.5.0
[2.4.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.4.0...@siteed/expo-audio-studio@2.4.1
[2.4.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.3.1...@siteed/expo-audio-studio@2.4.0
[2.3.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.3.0...@siteed/expo-audio-studio@2.3.1
[2.3.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.2.0...@siteed/expo-audio-studio@2.3.0
[2.2.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.1.1...@siteed/expo-audio-studio@2.2.0
[2.1.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-studio@2.1.0...@siteed/expo-audio-studio@2.1.1
[2.1.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@2.0.1...@siteed/expo-audio-stream@2.1.0
[2.0.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@2.0.0...@siteed/expo-audio-stream@2.0.1
[2.0.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.17.0...@siteed/expo-audio-stream@2.0.0
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
