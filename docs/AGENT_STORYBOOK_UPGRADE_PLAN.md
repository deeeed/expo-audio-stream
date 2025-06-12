# Storybook Implementation Plan

## Current Status (December 2024)
- ✅ **Storybook v9.0.8** - Web-only, working on port 6068
- ✅ **React 18.3.1** - Downgraded from v19 for compatibility  
- ❌ **React Native** - Not implemented (NEXT STEP)
- ❌ **Agent Automation** - Not implemented

## Quick Start
```bash
cd packages/expo-audio-ui && yarn storybook
# http://localhost:6068
```

## Next Steps (In Order)

### Step 1: Add React Native Support (DO THIS FIRST)

1. **Install React Native Storybook v9**
   ```bash
   cd packages/expo-audio-ui
   yarn add -D @storybook/react-native@^9.0.6 \
     @storybook/addon-ondevice-controls@^9.0.6 \
     @storybook/addon-ondevice-actions@^9.0.6
   ```

2. **Update .storybook/main.ts**
   ```typescript
   // Add to existing configuration
   const config = {
     // ... existing config
     refs: {
       'react-native': {
         title: 'React Native',
         url: 'http://localhost:7007',
       },
     },
   };
   ```

3. **Create Native Entry Point**
   Create `src/storybook.native.ts`:
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

4. **Configure Metro**
   Create/update `metro.config.js`:
   ```javascript
   const { getDefaultConfig } = require('expo/metro-config');
   const { withStorybook } = require('@storybook/react-native/metro');
   
   const config = getDefaultConfig(__dirname);
   module.exports = withStorybook(config);
   ```

5. **Add Scripts to package.json**
   ```json
   {
     "scripts": {
       "storybook:native": "sb-rn-get-stories && react-native start",
       "storybook:ios": "react-native run-ios",
       "storybook:android": "react-native run-android"
     }
   }
   ```

6. **Test on Devices**
   - Run `yarn storybook:native`
   - Test on iOS simulator
   - Test on Android emulator
   - Verify stories load on both platforms

### Step 2: Build Automation Framework (AFTER React Native Works)

1. **Install Dependencies**
   ```bash
   yarn add -D chromatic @storybook/test-runner playwright
   ```

2. **Create Validation Script**
   Create `scripts/story-validate.ts`:
   ```typescript
   import { test } from '@storybook/test-runner';
   import { chromatic } from 'chromatic';
   
   export async function validateStory(component: string, platform: 'web' | 'ios' | 'android' = 'web') {
     // Implementation here
   }
   ```

3. **Add Agent Commands**
   Update package.json:
   ```json
   {
     "scripts": {
       "agent:story": "ts-node scripts/story-validate.ts",
       "agent:story:visual": "chromatic --project-token=$CHROMATIC_TOKEN",
       "agent:story:test": "test-storybook"
     }
   }
   ```

4. **Setup Visual Regression**
   - Configure Chromatic
   - Set up baseline screenshots
   - Create diff reports

5. **Implement Cross-Platform Testing**
   - Web screenshots via Chromatic
   - Native screenshots via device testing
   - Automated comparison reports

## Known Issues
- **React 19**: Not supported by @storybook/addon-react-native-web
- **Skia Components**: Use string style props (`style="stroke"`)
- **Webpack**: Needs `fs: false, path: false` fallbacks

## Success Criteria
### For React Native Support:
- [ ] Stories load on iOS devices
- [ ] Stories load on Android devices
- [ ] Hot reload works on both platforms
- [ ] No console errors

### For Automation Framework:
- [ ] `yarn agent:story RecordButton` validates the component
- [ ] Visual regression catches UI changes
- [ ] Cross-platform differences are reported
- [ ] CI/CD integration works

## Technical Decisions Made
1. Used automatic upgrade (`npx storybook@latest upgrade`)
2. Stayed on React 18 for ecosystem compatibility
3. Fixed Skia rendering with string styles
4. Added webpack fallbacks for Node.js modules
