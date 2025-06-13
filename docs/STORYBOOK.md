# Storybook Documentation

## Overview

The expo-audio-stream monorepo implements a comprehensive triple Storybook setup designed for efficient cross-platform component development with real device testing capabilities and automated validation feedback loops.

### Three-Tier Architecture

1. **Native Storybook** (React Native v9) - `apps/playground`
   - Port: 7007 (Metro bundler)
   - Purpose: Real device testing on iOS/Android
   - Features: Hot reload, auto-discovery, environment switching

2. **Web Storybook** (v8) - `apps/playground` 
   - Port: 6006 (Vite bundler)
   - Purpose: Cross-platform component development
   - Features: React Native Web compatibility, rapid iteration

3. **UI Library Storybook** (v8) - `packages/expo-audio-ui`
   - Port: 6068 (Vite bundler)
   - Purpose: Library-specific component iteration
   - Features: Isolated component development, documentation

## Architecture & Component Organization

### Directory Structure
```
apps/playground/
├── .rnstorybook/                    # Native Storybook v9 configuration
│   ├── main.ts                      # Story discovery and addons
│   └── index.tsx                    # Entry point
├── .storybook/                      # Web Storybook v8 configuration
│   ├── main.ts                      # Vite configuration
│   └── preview.tsx                  # Global decorators
├── ui-components/                   # Cross-platform components (NEW)
│   ├── ComponentName.tsx            # Works in native + web
│   └── ComponentName.stories.tsx    # Story definitions
├── src/
│   ├── stories-web/                 # Web-only stories
│   └── components/                  # App-specific components
└── /index.js                        # Monorepo root redirect (CRITICAL)
```

### Component Categories

1. **Cross-Platform Components** (`ui-components/`)
   - Components that work in both native and web environments
   - Use React Native primitives (View, Text, etc.)
   - Platform-specific code handled via Platform.select()

2. **Web-Only Components** (`src/stories-web/`)
   - Components using web-specific features
   - React Native Web components with DOM dependencies
   - Browser-specific functionality

3. **App Components** (`src/components/`)
   - Application-specific components
   - Not included in Storybook by default
   - Can be migrated to ui-components/ when ready

## Available Commands

### Development Commands
```bash
cd apps/playground

# Native Storybook (React Native v9)
yarn storybook                       # Start Metro server (localhost:7007)
yarn storybook:ios                   # Run on iOS simulator/device
yarn storybook:android               # Run on Android device/emulator

# Web Storybook (v8)
yarn storybook:web                   # Playground web (localhost:6006)

# UI Library Storybook
cd ../../packages/expo-audio-ui
yarn storybook                       # Library web (localhost:6068)
```

### Agent Validation Commands
```bash
cd apps/playground

# Fast validation (< 1 minute)
yarn agent:storybook                 # Complete validation pipeline
yarn validate:storybook              # Alias for above

# Platform-specific validation with screenshots
yarn agent:storybook:ios             # iOS validation + screenshots
yarn agent:storybook:android         # Android validation + screenshots

# E2E testing
yarn e2e:android:storybook           # Android Detox tests
yarn e2e:ios:storybook               # iOS Detox tests
```

### Individual Validation Steps
```bash
# TypeScript compilation
yarn tsc --noEmit --skipLibCheck

# ESLint validation
yarn lint ui-components/

# Jest story tests
yarn test:stories

# Metro server test
EXPO_PUBLIC_STORYBOOK=true yarn start --port 7007
```

## Agent Validation Workflow

The agentic framework provides automated feedback loops essential for fast, reliable development:

### 1. Technical Validation (< 30 seconds)
- **TypeScript Check**: Ensures all stories compile
- **ESLint Check**: Validates code quality
- **Story Import Test**: Verifies story structure
- **Metro Server Test**: Confirms Storybook starts

### 2. Visual Validation (< 1 minute)
- **Real Device Testing**: Runs on actual iOS/Android devices
- **Screenshot Capture**: Visual feedback for changes
- **Navigation Testing**: Validates story switching
- **Platform Adaptations**: Handles timing differences

### 3. Results & Logging
- Detailed logs in `logs/storybook-validation/`
- Screenshot artifacts in `artifacts/`
- Exit codes for CI/CD integration
- Timestamp tracking for performance

## Key Implementation Details

### Environment Switching
The app dynamically switches between normal app and Storybook based on environment:
```typescript
// src/index.tsx
const storybookEnabled = process.env.EXPO_PUBLIC_STORYBOOK === 'true';
```

### Metro Configuration
Uses `withStorybook` wrapper for Yarn Berry monorepo compatibility:
```javascript
// metro.config.cjs
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');
module.exports = withStorybook(config, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK === 'true',
  configPath: path.resolve(__dirname, './.rnstorybook'),
});
```

### Auto-Discovery
Stories are automatically loaded from:
- `ui-components/**/*.stories.tsx` (playground)
- `../expo-audio-ui/src/**/*.stories.tsx` (UI library)
- Additional paths can be configured in `.rnstorybook/main.ts`

### Critical Files
- **DO NOT DELETE**: Root `/index.js` - Required for module resolution
- **Auto-generated**: `.rnstorybook/storybook.requires.ts` - Run `sb-rn-get-stories`
- **Protected**: `scripts/agent.sh` - Core validation framework

## Current Story Inventory

### UI Library Components (10 stories)
1. AnimatedCandle - Animated SVG visualization
2. AudioTimeRangeSelector - Time range selection UI
3. AudioVisualizer - Real-time audio visualization
4. DecibelGauge - Circular decibel meter
5. DecibelMeter - Linear decibel display
6. EmbeddingVisualizer - Audio embedding visualization
7. RecordButton - Recording control component
8. SkiaTimeRuler - Time ruler with Skia
9. Waveform - Audio waveform display
10. YAxis - Vertical axis component

### Playground Components (1 story)
- TestButton - Example cross-platform component with unit tests

## Key Decisions & Rationale

### 1. Triple Storybook Setup
**Decision**: Maintain three separate Storybook instances
**Rationale**: 
- Separation of concerns (library vs app)
- Different bundler requirements (Metro vs Vite)
- Independent versioning and deployment

### 2. Component Architecture
**Decision**: New `ui-components/` folder for cross-platform components
**Rationale**:
- Clear separation from app-specific components
- Easier migration path for existing components
- Simplified story discovery configuration

### 3. Validation Framework
**Decision**: Integrate with existing agent validation system
**Rationale**:
- Leverage proven < 2 minute feedback loops
- Consistent with repository patterns
- Real device testing enforcement

### 4. Version Selection
**Decision**: React Native Storybook v9, Web Storybook v8
**Rationale**:
- v9 is latest for React Native with better monorepo support
- v8 for web maintains React Native Web compatibility
- Proven stability with React 19

## Testing Infrastructure

### Jest Configuration
- Config: `jest.config.stories.js`
- Setup: `jest.setup.stories.js`
- Pattern: `**/*.stories.test.tsx`

### Example Test Structure
```typescript
import { render } from '@testing-library/react-native';
import { composeStories } from '@storybook/react';
import * as stories from './Component.stories';

const { Default, Variant } = composeStories(stories);

describe('Component Stories', () => {
  it('renders default story', () => {
    const { getByText } = render(<Default />);
    expect(getByText('Expected Text')).toBeTruthy();
  });
});
```

## Troubleshooting

### Common Issues

1. **Module Resolution Errors**
   - Ensure root `/index.js` exists
   - Run `yarn build:deps` in playground
   - Clear Metro cache: `yarn start --clear`

2. **Stories Not Appearing**
   - Run `sb-rn-get-stories` to regenerate requires
   - Check story export format (CSF3)
   - Verify file naming (`*.stories.tsx`)

3. **Platform-Specific Issues**
   - iOS: Disconnect VPN, check simulator selection
   - Android: Ensure ADB connection, check port forwarding
   - Use platform-specific test commands

### Quick Fixes
```bash
# Clear all caches
yarn start --clear
rm -rf ./.rnstorybook/storybook.requires.ts
yarn sb-rn-get-stories

# Restart in Storybook mode
EXPO_PUBLIC_STORYBOOK=true yarn start --clear

# Check validation logs
cat logs/storybook-validation/validation-*.log
```

## Performance Considerations

1. **Story Loading**: Stories are bundled at build time, not lazy loaded
2. **Hot Reload**: Supported on all platforms with Metro/Vite
3. **Memory Usage**: Each Storybook instance runs independently
4. **Build Times**: Initial build slower due to story discovery

## Future Roadmap

### High Priority
- Visual regression testing integration
- Automated story generation from components
- Performance monitoring for story render times

### Medium Priority
- Cross-platform screenshot automation
- Documentation generation from stories
- Deep link validation for stories

### Low Priority
- Advanced interaction testing
- Accessibility validation
- Component usage analytics

## Related Documentation

- [Migration Guide](./STORYBOOK_MIGRATION_GUIDE.md) - Step-by-step component migration
- [Agent Workflow](./AGENT_WORKFLOW.md) - Complete agentic framework documentation
- [Testing Strategy](../packages/expo-audio-studio/docs/TESTING_STRATEGY.md) - Overall testing approach