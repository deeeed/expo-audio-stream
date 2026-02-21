# Contributing to expo-audio-stream

## Quick Start

### Setup
```bash
# 1. Install Git LFS for ONNX models
./scripts/setup-lfs.sh

# 2. Install dependencies
yarn install

# 3. Build packages
cd apps/playground && yarn build:deps
```

### Development Approaches

**CDP Bridge Validation (Recommended)**
```bash
cd apps/playground
scripts/agentic/start-metro.sh                        # Start Metro
scripts/agentic/app-navigate.sh "/(tabs)/record"      # Navigate
scripts/agentic/app-state.sh state                     # Query state
scripts/agentic/screenshot.sh my-label                 # Screenshot
```

**Traditional Testing**
```bash
./scripts/run_tests.sh        # Run comprehensive test suite
```

### Constraints
- NEVER IMPLEMENT UNLESS ASKED
- ALWAYS VERIFY IN SOURCE CODE
- MINIMIZE DIFF
- NO WORKAROUNDS - fix root causes
- REAL TESTING ONLY

## Documentation
- **Complete Guide**: `apps/playground/docs/AGENTIC_FEEDBACK_LOOPS.md`
- **Package Details**: `packages/expo-audio-studio/CONTRIBUTE.md`
