# Agentic Feedback Loops

Closed-loop system for AI agents to develop, navigate, inspect, record, screenshot, and validate the Expo Audio Studio app across **Android, iOS, and Web** — without human intervention.

All commands run from `apps/playground/`.

## How It Works

Every platform exposes `globalThis.__AGENTIC__` in dev mode with the same API:

```
.navigate(path)          → push route
.getRoute()              → { pathname, segments }
.getState()              → { isRecording, isPaused, durationMs, size, analysisData, compression }
.canGoBack()             → boolean
.goBack()                → true
.startRecording(config)  → StartRecordingResult | { error }
.stopRecording()         → AudioRecording | null | { error }
.pauseRecording()        → true | { error }
.resumeRecording()       → true | { error }
```

**All platforms:** `cdp-bridge.mjs` is the single entry point. It discovers native (Android/iOS) targets via Metro's `/json/list` and web (Chrome) targets via Chrome's `--remote-debugging-port` (connection info from `.agent/web-browser.json`). `web-browser.mjs` is only used for browser lifecycle (`launch`, `close`, `logs`).

## Platform Setup

### Android
```bash
adb devices                    # Must show a "device" line
```

### iOS
```bash
xcrun simctl boot "iPhone 16 Pro Max"
```

### Web
```bash
yarn playwright install chromium   # First time only
```

### All platforms
```bash
scripts/agentic/start-metro.sh    # Start Metro on :7365 (auto-detects if running)
```

## Feedback Loop Commands

### Navigate
```bash
# All platforms (auto-discovers connected devices)
scripts/agentic/app-navigate.sh "/(tabs)/record"
scripts/agentic/app-navigate.sh --screenshot "/(tabs)/files"

# Target a specific device
scripts/agentic/app-navigate.sh --device "Pixel 6a" "/(tabs)/record"
scripts/agentic/app-navigate.sh --device "web" "/(tabs)/record"
```

### Query State
```bash
# All platforms
scripts/agentic/app-state.sh route
scripts/agentic/app-state.sh state

# Target a specific device
scripts/agentic/app-state.sh --device "iPhone" state
scripts/agentic/app-state.sh --device "web" state
```

### Screenshot
```bash
scripts/agentic/screenshot.sh my-label                    # All connected devices
scripts/agentic/screenshot.sh --device "Pixel 6a" my-label  # Specific device
scripts/agentic/screenshot.sh --device "web" my-label       # Web only
```

Output: JSON with `{ screenshot: "<absolute-path>", deviceName, platform }`

### Reload After Code Change
```bash
scripts/agentic/reload-metro.sh    # Hot-reload all connected clients
```

### Native Logs (Kotlin/Swift)
```bash
# Android: dump recent native logs (filtered by ExpoAudioStudio tags)
scripts/agentic/native-logs.sh android

# Android: last 50 lines only
scripts/agentic/native-logs.sh android 50

# Android: follow in real-time (Ctrl+C to stop)
scripts/agentic/native-logs.sh android follow

# Android: clear logcat buffer (useful before a test run)
scripts/agentic/native-logs.sh android clear

# iOS: stream simulator logs for 5 seconds
scripts/agentic/native-logs.sh ios

# iOS: last 30 lines
scripts/agentic/native-logs.sh ios 30
```

Filter tags:
- **Android**: `ExpoAudioStudio` (LogUtils), `ExpoAudioStream` (Constants.TAG), `AudioTrimmer`, `AudioDeviceManager`
- **iOS**: `[ExpoAudioStudio:ClassName]` format from `Logger.swift`

Use native logs to debug crashes, native module errors, and audio pipeline issues that don't surface in JS.

### Eval Arbitrary JS
```bash
scripts/agentic/app-state.sh eval "document.title"
scripts/agentic/app-state.sh --device "web" eval "document.title"
```

## Recording Control via CDP

Agents can start/stop recordings entirely through the CDP bridge — no Detox needed for dev-session validation.

### Design

- **No callbacks in config**: `onAudioStream` and `onAudioAnalysis` are function callbacks that cannot be serialized over CDP. The bridge silently strips any function properties from the config object. Agents poll `getState()` to track recording progress.
- **Config is a JSON-serializable subset of `RecordingConfig`**: only primitive/object values (sampleRate, channels, encoding, output, etc.).
- **Error handling**: all methods return `{ error: string }` on failure.

### Workflow

```bash
# Start recording (config is JSON-serializable subset of RecordingConfig)
scripts/agentic/app-state.sh eval "__AGENTIC__.startRecording({ sampleRate: 44100, channels: 1 })"

# Poll state during recording
scripts/agentic/app-state.sh state
# → { isRecording: true, durationMs: 1234, size: 56789, ... }

# Pause / resume
scripts/agentic/app-state.sh eval "__AGENTIC__.pauseRecording()"
scripts/agentic/app-state.sh eval "__AGENTIC__.resumeRecording()"

# Stop recording and get result
scripts/agentic/app-state.sh eval "__AGENTIC__.stopRecording()"
# → { fileUri: "...", durationMs: 5000, size: 220500, mimeType: "audio/wav", ... }

# Verify final state
scripts/agentic/app-state.sh state
# → { isRecording: false, ... }
```

### Web equivalent

```bash
# Same commands — just target the web device
scripts/agentic/app-state.sh --device "web" eval "__AGENTIC__.startRecording({ sampleRate: 44100, channels: 1 })"
scripts/agentic/app-state.sh --device "web" state
scripts/agentic/app-state.sh --device "web" eval "__AGENTIC__.stopRecording()"
```

### Config examples

```js
// Basic recording
{ sampleRate: 44100, channels: 1 }

// Compressed output
{ sampleRate: 44100, channels: 1, output: { compressed: { enabled: true, format: 'aac' } } }

// High-frequency analysis
{ sampleRate: 48000, intervalAnalysis: 25, interval: 10 }

// Stereo
{ sampleRate: 44100, channels: 2 }
```

## Web-Specific: Browser Lifecycle

`web-browser.mjs` manages browser lifecycle only. Once launched, all commands go through `cdp-bridge.mjs` (which auto-discovers the web target).

```bash
# Launch browser (opens visible Chrome window, stays running)
node scripts/agentic/web-browser.mjs launch &

# All commands go through the unified cdp-bridge.mjs
scripts/agentic/app-state.sh --device "web" route
scripts/agentic/app-navigate.sh --device "web" "/(tabs)/files"
scripts/agentic/screenshot.sh --device "web" my-label

# web-browser.mjs still handles lifecycle + logs
node scripts/agentic/web-browser.mjs logs           # Console log capture
node scripts/agentic/web-browser.mjs close           # Shutdown browser
```

Env: `WEB_HEADLESS=true` for CI, `CDP_PORT=9222` (default).

Console logs are captured to `.agent/web-console.log` (all `console.*` + uncaught errors).

## E2E Tests (CI Use)

Detox and Playwright E2E tests exist for CI pipelines. They are not required for agent dev-loop validation but can be run when needed:

```bash
# Detox (requires app build)
yarn e2e:android:agent-validation
yarn e2e:ios:agent-validation

# Playwright (no build needed, just Metro)
yarn playwright test e2e-web/agent-validation-web.spec.ts
```

### Validation Features

| Feature | Description | Config |
|---------|-------------|--------|
| `basic` | Standard recording workflow | `{ sampleRate: 44100, channels: 1 }` |
| `compression` | Compressed audio output | `{ sampleRate: 44100, channels: 1, output: { compressed: { enabled: true, format: 'aac' } } }` |
| `high-frequency` | High-frequency dual timing | `{ sampleRate: 48000, intervalAnalysis: 25, interval: 10 }` |
| `multi-channel` | Stereo recording | `{ sampleRate: 44100, channels: 2 }` |
| `pause-resume` | Pause/resume workflow | Start → pause → resume → stop via CDP |
| `error-handling` | Error scenarios | `{ sampleRate: 999999 }` |

## Development Iteration Loop

```
 Edit code
     |
     v
 reload-metro.sh              <- hot-reload
     |
     v
 app-state.sh route           <- verify screen
     |
     v
 app-navigate.sh /path        <- go to target
     |
     v
 app-state.sh state           <- check app state
     |
     v
 screenshot.sh label          <- visual verification
     |
     v
 native-logs.sh android/ios   <- check native logs (if needed)
     |
     v
 Iterate or run E2E
```

## Available Routes

| Route | Description |
|-------|-------------|
| `/(tabs)/record` | Record (default) |
| `/(tabs)/import` | Import audio files |
| `/(tabs)/transcription` | Speech-to-text |
| `/(tabs)/files` | Recorded files |
| `/(tabs)/more` | Settings & options |
| `/(tabs)/agent-validation` | Agent test page |
| `/minimal` | Minimal recording |
| `/trim` | Audio trimmer |
| `/decibel` | Decibel meter |
| `/permissions` | Permissions |
| `/audio-device-test` | Device testing |

## Environment Variables

| Variable | Default | Scope |
|----------|---------|-------|
| `WATCHER_PORT` | `7365` | All (Metro port) |
| `CDP_TIMEOUT` | `5000` | CDP bridge connection timeout |
| `WEB_HEADLESS` | `false` | Web browser launch mode |
| `CDP_PORT` | `9222` | Web browser CDP port |

## Architecture

```
+--------------------------------------------------+
|  AI Agent                                        |
|                                                  |
|  app-navigate.sh / app-state.sh / screenshot.sh  |
|                      |                           |
|                      v                           |
|               cdp-bridge.mjs                     |
|          (unified CDP entry point)               |
|              /            \                      |
+-------------/--------------\---------------------+
             /                \
            v                  v
       Metro :7365        Chrome :9222
       /json/list         /json/list
            |                  |
            v                  v
    Hermes Runtime      Browser JS Runtime
    (Android/iOS)            (Web)
            |                  |
            +--------+---------+
                     v
           globalThis.__AGENTIC__
           (navigate, getRoute, getState, goBack,
            startRecording, stopRecording, ...)
                     ^
                     |
           AgenticBridgeSync (React)
           syncs route + audio state + recorder

   web-browser.mjs → browser lifecycle only (launch/close/logs)
```

## Agent Rules

### Required for All Work
- Validate features via CDP bridge or shell utility scripts
- Test on at least one platform
- Fix issues immediately when found
- Include actual command output in responses
- Never skip validation and claim work is complete
- Never simulate test results instead of running real tests

### Never Do
- Skip development validation
- Simulate test results
- Commit development screenshots
- Bypass validation for any changes

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot reach Metro` | `scripts/agentic/start-metro.sh` |
| `No debug targets` | App not running on device/simulator |
| `__AGENTIC__ undefined` | Not in dev mode, or bridge not loaded in `_layout.tsx` |
| `No booted iOS simulator` | `xcrun simctl boot "iPhone 16 Pro Max"` |
| `No Android device` | `adb devices` -- connect USB or start emulator |
| `Playwright not installed` | `yarn playwright install chromium` |
| Browser crash (non-headless) | Uses system Chrome -- verify Chrome is installed |
| Web route not updating | Wait for `AgenticBridgeSync` render cycle (~1s after navigate) |
| Wrong native target selected | Use `--device <name>` flag to target specific device |
| `Recorder not available` | `AgenticBridgeSync` not mounted -- ensure app is on a screen with the provider |
| Recording config error | Check config is JSON-serializable (no function callbacks) |
| Native crash / Kotlin type error | `scripts/agentic/native-logs.sh android` — check for serialization errors |
| No Android targets in `/json/list` | CDP bridge retries up to 5 times; ensure app is running and connected to Metro |
| Web not discovered | Ensure browser was launched with `web-browser.mjs launch` and `.agent/web-browser.mjson` exists |
