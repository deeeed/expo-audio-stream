# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**expo-audio-stream** is a comprehensive audio processing monorepo for React Native and Expo applications. It provides real-time audio recording, analysis, visualization, and AI-powered processing capabilities across iOS, Android, and web platforms.

### Core Packages
- **`@siteed/expo-audio-studio`** - Main audio processing library with dual-stream recording, device management, and format conversion
- **`@siteed/expo-audio-ui`** - React Native Skia-based audio visualization components (waveforms, spectrograms)
- **`@siteed/react-native-essentia`** - Advanced audio analysis using Essentia (feature extraction, classification)
- **`@siteed/sherpa-onnx.rn`** - Speech-to-text and text-to-speech capabilities (development)

### Applications
- **`apps/playground`** - Full-featured demo app showcasing all capabilities
- **`apps/minimal`** - Simple integration example
- **`apps/essentia-demo`** - Audio analysis demonstrations

## Agent Constraints
1. **NEVER IMPLEMENT UNLESS ASKED** - No unsolicited changes
2. **ALWAYS VERIFY IN SOURCE CODE** - No hallucinations accepted
3. **MINIMIZE DIFF** - Smallest possible changes
4. **NO WORKAROUNDS** - Fix root causes, not symptoms
5. **REAL TESTING ONLY** - No simulated results accepted

## Essential Commands

```bash
yarn install                    # Install dependencies
./scripts/setup-lfs.sh         # Setup Git LFS for models
cd apps/playground && yarn build:deps && yarn start  # Run playground app

# Building packages
yarn workspace @siteed/expo-audio-studio build
yarn workspace @siteed/expo-audio-ui build
```

## Agentic Validation (CDP Bridge)

All agent commands run from `apps/playground/`. See `apps/playground/docs/AGENT_STARTING_TEMPLATE.md` for the step-by-step workflow.

```bash
node scripts/agentic/cdp-bridge.mjs list-devices     # List connected devices
scripts/agentic/app-navigate.sh "/(tabs)/record"      # Navigate
scripts/agentic/app-state.sh state                    # Query state
scripts/agentic/app-state.sh eval "__AGENTIC__.startRecording({ sampleRate: 44100, channels: 1 })"
scripts/agentic/screenshot.sh my-label                # Screenshot
scripts/agentic/reload-metro.sh                       # Hot reload after edits
scripts/agentic/native-logs.sh android|ios            # Kotlin/Swift logs
scripts/agentic/start-metro.sh                        # Start Metro (:7365)
```

All scripts accept `--device <name>` for multi-device targeting.

## Important Notes

- Always run `yarn build:deps` in playground before development
- Git LFS setup required for ONNX models
- Native changes require pod install (iOS) or gradle sync (Android)
- Background recording requires special permissions configuration
- **VPN Interference**: Disconnect VPNs during iOS E2E tests; Android uses ADB port forwarding (VPN-resistant)

## iOS Simulator

Standard: **iPhone 16 Pro Max** — use `yarn setup:ios-simulator` for consistent setup.

- ❌ Change simulator without updating `.detoxrc.js`, `scripts/setup-simulators.sh`, `scripts/generate-screenshots.sh`

## Rules

**Device targeting**
- ❌ Use `IOS_SIMULATOR` or `ANDROID_DEVICE` env vars (removed)
- ✅ Use `--device <name>` flag when multiple devices are connected
- ❌ Silently fall through to a different platform when a device filter fails — fail loudly

**CDP bridge**
- ❌ Break `__AGENTIC__` API without updating all callers
- ✅ Validate all features via CDP bridge before claiming completion

**Cross-platform**
- ❌ Assume iOS and Android will behave identically — handle platform-specific timing
- ✅ Test on BOTH platforms for any UI or navigation changes

**Protected files — never modify without extreme caution:**
- `apps/playground/scripts/agentic/cdp-bridge.mjs` — unified CDP bridge
- `apps/playground/scripts/agentic/web-browser.mjs` — web browser lifecycle
- `apps/playground/.detoxrc.js` — device configs
- `/index.js` (monorepo root) — Storybook module resolution
- Before touching any: verify CDP bridge still works (`app-state.sh state`)

**Native modules**
- ❌ Pass `logger`, `ArrayBuffer`, functions, or class instances to Expo native modules — causes `"Cannot convert '[object Object]' to a Kotlin type"` on Android
- ✅ Only pass plain objects with primitive values, arrays, and nested plain objects
- ✅ Use `native-logs.sh android|ios` to check native-side errors on any native crash

**Android ADB port mapping** (Metro runs on :7365, not :8081)
- ❌ `adb reverse tcp:8081 tcp:7365` — conflicts with other RN apps
- ✅ `adb reverse tcp:7365 tcp:7365`
- ✅ Plain `adb shell am start <package>/.MainActivity` to relaunch after force-stop

**Builds / type-checking**
- ✅ `yarn workspace <pkg> build` (~1.5s) for single-package changes
- ❌ Full monorepo `tsc --noEmit` for single-file changes — floods output with unrelated errors

## Documentation

- **Agentic workflow**: `apps/playground/docs/AGENT_STARTING_TEMPLATE.md`
- **CDP bridge details**: `apps/playground/docs/AGENTIC_FEEDBACK_LOOPS.md`
- **Testing strategy**: `packages/expo-audio-studio/docs/TESTING_STRATEGY.md`
