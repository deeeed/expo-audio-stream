# UI Component Feedback Loops

## Overview
Simple, effective UI component development using Storybook for testing and validation.

## Architecture

### Two Independent Storybook Setups

1. **UI Library** (`packages/expo-audio-ui`): Web Storybook
   - Component development and testing
   - Visual regression testing
   - Interaction testing
   - Runs on port 6068

2. **Playground App** (`apps/playground`): React Native Storybook
   - Device testing for integrated components
   - Real app context validation
   - Platform-specific behavior verification

## UI Library Development

### Component Development Workflow

```bash
cd packages/expo-audio-ui
yarn storybook  # http://localhost:6068
```

Create comprehensive stories with all states:
```typescript
// RecordButton.stories.tsx
export default {
  title: 'Audio/RecordButton',
  component: RecordButton,
};

export const Default = {};
export const Recording = { args: { isRecording: true } };
export const Disabled = { args: { disabled: true } };
export const WithError = { args: { error: 'Microphone access denied' } };
```

### Testing in Web Storybook

1. **Visual Testing**: Use Storybook's built-in tools
2. **Interaction Testing**: Add play functions to stories
3. **Accessibility Testing**: Use a11y addon

```typescript
// Example with interaction testing
export const RecordingFlow = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    
    // Test recording start
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    
    // Test recording stop
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  },
};
```

## Playground App Integration

### Setting Up Playground Storybook

```bash
cd apps/playground
yarn storybook        # Launch native Storybook
yarn ios              # Run on iOS
yarn android          # Run on Android
```

### Creating Integration Stories

```typescript
// apps/playground/src/stories/AudioRecording.stories.tsx
import { RecordButton } from '@siteed/expo-audio-ui';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

export const IntegratedRecordButton = () => {
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  
  return (
    <RecordButton
      isRecording={isRecording}
      onPress={isRecording ? stopRecording : startRecording}
    />
  );
};
```

## Development Workflows

### Creating a New Component

1. **Develop in UI Library**
   ```bash
   cd packages/expo-audio-ui
   # Create component and story
   # Test in web Storybook
   yarn storybook
   ```

2. **Test Integration in Playground**
   ```bash
   cd apps/playground
   # Create integration story
   # Test on real devices
   yarn storybook
   ```

### Testing Platform-Specific Features

For features like haptic feedback or native gestures:

1. Implement the API in the UI component
2. Mock/stub behavior for web testing
3. Test real implementation in playground app with actual devices

### Debugging Cross-Platform Issues

1. Reproduce issue in playground Storybook on the affected platform
2. Fix in UI library component
3. Verify fix in both web and device Storybooks

## Testing Capabilities

### Visual Testing
Use Storybook's visual testing addons:
- **Chromatic**: Automated visual regression testing
- **Percy**: Visual testing and review
- **Built-in**: Storybook's visual tests

### Interaction Testing
Leverage Storybook's play functions:
```typescript
export const RecordingFlow = {
  play: async ({ canvasElement }) => {
    // Test user interactions
    // Verify component behavior
    // Check accessibility
  },
};
```

### Performance Testing
- Monitor bundle size with size-limit
- Use React DevTools Profiler
- Measure render performance in stories

## Best Practices

### Story Organization
```
packages/expo-audio-ui/src/
  RecordButton/
    RecordButton.tsx
    RecordButton.stories.tsx
    RecordButton.test.tsx
```

### Essential Story States
```typescript
export const Default = {};
export const Loading = { args: { loading: true } };
export const Error = { args: { error: 'Something went wrong' } };
export const Disabled = { args: { disabled: true } };
```

### Documentation in Stories
```typescript
export default {
  title: 'Audio/RecordButton',
  component: RecordButton,
  parameters: {
    docs: {
      description: {
        component: 'Button for starting and stopping audio recording'
      }
    }
  }
};

```

## Benefits

### For UI Library Development
- Fast iteration with web Storybook
- Component isolation and testing
- Visual regression and interaction testing
- No native dependencies or setup required

### For Device Testing
- Real device validation in playground app
- Test UI components in actual app context
- Platform-specific behavior verification
- Integration with real audio functionality

### Clean Architecture
- UI library remains a pure library
- Single app (playground) for all device testing
- No duplication of native configurations
- Clear separation of concerns

## Summary

This approach provides a simple, effective workflow:
1. Develop components in the UI library with web Storybook
2. Test integration and device-specific behavior in the playground app
3. Each Storybook instance focuses on what it does best
4. No complex tooling or scripts required

The result is faster development, better testing, and cleaner architecture. 