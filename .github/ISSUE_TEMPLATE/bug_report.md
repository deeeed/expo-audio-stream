---
name: Bug report
about: Create a bug report to help improve expo-audio-studio
title: '[BUG] '
labels: bug
assignees: ''
---

## Environment
- expo-audio-studio version: <!-- e.g., 1.2.0 -->
- Expo SDK version: <!-- e.g., 49.0.0 -->
- React Native version: <!-- e.g., 0.72.3 -->
- Platform & OS version: <!-- e.g., iOS 16.5, Android 13, Web Chrome 115 -->
- Device: <!-- e.g., iPhone 14 Pro, Pixel 7 -->

## Description
<!-- A clear and concise description of the issue -->

## Cross-Platform Validation
<!-- It helps tremendously if you can try to reproduce the issue on the official AudioPlayground app -->

### AudioPlayground Apps
- Web: https://deeeed.github.io/expo-audio-stream/playground
- iOS: https://apps.apple.com/app/audio-playground/id6739774966
- Android: https://play.google.com/store/apps/details?id=net.siteed.audioplayground

**Important:** The AudioPlayground app exposes **all features** of the expo-audio-studio library with full customization:
- In the **Record** tab, toggle "Show Advanced Settings" to access all recording parameters
- In the **Trim** tab, you can test all audio processing capabilities
- All visualization and transcription features are available to test
- Try different audio devices, sample rates, and compression settings

Can this issue be reproduced in the AudioPlayground app?
- [ ] Yes, on all platforms (Web, iOS, Android)
- [ ] Yes, but only on specific platforms (please specify): <!-- e.g., iOS only, Android and Web -->
- [ ] No, it only happens in my app

Reproduction steps in the AudioPlayground app (including any settings you modified):
1. 
2. 
3. 

Is the behavior consistent across platforms?
- [ ] Yes, the issue occurs the same way on all platforms I tested
- [ ] No, the behavior differs between platforms (please describe the differences)

## Configuration

```ts
// Please provide your recording configuration
const config: RecordingConfig = {
  sampleRate: 44100,
  // ... other options
};
```

## Logs
<!-- 
To help debug the issue, please start the recording with logging enabled:

```ts
const result = await startRecording({
  ...config,
  logger: console, // Enable detailed logging
});
```

Then paste the relevant logs here:
-->
```log
```

## Media
<!-- 
Please provide any relevant media that demonstrates the issue:
- Screen recording showing the problem
- Audio sample that demonstrates the issue
- Screenshots of any error messages
-->

## Expected Behavior
<!-- What did you expect to happen? -->

## Actual Behavior
<!-- What actually happened instead? -->

## Additional Context
<!-- Add any other context about the problem here -->

## Thank You
Your feedback helps improve this library. Thank you for taking the time to report this issue and provide these details!

## Checklist
Before submitting, please check that you have:
- [ ] Updated to the latest version of expo-audio-studio
- [ ] Checked the [documentation](https://deeeed.github.io/expo-audio-stream/docs/)
- [ ] Included complete and relevant logs
- [ ] Tested in the official AudioPlayground app on at least one platform
- [ ] Compared behavior across multiple platforms if possible
- [ ] Included a minimal reproduction code example
- [ ] Checked for existing similar issues
- [ ] Verified microphone permissions are properly set up
- [ ] Included device/environment details 