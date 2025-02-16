---
name: Bug report
title: '[BUG] '
labels: bug
assignees: ''
---

## Environment
- expo-audio-stream version: <!-- e.g., 1.2.0 -->
- Expo SDK version: <!-- e.g., 49.0.0 -->
- React Native version: <!-- e.g., 0.72.3 -->
- Platform & OS version: <!-- e.g., iOS 16.5, Android 13, Web Chrome 115 -->
- Device: <!-- e.g., iPhone 14 Pro, Pixel 7 -->

## Description
<!-- A clear and concise description of the issue -->

**Playground Reproduction**
<!-- Have you tried reproducing this in our Playground app? -->
<!-- https://deeeed.github.io/expo-audio-stream/playground -->
- [ ] Yes, it can be reproduced in the Playground
- [ ] No, it only happens in my app

If yes, please provide the steps in the Playground:
1. 
2. 
3. 


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
```


## Media
<!-- 
Please provide any relevant media that demonstrates the issue:
- Screen recording showing the problem
- Audio sample that demonstrates the issue
- Screenshots of any error messages

You can record your screen using:
- iOS: Built-in screen recording (Control Center)
- Android: Built-in screen recording or ADB
- Web: Browser dev tools or screen recording software
-->

## Expected Behavior
<!-- What did you expect to happen? -->

## Actual Behavior
<!-- What actually happened instead? -->

## Additional Context
<!-- Add any other context about the problem here -->

## Checklist
Before submitting, please check that you have:
- [ ] Updated to the latest version of expo-audio-stream
- [ ] Checked the [documentation](https://deeeed.github.io/expo-audio-stream/docs/)
- [ ] Included complete and relevant logs
- [ ] Tested in the [Playground app](https://deeeed.github.io/expo-audio-stream/playground) if possible
- [ ] Included a minimal reproduction code example
- [ ] Checked for existing similar issues
- [ ] Verified microphone permissions are properly set up
- [ ] Included device/environment details 