# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [3.0.1] - 2026-03-21
- fix: sherpa-onnx.rn prebuilts v1.12.29 + audio-studio WASM/peerDeps fixes (#341) ([1cd247c](https://github.com/deeeed/audiolab/commit/1cd247c02f74e5402505c845f64ea2109d85a98c))
- fix/setup-validation: Android build fixes, sherpa-voice UX improvements, agentic tooling (#340) ([ff62088](https://github.com/deeeed/audiolab/commit/ff620881df09d713fd3298f723ac4ed2c4359a4a))
- refactor(agentic): centralize scripts into shared monorepo location (#339) ([8656927](https://github.com/deeeed/audiolab/commit/865692716857fa485cb7c27e0c3cbac5b154cfbe))
- fix(audio-studio): split WASM modules into web/native platform files (#338) ([5d6f192](https://github.com/deeeed/audiolab/commit/5d6f192ff8e61a40c212bd6cd7dfea84b8293ecf))
- chore(sherpa-onnx.rn): fix TS errors and add publish script (#337) ([f659464](https://github.com/deeeed/audiolab/commit/f6594648c16c414d29f600a2b0113ccda9709b69))
- Merge pull request #335 from deeeed/chore/sherpa-onnx-1.0.0 ([6bfbc56](https://github.com/deeeed/audiolab/commit/6bfbc56eeb44985044f5cf7750a6fcf981226565))
- chore(sherpa-onnx.rn): bump to 1.0.0 with changelog and publisher config ([915eb67](https://github.com/deeeed/audiolab/commit/915eb671e82883a2c8b75ce95776cef07fa09fb6))
- Merge pull request #334 from deeeed/chore/audio-ui-publisher-js ([0ad8432](https://github.com/deeeed/audiolab/commit/0ad8432cdc7202feb3e808606ae808ac231daafd))
- chore(audio-ui): convert publisher.config to JS to fix TS compilation error ([eb9a8f7](https://github.com/deeeed/audiolab/commit/eb9a8f774845759697442826a50a3f8cfd737676))
- chore(audio-ui): release @siteed/audio-ui@1.0.0 ([9b3a8ab](https://github.com/deeeed/audiolab/commit/9b3a8ab1efc7763f813e0321f0d0689a7a513ee3))
- Merge pull request #333 from deeeed/chore/audio-ui-vector-icons-devdep ([a56a1f6](https://github.com/deeeed/audiolab/commit/a56a1f688d057cc2900ebbe89016041781fee9f5))
- chore(audio-ui): add @expo/vector-icons as devDependency ([9c1df54](https://github.com/deeeed/audiolab/commit/9c1df549aa81b16108350dbd5340c08c090b3634))
- Merge pull request #332 from deeeed/chore/audio-ui-publisher-config ([c57e7d7](https://github.com/deeeed/audiolab/commit/c57e7d7dae671794233c5ae66b3b2e931141c7e7))
- chore(audio-ui): add publisher config and revert manual version bump ([c8cb160](https://github.com/deeeed/audiolab/commit/c8cb16013b38d5da12b7f8beaebfdb1cc3471f21))
- Merge pull request #331 from deeeed/refactor/rename-audio-ui ([3187efa](https://github.com/deeeed/audiolab/commit/3187efaa05cad4f94c83fbc598682625e760411d))
- chore(audio-ui): release @siteed/audio-ui@1.0.0 ([f430954](https://github.com/deeeed/audiolab/commit/f4309542bb1f668557ddbcc879a406b62c4d6a84))
- refactor(audio-ui): rename packages/expo-audio-ui to packages/audio-ui ([ccdecb8](https://github.com/deeeed/audiolab/commit/ccdecb8172c34b348bc4837f52f28adcfa2333d1))
- chore(expo-audio-studio): bump shim to 3.0.0 ([ace569f](https://github.com/deeeed/audiolab/commit/ace569fc40e84d0826f3196692b198b80b677608))
- chore(audio-studio): fix publisher config for yarn workspace ([44f246e](https://github.com/deeeed/audiolab/commit/44f246ee2eed9e28e049eb21d59815c33ca77172))
- chore(audio-studio): release @siteed/audio-studio@3.0.0 ([7d6f575](https://github.com/deeeed/audiolab/commit/7d6f575976c2bc23a96e24ab8f52fcf553719430))
- chore(audio-studio): lint fixes and update publisher config for v3.0.0 ([eada15d](https://github.com/deeeed/audiolab/commit/eada15dae9e16914b1371738bb49ab8932dcfacd))
- docs: consolidate package names and rewrite READMEs for v3.0.0 release ([05dcce6](https://github.com/deeeed/audiolab/commit/05dcce67f0de9b7b29b0ca1cc5541262bb8f402e))
- fix: replace npx with yarn across all scripts and package.json ([b8ff4fd](https://github.com/deeeed/audiolab/commit/b8ff4fd85c3aaddb7f5dcbbbb45ad6139ef0900a))
- chore: bump version to 2.0.0 ([6783055](https://github.com/deeeed/audiolab/commit/67830559b5d078f9aae0fbf057a6c3a1b2081ee4))
- fix(audio-ui): remove unused normalization prop from MelSpectrogramVisualizer ([6203170](https://github.com/deeeed/audiolab/commit/62031708f0d52efc7c062f7abbcdbcfd2cf20e3b))
- fix(audio-ui): add missing peerDependencies for react and @expo/vector-icons ([27b9c09](https://github.com/deeeed/audiolab/commit/27b9c09d657efe12077bc319655f4897b8f6f202))
- feat(playground): mel spectrogram screen with live visualization (#326) ([b9aa951](https://github.com/deeeed/audiolab/commit/b9aa9517861b3a7fbd0e9766c771766c3cf4ea00))
- fix(audio-studio): memory safety, WASM lifecycle, and platform bug fixes (#329) ([9e35f19](https://github.com/deeeed/audiolab/commit/9e35f1957c15ff6a46739b1ad2dc8af3f8e746ce))
- feat(playground): audio analysis screen with time range selector (#328) ([60b7b01](https://github.com/deeeed/audiolab/commit/60b7b01dc6ee0208060892735f6db5980fe4a197))
- feat(audio-studio): C++ mel spectrogram streaming with WASM build (#324) ([015a676](https://github.com/deeeed/audiolab/commit/015a6766f13c59098a8b4d87792e590751bf8595))
- chore: dependency and version bumps (#323) ([5d18ea5](https://github.com/deeeed/audiolab/commit/5d18ea5613c607ae2f17827202266d190ddf554e))
- feat: iOS physical device Metro connectivity plugin (#322) ([76ed6b8](https://github.com/deeeed/audiolab/commit/76ed6b85ec8635dcfe91b993d033c1b1a10f0f92))
- feat: unified preflight launch scripts and App Store fixes (#320) ([36100a0](https://github.com/deeeed/audiolab/commit/36100a05186fbbd413dc5218d438662c1518b8a4))
- fix(sherpa-onnx): pass modelBaseUrl through TtsService (missed in previous fix) ([79ae70f](https://github.com/deeeed/audiolab/commit/79ae70f0890c0f4c4de3bfe5f1c348b532f1d90f))
- fix(sherpa-onnx): pass modelBaseUrl and onProgress through all web services ([209dab9](https://github.com/deeeed/audiolab/commit/209dab9fcdf8465d5890520c65d245cef4c0a520))
- fix: deploy all wasm models locally except 2 files >100MB (served from HuggingFace) ([31592cc](https://github.com/deeeed/audiolab/commit/31592cc8e166210797cf8d2a94174f04b61e54c9))
- fix: remove only model subdirs from wasm on deploy, keep JS runtime ([efbd1de](https://github.com/deeeed/audiolab/commit/efbd1de7b336a2801cc447e3354a2934025a4c54))
- fix: only strip large model binaries from wasm deploy, keep JS loaders ([cb44136](https://github.com/deeeed/audiolab/commit/cb441369e0777a1a0ca8c7eecc072f72e7e4ba12))
- chore: remove unneeded .deploy-gitattributes ([c3a11e6](https://github.com/deeeed/audiolab/commit/c3a11e6f06fdb4424b5f2308122120054be03855))
- fix: exclude wasm/ from gh-pages deploy (models load from remote URLs) ([9252c08](https://github.com/deeeed/audiolab/commit/9252c0867356a7c3cc3e98667534619438eba2d7))
- fix: correct cp path in sherpa-voice deploy script ([2898ce3](https://github.com/deeeed/audiolab/commit/2898ce37afb7002be1c656410e541ce5a7db48fa))
- fix: inject LFS gitattributes into sherpa-voice gh-pages deploy ([03dd7ec](https://github.com/deeeed/audiolab/commit/03dd7eca916b64a635c5b18ddf8e818706bab050))
- fix: add --repo flag to gh-pages deploy scripts after audiolab rename ([50e92e1](https://github.com/deeeed/audiolab/commit/50e92e11e06c201a60a53f26ea38560ce41724db))
- fix(docs): escape TS generics, add post-process script, update package refs ([ce8672b](https://github.com/deeeed/audiolab/commit/ce8672bcf35a21fabf806be542190994ba06c21e))
- Merge pull request #318 from deeeed/feat/cpp-mel-spectrogram ([216fae6](https://github.com/deeeed/audiolab/commit/216fae66076d5fbe9929452128b2f18b3b6ece74))
- perf: optimize mel spectrogram C++ implementation ([02cc305](https://github.com/deeeed/audiolab/commit/02cc3056455d390f157fe0e102666084f75a3806))
- feat: add shared C++ mel spectrogram implementation ([35fed96](https://github.com/deeeed/audiolab/commit/35fed9604b20bba03c8928bfa5794c8725b50498))
- Merge pull request #319 from deeeed/refactor/rename-audiostudio ([636bc82](https://github.com/deeeed/audiolab/commit/636bc82c8bc251a9905278d8a29ed099c4b376e1))
- refactor: update all remaining old name references across docs, configs, and source ([c62d84d](https://github.com/deeeed/audiolab/commit/c62d84dc5e50a5c4bc984740b329e8b1faec340a))
- refactor: rename native module ExpoAudioStream → AudioStudio ([bce29b1](https://github.com/deeeed/audiolab/commit/bce29b1ff8b780699f4d219f5facaf0ef86f61e7))
- refactor: rename all internal references from expo-audio-studio/expo-audio-ui to audio-studio/audio-ui ([791a7b4](https://github.com/deeeed/audiolab/commit/791a7b4bacaef6d4f3481c3b1194acdc1f81e012))
- fix: correct plugin path expo-audio-studio -> audio-studio in app.config ([34eeef3](https://github.com/deeeed/audiolab/commit/34eeef328f367d9640bf3b5667e098ef550e8cfc))
- fix: update repo references from expo-audio-stream to audiolab ([33ef4e2](https://github.com/deeeed/audiolab/commit/33ef4e26f9df9a33bf8b2fbf3362d6bbdfc97d44))
- fix: repair shim package for npm publishing, document release process ([92045b3](https://github.com/deeeed/audiolab/commit/92045b384e217e8a9439762bdd8f88d8b1303073))
- chore: rename repo references audio-suite → audiolab ([d0f62e8](https://github.com/deeeed/audiolab/commit/d0f62e884c4d6c9e14af47669179fe03177f0d4c))
- refactor: rename packages to @siteed/audio-studio and @siteed/audio-ui, add expo-audio-studio shim ([9d8c63d](https://github.com/deeeed/audiolab/commit/9d8c63da36af2feff9b0d80f2e5d0799395ad9d7))
- docs: add migration banner to README ([5f31420](https://github.com/deeeed/audiolab/commit/5f31420e193a69c94a2d44f85e8ab5ca64d4fdfa))
- docs: add MIGRATION.md for audio-suite rename ([1a3b758](https://github.com/deeeed/audiolab/commit/1a3b75806da4b45399e9a1885c57af52cf975cdb))
- chore(sherpa-voice): add store assets and Android tablet screenshots ([ceb610e](https://github.com/deeeed/audiolab/commit/ceb610eb51736f2ef1292a4095b7cbab46a6783d))
- chore(sherpa-voice): add tablet/appstore detox configs and move expo-dev-client to devDependencies ([4121dfa](https://github.com/deeeed/audiolab/commit/4121dfa2b71654fb85b7b5024cd6b1f408e1d400))
- fix(deploy): add submit_local_build helper and iPad screenshot support ([c4d18d5](https://github.com/deeeed/audiolab/commit/c4d18d5fb16364947189a35b10e814d2eed491d2))
- fix(sherpa-voice): remove unnecessary FOREGROUND_SERVICE_MEDIA_PLAYBACK permission ([149510f](https://github.com/deeeed/audiolab/commit/149510fa9670c152f8094e159754d83f06250006))
- feat(sherpa-voice): load all web models from HuggingFace CDN (#317) ([ae4aca9](https://github.com/deeeed/audiolab/commit/ae4aca985f610a71024b2d93b746b32d5b9a6586))
- chore(sherpa-voice): add changelog generation script ([684e171](https://github.com/deeeed/audiolab/commit/684e1712382d385c407914568b9d4085ece9f5c1))
- chore(sherpa-voice): add preview profile, store submission config, and privacy policy ([16ea4a6](https://github.com/deeeed/audiolab/commit/16ea4a631e8c1f2554ea14cf4571ec392d161ad4))
- fix: correct sherpa-voice 404 redirect path and skip .html files ([04a66cb](https://github.com/deeeed/audiolab/commit/04a66cbe5f0fcd0cfbb12775ea4e14a6c22f3680))
- fix(sherpa-voice): dynamic WASM base path for GitHub Pages deployment ([08fc026](https://github.com/deeeed/audiolab/commit/08fc0268f1745cf2871e8b026724fa7bb8a960a5))
- fix(sherpa-onnx.rn): detect WASM base path for non-root web deployments ([71bf502](https://github.com/deeeed/audiolab/commit/71bf502e6e9059532266f5d72db8bc72f6a26996))
- chore: bump version to 1.10.1 ([00d8261](https://github.com/deeeed/audiolab/commit/00d8261ed29ca2433b1f9d708f00feafbb56cb48))
- chore: bump version to 1.0.1 ([372980f](https://github.com/deeeed/audiolab/commit/372980fffc9230cbd7f594be0dbeac51293bf720))
- feat: rename sherpa-onnx-demo to sherpa-voice with full rebrand (#316) ([eac9fc2](https://github.com/deeeed/audiolab/commit/eac9fc205619844f6811f08ee3887fd619f32a5a))
- feat(expo-audio-studio): add streamFormat:'float32' for zero-overhead ML streaming (#315) ([2ccfed3](https://github.com/deeeed/audiolab/commit/2ccfed3ae38ccd208c252181f871284fc4c85519))
- feat(sherpa-onnx): web/WASM full feature parity with live microphone (#313) ([2899f50](https://github.com/deeeed/audiolab/commit/2899f5027eb54535b029f0a9d65c4595c7a621f8))
- feat(sherpa-onnx): complete native feature set — diarization, denoising, UX improvements (#312) ([b588034](https://github.com/deeeed/audiolab/commit/b5880348a96f5ad3fd77c07479b51b440d884816))
- feat(playground): add agentic UI interaction and restore tab header (#311) ([c5157c0](https://github.com/deeeed/audiolab/commit/c5157c0c928eab2edb42de7105c25d6f6bd6b085))
- chore(expo-audio-studio): standardize changelog fix scope prefix ([a7f40f7](https://github.com/deeeed/audiolab/commit/a7f40f769cdf0ed7235248ad4e8315d542ac5f71))
- fix(playground): apply safe area top inset across all tab screens ([5d3dab6](https://github.com/deeeed/audiolab/commit/5d3dab6ec0840a9df7e42d622bcd6a869f7fab48))
- feat(playground): migrate tab layout to native bottom tabs ([7e4adf4](https://github.com/deeeed/audiolab/commit/7e4adf4c31a0737e1c6b88485fa689da60417049))
- feat(playground): add interactive Metro CLI ([4879421](https://github.com/deeeed/audiolab/commit/4879421c4cf72d307544c7c747424740d3f86109))
- fix(expo-audio-studio): fix publisher release script for Yarn 4 compatibility ([07fed98](https://github.com/deeeed/audiolab/commit/07fed988942507e114f7cd571611aa14026fe455))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.18.6 ([9ad0f7a](https://github.com/deeeed/audiolab/commit/9ad0f7a539d4c04fd0f9a5d8fda9244f8d30e8a5))
- Merge pull request #309 from deeeed/fix/ios-device-switch ([b28777b](https://github.com/deeeed/audiolab/commit/b28777be940c8ff4ccd06aa74bde6d7f8b63f505))
- chore(expo-audio-studio): update CHANGELOG for iOS device switching fixes ([518355c](https://github.com/deeeed/audiolab/commit/518355c9eb07ee13e5670d56478174ecd15e9564))
- fix(ios): fix audio device switching bugs during active recording ([1948c50](https://github.com/deeeed/audiolab/commit/1948c50482d7a995d3fe2a43d23b3740fb7e2954))
- chore: bump version to 1.9.0 ([eb67135](https://github.com/deeeed/audiolab/commit/eb67135559f4de00094c7d3bd23fb416bca185b6))
- Merge pull request #307 from deeeed/feat/sdk-55-upgrade ([90b6288](https://github.com/deeeed/audiolab/commit/90b628882fc3de704c8cb5be6a14e6e4715b4027))
- feat: upgrade monorepo from Expo SDK 54 to SDK 55 ([91457bc](https://github.com/deeeed/audiolab/commit/91457bc0883fc0556b857513aed0a726f7687102))
- chore: bump version to 1.8.1 ([896dc40](https://github.com/deeeed/audiolab/commit/896dc40411e3f9eddab9ec143203a1f85894dbaa))
- chore(root): release 0.7.2 ([e688156](https://github.com/deeeed/audiolab/commit/e68815655187f8c862eaad4a5c9804f1a1dedb02))
- docs: update api references for v2.18.5 ([0cf8fad](https://github.com/deeeed/audiolab/commit/0cf8fad9265a8bfd4399ebdea7e611e66b397bb4))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.18.5 ([02ffb8d](https://github.com/deeeed/audiolab/commit/02ffb8ddbf4c4c6d08b7c13479558a436c0e02e4))
- fix(expo-audio-studio): guard Bluetooth API calls behind permission check on API 31+ (#294) ([05d6e5a](https://github.com/deeeed/audiolab/commit/05d6e5adb0b8aff35d88aea264d8b75ebb1ae1e4))
- fix(expo-audio-studio): migrate phone state listener to TelephonyCallback on API 31+ (#275) ([cace0e7](https://github.com/deeeed/audiolab/commit/cace0e77854c9f5d98abcd320c3759cd765c22da))
- chore: remove ephemeral triage notes from repo ([271cb62](https://github.com/deeeed/audiolab/commit/271cb62927f42457d9974b99dabaf573201b40ab))
- docs: add physical device connectivity rules and issues triage ([f0e9ec5](https://github.com/deeeed/audiolab/commit/f0e9ec5d80fd302f11c1e578e2d4aede04ef996c))
- fix(playground): improve Metro port config for physical devices ([4e3baf4](https://github.com/deeeed/audiolab/commit/4e3baf40d002d1d0d523b45f8a6e47ec20fce5af))
- fix(expo-audio-studio): reset startTime in startRecording and validate hardware format (#298, #223) ([9eee59f](https://github.com/deeeed/audiolab/commit/9eee59fdb0bb0c3435c728a37880541914a181d0))
- fix(expo-audio-studio): gate foreground service on enableBackgroundAudio (#288, #294) ([ea6ff85](https://github.com/deeeed/audiolab/commit/ea6ff855cf6e333cdddd8be0d9581cb7481d7d6f))
- docs: update task tracking format in CLAUDE.md ([2c05ab7](https://github.com/deeeed/audiolab/commit/2c05ab7f9e8d19d45e1bfbe6957c231c793dfa76))
- docs: add task tracking guidelines to CLAUDE.md ([9bf60b1](https://github.com/deeeed/audiolab/commit/9bf60b12a3de0e7417bee1b38b985413d843a783))
- fix(playground): add horizontal padding to slider handles on trim/preview screens ([c1826d0](https://github.com/deeeed/audiolab/commit/c1826d0265d1dc01b549ada2d87a1dbed6a2997b))
- fix(expo-audio-ui): enlarge AudioTimeRangeSelector handles and fix end-handle clamping ([036ebf2](https://github.com/deeeed/audiolab/commit/036ebf2c5f2e946c97d5eee159fc062582282e0a))
- fix(playground): skip icon font alias registration in dev mode on Android ([f70eaf4](https://github.com/deeeed/audiolab/commit/f70eaf471d58366ef4d84c59c8f938074eb095a1))
- feat(playground): add native module validation tests to agentic bridge ([1176e53](https://github.com/deeeed/audiolab/commit/1176e53c3a3a6695be3f05d64d2613ac54e41637))
- fix(expo-audio-studio): sanitize options before native bridge calls to prevent Android crash ([5af91d6](https://github.com/deeeed/audiolab/commit/5af91d6bae0bee92013dc21023e38765cbbd94f3))
- fix(playground): 16KB page alignment, open:ios fallback, EAS open-testing track ([cf680ec](https://github.com/deeeed/audiolab/commit/cf680ec8a8debc61eff5feabb6b5009d468b20e6))
- docs: add EAS/prebuild critical rules to CLAUDE.md ([a097650](https://github.com/deeeed/audiolab/commit/a097650f27d89d0ea30ab73b61d40274222a224e))
- chore(playground): add build:ios:production:local script and ascAppId for submit ([5ad01c8](https://github.com/deeeed/audiolab/commit/5ad01c88ab64d49fbd5dd8927c1187d97a4b184e))
- fix(playground): whisper.rn memory fix, build-from-source flag, iOS font dedup ([0bc4e64](https://github.com/deeeed/audiolab/commit/0bc4e64eebcdcc6d02c83396a460e0fc784741c4))
- fix(playground): load icon fonts via ExpoFontLoader.loadAsync on Android ([455a071](https://github.com/deeeed/audiolab/commit/455a07176eb594c90c5a8f6b215157a0c8217f09))
- fix(android): 16KB page alignment, icon fonts, and quick-base64 upgrade ([5ebd5e4](https://github.com/deeeed/audiolab/commit/5ebd5e46e6e2dae8a0f54e4d0f11e6455660cda8))
- fix(playground): remove stale whisper.rn patch (already upstreamed) ([8108b91](https://github.com/deeeed/audiolab/commit/8108b91e6d8e19b5be4a7225d336d51abb27344d))
- chore: bump version to 1.8.0 ([47fd7d1](https://github.com/deeeed/audiolab/commit/47fd7d1b1bf62257aaaa92905a754b6418d91c16))
- chore(root): release 0.7.1 ([112efe8](https://github.com/deeeed/audiolab/commit/112efe89058b9c61dfb0f136c51c83ec8a9593d6))
- feat(playground): fix cdp-bridge bugs and add wake-devices script ([d98bc57](https://github.com/deeeed/audiolab/commit/d98bc57ecf86f1e5c04e8fef2cca8bc4b31746a6))
- feat(playground): CDP agentic bridge for multi-platform automation ([48d7dda](https://github.com/deeeed/audiolab/commit/48d7dda2b017c9b9029c716ea1c0b4dc18a135c9))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.18.4 ([d93ceae](https://github.com/deeeed/audiolab/commit/d93ceae943c98322d34d38f5e76f2da91bd739a2))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.18.3 ([61d58e5](https://github.com/deeeed/audiolab/commit/61d58e57fd624182aef9983745bf82f584ffc2c7))
- chore(minimal): add compressed recording support for validation ([80de29e](https://github.com/deeeed/audiolab/commit/80de29e8bbc3aa79606c6f855526f06b982c3a2a))
- fix(expo-audio-studio): include compression data in iOS onAudioStream events ([e0444f3](https://github.com/deeeed/audiolab/commit/e0444f321803deee1aa5fc4259a3e160a668869f))
- fix: include CHANGELOG.md in deploy script version commits ([ee0989f](https://github.com/deeeed/audiolab/commit/ee0989fb8bf203f21d8104e125195d559ce4b4cb))
- chore(playground): update CHANGELOG for v1.7.0 ([86099d3](https://github.com/deeeed/audiolab/commit/86099d3aabee2c75a5b37e62ddfd9845105089c4))
- chore: bump minimal app version to 1.0.1 ([795293d](https://github.com/deeeed/audiolab/commit/795293ded251b23eb311bdab4dc8d2cdb3929b87))
- chore: bump version to 1.7.0 ([ce8d5c0](https://github.com/deeeed/audiolab/commit/ce8d5c025153d5e4798eb4e90a693a9ba765d99e))
- chore: upgrade to Expo SDK 54 (React Native 0.81, React 19.1) (#305) ([f8ff916](https://github.com/deeeed/audiolab/commit/f8ff916865ae9139282cad088c6b920adb59f6c2))
- Revert "chore: upgrade to Expo SDK 54 (React Native 0.81, React 19.1) (#303)" (#304) ([6ef8a2f](https://github.com/deeeed/audiolab/commit/6ef8a2f91973055fc026c3190355bb375052b699))
- chore: upgrade to Expo SDK 54 (React Native 0.81, React 19.1) (#303) ([822d82c](https://github.com/deeeed/audiolab/commit/822d82c007da13fdb8dc85698a7b87f8613e5383))
- feat: properly emit final chunk of audio data in android (#293) ([b468495](https://github.com/deeeed/audiolab/commit/b46849595562cbc2a0914240e60ebcc225bbb889))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.18.2 ([bc0e6cc](https://github.com/deeeed/audiolab/commit/bc0e6cc2b2b1d82a14319c8e6aae4b3f49c8aa4b))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.18.1 ([067ebfe](https://github.com/deeeed/audiolab/commit/067ebfe3b6ad3c506e64c3988b67ea90dc894c18))
- feat: improved memory monitoring ([55dfe16](https://github.com/deeeed/audiolab/commit/55dfe16d7e8c372392738d1441776a760e7ecdbe))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.18.0 ([cc80ac5](https://github.com/deeeed/audiolab/commit/cc80ac5fa7ece05fc9fae031f101163acce2aff4))
- feat(expo-audio-studio): optimize buffer size on android to prevent oom ([32fcb9b](https://github.com/deeeed/audiolab/commit/32fcb9b0a965669b3a37c9860998ae46a1d26cd8))
- fix(expo-audio-studio): invalid paused duration on android ([c107258](https://github.com/deeeed/audiolab/commit/c107258054ebdbc733298c84b8d84b0f9f416e6e))
- feat: update dpeendencies in minimal app ([2d3622c](https://github.com/deeeed/audiolab/commit/2d3622c2298029e41d5ab0d57660973311cbcf18))
- feat: changelog update ([e7e4fca](https://github.com/deeeed/audiolab/commit/e7e4fca221a1c191e6f2d3bd29161308ffad5296))
- chore: bump version to 1.6.0 ([7f970f8](https://github.com/deeeed/audiolab/commit/7f970f81bc6ec9c5e648fd5dd086f6159ac8d3ef))
- chore(root): release 0.7.0 ([3a700e3](https://github.com/deeeed/audiolab/commit/3a700e3691b194931dfd38d9828c77f3c65cb1c6))
- docs: update api references for v2.17.0 ([7c8399f](https://github.com/deeeed/audiolab/commit/7c8399f8f61dcb2fef2b1f8d683fe0b4b19cd366))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.17.0 ([8a303b4](https://github.com/deeeed/audiolab/commit/8a303b4d96988b97604123d74daaa406d9ec517c))
- fix(expo-audio-ui): prevent Reanimated crashes in AudioVisualizer animations ([ea01bb3](https://github.com/deeeed/audiolab/commit/ea01bb3ac3b41bf655a7ac5efa513a07f7836dff))
- fix(expo-audio-studio): fix OutOfMemoryError by tracking stream position correctly ([b67e521](https://github.com/deeeed/audiolab/commit/b67e52142154d07873c5c1ec9c183d524d61e528))
- docs: update api references for v2.16.2 ([8720c27](https://github.com/deeeed/audiolab/commit/8720c273174a8081b15c6da24c1671e8493d8ee9))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.16.2 ([c4291a8](https://github.com/deeeed/audiolab/commit/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.16.1 ([c9614d4](https://github.com/deeeed/audiolab/commit/c9614d4ebf87d73c3c5b2f7d6e60492fd5e45e64))
-  fix(expo-audio-studio): fix Android audio analysis accumulation showing 0 bytes ([012d478](https://github.com/deeeed/audiolab/commit/012d478c372db12b9fcf4a49f567d6618eb499f1))
- chore: lockfile update ([9b04aad](https://github.com/deeeed/audiolab/commit/9b04aad81e18e4c37939684b5697d1ea7c5e126b))
- docs: update api references for v2.16.0 ([b064e23](https://github.com/deeeed/audiolab/commit/b064e23e52c2d1e9bd3502cae7737d1ccfbe34d1))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.16.0 ([34c8c0f](https://github.com/deeeed/audiolab/commit/34c8c0f2f587ecde9adf97c539289b128f0bccc1))
- feat(expo-audio-studio): optimize stop recording performance for long recording on android ([4553dc9](https://github.com/deeeed/audiolab/commit/4553dc9d2bd101a461f3f2eadfed63114f7d1b22))
- chore: update expo and expo-router versions in package.json and yarn.lock to 53.0.20 and 5.1.4 respectively ([866b0fd](https://github.com/deeeed/audiolab/commit/866b0fd3e819471e17863949dfef5680bc0dc8e3))
- docs: update api references for v2.15.0 ([2aec7e9](https://github.com/deeeed/audiolab/commit/2aec7e955b330a5dad466eaabf208c2f1a463e3f))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.15.0 ([1af374a](https://github.com/deeeed/audiolab/commit/1af374ada18ec2cd4edeb151fc0e91e54f783b9e))
- feat(android): add showPauseResumeActions option to notification config (#282) ([4af2911](https://github.com/deeeed/audiolab/commit/4af2911f786545093c87d3501b1b7e1b1663f8bb))
- feat(android): add showPauseResumeActions option to notification config ([7456153](https://github.com/deeeed/audiolab/commit/7456153beb3f5041bd0199595b29d6b62c6b4c8f))
- docs: update api references for v2.14.9 ([06b2e49](https://github.com/deeeed/audiolab/commit/06b2e49c0c2065346fa65dfd2901649e2c04aff0))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.9 ([34ea510](https://github.com/deeeed/audiolab/commit/34ea5104fe661743627b2234f95382ba6980a44c))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.8 ([4598073](https://github.com/deeeed/audiolab/commit/4598073062e05139bfa7d9ed80896c90359f0e18))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.7 ([93c5a53](https://github.com/deeeed/audiolab/commit/93c5a53822b9115f0b3647e833320b5c7a6bd03f))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.6 ([829a70e](https://github.com/deeeed/audiolab/commit/829a70e0ff8e077aa77197387f3a0b285e846fcd))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.5 ([ee7e3ce](https://github.com/deeeed/audiolab/commit/ee7e3ce39696c8a806574a858473dd664d5ac435))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.4 ([44848d7](https://github.com/deeeed/audiolab/commit/44848d7a0f62dcc2dd2fa6165dbe0ce965f95254))
-  fix(plugin): respect enableDeviceDetection configuration for Android permissions ([32647c8](https://github.com/deeeed/audiolab/commit/32647c8d80bd33406f7dcabcf2823beaf3ba3b62))
- fix(audio-studio): add missing Bluetooth_ADMIN permission for device detection ([5a56900](https://github.com/deeeed/audiolab/commit/5a5690025a3c2ac279b853e21470015935b9a469))
- feat(playground): enhance Storybook integration and configuration (#281) ([95e943a](https://github.com/deeeed/audiolab/commit/95e943a48879310211eddc992c53e35bef700729))
- fix: resolve Storybook bundling conflicts in normal app mode ([3257bb5](https://github.com/deeeed/audiolab/commit/3257bb56ee68a74e320f1d0dfb95c57182e61358))
- feat: implement comprehensive Storybook setup for React Native and Web ([d2182a5](https://github.com/deeeed/audiolab/commit/d2182a5398ad7fd2ab5f3f781dfdfe72045e93af))
- docs: add mandatory TypeScript validation to agent memory system ([027eff7](https://github.com/deeeed/audiolab/commit/027eff782181435a860abc13b6c28063084f8827))
- fix: resolve TypeScript Jest globals errors in Storybook validation test ([095a5b3](https://github.com/deeeed/audiolab/commit/095a5b3f9c6ac9713c234fe26bebc1b6cf215444))
- docs: add AI agent memory system to prevent implementation mistakes ([84bd307](https://github.com/deeeed/audiolab/commit/84bd3077ebebd914430abe74e8feb62abfe0f5aa))
- chore: lockfile update ([a4fea71](https://github.com/deeeed/audiolab/commit/a4fea7195e1dd93e9942b10dac9b4f872c49202f))
- docs: update api references for v2.14.3 ([9a0ed23](https://github.com/deeeed/audiolab/commit/9a0ed232da89bb7e21a6dbb1d130a01888cad216))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.3 ([e496f5d](https://github.com/deeeed/audiolab/commit/e496f5dd1024dfffefc22b133ee7e25a9e09a3b7))
- chore(playground): update to latest expo ([6eeb989](https://github.com/deeeed/audiolab/commit/6eeb989a827160ab58d56122af2cffbb5f3daf9e))
- chore: changelog ([d73b6ed](https://github.com/deeeed/audiolab/commit/d73b6ed92b17dd2fe4e6028d9915a7216946c927))
- refactor(AudioRecorderManager): remove analysis bit depth logging for cleaner debug output ([ddaf9e2](https://github.com/deeeed/audiolab/commit/ddaf9e25c0bf9bad1e3435b9ec08b3b4a27a6161))
- chore(root): release 0.6.0 ([ce81ffb](https://github.com/deeeed/audiolab/commit/ce81ffbd89fe73c1b36ed0d2989a86915f990ee0))
- feat: upgrade Storybook to v9.0.8 and establish UI development (#273) ([76cb02f](https://github.com/deeeed/audiolab/commit/76cb02fc50caafa05f0215a5364d7d109f3df359))
- docs: update api references for v2.14.2 ([a73aafb](https://github.com/deeeed/audiolab/commit/a73aafb8a9603fe19b99198b766a8641be79de9d))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.2 ([cf134fc](https://github.com/deeeed/audiolab/commit/cf134fc47969a1847375db6ab9d66bb0b73aabc3))
- docs: add performance and file size documentation ([0dd88ca](https://github.com/deeeed/audiolab/commit/0dd88cae2ee2b949d592dddafa4f890b7a8e3a40))
- test(playground): add file size collection e2e tests ([fb99b96](https://github.com/deeeed/audiolab/commit/fb99b96cdb4de6b1be26fe82116abb0ad3acddf3))
- fix(ios): update compressed file size when primary output is disabled ([9f03ee0](https://github.com/deeeed/audiolab/commit/9f03ee0b18f1c079e5aaf13267e19f095ad3b7ea))
- feat(expo-audio-studio): add platform limitations validation and documentation ([7e062ff](https://github.com/deeeed/audiolab/commit/7e062ff837865b735f0cabdb9e2b755ce55a94c6))
- chore: remove invalid detox values ([f7f63d1](https://github.com/deeeed/audiolab/commit/f7f63d182451e642f58590c1ccab7895b4391111))
- docs: reorg ([0251063](https://github.com/deeeed/audiolab/commit/0251063893c6464ec6410ec6e08866e12d3113a7))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.1 ([f9378fe](https://github.com/deeeed/audiolab/commit/f9378feeed1cf94ef712f33ae13735a018abcd4f))
- fix(android): Fix duration returning 0 when primary output is disabled (#244) ([38d6f50](https://github.com/deeeed/audiolab/commit/38d6f50c084a10329be33a0f1c123aa9f457c371))
- feat(performance): add performance documentation specification for file size analysis ([af33ecf](https://github.com/deeeed/audiolab/commit/af33ecfa55120ee450d1469ef5f306c338c7d3d8))
- chore: cleanup ([ccc7790](https://github.com/deeeed/audiolab/commit/ccc7790ecacf0278ddd876a36fe20e3e49daa283))
- chore: bump version to 1.5.0 ([1c8a8a6](https://github.com/deeeed/audiolab/commit/1c8a8a6dbeb13b8543812162d67c7c3fb02335a5))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.14.0 ([1b88eb8](https://github.com/deeeed/audiolab/commit/1b88eb8bf74909004f521eefe41ebc7723201edf))
- feat(playground): add stop recording performance measurement to agent-validation (#272) ([1ad2012](https://github.com/deeeed/audiolab/commit/1ad2012a1751837f4a932354db066c6424f7cc68))
- feat(expo-audio-studio): comprehensive cross-platform stop recording performance optimization ([b3ed474](https://github.com/deeeed/audiolab/commit/b3ed474d91994698fe082354621adc98e758557e))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.13.2 ([69bfc0f](https://github.com/deeeed/audiolab/commit/69bfc0f3434b12633725ba013add70507fcf55b3))
- fix: invalid type exports ([18340ea](https://github.com/deeeed/audiolab/commit/18340eac9cfef39691637400fc6af811d5b004df))
- docs: update api references for v2.13.1 ([7d25c9f](https://github.com/deeeed/audiolab/commit/7d25c9f129b2ccdfc8633a36922599b096cffd9d))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.13.1 ([9ccce85](https://github.com/deeeed/audiolab/commit/9ccce858174254387aac44d30853c908707d8254))
- feat(investigation): resolve Issue #251 - comprehensive sub-100ms audio events analysis (#270) ([4813f1e](https://github.com/deeeed/audiolab/commit/4813f1ef05f3856b58ec8fde95b7b8909feb513d))
- chore: changelog update ([2304b61](https://github.com/deeeed/audiolab/commit/2304b61bca15600191c4454b4b226467655c2cc1))
- fix(deps): update expo-modules-core peer dependency for Expo SDK 53 compatibility ([40b946f](https://github.com/deeeed/audiolab/commit/40b946f83eecd3fdcedfe7a2cbac62f1207a4ff0))
- docs: updated docs site ([8a01a97](https://github.com/deeeed/audiolab/commit/8a01a97ebee927a2dfa0a7cb40b11329410509d2))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.13.0 ([cbd4a23](https://github.com/deeeed/audiolab/commit/cbd4a23f12073e71995f65e1ad122e720eefa920))
- chore: changelog update ([63be8bc](https://github.com/deeeed/audiolab/commit/63be8bc6affabd18e2b2602fc39f2fe4b5bd8cf0))
- feat(expo-audio-studio): enhance device detection and management system - Add configurable device detection with enableDeviceDetection option - Implement automatic device change events (connect/disconnect) - Add device connection/disconnection event handling across platforms - Improve AudioDeviceManager with temporary disconnection tracking - Add force refresh capabilities for immediate device updates - Enhance iOS device monitoring with connection detection - Update plugin to conditionally add device detection permissions - Add device filtering to prevent UI flickering during disconnections - Improve logging and debugging capabilities - Add device detection initialization methods - Closes #268 (#269) ([97ceef0](https://github.com/deeeed/audiolab/commit/97ceef003ddb8eb5246cda8a5a00ddc75bf665a0))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.12.3 ([795cf58](https://github.com/deeeed/audiolab/commit/795cf5870b2f66942873168c89818527aaa2d61e))
- refactor(expo-audio-studio): adjust audio focus request timing in AudioRecorderManager ([317367c](https://github.com/deeeed/audiolab/commit/317367cb29fa09016aa73884f2f51e9cfdee1086))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.12.2 ([14db4eb](https://github.com/deeeed/audiolab/commit/14db4ebfdeb9181e82e810d61283738d41c40a1a))
- fix: audio focus strategy implementation for Android background recording (#267) ([5b7b7ed](https://github.com/deeeed/audiolab/commit/5b7b7eda86bbd65becbe6bab44a44cdf6a1fb17d))
- docs: update api references for v2.12.1 ([74a12a5](https://github.com/deeeed/audiolab/commit/74a12a520ea210f53d8650fee0c16b794f4208ff))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.12.1 ([bbdd3de](https://github.com/deeeed/audiolab/commit/bbdd3decaa750fbf29d5ddaf443493cc894c7375))
- feat(playground): implement agent validation framework and enhance testing capabilities (#266) ([e7937e0](https://github.com/deeeed/audiolab/commit/e7937e0268f54f85ea2e0171b221f7ef29cc6248))
- docs: update api references for v2.12.0 ([91a29d6](https://github.com/deeeed/audiolab/commit/91a29d62d5a1b3b97b191d8981b3317722884434))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.12.0 ([7b07755](https://github.com/deeeed/audiolab/commit/7b07755001ee12fbd6e31851daf59b90f4897232))
- chore: changelog update ([5c14cf9](https://github.com/deeeed/audiolab/commit/5c14cf953cf049c7fac1ffbad8a193edfaf127ae))
- fix(android): resolve PCM streaming duration calculation bug (Issue #263) (#265) ([a0c5500](https://github.com/deeeed/audiolab/commit/a0c550099fec9d6b0d486440819173d9d9275908))
- feat(expo-audio-studio): implement Android-only audioFocusStrategy (#264) ([cc77226](https://github.com/deeeed/audiolab/commit/cc7722605a5502a58b8236b610c9bdccf5f7f561))
- docs: fix comment formatting in OutputConfig interface for clarity ([07fac61](https://github.com/deeeed/audiolab/commit/07fac61245843c601709bb7576db6e48b2106cf7))
- docs: update api references for v2.11.0 ([16ee98e](https://github.com/deeeed/audiolab/commit/16ee98e5173e509046ca38fbcfcacf5b8ff7f141))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.11.0 ([ce05d47](https://github.com/deeeed/audiolab/commit/ce05d475b5bcbdb69a6269a6725b5e684604d29e))
- refactor(expo-audio-studio): remove android/build.gradle and add device disconnection fallback tests ([36fe9a9](https://github.com/deeeed/audiolab/commit/36fe9a921505e136ea50406d4b664c597293ffd8))
- fix(expo-audio-studio): enforce 10ms minimum interval on both platforms (#262) ([035fc07](https://github.com/deeeed/audiolab/commit/035fc076334c169a2371527bad0ca60f222d10ee))
- fix(expo-audio-studio): add proper MediaCodec resource cleanup in AudioProcessor ([2b069b6](https://github.com/deeeed/audiolab/commit/2b069b6ae512f97fae80df1b8cb38bb3a14538e5))
- feat(expo-audio-studio): add audio format enhancement specification and tests ([ace22a2](https://github.com/deeeed/audiolab/commit/ace22a22cf6c94ec58ddd4f6cb44f77dd383d6bc))
- feat\!: Add M4A support with preferRawStream option (#261) ([c9faeb0](https://github.com/deeeed/audiolab/commit/c9faeb01cd5dcd7407f73a0f7e6d5822adb862a4))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.6 ([68f5c60](https://github.com/deeeed/audiolab/commit/68f5c6034432c1b8b149f1a3e0c610b378216043))
- fix(expo-audio-studio): prevent durationMs returning 0 on iOS (#244) (#260) ([595e5d5](https://github.com/deeeed/audiolab/commit/595e5d56991c9fa88c2fa4e39efb197916cb8b84))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.5 ([d8c6e1d](https://github.com/deeeed/audiolab/commit/d8c6e1de72ccb0c8885a4f5f3326e3229d9dfd92))
- fix(expo-audio-studio): enable audio streaming when primary output is disabled on iOS (#259) ([1d2bb92](https://github.com/deeeed/audiolab/commit/1d2bb9280e7d596ed77de30b37e043fd7f8f8cc8))
- docs: update api references for v2.10.4 ([df7ea51](https://github.com/deeeed/audiolab/commit/df7ea516bd152ea1172c65a19c500c680a8f1ca8))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.4 ([32f8c9e](https://github.com/deeeed/audiolab/commit/32f8c9ee1d65f52370798654be389de1569e851f))
- fix(expo-audio-studio): resolve Swift compilation scope error in AudioStreamManager (#256) ([b44bf3d](https://github.com/deeeed/audiolab/commit/b44bf3d6d85a3f953d84b024bba828163354a40b))
- fix(sherpa-onnx.rn): fix iOS TurboModule architecture compatibility (#254) ([6d35b66](https://github.com/deeeed/audiolab/commit/6d35b661102f92e6a3d5f13808a46257764c5cca))
- feat: implement native integration testing framework for sherpa-onnx.rn (#252) ([a846190](https://github.com/deeeed/audiolab/commit/a8461909f1dab89d633890f41d3075642cbfc6d4))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.3 ([5e23474](https://github.com/deeeed/audiolab/commit/5e23474f9d0b0bcf643098b85779d413d0dc9348))
- fix: prevent UninitializedPropertyAccessException crash in developer menu (#250) ([83c1fd7](https://github.com/deeeed/audiolab/commit/83c1fd75c9aa022eab1125df251700e3e87c4371))
- fix: return compression info when primary output is disabled (issue #244) (#249) ([31d97c1](https://github.com/deeeed/audiolab/commit/31d97c1f7602aaf62969d26cc2fc2b7984ab24cc))
- chore: lockfile update ([d4c283a](https://github.com/deeeed/audiolab/commit/d4c283aa6c2ec6f1be90759ea24b590116539182))
- docs: update api references for v2.10.2 ([5753d9f](https://github.com/deeeed/audiolab/commit/5753d9fd3d62d263eee27b7657772ea8a43b24cb))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.2 ([fc32bf3](https://github.com/deeeed/audiolab/commit/fc32bf3efef3f8f402e17ca4f3940494e467e904))
- fix: Buffer size calculation and document duplicate emission fix for … (#248) ([204dde5](https://github.com/deeeed/audiolab/commit/204dde5137620e80c9a22a5a27a395a2149f33f0))
- chore: update TypeScript resolution and checksum in yarn.lock ([4e94da8](https://github.com/deeeed/audiolab/commit/4e94da82fe98524130e183875401b2aa4bebc884))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.1 ([0acbfc5](https://github.com/deeeed/audiolab/commit/0acbfc5b145b478cc913baf7fd798573d8c2f305))
- fix(useAudioRecorder): update intervalId type for better type safety ([dc0021a](https://github.com/deeeed/audiolab/commit/dc0021ae0dc2b1e31f61c1340529b655f85447fc))
- chore: update deploy script to use dlx for eas-cli commands ([5babd72](https://github.com/deeeed/audiolab/commit/5babd72c2441f7c6710d4a288173a391e472f7c1))
- chore: update deploy script to use yarn for eas commands ([30b6907](https://github.com/deeeed/audiolab/commit/30b690760a7c9ac7b6b9f0960cf5a8f0cacd8bd1))
- chore: bump version to 1.4.0 ([f323422](https://github.com/deeeed/audiolab/commit/f323422187e6cabc7192ada5c62a8a634ca45ac2))
- docs: update api references for v2.10.0 ([49f9fc0](https://github.com/deeeed/audiolab/commit/49f9fc03f094289bf332dea345e51ba42b505860))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.0 ([bb8418f](https://github.com/deeeed/audiolab/commit/bb8418f2156d531377247a6d4095112560ff975f))
- chore: release setup ([cb28d65](https://github.com/deeeed/audiolab/commit/cb28d65a551264dd974bf57a38599db529fa832a))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.0 ([518f084](https://github.com/deeeed/audiolab/commit/518f0846d7dc5a045cb41ec656e4690de610724e))
- chore: reset version before publish ([4a6c86e](https://github.com/deeeed/audiolab/commit/4a6c86e119bb605e28358b7257974a57d3808e1b))
- chore(expo-audio-studio): add @expo/npm-proofread dependency ([8613b79](https://github.com/deeeed/audiolab/commit/8613b79e2a8bad0b880a9a772c4b187f98a18dab))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.0 ([585feee](https://github.com/deeeed/audiolab/commit/585feee9d6abf32b763380fe75b11ea40fd7d9d6))
- chore: changelog ([8de48cd](https://github.com/deeeed/audiolab/commit/8de48cdd3435df6c1820b34eeb8698ad8f5c6a55))
- chore: cleanup ([aae69a9](https://github.com/deeeed/audiolab/commit/aae69a9b7c48ea412cb886b0d87803d33e5e1952))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.0 ([8e0514b](https://github.com/deeeed/audiolab/commit/8e0514b5fbb5116d4e9867dbbe79da8d31658764))
- chore: changelog ([d208226](https://github.com/deeeed/audiolab/commit/d2082262f25e34b3245af47c0695c17dc1946f61))
- chore(expo-audio-studio): downgrade version to 2.9.0 and update dependencies ([b072445](https://github.com/deeeed/audiolab/commit/b07244513d2bbaa4dc39d85750b25fc2de362d6e))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.1 ([2b8fb58](https://github.com/deeeed/audiolab/commit/2b8fb58500683a41c0a6cd1e5ae3316e97785156))
- chore: update yarn.lock for typescript resolution and checksum changes ([29d26b9](https://github.com/deeeed/audiolab/commit/29d26b92aef6e034c6a8b63e91c83aabba9396fe))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.10.0 ([12c865f](https://github.com/deeeed/audiolab/commit/12c865f44ad0eb18319826911d7c79e855b63b2d))
- chore: update @siteed/design-system to version 0.51.1 in package.json and yarn.lock ([a13bc1d](https://github.com/deeeed/audiolab/commit/a13bc1db438d94be2755f86b7dae3f5b2ea28884))
- chore(expo-audio-studio): update @siteed/design-system to version 0.51.0 and refactor recording configuration (#245) ([6486c66](https://github.com/deeeed/audiolab/commit/6486c66d687093b5257fddcce575d932b6a6443b))
- feat(expo-audio-studio): add buffer duration control and skip file writing options ([bfdbcb8](https://github.com/deeeed/audiolab/commit/bfdbcb8bac7c0641d6bacfa9b6fc4e64c2621baa))
- docs: enhance contribution guidelines with Test-Driven Development practices ([2c04eff](https://github.com/deeeed/audiolab/commit/2c04eff1f6d6d3c567aad8f7d7174b7f1ad533aa))
- feat(expo-audio-studio): enhance testing framework and add instrumented tests (#242) ([6e823ec](https://github.com/deeeed/audiolab/commit/6e823ec79c77ff34441b5acf757fdbac0a974e46))
- chore(playground): update CHANGELOG for version 1.3.0 release ([9869e7a](https://github.com/deeeed/audiolab/commit/9869e7ae037448ca6aa2e99b76f425e6d421e6c7))
- chore: bump version to 1.3.0 ([843dc31](https://github.com/deeeed/audiolab/commit/843dc315d10d5d6441e63cfb3b48e8736ab77ea5))
- docs: update api references for v2.9.0 ([62ee930](https://github.com/deeeed/audiolab/commit/62ee9303771247ce1b46dd1d15ee1594476623a5))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.9.0 ([5d8518e](https://github.com/deeeed/audiolab/commit/5d8518e2259372c13fd38b3adc7b767434cbd154))
- refactor(WebRecorder): remove unused compression logic and clean up blob creation ([91f6bba](https://github.com/deeeed/audiolab/commit/91f6bba6a3afa9fe71811c2c67a5703b8751830c))
- feat: Add Web Audio Test Page and Enhance Audio Chunk Handling (#240) ([0a3cce0](https://github.com/deeeed/audiolab/commit/0a3cce0362ecaae70566805625e5a2cbdc289291))
- chore: update bug report template to remove default label and add stale issue workflow ([afb13f0](https://github.com/deeeed/audiolab/commit/afb13f0df85bfb6880d6bacd6730a955e9145c97))
- docs: update README and documentation to highlight experimental advanced audio feature extraction capabilities and performance considerations ([57fc4de](https://github.com/deeeed/audiolab/commit/57fc4de3967292b20b2b62190b7fba566f352ffd))
- chore(react-native-essentia): create version.h file for Essentia versioning ([819e4b1](https://github.com/deeeed/audiolab/commit/819e4b18722da63fc0c0ab9649c09d91bc6c06bc))
- docs(bug_report): update logging instructions for AudioRecorderProvider setup ([36bb557](https://github.com/deeeed/audiolab/commit/36bb55797fd0429319c03277f4ed1334f5ddabb8))
- chore(README): mark native code quality improvement as complete ([9496258](https://github.com/deeeed/audiolab/commit/9496258aa34700c58ea0dc7f79174ba18a33a72d))
- feat: clean up redundant code and improve stability (#238) ([1b01256](https://github.com/deeeed/audiolab/commit/1b01256c2b89a1089e1df21f3faf2908816ca54b))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.6 ([50a0fce](https://github.com/deeeed/audiolab/commit/50a0fce86524b9364329e111701bd056638d2849))
- chore(expo-audio-studio): update Android module configuration and prevent plugin conflicts ([7f696fb](https://github.com/deeeed/audiolab/commit/7f696fb4277f1747d1ba753397d2d6a97ea19abc))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.5 ([bece9b6](https://github.com/deeeed/audiolab/commit/bece9b6b43cb1a780d9786e376efdd93ef82446f))
- chore(expo-audio-studio): remove exports field from package.json ([9dd5029](https://github.com/deeeed/audiolab/commit/9dd5029d81fcc3a4d5b95ee5956beb8481f3950a))
- chore: lockfile update ([2f04fb5](https://github.com/deeeed/audiolab/commit/2f04fb5e73ef4eb0d2a6001e0b75d25d4364fa9e))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.4 ([e86a373](https://github.com/deeeed/audiolab/commit/e86a373939ed3a371095cbfe09d664f2b4b16b9d))
- fix(expo-audio-studio): expo plugin setup ([78810c1](https://github.com/deeeed/audiolab/commit/78810c1682fc357ed79297971d53d61de88b901f))
- chore(playrground): update deps ([7ba0e4a](https://github.com/deeeed/audiolab/commit/7ba0e4a261aae590746e09fa9ffdd07d51743665))
- chore(playground): add custom config plugin to set Metro server port ([f1e1c21](https://github.com/deeeed/audiolab/commit/f1e1c2105766712b9c5698497080d564bd1588be))
- chore: roadmap ([1f7bb5d](https://github.com/deeeed/audiolab/commit/1f7bb5d202f6843f5963d0e9a086b438f789d397))
- chore: remove unused dependencies ([277c921](https://github.com/deeeed/audiolab/commit/277c921f91097ec4e5e9e6f08567830ea473263a))
- chore(issue-template): enhance bug report template with required fields and validation workflow ([6f9ebaf](https://github.com/deeeed/audiolab/commit/6f9ebaf9ddd838735cd7dfe8a93654f093060651))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.3 ([a8ddc86](https://github.com/deeeed/audiolab/commit/a8ddc86aebd65d619137646616e009fa16a4fa66))
- chore(expo-audio-studio): update plugin configuration to use ESM format and streamline build process ([97432eb](https://github.com/deeeed/audiolab/commit/97432eb2944f43e03a1464fdc166a49392582b08))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.2 ([255c802](https://github.com/deeeed/audiolab/commit/255c802feacec8e4ba21bf442381062620d9b5f0))
- chore(expo-audio-studio): update TypeScript configurations for dual module support and enhance CommonJS compatibility ([7377a5f](https://github.com/deeeed/audiolab/commit/7377a5fd3925a21d8628eb31b64c8c65102a1713))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.1 ([78721e4](https://github.com/deeeed/audiolab/commit/78721e41bbc9e4e999118474c887cca7b5420915))
- feat(expo-audio-studio): implement dual module format (ESM/CommonJS) to resolve module resolution issues (#235) ([58c5a94](https://github.com/deeeed/audiolab/commit/58c5a94ecf2fdcefa554b2f8664743730001e6d8))
- chore(playground): bump expo version to 53.0.7 in package.json and yarn.lock ([f0bc32a](https://github.com/deeeed/audiolab/commit/f0bc32a589f3f4b0c652ea3b16b4c318b2f61ec4))
- chore(playground): update EAS configuration for Android build and add local production build script ([a469b8e](https://github.com/deeeed/audiolab/commit/a469b8e9c5bbea65c033275ebf3e8bb8684d947a))
- chore: bump version to 1.2.0 ([f602095](https://github.com/deeeed/audiolab/commit/f602095efa8f1345c5aadf090fd4d3ac33d6f9e8))
- chore: add Git LFS setup scripts and contributing guidelines for ONNX model management ([060af45](https://github.com/deeeed/audiolab/commit/060af45d8af1c093e87b8dd357acd762f10266d3))
- feat(playground): enhance AppRoot loading experience and set up root path redirection ([c10abc1](https://github.com/deeeed/audiolab/commit/c10abc17fb08abf2cebd41f8450a9944c74d3adc))
- docs: add sponsorship section to README and create FUNDING.yml for project support ([e35db26](https://github.com/deeeed/audiolab/commit/e35db26be74113a0af6aca4f741eb1e6277f9ed8))
- docs: add sponsorship section to README and create FUNDING.yml for project support ([bd8fc09](https://github.com/deeeed/audiolab/commit/bd8fc0928aa03a036e6bebd52949e4c6dbe829ba))
- chore: lockfile update ([91676f9](https://github.com/deeeed/audiolab/commit/91676f952d9accb456641e8e340e7a1a1d0b2f0b))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.8.0 ([a879e93](https://github.com/deeeed/audiolab/commit/a879e93bb7b5d27ab5ee764c903e890550c8dda5))
- chore(root): release 0.5.0 ([46ecebf](https://github.com/deeeed/audiolab/commit/46ecebfc8541b88fbf6c5552657685f6434c96bd))
- feat(playground): Version 1.0.1 with Audio Enhancements, App Updates, and Navigation Refactor (#229) ([868fca0](https://github.com/deeeed/audiolab/commit/868fca026119aea116a22670c2b6fe364b6df06c))
- chore: update dependencies for expo, react, and react-native to latest versions; enhance rollup configuration ([72e843b](https://github.com/deeeed/audiolab/commit/72e843bc6d13e36bd56c08b8c3e21434fb6f4f69))
- chore: update roadmap ([48be6f1](https://github.com/deeeed/audiolab/commit/48be6f1f835cfcc36201294c6cccdacd38e61641))
- chore: enhance publish script to include git push after documentation updates ([1b0b0db](https://github.com/deeeed/audiolab/commit/1b0b0db6cf40a6397e6d7438cb7543c93e67b143))
- docs: update api references for v2.7.0 ([4c2e335](https://github.com/deeeed/audiolab/commit/4c2e335d467845fed8c8aae2bc9099071dab1623))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.7.0 ([fe19a2f](https://github.com/deeeed/audiolab/commit/fe19a2fa1af6033cfa025691f25a0e9bcd64b37c))
- fix: Enhance iOS Background Audio Recording and Audio Format Conversion (#228) ([c17169b](https://github.com/deeeed/audiolab/commit/c17169bf9275706abf287712acc30df2f1814ed7))
- chore(expo-audio-studio): improve build script for cjs esm conversion ([767dfbe](https://github.com/deeeed/audiolab/commit/767dfbe5da0f1550b689f6859e2e5fccf7f8141c))
- chore: bump playground 1.0.0 ([9676a9b](https://github.com/deeeed/audiolab/commit/9676a9b684caee596f9064327200784240524a1f))
- chore: bump version to 1.0.0 ([ace03c3](https://github.com/deeeed/audiolab/commit/ace03c3c6daac614688a1ca451e973f48eb80182))
- feat(playground): implement background update functionality and enhance update management (#227) ([bed250d](https://github.com/deeeed/audiolab/commit/bed250dfb8f8068101ff5ca6073b0e4caec893da))
- feat(playground): upgrade to Expo 53 with edge-to-edge layout (#226) ([2d5f8b1](https://github.com/deeeed/audiolab/commit/2d5f8b1f5d808dc9e5eae47c195e146a0e3e0271))
- docs: update api references for v2.6.3 ([9ef5d75](https://github.com/deeeed/audiolab/commit/9ef5d75896b64479900875f7549b1baa0d538dd4))
- feat: prepare expo plugin for expo 53 update (#225) ([0d5d0c0](https://github.com/deeeed/audiolab/commit/0d5d0c0bc2b0a87399b3b341c2d0bd70602bcb2e))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.6.3 ([801aa65](https://github.com/deeeed/audiolab/commit/801aa6585cbafa9b58a81bf4356176436fc03ce1))
- feat: Update AudioPlayground branding and enhance app distribution (#224) ([c404d86](https://github.com/deeeed/audiolab/commit/c404d860cdb1c4c4bbc3767214f56bf547acec33))
- chore(playground): add Prettier, update linting, and introduce cleanup scripts (#222) ([08b3e9a](https://github.com/deeeed/audiolab/commit/08b3e9add6361da9161fcd93e4e7607ffa2b2477))
- chore(playground): add cache clearing function to deployment script for improved build reliability ([b05c9ac](https://github.com/deeeed/audiolab/commit/b05c9ac87cc65ab39867c82b233b11ab3d3772db))
- chore: add deployment scripts for minimal and playground apps, including version update and publishing processes ([98f0e55](https://github.com/deeeed/audiolab/commit/98f0e558e67bc29d348ff9a5d083d17cce6d4611))
- chore: bump version to 0.12.1 ([b7d2845](https://github.com/deeeed/audiolab/commit/b7d28457990d10a09734a8d6a49bd29203ded37f))
- refactor(playground): enhance expandable content measurement in AudioDeviceSelector, RecordingStats, and AppInfoBanner components ([625fa12](https://github.com/deeeed/audiolab/commit/625fa12e5056515f39c5a248f09a9f3cc85e2624))
- feat(playground): add customizable gauge settings component and integrate with DecibelScreen ([5708a4f](https://github.com/deeeed/audiolab/commit/5708a4f65c577c7a4c3e52c267d961b8e132f44c))
- chore: bump playground to 0.12.0 ([e765d07](https://github.com/deeeed/audiolab/commit/e765d0762da1d2590a1a9536407b07a05d1bd5d0))
- docs: update api references for v2.6.2 ([6d1e80c](https://github.com/deeeed/audiolab/commit/6d1e80cefad2e9457eee2c95c19648fc7f741084))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.6.2 ([e9d4ade](https://github.com/deeeed/audiolab/commit/e9d4ade779a423b3aff172ba9ca49eec6c8962d9))
- fix(audio-studio): ensure foreground-only audio recording works with FOREGROUND_SERVICE #202 (#221) ([abc450c](https://github.com/deeeed/audiolab/commit/abc450cb73968cc260e430758df9b72e00f75ef7))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.6.1 ([9191a2c](https://github.com/deeeed/audiolab/commit/9191a2cec8e21cd03a0d5be59d823583d449d9c9))
- Fix/iosprepare (#220) ([4909f76](https://github.com/deeeed/audiolab/commit/4909f7646fcf682fcdaed84988b8d8e58b7b626c))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.6.0 ([acf23f6](https://github.com/deeeed/audiolab/commit/acf23f6c5feaf05159a3376898117bd6525f08bd))
- fix(audio-studio): resolve web audio recording issue without compression #217 (#219) ([2daa373](https://github.com/deeeed/audiolab/commit/2daa373ec507550ffa4571699fb1c680e2df8f14))
- chore: update roadmap ([82dcb8a](https://github.com/deeeed/audiolab/commit/82dcb8ad080fa436d5b390e3034827dcc8db1d01))
- docs: update api reference ([8825eeb](https://github.com/deeeed/audiolab/commit/8825eeb9f44bf773614a72c685c247ab8d6ca565))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.5.0 ([bb59302](https://github.com/deeeed/audiolab/commit/bb59302490ef4669af79e1b7d51bc0dcaf10e087))
- chore: changlog update before release ([3983977](https://github.com/deeeed/audiolab/commit/39839772b63e7e3e645812ef0d3373415fe8fe31))
- feat(playground): add advanced mode for recording settings (#216) ([8f72927](https://github.com/deeeed/audiolab/commit/8f729271a59a1d411c623db90a0308cb53bdfbe5))
- fix(ios): ensure complete audio data emission on recording stop/pause (#215) ([236e7aa](https://github.com/deeeed/audiolab/commit/236e7aa040d11626f06da9bbf5746cdcb6f2b457))
- feat(audio-device): Complete Android implementation for audio device API (#214) ([cedc8d2](https://github.com/deeeed/audiolab/commit/cedc8d2fbdd5317652ee31c70ee596ec946cf22e))
- feat(audio-device): Implement cross-platform audio device detection, selection, and fallback handling (#213) ([023b8a1](https://github.com/deeeed/audiolab/commit/023b8a1d9844bff9f57781860e38a53eb4684fda))
- chore: comment out npm registries configuration in .yarnrc.yml and remove optional NPM_AUTH_TOKEN from environment schema in app.config.ts ([e5d0092](https://github.com/deeeed/audiolab/commit/e5d0092a47269ab65c5cd792c74c35a315c11ccd))
- feat: Add Zero-Latency Audio Recording with `prepareRecording` API (#211) ([30cb56c](https://github.com/deeeed/audiolab/commit/30cb56c07d14e7012bff9a4c4d458d5a49cf494e))
- fix: merge issue ([8e07a25](https://github.com/deeeed/audiolab/commit/8e07a2566cd721980e17c036fa1a7cee74202f6e))
- feat: fixing pipeline and yarn versions ([e769f1e](https://github.com/deeeed/audiolab/commit/e769f1ed787c5583042e2bc028ca7ce8101b7a8b))
- docs: update api references for v2.4.1 ([b15daef](https://github.com/deeeed/audiolab/commit/b15daef29a631eb696d5a28422f9cf32b080027e))
- chore(sherpa-onnx-demo): Restructure WebAssembly Setup and Clean Up Assets (#208) ([7c2adff](https://github.com/deeeed/audiolab/commit/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.4.1 ([c74460f](https://github.com/deeeed/audiolab/commit/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe))
- feat(audio-stream): enhance background audio handling and permission checks (#200) ([60befbe](https://github.com/deeeed/audiolab/commit/60befbedc9d3cbcc1fc684254d812381e5905e43))
- docs: update api references for v2.4.0 ([31c6f90](https://github.com/deeeed/audiolab/commit/31c6f90792f4eab8379efd72679ad30a63b3529c))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.4.0 ([391ce6b](https://github.com/deeeed/audiolab/commit/391ce6bcc63b985ab716f16d8cf5ddac64968b09))
- chore: update CHANGELOG for audio-stream enhancements and fixes ([763818a](https://github.com/deeeed/audiolab/commit/763818a0ca54bb62364af28e6050520bb47796a0))
- fix(audio-stream): resolve iOS sample rate mismatch and enhance recording stability (#198) ([05bfc61](https://github.com/deeeed/audiolab/commit/05bfc6159e7f71fb1d70c3de24fa487cdfb73a62))
- chore: add TypeScript and general coding guidelines documentation ([c4d3a8d](https://github.com/deeeed/audiolab/commit/c4d3a8d5985ce1bc67ba57cd50d008dc21b9c6dc))
- feat: add redirect for Sherpa ONNX demo in 404 page and update app config for production base URL ([bc91925](https://github.com/deeeed/audiolab/commit/bc919259432cb3a6a0cf11dac8c38c56512032f7))
- chore: update dependencies and improve performance in playground (#197) ([aa9d9e0](https://github.com/deeeed/audiolab/commit/aa9d9e09d35d5d07855652a8144d6c32d08e00a9))
- feat(audio-stream): enhance Android permission handling for phone state and notifications (#196) ([63a259d](https://github.com/deeeed/audiolab/commit/63a259da2b175a5865895306c204b84a242f1c97))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.3.1 ([aadcbb0](https://github.com/deeeed/audiolab/commit/aadcbb0100cc33fe2154d6af7da7992932a5b4f8))
- feat: no external crc32 libs (#195) ([394b3b3](https://github.com/deeeed/audiolab/commit/394b3b3bb04e3f969db2a502af85d69c0f955b97))
- feat(sherpa-onnx): Add RN wrapper with core features and WebAssembly support (#194) ([3cdda96](https://github.com/deeeed/audiolab/commit/3cdda966cbe2e6d43cfe0021625137a1f03a33d6))
- feat: Implement model management system with archive support (#190) ([3a86852](https://github.com/deeeed/audiolab/commit/3a86852ff5fe8b710ccf7e1fc1f48efbf489d465))
- chore: update @siteed/expo-audio-studio dependency to version 2.3.0 in package.json and yarn.lock ([db267b5](https://github.com/deeeed/audiolab/commit/db267b5a4103e9a64b0eee46018bb92ccafef694))
- docs: update api references for v2.3.0 ([84eed87](https://github.com/deeeed/audiolab/commit/84eed87156c64f26e2fd52380cc4c48f95c6d86b))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.3.0 ([e63960b](https://github.com/deeeed/audiolab/commit/e63960be99f20b4ceb77356f18afa41197a63203))
- chore: update CHANGELOG.md for @siteed/expo-audio-studio@2.2.0 release ([b92161b](https://github.com/deeeed/audiolab/commit/b92161bd2d1adf692a7119cc19e30dbcd3170fe2))
- fix: always generate a new UUID unless filename is provided (#182) ([f98a9a5](https://github.com/deeeed/audiolab/commit/f98a9a52393829e6c4a79aee3575fbfcc9416c19))
- refactor(audio-studio): introduce constants for silence threshold and WAV header size (#188) ([e8aa329](https://github.com/deeeed/audiolab/commit/e8aa3298bd6ba029d38898360b7df26b3fd5485f))
- docs: enhance installation and API reference documentation for phone call handling (#187) ([fcaece1](https://github.com/deeeed/audiolab/commit/fcaece18cf046d970b9659f3f12a19deb096bceb))
- chore: update @siteed/expo-audio-studio dependency to version 2.2.0 in package.json and yarn.lock ([7f346fa](https://github.com/deeeed/audiolab/commit/7f346faacad6f18e2c3c280cc3b497e9af7d9b8c))
- docs: update api references for v2.2.0 ([2136c96](https://github.com/deeeed/audiolab/commit/2136c966e250abc036bad191ab512ce0dfbb31b2))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.2.0 ([848d80f](https://github.com/deeeed/audiolab/commit/848d80f7012b7408a6d37c824016aa00b78322ac))
- refactor(audio-studio): implement platform-specific CRC32 handling ([b61a3d7](https://github.com/deeeed/audiolab/commit/b61a3d743914e66888ec6cc4cb8e010ff1992698))
- fix: update paths in tsconfig and improve AudioVisualizer stories formatting ([2c100bb](https://github.com/deeeed/audiolab/commit/2c100bbdbb0eb50946df491e1885916c39e660e3))
- chore: update Expo dependencies and remove invalid design-system version ([16e5007](https://github.com/deeeed/audiolab/commit/16e50077690b55977c22fbcb08be75834146ff47))
- feat(sherpa-onnx): update native modules to support new architecture with dual implementation (#183) ([3784c0b](https://github.com/deeeed/audiolab/commit/3784c0b6c78b14edc4a41aee684eda2d64532c6d))
- feat(sherpa-onnx): Refactor ModelsScreen and add Speaker ID functionality (#181) ([d53ba42](https://github.com/deeeed/audiolab/commit/d53ba426435b64327544d24439e8ec5c6e19d5e1))
- feat(STT): Add Speech-to-Text capabilities to sherpa-onnx React Native module (#180) ([70b32d6](https://github.com/deeeed/audiolab/commit/70b32d6e9bbb2a7f28f5d7ccd17aae5437de1329))
- feat(audio-tagging): add audio tagging functionality to sherpa-onnx React Native module (#179) ([9c23786](https://github.com/deeeed/audiolab/commit/9c2378610a1cc3548e1532f48848b25426a274b4))
- feat(sherpa-onnx): Add React Native wrapper for Sherpa ONNX TTS and ASR (#178) ([22ac45f](https://github.com/deeeed/audiolab/commit/22ac45f17211d496a7e326a07a72dad9dbed2959))
- feat(react-native-essentia): initialize demo app and improve TypeScript support (#176) ([6a594e6](https://github.com/deeeed/audiolab/commit/6a594e6e7fc04abfd16862e4c9d3320c97890ab7))
- chore(react-native-essentia): release @siteed/react-native-essentia@0.3.1 ([125036f](https://github.com/deeeed/audiolab/commit/125036f9494fff8ef9d123c3a55a91ddf5d9ca54))
- chore: ignore essentia src ([f9c0412](https://github.com/deeeed/audiolab/commit/f9c0412bea286ad298e1027df458faede245b83a))
- chore(react-native-essentia): enhance installation script to support multiple iOS simulator architectures ([2766490](https://github.com/deeeed/audiolab/commit/2766490210a4d93aae2719fac089a4eb64db0a83))
- chore: cleanup changelog ([869ad76](https://github.com/deeeed/audiolab/commit/869ad767444f9b5b3277747918d85e7b7d25461e))
- chore(react-native-essentia): release @siteed/react-native-essentia@0.3.0 ([8fba317](https://github.com/deeeed/audiolab/commit/8fba317bd5c0ca76b7cb909f55c10bcbcd29c95c))
- chore: deployment process for essentia ([d92d0a9](https://github.com/deeeed/audiolab/commit/d92d0a933b9cb1ed55ee71c19735f6f3802aae21))
- chore: Enhance @siteed/react-native-essentia with Automated Installation and Improved Build Process (#174) ([b65f9dd](https://github.com/deeeed/audiolab/commit/b65f9dd05c7f1817ff1949c8ead5261ca53b37a7))
- fix: update eas-build-pre-install script to reference correct package directory ([17c9d33](https://github.com/deeeed/audiolab/commit/17c9d33313b9e9e824353b7441cd6344bfa1d2e4))
- feat: bump playground version for deployment ([eedb500](https://github.com/deeeed/audiolab/commit/eedb50024f70e0d92fcbbb714a6bad868041ea93))
- fix: linting issues ([741589d](https://github.com/deeeed/audiolab/commit/741589d60485a2d049e7adf529d3fd2b999fa098))
- feat: implement batch transcription mode for audio records (#173) ([432637a](https://github.com/deeeed/audiolab/commit/432637a545d310fc2235450be318fca12ca4865a))
- feat: Enhance Audio Processing and Transcription Capabilities in Playground App (#171) ([1ec6026](https://github.com/deeeed/audiolab/commit/1ec6026ff75fc3ff7122b5df72e8dcd15ce848bd))
- feat: Implement WebAssembly Hello World Demo in Playground App (#170) ([4af02f5](https://github.com/deeeed/audiolab/commit/4af02f53b2c9752720e74ae0c3671bf965418044))
- feat: Enhance Essentia Integration with iOS and Android Build Improvements (#169) ([422fd50](https://github.com/deeeed/audiolab/commit/422fd501a5ec71f30df660d56559bc410084b797))
- feat: deploy essentia wrapper ([028b802](https://github.com/deeeed/audiolab/commit/028b802e32bc31a608e2372b244bda5a3269c0c3))
- docs: package setup ([bb437d7](https://github.com/deeeed/audiolab/commit/bb437d7dab4059ad2b6b165678c3a33e9bd6c28f))
- feat: deploy essentia wrapper ([4588603](https://github.com/deeeed/audiolab/commit/4588603b2f3d78eb0b916f611bc0c8ec74ed741b))
- feat: Integrate Cry Baby Detection Algorithm with Native Essentia Feature Extraction (#167) ([816de97](https://github.com/deeeed/audiolab/commit/816de974427c1000d090e7c587de9b3072891a08))
- docs: readme for essentia integration ([046862a](https://github.com/deeeed/audiolab/commit/046862a90285cd789b836c4a5785e4553cffc64f))
- feat: Add Music Genre and Speech Emotion Classification Pipelines to Essentia Integration (#165) ([d319b07](https://github.com/deeeed/audiolab/commit/d319b07eb51aa86fc021f5b08c07e79bd17bcd53))
- feat: Enhance Audio Analysis with Mel Spectrogram Comparison and Pipeline Support (#164) ([541e13c](https://github.com/deeeed/audiolab/commit/541e13c6e01b8ff9947bc69dc7c29ffed6d8ee07))
- docs: updated readne for essentia ([31ef029](https://github.com/deeeed/audiolab/commit/31ef029fe081f58720b25ab71328f5c7c3e0bc2d))
- feat: Integrate Essentia Audio Analysis Library into React Native for Android (#163) ([4cac310](https://github.com/deeeed/audiolab/commit/4cac310e4af47ddda528dee0f2840e3a336c6823))
- feat: Add PlaygroundAPI Module for Custom Native Code Integration PoC (#161) ([d695eaf](https://github.com/deeeed/audiolab/commit/d695eaf6d1d1209293c9ee9546da8f131fcaa3d1))
- chore: deprecate expo-audio-stream ([85e9f49](https://github.com/deeeed/audiolab/commit/85e9f49d4ddf8e01c2e7ed982ae2d49cd7f37147))
- docs: update api references for v2.1.1 ([2b65f11](https://github.com/deeeed/audiolab/commit/2b65f11096673a58639db774c25f480c05433eab))
- chore(expo-audio-studio): release @siteed/expo-audio-studio@2.1.1 ([1b17ac6](https://github.com/deeeed/audiolab/commit/1b17ac6e103f2ca50f29668b3ddaaf57a4b4b7d3))
- feat: Rename`@siteed/expo-audio-stream` to `@siteed/expo-audio-studio` (#160) ([1b99191](https://github.com/deeeed/audiolab/commit/1b9919143413a900aefed94c20fc9a8b0e6050d3))
- playground 0.10.0 ([5ef9ffe](https://github.com/deeeed/audiolab/commit/5ef9ffe96440c5dd0041b2ebbfdd389e55788047))
- docs: updated doc website with new assets (#159) ([1775e7e](https://github.com/deeeed/audiolab/commit/1775e7ea702a9d9831346bc19a9cbc10f5d4b77c))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@2.1.0 ([0158747](https://github.com/deeeed/audiolab/commit/01587473d138d2044082592da4994edb9b0d9107))
- chore(root): release 0.4.0 ([874f32e](https://github.com/deeeed/audiolab/commit/874f32e7ca5c4288073242f6169e3549ea8a24f3))
- docs: changelog update ([387ba78](https://github.com/deeeed/audiolab/commit/387ba78a451b444009894b9532ba1b2dcfd560bb))
- feat(docs): enhance audio processing documentation and examples (#158) ([26afd49](https://github.com/deeeed/audiolab/commit/26afd4938e1c626294f40b50a84fe15f5c2bb6a1))
- feat: Add Mel Spectrogram Extraction and Language Detection to Audio Processing (#157) ([4129dee](https://github.com/deeeed/audiolab/commit/4129dee87c27dd5a9911c85e3dbf045507876cc1))
- feat: enhance audio import functionality and decibel visualization (#156) ([2dbecc7](https://github.com/deeeed/audiolab/commit/2dbecc7bd0ea46edd80c2b0e28dd2a0525953362))
- feat(playground): Add E2E tests for audio import functionality ([922aded](https://github.com/deeeed/audiolab/commit/922aded6e810fe85f8969f6813ac12c52cdc568d))
- screenshots ([fbd04f2](https://github.com/deeeed/audiolab/commit/fbd04f24804b167a436e13c415c16fb19e7086d2))
- feat(playground): replace pickers with segmented buttons and enhance visual components (#154) ([57511f9](https://github.com/deeeed/audiolab/commit/57511f92adfabbf560febae49f4ad6883e87e72f))
- feat(playground): add E2E testing with Detox (#153) ([0b8e132](https://github.com/deeeed/audiolab/commit/0b8e1321b89aa306f6bf1c1dabcbe37f3aa8d1b0))
- feat(trim): Implement iOS trim support with custom filename and format improvements (#152) ([dd49be4](https://github.com/deeeed/audiolab/commit/dd49be42bccbf3ae6cced8c3662237e1668ec2de))
- feat: Add Sample Rate Control and Web Trimming Support to Expo Audio Stream (#151) ([9158eec](https://github.com/deeeed/audiolab/commit/9158eeccc10e25ac77ba3a99185b4dbc5abfb353))
- feat: Enhance audio trimming with optimized processing and detailed feedback (#150) ([41a6945](https://github.com/deeeed/audiolab/commit/41a694528d1e803dc0012948eec4edfdc336b4fc))
- feat(trim): add audio trimming functionality with visualization and preview (Android only) (#149) ([cba03dc](https://github.com/deeeed/audiolab/commit/cba03dc920eb8a1f111b45e8404a42e48076b7cd))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@2.0.1 ([c77cfc8](https://github.com/deeeed/audiolab/commit/c77cfc8b70f87a12bb19fa03b245cda7ed2496e1))
- refactor: update background mode handling for audio stream plugin ([e7e98cc](https://github.com/deeeed/audiolab/commit/e7e98cc60b7965770dcf25e9ae74cb356e1e7097))
- docs: update api references for v2.0.0 ([bd8c18a](https://github.com/deeeed/audiolab/commit/bd8c18a7fcef511efdff26ef100f0d6c0c2b460d))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@2.0.0 ([356d3f4](https://github.com/deeeed/audiolab/commit/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6))
- feat(playground): Enhance Audio Playground with Improved UX and Sample Audio Loading (#148) ([09d2794](https://github.com/deeeed/audiolab/commit/09d27940dcffa60e662c828742f4577bca5327f9))
- feat: Implement Enhanced Audio Transcription Workflow with Configurable Extraction and UI Updates (#147) ([c658c7e](https://github.com/deeeed/audiolab/commit/c658c7e8531dd731b01d9347bc7c744470a3b7b9))
- fix: audio recording reliability improvements and web IndexedDB management (#146) ([d4fa245](https://github.com/deeeed/audiolab/commit/d4fa245c46d487fe50c6454165efc2e1032ec126))
- feat(transcription): refactor and unify transcription services across platforms (#145) ([a94b905](https://github.com/deeeed/audiolab/commit/a94b90562fb2112f712f78c03ca6a5110d6b1401))
-  feat(audio): enhance VAD implementation with multi-window analysis (#144) ([f1c33f1](https://github.com/deeeed/audiolab/commit/f1c33f1b93c458a6358742704476ec34c3133f8c))
- feat(audio): enhance checksum verification and audio segment analysis (#143) ([49b6587](https://github.com/deeeed/audiolab/commit/49b65877d1fd9922f25b4892261c4fedf02ba3c3))
- feat(playground): implement cross-platform ONNX runtime with Silero VAD model (#142) ([4a94639](https://github.com/deeeed/audiolab/commit/4a9463995f1eadf6531a2b4d6d057e90da097920))
- feat(audio-analysis): enhance audio analysis and visualization capabilities (#141) ([ecf8f5d](https://github.com/deeeed/audiolab/commit/ecf8f5daf967bf27afb827c8cf6bca7510ce7b4e))
- android 15 (#140) ([5321a3c](https://github.com/deeeed/audiolab/commit/5321a3c805d22e6824fd11fee4290987d550bd06))
- refactor(audio): consolidate audio analysis APIs and migrate to segment-based processing (#139) ([5d45da8](https://github.com/deeeed/audiolab/commit/5d45da871ee1849898405ee4bf8bf8d296aebc48))
- feat(playground): integrate Silero VAD for enhanced speech detection (#138) ([6bcdec8](https://github.com/deeeed/audiolab/commit/6bcdec89e1cf08aff9abb875858d605b9b99ea3b))
- feat: pcm player (#137) ([8db6f16](https://github.com/deeeed/audiolab/commit/8db6f16f13cbcf78fd4a8e412bb00689e47d5a72))
- feat(audio-stream): add extractAudioData API ([faf8915](https://github.com/deeeed/audiolab/commit/faf8915df3b18ea54ca7e562f61749d7cadf8bb4))
- feat(audio): improve audio trimming and waveform visualization (#136) ([ad5514b](https://github.com/deeeed/audiolab/commit/ad5514b412eedc7211cb200cc3747e8a83afbf88))
- feat: add maxDurationMs prop to SegmentDurationSelector ([fad9182](https://github.com/deeeed/audiolab/commit/fad9182ae0d27d2664f0b5b2c38a95051701789d))
- feat(audio): enhance audio player with preview, trimming and feature analysis (#135) ([3f7eb9c](https://github.com/deeeed/audiolab/commit/3f7eb9cde7b314505d8ed3e4704c7b1321da6b15))
- feat: add web permission for microphone (#131) ([9a2ed7f](https://github.com/deeeed/audiolab/commit/9a2ed7f31ad41560d094a22d1248034cb2f5886d))
- refactor(audio): simplify amplitude analysis and remove redundant configuration (#133) ([5d64aa2](https://github.com/deeeed/audiolab/commit/5d64aa22299836cc9cb925d3e91f3d9470f3e856))
- feat: add full audio analysis with spectral features and time range controls (#132) ([5677dc3](https://github.com/deeeed/audiolab/commit/5677dc321f5a9ff4bea37fbbce3cb6ae3aad67f6))
- feat: playground app ([5ad2aaf](https://github.com/deeeed/audiolab/commit/5ad2aafe322fd8e5fbaafc514d04c8a97380a398))
- docs: build setup ([3a199ef](https://github.com/deeeed/audiolab/commit/3a199efb0eb2625bb7622eb87bfacb07bab13f20))
- docs: update api references for v1.17.0 ([334e7be](https://github.com/deeeed/audiolab/commit/334e7be192989eedffca56c6ffbbd3cece968290))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.17.0 ([689aead](https://github.com/deeeed/audiolab/commit/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db))
- docs: update changelog ([6aa0a73](https://github.com/deeeed/audiolab/commit/6aa0a737d84e67f1a6682c97c342808b3b779e55))
- feat: add audio interval analysis on web ([281b7e6](https://github.com/deeeed/audiolab/commit/281b7e6b1136afe0569450a9d1e3d5f01da7af28))
- feat: implement interval visualization android ([7e9678e](https://github.com/deeeed/audiolab/commit/7e9678e23b82d8fd3d032fb1d802c925dcff254a))
- feat(playground): implement intervalAnalysis and validate iOS settings (#126) ([3d35adf](https://github.com/deeeed/audiolab/commit/3d35adfcc68593c39a72a5e72b7ddf1e6ce6f1fd))
- Make it possible to set a different interval for the audio analysis (#125) ([10a914e](https://github.com/deeeed/audiolab/commit/10a914e853deb66f9c3dec1845cab4cfcd34c6da))
- feat: public scope on pause / resume ([505d8f5](https://github.com/deeeed/audiolab/commit/505d8f59b5c5e8fe187c73d4a271fe00033e5835))
- Revert "feat: Add ability to separate the interval for recording and analysis…" (#124) ([1d50644](https://github.com/deeeed/audiolab/commit/1d50644fb3cc1a8f06866e11d98fe3037c236770))
- feat: Add ability to separate the interval for recording and analysis #121 (#121) ([7f95f54](https://github.com/deeeed/audiolab/commit/7f95f54451d1095def43ea3cb8cc339b095bd7bf))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.16.0 ([f1cd51c](https://github.com/deeeed/audiolab/commit/f1cd51ccfa46e3c33b05c24c6bd22281cc5aa58f))
- feat(playground): hide beta features on playground ([a3ec999](https://github.com/deeeed/audiolab/commit/a3ec9997fe8f6e7e7707b2e56314ae266ee92468))
- fix(expo-audio-stream): prevent adding iOS background modes when disabled ([5c9d09c](https://github.com/deeeed/audiolab/commit/5c9d09c715ce008fe72177431224a10f5fd7a865))
- fix(ios): replace CallKit with AVAudioSession for phone call detection ([e3b664b](https://github.com/deeeed/audiolab/commit/e3b664ba6925c379b323ded5fc408154e5f092c6))
- docs: update api references for v1.15.1 ([2d5b1a0](https://github.com/deeeed/audiolab/commit/2d5b1a01761e646ee026070ac8336b8fe9b456ef))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.15.1 ([cbc3d10](https://github.com/deeeed/audiolab/commit/cbc3d10661a415811f1fe46cb3acaf63451a9df9))
- chore(deps): update expo and related dependencies (#123) ([120ec68](https://github.com/deeeed/audiolab/commit/120ec686aa697cd8f527e4491fdeedb65d14b841))
- fix: restore Opus compression support on iOS (#122) ([06614e6](https://github.com/deeeed/audiolab/commit/06614e6d96fa2a6af56edf0fd2e2b3966e13c8f7))
- feat: add issue template ([80739e6](https://github.com/deeeed/audiolab/commit/80739e674b47912657649f3528852a74f980e760))
- feat: add issue template ([d492dc6](https://github.com/deeeed/audiolab/commit/d492dc6e42d11d09e0e9baa320f1f6145d055978))
- feat: add issue template ([bb42987](https://github.com/deeeed/audiolab/commit/bb429877b47a2a6b590195303c68044ba9923565))
- feat: add issue template ([638bdea](https://github.com/deeeed/audiolab/commit/638bdea5689789602f2da3d41712737eb5a50421))
- feat: playground settings ([d196fd6](https://github.com/deeeed/audiolab/commit/d196fd6ef622e4695f8ee44addd5bee99b39276a))
- feat: deployment to store for playground ([cd661af](https://github.com/deeeed/audiolab/commit/cd661afd37e9a3d222cd508a77e87d1346ad9bdf))
- feat(playground): auto update ([ee0ecd6](https://github.com/deeeed/audiolab/commit/ee0ecd65550aee9f0a07dee465e6754f5f96678a))
- deployment ([9c927f2](https://github.com/deeeed/audiolab/commit/9c927f2009753f44479dfbb8c109ac705159a02c))
- feat: dont block while emitting audio analysis ([01d91d1](https://github.com/deeeed/audiolab/commit/01d91d1504ccda8ad3569980c79fcf4ae4526a76))
- docs: update api references for v1.15.0 ([81278cd](https://github.com/deeeed/audiolab/commit/81278cd42e8a447e842bfd00f7f628930f038c76))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.15.0 ([f94c601](https://github.com/deeeed/audiolab/commit/f94c6016ba4ce968cafbf68644199405f5991d7f))
- fix(ios): improve audio recording interruption handling and auto-resume functionality (#119) ([7767dff](https://github.com/deeeed/audiolab/commit/7767dff09c7c8d2f2dc8558d24fd2419cb981f4d))
- fix(android): improve background recording and call interruption handling (#118) ([bf19fe9](https://github.com/deeeed/audiolab/commit/bf19fe92cadbcc080c27a8aa06ba9a2f6ca841b0))
- feat: update deps ([389381e](https://github.com/deeeed/audiolab/commit/389381efcbdc2dcf73b646346d74813173ca0d06))
- chore: changelog ([31fd2ce](https://github.com/deeeed/audiolab/commit/31fd2cef2c6d6c9ce0f706f0ce3ff0b7b3eb210d))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.14.2 ([5d5a5a8](https://github.com/deeeed/audiolab/commit/5d5a5a8601fa6efd36d1dd40d8ed56b1552bba52))
- fix: update STOP action to clear recording metadata ([3484f76](https://github.com/deeeed/audiolab/commit/3484f76331c0cc83e2384dd18a7f4555f5c5ce8d))
- feat: wip ([e5551e7](https://github.com/deeeed/audiolab/commit/e5551e7080bd0783b89439c356dabb9a1610d393))
- chore: changelog update ([9bcd354](https://github.com/deeeed/audiolab/commit/9bcd354d77fc03d4af48c7e83646d973529e21f0))
- docs: update api references for v1.14.1 ([226836e](https://github.com/deeeed/audiolab/commit/226836ef521b7f7924d5cffec06d21f57545b5c9))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.14.1 ([67c0151](https://github.com/deeeed/audiolab/commit/67c0151498a79fdb4d385168c502a8eaeb33efe1))
- fix: enable background recording by default and improve audio playground (#114) ([2f60d5e](https://github.com/deeeed/audiolab/commit/2f60d5edd96ea6d0db7cf35614bc12dcd8d9c6ed))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.14.0 ([f7588a6](https://github.com/deeeed/audiolab/commit/f7588a63aac89ce144d460194b73ce4440e19520))
- wip (#113) ([ed8e184](https://github.com/deeeed/audiolab/commit/ed8e184c23ba26973cc9f716e1506d4d7ac4a73d))
- chore: changelog ([dbc4b1f](https://github.com/deeeed/audiolab/commit/dbc4b1ff4cbb120c294d38fc2844c01ec0e2ac86))
- docs: update api references for v1.13.2 ([3109263](https://github.com/deeeed/audiolab/commit/3109263428c4f80ac087bb3c5a1da8d7a200a994))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.13.2 ([9c6449d](https://github.com/deeeed/audiolab/commit/9c6449d8edbf8895b3e36e4e30302d7cf8839d2c))
- fix: ensure foreground service starts within required timeframe ([60dad52](https://github.com/deeeed/audiolab/commit/60dad5237c11b9a60e6239701317d52c56625d6e))
- chore: remove env files from git ([80ef73d](https://github.com/deeeed/audiolab/commit/80ef73d493ef3fee289e7f5385827197924bf733))
- docs: update api references for v1.13.1 ([aab33be](https://github.com/deeeed/audiolab/commit/aab33be066aeeba65634f521977a083c35a98b0f))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.13.1 ([21209ab](https://github.com/deeeed/audiolab/commit/21209ab9cd7c63e9f57f28eb12d3c981b7525e74))
- feat(playground): enhance audio file handling and update UI components (#105) ([d1d60a0](https://github.com/deeeed/audiolab/commit/d1d60a0d1b218694c54c4193c6d8afea57796550))
- docs: update api references for v1.13.0 ([2dc75c0](https://github.com/deeeed/audiolab/commit/2dc75c0ae866cf36cd79ea8866cbb7bd44713eb2))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.13.0 ([5b78ac5](https://github.com/deeeed/audiolab/commit/5b78ac5765ee3fd334df797c5aa52ca63fddd43d))
- Audiodecode (#104) ([173f589](https://github.com/deeeed/audiolab/commit/173f589ebe8763f7361088d150bba1d4bd2c4154))
- fix: resolve background recording issues and improve status checking (#103) ([a174d50](https://github.com/deeeed/audiolab/commit/a174d50932b2ee4682f4bd6edb3eaa9a7d579bfc))
- chore: changelog issue ([59999d2](https://github.com/deeeed/audiolab/commit/59999d222d1ad5f29c97eb4be6e1ff2445a82de9))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.12.3 ([931ce8a](https://github.com/deeeed/audiolab/commit/931ce8a25497f2d36128ddb68af7dd870b92cd2b))
- chore(ui): missing changelog entry ([87ba803](https://github.com/deeeed/audiolab/commit/87ba80351a0e853ebf002e3cc7dd6c055f03c3b3))
- chore(root): release 0.3.0 ([0a35fe5](https://github.com/deeeed/audiolab/commit/0a35fe57191e3943f104cde18ab50310fe27eb9f))
- fix: infinite rerender issue ([54a6a84](https://github.com/deeeed/audiolab/commit/54a6a8414688c9fbf897c56503c0091dcaf55e26))
- feat: expo update (#102) ([e0323c7](https://github.com/deeeed/audiolab/commit/e0323c7e0e62f81da73720477472d970f1aa5de1))
- feat(expo-audio-ui): Add DecibelGauge and DecibelMeter components (#101) ([cb47fba](https://github.com/deeeed/audiolab/commit/cb47fbad8e10eec98932c40c6c75aebac82a0bc8))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.12.2 ([a813bbb](https://github.com/deeeed/audiolab/commit/a813bbb6690cd14be17b2418bf7388b701912569))
- refactor: optimize state dispatch in useAudioRecorder ([9dfa6ef](https://github.com/deeeed/audiolab/commit/9dfa6eff3b5f936d8469502f2f168b8652361506))
- docs: changelog ([033492c](https://github.com/deeeed/audiolab/commit/033492c05bf9435e99987a84da3104436fd07b96))
- docs: update api references for v1.12.1 ([64778b9](https://github.com/deeeed/audiolab/commit/64778b93e63dc8463edffd10c9f3e5dc1d6a82e2))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.12.1 ([64f579e](https://github.com/deeeed/audiolab/commit/64f579e2de98e4f4de0db407bcc9f613ba4e2505))
- feat: changelog ([6f57cd6](https://github.com/deeeed/audiolab/commit/6f57cd6d49979fc6ccfd654bc4e9405380dc2059))
- fix: improve audio recording interruption handling and consistency (#98) ([0fd5a14](https://github.com/deeeed/audiolab/commit/0fd5a1460e998b5a36e43a084d158852707f60b9))
- docs: changelog adjustment ([b6d02b1](https://github.com/deeeed/audiolab/commit/b6d02b146a2dbd35863149b5feb627b4ee78d437))
- docs: update api references for v1.12.0 ([92bb7d9](https://github.com/deeeed/audiolab/commit/92bb7d9ef0d3e68b26b0cce9945cae4921790b00))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.12.0 ([f331673](https://github.com/deeeed/audiolab/commit/f331673c63a1455c43da58e2ce3d990dd3519dae))
- docs: changelog ([152bf70](https://github.com/deeeed/audiolab/commit/152bf705cd259546f6ee2a2e23c6a2829b546873))
- feat: add call state checks before starting or resuming recording (#94) ([63e70a0](https://github.com/deeeed/audiolab/commit/63e70a09f70dd8e5798094b360cf7ec8de1275e9))
- feat: add custom filename and directory support for audio recordings (#92) ([2f30f9d](https://github.com/deeeed/audiolab/commit/2f30f9db2558c456f93f31b79b01cd54a57f392b))
- feat: enhance compressed recording info with file size (#90) ([47254aa](https://github.com/deeeed/audiolab/commit/47254aa8cb3ae1c01138ebebce1c1d8c65afd794))
- chore(root): release 0.2.1 ([947c3eb](https://github.com/deeeed/audiolab/commit/947c3eb558161464aed48fc66f8bb116c849a664))
- docs: changelog entries ([3a44c51](https://github.com/deeeed/audiolab/commit/3a44c51b4410ac2551170233aa7baa48c0e5d0e1))
- refactor(AudioVisualizer): Update AudioVisualizer to use optional logger ([6bcf954](https://github.com/deeeed/audiolab/commit/6bcf954f43963acb75ebf1e6846bcd28f76bac76))
- chore(expo-audio-ui): Remove @siteed/react-native-logger dependency ([d09f27b](https://github.com/deeeed/audiolab/commit/d09f27bc94223eee90c21233650830f433c129a1))
- docs: update api references for v1.11.6 ([3cb9df7](https://github.com/deeeed/audiolab/commit/3cb9df7dbd5a72b174f9d35c9703e377c3182c26))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.11.6 ([4373374](https://github.com/deeeed/audiolab/commit/4373374589d9901f0064efa714398749411f46d7))
- feat: publisher settings update ([a1d00aa](https://github.com/deeeed/audiolab/commit/a1d00aa39f532705994e08390760d9040bb772a7))
- feat: improved publishing script ([4f29134](https://github.com/deeeed/audiolab/commit/4f29134f22cdc381c0b27bdc30e6ebeab691376e))
- docs: updated publishing config ([356ea03](https://github.com/deeeed/audiolab/commit/356ea038fb9e0bbafa69cf7023a3e3ce44be3975))
- docs: update api references for v1.11.5 ([5689c06](https://github.com/deeeed/audiolab/commit/5689c0622e047c997f6882cf4c427eb65f3c47a5))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.11.5 ([ba35391](https://github.com/deeeed/audiolab/commit/ba353911fdf6c5275be49c3589b33665f6636884))
- docs: changelog ([284492c](https://github.com/deeeed/audiolab/commit/284492c785495e16f5d15fd11203538b85d1a039))
- docs: roadnap ([b9ec0cd](https://github.com/deeeed/audiolab/commit/b9ec0cd22a889e84e99af2d1bace4c7cf08a44ef))
- docs: install setup for android ([2b76595](https://github.com/deeeed/audiolab/commit/2b765957f526bc7e4bdbf03e0b97c730f5ccbc2e))
- feat: publsih script with proper doc build ([f67b439](https://github.com/deeeed/audiolab/commit/f67b439841cb2a4ea519104c0c7525c6337cfcc7))
- docs: updated docs ([15e7633](https://github.com/deeeed/audiolab/commit/15e7633b5b3138d3282afb88e5ffb8d13049aa1d))
- docs: update api references for v1.11.4 ([ef77da1](https://github.com/deeeed/audiolab/commit/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.11.4 ([6ef2c33](https://github.com/deeeed/audiolab/commit/6ef2c33b0d24f2306e0676ec68aeea490ffd9618))
- fix(plugin): remove automatic VoIP and audio background modes for iOS (#86) ([4265bf5](https://github.com/deeeed/audiolab/commit/4265bf5dc9355a865e7f3177342169939afaf0bb))
- chore(root): release 0.2.0 ([bc575a6](https://github.com/deeeed/audiolab/commit/bc575a61d88c82ffa8269f663ffd5f7310407d80))
- feat: setup script for publishing ([6d94aec](https://github.com/deeeed/audiolab/commit/6d94aecfe15974d612e367335e4cafd4a4114e81))
- feat: cleanup (#83) ([c557bd7](https://github.com/deeeed/audiolab/commit/c557bd79e3b043bc89695a0351014eaca6857036))
- chore: lockfile update ([4231324](https://github.com/deeeed/audiolab/commit/423132439202e7c5b01ae2276bf75a9f2e952917))
- docs: update api references for v1.11.3 ([bea9040](https://github.com/deeeed/audiolab/commit/bea90407db85911ccf06fca4a57a3ff56d84ca2c))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.11.3 ([0ff4dfa](https://github.com/deeeed/audiolab/commit/0ff4dfa980836b491e9c80e129a58a745b10a742))
- docs: changelog update ([cdcefed](https://github.com/deeeed/audiolab/commit/cdcefed50d2577df031021d590cd176cff34691f))
- feat: disable duplicate notification alerts for audio stream (#82) ([12f9992](https://github.com/deeeed/audiolab/commit/12f999247cdd6b08753bcf1b481582a604826383))
- feat(deps): update expo packages and dependencies to latest patch versions (#81) ([3ed0526](https://github.com/deeeed/audiolab/commit/3ed0526545623530a10757f1bbd7f877a2c31296))
- docs: update api references for v1.11.2 ([74849db](https://github.com/deeeed/audiolab/commit/74849db59a5bafcd172566a3894ddfdf8a23164e))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.11.2 ([f2e75c7](https://github.com/deeeed/audiolab/commit/f2e75c7e592b97e8421396014c638f22c616cded))
- docs: changelog update ([c3ac5a9](https://github.com/deeeed/audiolab/commit/c3ac5a98f2548557769207b45e3d921d94b7e3b0))
- fix: resources not cleanup properly on app kill (#80) ([7d522a5](https://github.com/deeeed/audiolab/commit/7d522a531e70065b99758aa3a4c669769fdbd110))
- docs: update api references for v1.11.1 ([1f5e830](https://github.com/deeeed/audiolab/commit/1f5e830488e538a5c6e3f1931631394b8c5d1bcc))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.11.1 ([835d9e9](https://github.com/deeeed/audiolab/commit/835d9e911edef71820c197532ad33e3c0a97d131))
- docs: force deployment ([416e391](https://github.com/deeeed/audiolab/commit/416e391644fd4b3e3dd3d3805f390f0ba57d8649))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.11.0 ([0f3e803](https://github.com/deeeed/audiolab/commit/0f3e803a36f77d4bd753f2077bed2fe708ff6a29))
- docs: update changelog ([8f9ac9f](https://github.com/deeeed/audiolab/commit/8f9ac9fc4fc3c4e702046010de18321493dd465a))
- Merge pull request #78 from deeeed/recordingcall ([f8f6187](https://github.com/deeeed/audiolab/commit/f8f6187a8381feb514f0b2378efd50b4e7d7b2f4))
- docs: updated docs with latest features ([592c76d](https://github.com/deeeed/audiolab/commit/592c76dd415255d48dbbb6f11a6cd835742c08cd))
- feat: ios working ([771ee57](https://github.com/deeeed/audiolab/commit/771ee579f79ee4df4433cf9a1e984a2e0d89398c))
- feat: cleanup ([4b0f39a](https://github.com/deeeed/audiolab/commit/4b0f39afe4f54645c75174985d5026ac4d126306))
- feat: updated config ([7ea18cb](https://github.com/deeeed/audiolab/commit/7ea18cb19a892e31cc48220b2eda8de070df49ba))
- feat: cleanup ([f77b011](https://github.com/deeeed/audiolab/commit/f77b0114cf9bf8130c7b4bc11017680897b0d0f5))
- docs: add interruption doc ([517e8f8](https://github.com/deeeed/audiolab/commit/517e8f843acddf3b9a7d3ce2b6bf899cff3ea614))
- feat: updated doc ([9c5f4dd](https://github.com/deeeed/audiolab/commit/9c5f4ddfb24251adbcdea397a8b1a0dd30f00e14))
- feat: wip ([109e2f5](https://github.com/deeeed/audiolab/commit/109e2f59d81739e05c7ae2d0246c9808aa12b207))
- docs: update api references for v1.10.0 ([a0eb063](https://github.com/deeeed/audiolab/commit/a0eb063ea98602422c585b404c21abfcb00c1823))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.10.0 ([dfc3843](https://github.com/deeeed/audiolab/commit/dfc3843c174e3887863dde47b9001ba0e8e9e87e))
- docs: update changelog ([188838c](https://github.com/deeeed/audiolab/commit/188838c3d4efdae7f07fc67085676eefee3aef59))
- feat: add support for pausing and resuming compressed recordings ([bc3f629](https://github.com/deeeed/audiolab/commit/bc3f6295d060396325e0f008ff00b3be9c8722cd))
- refactor: optimize notification channel settings ([daa075e](https://github.com/deeeed/audiolab/commit/daa075e668f8faf0b8d2849e18c37384bdd293b8))
- chore(dependencies): Update react-native-paper dependency to version 5.13.1 ([5fe7199](https://github.com/deeeed/audiolab/commit/5fe71993c197bdc250f2b5905755ad70cb1bb984))
- feat(playground): Update app configuration for new architecture settings ([c537267](https://github.com/deeeed/audiolab/commit/c5372674d67d2be7d6054df8ad61d978c7ad0d73))
- docs: update api references for v1.9.2 ([1251b9d](https://github.com/deeeed/audiolab/commit/1251b9d813b9d33beb9e3ea0bf2d22dcc103d5b7))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.9.2 ([6633fec](https://github.com/deeeed/audiolab/commit/6633fec1624742d4a07d0c1c07e3d5128bbd199f))
- docs: changelog ([cce1645](https://github.com/deeeed/audiolab/commit/cce164501989687d87fe44f986ccb09c9fc5c760))
- feat: ios bitrate verification to prevent invalid values ([035a180](https://github.com/deeeed/audiolab/commit/035a1800833264edcc59724aaa8a2e12d5c78dc2))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.9.1 ([ad91dd5](https://github.com/deeeed/audiolab/commit/ad91dd562d4a7758e32c1f0eaf978ff397be8cf7))
- docs: changelog update ([0485564](https://github.com/deeeed/audiolab/commit/04855641d99d24d31da2ac8288c18a68644aa394))
- fix: ios potentially missing compressed file info ([88a628c](https://github.com/deeeed/audiolab/commit/88a628c35f2bfd626a2a5de1eb6950efd814619d))
- docs: update api references for v1.9.0 ([463c842](https://github.com/deeeed/audiolab/commit/463c842d47a7516e1e7d1b980310907bb609ec06))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.9.0 ([2895346](https://github.com/deeeed/audiolab/commit/28953461fc4da5b476e6df897abb4dac5b33f115))
- docs: changelog update ([1b1af6c](https://github.com/deeeed/audiolab/commit/1b1af6cfddf438078eb6f8902b0186811528b6ae))
- feat(web-audio): optimize memory usage and streaming performance for web audio recording (#75) ([7b93e12](https://github.com/deeeed/audiolab/commit/7b93e12aae4bc0599b06b48ca34a60f65587fc75))
- feat: bump version to 0.1.19 ([2d9c4d5](https://github.com/deeeed/audiolab/commit/2d9c4d5b251fa299a381150e43c3f2022f5153ae))
- docs: update roadmap ([4f32227](https://github.com/deeeed/audiolab/commit/4f3222703f1ff99a68377e21e4679d4ebdc0c3e4))
- docs: update roadmap ([ff9605c](https://github.com/deeeed/audiolab/commit/ff9605c1f83b1ff308c40e373be4ca324dccfa6b))
- fix: invalid prefix url on github ([36f013f](https://github.com/deeeed/audiolab/commit/36f013f052a4ed23373a0f27c5f0a4788ed1eda2))
- docs: update api references for v1.8.0 ([b178eef](https://github.com/deeeed/audiolab/commit/b178eef8e9d36daff26c891d5f8bb6a5a8a59b7d))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.8.0 ([28be564](https://github.com/deeeed/audiolab/commit/28be564864425ab95a6773e2bc19f856eb418d1c))
- docs: update changelog ([8bfca27](https://github.com/deeeed/audiolab/commit/8bfca27a5733a1f14c70113a5bbb727f5c8333e0))
- Merge pull request #74 from deeeed/compression ([4dc0327](https://github.com/deeeed/audiolab/commit/4dc032784a6d0a3b24f0efa1726859543c11a7e3))
- feat: add options to skip consolidating data on web for faster processing ([329fed8](https://github.com/deeeed/audiolab/commit/329fed8c322ed34157b344920636e407c4cd805b))
- feat: only opus on wbe ([e0df5b8](https://github.com/deeeed/audiolab/commit/e0df5b8d862b915e073dca6c430225c69f829953))
- feat: cleanup sonacloud issues ([7d6f5df](https://github.com/deeeed/audiolab/commit/7d6f5df2c8e75d0b0bf4ff89d83fd31dafd69201))
- feat: cleanup sonarcloud issues ([633e787](https://github.com/deeeed/audiolab/commit/633e787c0800cdc62b782df76826b712a083c4e9))
- docs: updated readme ([85aef10](https://github.com/deeeed/audiolab/commit/85aef101df8d43fd8b143f18fce0e2b9ab0d4cc9))
- feat: saving state ([fea84fa](https://github.com/deeeed/audiolab/commit/fea84fa89f2a46e4efb4ff70aa29a9d3527dc159))
- cleanup ([29cbeb8](https://github.com/deeeed/audiolab/commit/29cbeb8b24f9ab10d9987827d6c3f60a5d2b1d33))
- feat: wip ([a3789d7](https://github.com/deeeed/audiolab/commit/a3789d7c82cae6d2dfea5dceafe27829d1a54c96))
- feat: web implementation of compressed stream ([363ad82](https://github.com/deeeed/audiolab/commit/363ad8289b419f86f4322addc4e2b33db8d85004))
- feat: redux setup ([c012ada](https://github.com/deeeed/audiolab/commit/c012adafda02e1d556adcdc960be85b46aebfa37))
- feat: design update ([2c9f333](https://github.com/deeeed/audiolab/commit/2c9f333f29c6ae0002adab09c3d7d58a46ecd2a3))
- wip ([5771209](https://github.com/deeeed/audiolab/commit/5771209a11fe1d8e13f5d32a18e8bb5dcf98b7a3))
- feat: styling ([7e76879](https://github.com/deeeed/audiolab/commit/7e76879ef447b0b65501311dd34b98d14df35020))
- feat: adjust deps ([0f88e55](https://github.com/deeeed/audiolab/commit/0f88e556fa564964903796162faae5a0a8c5ef0e))
- feat: finalize compression info api ([9ef0bd6](https://github.com/deeeed/audiolab/commit/9ef0bd62270133c8f89a678ec466f99896602583))
- update deps ([c53d36e](https://github.com/deeeed/audiolab/commit/c53d36ec844c117d698a79894d55fd43c44ff359))
- feat(audio): implement audio compression support ([ff4e060](https://github.com/deeeed/audiolab/commit/ff4e060fef1061804c1cc0126d4344d2d50daa9a))
- docs: update api references for v1.7.2 ([cfc669d](https://github.com/deeeed/audiolab/commit/cfc669df7704205a0394f92814183a6b4385f5a9))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.7.2 ([816fff0](https://github.com/deeeed/audiolab/commit/816fff0ed70c4d058d880e20bf324c8aa58050a3))
- docs: changelog ([3927b64](https://github.com/deeeed/audiolab/commit/3927b645f2cec1501d8b84bc5f43079e3f61b87a))
- Merge pull request #73 from deeeed/transcriber ([8308b6e](https://github.com/deeeed/audiolab/commit/8308b6eb0457d521380c1a14391a21bcfe766e4f))
- cleanup ([e78a58f](https://github.com/deeeed/audiolab/commit/e78a58f01dd541e33eef9f9dff0ee8e613433530))
- fix: potential null error ([b5ac069](https://github.com/deeeed/audiolab/commit/b5ac0695e9e587bb7f08cbfee53515c7c59b49af))
- feat: cleanup ([4cd0d80](https://github.com/deeeed/audiolab/commit/4cd0d8010005e6e8d307184f7bea0adca92361d3))
- refactor: update useLiveTranscriber to respect enabled state ([1b11f29](https://github.com/deeeed/audiolab/commit/1b11f29ae459c41773a6b1646bdcdc833330f0db))
- Merge pull request #72 from deeeed/fixwebreturn ([53561cd](https://github.com/deeeed/audiolab/commit/53561cd9ab7c4d3874da48e27ad1fc6a70ee63f7))
- feat: cleanup ([1f17964](https://github.com/deeeed/audiolab/commit/1f17964cd6fc1e877e8ab987a09080c8d2e40e9f))
- fix(audio-stream): correct WAV header handling in web audio recording ([9ba7de5](https://github.com/deeeed/audiolab/commit/9ba7de5b96ca4cc937dea261c80d3fda9c99e8f4))
- fix: change skipWavHeader to true in HexDataViewer ([410b6f5](https://github.com/deeeed/audiolab/commit/410b6f540403a73bf4a19e8918d30c108d06aa18))
- feat: lockfile update ([a7e1cbb](https://github.com/deeeed/audiolab/commit/a7e1cbb5ea5055be3c5e52789e784f79f8f69fa2))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.7.1 ([6578dea](https://github.com/deeeed/audiolab/commit/6578deacb60e9d3add1ca5a8ccb3b8fdffffc5e1))
- docs: changelog update ([b536677](https://github.com/deeeed/audiolab/commit/b536677061d0e33139c09ac1f32ccb29089d3341))
- fix: update notification to avoid triggering new alerts (#71) ([32dcfc5](https://github.com/deeeed/audiolab/commit/32dcfc55daf3236babefc17016f329c177d466fd))
- docs: roadmap ([0492b07](https://github.com/deeeed/audiolab/commit/0492b0773aa311959e4ae42e397094dcf4deac91))
- fix: deployment path for playground app ([68ecbfc](https://github.com/deeeed/audiolab/commit/68ecbfc22cd4600e30ad1c6f2145ab68e6f4bf96))
- fix(AppRoot): Fix styleOverrides property in AppRoot component ([e8c3015](https://github.com/deeeed/audiolab/commit/e8c30151425d11a6bc3dfd7d6654002efa849b08))
- chore(dependencies): Update @siteed/design-system to version 0.34.1 ([1437110](https://github.com/deeeed/audiolab/commit/14371108413baac29f753a19647ddf8c9ffe6b33))
- chore(playground): Disable new architecture in app configuration ([9329caa](https://github.com/deeeed/audiolab/commit/9329caa407c4b9b1a2c559691c5ae0338918990d))
- docs: update api references for v1.7.0 ([5f6506a](https://github.com/deeeed/audiolab/commit/5f6506a72a8ab40e2c76b8358387b43adea32ad0))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.7.0 ([71a0885](https://github.com/deeeed/audiolab/commit/71a0885b08cf9587c875aadb11f6a65ac1fc6af9))
- docs: update changelog ([6dd800d](https://github.com/deeeed/audiolab/commit/6dd800d19d0d5f14bccd4bbb9134a1cc21b7e299))
- fix(ios): improve audio resampling and duration tracking (#69) ([51bef49](https://github.com/deeeed/audiolab/commit/51bef493b8e167852c64b8c66a9f8a14cd34f99c))
- fix: handle paused state in stopRecording (#68) ([15eac9b](https://github.com/deeeed/audiolab/commit/15eac9bfcc3203e4a5eb5f236286ed72aafde722))
- chore(minimal): update expo and core react-native dependencies (#67) ([97bb7f1](https://github.com/deeeed/audiolab/commit/97bb7f175b3b54acd48b88ad52984188f0c7705e))
- fix: reset audio recording state properly on iOS and Android (#66) ([61e9c26](https://github.com/deeeed/audiolab/commit/61e9c261fb3a979be1894e537233d6e5a4fbdae4))
- fix: total size doesnt reset on new recording android (#64) ([f7da57b](https://github.com/deeeed/audiolab/commit/f7da57ba9d6f25870c130c54a049ba4cfad1c444))
- feat(playground): update expo dependencies and prepare for deployment (#61) ([f6f5161](https://github.com/deeeed/audiolab/commit/f6f5161c2459739a5b605bb684422d94520ccb15))
- feat(expo-audio-ui): enhance Waveform component and add RecordButton (#59) ([7a78ed9](https://github.com/deeeed/audiolab/commit/7a78ed9530554d7346a726cf0ce7d534b0f3ccf2))
- feat(playground): enhance app configuration and build setup for production deployment (#58) ([929d443](https://github.com/deeeed/audiolab/commit/929d443145378b1430d215db5c00b13758420e2b))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.6.1 ([084e8ad](https://github.com/deeeed/audiolab/commit/084e8adb91da7874c9e608b55d9c7b2ffd7a8327))
- chore: adapt changelog for release ([6cf0637](https://github.com/deeeed/audiolab/commit/6cf063705faa40d7958ecb45d1b916534371980d))
- feat(expo-audio-stream): publishing setup ([e969cfb](https://github.com/deeeed/audiolab/commit/e969cfbb4b844e0fa34f77beb045ef2efb2f7b12))
- chore: lockfile and deps update ([34faf54](https://github.com/deeeed/audiolab/commit/34faf54157f31e1e339dd3a560f4336f6de09c38))
- docs: update api references for v1.6.0 ([de25398](https://github.com/deeeed/audiolab/commit/de2539805d3d7b25e86bdd0eb4ad8aa03b74ba9f))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.6.0 ([93d9cba](https://github.com/deeeed/audiolab/commit/93d9cba0579dfa339ab3318d5964fcefc2783240))
- docs: changelog update ([08f3489](https://github.com/deeeed/audiolab/commit/08f34897f59af523cc9dd72f902a5cdd38b1d358))
- feat(playground): improved reanimated hack ([ba1d039](https://github.com/deeeed/audiolab/commit/ba1d0395e7e785824fb1e82e018195a2e6429e55))
- chore: bump playground version ([91e3351](https://github.com/deeeed/audiolab/commit/91e3351513b5a64787a51bc80b03a6c3cc724195))
- fix(expo-audio-stream): missing package files ([0901a1b](https://github.com/deeeed/audiolab/commit/0901a1bbbcce3111c9b5d61ade8caa48bcdd3613))
- feat: auto load model files and update dependencies (#57) ([60a34c0](https://github.com/deeeed/audiolab/commit/60a34c07428fd2812bd05474b311cf5d3e9fdd0e))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.5.6 ([f662fed](https://github.com/deeeed/audiolab/commit/f662feda132e12f19236854703d47d1c9e7dd798))
- docs(expo-audio-stream): update changelog ([466f6fe](https://github.com/deeeed/audiolab/commit/466f6febf1c0993ff0fc28f7754691d9357f10cc))
- feat(expo-audio-stream): opt in debug log for plugin config ([03a0a71](https://github.com/deeeed/audiolab/commit/03a0a7168bb4f77638de51c55a1ad19c713b52dc))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.5.5 ([2fcd98d](https://github.com/deeeed/audiolab/commit/2fcd98d0b821e8afebd392573a75ec522934b970))
- fix(expo-audio-stream): include all build + sourcemaps files in the package ([db91bdf](https://github.com/deeeed/audiolab/commit/db91bdf280e099af5baa0f966de0d9532648f15c))
- docs: update api references for v1.5.3 ([cf4c366](https://github.com/deeeed/audiolab/commit/cf4c366f59d89cd4a5e7224d6a9c73e927f7f84c))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.5.3 ([903fc07](https://github.com/deeeed/audiolab/commit/903fc079aaae4a518b386f1df2cb6aaa7c0c2a30))
- docs: changelog update ([220ff51](https://github.com/deeeed/audiolab/commit/220ff51cb72a672a157b23dc7406ed2354a29936))
- fix: expo plugin files not published ([b88c446](https://github.com/deeeed/audiolab/commit/b88c44667013a901fccfe6f89dcb640ae2aae47f))
- chore(expo-audio-stream): remove git commit step from publish script ([4a772ce](https://github.com/deeeed/audiolab/commit/4a772ce93bb7405d9b8e981f46bdf8941a71ecfe))
- chore: more publishing automation ([3693021](https://github.com/deeeed/audiolab/commit/369302107f9dca9dddd8ae68e6214481a39976ac))
- docs: update api references for v1.5.2 ([c2ff546](https://github.com/deeeed/audiolab/commit/c2ff546a1916a2aaca25caf117f6924fda853992))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.5.2 ([5d6ad1b](https://github.com/deeeed/audiolab/commit/5d6ad1b96f334903d6ad72d1703a6eb08697ab05))
- docs(expo-audio-stream): changelog update ([ed765b6](https://github.com/deeeed/audiolab/commit/ed765b6f481329ef568279fa76ef8bfff35149ec))
- chore(expo-audio-stream): improved build publish script ([ad65a69](https://github.com/deeeed/audiolab/commit/ad65a69011273e0eab1ac0f464fc3b009fc3433d))
- fix(expo-audio-stream): missing plugin files ([e56254a](https://github.com/deeeed/audiolab/commit/e56254a4ffa1c015df3d300831ba0b392958b6c8))
- docs: update api references ([61797c3](https://github.com/deeeed/audiolab/commit/61797c378872479d9ae236a43ac6ce366df34858))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.5.1 ([83e0eda](https://github.com/deeeed/audiolab/commit/83e0edabf59e0dfb4062eae6b29899c396842a83))
- fix(expo-audio-stream): plugin deployment process and build system enhancements (#56) ([63fbeb8](https://github.com/deeeed/audiolab/commit/63fbeb82f56130dedeafa633e916f2ce0f8f1a67))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.5.0 ([24b2e6d](https://github.com/deeeed/audiolab/commit/24b2e6da0e39a36256d58f11079264f58ff0ee20))
- feat(expo-audio-stream): add comprehensive ios audio session configuration support (#54) ([ba296ac](https://github.com/deeeed/audiolab/commit/ba296ac9be0d61e7a46cc64953e6f2c66881fdfd))
- fix(expo-audio-stream): prevent invalid WAV files when stopping recording too quickly (#53) ([80f4898](https://github.com/deeeed/audiolab/commit/80f4898625cea52da8f3e34e425e61d7641353f7))
- feat(playground): enhance Whisper integration with improved UI and iOS support (#52) ([0ca2609](https://github.com/deeeed/audiolab/commit/0ca2609c3e84d03899b5d4578c453c48ff036b39))
- feat(playground): integrate whisper.rn native speech recognition (#51) ([63f4e8c](https://github.com/deeeed/audiolab/commit/63f4e8ca227f72e83d5c8a9209d1b25fe820c081))
- feat: cleanup ([0bd2259](https://github.com/deeeed/audiolab/commit/0bd225968a3dbbeaed77bb5e106ffd99aa8f5f67))
- feat: align audio computation for amplitude ([0e21552](https://github.com/deeeed/audiolab/commit/0e215522b64d7eaba40d3f25a0275d11e8c6f5b1))
- feat: cleanup ([ecc49ee](https://github.com/deeeed/audiolab/commit/ecc49ee4a2cd25904dbb7b998157338a8e590436))
- feat: bump version ([7a55064](https://github.com/deeeed/audiolab/commit/7a55064d11a55272157eb2c83f59970461ac856d))
- feat: use flatlist instead of scrollview for logs ([d73b932](https://github.com/deeeed/audiolab/commit/d73b93290621a09de8fb7cc5865a9c2f8068f9df))
- feat: deps ([50ee0cc](https://github.com/deeeed/audiolab/commit/50ee0cce6c1a0e964f6b5e6a0f4b37a68f08053b))
- feat: minimal clean ([2f221c2](https://github.com/deeeed/audiolab/commit/2f221c2140723da69ff72c263dbd28df86909183))
- feat: cleanup ([4d8238d](https://github.com/deeeed/audiolab/commit/4d8238dc311e831c15596b56c86fa16abf807840))
- feat: cleanup ([24f9cab](https://github.com/deeeed/audiolab/commit/24f9cab92df4b48f62371c9e29b7d4b7613d80b7))
- feat: setup rncpp package ([09c6ecd](https://github.com/deeeed/audiolab/commit/09c6ecd541a3db64892288bc6425711de5ab185f))
- feat: eslint for minimal project ([2c3fbc0](https://github.com/deeeed/audiolab/commit/2c3fbc00ba06791789bfed4e9571d0971332fe06))
- feat: enable new architecture on minimal demo ([cc2565f](https://github.com/deeeed/audiolab/commit/cc2565f308e3f54078466fb021376c9866d00c92))
- feat: clean build ([2001ed4](https://github.com/deeeed/audiolab/commit/2001ed4d204dc4f574e4b69dbac1a8e229ac5b1f))
- feat: fix native provider for transcription ([5a26d64](https://github.com/deeeed/audiolab/commit/5a26d64e1ceed5f50494cae4005af70abb8c495f))
- feat(playground): update expo and enable new architecture ([c118c52](https://github.com/deeeed/audiolab/commit/c118c524c131978d6741f72444d5cefa48209481))
- feat: automate API doc export inside docusaurus ([8925422](https://github.com/deeeed/audiolab/commit/89254220642ce93e6eb5f578b054fefcee7f6ba8))
- feat: add jfk assets ([f5af3a2](https://github.com/deeeed/audiolab/commit/f5af3a29665d1fd246019a80e1ebddda198ae347))
- feat: whisperweb integration (#12) ([1dc5bf0](https://github.com/deeeed/audiolab/commit/1dc5bf053c56a78d5d4d581d96ab78d167d36b58))
- feat: update deps and audio hex visualization (#11) ([f664fe9](https://github.com/deeeed/audiolab/commit/f664fe92d99ee76f79448b5d1f4a935a5b4108e3))
- feat: update docs (#10) ([1ad30a4](https://github.com/deeeed/audiolab/commit/1ad30a4b9721501d88a7f0b2f77db947ba317f31))
- Move project to monorepo structure (#9) ([9105ce0](https://github.com/deeeed/audiolab/commit/9105ce056364b0466349c83fa507a3ba598509fa))
- feat: Update audio-recording component styles and UI (#8) ([7caea1f](https://github.com/deeeed/audiolab/commit/7caea1fc0f8657165aad24375402d15dea12451a))
- feat: ui improvements (#7) ([ea17266](https://github.com/deeeed/audiolab/commit/ea17266b4285763112bec8a020d30455f0c64762))
- Revert "Implement refresh control and add clipboard dependency and babel asse…" (#6) ([5f82f64](https://github.com/deeeed/audiolab/commit/5f82f644fdc7735988d1d46520120945ff8e6174))
- Implement refresh control and add clipboard dependency and babel asset mapping (#5) ([941eee9](https://github.com/deeeed/audiolab/commit/941eee9d366c2b8ccfd13418a9df47f97e477049))
- Merge pull request #4 from deeeed:feat/webfiles ([1f634db](https://github.com/deeeed/audiolab/commit/1f634db493725ac776578e36130a560d3cd340e0))
- chore: Remove unused code and update file handling in the playground app ([a8fea33](https://github.com/deeeed/audiolab/commit/a8fea339e8f7f3fb64e218490bcd743f0fac6c86))
- fix: invalid property, use fullAudioDurationMs instead of durationMs ([ca4ef0d](https://github.com/deeeed/audiolab/commit/ca4ef0d3bbfbc259511cf08852082eb0c5b5c883))
- feat: Improve file handling in the playground app ([a405d55](https://github.com/deeeed/audiolab/commit/a405d557c0a289a8c15dc111d72137c93143a89a))
- chore: Remove unused code and update file handling in the playground app ([e042ce3](https://github.com/deeeed/audiolab/commit/e042ce30f840edd782a178afc3c134c709a7acd5))
- chore: Update Files component styles and layout ([ab3fc80](https://github.com/deeeed/audiolab/commit/ab3fc80db9902041b2883d16da92cd744bf3f8b7))
- feat: handle empty state for audio files ([2ce508c](https://github.com/deeeed/audiolab/commit/2ce508c001cc16cea38bbec5fbe6cc386ee97e2b))
- chore: Refactor Files component and AudioFilesProvider ([ddfe029](https://github.com/deeeed/audiolab/commit/ddfe0298202d705c77223085beb16fe73bfac2e2))
- feat: update deisgn system ([e01732e](https://github.com/deeeed/audiolab/commit/e01732e6dcf3e95874d902c309846ebd35b901fc))
- feat: use indexeddb instead of session storage ([a71d630](https://github.com/deeeed/audiolab/commit/a71d630a18362a8f3c25599bdb3bd0989582f8dd))
- feat: display audio analysis on stop for web ([bf70c6c](https://github.com/deeeed/audiolab/commit/bf70c6cf777878492f21a04948740f409086b0f4))
- feat: manage files on web ([c8112b6](https://github.com/deeeed/audiolab/commit/c8112b605a9dd800c9afb90689896811c07b7ffb))
- feat: display files menu on web ([5927675](https://github.com/deeeed/audiolab/commit/5927675bc8bc8bccc4cd12bccf0ea278549c3071))
- feat: cleanup unwanted file ([2bb6f8d](https://github.com/deeeed/audiolab/commit/2bb6f8d521e18382d2fe414acb35995a890f02d4))
- Merge pull request #3 from deeeed/feat/playground ([b2f8361](https://github.com/deeeed/audiolab/commit/b2f836102118184f038555ba8052155b17370ff4))
- feat: build assets ([acef47c](https://github.com/deeeed/audiolab/commit/acef47c97108a582bfc54691da08b390df399ae0))
- feat: add icons ([fede6cc](https://github.com/deeeed/audiolab/commit/fede6ccf17c3f01b2334cb51ddf6a6804f899867))
- feat: clean prebuild ([98333d4](https://github.com/deeeed/audiolab/commit/98333d4275dfdfb8e3d27ff5d844798cba5a30bb))
- feat: cleanup ([b26135c](https://github.com/deeeed/audiolab/commit/b26135c01332a514ea5c83b1d752dfdbc08f5090))
- feat: begin renaming example to playground ([0a46b15](https://github.com/deeeed/audiolab/commit/0a46b156d8d8a878b1ee618469ec5e437a3e5280))
- Merge pull request #2 from deeeed/feat/waveform ([5e0107d](https://github.com/deeeed/audiolab/commit/5e0107d02299d5d7965f71c3457e43a483eae025))
- feat: reorganize audio files and differentiate active speech color ([def92c8](https://github.com/deeeed/audiolab/commit/def92c88feb9e9b2474f8f1df87553e7c72b1f55))
- feat: force pause audio at end of drag ([a06c84e](https://github.com/deeeed/audiolab/commit/a06c84e5ab91259575e36849108cee16f69bee2e))
- feat: cleanup ([a4e33a5](https://github.com/deeeed/audiolab/commit/a4e33a536e3d1533cf0f78284f30c5be793243ec))
- feat: follow audio tracking ([df5afcd](https://github.com/deeeed/audiolab/commit/df5afcd4277d5a79ab56cf4ba7534f21fc9e1cf3))
- feat: cleanup ([714f198](https://github.com/deeeed/audiolab/commit/714f198506a9616d09d7617805f37a5e59ed1299))
- feat: smooth scrolling ([5cc1b15](https://github.com/deeeed/audiolab/commit/5cc1b15fa103ca3d36574883cd32c1a67a3e74c5))
- feat: working ios+android+web visuals ([5906ba5](https://github.com/deeeed/audiolab/commit/5906ba5460149d931bf0acdd0e54051497c79975))
- fix: incorrect types ([33095fe](https://github.com/deeeed/audiolab/commit/33095feffdfc85ffa7b12d041851afb2267b16d4))
- feat: android live working ([f509928](https://github.com/deeeed/audiolab/commit/f5099282266852ccd526471dd8ad045560e851ac))
- feat: wip ([aef25e2](https://github.com/deeeed/audiolab/commit/aef25e279363eaefb484467e97e7e119b4d4ae7d))
- feat: live working on web ([99dcd9c](https://github.com/deeeed/audiolab/commit/99dcd9cafebc0d5e8c7eebeaee1662ff68ef492d))
- feat: simplify updateActivePoints params ([a14674f](https://github.com/deeeed/audiolab/commit/a14674fc93e0f97d6b43051a9b61ecac8c4595f3))
- feat: simplify gesture handler ([9c86f2f](https://github.com/deeeed/audiolab/commit/9c86f2f44f9b9b5605a39e70ddaff71267d779d9))
- feat: add example audio for comparison accross platform ([fa4c4b8](https://github.com/deeeed/audiolab/commit/fa4c4b8677aa25f4d302c2313b571312d62f5fb3))
- feat: wip ([9137e75](https://github.com/deeeed/audiolab/commit/9137e7589c97d9bdf283ae227091086f4591e4ed))
- feat: wip ([158a447](https://github.com/deeeed/audiolab/commit/158a447bc68363ff2ef61d0415c19ccc01627ffc))
- feat: implement android feature extraction ([2b221d5](https://github.com/deeeed/audiolab/commit/2b221d5d92348597413a530a32281ba1173d5a51))
- feat: wip ([0f98b57](https://github.com/deeeed/audiolab/commit/0f98b576cd4ab9f4b0d9febb08ab047c20f098dc))
- feat: wip ([ebb3b78](https://github.com/deeeed/audiolab/commit/ebb3b788250c746ce50d56a97810b7fc57224b26))
- feat: wip ([84c4a6b](https://github.com/deeeed/audiolab/commit/84c4a6b7ed50d9df4823e8f10668f69b52e97bfd))
- feat: wip ([1f23623](https://github.com/deeeed/audiolab/commit/1f236230d1cba8448f1a41fe86809db005f21086))
- feat: wip ([5d9f52a](https://github.com/deeeed/audiolab/commit/5d9f52ad8aab54839342c021b23f36508996d9c3))
- feat: wip ([c49e81d](https://github.com/deeeed/audiolab/commit/c49e81da8a704cdf8046ce48944c185b3e3bbd7b))
- feat: wip ([f69caf4](https://github.com/deeeed/audiolab/commit/f69caf4d39d30b44ad3bf7a9f7dadf3e206d5a7a))
- feat: add audio samples ([3b47b93](https://github.com/deeeed/audiolab/commit/3b47b93b9a1ea259829fcf04aded12d98794b93b))
- feat: wip ([79364ed](https://github.com/deeeed/audiolab/commit/79364edbbde84c22482d2118cf71fa04c9a11fce))
- wip ([d65a5d4](https://github.com/deeeed/audiolab/commit/d65a5d4a2d594935de15159e0350e27e8fe52310))
- feat: wip ([fc7b156](https://github.com/deeeed/audiolab/commit/fc7b1569fd2b788460b6ef4213b429cf6e333a41))
- feat: ios features extraction ([d297076](https://github.com/deeeed/audiolab/commit/d297076c50018aff3e8dac14886df018444c0648))
- feat: wip ([1260fce](https://github.com/deeeed/audiolab/commit/1260fceb12435f9113fe9048223200fc3f25775d))
- feat: wip and ios improvements ([80463f1](https://github.com/deeeed/audiolab/commit/80463f1694d5a9d4d963d51587e8214362b9e57c))
- feat: working minimal example ([f1cae73](https://github.com/deeeed/audiolab/commit/f1cae73adc8a6335801996889d04acd4a8b96c18))
- feat: minimal working version ([ea5ee59](https://github.com/deeeed/audiolab/commit/ea5ee59bc122574cd42affcc2d52aa664c4e5fb3))
- feat: wip ([53c13b0](https://github.com/deeeed/audiolab/commit/53c13b04b8bce0cec36009a2312086f1c5a12624))
- feat: full fix ([2be8940](https://github.com/deeeed/audiolab/commit/2be894060e3d2fcfee75f5f61b9fb8e475083e25))
- feat: wip ([940ba32](https://github.com/deeeed/audiolab/commit/940ba32b37357b79890eeb57ca7fd8c041b2a23a))
- feat: wip ([8e731a8](https://github.com/deeeed/audiolab/commit/8e731a8b4a8e2ae255d347c6132a024b6cc1eff4))
- feat: wip ([72530f9](https://github.com/deeeed/audiolab/commit/72530f908d2e90584a8fcc1adf710686f72d66a5))
- feat: wip ([f09be94](https://github.com/deeeed/audiolab/commit/f09be94b31191f3d157c54c3c8ecd0e8764cf653))
- feat: wip ([466282a](https://github.com/deeeed/audiolab/commit/466282acc53030af03e02e3e3f107c8d4121badc))
- feat: wip ([8173fec](https://github.com/deeeed/audiolab/commit/8173fec1df32338d12d9a32870c69b6dc6296497))
- feat: cleanup ([649682a](https://github.com/deeeed/audiolab/commit/649682a7b88730c47eb3cb24ea89f4c583bdc557))
- wip ([4788b65](https://github.com/deeeed/audiolab/commit/4788b65460a57ed1b83a829de2e7beb73ad442cf))
- feat: save state ([97c20fd](https://github.com/deeeed/audiolab/commit/97c20fd0474cb2eab2db655807b4d9b5ba6d817e))
- feat: correct start config ([5984e40](https://github.com/deeeed/audiolab/commit/5984e403835af567731c17853e918df2dfe763eb))
- feat: working downsampling ([e62e06e](https://github.com/deeeed/audiolab/commit/e62e06e38b51057adbc32ce371a4d895e51d4530))
- feat: add skia + experiment downsampling ([05f2aef](https://github.com/deeeed/audiolab/commit/05f2aeffc30a471163923f7d89fb4174961039d0))
- feat:  wip ([4acc111](https://github.com/deeeed/audiolab/commit/4acc1118e3589258185b0e25aefd1f961aacaf8b))
- feat:  wip ([d8766ce](https://github.com/deeeed/audiolab/commit/d8766ce7472fdfc463b7c689ee6f3b3c6cfec307))
- feat: save ([d611a80](https://github.com/deeeed/audiolab/commit/d611a80654e369fa64e141c38292b213a3374572))
- feat: upgrade expo and rn ([98aa423](https://github.com/deeeed/audiolab/commit/98aa4232021728ad8bce76054d2421e6df024803))
- feat: wip ([2daac9f](https://github.com/deeeed/audiolab/commit/2daac9fb11426ff3bec8a146871ea91b2ca422b2))
- feat: save state ([1a30cfe](https://github.com/deeeed/audiolab/commit/1a30cfe1350e8704320af2c2526570173636a5bd))
- feat: save state ([072765b](https://github.com/deeeed/audiolab/commit/072765b5bf6151742a80db1223378c6dffcde67f))
- feat: migrate to yarn berry ([eadbdbe](https://github.com/deeeed/audiolab/commit/eadbdbeac3a21014d93c96cf1acd154f77db5a42))
- fix: padding on web recording tabbar ([569df46](https://github.com/deeeed/audiolab/commit/569df46ff9eb338d671b50716a390e5b6eb019c7))
- docs: cleanup readme ([f771554](https://github.com/deeeed/audiolab/commit/f7715541b2d43873a576287fde3316aa4dbec642))
- Release 1.0.1 ([2774f67](https://github.com/deeeed/audiolab/commit/2774f67d7c613eaf29579041741170da8e50ca28))
- docs: cleanup readme ([087fd57](https://github.com/deeeed/audiolab/commit/087fd570da3907e94d39aa50acdb93632bcc2f15))
- feat: eslint base ([2449839](https://github.com/deeeed/audiolab/commit/2449839bb27325ae80b6f784dcb7ee6e375324cd))
- Release 1.0.0 ([3eb1fd5](https://github.com/deeeed/audiolab/commit/3eb1fd5546f40df8c4d1926b8e44f436ca9236cb))
- feat: release 1.0 ([5e6bcdf](https://github.com/deeeed/audiolab/commit/5e6bcdf2cb6c2a2350db0c834660f408e2494c98))
- Release 0.7.5 ([410eb63](https://github.com/deeeed/audiolab/commit/410eb6312f437e3fee26976ae2e0f766bc3ac8dd))
- feat: debug ([857e3af](https://github.com/deeeed/audiolab/commit/857e3afb3344f923d3a9a5b59844d4645053ef50))
- Release 0.7.4 ([b5595fe](https://github.com/deeeed/audiolab/commit/b5595fe8515ced7f8eef88082998f08809b52850))
- fix: rendering issue ([cbbf5c1](https://github.com/deeeed/audiolab/commit/cbbf5c16f3328f34421da42bf4db891db056a736))
- Release 0.7.3 ([ff7f3cd](https://github.com/deeeed/audiolab/commit/ff7f3cd64dbc706575ae41c1ba1d1c5e735c62dd))
- feat: debug ([bc9b61c](https://github.com/deeeed/audiolab/commit/bc9b61cd1572459aabdf51f8a612a45bf1fd567d))
- Release 0.7.2 ([e818fec](https://github.com/deeeed/audiolab/commit/e818fec16f884afc045ae4626fa4f767f45586d4))
- feat: cleanup ([ac9a8f1](https://github.com/deeeed/audiolab/commit/ac9a8f18ce0aa7ab9ba477c6ec531db4955a1b32))
- Release 0.7.1 ([f15ed55](https://github.com/deeeed/audiolab/commit/f15ed55cda48d51ee8d7b2fb322d577b651622e4))
- feat: rendering optimizations ([76e4067](https://github.com/deeeed/audiolab/commit/76e40671f860037cad7605d95ecdcb4226271bc5))
- Release 0.7.0 ([2442994](https://github.com/deeeed/audiolab/commit/24429944dc52d7355fd3a53261ee2d468d494fd8))
- feat: working ios audio ([e5465ec](https://github.com/deeeed/audiolab/commit/e5465ec59b9f6a946f998d0c15477959a7a4fe15))
- Release 0.6.0 ([509f187](https://github.com/deeeed/audiolab/commit/509f187f9ec5a339185fae826ae8453c2fbc0741))
- feat: add design system support for improved example ([07fc0da](https://github.com/deeeed/audiolab/commit/07fc0dac21d4cf4a843b076280cf726385499944))
- feat: ffmpeg mobile integration ([902fb61](https://github.com/deeeed/audiolab/commit/902fb61e0918426caa1db9226b127d7d5fc9ec61))
- refactor: android code for modularization ([4be053e](https://github.com/deeeed/audiolab/commit/4be053ee55d1217afab84b0f353979eb20d4714c))
- Release 0.5.2 ([44f9d88](https://github.com/deeeed/audiolab/commit/44f9d88d4e329636fdda786ec884fafc92462628))
- feat: android audio improvements ([49982ba](https://github.com/deeeed/audiolab/commit/49982ba069b48e0b06c7c89b99cacd657afd9a55))
- Release 0.5.1 ([8797e28](https://github.com/deeeed/audiolab/commit/8797e288028952631daf045f210758387cafb32a))
- feat: sending arraybuffer on web ([979766e](https://github.com/deeeed/audiolab/commit/979766e7690e426cfc74da4fe9dc039e14b12fe9))
- Release 0.5.0 ([d3c3a97](https://github.com/deeeed/audiolab/commit/d3c3a978f3a92c5d004299d77b272b84d4187248))
- feat: export as base64 on native ([cc81bb8](https://github.com/deeeed/audiolab/commit/cc81bb87b3b5ddf6a0a7ec8755f26337b6cec0ef))
- Release 0.4.6 ([38f6c8c](https://github.com/deeeed/audiolab/commit/38f6c8c0c563c7efb5d1e3155e7458caf376f473))
- fix: android not sending the full audio detal buffer ([0d5a7e1](https://github.com/deeeed/audiolab/commit/0d5a7e1e6900e6e30cc2dc77abe2a92682052fd8))
- Release 0.4.5 ([d68d800](https://github.com/deeeed/audiolab/commit/d68d80062197d01bb85360163a746869809423f5))
- feat: more debug logs ([7a7114d](https://github.com/deeeed/audiolab/commit/7a7114d069f23b0cc6e439bc02316d194ac3edfd))
- Release 0.4.4 ([3546cf2](https://github.com/deeeed/audiolab/commit/3546cf280decbec5097c2e02880932b222e9f161))
- feat: cleanup ([9f05b9a](https://github.com/deeeed/audiolab/commit/9f05b9a03ffb448b3a2cd7cfb11ec44cf413131b))
- Release 0.4.3 ([2bdad2e](https://github.com/deeeed/audiolab/commit/2bdad2e10ef5beaad7ca8151701d87244e7934d2))
- feat: add extra debug logs ([f7887f8](https://github.com/deeeed/audiolab/commit/f7887f84ddf95c10602211f6b48e17c900970979))
- Release 0.4.2 ([2c60f92](https://github.com/deeeed/audiolab/commit/2c60f92dac4913a8cc0b8304f6b5017e4295dd88))
- feat: add extra debug logs ([2f746cd](https://github.com/deeeed/audiolab/commit/2f746cdaa738a10f3029129cbd51510d776e3a09))
- Release 0.4.1 ([d0b60cb](https://github.com/deeeed/audiolab/commit/d0b60cb5a5a4e4b74d894cf1e12d67c5fc2a1e48))
- feat: add extra debug logs ([cea08c4](https://github.com/deeeed/audiolab/commit/cea08c410e5d624b1a7387c7cca2a0cbc072d6f1))
- Release 0.4.0 ([bc0918b](https://github.com/deeeed/audiolab/commit/bc0918b5b5e4fa6fee174e928e73da7136939b2e))
- feat: add export of audio format info ([ca6fe5a](https://github.com/deeeed/audiolab/commit/ca6fe5aa999b0125bb49acf7c33d943ea49672b3))
- Release 0.3.4 ([c682570](https://github.com/deeeed/audiolab/commit/c682570d12e52e1355e7c534f7a15dc43dad2093))
- feat: audio event format includes position ([846f29d](https://github.com/deeeed/audiolab/commit/846f29d430d537dca4b30d4c61db0cd9f95caabf))
- Release 0.3.3 ([a139009](https://github.com/deeeed/audiolab/commit/a1390092c5bf531e5889cf9a317e1328a62e8a38))
- feat: export hook state type ([40c137a](https://github.com/deeeed/audiolab/commit/40c137abc5d704f7cbd91fcd864ae44b1938eff6))
- Release 0.3.2 ([7119872](https://github.com/deeeed/audiolab/commit/7119872a48ea04d6647a964b4dd1f78a5fcff420))
- feat: async audio event ([d8509a3](https://github.com/deeeed/audiolab/commit/d8509a316139b130b835a1df6410dbd694b9770c))
- Release 0.3.1 ([5cb4e93](https://github.com/deeeed/audiolab/commit/5cb4e9367b72c99c09c9c42ac33093c8fa6aab3a))
- feat: make expo-file-system as peer deps ([6310461](https://github.com/deeeed/audiolab/commit/6310461a87001b1eac9357872fac6a9891ff0409))
- feat: update libraries ([d3c09e8](https://github.com/deeeed/audiolab/commit/d3c09e8a1cf2c4c7ac17807cf15722173bff22a4))
- Release 0.3.0 ([14c9cb9](https://github.com/deeeed/audiolab/commit/14c9cb9d860d342d93cb462471511e77b49de89d))
- feat: working example ([0d2d362](https://github.com/deeeed/audiolab/commit/0d2d362e0380699855084a9f61b3ac5043700d36))
- feat: cleanup ([a3af61a](https://github.com/deeeed/audiolab/commit/a3af61a12ee60649746621aa1e5fbaca26091b6b))
- feat: working ios setup and file sharing ([61a741b](https://github.com/deeeed/audiolab/commit/61a741b99cb6076a6668d7415ec46dfcff33e10e))
- Release 0.2.4 ([fe8a946](https://github.com/deeeed/audiolab/commit/fe8a94637bc8aef01406f80ed977b5894dfe5ac9))
- feat: cleanup and readme ([1955544](https://github.com/deeeed/audiolab/commit/19555442fb2cd067a7da3dfb901595d9c431dcd9))
- Release 0.2.3 ([c7c962f](https://github.com/deeeed/audiolab/commit/c7c962ffaced7f20ee851e3168477fdafcabc95d))
- fix: auto config ([1a298a2](https://github.com/deeeed/audiolab/commit/1a298a2e114827365bc9df2d434c7da2190b1ea5))
- Release 0.2.2 ([b9c1546](https://github.com/deeeed/audiolab/commit/b9c1546e2b656e1a5223016079c9548d9929b841))
- fix: expo config ([47fc972](https://github.com/deeeed/audiolab/commit/47fc9720fed21dc5e5e6fe2b3634f8edff226698))
- Release 0.2.1 ([7925b0c](https://github.com/deeeed/audiolab/commit/7925b0c8179227b16c508801748ca4fc60f27d9d))
- feat: cleanup ([0c14ffe](https://github.com/deeeed/audiolab/commit/0c14ffec0c17feec7d6e3f927bccafd98e01c9da))
- feat: cleanup ([66c69ed](https://github.com/deeeed/audiolab/commit/66c69ed5f7ae49ad87ee36be1f73b85af9f39a7b))
- feat: setup ([139aac2](https://github.com/deeeed/audiolab/commit/139aac26a4b453c0f908dc7e64a5d9953c6290b9))
- feat: basic setup ([7e9bef9](https://github.com/deeeed/audiolab/commit/7e9bef98a3ad3644284dcae2e9c5d7bfea6c2860))
- Release 0.2.0 ([fdab65c](https://github.com/deeeed/audiolab/commit/fdab65c9974e726ac1c7ee918b8fb8b830416b82))
- feat: cleanup ([8c4444b](https://github.com/deeeed/audiolab/commit/8c4444b08e04473a7dd7f0850f70ecc645956fac))
- feat: add audio playback support ([52debe1](https://github.com/deeeed/audiolab/commit/52debe11cce88b9f221f7eb354120b19c59a586e))
- feat: readme ([887540f](https://github.com/deeeed/audiolab/commit/887540fad0356f641a010c61a2f0a8e107ea2bea))
- feat: fully working streamer ([f37f9c0](https://github.com/deeeed/audiolab/commit/f37f9c067ec04e8f9895e5b80fa2609eb355cfe0))
- feat: ios module support ([ee97677](https://github.com/deeeed/audiolab/commit/ee976771deaa73b102dd2c800eaee03f6eed339d))
- feat: clean prebuild ([aeed159](https://github.com/deeeed/audiolab/commit/aeed159d20f550e1812016bc3b49a04c0bc4b495))
- feat: auto plugin config ([d68c879](https://github.com/deeeed/audiolab/commit/d68c879535b0d098a636db98ca8fff766cf266a6))
- feat: ios and auto config plugin ([3c9330c](https://github.com/deeeed/audiolab/commit/3c9330c203059a21182fa106b78fdc5d1263569a))
- feat: setup ([418acf6](https://github.com/deeeed/audiolab/commit/418acf678f4c7bea209941e83f3b6575b8477135))
- Initial commit ([3989b7a](https://github.com/deeeed/audiolab/commit/3989b7af3754257e02ff021d67576c3ae53220ed))
- Add `@expo/config-plugins` to `peerDependencies` — fixes Yarn PnP `ambiguous require` error during `expo prebuild` (#341)
- WASM path resolution in build output — `prebuilt/` is now copied into `build/cjs/` and `build/esm/` so Metro resolves WASM imports correctly after install (#341)
- Split WASM modules into separate web/native platform files to prevent Metro bundling issues (#338)
## [3.0.0] - 2026-03-20
### BREAKING CHANGES
- Package renamed from `@siteed/expo-audio-studio` to `@siteed/audio-studio`. The old package continues as a backwards-compatible shim.
- Native module renamed from `ExpoAudioStream` to `AudioStudio`

### Added
- C++ mel spectrogram streaming with WASM build (#324)
- `streamFormat: 'float32'` option — native delivers `Float32Array` to `onAudioStream`, eliminating base64 encode/decode overhead (#315)

### Fixed
- Memory safety, WASM lifecycle, and platform bug fixes (#329)
- iOS: audio device switching bugs during active recording
- iOS: `resetToDefaultDevice` correctly resets engine tap when switching back to default input
- iOS: recovery after failed device switch no longer produces silent audio
- iOS: `setupNowPlayingInfo` no longer overrides user-configured audio session options
- iOS: `selectInputDevice` syncs `deviceId` into `recordingSettings` before engine update
- iOS: phone-call auto-resume respects user-configured `categoryOptions`
- iOS: `AudioDeviceManager.prepareAudioSession` preserves existing session options

### Performance
- Optimized mel spectrogram C++ implementation
## [2.18.5] - 2026-02-23
### Fixed
- Android: guard Bluetooth API calls behind permission check on API 31+ (#294)
- Android: migrate phone state listener to `TelephonyCallback` on API 31+ (#275)
- Android: reset `startTime` in `startRecording` and validate hardware format (#298, #223)
- Android: gate foreground service on `enableBackgroundAudio` (#288, #294)
- Android: sanitize options before native bridge calls to prevent crash
## [2.18.4] - 2026-02-16
### Added
- Expo SDK 54 (React Native 0.81, React 19) support (#305)

### Fixed
- iOS: include compression data in `onAudioStream` events
- Android: properly emit final chunk of audio data on stop (#293)
## [2.18.1] - 2025-08-02
### Added
- Improved memory monitoring
## [2.18.0] - 2025-08-01
### Fixed
- Android: optimize buffer size to prevent OOM errors
- Android: invalid paused duration calculation
## [2.17.0] - 2025-07-31
### Fixed
- Android: fix `OutOfMemoryError` by tracking stream position correctly
## [2.16.1] - 2025-07-27
### Fixed
- Android: audio analysis accumulation showing 0 bytes
## [2.16.0] - 2025-07-27
### Performance
- Android: optimize stop recording performance for long recordings
## [2.15.0] - 2025-07-15
### Added
- Android: `showPauseResumeActions` option to notification config (#282)
## [2.14.4] - 2025-07-15
### Fixed
- Plugin: respect `enableDeviceDetection` configuration for Android permissions
- Android: add missing `BLUETOOTH_ADMIN` permission for device detection
## [2.14.3] - 2025-06-12
### Changed
- Internal: remove analysis bit depth logging for cleaner debug output
## [2.14.2] - 2025-06-11
### Added
- Platform limitations validation and documentation

### Fixed
- iOS: update compressed file size when primary output is disabled
## [2.14.1] - 2025-06-11
### Fixed
- Android: fix duration returning 0 when primary output is disabled (#244)
## [2.14.0] - 2025-06-11
### Performance
- Comprehensive cross-platform stop recording performance optimization
## [2.13.2] - 2025-06-10
### Fixed
- Invalid type exports
## [2.13.1] - 2025-06-09
### Added
- Sub-100ms audio events analysis and improvements (#270)

### Fixed
- Update `expo-modules-core` peer dependency for Expo SDK 53 compatibility
## [2.13.0] - 2025-06-09
### Added
- Enhanced device detection and management system — configurable `enableDeviceDetection`, automatic connect/disconnect events, force refresh (#269)
## [2.12.3] - 2025-06-07
### Changed
- Adjust audio focus request timing in `AudioRecorderManager`
## [2.12.2] - 2025-06-07
### Fixed
- Android: audio focus strategy for background recording (#267)
## [2.12.0] - 2025-06-07
### Added
- Android-only `audioFocusStrategy` option (#264)

### Fixed
- Android: PCM streaming duration calculation bug (#263, #265)
## [2.11.0] - 2025-06-05
### Added
- M4A support with `preferRawStream` option (#261)

### Fixed
- Enforce 10ms minimum interval on both platforms (#262)
- Android: proper `MediaCodec` resource cleanup in `AudioProcessor`
## [2.10.6] - 2025-06-04
### Fixed
- iOS: prevent `durationMs` returning 0 (#244, #260)
## [2.10.5] - 2025-06-04
### Fixed
- iOS: enable audio streaming when primary output is disabled (#259)
## [2.10.4] - 2025-06-03
### Fixed
- iOS: resolve Swift compilation scope error in `AudioStreamManager` (#256)
## [2.10.3] - 2025-06-02
### Fixed
- Prevent `UninitializedPropertyAccessException` crash in developer menu (#250)
- Return compression info when primary output is disabled (#244, #249)
## [2.10.2] - 2025-05-31
### Fixed
- Buffer size calculation and duplicate emission fix (#248)
## [2.10.1] - 2025-05-27
### Fixed
- `useAudioRecorder`: update `intervalId` type for better type safety
## [2.10.0] - 2025-05-26
### Added
- Buffer duration control and `skipFileWriting` options
- Enhanced testing framework with instrumented tests (#242)
## [2.9.0] - 2025-05-15
### Added
- Web audio chunk handling improvements (#240)

### Changed
- Remove unused compression logic from `WebRecorder`
## [2.8.4] - 2025-05-11
### Fixed
- Expo plugin setup
## [2.8.3] - 2025-05-06
### Changed
- Update plugin configuration to use ESM format
## [2.8.2] - 2025-05-06
### Changed
- TypeScript configurations for dual module (ESM/CJS) support
## [2.8.1] - 2025-05-06
### Added
- Dual module format (ESM/CommonJS) to resolve module resolution issues (#235)
## [2.7.0] - 2025-05-04
### Fixed
- iOS: enhance background audio recording and audio format conversion (#228)
## [2.6.2] - 2025-05-01
### Fixed
- Android: ensure foreground-only audio recording works with `FOREGROUND_SERVICE` (#202, #221)
## [2.6.1] - 2025-05-01
### Fixed
- iOS: resolve hardware format mismatch crash and enhance logging (#220)
## [2.6.0] - 2025-05-01
### Fixed
- Web: resolve audio recording issue without compression (#217, #219)
## [2.5.0] - 2025-04-30
### Added
- Complete Android implementation for audio device API (#214)
- Cross-platform audio device detection, selection, and fallback handling (#213)
- Zero-latency recording with `prepareRecording` API (#211)

### Fixed
- iOS: ensure complete audio data emission on recording stop/pause (#215)
## [2.4.1] - 2025-04-08
### Added
- Enhanced background audio handling and permission checks (#200)
## [2.4.0] - 2025-04-03
### Fixed
- iOS: resolve sample rate mismatch and enhance recording stability (#198)
- Android: enhance permission handling for phone state and notifications (#196)
## [2.3.1] - 2025-04-03
### Changed
- Remove external CRC32 library dependency (#195)
## [2.3.0] - 2025-03-29
### Fixed
- Always generate a new UUID unless filename is provided (#182)
## [2.2.0] - 2025-03-28
### Changed
- Platform-specific CRC32 handling
## [2.1.0] - 2025-03-04
### Added
- Mel spectrogram extraction and language detection (#157)
- Audio import functionality and decibel visualization (#156)
- iOS trim support with custom filename (#152)
- Sample rate control and web trimming support (#151)
- Audio trimming with optimized processing and detailed feedback (#150, #149)
## [2.0.1] - 2025-02-27
### Changed
- Update background mode handling for audio stream plugin
## [2.0.0] - 2025-02-27
### Added
- Full audio analysis with spectral features and time range controls (#132)
- Audio compression support (#137)
- `extractAudioData` API
- PCM player
- Audio checksum verification and segment analysis (#143)

### Fixed
- Audio recording reliability improvements and web IndexedDB management (#146)
## [1.17.0] - 2025-02-18
### Added
- Interval audio analysis for web, Android, and iOS (#125, #126)
## [1.16.0] - 2025-02-17
### Fixed
- iOS: prevent adding background modes when disabled
- iOS: replace CallKit with `AVAudioSession` for phone call detection
## [1.15.1] - 2025-02-17
### Fixed
- iOS: restore Opus compression support (#122)
- Performance: emit audio analysis without blocking
## [1.15.0] - 2025-02-15
### Fixed
- iOS: improve audio recording interruption handling and auto-resume (#119)
- Android: improve background recording and call interruption handling (#118)
## [1.14.2] - 2025-02-13
### Fixed
- Clear recording metadata on STOP action
## [1.14.1] - 2025-02-12
### Fixed
- Enable background recording by default (#114)
## [1.14.0] - 2025-02-12
### Fixed
- `keepAwake` issue on iOS and auto-resume after call (#113)
## [1.13.2] - 2025-02-10
### Fixed
- Ensure foreground service starts within required timeframe
## [1.13.0] - 2025-02-09
### Added
- Audio decode support (#104)

### Fixed
- Background recording issues and status checking (#103)
## [1.12.1] - 2025-02-01
### Fixed
- Improve audio recording interruption handling and consistency (#98)
## [1.12.0] - 2025-01-31
### Added
- Call state checks before starting or resuming recording (#94)
- Custom filename and directory support for recordings (#92)
- Compressed recording info with file size (#90)
## [1.11.3] - 2025-01-25
### Fixed
- Disable duplicate notification alerts for audio stream (#82)
## [1.11.2] - 2025-01-22
### Fixed
- Resources not cleaned up properly on app kill (#80)
## [1.11.0] - 2025-01-22
### Added
- Intelligent call interruption handling and compression improvements (#78)
## [1.10.0] - 2025-01-14
### Added
- Support for pausing and resuming compressed recordings
- Optimized notification channel settings
## [1.9.2] - 2025-01-12
### Fixed
- iOS: bitrate verification to prevent invalid values
## [1.9.1] - 2025-01-12
### Fixed
- iOS: potentially missing compressed file info
## [1.9.0] - 2025-01-11
### Performance
- Optimize memory usage and streaming performance for web audio recording (#75)
## [1.8.0] - 2025-01-10
### Added
- Audio compression support
## [1.7.2] - 2025-01-07
### Fixed
- Web: correct WAV header handling in audio recording
## [1.7.1] - 2025-01-07
### Fixed
- Notification: avoid triggering new alerts on update (#71)
## [1.7.0] - 2025-01-05
### Fixed
- iOS: improve audio resampling and duration tracking (#69)
- Handle paused state in `stopRecording` (#68)
- Reset audio recording state properly on iOS and Android (#66)
- Android: total size not resetting on new recording (#64)
## [1.3.1] - 2024-12-05
### Added
- Web: throttling and optimized event processing (#49)
## [1.3.0] - 2024-11-28
### Added
- Standardize permission status response structure across platforms (#44)
## [1.2.4] - 2024-11-05
### Changed
- Android: minimum audio interval set to 10ms
- Plugin: do not include `notification` config by default to prevent iOS version mismatch

### Fixed
- Remove frequently firing log statements on web
## [1.2.0] - 2024-10-24
### Added
- `keepAwake` — continue recording when app is in background (default: true)
- Customizable recording notifications for Android and iOS
  - Android: rich notification with live waveform, configurable actions/colors/priorities
  - iOS: media player integration
## [1.1.17] - 2024-10-21
### Added
- Bluetooth headset support on iOS

### Fixed
- Android: not reading custom interval audio update
## [1.0.0] - 2024-04-01
### Added
- Initial release
- Real-time audio streaming across iOS, Android, and web
- Configurable intervals for audio buffer receipt
- Automated microphone permissions setup in managed Expo projects
- Background audio recording on iOS
- Audio features extraction during recording
- Consistent WAV PCM recording format across all platforms

[unreleased]: https://github.com/deeeed/audiolab/compare/@siteed/audio-studio@3.0.1...HEAD
[3.0.1]: https://github.com/deeeed/audiolab/compare/@siteed/audio-studio@3.0.0...@siteed/audio-studio@3.0.1
[3.0.0]: https://github.com/deeeed/audiolab/compare/@siteed/audio-studio@2.18.5...@siteed/audio-studio@3.0.0
