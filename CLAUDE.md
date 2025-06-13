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

#### Development Validation (< 2 minutes) - MANDATORY
**Usage**: `yarn agent:dev <feature> [platform]`
- **Purpose**: Prove feature functionality works on real devices
- **Method**: Uses agent-validation.tsx page with deep links  
- **Validation**: Tests actual expo-audio-studio API behavior
- **Result**: Immediate feedback on success/failure
- **Requirement**: **MANDATORY for ALL agent work**

#### Full Validation (5-10 minutes) - OPTIONAL  
**Usage**: `yarn agent:full [platform]`
- **Purpose**: Comprehensive testing (102 tests)
- **When**: Manual choice or CI pipeline
- **Requirement**: **NOT required for agent completion**

### Agent Constraints (Prevent Costly Mistakes)
1. **NEVER IMPLEMENT UNLESS ASKED** - No unsolicited changes
2. **ALWAYS VERIFY IN SOURCE CODE** - No hallucinations accepted
3. **MINIMIZE DIFF** - Smallest possible changes
4. **NO WORKAROUNDS** - Fix root causes, not symptoms
5. **REAL TESTING ONLY** - No simulated results accepted

### Quick Commands
```bash
cd apps/playground
yarn agent:setup                # Device setup (first time)
yarn agent:dev compression      # Validate compression feature (REQUIRED)
yarn agent:full                 # Optional comprehensive testing
yarn agent:cleanup              # Clean dev artifacts
```

### Device Setup (Required for Validation)

#### Quick Setup Commands
```bash
cd apps/playground
yarn agent:setup               # Check and setup devices
yarn setup:ios-simulator       # Auto-setup iOS simulator (macOS only)
```

#### Manual Setup
```bash
# Android: Connect device or start emulator
adb devices                     # Check connected devices

# iOS (macOS only): Boot simulator  
xcrun simctl boot "iPhone 15"  # Or any available iPhone
```

### Success Criteria
- ✅ Development validation passes in < 2 minutes
- ✅ Feature functionality confirmed working
- ✅ Include actual command output in response
- ✅ Real device/simulator testing completed
- ✅ Optional: Full validation available if desired

**📖 Complete Workflow**: See `docs/AGENT_WORKFLOW.md` for detailed usage, log management, and troubleshooting

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
```

## Current Branch Context

You are working on the `main` branch which includes the newly implemented agentic framework validation system.

### Key Features
- Agentic validation tab (DEV_ONLY) in playground app
- 102 comprehensive tests (Android + iOS)
- Real device testing enforcement
- Cross-platform validation requirements

## Important Notes

- Always run `yarn build:deps` in playground before development
- Git LFS setup required for ONNX models
- Native changes require pod install (iOS) or gradle sync (Android)
- Use absolute paths in test scripts
- Background recording requires special permissions configuration
- **VPN Interference**: Disconnect VPNs during iOS E2E tests; Android uses ADB port forwarding (VPN-resistant)

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
# Setup standard simulator for all agent workflows
yarn setup:ios-simulator

# Agentic framework commands (all use iPhone 16 Pro Max)
yarn agent:dev compression ios    # Development validation  
yarn agent:full ios              # Full validation (102 tests)
yarn agent:storybook:ios         # Storybook validation

# Manual E2E testing with different simulators
yarn detox test -c ios.sim.debug -o e2e/agent-validation.test.ts
yarn detox test -c ios.iPadPro.debug -o e2e/record.test.ts

# Force specific simulator in Detox config
# Edit .detoxrc.js devices.simulator.device.type
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
2. "Will this break existing agent commands?" → Test `yarn agent:dev compression ios`
3. "Is this a protected file?" → Check the protected files list below
4. "Did I test both platforms?" → Run Android AND iOS validation

**✅ SAFE TO MODIFY**: New files in `src/`, new stories, new E2E tests
**🚨 DANGER ZONE**: Anything in `scripts/`, `.detoxrc.js`, root `/index.js`, package.json agent scripts

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
**Current Structure**: `scripts/agent.sh` handles ALL agent commands with consistent patterns
**Solution Applied**:
- Added Storybook validation as NEW commands: `yarn agent:storybook:ios/android`
- Integrated with existing validation timeouts and screenshot systems
- Maintained existing log file structure in `logs/` directories

**❌ NEVER**: Modify core `scripts/agent.sh` without understanding full validation flow
**✅ ALWAYS**: Add new agent commands as separate scripts that integrate with existing patterns

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
- Analyzed existing `agent.sh`, `package.json`, `.detoxrc.js` before changes
- Added documentation AFTER confirming integration works
- Verified no duplicate functionality was created

**❌ NEVER**: Add new functionality without checking for existing implementations
**✅ ALWAYS**: Use `grep -r` to find existing patterns before implementing new features

#### **Lesson 6: Critical Files - DO NOT MODIFY**
**Files that are critical to system function and should NEVER be changed without extreme caution:**

**🔒 PROTECTED FILES:**
- `/index.js` (monorepo root) - Critical for Storybook module resolution
- `apps/playground/.rnstorybook/storybook.requires.ts` - Auto-generated, only update via `sb-rn-get-stories`
- `apps/playground/.detoxrc.js` - Device configurations used across ALL tests
- `apps/playground/scripts/agent.sh` - Core agentic framework script

**🔒 PROTECTED PATTERNS:**
- Any script that starts with `yarn agent:` in package.json
- Simulator device names in any configuration files
- Metro/bundler configuration related to Storybook
- E2E test timeout values and screenshot configurations

**🚨 BEFORE MODIFYING PROTECTED FILES:**
1. Create backup: `cp file.js file.js.backup`
2. Test change on single platform first
3. Verify ALL existing agent commands still work
4. Test both Android and iOS platforms
5. Check that screenshots still capture properly

### **Verification Commands for Future Agents**
Before making ANY changes, run these commands to understand current state:
```bash
# Check existing agent structure
cat scripts/agent.sh | grep -A 5 -B 5 "ios\|android"

# Verify simulator configuration  
cat .detoxrc.js | grep -A 10 "devices\|configurations"

# Check existing package.json scripts
cat package.json | grep -A 1 -B 1 "agent:\|setup:\|e2e:"

# Find integration points for new features
grep -r "yarn.*agent" scripts/
```

### **✅ COMPLETED IMPLEMENTATIONS (DO NOT DUPLICATE)**

**Storybook Integration - COMPLETE:**
- ✅ React Native Storybook v9 fully working on Android & iOS
- ✅ Cross-platform E2E validation with screenshots  
- ✅ Agent commands: `yarn agent:storybook:android` & `yarn agent:storybook:ios`
- ✅ Module resolution fixed with monorepo root redirect
- ✅ Missing dependencies added (@react-native-community/datetimepicker, slider)

**Simulator Management - COMPLETE:**
- ✅ iPhone 16 Pro Max standardized across all workflows
- ✅ `yarn setup:ios-simulator` integrated with `scripts/agent.sh`
- ✅ Cross-platform consistency documented and enforced

**Validation Framework - COMPLETE:**
- ✅ < 2 minute validation cycles working
- ✅ Real device testing with screenshot capture  
- ✅ Technical + E2E validation pipeline
- ✅ Log management and error reporting

**DO NOT RE-IMPLEMENT THESE FEATURES - THEY WORK PERFECTLY**

### Documentation

**📖 Complete Guide**: `docs/AGENT_WORKFLOW.md` - Comprehensive usage, features, setup, and troubleshooting
**📖 Testing Strategy**: `packages/expo-audio-studio/docs/TESTING_STRATEGY.md` - Agentic validation approach