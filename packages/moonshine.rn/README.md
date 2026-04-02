# `@siteed/moonshine.rn`

React Native wrapper around Moonshine Voice's transcription and
intent-recognition C API.

This package can use either:

- the published Moonshine Android artifact from Maven
- a source-built Moonshine Android AAR generated from a pinned upstream checkout
  under `third_party/moonshine`
- a source-built Moonshine iOS xcframework generated from the same pinned
  upstream checkout
- a package-owned web backend built on `onnxruntime-web`, with model assets
  staged under `prebuilt/web`

Current API coverage:

- Explicit transcriber instances:
  `createTranscriberFromFiles()`, `createTranscriberFromMemory()`,
  `createTranscriberFromAssets()`, `releaseTranscriber()`
- Compatibility singleton helpers:
  `loadFromFiles()`, `loadFromMemory()`, `loadFromAssets()`, `initialize()`,
  `release()`
- Instance and compatibility transcription APIs:
  `start()`, `stop()`, `createStream()`, `removeStream()`, `startStream()`,
  `stopStream()`, `addAudio()`, `addAudioToStream()`,
  `transcribeFromSamples()`, `transcribeWithoutStreaming()`
- Streaming and offline transcription
- Multiple streams from one transcriber
- Transcript line timings, optional line audio data, and word timings
- Experimental speaker-turn / speaker-clustering metadata on transcript lines.
  This is useful for tentative turn segmentation, but it should not be treated
  as trusted diarization or speaker identity assignment without task-specific
  validation.
- Explicit intent recognizer instances plus lifecycle and registration APIs:
  `createIntentRecognizer()`, `releaseIntentRecognizer()`,
  `registerIntent()`, `unregisterIntent()`, `processUtterance()`,
  `setIntentThreshold()`, `getIntentThreshold()`, `getIntentCount()`, and
  `clearIntents()`
- JNI helpers `getVersion()` and `errorToString()`
- Typed transcriber runtime options exposed from the Android artifact, including:
  `identifySpeakers`, `speakerIdClusterThreshold`, `vadThreshold`,
  `vadHopSize`, `vadWindowDurationMs`, `vadMaxSegmentDurationMs`,
  `vadLookBehindSampleCount`, `maxTokensPerSecond`, `logApiCalls`,
  `logOrtRuns`, `logOutputText`, `saveInputWavPath`, and `wordTimestamps`
- Raw pass-through `transcriberOptions` so new upstream options can be used
  without waiting on another wrapper release
- `loadFromMemory()` mirrors the Android AAR directly and accepts the same
  three opaque binary model parts via `modelData`

Current gap:

- `MicTranscriber` is not wrapped directly. React Native apps usually already
  own microphone capture, permissions, and audio routing, so this package stays
  focused on the reusable `Transcriber` engine surface instead of replacing the
  app audio stack.
- The package owns the Android transcriber logic directly now, but full intent
  recognition requires the source-built Moonshine artifact or another custom
  Android artifact that includes the direct JNI extensions added in
  `patches/OrtAndroidOverrides.patch`.

Source checkout and Android source build:

```bash
bash packages/moonshine.rn/setup.sh
bash packages/moonshine.rn/build-moonshine-android.sh
bash packages/moonshine.rn/build-moonshine-ios.sh
bash packages/moonshine.rn/build-moonshine-web.sh
```

That produces:

- `packages/moonshine.rn/prebuilt/android/moonshine-voice-source-release.aar`
- `packages/moonshine.rn/prebuilt/android/build-metadata.json`
- `packages/moonshine.rn/prebuilt/ios/Moonshine.xcframework`
- `packages/moonshine.rn/prebuilt/ios/build-metadata.json`
- `packages/moonshine.rn/prebuilt/web/model/...`
- `packages/moonshine.rn/prebuilt/web/build-metadata.json`

To make the React Native package consume that local source-built artifact:

```bash
SITEED_MOONSHINE_ANDROID_USE_SOURCE=1 yarn workspace audio-playground android
```

For iOS, the podspec consumes `prebuilt/ios/Moonshine.xcframework` directly
once it has been built and the app is reinstalled with CocoaPods.

The source-built artifact is the recommended Android path. It gives this
package direct JNI access to vendored Moonshine features that are not available
through the published Java wrapper alone, including the intent recognizer API.

ORT override flow for the source build:

- `SITEED_MOONSHINE_ORT_ROOT`
- `SITEED_MOONSHINE_ORT_LIB_DIR`
- `SITEED_MOONSHINE_ORT_INCLUDE_DIR`
- `SITEED_MOONSHINE_ORT_LIB_PATH`
- `SITEED_MOONSHINE_ORT_VERSION`
- `SITEED_MOONSHINE_ANDROID_ABI`
- `SITEED_MOONSHINE_ANDROID_ABIS`
- `SITEED_MOONSHINE_SPEAKER_EMBEDDING_DATA_CPP`

The most reliable override is to point the source build at an explicit ORT
library/include pair:

```bash
SITEED_MOONSHINE_ORT_ROOT=/abs/path/to/onnxruntime-android \
SITEED_MOONSHINE_ORT_VERSION=1.23.0 \
bash packages/moonshine.rn/build-moonshine-android.sh
```

If `git-lfs` is unavailable or too slow for Moonshine's generated
`core/speaker-embedding-model-data.cpp`, you can point the build at a local
materialized copy:

```bash
SITEED_MOONSHINE_SPEAKER_EMBEDDING_DATA_CPP=/abs/path/to/speaker-embedding-model-data.cpp \
bash packages/moonshine.rn/build-moonshine-android.sh
```

Moonshine's Android artifact currently requires `minSdkVersion 35`.
This package itself stays neutral; the consuming app decides whether to link it
and how to gate Android inclusion.

Current Android limitation:

- `@siteed/moonshine.rn` does not safely coexist in the same app binary with
  `@siteed/sherpa-onnx.rn` unless both native stacks are built against the exact
  same ONNX Runtime ABI.
- As validated on April 2, 2026, Sherpa rebuilt against ORT `1.23.0` and
  Moonshine `0.0.51` can coexist in one app binary, and the mixed-engine sample
  recipe passes on a physical Pixel 6a.
- If either side moves to a different ORT ABI, mixed-engine loading will break
  again until both artifacts are realigned.
- Streaming audio currently crosses the React Native bridge as `number[]` PCM
  chunks. Keep live chunks in the ~100-250ms range for now; a JSI/ArrayBuffer
  transport would be the future optimization path for heavier streaming loads.

Current web status:

- The web backend is package-owned. It does not depend on the published
  `@moonshine-ai/moonshine-js` bundle at runtime.
- Web supports offline transcription plus file-driven live streaming through
  the same `MoonshineService` / `MoonshineTranscriber` API that native uses.
  The current web streaming path consumes PCM chunks from the app audio layer
  (for example `@siteed/audio-studio`) and emits the same transcript events as
  the native wrapper.
- Web maps the current live English contenders to the available web tiers:
  `small-streaming -> tiny` and `medium-streaming -> base`.
- Web requires `window.ort` to be loaded before creating a transcriber. In
  playground this is done from `src/index.web.tsx` before the app mounts.
- Web `loadFromMemory()` is supported for the same three-part
  `encoder + decoder + tokenizer` contract that native uses. The browser
  backend currently uses the first two blobs to create temporary ONNX object
  URLs and ignores the tokenizer bytes because decoding is handled by
  `llama-tokenizer-js`.
- Web intent recognition is still not implemented in this package-owned
  backend and currently fails explicitly with a runtime error.
- Web does not expose native-style speaker clustering / diarization metadata
  yet. Transcript lines are emitted, but speaker hints remain native-only.
- Use `configureMoonshineWeb()` if you want to override the default model asset
  CDN or the `onnxruntime-web` wasm base path.

Android artifact override:

- `SITEED_MOONSHINE_ANDROID_MAVEN_COORD`
- `SITEED_MOONSHINE_ANDROID_MAVEN_REPO`
- `SITEED_MOONSHINE_ANDROID_AAR`
- `SITEED_MOONSHINE_ANDROID_USE_SOURCE`
- `SITEED_MOONSHINE_ANDROID_SOURCE_AAR`

If Moonshine is rebuilt to coexist with Sherpa, the rebuilt artifact must use
the same ORT ABI or intentionally depend on a differently named ORT SONAME.
Changing the packaged filename alone is not sufficient.

Example with a custom Maven repo:

```bash
SITEED_MOONSHINE_ANDROID_MAVEN_REPO=/abs/path/to/local-maven \
SITEED_MOONSHINE_ANDROID_MAVEN_COORD=ai.moonshine:moonshine-voice:0.0.51-ort1232 \
yarn workspace audio-playground android
```

See [`../../docs/ANDROID_ORT_ALIGNMENT.md`](../../docs/ANDROID_ORT_ALIGNMENT.md)
for the full Sherpa + Moonshine alignment flow and compatibility check.
