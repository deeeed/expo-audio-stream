# Agentic Testing Strategy for expo-audio-studio

## Overview

The expo-audio-studio library uses an **agentic validation system** designed for fast, reliable validation during development. This approach prioritizes speed and real functionality testing over comprehensive test suites.

## Core Philosophy

**Fast Development Validation**: Agents validate functionality works correctly in under 2 minutes, proving features work on real devices without running extensive test suites.

## Validation Approach

### Primary: Development Validation (Required)
- **Duration**: < 2 minutes  
- **Purpose**: Validate feature functionality works correctly
- **Method**: Uses agent-validation.tsx page with deep links
- **Platforms**: Android (default), iOS, or both
- **Command**: `yarn agent:dev <feature> [platform]`

### Optional: Comprehensive Testing
- **Duration**: 5-10 minutes
- **Purpose**: Complete test suite (102 tests)
- **When**: Manual choice or CI pipeline
- **Command**: `yarn agent:full [platform]`

## Quick Start

```bash
cd apps/playground

# Setup devices (first time only)
yarn agent:setup

# Validate feature functionality (REQUIRED)
yarn agent:dev compression android

# Optional comprehensive testing
yarn agent:full

# Clean development artifacts
yarn agent:cleanup
```

## Supported Features

| Feature | Description | Test Focus |
|---------|-------------|------------|
| `basic` | Standard recording workflow | Core API functionality |
| `compression` | Compressed audio output | AAC/compression pipeline |
| `high-frequency` | High sample rates/intervals | Performance validation |
| `multi-channel` | Stereo recording | Channel handling |
| `pause-resume` | Pause/resume workflow | State management |
| `error-handling` | Error scenarios | Error recovery |

## Platform Support

- **Android**: Default platform, uses device/emulator
- **iOS**: macOS only, uses simulator  
- **Both**: Sequential testing on both platforms

## Why Agentic Testing?

### Traditional Approach Problems
- ❌ Slow feedback loops (10+ minutes)
- ❌ Complex test setup and maintenance
- ❌ Tests often mock behavior instead of testing real functionality
- ❌ Overwhelming for development iteration

### Agentic Approach Benefits
- ✅ **Fast feedback**: < 2 minutes to validate features
- ✅ **Real functionality**: Tests actual API behavior on devices
- ✅ **Feature-focused**: Only tests relevant functionality
- ✅ **Simple workflow**: Single command validation
- ✅ **Sufficient proof**: Demonstrates feature works correctly

## Implementation Details

### How It Works
1. **Deep Link Generation**: Creates specific test URLs for features
2. **Real Device Testing**: Runs on actual Android/iOS devices
3. **API Validation**: Tests expo-audio-studio behavior directly
4. **Immediate Results**: Shows success/failure within 2 minutes

### Example Deep Links
```bash
# Basic recording test
audioplayground://agent-validation?sampleRate=44100&channels=1

# Compression test
audioplayground://agent-validation?compressedOutput=true&compressedFormat=aac

# High-frequency test
audioplayground://agent-validation?interval=10&sampleRate=48000
```

### Validation Interface
The agent-validation.tsx page displays:
- Configuration from deep link parameters
- Real-time recording status
- API call results and events
- Error messages and diagnostics

## Agent Requirements

### Mandatory for All Agents
- ✅ Use `yarn agent:dev <feature>` for all development work
- ✅ Test on real devices/simulators (no simulation)
- ✅ Fix issues immediately when validation fails
- ✅ Include actual command output in responses

### Optional Activities
- ✅ Run `yarn agent:full` for comprehensive testing if desired
- ✅ Test on both platforms when relevant
- ✅ Clean up artifacts with `yarn agent:cleanup`

### Never Do
- ❌ Skip development validation
- ❌ Simulate test results
- ❌ Claim work complete without validation

## Troubleshooting

### Quick Fixes
```bash
# Device not detected
adb devices                    # Check Android
xcrun simctl list devices      # Check iOS

# App not responding
yarn agent:setup               # Re-setup devices

# TypeScript errors
yarn typecheck                 # Fix compilation first
```

### Common Issues
- **No devices**: Start emulator or connect device
- **App crashes**: Check deep link parameters are valid
- **Test timeout**: Verify device is responsive

## Complete Documentation

**📖 Full Guide**: See [agentic workflow](../../../docs/AGENT_WORKFLOW.md)` for:
- Detailed usage instructions
- Complete feature list and examples  
- Platform setup guides
- Advanced troubleshooting
- Screenshot management
- Error handling

## Migration from Traditional Testing

### For Existing Contributors
- **Old way**: Complex test setup with multiple scripts
- **New way**: Single `yarn agent:dev <feature>` command
- **Benefits**: 5x faster validation, simpler workflow

### For CI/CD
- **Development**: Use `yarn agent:dev` for fast validation
- **Comprehensive**: Use `yarn agent:full` for complete testing
- **Flexibility**: Choose appropriate validation level

## Success Metrics

- ✅ Feature validation completes in < 2 minutes
- ✅ Real functionality proven working
- ✅ Simple, clear workflow for all agents
- ✅ Optional comprehensive testing available