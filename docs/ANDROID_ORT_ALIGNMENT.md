# Android ORT Alignment

This repo can build and run both `@siteed/sherpa-onnx.rn` and `@siteed/moonshine.rn`,
but they can only coexist in one Android app binary if both native stacks link
against the exact same ONNX Runtime ABI.

Why this matters:

- both stacks depend on `libonnxruntime.so`
- Android loads that library by SONAME, not by package name
- versioned ELF symbols must match exactly

A version-prefixed ORT library can work, but only if the producing native
artifact is rebuilt so its JNI/native library declares that renamed dependency.
Renaming `libonnxruntime.so` inside the APK after the fact is not enough,
because both current engines explicitly declare `NEEDED libonnxruntime.so`.

Current validated state on April 2, 2026:

- refreshed Sherpa imports `OrtGetApiBase@VERS_1.23.0`
- refreshed Sherpa exports `OrtGetApiBase@VERS_1.23.0`
- Moonshine `0.0.51` imports `OrtGetApiBase@VERS_1.23.0`
- the mixed-engine sample validation recipe passes on a physical Pixel 6a

That combination does coexist in one APK.
If Sherpa is rebuilt back to upstream's newer default ORT ABI, the mismatch
returns and mixed-engine loading breaks again.

## Sherpa Override

Sherpa now supports Android ONNX Runtime selection at build time.

Supported inputs:

- `SITEED_SHERPA_ONNX_ORT_VERSION`
  Uses a different downloadable ORT release when building Sherpa.
  Example: `1.23.0`

- `SITEED_SHERPA_ONNX_ORT_ROOT`
  Points to an extracted `onnxruntime-android-<version>` directory that
  contains `headers/` and `jni/<abi>/libonnxruntime.so`.

- `SITEED_SHERPA_ONNX_ORT_LIB_DIR`
- `SITEED_SHERPA_ONNX_ORT_INCLUDE_DIR`
  Direct override for advanced use. Use these when `SITEED_SHERPA_ONNX_ORT_ROOT`
  is not enough.

Typical rebuild:

```bash
SITEED_SHERPA_ONNX_ORT_VERSION=1.23.0 \
yarn workspace @siteed/sherpa-onnx.rn build:android
```

Using a pre-extracted ORT bundle:

```bash
SITEED_SHERPA_ONNX_ORT_ROOT=/abs/path/to/onnxruntime-android-1.23.0 \
yarn workspace @siteed/sherpa-onnx.rn build:android
```

Optional install-time rebuild:

```bash
SITEED_SHERPA_ONNX_REBUILD_ANDROID=1 \
SITEED_SHERPA_ONNX_ORT_VERSION=1.23.0 \
yarn install
```

Sherpa writes build metadata to:

```text
packages/sherpa-onnx.rn/prebuilt/android/build-metadata.json
```

## Moonshine Override

Moonshine does not currently rebuild from source in this repo. Instead, the
Android wrapper now supports replacing the upstream native artifact.

Supported inputs:

- `SITEED_MOONSHINE_ANDROID_MAVEN_COORD`
  Override the Maven coordinate.

- `SITEED_MOONSHINE_ANDROID_MAVEN_REPO`
  Add a custom Maven repository for the override coordinate.

- `SITEED_MOONSHINE_ANDROID_AAR`
  Point directly to a local `.aar` file.

Recommended path:

- publish a rebuilt Moonshine artifact to a local or internal Maven repo
- point the wrapper at that repo and coordinate

Example:

```bash
SITEED_MOONSHINE_ANDROID_MAVEN_REPO=/abs/path/to/local-maven \
SITEED_MOONSHINE_ANDROID_MAVEN_COORD=ai.moonshine:moonshine-voice:0.0.51-ort1232 \
yarn workspace @siteed/sherpa-voice android
```

Direct AAR override:

```bash
SITEED_MOONSHINE_ANDROID_AAR=/abs/path/to/moonshine-voice-0.0.51-ort1232.aar \
yarn workspace @siteed/sherpa-voice android
```

Use the AAR path only when necessary. A Maven repo is cleaner because it keeps
artifact coordinates and dependency metadata explicit.

## Compatibility Check

Before building a mixed-engine Android app, run:

```bash
yarn android:ort:check
```

or from the app:

```bash
yarn workspace @siteed/sherpa-voice android:ort:check
```

For Expo apps that install both packages, add the Sherpa config plugin so
prebuild injects `android.packagingOptions.pickFirsts=**/libonnxruntime.so`:

```json
{
  "expo": {
    "plugins": ["@siteed/sherpa-onnx.rn"]
  }
}
```

That packaging rule is only safe after ABI alignment is complete; it tells Gradle
which duplicate `libonnxruntime.so` to keep once both engines are shipping the
same SONAME and symbol version.

The checker inspects:

- Sherpa JNI imported ORT symbol version
- Sherpa packaged `libonnxruntime.so` exported symbol version
- Moonshine `libmoonshine.so` imported ORT symbol version

It exits non-zero if the versions do not match.

ORT alignment is necessary, but not sufficient. If Sherpa JNI is refreshed,
the Android Kotlin bindings in
`packages/sherpa-onnx.rn/android/src/main/kotlin/com/k2fsa/sherpa/onnx/`
must stay in sync with the refreshed JNI. This repo now handles that through
`packages/sherpa-onnx.rn/android/scripts/sync-kotlin-api.sh`, which copies the
vendored upstream Kotlin API files into the shipped Android wrapper and reapplies
the tracked repo overrides from
`packages/sherpa-onnx.rn/patches/KotlinApiOverrides.patch`.

## Practical Workflow

1. Pick the ORT ABI version you want both engines to use.
2. Rebuild Sherpa with `SITEED_SHERPA_ONNX_ORT_VERSION` or `SITEED_SHERPA_ONNX_ORT_ROOT`.
3. Produce or obtain a Moonshine artifact built against that same ORT ABI.
4. Point `@siteed/moonshine.rn` at the custom artifact.
5. Run `yarn android:ort:check`.
6. Sync the refreshed Sherpa Android bindings:

```bash
bash packages/sherpa-onnx.rn/android/scripts/sync-kotlin-api.sh
```

7. Build the app.
8. Run the mixed-engine device recipe:

```bash
bash apps/sherpa-voice/scripts/agentic/validate-recipe.sh \
  scripts/agentic/teams/sherpa/recipes/asr-benchmark-mixed-engine-validation.json \
  --device "Pixel 6a - 16 - API 36"
```

That recipe proves the actual product condition we care about: Moonshine and
Sherpa both complete sample benchmarks in the same app session on a real device.
