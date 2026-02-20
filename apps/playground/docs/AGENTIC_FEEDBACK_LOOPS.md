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

**Native (Android/iOS):** `cdp-bridge.js` connects to Hermes via Metro's `/json/list` WebSocket targets.
**Web:** `web-browser.js` launches Chromium and uses `page.evaluate()` via Playwright CDP.

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
# Native (auto-detects platform)
scripts/agentic/app-navigate.sh "/(tabs)/record"
scripts/agentic/app-navigate.sh --screenshot "/(tabs)/files"

# Web
PLATFORM=web scripts/agentic/app-navigate.sh "/(tabs)/record"
```

### Query State
```bash
# Native
scripts/agentic/app-state.sh route
scripts/agentic/app-state.sh state

# Web
PLATFORM=web scripts/agentic/app-state.sh route
PLATFORM=web scripts/agentic/app-state.sh state
```

### Screenshot
```bash
scripts/agentic/screenshot.sh my-label              # Auto-detect platform
scripts/agentic/screenshot.sh my-label android       # Explicit
scripts/agentic/screenshot.sh my-label ios
scripts/agentic/screenshot.sh my-label web
```

Output: absolute path to `.agent/screenshots/<timestamp>_<label>.png`

### Reload After Code Change
```bash
scripts/agentic/reload-metro.sh    # Hot-reload all connected clients
```

### Eval Arbitrary JS
```bash
# Native
scripts/agentic/app-state.sh eval "document.title"

# Web
PLATFORM=web scripts/agentic/app-state.sh eval "document.title"
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
node scripts/agentic/web-browser.js eval "__AGENTIC__.startRecording({ sampleRate: 44100, channels: 1 })"
node scripts/agentic/web-browser.js get-state
node scripts/agentic/web-browser.js eval "__AGENTIC__.stopRecording()"
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

The web bridge requires a controllable browser (regular Chrome tabs aren't accessible via CDP).

```bash
# Launch browser (opens visible Chrome window, stays running)
node scripts/agentic/web-browser.js launch &

# All commands connect to the running browser
node scripts/agentic/web-browser.js get-route
node scripts/agentic/web-browser.js navigate "/(tabs)/files"
node scripts/agentic/web-browser.js get-state
node scripts/agentic/web-browser.js screenshot "my-label"
node scripts/agentic/web-browser.js logs           # Console log capture
node scripts/agentic/web-browser.js eval "1+1"

# Done
node scripts/agentic/web-browser.js close
```

Env: `WEB_HEADLESS=true` for CI, `CDP_PORT=9222` (default).

Console logs are captured to `.agent/web-console.log` (all `console.*` + uncaught errors).

## Automated Validation (E2E)

One-command validation per platform:

```bash
# Android — Detox E2E (requires app build)
./scripts/agent.sh dev basic android

# iOS — Detox E2E (requires app build)
./scripts/agent.sh dev basic ios

# Web — Playwright E2E (no build needed, just Metro)
./scripts/agent.sh dev basic web
```

Run Playwright tests directly:
```bash
yarn playwright test e2e-web/agent-validation-web.spec.ts
```

### Validation Features

| Feature | Description | Deep Link Parameters |
|---------|-------------|---------------------|
| `basic` | Standard recording workflow | `sampleRate=44100&channels=1` |
| `compression` | Compressed audio output | `compressedOutput=true&compressedFormat=aac` |
| `high-frequency` | High-frequency dual timing measurement | `intervalAnalysis=25&interval=10&measurePrecision=true&sampleRate=48000` |
| `multi-channel` | Stereo recording | `channels=2&sampleRate=44100` |
| `pause-resume` | Pause/resume workflow | `testPauseResume=true` |
| `error-handling` | Error scenarios | `sampleRate=999999&testErrors=true` |

### Platform Options
- `android` (default) — Test on Android device/emulator
- `ios` — Test on iOS simulator (macOS only)
- `web` — Test in Chromium via Playwright
- `both` — Test on both native platforms sequentially

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
 Iterate or run E2E
```

## Log Management

### Development Validation Logs
**Location**: `apps/playground/logs/agent-validation/`
**Generated by**: `yarn agent:dev <feature> <platform>`
**Retention**: Automatically deleted on success, preserved on failure

Example: `logs/agent-validation/basic-android-20250607-182502.log`

### Full Validation Logs
**Location**: `apps/playground/logs/full-validation/`
**Generated by**: `yarn agent:full <platform>`

Example: `logs/full-validation/android-unit-tests-20250607-183045.log`

### Log Features
- Project-relative paths (no permission issues)
- Git-ignored (never committed)
- Specific test failures with line numbers and error messages
- Automatic cleanup on success, preserved on failure
- Manual cleanup: `yarn agent:cleanup`

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
| `WATCHER_PORT` | `7365` | All |
| `PLATFORM` | auto-detect | Native scripts |
| `CDP_TIMEOUT` | `5000` | Native CDP |
| `IOS_SIMULATOR` | -- | iOS target filter |
| `ANDROID_DEVICE` | -- | Android target filter |
| `WEB_HEADLESS` | `false` | Web browser |
| `CDP_PORT` | `9222` | Web browser CDP port |

## Architecture

```
+--------------------------------------------------+
|  AI Agent                                        |
|                                                  |
|  app-navigate.sh / app-state.sh / screenshot.sh  |
|       |                        |                 |
|       v                        v                 |
|  cdp-bridge.js           web-browser.js          |
|  (WebSocket CDP)         (Playwright CDP)        |
+-------+------------------------+-----------------+
        |                        |
        v                        v
   Metro :7365              Chromium :9222
   /json/list               connectOverCDP
        |                        |
        v                        v
   Hermes Runtime           Browser JS Runtime
        |                        |
        +------------+-----------+
                     v
           globalThis.__AGENTIC__
           (navigate, getRoute, getState, goBack,
            startRecording, stopRecording, ...)
                     ^
                     |
           AgenticBridgeSync (React)
           syncs route + audio state + recorder
```

## Agent Rules

### Required for All Work
- Always validate features with `yarn agent:dev` or the CDP bridge
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
| Wrong native target selected | Set `IOS_SIMULATOR` or `ANDROID_DEVICE` env var |
| `Recorder not available` | `AgenticBridgeSync` not mounted -- ensure app is on a screen with the provider |
| Recording config error | Check config is JSON-serializable (no function callbacks) |
