---
name: Bug report
about: Create a bug report to help improve expo-audio-studio
title: '[BUG] '
labels: bug
assignees: ''
---

## Environment
<!-- REQUIRED FIELDS - issues without this information will be automatically closed -->
- expo-audio-studio version: <!-- REQUIRED e.g., 1.2.0 -->
- Expo SDK version: <!-- e.g., 49.0.0 -->
- Platform & OS version: <!-- REQUIRED e.g., iOS 16.5, Android 13, Web Chrome 115 -->
- Device: <!-- e.g., iPhone 14 Pro, Pixel 7 -->

## Description
<!-- REQUIRED: A clear and concise description of the issue (minimum 20 characters) -->

## Cross-Platform Validation
<!-- RECOMMENDED: It helps tremendously if you can try to reproduce the issue on the official AudioPlayground app -->

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
<!-- RECOMMENDED but not required -->
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
<!-- RECOMMENDED: Your recording configuration -->

```ts
// Please provide your recording configuration
const config: RecordingConfig = {
  sampleRate: 44100,
  // ... other options
};
```

## Logs
<!-- 
RECOMMENDED: To help debug the issue, please enable logging at the provider level:

```tsx
// In your app component or where you set up the AudioRecorderProvider
import { AudioRecorderProvider } from '@siteed/expo-audio-studio';

export default function App() {
  return (
    <AudioRecorderProvider
      config={{
        logger: console // Enable detailed logging
      }}
    >
      {/* Your app components */}
    </AudioRecorderProvider>
  );
}
```

Then paste the relevant logs here:
-->
```log
```

## Expected Behavior
<!-- RECOMMENDED: What did you expect to happen? -->

## Actual Behavior
<!-- RECOMMENDED: What actually happened instead? -->

## Additional Context
<!-- Any other context about the problem here -->

## Checklist
<!-- Please check the boxes that apply: -->
- [ ] I have updated to the latest version of expo-audio-studio
- [ ] I have checked the documentation
- [ ] I have tested in the official AudioPlayground app
- [ ] I have verified microphone permissions are properly set up
- [ ] I have filled out all required fields in this template

<!-- THANK YOU for taking the time to report this issue and provide these details! -->