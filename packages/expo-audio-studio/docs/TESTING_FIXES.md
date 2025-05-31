# Testing Instructions for Issues #246 and #247

## Running Integration Tests

To validate the fixes for both issues, run the integration tests on an iOS device or simulator:

### 1. Navigate to the test directory
```bash
cd packages/expo-audio-studio/ios/tests/integration
```

### 2. Make the test executable
```bash
chmod +x buffer_and_fallback_test.swift
```

### 3. Run the test
```bash
swift buffer_and_fallback_test.swift
```

### Expected Output

```
🧪 Buffer Size Calculation and Fallback Integration Test
======================================================

Test 1: Buffer Size Calculation with Target Sample Rate
-------------------------------------------------------
Testing that buffer size is calculated based on target sample rate, not hardware rate
Hardware sample rate: 48000.0 Hz
Target sample rate: 16000.0 Hz
Buffer duration: 0.02 seconds
Expected requested frames: 320
✓ Requested frames: 320 (calculated from target rate)
✓ Would have been: 960 frames (if using hardware rate)
✓ Actually received: 4800 frames (iOS minimum enforced)

Test 2: Fallback Without Data Duplication
-----------------------------------------
Simulating device fallback scenario to ensure no duplicate emissions
✓ Processed 10 buffers
✓ Emitted 10 times
✓ No duplicate emissions: true

📊 Test Results
===============
✅ Buffer Size Calculation
   Used target rate: true, Requested: 320 frames (would be 960 with hardware rate)
✅ Fallback No Duplication
   Buffers: 10, Emissions: 10, No duplicates: true

Summary: 2/2 tests passed
🎉 All tests passed!

✅ Issue #247 (Buffer Size Calculation) - FIXED
✅ Issue #246 (Duplicate Emissions) - Validation Ready
```

## Manual Testing in Playground App

You can also manually test these fixes in the playground app:

### Testing Buffer Size Calculation (Issue #247)

1. Open the playground app
2. Go to Recording Settings
3. Set:
   - Sample Rate: 16000 Hz
   - Buffer Duration: 0.02 seconds
4. Start recording and check the logs for:
   ```
   Buffer size: requested=320, clamped=320 frames
   ```

### Testing Fallback Behavior (Issue #246)

1. Start recording with a Bluetooth device
2. Disconnect the Bluetooth device during recording
3. Monitor the logs - you should see:
   - Fallback behavior triggered
   - No "FALLBACK FORCE EMIT" messages (if fix is applied)
   - Normal emission continues without duplicates

## Verifying the Fixes

### Issue #247 - Buffer Size Calculation ✅
- Check that buffer size calculation uses target sample rate
- Verify logging shows correct requested frames
- Confirm iOS minimum buffer size warning appears when appropriate

### Issue #246 - Duplicate Emissions ⚠️
- Requires manual code change (remove duplicate emission logic)
- Once fixed, data should only be emitted once per buffer
- No duplicate audio segments in recordings during fallback

## Notes

- iOS enforces a minimum buffer size of ~4800 frames regardless of request
- The buffer size fix is already applied in the codebase
- The duplicate emission fix requires manual removal of redundant code in the fallback tap block 