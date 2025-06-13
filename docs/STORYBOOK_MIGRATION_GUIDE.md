# Storybook Migration Guide

This guide provides step-by-step instructions for migrating existing components to the Storybook architecture and making them cross-platform compatible.

## Components Requiring Migration

The following components in `src/components/` are candidates for Storybook migration:

### Priority 1 - Visualization Components
1. **TrimVisualization.tsx** - Audio trimming UI with waveform
2. **AlgorithmExplorer.tsx** - Algorithm visualization interface
3. **TranscriptionResults.tsx** - Speech-to-text results display

### Priority 2 - Input/Control Components  
4. **AlgorithmSelector.tsx** - Algorithm selection dropdown
5. **MFCCParameters.tsx** - MFCC parameter controls
6. **WebAppBanner.tsx** - Web-specific banner component

### Priority 3 - Analysis Components
7. **MusicGenreClassifier.tsx** - Genre classification UI
8. **SpeechEmotionClassifier.tsx** - Emotion analysis display

## Migration Process

### Step 1: Analyze Component Dependencies

Before migrating, check the component for:
```bash
# Check imports and dependencies
grep -n "import" src/components/ComponentName.tsx

# Check for web-only features
grep -E "document\.|window\.|localStorage" src/components/ComponentName.tsx

# Check for native-only features  
grep -E "NativeModules|requireNativeComponent" src/components/ComponentName.tsx
```

### Step 2: Determine Target Location

Based on analysis, choose the appropriate location:

| Component Type | Target Directory | When to Use |
|----------------|------------------|-------------|
| Cross-platform | `ui-components/` | Works on native + web with React Native primitives |
| Web-only | `src/stories-web/` | Uses DOM APIs or web-specific features |
| Native-only | `ui-components/` with Platform.select() | Requires native modules but can be adapted |

### Step 3: Create Component Copy

```bash
# For cross-platform components
cp src/components/ComponentName.tsx ui-components/ComponentName.tsx

# For web-only components
cp src/components/ComponentName.tsx src/stories-web/ComponentName.tsx
```

### Step 4: Make Component Cross-Platform Compatible

#### Replace Web-Specific Code
```typescript
// ❌ Before (web-only)
<div style={{ padding: 20 }}>
  <span onClick={handleClick}>Click me</span>
</div>

// ✅ After (cross-platform)
<View style={{ padding: 20 }}>
  <TouchableOpacity onPress={handleClick}>
    <Text>Click me</Text>
  </TouchableOpacity>
</View>
```

#### Handle Platform Differences
```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: 20,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
      default: {
        // Native styles
      },
    }),
  },
});
```

#### Extract Business Logic
```typescript
// Create a separate hook for logic
export const useComponentLogic = (props: ComponentProps) => {
  const [state, setState] = useState();
  // ... business logic
  return { state, handlers };
};

// Use in component
export const Component = (props: ComponentProps) => {
  const { state, handlers } = useComponentLogic(props);
  return <View>...</View>;
};
```

### Step 5: Create Story File

Create `ComponentName.stories.tsx` alongside the component:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta = {
  title: 'Category/ComponentName',
  component: ComponentName,
  parameters: {
    // Optional: Add component documentation
    docs: {
      description: {
        component: 'Brief description of what this component does',
      },
    },
  },
  // Define controls for props
  argTypes: {
    propName: {
      control: 'text',
      description: 'Description of the prop',
    },
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    // Default prop values
  },
};

// Variant stories
export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const WithData: Story = {
  args: {
    data: mockData,
  },
};

// Interactive story
export const Interactive: Story = {
  args: {
    onAction: () => console.log('Action triggered'),
  },
  play: async ({ canvasElement }) => {
    // Optional: Add interaction tests
  },
};
```

### Step 6: Add Unit Tests (Optional)

Create `ComponentName.stories.test.tsx`:

```typescript
import { render } from '@testing-library/react-native';
import { composeStories } from '@storybook/react';
import * as stories from './ComponentName.stories';

const { Default, Loading, WithData } = composeStories(stories);

describe('ComponentName Stories', () => {
  it('renders default story', () => {
    const { getByText } = render(<Default />);
    expect(getByText('Expected Text')).toBeTruthy();
  });

  it('shows loading state', () => {
    const { getByTestId } = render(<Loading />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});
```

### Step 7: Validate Migration

```bash
# Run TypeScript check
yarn tsc --noEmit

# Run linting
yarn lint ui-components/ComponentName.tsx

# Test in Storybook
yarn storybook:ios
yarn storybook:android
yarn storybook:web

# Run agent validation
yarn agent:storybook:ios
yarn agent:storybook:android
```

### Step 8: Update Imports

Update any imports in the app to use the new location:

```typescript
// Before
import { ComponentName } from '../components/ComponentName';

// After (for cross-platform)
import { ComponentName } from '../ui-components/ComponentName';
```

## Migration Checklist

Use this checklist for each component migration:

- [ ] Analyzed component dependencies
- [ ] Determined target location (cross-platform vs web-only)
- [ ] Created component copy in new location
- [ ] Replaced web-specific code with React Native primitives
- [ ] Added Platform.select() for platform differences
- [ ] Extracted business logic into hooks/utilities
- [ ] Created story file with multiple variants
- [ ] Added proper TypeScript types
- [ ] Validated no TypeScript errors
- [ ] Tested on iOS simulator
- [ ] Tested on Android device/emulator
- [ ] Tested on web browser
- [ ] Added unit tests (optional)
- [ ] Updated app imports
- [ ] Removed old component file (after verification)

## Common Issues and Solutions

### Issue 1: Style Differences
**Problem**: Styles look different between platforms
**Solution**: Use StyleSheet.create() and Platform.select()

```typescript
const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'Roboto' },
      web: { fontFamily: 'system-ui' },
    }),
  },
});
```

### Issue 2: Event Handling
**Problem**: onClick vs onPress confusion
**Solution**: Always use React Native event names

```typescript
// ❌ Wrong
<View onClick={handleClick}>

// ✅ Correct
<TouchableOpacity onPress={handleClick}>
```

### Issue 3: Layout Differences
**Problem**: Flexbox behaves differently
**Solution**: Be explicit with flex properties

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column', // Be explicit
    alignItems: 'stretch',   // Default is different on web
  },
});
```

### Issue 4: Missing Dependencies
**Problem**: Component uses packages not available in React Native
**Solution**: Find React Native alternatives or create platform-specific implementations

```typescript
// Platform-specific imports
const Storage = Platform.select({
  web: () => require('./WebStorage').default,
  default: () => require('./NativeStorage').default,
})();
```

### Issue 5: SVG and Images
**Problem**: SVG handling differs between platforms
**Solution**: Use react-native-svg for cross-platform SVG

```typescript
// Install: yarn add react-native-svg
import Svg, { Path, Circle } from 'react-native-svg';

// Use instead of web SVG elements
<Svg width={100} height={100}>
  <Circle cx={50} cy={50} r={40} fill="blue" />
</Svg>
```

## Best Practices

### 1. Component Structure
```typescript
// Good structure for cross-platform component
export interface ComponentNameProps {
  // Well-typed props
}

export const ComponentName: React.FC<ComponentNameProps> = (props) => {
  // Hooks at the top
  const { state, handlers } = useComponentLogic(props);
  
  // Early returns
  if (!state.isReady) {
    return <LoadingView />;
  }
  
  // Main render
  return (
    <View style={styles.container}>
      {/* Component content */}
    </View>
  );
};

const styles = StyleSheet.create({
  // Styles at the bottom
});
```

### 2. Story Organization
- Group related components: `title: 'Audio/Waveform'`
- Provide meaningful names: `Default`, `Loading`, `Error`, `WithData`
- Include edge cases: empty states, error states, loading states
- Add interactive examples when relevant

### 3. Testing Strategy
- Test the most important variants
- Focus on user interactions
- Mock external dependencies
- Use React Native Testing Library

### 4. Documentation
- Add JSDoc comments to components
- Include prop descriptions in stories
- Document platform-specific behavior
- Provide usage examples

## Migration Priority Matrix

| Component | Complexity | Value | Platform | Priority |
|-----------|------------|-------|----------|----------|
| TrimVisualization | High | High | Cross-platform | P1 |
| TranscriptionResults | Low | High | Cross-platform | P1 |
| AlgorithmExplorer | High | Medium | Cross-platform | P2 |
| AlgorithmSelector | Low | Medium | Cross-platform | P2 |
| MFCCParameters | Medium | Low | Cross-platform | P3 |
| WebAppBanner | Low | Low | Web-only | P3 |
| MusicGenreClassifier | Medium | Medium | Cross-platform | P2 |
| SpeechEmotionClassifier | Medium | Medium | Cross-platform | P2 |

## Next Steps After Migration

1. **Update Documentation**: Add component to Storybook inventory in STORYBOOK.md
2. **Visual Testing**: Capture screenshots for visual regression baseline
3. **Performance Testing**: Measure render performance in stories
4. **Accessibility**: Add accessibility labels and test with screen readers
5. **Design Tokens**: Extract common colors/spacing into theme

## Resources

- [React Native Components](https://reactnative.dev/docs/components-and-apis)
- [Storybook React Native Docs](https://github.com/storybookjs/react-native)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Platform-Specific Code](https://reactnative.dev/docs/platform-specific-code)