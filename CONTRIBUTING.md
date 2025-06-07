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

**🤖 Agentic Framework (Recommended)**
```bash
cd apps/playground
yarn agent:setup              # Setup devices (first time)
yarn agent:dev <feature>      # Validate feature works (< 2 minutes)
```

**🧪 Traditional Testing**
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
- **Complete Guide**: `docs/AGENT_WORKFLOW.md`
- **Package Details**: `packages/expo-audio-studio/CONTRIBUTE.md` 