# PR Methodology for expo-audio-studio

## MANDATORY Requirements for New Features

### 1. Integration Tests are REQUIRED

**Every new feature MUST include integration tests that validate ACTUAL platform behavior.**

Integration tests are NOT optional. They must:
- Test real platform APIs (AVAudioEngine, Android AudioRecord, Web Audio API)
- Validate actual behavior, not mocked behavior
- Be runnable as standalone scripts
- Document platform limitations discovered during testing

#### Example Structure
```
ios/tests/integration/
├── feature_name_test.swift
├── run_feature_tests.sh
└── README.md (documenting findings)
```

### 2. Test-Driven Development (When Possible)

1. Write integration tests FIRST
2. Run tests to see them fail
3. Implement the feature
4. Run tests to see them pass
5. Document any platform quirks discovered

### 3. Documentation Updates

- Update EXISTING documentation files
- Do NOT create new doc files for configuration options
- Add examples to relevant usage guides
- Document platform-specific behavior

### 4. Code Organization

- Keep changes minimal
- No unnecessary subdirectories
- Follow existing patterns
- Update types first, then implementations

## Example: Buffer Duration Feature

### ❌ BAD Approach
- Implement without testing
- Create new documentation file
- Complex directory structure
- No integration tests

### ✅ GOOD Approach
1. Write integration test first
2. Discover iOS minimum buffer limitation (4800 frames)
3. Implement with workaround
4. Update existing recording.md documentation
5. Include test results in PR

## Integration Test Template

```swift
#!/usr/bin/env swift
// Integration test for [Feature Name]
// Tests ACTUAL platform behavior

class FeatureIntegrationTest {
    func runAllTests() {
        testBasicFunctionality()
        testEdgeCases()
        testPlatformLimitations()
        printResults()
    }
}
```

## PR Checklist

- [ ] Integration tests written and passing
- [ ] **Playground builds successfully on all platforms**
- [ ] Platform limitations documented
- [ ] Existing docs updated (not new files)
- [ ] TypeScript types updated
- [ ] iOS implementation complete
- [ ] Android implementation (if applicable)
- [ ] Web implementation (if applicable)
- [ ] Test results included in PR description
- [ ] Playground app updated with new feature

## Playground App Updates & Build Validation

**MANDATORY**: After implementing a new feature with passing integration tests, you MUST:

1. **Update the playground app** to demonstrate the feature
2. **Verify the playground builds successfully** on all target platforms

The playground app (`apps/playground`) serves as:
- Living documentation of all library features
- Testing ground for real-world usage
- Demo for potential users
- Integration test environment
- **Build validation environment** (ensures library can be consumed by real apps)

### Required Updates

1. **Add UI controls** for new configuration options
2. **Create examples** showing typical usage
3. **Include edge cases** discovered during testing
4. **Document platform differences** in the UI

### Example: Buffer Duration Feature

```typescript
// In playground app settings
<Slider
  label="Buffer Duration (seconds)"
  value={bufferDuration}
  onValueChange={setBufferDuration}
  minimumValue={0.01}
  maximumValue={0.5}
  step={0.01}
/>
<Text style={styles.hint}>
  iOS minimum: 0.1s (platform limitation)
</Text>
```

## Validation Process

### 1. Integration Tests (Platform Behavior)
Run platform-specific integration tests to validate actual behavior:

```bash
# iOS
cd packages/expo-audio-studio/ios/tests/integration
./run_integration_tests.sh

# Android  
cd apps/playground/android
./gradlew :siteed-expo-audio-studio:connectedAndroidTest
```

### 2. Playground Build Validation (Real App Usage)
Verify the library can be consumed by real applications:

```bash
# Build all workspace dependencies first
cd apps/playground
yarn build:deps

# Then test playground builds
yarn ios    # iOS
yarn android # Android  
yarn web    # Web
```

### 3. Package Build Validation
Ensure the package and plugin build correctly:

```bash
cd packages/expo-audio-studio
yarn build && yarn build:plugin
```

## Why Both Tests AND Build Validation Matter

**Integration tests** reveal platform behavior but can pass while builds fail due to:
- File inclusion issues in podspec/gradle
- Redundant/conflicting code
- Missing dependencies
- Build configuration problems
- **Unbuilt workspace packages** (common in monorepos)

**Playground builds** ensure the library works in real applications but may not catch platform-specific edge cases.

**Both are required** - integration tests validate behavior, playground builds validate usability.

**Remember: If you didn't test it on the actual platform AND verify it builds in a real app, you don't know if it works.** 