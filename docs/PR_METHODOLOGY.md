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
- [ ] Platform limitations documented
- [ ] Existing docs updated (not new files)
- [ ] TypeScript types updated
- [ ] iOS implementation complete
- [ ] Android implementation (if applicable)
- [ ] Web implementation (if applicable)
- [ ] Test results included in PR description

## Why Integration Tests Matter

Unit tests can lie. Mocks can be wrong. Only integration tests reveal:
- Platform minimum/maximum values
- Undocumented API behavior
- Performance characteristics
- Edge cases in real usage

**Remember: If you didn't test it on the actual platform, you don't know if it works.** 