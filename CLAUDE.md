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
- **`apps/playground`** - Full-featured demo app showcasing all capabilities (102 E2E tests)
- **`apps/minimal`** - Simple integration example
- **`apps/essentia-demo`** - Audio analysis demonstrations

## Agentic Framework Requirements

**10x Engineering with Automated Feedback Loops**: This repository implements a proven agentic framework for fast, reliable development.

### Core Philosophy
- **Build automated feedback loops** - the absolute key to unlock automated improvements
- **Quality over speed** - Protect your team from AI mistakes  
- **Real testing over mocked** - Validate actual functionality works
- **Fast iteration** - < 2 minutes to prove features work

### Agent Validation System

Agents validate features directly via the CDP bridge — no wrapper scripts needed.

#### CDP Bridge (Unified Entry Point)
One bridge covers all platforms:
- `node scripts/agentic/cdp-bridge.mjs [--device <name>] <command>` — discovers native (Android/iOS) via Metro and web (Chrome) via `--remote-debugging-port`
- `node scripts/agentic/web-browser.mjs launch|close|logs` — browser lifecycle only

Device targeting: with 1 device connected, auto-selects (no flag needed). With 2+ devices, use `--device <name>` (case-insensitive substring match) to pick one.

#### Shell Utility Scripts (Convenience Wrappers)
All scripts support `--device <name>` for multi-device targeting:
```bash
scripts/agentic/app-navigate.sh "/(tabs)/record"                   # Navigate
scripts/agentic/app-navigate.sh --device "Pixel 6a" "/(tabs)/record"  # Target specific device
scripts/agentic/app-state.sh state                                 # Query state
scripts/agentic/app-state.sh --device "iPhone" state               # Target specific device
scripts/agentic/screenshot.sh my-label                             # Screenshot
scripts/agentic/screenshot.sh --device "Pixel 6a" my-label android # Target specific device
scripts/agentic/reload-metro.sh                                    # Hot reload (alias for device-cmd.sh reload)
scripts/agentic/reload-metro.sh --device "iPhone"                  # Reload specific device
scripts/agentic/device-cmd.sh reload                               # Reload JS bundle
scripts/agentic/device-cmd.sh debug                                # Open React Native debugger
scripts/agentic/device-cmd.sh dev-menu                             # Open dev menu
scripts/agentic/device-cmd.sh --device "Pixel 6a" reload           # Target specific device
scripts/agentic/start-metro.sh                                     # Start Metro
scripts/agentic/native-logs.sh android                             # Native Kotlin logs
scripts/agentic/native-logs.sh ios                                 # Native Swift logs

# List all connected agentic devices
node scripts/agentic/cdp-bridge.mjs list-devices
```

#### E2E Tests (CI Use, Optional)
```bash
yarn e2e:android:agent-validation    # Detox
yarn e2e:ios:agent-validation        # Detox
yarn playwright test                 # Playwright
```

### Agent Constraints (Prevent Costly Mistakes)
1. **NEVER IMPLEMENT UNLESS ASKED** - No unsolicited changes
2. **ALWAYS VERIFY IN SOURCE CODE** - No hallucinations accepted
3. **MINIMIZE DIFF** - Smallest possible changes
4. **NO WORKAROUNDS** - Fix root causes, not symptoms
5. **REAL TESTING ONLY** - No simulated results accepted

### Quick Commands
```bash
cd apps/playground

# Start Metro
scripts/agentic/start-metro.sh

# List connected devices (useful when multiple devices connected)
node scripts/agentic/cdp-bridge.mjs list-devices

# Navigate and inspect (auto-selects when 1 device connected)
scripts/agentic/app-navigate.sh "/(tabs)/record"
scripts/agentic/app-state.sh state
scripts/agentic/screenshot.sh my-label

# Target specific device when multiple are connected
scripts/agentic/app-state.sh --device "Pixel 6a" state
scripts/agentic/app-navigate.sh --device "Pixel 6a" "/(tabs)/record"

# Validate recording via CDP
scripts/agentic/app-state.sh eval "__AGENTIC__.startRecording({ sampleRate: 44100, channels: 1 })"
scripts/agentic/app-state.sh state
scripts/agentic/app-state.sh eval "__AGENTIC__.stopRecording()"
```

### Device Setup (Required for Validation)

```bash
# Android: Connect device or start emulator
adb devices                     # Check connected devices

# iOS (macOS only): Boot simulator
xcrun simctl boot "iPhone 16 Pro Max"
yarn setup:ios-simulator       # Auto-setup iOS simulator

# Web: Install Playwright
yarn playwright install chromium
```

### Success Criteria
- CDP bridge validation passes in < 2 minutes
- Feature functionality confirmed working on real device
- Include actual command output in response
- Real device/simulator testing completed

**📖 Complete Workflow**: See `apps/playground/docs/AGENTIC_FEEDBACK_LOOPS.md` for detailed usage, log management, and troubleshooting

## Essential Commands

### Quick Start
```bash
yarn install                    # Install dependencies
./scripts/setup-lfs.sh         # Setup Git LFS for models
cd apps/playground && yarn build:deps && yarn start  # Run playground app
```

### Development
```bash
# Building packages
yarn workspace @siteed/expo-audio-studio build
yarn workspace @siteed/expo-audio-ui build

# Testing
cd packages/expo-audio-studio
yarn test:android               # Android tests (36/36) 
yarn test:ios                   # iOS compilation check

# E2E Testing
cd apps/playground
yarn e2e:android:record         # Recording workflow
yarn e2e:android:import         # Import workflow
yarn e2e:android:screenshots    # Visual validation

# Storybook Development
yarn storybook                  # Native Storybook (metro bundler)
yarn storybook:ios              # iOS native Storybook
yarn storybook:android          # Android native Storybook
yarn storybook:web              # Web Storybook (vite bundler)
yarn e2e:android:storybook      # Storybook E2E validation (Android)
yarn e2e:ios:storybook          # Storybook E2E validation (iOS)
```

## Current Branch Context

You are working on the `main` branch which includes the newly implemented agentic framework validation system and React Native Storybook v8/v9 setup.

### Key Features
- **Agentic validation tab** (DEV_ONLY) in playground app with 102 comprehensive tests
- **React Native Storybook v9** for native mobile (iOS/Android) development
- **Web Storybook v8** for browser-based component development 
- **Detox E2E integration** for Storybook validation with screenshot capture
- **Cross-platform validation** requirements with real device testing enforcement
- **Dual Storybook environments** supporting both native and web development workflows

### Storybook Documentation
- **📖 Complete Guide**: `docs/STORYBOOK.md` - Architecture, commands, validation workflow
- **📖 Migration Guide**: `docs/STORYBOOK_MIGRATION_GUIDE.md` - Step-by-step component migration

## Important Notes

- Always run `yarn build:deps` in playground before development
- Git LFS setup required for ONNX models
- Native changes require pod install (iOS) or gradle sync (Android)
- Use absolute paths in test scripts
- Background recording requires special permissions configuration
- **VPN Interference**: Disconnect VPNs during iOS E2E tests; Android uses ADB port forwarding (VPN-resistant)
- **Storybook Dual Setup**: Native (v9) uses Metro bundler; Web (v8) uses Vite bundler for React Native Web compatibility
- **Story Sources**: Stories include playground app components and expo-audio-ui package components (AudioVisualizer, Waveform, etc.)

## iOS Simulator Configuration

### Default Simulator Setup
The agentic framework uses **iPhone 16 Pro Max** as the standard iOS simulator for consistency across all tests and validations.

### Simulator Selection Commands
```bash
# List all available simulators
xcrun simctl list devices

# Check currently booted simulators  
xcrun simctl list devices | grep Booted

# Boot specific simulator (iPhone 16 Pro Max)
xcrun simctl boot "iPhone 16 Pro Max"

# Shutdown specific simulator
xcrun simctl shutdown "iPhone 15 Pro"

# Auto-setup standard simulator for agents
yarn setup:ios-simulator
```

### Detox Configuration
Simulator selection is controlled in `.detoxrc.js`:
- **Primary**: `ios.sim.debug` → iPhone 16 Pro Max
- **Alternative**: `ios.iPadPro.debug` → iPad Pro 13-inch (M4)

### Agent Commands with Simulator Support
```bash
# Setup standard simulator
yarn setup:ios-simulator

# List connected devices
node scripts/agentic/cdp-bridge.mjs list-devices

# CDP bridge validation (auto-selects single device)
scripts/agentic/app-navigate.sh "/(tabs)/record"
scripts/agentic/app-state.sh state
scripts/agentic/screenshot.sh my-label ios

# Target specific device when multiple connected
scripts/agentic/app-state.sh --device "iPhone" state
scripts/agentic/screenshot.sh --device "iPhone" my-label ios

# E2E testing with different simulators
yarn detox test -c ios.sim.debug -o e2e/agent-validation.test.ts
yarn detox test -c ios.iPadPro.debug -o e2e/record.test.ts
```

### Troubleshooting Multiple Simulators
If multiple simulators are running:
1. **Identify target**: Detox will use the first matching device type
2. **Explicit shutdown**: Close unwanted simulators for consistency  
3. **Check logs**: Detox output shows which simulator was selected

### Consistency Notes
- All screenshot scripts use iPhone 16 Pro Max (6.9" display)
- App Store preparation uses same simulator
- Agent validation maintains cross-platform consistency

### Key Benefits of Agentic Framework

- **10x Productivity**: Automated feedback loops unlock massive productivity gains
- **Fast Development**: < 2 minutes to prove functionality works on real devices
- **Quality Assurance**: Real device testing prevents regressions reaching team
- **Feature-Focused**: Tests only what's relevant, no test maintenance overhead
- **Simple Workflow**: Single command validation replaces complex test setups
- **Scalable**: From development iteration to comprehensive CI validation

## AI Agent Memory & Learning

### 🧠 Quick Reference for Future AI Agents

**BEFORE making ANY changes, ask yourself:**
1. "Does this already exist?" → Use `grep -r "feature_name" .`
2. "Will this break the CDP bridge?" → Test `scripts/agentic/app-state.sh state`
3. "Is this a protected file?" → Check the protected files list below
4. "Did I test both platforms?" → Run Android AND iOS validation
5. "Are there TypeScript/lint errors?" → ALWAYS run `yarn typecheck && yarn lint:fix`

**SAFE TO MODIFY**: New files in `src/`, new stories, new E2E tests
**DANGER ZONE**: Anything in `scripts/agentic/`, `.detoxrc.js`, root `/index.js`

---

### Critical Implementation Lessons (MUST READ FOR ALL AI AGENTS)

**🚨 MANDATORY: Read this section before ANY modifications to prevent repeating mistakes**

#### **Lesson 1: Storybook v9 Integration Complexities**
**Issue**: React Native Storybook v9 has significant module resolution issues in monorepo setups
**Solution Applied**: 
- Created `/index.js` redirect at monorepo root pointing to `apps/playground/src/index.tsx`
- Fixed `storybook.requires.ts` with proper require.context paths
- Added missing dependencies: `@react-native-community/datetimepicker`, `@react-native-community/slider`

**❌ NEVER**: Delete or modify the monorepo root `/index.js` file - it's critical for Storybook
**✅ ALWAYS**: Use `yarn build:deps` before any Storybook development

#### **Lesson 2: Device Configuration Consistency**
**Issue**: Multiple simulators running causes inconsistent test results
**Solution Applied**: 
- iPhone 16 Pro Max standardized across ALL agentic workflows
- Documented simulator selection in `.detoxrc.js` configuration  
- Created `yarn setup:ios-simulator` for consistent setup

**❌ NEVER**: Change simulator selection without updating ALL references in:
  - `.detoxrc.js`
  - `scripts/setup-simulators.sh`
  - `scripts/generate-screenshots.sh` 
**✅ ALWAYS**: Use existing `yarn setup:ios-simulator` command for simulator management

#### **Lesson 3: Agentic Framework Integration**
**Issue**: New features must integrate with existing agentic structure without breaking changes
**Current Structure**: `scripts/agentic/` contains the CDP bridge and utility scripts
**Solution Applied**:
- `cdp-bridge.mjs` is the unified agent interface for all platforms (native + web)
- Shell utility scripts (`app-navigate.sh`, `app-state.sh`, etc.) wrap CDP commands
- Detox/Playwright E2E tests available for CI use

**NEVER**: Break CDP bridge API (`__AGENTIC__` methods) without updating all callers
**ALWAYS**: Test new features via CDP bridge before claiming completion

#### **Lesson 4: Cross-Platform Test Differences**  
**Issue**: iOS and Android Storybook behavior differs in navigation timing
**Solution Applied**:
- Created platform-specific test adaptations in `e2e/storybook-validation.test.ts`
- Used try/catch blocks for timing-sensitive elements
- Maintained consistent screenshot capture across platforms

**❌ NEVER**: Assume cross-platform tests will work identically
**✅ ALWAYS**: Test on BOTH platforms and handle platform-specific timing differences

#### **Lesson 5: Documentation vs Implementation Gaps**
**Issue**: Making changes without verifying existing system integration points
**Solution Applied**:
- Analyzed existing `package.json`, `.detoxrc.js`, `scripts/agentic/` before changes
- Added documentation AFTER confirming integration works
- Verified no duplicate functionality was created

**❌ NEVER**: Add new functionality without checking for existing implementations
**✅ ALWAYS**: Use `grep -r` to find existing patterns before implementing new features

#### **Lesson 6: TypeScript Jest Configuration**
**Issue**: New E2E test files show "Cannot find name 'describe'" TypeScript errors
**Solution Applied**: 
- Import Jest globals from `@jest/globals`: `import { beforeAll, afterAll, describe, it, expect as jestExpected } from '@jest/globals'`
- Import Detox separately: `import { by, element, expect as detoxExpected, device, waitFor } from 'detox'`
- Follow exact pattern from existing `e2e/agent-validation.test.ts`

**❌ NEVER**: Create E2E test files without proper Jest imports
**✅ ALWAYS**: Copy import structure from existing working E2E tests
**🚨 MANDATORY**: Run `yarn typecheck && yarn lint:fix` after creating any new test files

#### **Lesson 7: Cross-Platform Component Architecture**
**Issue**: Need to support components in both React Native and Web Storybook
**Solution Applied**: 
- Created `ui-components/` folder at playground root for cross-platform components
- Kept `src/stories-web/` for web-only stories
- Both locations are auto-discovered by Storybook configurations

**❌ NEVER**: Mix platform-specific code in ui-components folder
**✅ ALWAYS**: Test components in both native and web Storybook before marking complete
**🚨 IMPORTANT**: The `storybook:both` command was removed for clarity - use separate commands

#### **Lesson 8: Critical Files - DO NOT MODIFY**
**Files that are critical to system function and should NEVER be changed without extreme caution:**

**PROTECTED FILES:**
- `/index.js` (monorepo root) - Critical for Storybook module resolution
- `apps/playground/.rnstorybook/storybook.requires.ts` - Auto-generated, only update via `sb-rn-get-stories`
- `apps/playground/.detoxrc.js` - Device configurations used across ALL tests
- `apps/playground/scripts/agentic/cdp-bridge.mjs` - Unified CDP bridge (all platforms)
- `apps/playground/scripts/agentic/web-browser.mjs` - Web browser lifecycle manager

**PROTECTED PATTERNS:**
- `globalThis.__AGENTIC__` API surface in `src/agentic-bridge.ts`
- Simulator device names in any configuration files
- Metro/bundler configuration related to Storybook
- E2E test timeout values and screenshot configurations

**BEFORE MODIFYING PROTECTED FILES:**
- Test change on single platform first
- Verify CDP bridge still works: `scripts/agentic/app-state.sh state`
- Test both Android and iOS platforms
- Check that screenshots still capture properly
- **MANDATORY**: Run `yarn typecheck && yarn lint:fix` after ANY code changes

#### **Lesson 9: Precise Device Targeting with --device Flag**
**Issue**: Environment variables (`IOS_SIMULATOR`, `ANDROID_DEVICE`) for device targeting were fragile — set in shell profiles, caused mismatches between platforms, and silently fell through to wrong devices.
**Solution Applied**:
- Replaced all env var filtering with a single `--device <name>` CLI flag
- Auto-detects when 1 device connected (zero config), errors with device list when 2+ connected
- Case-insensitive substring matching on Metro's `deviceName` field
- All shell wrappers (`app-state.sh`, `app-navigate.sh`, `screenshot.sh`, `reload-metro.sh`) forward `--device`
- `list-devices` command shows all connected agentic devices

**❌ NEVER**: Use `IOS_SIMULATOR` or `ANDROID_DEVICE` env vars (removed)
**✅ ALWAYS**: Use `--device <name>` flag when multiple devices are connected
**✅ ALWAYS**: Use `node scripts/agentic/cdp-bridge.mjs list-devices` to discover connected devices

#### **Lesson 10: Silent Fallback Is Worse Than Failure**
**Issue**: When device filters matched nothing, the CDP bridge silently fell through to wrong results — the agent thought it was testing one platform but was actually talking to another.
**Solution Applied**:
- With `--device` filter: errors loudly with available device names when no match found
- Without `--device`: errors when 2+ devices connected, listing available devices
- Discovery retries up to 5 times (2s intervals) to handle the race condition where Android connects to Metro but Hermes hasn't reported pages yet

**❌ NEVER**: Silently fall through to a different platform's targets when a device filter fails
**✅ ALWAYS**: Fail loudly with available device names when a filter matches nothing

#### **Lesson 11: Native Module Serialization**
**Issue**: Passing `logger` (function), `ArrayBuffer`, or other non-serializable JS objects to Expo native modules causes `"Cannot convert '[object Object]' to a Kotlin type"` crash on Android.
**Solution Applied**:
- `extractAudioAnalysis` now passes only serializable fields to the native module: `fileUri`, `segmentDurationMs`, `features`, `decodingOptions`, and range params
- Non-serializable properties (`logger`, `arrayBuffer`) are excluded from the native call

**❌ NEVER**: Pass `logger`, `ArrayBuffer`, functions, or class instances to Expo native modules
**✅ ALWAYS**: Only pass plain objects with primitive values, arrays, and nested plain objects to native code

#### **Lesson 12: Native Log Retrieval**
**Issue**: The agentic bridge had no way to get Kotlin/Swift logs, blocking full feedback loops when native code crashes or misbehaves.
**Solution Applied**:
- Created `scripts/agentic/native-logs.sh` for filtered native log retrieval
- Android: `adb logcat` filtered by `ExpoAudioStudio|ExpoAudioStream|AudioTrimmer|AudioDeviceManager`
- iOS: `xcrun simctl spawn <UDID> log stream` filtered by `ExpoAudioStudio` predicate
- Supports dump, follow, line-limit, and clear modes

**❌ NEVER**: Ignore native logs when debugging native module issues
**✅ ALWAYS**: Use `scripts/agentic/native-logs.sh android` or `ios` to check native-side errors

#### **Lesson 13: Android ADB Reverse Port Mapping**
**Issue**: Metro runs on port 7365 (configured in `package.json`), not the React Native default 8081. When the Android app isn't connecting to Metro, the instinct is to map `adb reverse tcp:8081 tcp:7365` — but this conflicts with other RN apps that legitimately use port 8081.
**Root Cause**: The app is built with `RCT_METRO_PORT=7365` and `--port 7365`, so the native build already knows to connect on 7365. The correct reverse mapping is `adb reverse tcp:7365 tcp:7365`.
**Solution Applied**:
- Use `adb reverse tcp:7365 tcp:7365` (match Metro's actual port, not 8081)
- If the app isn't connecting, just `adb shell am force-stop` and relaunch with plain `adb shell am start` — no deep links needed
- The Expo dev client picks up the correct port automatically from the native build config

**❌ NEVER**: Map `adb reverse tcp:8081 tcp:7365` — it conflicts with other RN apps using 8081
**❌ NEVER**: Use deep link `exp+audioplayground://expo-development-client/?url=...` for Metro — it doesn't work reliably
**✅ ALWAYS**: Use `adb reverse tcp:7365 tcp:7365` matching the port in `package.json`
**✅ ALWAYS**: Plain `adb shell am start <package>/.MainActivity` to relaunch after force-stop

#### **Lesson 14: Incremental Validation Over Full Builds**
**Issue**: Running full `tsc --noEmit` across the entire monorepo for a single-file change wastes time and floods output with pre-existing errors from other packages.
**Solution Applied**:
- For targeted changes, rely on the package `build` command (e.g., `yarn workspace @siteed/expo-audio-ui build`) which completes in ~1.5s
- Only run full typecheck when making cross-package changes
- Grep the typecheck output for the specific changed file if full typecheck is needed

**❌ NEVER**: Run full monorepo `tsc --noEmit` for single-file changes
**✅ ALWAYS**: Use package-scoped build (`yarn workspace <pkg> build`) as the fast feedback loop

### **Verification Commands for Future Agents**
Before making ANY changes, run these commands to understand current state:
```bash
# List connected devices
node scripts/agentic/cdp-bridge.mjs list-devices

# Test CDP bridge is working
scripts/agentic/app-state.sh state

# Target specific device (only needed with 2+ devices)
scripts/agentic/app-state.sh --device "Pixel 6a" state

# Verify simulator configuration
cat .detoxrc.js | grep -A 10 "devices\|configurations"

# Check existing package.json scripts
cat package.json | grep -A 1 -B 1 "setup:\|e2e:"

# List agentic scripts
ls scripts/agentic/
```

### **✅ COMPLETED IMPLEMENTATIONS (DO NOT DUPLICATE)**

**Storybook Integration - COMPLETE (January 2025):**
- React Native Storybook v9 fully working on Android & iOS
- Web Storybook v9 in playground app for cross-platform development
- Cross-platform E2E validation with screenshots
- Module resolution fixed with monorepo root redirect
- Missing dependencies added (@react-native-community/datetimepicker, slider)
- `ui-components/` folder for cross-platform components
- Separate web stories in `src/stories-web/`
- Triple Storybook setup (Native, Web, UI Library)

**Simulator Management - COMPLETE:**
- iPhone 16 Pro Max standardized across all workflows
- `yarn setup:ios-simulator` for consistent setup
- Cross-platform consistency documented and enforced

**CDP Bridge Validation - COMPLETE:**
- `cdp-bridge.mjs` as unified entry point for all platforms (native + web)
- `web-browser.mjs` for web browser lifecycle only (launch/close/logs)
- Shell utility scripts for navigation, state, screenshots
- `--device <name>` flag for precise multi-device targeting (replaces env vars)
- `list-devices` and `reload` commands
- < 2 minute validation cycles working
- Real device testing with screenshot capture

**DO NOT RE-IMPLEMENT THESE FEATURES - THEY WORK PERFECTLY**

### Documentation

**Complete Guide**: `apps/playground/docs/AGENTIC_FEEDBACK_LOOPS.md` - CDP bridge usage, recording controls, and troubleshooting
**Testing Strategy**: `packages/expo-audio-studio/docs/TESTING_STRATEGY.md` - Validation approach
**Storybook Quick Start**: `docs/AGENT_STORYBOOK_QUICKSTART.md` - Commands and workflow for Storybook development
**Storybook Status**: `docs/AGENT_STORYBOOK_STATUS.md` - Current implementation status and capabilities