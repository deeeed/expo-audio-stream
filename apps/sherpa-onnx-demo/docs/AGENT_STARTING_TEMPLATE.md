# Agentic Validation — sherpa-onnx-demo

Step-by-step workflow for using the CDP bridge to validate native sherpa-onnx features on-device.

## Prerequisites

- Metro running on port 7500: `yarn start` in `apps/sherpa-onnx-demo`
- App installed and connected (Android via USB + ADB, or iOS simulator booted)
- At least one sherpa-onnx model downloaded in the app

## Step 1: Verify Device Connection

```bash
cd apps/sherpa-onnx-demo
node scripts/agentic/cdp-bridge.mjs list-devices
```

Expected output: list of connected devices with `wsUrl` and `platform`.

## Step 2: Check App State

```bash
scripts/agentic/app-state.sh route     # Current screen
scripts/agentic/app-state.sh state     # Model / route state
```

## Step 3: Test Native Module — System Info

```bash
scripts/agentic/app-state.sh eval "__AGENTIC__.testSystemInfo()"
sleep 3
scripts/agentic/app-state.sh eval "__AGENTIC__.getLastResult()"
```

Expected: `{ op: 'systemInfo', status: 'success', result: { architecture: {...}, memory: {...}, ... } }`

## Step 4: Validate Library Load

```bash
scripts/agentic/app-state.sh eval "__AGENTIC__.testValidateLib()"
sleep 2
scripts/agentic/app-state.sh eval "__AGENTIC__.getLastResult()"
```

Expected: `{ op: 'validateLib', status: 'success', result: { loaded: true, status: '...' } }`

## Step 5: Test TTS (requires TTS model loaded in app)

```bash
# First navigate to TTS feature screen and load a model via the UI
scripts/agentic/app-navigate.sh "/feature/tts"

# Then test generation
scripts/agentic/app-state.sh eval "__AGENTIC__.testTTS('Hello from the agentic bridge.')"
sleep 5
scripts/agentic/app-state.sh eval "__AGENTIC__.getLastResult()"
```

Expected: `{ op: 'tts', status: 'success', result: { filePath: '...', success: true, ... } }`

## Step 6: Take a Screenshot

```bash
scripts/agentic/screenshot.sh tts-test
```

## Step 7: Check Native Logs

```bash
scripts/agentic/native-logs.sh android        # Android (dump)
scripts/agentic/native-logs.sh android follow  # Android (follow)
scripts/agentic/native-logs.sh ios             # iOS simulator
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `WATCHER_PORT` | 7500 | Metro / CDP websocket port |
| `ANDROID_DEVICE` | (none) | ADB serial for target Android device |
| `IOS_SIMULATOR` | (booted) | iOS simulator name |

## Troubleshooting

**No devices found**: Make sure Metro is running on port 7500 (`yarn start`) and the dev client is open.

**`__AGENTIC__` not found**: Ensure the app is running in dev mode (`__DEV__ === true`). Check that `_layout.tsx` imports `agentic-bridge`.

**TTS/ASR fails with "not initialized"**: Load a model in the app UI first before running test commands.

**Android connectivity**: If using physical device, run `adb reverse tcp:7500 tcp:7500` after connecting.
