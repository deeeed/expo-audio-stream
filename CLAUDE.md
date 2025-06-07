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

### Key Benefits of Agentic Framework

- **10x Productivity**: Automated feedback loops unlock massive productivity gains
- **Fast Development**: < 2 minutes to prove functionality works on real devices
- **Quality Assurance**: Real device testing prevents regressions reaching team
- **Feature-Focused**: Tests only what's relevant, no test maintenance overhead
- **Simple Workflow**: Single command validation replaces complex test setups
- **Scalable**: From development iteration to comprehensive CI validation

### Documentation

**📖 Complete Guide**: `docs/AGENT_WORKFLOW.md` - Comprehensive usage, features, setup, and troubleshooting
**📖 Testing Strategy**: `packages/expo-audio-studio/docs/TESTING_STRATEGY.md` - Agentic validation approach