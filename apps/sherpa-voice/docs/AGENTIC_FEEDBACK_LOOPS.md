# Agentic Feedback Loops — sherpa-voice Quick Reference

## Port

Metro / CDP bridge: **7500** (`WATCHER_PORT=7500`)

## Commands

```bash
# List connected devices
node scripts/agentic/cdp-bridge.mjs list-devices

# Query state
scripts/agentic/app-state.sh route
scripts/agentic/app-state.sh state
scripts/agentic/app-state.sh eval "<JS expression>"

# Navigate
scripts/agentic/app-navigate.sh "/(tabs)/home"
scripts/agentic/app-navigate.sh "/(tabs)/features"
scripts/agentic/app-navigate.sh "/(tabs)/features/asr-benchmark"
scripts/agentic/app-navigate.sh "/(tabs)/models"
scripts/agentic/app-navigate.sh "/feature/tts"
scripts/agentic/app-navigate.sh "/feature/asr"
scripts/agentic/app-navigate.sh "/feature/audio-tagging"
scripts/agentic/app-navigate.sh "/feature/speaker-id"
scripts/agentic/app-navigate.sh "/feature/kws"

# Screenshot
scripts/agentic/screenshot.sh my-label

# Recipes
bash scripts/agentic/validate-recipe.sh scripts/agentic/teams/sherpa/recipes/asr-screen-validation.json
bash scripts/agentic/validate-recipe.sh scripts/agentic/teams/sherpa/recipes/asr-benchmark-screen-validation.json
yarn recipe:asr-benchmark
bash scripts/agentic/validate-flow-schema.sh
bash scripts/agentic/validate-pre-conditions.sh

# Native logs
scripts/agentic/native-logs.sh android
scripts/agentic/native-logs.sh android follow
scripts/agentic/native-logs.sh ios
```

## __AGENTIC__ API

```js
__AGENTIC__.platform                    // 'android' | 'ios' | 'web'
__AGENTIC__.navigate(path)              // Navigate to route
__AGENTIC__.getRoute()                  // { pathname, segments }
__AGENTIC__.getState()                  // { pathname }
__AGENTIC__.getLastResult()             // { op, status, result?, error? }

// Fire-and-store test methods (CDP awaitPromise:false)
__AGENTIC__.testSystemInfo()            // Call getSystemInfo()
__AGENTIC__.testValidateLib()           // Call validateLibraryLoaded()
__AGENTIC__.testTTS(text?)              // Call generateTts() (model must be loaded)
__AGENTIC__.testASR(filePath)           // Call recognizeFromFile(filePath)
__AGENTIC__.testAudioTagging(filePath)  // Call processAndComputeAudioTagging(filePath)
```

## Fire-and-Store Pattern

Because `cdp-bridge.mjs` uses `awaitPromise: false`, async results are stored in `_lastAsyncResult` and polled:

```bash
scripts/agentic/app-state.sh eval "__AGENTIC__.testSystemInfo()"
# Returns: { op: 'systemInfo', status: 'pending' }
sleep 3
scripts/agentic/app-state.sh eval "__AGENTIC__.getLastResult()"
# Returns: { op: 'systemInfo', status: 'success', result: {...} }
```

## Log Filter Tags

**Android**: `SherpaOnnx|SherpaOnnxModule|SherpaOnnxTts|SherpaOnnxAsr|net.siteed.sherpaonnx`

**iOS**: `eventMessage CONTAINS "SherpaOnnx" OR eventMessage CONTAINS "sherpa-onnx"`

## Multi-Device

Pass `--device <name>` to target a specific device:

```bash
scripts/agentic/app-state.sh --device "Pixel 6a" route
scripts/agentic/native-logs.sh --device "Pixel 6a" android
```
