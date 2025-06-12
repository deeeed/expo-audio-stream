# Storybook Implementation Plan

## Current Status (December 2024)
- ✅ **Storybook v9.0.8** - Web-only in expo-audio-ui, working on port 6068
- ✅ **React 18.3.1** - Stable version for compatibility  
- ❌ **React Native** - Not implemented (NEXT STEP)
- ❌ **Agent Automation** - Not implemented

## Architecture Overview

### Two-Tier Storybook Setup
1. **UI Library** (`packages/expo-audio-ui`): Web-only Storybook for rapid development
2. **Playground App** (`apps/playground`): React Native Storybook for device testing

This separation ensures the UI library remains a pure library while enabling real device testing through the playground app.

## Quick Start (Current)
```bash
cd packages/expo-audio-ui && yarn storybook
# http://localhost:6068 (Web only)
```

## Implementation Plan

### Step 1: Add React Native Storybook to Playground App

1. **Install React Native Storybook in Playground**
   ```bash
   cd apps/playground
   yarn add -D @storybook/react-native@^9.0.6 \
     @storybook/addon-ondevice-controls@^9.0.6 \
     @storybook/addon-ondevice-actions@^9.0.6
   ```

2. **Create Storybook Configuration**
   Create `apps/playground/.storybook/main.ts`:
   ```typescript
   import type { StorybookConfig } from '@storybook/react-native';
   
   const config: StorybookConfig = {
     stories: [
       '../src/**/*.stories.@(js|jsx|ts|tsx)',
       // Import stories from UI library
       '../../../packages/expo-audio-ui/src/**/*.stories.@(js|jsx|ts|tsx)'
     ],
     addons: [
       '@storybook/addon-ondevice-controls',
       '@storybook/addon-ondevice-actions',
     ],
   };
   
   export default config;
   ```

3. **Create Storybook Entry Point**
   Create `apps/playground/src/storybook/index.tsx`:
   ```typescript
   import { getStorybookUI } from '@storybook/react-native';
   import './storybook.requires';
   
   const StorybookUIRoot = getStorybookUI({
     enableWebsockets: true,
     host: 'localhost',
     port: 7007,
   });
   
   export default StorybookUIRoot;
   ```

4. **Add Storybook Mode to App**
   Update `apps/playground/src/index.tsx` to support Storybook mode:
   ```typescript
   const STORYBOOK_MODE = process.env.EXPO_PUBLIC_STORYBOOK === 'true';
   
   if (STORYBOOK_MODE) {
     module.exports = require('./storybook');
   } else {
     module.exports = require('./AppRoot');
   }
   ```

5. **Add Scripts to Playground package.json**
   ```json
   {
     "scripts": {
       "storybook:generate": "sb-rn-get-stories",
       "storybook": "EXPO_PUBLIC_STORYBOOK=true yarn start",
       "storybook:ios": "EXPO_PUBLIC_STORYBOOK=true yarn ios",
       "storybook:android": "EXPO_PUBLIC_STORYBOOK=true yarn android"
     }
   }
   ```

6. **Test Implementation**
   - Run `yarn storybook:generate` to create story imports
   - Run `yarn storybook:ios` for iOS testing
   - Run `yarn storybook:android` for Android testing
   - Verify both playground and UI library stories load

### Step 2: Add Testing Capabilities (Optional)

For visual regression testing:
- **Chromatic**: Automated visual testing for web Storybook
- **Percy**: Alternative visual testing service
- **Storybook Test Runner**: For interaction testing

For the playground app:
- Use existing e2e testing with Detox
- Leverage agent validation framework

## Known Issues
- **React 19**: Not supported by @storybook/addon-react-native-web
- **Skia Components**: Use string style props (`style="stroke"`)
- **Webpack**: Needs `fs: false, path: false` fallbacks

## Success Criteria
### For UI Library:
- [x] Web Storybook running on port 6068
- [x] All components have stories
- [ ] Interaction tests for key flows
- [ ] Visual regression testing setup

### For Playground App:
- [ ] React Native Storybook configured
- [ ] Can view UI library stories on devices
- [ ] Can view playground-specific stories
- [ ] Hot reload works on both platforms

## Technical Decisions
1. Keep UI library as pure library (no app files)
2. Use playground app for all device testing
3. Leverage existing tools rather than building custom scripts
4. Focus on simplicity and maintainability
